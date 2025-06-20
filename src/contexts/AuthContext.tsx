import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Session, User as SupabaseUser } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import { useUserSpacesStore } from '@/hooks/useUserSpacesStore'
import { useNavigate } from 'react-router-dom'

// Simple user interface
export interface User extends SupabaseUser {}

// Define the shape of the context
interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  fastPathEnabled: boolean;
  lastFastPathResult: any;
}

// Create the context with a clear undefined default value
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Mobile-safe error boundary for auth provider
class AuthProviderErrorBoundary extends React.Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean; error: Error | null; retryCount: number }
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error) {
    // Check if this is a mobile browser timing issue
    const isMobileTimingError = (
      error.message.includes('useOptimizedAuth must be used within an AuthProvider') ||
      error.message.includes('Cannot read properties of undefined') ||
      error.message.includes('Provider not ready')
    );

    if (isMobileTimingError) {
      console.warn('🔒 [AuthProvider] Mobile timing error detected:', error.message);
      return { hasError: true, error };
    }

    // For other errors, let them bubble up
    throw error;
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🔒 [AuthProvider] Error caught by boundary:', { error, errorInfo });
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
            <div className="text-blue-500 text-6xl mb-4">🔒</div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Auth Provider Loading</h2>
            <p className="text-gray-600 mb-4">
              The authentication system is initializing. This is common on mobile browsers.
            </p>
            <div className="flex gap-3 justify-center">
              <button 
                onClick={this.handleRetry}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                disabled={this.state.retryCount >= 3}
              >
                🔄 Retry {this.state.retryCount > 0 && `(${this.state.retryCount}/3)`}
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                ↻ Refresh Page
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              Mobile browsers may need a moment to initialize properly
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Provider component that wraps your app and makes auth object available to any
// child component that calls useAuth().
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [providerReady, setProviderReady] = useState(false)
  
  // MOBILE OPTIMIZATION: Get space preloading function
  const preloadSpaces = useUserSpacesStore(state => state.preloadSpaces)

  // Mobile-safe initialization with retry logic
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 3;
    
    const initializeAuth = async () => {
      try {
        // Mark provider as initializing
        setProviderReady(false);
        
        // Add small delay for mobile browsers to settle
        await new Promise(resolve => setTimeout(resolve, 100));
    
    // Immediately check for an existing session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.warn('🔒 [AuthProvider] Session check error:', error);
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`🔒 [AuthProvider] Retrying session check (${retryCount}/${maxRetries})`);
            setTimeout(initializeAuth, 1000 * retryCount);
            return;
          }
        }
        
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
        setProviderReady(true)
      
      // MOBILE OPTIMIZATION: Preload spaces when user is authenticated
      if (session?.user?.id) {
          console.log('🚀 [AuthProvider] Preloading spaces for authenticated user');
        preloadSpaces(session.user.id);
      }

      // Set up the listener for future auth events
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (_event, session) => {
            console.log(`[AuthProvider] Auth state changed: ${_event}`, session)
          setSession(session)
          setUser(session?.user ?? null)
          
          // MOBILE OPTIMIZATION: Preload spaces on sign in
          if (_event === 'SIGNED_IN' && session?.user?.id) {
              console.log('🚀 [AuthProvider] User signed in, preloading spaces');
            preloadSpaces(session.user.id);
          }
        }
      )
  
      // Return a cleanup function to unsubscribe from the listener on unmount
      return () => {
        subscription.unsubscribe()
      }
      } catch (error) {
        console.error('🔒 [AuthProvider] Initialization error:', error);
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`🔒 [AuthProvider] Retrying initialization (${retryCount}/${maxRetries})`);
          setTimeout(initializeAuth, 1000 * retryCount);
        } else {
          setLoading(false);
          setProviderReady(true); // Still mark as ready to prevent infinite loading
        }
      }
    };
    
    initializeAuth();
  }, [preloadSpaces]) // Add preloadSpaces to dependencies

  const signOut = async () => {
    console.log('🚪 [AuthProvider] Starting comprehensive signOut with cache clearing...');
    
    // **CRITICAL SECURITY FIX**: Use enhanced signOut with comprehensive cache clearing
    try {
      // Import the enhanced signOut function dynamically
      const { signOut: enhancedSignOut } = await import('@/utils/auth/authActionsUtils');
      
      // Create a mock navigate function since we can't use useNavigate in context
      const mockNavigate = (path: string, options?: any) => {
        console.log('🔀 [AuthProvider] Navigating to:', path);
        if (options?.replace) {
          window.location.replace(path);
        } else {
          window.location.href = path;
        }
      };
      
      // Call enhanced signOut with all cache clearing
      await enhancedSignOut(mockNavigate as any, {
        setUser,
        setSession,
        setUserDetails: () => {}, // Not used in this context
        setHasRouted: () => {}, // Not used in this context
        setEarlyRedirectAttempted: () => {}, // Not used in this context
        setRoutingInProgress: () => {}, // Not used in this context
        setAuthErrors: () => {}, // Not used in this context
      });
      
      console.log('✅ [AuthProvider] Enhanced signOut completed with cache clearing');
    } catch (error) {
      console.error('❌ [AuthProvider] Enhanced signOut failed, falling back to basic signOut:', error);
      
      // Fallback to basic signOut if enhanced fails
      await supabase.auth.signOut();
      
      // Basic cleanup for fallback scenario
      console.log('🧹 [AuthProvider] FALLBACK: Using basic signOut cleanup');
    }
    
    // The onAuthStateChange listener will automatically update user and session to null
  }

  // ✅ CRITICAL FIX: Expose auth state globally for cross-browser fix scripts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Create a mock store-like interface for compatibility with cross-browser scripts
      (window as any).useOptimizedAuth = {
        getState: () => ({
          session,
          user,
          loading: loading || !providerReady,
          signOut,
          fastPathEnabled: !!user,
          lastFastPathResult: null
        })
      };
      
      console.log('🌐 [AuthProvider] Exposed auth state globally for cross-browser fixes');
      
      // Also expose a simpler auth object for backward compatibility
      (window as any).authContext = {
        user,
        session,
        loading: loading || !providerReady,
        signOut
      };
    }
  }, [session, user, loading, providerReady, signOut]);
  
  // The value provided to the context consumers
  const value = {
    session,
    user,
    loading: loading || !providerReady, // Include provider readiness in loading state
    signOut,
    fastPathEnabled: !!user,
    lastFastPathResult: null,
  }

  return (
    <AuthProviderErrorBoundary>
      <AuthContext.Provider value={value}>
        {children}
      </AuthContext.Provider>
    </AuthProviderErrorBoundary>
  )
}

// Custom hook to use the auth context - ✅ FIXED: Fast Refresh compatible export
function useOptimizedAuthInternal(): AuthContextType {
  const context = useContext(AuthContext)
  
  // Enhanced mobile-safe error handling
  if (context === undefined) {
    // Check if we're in a mobile browser environment
    const isMobileBrowser = typeof window !== 'undefined' && 
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // On mobile browsers, provide more context about the timing issue
    if (isMobileBrowser) {
      console.warn('🔒 [useOptimizedAuth] Mobile browser detected - context not ready yet');
      
      // Check if this might be a race condition during provider mounting
      const isLikelyRaceCondition = typeof window !== 'undefined' && 
        document.readyState !== 'complete';
      
      if (isLikelyRaceCondition) {
        throw new Error(
          'useOptimizedAuth must be used within an AuthProvider. ' +
          'Mobile browser detected: This may be a timing issue during app initialization. ' +
          'Try refreshing the page if this persists.'
        );
      }
    }
    
    throw new Error('useOptimizedAuth must be used within an AuthProvider')
  }
  
  return context
}

// ✅ FAST REFRESH COMPATIBLE: Export as const
export const useOptimizedAuth = useOptimizedAuthInternal;
