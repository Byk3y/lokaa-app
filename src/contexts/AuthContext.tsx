import { log } from '@/utils/logger';
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { conversationStore } from '@/features/chat/store/conversationStore';
import { userConversationsCacheService } from '@/utils/indexeddb/core/CacheService';

import { useUserSpacesStore } from '@/hooks/useUserSpacesStore';
import { authMigrationHelper } from '@/utils/auth/authMigrationHelper';
import { signUp as signUpAction } from '@/utils/auth/authActionsUtils';
// import { simpleMobileManager } from '@/utils/SimpleMobileManager' // ✅ Simplified mobile manager


interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  routingInProgress: boolean;
  signOut: (path?: string) => Promise<void>;
  signUp: (email: string, password: string, options?: { username?: string; firstName?: string; lastName?: string }) => Promise<{ data?: { user: User | null; session: Session | null; } | null; error: any; success?: boolean; }>;
  // Enhanced authentication utilities
  refreshSession: () => Promise<boolean>;
  validateSession: () => Promise<boolean>;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [routingInProgress, setRoutingInProgress] = useState(false);
  const preloadSpaces = useUserSpacesStore(state => state.preloadSpaces);

  // Initialize auth state - memoized to prevent unnecessary re-creation
  const initializeAuth = useCallback(async (maxRetries = 3) => {
    const { MobileNetworkHandler } = await import('@/utils/mobileNetworkHandler');
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        const { data, error } = await MobileNetworkHandler.safeFetch(
          () => getSupabaseClient().auth.getSession(),
          {
            maxRetries: 2,
            baseDelay: 1000,
            timeout: 10000
          }
        );
        
        if (error) {
          log.error('Context', '[AuthProvider] Session retrieval error:', error);
          throw error;
        }

        setSession(data.session);
        setUser(data.session?.user || null);
        setLoading(false);
        return;
        
      } catch (error) {
        retryCount++;
        if (retryCount >= maxRetries) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          log.error('Context', `[AuthProvider] Failed to initialize auth after ${maxRetries} attempts: ${errorMessage}`, error instanceof Error ? error : undefined);
          setLoading(false);
          return;
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }
  }, []);

  useEffect(() => {
    const location = window.location;
    
    // Check for sign out redirect scenario
    if (location.pathname === '/' && !location.search) {
      setLoading(false);
      return;
    }

    const initializeWithMigration = async () => {
      try {
        // Run authentication migration helper
        const migrationResult = await authMigrationHelper.runMigration({
          retries: 2,
          emergencyFallback: true
        });
        
        if (migrationResult.success && migrationResult.keysCleared.length > 0) {
          // Migration cleaned up problematic keys
        }
        
      } catch (error) {
        log.warn('Context', '[AuthProvider] Migration helper failed:', error);
      }
      
      // Initialize auth regardless of migration result
      await initializeAuth();
    };

    initializeWithMigration();
  }, [initializeAuth]);

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 3;

    const checkSession = async () => {
      try {
        const { MobileNetworkHandler } = await import('@/utils/mobileNetworkHandler');
        
        const { data, error } = await MobileNetworkHandler.safeFetch(
          () => getSupabaseClient().auth.getSession(),
          {
            maxRetries: 2,
            baseDelay: 1000,
            timeout: 15000
          }
        );
        
        if (error) throw error;
        
        setSession(data.session);
        setUser(data.session?.user || null);
        
        if (data.session?.user) {
          preloadSpaces(data.session.user.id);
        }
        
      } catch (error) {
        retryCount++;
        if (retryCount < maxRetries) {
          setTimeout(() => checkSession(), 1000);
        } else {
          log.error('Context', '[AuthProvider] Session check failed after retries:', error);
        }
      }
    };

    const { data: { subscription } } = getSupabaseClient().auth.onAuthStateChange(
      async (event, session) => {
        // Handle auth state changes directly in AuthContext
        setSession(session);
        setUser(session?.user || null);
        
        if (event === 'SIGNED_IN' && session?.user) {
          // Clear chat store and cache to prevent stale conversations from prior sessions
          try { conversationStore.getState().reset(); } catch {}
          try { await userConversationsCacheService.clear(); } catch {}
          preloadSpaces(session.user.id);
          setLoading(false);
          setRoutingInProgress(false);
          // Mobile manager disabled - handled by comprehensive fix

          // Fire-and-forget welcome email on first verified session
          try {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
            const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
            if (supabaseUrl && anonKey) {
              const projectRef = new URL(supabaseUrl).host.split('.')[0];
              const functionsUrl = `https://${projectRef}.functions.supabase.co`;
              const firstName = (session.user.user_metadata?.full_name as string | undefined)
                || (session.user.user_metadata?.first_name as string | undefined)
                || undefined;
              const localKey = `welcome-email-queued:${session.user.id}`;
              if (!sessionStorage.getItem(localKey)) {
                sessionStorage.setItem(localKey, '1');
                fetch(`${functionsUrl}/send-welcome-email`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${anonKey}`
                  },
                  body: JSON.stringify({
                    type: 'welcome',
                    to: session.user.email,
                    firstName
                  })
                }).catch(() => {});
              }
            }
          } catch {}
        } else if (event === 'SIGNED_OUT') {
          // Clear chat store and cache on sign out
          try { conversationStore.getState().reset(); } catch {}
          try { await userConversationsCacheService.clear(); } catch {}
          setLoading(false);
          setRoutingInProgress(false);
          // Mobile manager disabled - handled by comprehensive fix
        }
      }
    );

    checkSession();

    // Return a cleanup function to unsubscribe from the listener on unmount
    return () => subscription.unsubscribe();
  }, [preloadSpaces]);

  useEffect(() => {
    if (loading && session === null) {
      let retryCount = 0;
      const maxRetries = 3;

      const retryInit = () => {
        retryCount++;
        if (retryCount <= maxRetries) {
          setTimeout(() => {
            initializeAuth(maxRetries - retryCount + 1);
          }, 1000 * retryCount);
        }
      };

      retryInit();
    }
  }, [loading, session, initializeAuth]);

  // Enhanced session refresh functionality
  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const { MobileNetworkHandler } = await import('@/utils/mobileNetworkHandler');
      
      const { data, error } = await MobileNetworkHandler.safeFetch(
        () => getSupabaseClient().auth.refreshSession(),
        {
          maxRetries: 3,
          baseDelay: 1500,
          timeout: 15000
        }
      );
      
      if (error) {
        log.warn('Context', '[AuthProvider] Session refresh error:', error);
        return false;
      }
      
      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
        return true;
      }
      
      return false;
    } catch (error) {
      log.error('Context', '[AuthProvider] Session refresh failed:', error);
      return false;
    }
  }, []);

  // Enhanced session validation functionality
  const validateSession = useCallback(async (): Promise<boolean> => {
    try {
      const { clearAllAuthTokens, validateAuthSession } = await import('@/utils/auth/authTokenUtils');
      
      // Use enhanced validation from authTokenUtils
      const validation = await validateAuthSession();
      
      if (validation.hasInconsistentKeys) {
        // Clean up inconsistent auth keys during validation
        clearAllAuthTokens();
      }
      
      if (validation.isValid) {
        setSession(validation.session);
        setUser(validation.session?.user || null);
        return true;
      }
      
      return false;
    } catch (error) {
      log.error('Context', '[AuthProvider] Session validation failed:', error);
      return false;
    }
  }, []);

  // Enhanced signOut with direct clearAllAuthTokens integration
  const signOut = useCallback(async (path?: string) => {
    try {
      // Use direct clearAllAuthTokens integration for immediate cleanup
      const { clearAllAuthTokens } = await import('@/utils/auth/authTokenUtils');
      
      // Clear auth tokens immediately
      clearAllAuthTokens();

      // Sign out from Supabase
      const { error } = await getSupabaseClient().auth.signOut();
      
      if (error) {
        log.error('Context', '[AuthProvider] Supabase signOut error:', error);
      }

      // Clear auth state
      setSession(null);
      setUser(null);
      setLoading(false);
      setRoutingInProgress(false);

      // Navigate to specified path or landing page
      const targetPath = path || '/';
      window.location.href = targetPath;

    } catch (error) {
      log.error('Context', '[AuthProvider] Enhanced signOut error:', error);
      
      // Fallback: Basic Supabase signOut
      try {
        await getSupabaseClient().auth.signOut();
        setSession(null);
        setUser(null);
        setLoading(false);
        setRoutingInProgress(false);
        window.location.href = '/';
      } catch (fallbackError) {
        log.error('Context', '[AuthProvider] Fallback signOut failed:', fallbackError);
        window.location.href = '/';
      }
    }
  }, []);

  // Sign up functionality
  const signUp = useCallback(async (
    email: string, 
    password: string, 
    options?: { username?: string; firstName?: string; lastName?: string }
  ) => {
    try {
      log.debug('Context', '[AuthProvider] Starting sign up process for:', email);
      
      const result = await signUpAction(email, password, options, {
        setAuthErrors: (errors) => {
          // Handle auth errors - could be enhanced to show toasts
          log.warn('Context', '[AuthProvider] Sign up auth errors:', errors);
        },
        setHasRouted: (hasRouted) => {
          setRoutingInProgress(hasRouted);
        },
        setUser: (user) => {
          setUser(user);
        }
      });

      if (result.success && result.data?.session) {
        // Update session and user state on successful signup
        setSession(result.data.session);
        setUser(result.data.session.user);
        log.debug('Context', '[AuthProvider] Sign up successful, session created');
      } else if (result.success && result.data?.user && !result.data.session) {
        // Email confirmation required
        log.debug('Context', '[AuthProvider] Sign up successful, email confirmation required');
      }

      return result;
    } catch (error) {
      log.error('Context', '[AuthProvider] Sign up error:', error);
      return {
        error: { message: error instanceof Error ? error.message : 'Sign up failed' },
        data: null,
        success: false
      };
    }
  }, []);

  const contextValue = useMemo(() => ({
    session,
    user,
    loading,
    routingInProgress,
    signOut,
    signUp,
    // Enhanced authentication utilities
    refreshSession,
    validateSession
  }), [session, user, loading, routingInProgress, signOut, signUp, refreshSession, validateSession]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useOptimizedAuth = useAuth;
