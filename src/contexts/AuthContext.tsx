import { log } from '@/utils/logger';
import React, { createContext, useContext, useEffect, useLayoutEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { conversationStore } from '@/features/chat/store/conversationStore';
import { userConversationsCacheService } from '@/utils/indexeddb/core/CacheService';
import { posthog } from '@/integrations/posthog';
import { Database } from '@/types/supabase';
import { fetchUserDetails } from '@/utils/auth/userUtils';

import { useUserSpacesStore } from '@/hooks/useUserSpacesStore';
import { authMigrationHelper } from '@/utils/auth/authMigrationHelper';
import { signUp as signUpAction } from '@/utils/auth/authActionsUtils';
// import { simpleMobileManager } from '@/utils/SimpleMobileManager' // ✅ Simplified mobile manager


interface AuthContextType {
  session: Session | null;
  user: User | null;
  userDetails: Database['public']['Tables']['users']['Row'] | null;
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
  const [userDetails, setUserDetails] = useState<Database['public']['Tables']['users']['Row'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [routingInProgress, setRoutingInProgress] = useState(false);
  const preloadSpaces = useUserSpacesStore(state => state.preloadSpaces);
  
  // Use ref to store preloadSpaces to avoid dependency issues
  const preloadSpacesRef = useRef(preloadSpaces);
  preloadSpacesRef.current = preloadSpaces;

  // Track PostHog identification to prevent duplicates
  const identifiedUserIdRef = useRef<string | null>(null);

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

  // ✅ CONSOLIDATED: Single auth initialization hook combining migration, listener setup, and session check
  // This eliminates duplicate getSession() calls and race conditions while preserving all functionality
  useEffect(() => {
    let isMounted = true;
    let subscription: any = null;
    let retryTimeout: NodeJS.Timeout | null = null;

    const initializeAuthSystem = async () => {
      if (!isMounted) return;

      try {
        // Step 1: Run authentication migration helper (cleanup localStorage keys)
        // Always run migration - it's safe and important for cleanup
        try {
          const migrationResult = await authMigrationHelper.runMigration({
            retries: 2,
            emergencyFallback: true
          });
          
          if (migrationResult.success && migrationResult.keysCleared.length > 0) {
            log.debug('Context', '[AuthProvider] Migration cleaned up problematic keys:', migrationResult.keysCleared.length);
          }
        } catch (error) {
          log.warn('Context', '[AuthProvider] Migration helper failed:', error);
          // Continue initialization even if migration fails
        }

        if (!isMounted) return;

        // Step 2: Setup auth state change listener FIRST (critical for ongoing auth events)
        // This MUST always be set up - it handles all auth state changes including INITIAL_SESSION
        const { onAuthStateChange } = await import('@/integrations/supabase/auth');
        const { data: { subscription: authSubscription } } = onAuthStateChange(
          async (event, session) => {
            if (!isMounted) return;
            
            // Handle auth state changes directly in AuthContext
            setSession(session);
            setUser(session?.user || null);
            
            // Identify user in PostHog (only once per user to prevent duplicates)
            if (session?.user && posthog && identifiedUserIdRef.current !== session.user.id) {
              posthog.identify(session.user.id, {
                email: session.user.email,
                created_at: session.user.created_at,
                last_sign_in_at: session.user.last_sign_in_at
              });
              identifiedUserIdRef.current = session.user.id;
              console.log('👤 [PostHog] User identified:', session.user.id);
            } else if (!session?.user) {
              // Reset identification tracking on sign out
              identifiedUserIdRef.current = null;
            }
            
            if (event === 'SIGNED_IN' && session?.user) {
              // Clear chat store and cache to prevent stale conversations from prior sessions
              try { conversationStore.getState().reset(); } catch {}
              try { await userConversationsCacheService.clear(); } catch {}
              preloadSpacesRef.current(session.user.id);
              
              // ✅ CRITICAL FIX: Set loading to false BEFORE fetching user details
              // This prevents blocking the UI if fetchUserDetails is slow or hangs
              setLoading(false);
              setRoutingInProgress(false);
              
              // Fetch user details from database (non-blocking - fire and forget)
              fetchUserDetails(session.user.id)
                .then((details) => {
                  if (isMounted) {
                    setUserDetails(details);
                  }
                })
                .catch((error) => {
                  log.warn('Context', '[AuthProvider] Failed to fetch user details on sign in:', error);
                });
            } else if (event === 'SIGNED_OUT') {
              // Clear chat store and cache on sign out
              try { conversationStore.getState().reset(); } catch {}
              try { await userConversationsCacheService.clear(); } catch {}
              setUserDetails(null);
              setLoading(false);
              setRoutingInProgress(false);
            }
          }
        );
        
        subscription = authSubscription;

        if (!isMounted) return;

        // Step 3: Get initial session (only once - no duplicate calls)
        // Note: The auth state change listener above will also fire with INITIAL_SESSION event,
        // but we call getSession() here to ensure we have the session immediately for the initial render.
        // The listener ensures we stay in sync with any auth state changes.
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
        
        // Set initial session state
        // Note: The auth state change listener may have already set this via INITIAL_SESSION event,
        // but setting it here ensures we have it even if the listener hasn't fired yet.
        setSession(data.session);
        setUser(data.session?.user || null);
        
        // ✅ CRITICAL FIX: Set loading to false BEFORE fetching user details
        // This prevents blocking the UI if fetchUserDetails is slow or hangs
        // User details can load in the background without blocking auth initialization
        setLoading(false);
        
        // Fetch user details if user is authenticated (non-blocking - fire and forget)
        if (data.session?.user && isMounted) {
          // Don't await - let it load in background
          fetchUserDetails(data.session.user.id)
            .then((details) => {
              if (isMounted) {
                setUserDetails(details);
              }
            })
            .catch((error) => {
              log.warn('Context', '[AuthProvider] Failed to fetch user details on initial load:', error);
            });
        }
        
        // Note: PostHog identification is handled by the auth state change listener above
        // to prevent duplicate identification. The listener will fire with INITIAL_SESSION
        // event when onAuthStateChange is set up, so we don't need to identify here.
        
        // Preload spaces if user is authenticated
        if (data.session?.user) {
          preloadSpacesRef.current(data.session.user.id);
        }
        
      } catch (error) {
        if (!isMounted) return;
        log.error('Context', '[AuthProvider] Auth system initialization failed:', error instanceof Error ? error : new Error(String(error)));
        setLoading(false);
      }
    };

    // Start initialization
    initializeAuthSystem();

    // Cleanup function: unsubscribe from auth state changes and clear timeouts
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
  }, []); // Empty dependency array - all logic is self-contained

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
        
        // Fetch user details after session refresh (non-blocking)
        if (data.session.user) {
          fetchUserDetails(data.session.user.id)
            .then((details) => {
              setUserDetails(details);
            })
            .catch((error) => {
              log.warn('Context', '[AuthProvider] Failed to fetch user details on session refresh:', error);
            });
        }
        
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
        
        // Fetch user details after session validation (non-blocking)
        if (validation.session?.user) {
          fetchUserDetails(validation.session.user.id)
            .then((details) => {
              setUserDetails(details);
            })
            .catch((error) => {
              log.warn('Context', '[AuthProvider] Failed to fetch user details on session validation:', error);
            });
        }
        
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
      setUserDetails(null);
      
      // Reset user in PostHog
      if (posthog) {
        posthog.reset();
        identifiedUserIdRef.current = null; // Reset identification tracking
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
        setUserDetails(null);
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
        
        // Fetch user details after signup (non-blocking)
        if (result.data.session.user) {
          fetchUserDetails(result.data.session.user.id)
            .then((details) => {
              setUserDetails(details);
            })
            .catch((error) => {
              log.warn('Context', '[AuthProvider] Failed to fetch user details on signup:', error);
            });
        }
        
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
    userDetails,
    loading,
    routingInProgress,
    signOut,
    signUp,
    // Enhanced authentication utilities
    refreshSession,
    validateSession
  }), [session, user, userDetails, loading, routingInProgress, signOut, signUp, refreshSession, validateSession]);

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
