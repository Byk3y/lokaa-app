import { log } from '@/utils/logger';
import React, { createContext, useContext, useEffect, useLayoutEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { conversationStore } from '@/features/chat/store/conversationStore';
import { userConversationsCacheService } from '@/utils/indexeddb/core/CacheService';
import { posthog } from '@/integrations/posthog';

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
  
  // Use ref to store preloadSpaces to avoid dependency issues
  const preloadSpacesRef = useRef(preloadSpaces);
  preloadSpacesRef.current = preloadSpaces;

  // ✅ FIXED: Development-mode circular dependency detection - moved to useLayoutEffect to prevent render loops
  const renderCount = useRef(0);
  const lastRenderTime = useRef(performance.now());
  
  useLayoutEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      renderCount.current++;
      const now = performance.now();
      const timeSinceLastRender = now - lastRenderTime.current;
      lastRenderTime.current = now;
      
      // Only warn if there are truly excessive re-renders (more than 5 in 100ms)
      if (renderCount.current > 5 && timeSinceLastRender < 100) {
        console.warn('🚨 [AuthContext] Excessive re-renders detected!', {
          renderCount: renderCount.current,
          timeSinceLastRender: `${timeSinceLastRender.toFixed(2)}ms`,
          session: !!session,
          user: !!user,
          loading
        });
      }
      
      // Log every 20th render for monitoring (reduced frequency)
      if (renderCount.current % 20 === 0) {
        console.debug('🔍 [AuthContext] Render count:', renderCount.current);
      }
    }
  });

  // ✅ FIXED: Remove function dependency - move logic into useEffect
  // This eliminates the circular dependency caused by function references in useEffect deps

  useEffect(() => {
    const location = window.location;
    
    // Check for sign out redirect scenario
    if (location.pathname === '/' && !location.search) {
      setLoading(false);
      return;
    }

    // ✅ FIXED: Move initializeAuth logic inside useEffect to eliminate function dependency
    const initializeAuth = async (maxRetries = 3) => {
    const { MobileNetworkHandler } = await import('@/utils/mobileNetworkHandler');
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        // Lazy load auth module for session retrieval
        const { getSession } = await import('@/integrations/supabase/auth');
        const { data, error } = await MobileNetworkHandler.safeFetch(
          () => getSession(),
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
        
        // Identify user in PostHog
        if (data.session?.user && posthog) {
          posthog.identify(data.session.user.id, {
            email: data.session.user.email,
            created_at: data.session.user.created_at,
            last_sign_in_at: data.session.user.last_sign_in_at
          });
          console.log('👤 [PostHog] User identified:', data.session.user.id);
        }
        
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
    };

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
  }, []); // ✅ FIXED: Empty dependency array - no function dependencies

  // ✅ FIXED: Consolidated auth initialization with proper cleanup
  useEffect(() => {
    let isMounted = true;
    let subscription: any = null;
    let retryTimeout: NodeJS.Timeout | null = null;

    const initializeAuthSystem = async () => {
      if (!isMounted) return;

      try {
        // Setup auth state change listener first
        const { onAuthStateChange } = await import('@/integrations/supabase/auth');
        const { data: { subscription: authSubscription } } = onAuthStateChange(
          async (event, session) => {
            if (!isMounted) return;

            // Handle auth state changes directly in AuthContext
            setSession(session);
            setUser(session?.user || null);

            // Identify user in PostHog
            if (session?.user && posthog) {
              posthog.identify(session.user.id, {
                email: session.user.email,
                created_at: session.user.created_at,
                last_sign_in_at: session.user.last_sign_in_at
              });
              console.log('👤 [PostHog] User identified:', session.user.id);
            }

            // Scope errors to the current user in Sentry (no-op if DSN unset).
            try {
              const { setSentryUser } = await import('@/integrations/sentry');
              setSentryUser(session?.user ? { id: session.user.id, email: session.user.email ?? undefined } : null);
            } catch {
              // never let telemetry wiring break auth
            }

            if (event === 'SIGNED_IN' && session?.user) {
              // Clear chat store and cache to prevent stale conversations from prior sessions
              try { conversationStore.getState().reset(); } catch {}
              try { await userConversationsCacheService.clear(); } catch {}
              preloadSpacesRef.current(session.user.id);
              setLoading(false);
              setRoutingInProgress(false);
            } else if (event === 'SIGNED_OUT') {
              // Clear chat store and cache on sign out
              try { conversationStore.getState().reset(); } catch {}
              try { await userConversationsCacheService.clear(); } catch {}
              setLoading(false);
              setRoutingInProgress(false);
            }
          }
        );
        
        subscription = authSubscription;

        // Check current session
        const { MobileNetworkHandler } = await import('@/utils/mobileNetworkHandler');
        const { getSession } = await import('@/integrations/supabase/auth');
        
        const { data, error } = await MobileNetworkHandler.safeFetch(
          () => getSession(),
          {
            maxRetries: 2,
            baseDelay: 1000,
            timeout: 15000
          }
        );
        
        if (!isMounted) return;
        
              if (error) {
        log.error('Context', '[AuthProvider] Session check failed:', error instanceof Error ? error : new Error(String(error)));
        setLoading(false);
        return;
      }
        
        setSession(data.session);
        setUser(data.session?.user || null);
        
        if (data.session?.user) {
          preloadSpacesRef.current(data.session.user.id);
        }
        
        setLoading(false);
        
      } catch (error) {
        if (!isMounted) return;
        log.error('Context', '[AuthProvider] Auth system initialization failed:', error instanceof Error ? error : new Error(String(error)));
        setLoading(false);
      }
    };

    // Start initialization
    initializeAuthSystem();

    // ✅ FIXED: Proper cleanup function
    return () => {
      isMounted = false;
      
      if (subscription) {
        subscription.unsubscribe();
        subscription = null;
      }
      
      if (retryTimeout) {
        clearTimeout(retryTimeout);
        retryTimeout = null;
      }
    };
  }, []); // ✅ FIXED: Empty dependency array - preloadSpaces is stable from Zustand store

  // ✅ FIXED: Remove this useEffect entirely - retry logic is now handled in the main initialization
  // This eliminates the third useEffect that was causing additional circular dependency issues

  // ✅ FIXED: Optimized session refresh with stable dependencies
  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const { MobileNetworkHandler } = await import('@/utils/mobileNetworkHandler');
      
      // Lazy load auth module for session refresh
      const { refreshSession: supabaseRefreshSession } = await import('@/integrations/supabase/auth');
      const { data, error } = await MobileNetworkHandler.safeFetch(
        () => supabaseRefreshSession(),
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
      log.error('Context', '[AuthProvider] Session refresh failed:', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }, []); // ✅ FIXED: Empty dependency array - function is stable

  // ✅ FIXED: Optimized session validation with stable dependencies
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
      log.error('Context', '[AuthProvider] Session validation failed:', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }, []); // ✅ FIXED: Empty dependency array - function is stable

  // ✅ FIXED: Optimized signOut with stable dependencies
  const signOut = useCallback(async (path?: string) => {
    try {
      // Use direct clearAllAuthTokens integration for immediate cleanup
      const { clearAllAuthTokens } = await import('@/utils/auth/authTokenUtils');
      
      // Clear auth tokens immediately
      clearAllAuthTokens();

      // Sign out from Supabase
      const supabaseClient = getSupabaseClient();
      if (!supabaseClient) {
        throw new Error('Supabase client not available');
      }
      const { error } = await supabaseClient.auth.signOut();
      
      if (error) {
        log.error('Context', '[AuthProvider] Supabase signOut error:', error instanceof Error ? error : new Error(String(error)));
      }

      // Clear auth state
      setSession(null);
      setUser(null);
      
      // Reset user in PostHog
      if (posthog) {
        posthog.reset();
        console.log('👤 [PostHog] User reset');
      }
      setLoading(false);
      setRoutingInProgress(false);

      // Navigate to specified path or landing page
      const targetPath = path || '/';
      window.location.href = targetPath;

    } catch (error) {
      log.error('Context', '[AuthProvider] Enhanced signOut error:', error instanceof Error ? error : new Error(String(error)));
      
      // Fallback: Basic Supabase signOut
      try {
        const fallbackClient = getSupabaseClient();
        if (fallbackClient?.auth) {
          await fallbackClient.auth.signOut();
        }
        setSession(null);
        setUser(null);
        setLoading(false);
        setRoutingInProgress(false);
        window.location.href = '/';
      } catch (fallbackError) {
        log.error('Context', '[AuthProvider] Fallback signOut failed:', fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError)));
        window.location.href = '/';
      }
    }
  }, []); // ✅ FIXED: Empty dependency array - function is stable

  // ✅ FIXED: Optimized signUp with stable dependencies
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
      log.error('Context', '[AuthProvider] Sign up error:', error instanceof Error ? error : new Error(String(error)));
      return {
        error: { message: error instanceof Error ? error.message : 'Sign up failed' },
        data: null,
        success: false
      };
    }
  }, []); // ✅ FIXED: Empty dependency array - function is stable

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
