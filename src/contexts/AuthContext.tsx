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

// Provider component that wraps your app and makes auth object available to any
// child component that calls useAuth().
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  
  // MOBILE OPTIMIZATION: Get space preloading function
  const preloadSpaces = useUserSpacesStore(state => state.preloadSpaces)

  useEffect(() => {
    // This effect runs only once on mount to set up the auth state listener.
    
    // Immediately check for an existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      
      // MOBILE OPTIMIZATION: Preload spaces when user is authenticated
      if (session?.user?.id) {
        console.log('🚀 [AuthContext] Preloading spaces for authenticated user');
        preloadSpaces(session.user.id);
      }

      // Set up the listener for future auth events
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          console.log(`[AuthContext] Auth state changed: ${_event}`, session)
          setSession(session)
          setUser(session?.user ?? null)
          
          // MOBILE OPTIMIZATION: Preload spaces on sign in
          if (_event === 'SIGNED_IN' && session?.user?.id) {
            console.log('🚀 [AuthContext] User signed in, preloading spaces');
            preloadSpaces(session.user.id);
          }
        }
      )
  
      // Return a cleanup function to unsubscribe from the listener on unmount
      return () => {
        subscription.unsubscribe()
      }
    })
  }, [preloadSpaces]) // Add preloadSpaces to dependencies

  const signOut = async () => {
    console.log('🚪 [AuthContext] Starting comprehensive signOut with cache clearing...');
    
    // **CRITICAL SECURITY FIX**: Use enhanced signOut with comprehensive cache clearing
    try {
      // Import the enhanced signOut function dynamically
      const { signOut: enhancedSignOut } = await import('@/utils/auth/authActionsUtils');
      
      // Create a mock navigate function since we can't use useNavigate in context
      const mockNavigate = (path: string, options?: any) => {
        console.log('🔀 [AuthContext] Navigating to:', path);
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
      
      console.log('✅ [AuthContext] Enhanced signOut completed with cache clearing');
    } catch (error) {
      console.error('❌ [AuthContext] Enhanced signOut failed, falling back to basic signOut:', error);
      
      // Fallback to basic signOut if enhanced fails
      await supabase.auth.signOut();
      
      // Basic cleanup for fallback scenario
      console.log('🧹 [AuthContext] FALLBACK: Using basic signOut cleanup');
    }
    
    // The onAuthStateChange listener will automatically update user and session to null
  }
  
  // The value provided to the context consumers
  const value = {
    session,
    user,
    loading,
    signOut,
    fastPathEnabled: !!user,
    lastFastPathResult: null,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Custom hook to use the auth context
export const useOptimizedAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useOptimizedAuth must be used within an AuthProvider')
  }
  return context
}
