import { log } from '@/utils/logger';
import { Session, User as SupabaseUser, AuthError } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/integrations/supabase/client'
import { NavigateFunction, Location } from 'react-router-dom'
import { getUserPreferredSpace } from '@/utils/authContextUtils'
import { Database } from "@/types/supabase"
import { smartSpaceRedirect } from '@/utils/smartSpaceRedirect'
import { 
  loadingStateManager, 
  LoadingOperation, 
  UserType 
} from '@/managers/LoadingStateManager';
import { enhancedCacheManager } from '@/services/EnhancedCacheManager';

// Import the User type from AuthContext (we'll need to make it exportable)
export interface User extends SupabaseUser {
  url?: string | null;
  user_metadata: {
    avatar_url?: string;
    banner_url?: string;
    bio?: string;
    email?: string;
    firstName?: string;
    full_name?: string;
    lastName?: string;
    name?: string;
    preferred_name?: string;
    twitter_handle?: string;
    url?: string;
    username?: string;
    website?: string;
  };
}

// Define session state interface
export interface SessionState {
  session: Session | null;
  user: User | null;
  userDetails: Database['public']['Tables']['users']['Row'] | null;
  loading: boolean;
  hasRouted: boolean;
  routingInProgress: boolean;
  earlyRedirectAttempted: boolean;
}

// Define session state setters interface
export interface SessionStateSetters {
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  setUserDetails: (details: Database['public']['Tables']['users']['Row'] | null) => void;
  setLoading: (loading: boolean) => void;
  setHasRouted: (hasRouted: boolean) => void;
  setRoutingInProgress: (routingInProgress: boolean) => void;
  setEarlyRedirectAttempted: (attempted: boolean) => void;
}

// Define ref handlers interface
export interface SessionRefs {
  hasRoutedRef: { current: boolean };
  routingInProgressRef: { current: boolean };
  earlyRedirectAttemptedRef: { current: boolean };
  loadingRef: { current: boolean };
}

/**
 * Minimal debug utility to check for token presence in localStorage
 * Simplified version that doesn't spam the console every 10 seconds
 */
export function debugCheckStorageTokens(): boolean {
  try {
    const supabaseKeys = Object.keys(localStorage)
      .filter(key => key.startsWith('sb-') && key.includes('auth'));
    return supabaseKeys.length > 0;
  } catch (error) {
    log.warn('Utils', '⚠️ Error checking localStorage:', error);
    return false;
  }
}

/**
 * Debug function to get current session state
 */
export const debugGetSession = async (): Promise<void> => {
  try {
    log.debug('Utils', '🔍 Manual session check triggered');
    const { data, error } = await getSupabaseClient().auth.getSession();
    
    if (error) {
      log.error('Utils', '❌ Session check error:', error);
      return;
    }
    
    log.debug('Utils', '📋 Current session state:', {
      hasSession: !!data.session,
      user: data.session?.user?.email,
      expires: data.session ? new Date(data.session.expires_at * 1000).toLocaleString() : 'N/A'
    });
    
    debugCheckStorageTokens();
  } catch (err) {
    log.error('Utils', '❌ Error in debugGetSession:', err);
  }
};

/**
 * 🎯 PHASE 2: Enhanced early space redirect using unified loading system
 * FIXED: Now uses LoadingStateManager to coordinate with other loading operations
 */
export const attemptEarlySpaceRedirect = async (
  userId: string,
  location: Location,
  navigate: NavigateFunction,
  state: SessionState,
  setters: SessionStateSetters,
  refs: SessionRefs
): Promise<boolean> => {
  log.debug('Utils', `🎯 [LoadingManager] Starting AUTH_CHECK operation for user: ${userId} on path: ${location.pathname}`);
  
  // Start AUTH_CHECK operation - this coordinates with other loading operations
  const operationStarted = loadingStateManager.startOperation(
    LoadingOperation.AUTH_CHECK, 
    { userId, path: location.pathname }
  );
  
  if (!operationStarted) {
    log.debug('Utils', `🎯 [LoadingManager] AUTH_CHECK operation blocked by higher priority operation`);
    return false;
  }
  
  try {
    // Try instant cache access first (0-50ms response time)
    const cacheResult = loadingStateManager.attemptInstantCacheAccess(userId);
    
    if (cacheResult.found && cacheResult.isValid) {
      log.debug('Utils', `🚀 [EarlySpaceRedirect] INSTANT: Using ${cacheResult.source} cache`);
      
      // Parse space data based on cache source
      let spaceData = null;
      if (typeof cacheResult.data === 'string') {
        try {
          spaceData = JSON.parse(cacheResult.data);
        } catch {
          spaceData = null;
        }
      } else {
        spaceData = cacheResult.data;
      }
      
      if (spaceData && spaceData.subdomain) {
        navigate(`/${spaceData.subdomain}/space`, { replace: true });
        setters.setRoutingInProgress(true);
        setters.setEarlyRedirectAttempted(true);
        
        // Complete the operation successfully
        loadingStateManager.completeOperation(LoadingOperation.AUTH_CHECK, true);
        return true;
      }
    }
    
    // No valid cache, proceed with smart redirect
    log.debug('Utils', '🎯 [LoadingManager] No valid cache, starting SPACE_DETECTION operation');
    
    // Start space detection operation
    const spaceDetectionStarted = loadingStateManager.startOperation(
      LoadingOperation.SPACE_DETECTION,
      { userId, fromAuth: true }
    );
    
    if (spaceDetectionStarted) {
      const result = await smartSpaceRedirect(
        userId,
        navigate,
        location.pathname,
        location.pathname === '/discover'
      );
      
      // Complete space detection
      loadingStateManager.completeOperation(LoadingOperation.SPACE_DETECTION, result.redirected);
      
      if (result.redirected) {
        log.debug('Utils', `🚀 [EarlySpaceRedirect] SUCCESS: Redirected using strategy: ${result.strategy}`);
        setters.setRoutingInProgress(true);
        setters.setEarlyRedirectAttempted(true);
        
        // Cache the space info using enhanced cache manager
        if (result.spaceInfo) {
          log.debug('Utils', `🎯 [EarlySpaceRedirect] Caching space for instant future redirects: ${result.spaceInfo.name}`);
          enhancedCacheManager.cacheSpaceData(result.spaceInfo, userId, UserType.UNKNOWN);
        }
        
        loadingStateManager.completeOperation(LoadingOperation.AUTH_CHECK, true);
        return true;
      } else {
        log.debug('Utils', `🚀 [EarlySpaceRedirect] No redirect needed: ${result.strategy} - ${result.reason || 'User belongs on current page'}`);
        loadingStateManager.completeOperation(LoadingOperation.AUTH_CHECK, false);
        return false;
      }
    } else {
      log.debug('Utils', '🎯 [LoadingManager] SPACE_DETECTION operation blocked');
      loadingStateManager.completeOperation(LoadingOperation.AUTH_CHECK, false);
      return false;
    }
    
  } catch (error) {
    log.error('Utils', '🚀 [EarlySpaceRedirect] Error during space redirect:', error);
    loadingStateManager.completeOperation(LoadingOperation.AUTH_CHECK, false);
    return false;
  }
};

/**
 * Get initial session and handle initial routing logic
 */
export const getInitialSession = async (
  location: Location,
  navigate: NavigateFunction,
  state: SessionState,
  setters: SessionStateSetters,
  refs: SessionRefs,
  fetchUserDetails: (userId: string) => Promise<any>
): Promise<void> => {
  log.debug('Utils', '[AuthContext/getInitialSession] Attempting to get initial session...');
  setters.setLoading(true);
  setters.setHasRouted(false);
  setters.setEarlyRedirectAttempted(false);

  const { data: { session }, error } = await getSupabaseClient().auth.getSession();
  const currentUser = session?.user as User | null;

  // Reset userWantsDiscover flag on fresh login to ensure space redirection works properly
  if (currentUser && session) {
    log.debug('Utils', '[AuthContext/getInitialSession] New session detected, clearing userWantsDiscover flag');
    sessionStorage.removeItem('userWantsDiscover');
  }

  // Handle /discover path logic
  if (location.pathname === '/discover') {
    log.debug('Utils', '[AuthContext/getInitialSession] Currently on /discover.');
    
    const userIntendsToStayOnDiscoverViaFlag = sessionStorage.getItem('userWantsDiscover') === 'true';
    if (userIntendsToStayOnDiscoverViaFlag) {
      log.debug('Utils', '[AuthContext/getInitialSession] Clearing userWantsDiscover flag.');
      sessionStorage.removeItem('userWantsDiscover');
    }

    // Stay on /discover if conditions are met
    if (!currentUser || userIntendsToStayOnDiscoverViaFlag || refs.hasRoutedRef.current || refs.earlyRedirectAttemptedRef.current) {
      log.debug('Utils', '[AuthContext/getInitialSession] Condition to stay on /discover met (no user, flag, or already routed/attempted). Finalizing.');
      setters.setSession(session);
      setters.setUser(currentUser);
      if (currentUser) await fetchUserDetails(currentUser.id); 
      else setters.setUserDetails(null);
      setters.setLoading(false);
      setters.setRoutingInProgress(false);
      setters.setHasRouted(true);
      setters.setEarlyRedirectAttempted(true);
      return;
    } else {
      log.debug('Utils', '[AuthContext/getInitialSession] On /discover with active session, but fresh routing. Proceeding to main logic flow.');
      setters.setSession(session);
      setters.setUser(currentUser);
      if (currentUser) await fetchUserDetails(currentUser.id);
    }
  }

  // Set routing in progress for other paths
  setters.setRoutingInProgress(true);

  if (error) {
    log.error('Utils', '[AuthContext/getInitialSession] Error getting session:', error);
    setters.setSession(null);
    setters.setUser(null);
    setters.setUserDetails(null);
    setters.setLoading(false);
    setters.setRoutingInProgress(false);
    return;
  }

  if (session) {
    log.debug('Utils', '[AuthContext/getInitialSession] Session found (not on /discover path):');
    debugCheckStorageTokens();
    setters.setSession(session);
    
    if (currentUser) {
      setters.setUser(currentUser);
      await fetchUserDetails(currentUser.id);
    } else {
      setters.setUser(null);
      setters.setUserDetails(null);
    }

    // Handle explicit redirect path
    const explicitRedirectPath = sessionStorage.getItem('redirect_after_login');
    if (explicitRedirectPath) {
      log.debug('Utils', `[AuthContext/getInitialSession] Handling redirect_after_login to: ${explicitRedirectPath}`);
      sessionStorage.removeItem('redirect_after_login');
      if (location.pathname !== explicitRedirectPath) navigate(explicitRedirectPath, { replace: true });
      setters.setLoading(false);
      setters.setHasRouted(true);
      setters.setEarlyRedirectAttempted(true);
      setters.setRoutingInProgress(false);
      return;
    }

    // Attempt early space redirect - OPTIMIZED to include /app path
    if (!state.hasRouted && !state.earlyRedirectAttempted && currentUser && 
        !['/', '/login', '/signup', '/auth/callback', '/fix', '/storage-debug'].includes(location.pathname) && 
        !location.pathname.endsWith('/about') && !location.pathname.startsWith('/profile/')) {
      log.debug('Utils', `[AuthContext/getInitialSession] Attempting early space redirect for user: ${currentUser.id} on path: ${location.pathname}`);
      const redirected = await attemptEarlySpaceRedirect(currentUser.id, location, navigate, state, setters, refs);
      setters.setEarlyRedirectAttempted(true);
      if (redirected) {
        setters.setHasRouted(true);
        setters.setRoutingInProgress(false);
        setters.setLoading(false);
        return;
      }
      log.debug('Utils', '[AuthContext/getInitialSession] Early space redirect did not occur or failed.');
    }
    setters.setLoading(false);
    setters.setRoutingInProgress(false);
  } else {
    log.debug('Utils', '[AuthContext/getInitialSession] No session found.');
    setters.setSession(null);
    setters.setUser(null);
    setters.setUserDetails(null);
    setters.setLoading(false);
    setters.setRoutingInProgress(false);
    
    const publicPaths = ['/', '/discover', '/login', '/signup', '/auth/callback', '/fix', '/storage-debug'];
    if (!publicPaths.includes(location.pathname) && !location.pathname.endsWith('/about')) {
      log.debug('Utils', `[AuthContext/getInitialSession] No session, on protected path ${location.pathname}. ProtectedRoute will handle redirect.`);
    }
  }
};

/**
 * Handle post authentication routing
 */
export const handlePostAuthenticationRouting = async (
  userId: string,
  location: Location,
  navigate: NavigateFunction,
  state: SessionState,
  setters: SessionStateSetters,
  refs: SessionRefs
): Promise<void> => {
  log.debug('Utils', '🧭 (HPAR) Initiating post-authentication routing for user:', userId);
  setters.setRoutingInProgress(true);

  const routingSafetyTimeout = setTimeout(() => {
    log.error('Utils', '⏱️ SAFETY TIMEOUT: handlePostAuthenticationRouting took too long - forcing routingInProgress to false');
    if (refs.routingInProgressRef.current) {
      setters.setRoutingInProgress(false);
    }
  }, 15000);

  try {
    const explicitRedirectPath = sessionStorage.getItem('redirect_after_login');
    if (explicitRedirectPath) {
      log.debug('Utils', '➡️ (HPAR) Found explicit redirect path after login:', explicitRedirectPath);
      sessionStorage.removeItem('redirect_after_login');
      await new Promise(resolve => setTimeout(resolve, 50));
      log.debug('Utils', '🔀 (HPAR) Redirecting to explicit path:', explicitRedirectPath);
      navigate(explicitRedirectPath, { replace: true });
      setters.setHasRouted(true);
      clearTimeout(routingSafetyTimeout);
      return;
    }

    log.debug('Utils', '🔍 (HPAR) Calling attemptEarlySpaceRedirect for user:', userId);
    const didRedirectEarly = await attemptEarlySpaceRedirect(userId, location, navigate, state, setters, refs);
    
    await Promise.resolve();

    const currentPath = location.pathname;
    log.debug('Utils', '🔍 (HPAR) State after attemptEarlySpaceRedirect call:', {
      didRedirectEarly,
      hasRoutedFromState: refs.hasRoutedRef.current,
      currentPath,
    });

    if (!didRedirectEarly) {
      log.debug('Utils', '🤔 (HPAR) didRedirectEarly is false. Evaluating fallbacks.');
      
      if (location.pathname.includes('/space/') && didRedirectEarly) {
        log.debug('Utils', '✅ (HPAR) Already on a space page and attemptEarlySpaceRedirect confirmed it or handled it. No further action.');
      } else {
        const preferredSpaceAfterAttempt = await getUserPreferredSpace(userId);
        log.debug('Utils', '👑 (HPAR) Fresh preferred space after attempt (in fallback):', preferredSpaceAfterAttempt);

        if (currentPath.includes('/space/') && !preferredSpaceAfterAttempt) {
          log.debug('Utils', '❌ (HPAR) On a space page, but no preferred space confirmed for user. Redirecting to /discover.');
          navigate('/app', { replace: true });
          setters.setHasRouted(true);
        } else {
          // Profile route handling logic
          const isNewProfileFormat = currentPath.startsWith('/profile/');
          const isOldProfileFormat = currentPath.startsWith('/@');
          
          let usernameFromOldFormat: string | null = null;
          if (isOldProfileFormat) {
            const oldMatch = currentPath.match(/@([^/]+)/);
            if (oldMatch && oldMatch[1]) {
              usernameFromOldFormat = oldMatch[1];
            }
          }

          const isOldMalformedRoute = isOldProfileFormat && currentPath.includes('/space/');

          if (isOldMalformedRoute || (isOldProfileFormat && usernameFromOldFormat && !isNewProfileFormat)) {
            if (usernameFromOldFormat) {
              log.warn('Utils', `🚨 (HPAR) DETECTED OLD or MALFORMED PROFILE ROUTE: ${currentPath}. Redirecting to /profile/${usernameFromOldFormat}`);
              navigate(`/profile/${usernameFromOldFormat}`, { replace: true });
              setters.setHasRouted(true);
            } else {
              log.debug('Utils', '🔀 (HPAR) Malformed old profile route, but no username found. Redirecting to /discover.');
              navigate('/app', { replace: true });
              setters.setHasRouted(true);
            }
          } else if (isNewProfileFormat) {
            const isNewMalformedRoute = isNewProfileFormat && currentPath.includes('/space/');
            if (isNewMalformedRoute) {
              const newMatch = currentPath.match(/\/profile\/([^/]+)/);
              if (newMatch && newMatch[1]) {
                const usernameFromNew = newMatch[1];
                log.warn('Utils', `🚨 (HPAR) DETECTED MALFORMED NEW PROFILE ROUTE: ${currentPath}. Correcting to /profile/${usernameFromNew}`);
                navigate(`/profile/${usernameFromNew}`, { replace: true });
                setters.setHasRouted(true);
              } else {
                log.debug('Utils', '🔀 (HPAR) Malformed new profile route, but no username found. Redirecting to /discover.');
                navigate('/app', { replace: true });
                setters.setHasRouted(true);
              }
            } else {
              log.debug('Utils', '🛑 (HPAR) Correctly on a /profile/ route. Allowing profile view.', { currentPath });
              setters.setHasRouted(true);
            }
          } else {
            log.debug('Utils', '🔀 (HPAR) No space routed by AESR, not on an invalid space page, and not a profile page. Redirecting to /discover.');
            navigate('/app', { replace: true });
            setters.setHasRouted(true);
          }
        }
      }
    } else {
      log.debug('Utils', '✅ (HPAR) Routing to space was successful (attemptEarlySpaceRedirect returned true).');
    }
  } catch (error: unknown) {
    log.error('Utils', '❌ (HPAR) Error in handlePostAuthenticationRouting:', error);
    if (!refs.hasRoutedRef.current) {
      log.debug('Utils', '🔀 (HPAR) Redirecting to /discover due to error in routing flow.');
      navigate('/app', { replace: true });
      setters.setHasRouted(true);
    }
  } finally {
    log.debug('Utils', '🏁 (HPAR) Post-authentication routing finished.');
    setters.setRoutingInProgress(false);
    clearTimeout(routingSafetyTimeout);
  }
}; 