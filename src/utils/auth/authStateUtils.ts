import { Session, AuthChangeEvent, PostgrestError } from '@supabase/supabase-js'
import { NavigateFunction, Location } from 'react-router-dom'
import { User, SessionState, SessionStateSetters, SessionRefs } from './sessionUtils'

// Define AppError type for error handling
interface AppError {
  message: string;
}

// FIXED: Add focus event debouncing to prevent redundant auth state changes
let lastFocusEventTime = 0;
let lastAuthEventData: { event: string; userId?: string; tokenSnippet?: string } | null = null;
const FOCUS_DEBOUNCE_DELAY = 2000; // 2 seconds
const AUTH_EVENT_DEDUPE_DELAY = 1000; // 1 second

/**
 * Check if this auth event should be skipped due to recent identical events
 */
function shouldSkipRedundantAuthEvent(
  event: AuthChangeEvent,
  newSession: Session | null,
  currentSession: Session | null
): boolean {
  const now = Date.now();
  const userId = newSession?.user?.id;
  const tokenSnippet = newSession?.access_token?.substring(0, 9);
  
  // Check if this is likely a focus-triggered duplicate
  const isRecentFocusEvent = (now - lastFocusEventTime) < FOCUS_DEBOUNCE_DELAY;
  
  // Create current event signature
  const currentEventData = {
    event,
    userId,
    tokenSnippet
  };
  
  // Check if this is identical to the last event within the debounce window
  if (lastAuthEventData && 
      (now - lastFocusEventTime) < AUTH_EVENT_DEDUPE_DELAY &&
      lastAuthEventData.event === event &&
      lastAuthEventData.userId === userId &&
      lastAuthEventData.tokenSnippet === tokenSnippet) {
    console.log('🔁 [AuthDebounce] Skipping redundant auth event:', event, { userId, isRecentFocusEvent });
    return true;
  }
  
  // Update last event data
  lastAuthEventData = currentEventData;
  
  return false;
}

/**
 * Handle authentication state changes
 */
export const handleAuthStateChange = async (
  event: AuthChangeEvent,
  newSession: Session | null,
  location: Location,
  navigate: NavigateFunction,
  state: SessionState,
  setters: SessionStateSetters,
  refs: SessionRefs
): Promise<void> => {
  // FIXED: Skip redundant events early to prevent cascading issues
  if (shouldSkipRedundantAuthEvent(event, newSession, state.session)) {
    return;
  }

  // FIXED: Reduce logging noise for repeated events
  if (process.env.NODE_ENV === 'development') {
    console.log('🔔 Auth state change event:', event, {
      hasSession: !!newSession,
      user: newSession?.user ? { 
        id: newSession.user.id,
        email: newSession.user.email
      } : null,
      timestamp: new Date().toISOString()
    });
  }

  const currentSessionState = state.session; // Capture current session from state for comparison

  // Check if this is a focus-triggered revalidation (same user, same token)
  const currentUserId = state.user?.id; // Use user from state for this check
  const newUserId = newSession?.user?.id;
  const currentTokenSnippet = currentSessionState?.access_token?.substring(0, 9);
  const newTokenSnippet = newSession?.access_token?.substring(0, 9);
  
  const isIdenticalSessionContent = 
    currentSessionState && // Ensure currentSessionState is not null
    newSession &&
    currentUserId === newUserId && // Compare IDs
    currentSessionState.access_token === newSession.access_token && // Compare full tokens
    currentSessionState.expires_at === newSession.expires_at; // Compare expiry
  
  // FIXED: Detailed debug logging only in development and less frequent
  if (process.env.NODE_ENV === 'development' && Math.random() < 0.3) {
    console.log('[AuthFocusDebug] Current session in state BEFORE update:', {
      userId: currentUserId,
      accessTokenSnippet: currentTokenSnippet,
    });
    
    console.log('[AuthFocusDebug] Incoming newSession details:', {
      userId: newUserId,
      accessTokenSnippet: newTokenSnippet 
    });
  }

  // FIXED: Handle INITIAL_SESSION events more intelligently
  if (event === 'INITIAL_SESSION') {
    // Skip if this is the same session we already have
    if (isIdenticalSessionContent) {
      console.log('🔁 [AuthContext] INITIAL_SESSION: Identical session detected, skipping update');
      return;
    }
    
    // Skip if we already have a user and this is just a revalidation
    if (currentUserId && newUserId && currentUserId === newUserId) {
      console.log('🔁 [AuthContext] INITIAL_SESSION: Same user revalidation, skipping to prevent cascade');
      return;
    }
  }

  const isFocusRevalidation = event === 'SIGNED_IN' && isIdenticalSessionContent;
  
  if (isFocusRevalidation) {
    console.log('🔁 [AuthFocusDebug] Auth event: SIGNED_IN received, session content is identical. This is likely a focus-triggered re-validation. Skipping setSession and setUser.');
    return; 
  }
  
  // Smart setSession: Only update if newSession is substantively different or session is null
  if (!currentSessionState || !newSession || 
      currentSessionState.access_token !== newSession.access_token ||
      currentSessionState.user.id !== newSession.user.id ||
      currentSessionState.expires_at !== newSession.expires_at) {
    console.log('[AuthContext] New session content detected or no current session, calling setSession.');
    setters.setSession(newSession); 
  } else {
    console.log('[AuthContext] Session content appears identical, skipping setSession to maintain reference.');
  }
  
  const timeoutId = setTimeout(() => {
    if (state.routingInProgress) {
      console.log('⚠️ Auth state change timeout - forcing routing to complete');
      setters.setRoutingInProgress(false);
    }
  }, 5000); 
  
  const oldUser = state.user; 

  // setUser logic (existing smart update is good)
  if (newSession?.user) {
    const newUserFromSession = newSession.user as User; 
    if (
      !oldUser || 
      oldUser.id !== newUserFromSession.id ||
      oldUser.email !== newUserFromSession.email ||
      JSON.stringify(oldUser.user_metadata) !== JSON.stringify(newUserFromSession.user_metadata)
    ) {
      console.log('[AuthFocusDebug] User data changed or new user, calling setUser.');
      setters.setUser(newUserFromSession);
    } else {
      console.log('[AuthFocusDebug] User data appears unchanged (ID, email, metadata). Skipping setUser to potentially avoid unnecessary re-renders.');
    }
  } else {
    console.log('[AuthFocusDebug] No user in new session, calling setUser(null).');
    if (state.user !== null) setters.setUser(null); // Only call if user state is not already null
  }
  
  switch (event) {
    case 'SIGNED_IN':
      console.log('✅ Auth event: User signed in:', newSession?.user?.email);
      let didNavigateInHandler = false; // Tracks if this handler instance calls navigate

      if (newSession?.user) {
        const redirectPathFromStorage = sessionStorage.getItem('redirect_after_login');
        if (redirectPathFromStorage) {
          sessionStorage.removeItem('redirect_after_login');
          console.log(`[AuthContext] SIGNED_IN: Handling redirect_after_login to: ${redirectPathFromStorage}`);
          setTimeout(() => {
            if (location.pathname !== redirectPathFromStorage) {
              navigate(redirectPathFromStorage, { replace: true });
            }
          }, 50); // Reduced timeout, ensure it's minimal
          didNavigateInHandler = true;
        } else {
          // No explicit sessionStorage redirect. 
          // Default to /app for QuickSpaceRedirect to handle space finding.
          // This should happen if on generic auth pages OR if on /discover after a fresh login.
          const currentPath = location.pathname;
          const genericAuthPaths = ['/', '/login', '/signin', '/signup', '/auth/callback'];
          
          // Check if user explicitly wants to stay on the discover page
          const userWantsDiscover = sessionStorage.getItem('userWantsDiscover') === 'true';
          
          // If on discover page and user explicitly navigated there via the space switcher, check if they actually have spaces
          if (currentPath === '/discover' && userWantsDiscover) {
            console.log('[AuthContext] SIGNED_IN: On /discover with userWantsDiscover flag. Checking for spaces to determine correct redirect.');
            
            // Clear the flag immediately to prevent it from causing repeated issues
            sessionStorage.removeItem('userWantsDiscover');
            
            // We'll navigate to /app to check for spaces, which will redirect back to /discover if none exist
            // but will go to user's space if they have one
            console.log(`[AuthContext] SIGNED_IN: Redirecting to /app to verify space access.`);
            setTimeout(() => navigate('/app', { replace: true }), 50);
            didNavigateInHandler = true;
          }
          // Otherwise, if on a generic auth path, /app, or initial discover page (no switcher flag)
          // and not already on /app, navigate to /app.
          else if (genericAuthPaths.includes(currentPath) || currentPath === '/app' || 
              (currentPath === '/discover' && !userWantsDiscover)) {
            if (currentPath !== '/app') {
              console.log(`[AuthContext] SIGNED_IN: Defaulting to /app from ${currentPath} for space resolution.`);
              setTimeout(() => navigate('/app', { replace: true }), 50); // Reduced timeout
              didNavigateInHandler = true;
            } else {
              console.log('[AuthContext] SIGNED_IN: Already on /app. QuickSpaceRedirect will handle.');
              // No navigation needed, but routing will be in progress via QSR
            }
          } else {
            // Not a generic page, not /app, not /discover. User might be on a profile page or already in a space.
            console.log(`[AuthContext] SIGNED_IN: On specific page ${currentPath}. No default navigation to /app from here.`);
          }
        }
      }
      
      // Finalize routing flags for this event consistently
      setters.setHasRouted(true);
      setters.setEarlyRedirectAttempted(true); // Indicate early redirect phase has been considered/attempted
      
      if (!didNavigateInHandler) {
        // If this handler instance itself didn't call navigate(), 
        // ensure routingInProgress is false to unlock UI.
        // If it did navigate, the subsequent page load/auth event will manage routingInProgress.
        console.log(`[AuthContext] SIGNED_IN: No navigation by this handler or already on /app. Setting routingInProgress=false.`);
        setters.setRoutingInProgress(false);
      } else {
        console.log(`[AuthContext] SIGNED_IN: Navigation initiated by this handler. routingInProgress will be managed by subsequent events or navigation completion.`);
        // When navigation is initiated, routingInProgress should ideally be true until
        // the new page loads and its auth state is stable.
        // However, forcing it true here might conflict if navigation is quick.
        // The getInitialSession and page load itself should set it true.
        // For now, let's ensure it's not stuck on true if navigate wasn't called.
      }
      break;
      
    case 'SIGNED_OUT':
      console.log('👋 Auth event: User signed out');
      setters.setHasRouted(false);
      setters.setEarlyRedirectAttempted(false);
      setters.setRoutingInProgress(false);
      if (location.pathname !== '/' && 
          location.pathname !== '/signin' && 
          location.pathname !== '/signup' &&
          location.pathname !== '/login') {
        navigate('/', { replace: true });
      }
      break;
      
    case 'TOKEN_REFRESHED':
      console.log('🔄 Auth event: Token refreshed', {
        expires: newSession ? new Date(newSession.expires_at * 1000).toLocaleString() : 'N/A'
      });
      break;
      
    case 'USER_UPDATED':
      console.log('👤 Auth event: User updated');
      break;
      
    case 'INITIAL_SESSION':
      // FIXED: Handle INITIAL_SESSION events properly
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Auth event: Initial session processed');
      }
      break;
      
    default:
      console.log(`ℹ️ Unhandled auth event: ${event}`);
      break;
  }
  
  clearTimeout(timeoutId);
}; 