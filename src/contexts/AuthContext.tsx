import React, { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback, useMemo } from 'react'
import { Session, User as SupabaseUser, AuthError, PostgrestError } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import { fetchUserDetails } from '@/utils/authUtils'
import { useNavigate, useLocation, NavigateFunction, Location } from 'react-router-dom'
import { generateSlug } from '@/utils/slugUtils'
import { getUserSpaceRedirectPath } from '@/utils/getUserSpaceRedirectPath';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getUserPreferredSpace } from '@/utils/authContextUtils';
import { Database } from "@/types/supabase";

// Define a common AppError type for caught exceptions
interface AppError {
  message: string;
  // name?: string; // Optional: Remove 'name' if not consistently part of AppError
}

interface AuthDebugRoutingState {
  hasRouted: boolean;
  routingInProgress: boolean;
  earlyRedirectAttempted: boolean;
  pathname: string;
}

interface AuthDebugRouting {
  state: AuthDebugRoutingState;
  resetFlags: () => void;
  getCurrentUser: () => User | null;
  testSpaceRouting: () => Promise<{ subdomain: string; id?: string; name?: string; owner_id?: string; } | string | null>;
  forceRedirect: (subdomain?: string) => Promise<void>;
  testDirectNavigation: (path?: string) => string;
  inspectNavigate: () => { navigate: NavigateFunction; location: Location };
  showRedirectHistory: () => {
    successes: RedirectHistoryEntry[];
    failures: RedirectHistoryEntry[];
    errors: RedirectHistoryEntry[];
    authErrors: string[];
  };
}

interface SpaceCacheData {
  subdomain: string;
  id: string;
  name: string;
  owner_id: string;
}

interface RedirectHistoryEntry {
  timestamp: string;
  from?: string;
  to?: string;
  userId?: string;
  path?: string;
  reason?: string;
  error?: string;
  [key: string]: unknown; // Changed from any to unknown
}

// Specific type for the 'owned' spaces returned by getSpacesFromDB, based on its select query
interface OwnedSpaceInfo {
  id: string;
  name: string;
  subdomain: string;
  owner_id: string;
}

// Type for the nested 'spaces' object within the 'access' part of getSpacesFromDB result
interface NestedSpaceInfo {
  id: string;
  name: string;
  subdomain: string;
}

// Type for the items in the 'access' array of getSpacesFromDB result
interface DebugSpaceMember {
  id: string;
  space_id: string;
  status: Database['public']['Tables']['space_members']['Row']['status'];
  role: Database['public']['Tables']['space_members']['Row']['role'];
  spaces: NestedSpaceInfo | null;
}

// Full space row type, typically from generated types
type FullSpaceRow = Database['public']['Tables']['spaces']['Row'];

// Type for space members as returned by getSpacesFromDB, joining with spaces table
type SpaceMemberRow = Database['public']['Tables']['space_members']['Row'] & {
  spaces: FullSpaceRow | null; 
};

// Corrected definition for the structure returned by getSpacesFromDB (successful case)
interface SpacesFromDBResult {
  owned: OwnedSpaceInfo[] | null; 
  access: DebugSpaceMember[] | null; // Uses DebugSpaceMember for the 'access' property
}

interface CachedSpacesResult {
  lastCreatedSpace: SpaceCacheData | null;
  lastVisitedSpace: SpaceCacheData | null;
}

interface AuthDebugSpaces {
  getSpacesFromDB: (skipCache?: boolean) => Promise<SpacesFromDBResult | { error: PostgrestError | unknown } | string>;
  getCachedSpaces: () => CachedSpacesResult | { error: unknown };
  clearCachedSpaces: () => boolean | { error: unknown };
}

interface AuthDebugType {
  getSession: () => Promise<void>;
  checkTokens: () => boolean;
  errors: string[];
  clearSession: () => Promise<void>;
  routing: AuthDebugRouting;
  spaces: AuthDebugSpaces;
}

/**
 * Debug utility to check for token presence in localStorage
 * This helps with troubleshooting auth issues on different browsers
 */
function debugCheckStorageTokens() {
  try {
    console.log('🔍 Checking localStorage for Supabase tokens...');
    
    // Look for any Supabase auth tokens
    const supabaseKeys = Object.keys(localStorage)
      .filter(key => key.startsWith('sb-') && key.includes('auth'));
    
    if (supabaseKeys.length > 0) {
      console.log('✅ Found Supabase tokens:', supabaseKeys);
      
      // Check one token for expiration
      try {
        const tokenKey = supabaseKeys.find(key => key.includes('auth.token'));
        if (tokenKey) {
          const tokenData = JSON.parse(localStorage.getItem(tokenKey) || '{}');
          if (tokenData.expires_at) {
            const expiresAt = new Date(tokenData.expires_at * 1000);
            const now = new Date();
            const isExpired = expiresAt < now;
            console.log('🔍 Token expiration check:', {
              expiresAt: expiresAt.toLocaleString(),
              now: now.toLocaleString(),
              isExpired,
              timeRemaining: isExpired ? 'Expired' : 
                Math.floor((expiresAt.getTime() - now.getTime()) / 1000 / 60) + ' minutes'
            });
          }
        }
      } catch (e) {
        console.warn('⚠️ Error parsing token data:', e);
      }
      
      return true;
    } else {
      console.log('❌ No Supabase tokens found in localStorage');
      return false;
    }
  } catch (error) {
    console.warn('⚠️ Error checking localStorage:', error);
    return false;
  }
}

// Define our custom User type that includes the 'url' property
export interface User extends SupabaseUser {
  url?: string | null;
  // Add any other custom properties you might have on your user object
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
    url?: string; // if you also store it in user_metadata
    username?: string;
    website?: string;
    // you might also have other provider-specific data here
  };
  // If you directly attach other custom fields to the root user object from your DB:
  // e.g., banner_url?: string;
  // bio?: string;
  // etc.
}

// Helper to generate a unique user URL slug
async function generateUniqueUserSlug(user: User) {
  if (!user) return null;

  // Destructure needed properties to simplify type inference
  const userId = user.id;
  const userEmail = user.email;
  const meta = user.user_metadata;

  // Type assertions for clarity
  const username = meta.username as string | undefined;
  const firstName = meta.firstName as string | undefined;
  const lastName = meta.lastName as string | undefined;
  const fullName = meta.full_name as string | undefined;

  // Try username, email prefix, full name, or fallback to user id
  const potentialBases: (string | undefined | null)[] = [
    username,
    userEmail?.split('@')[0],
    (firstName && lastName) ? `${firstName}-${lastName}` : null,
    fullName,
    userId
  ];
  const baseCandidates: string[] = potentialBases.filter((s): s is string => typeof s === 'string' && s.length > 0);

  for (const base of baseCandidates) {
    let slug = generateSlug(base);
    let unique = false;
    let attempt = 0;
    let candidate = slug;
    while (!unique && attempt < 5) {
      // Check uniqueness in users table
      // @ts-expect-error - Bypassing "Type instantiation is excessively deep" error (or if cast below fixes it, this expects an error that might not be there)
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('url', candidate)
        .maybeSingle() as { data: { id: string } | null; error: PostgrestError | null };

      if (!data && !error) {
        unique = true;
        slug = candidate;
        break;
      }
      // If not unique, append a short random string
      candidate = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
      attempt++;
    }
    if (unique) return slug;
  }
  // Fallback: user id
  return user.id;
}

// Define the shape of the context
interface AuthContextType {
  session: Session | null;
  user: User | null;
  userDetails: Database['public']['Tables']['users']['Row'] | null;
  loading: boolean;
  routingInProgress: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | AppError | null; success?: boolean; }>;
  signUp: (
    email: string,
    password: string,
    options?: { username?: string; firstName?: string; lastName?: string }
  ) => Promise<{ data?: { user: SupabaseUser | null; session: Session | null; } | null; error: AuthError | AppError | null; success?: boolean; }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | AppError | null; success?: boolean; }>;
  resetTestAccountState: () => Promise<void>;
  debugGetSession: () => Promise<void>;
}

// Create the context with default values
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Custom hook to use the auth context
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [userDetails, setUserDetails] = useState<Database['public']['Tables']['users']['Row'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [authErrors, setAuthErrors] = useState<string[]>([])
  const [hasRouted, setHasRouted] = useState(false)
  const [routingInProgress, setRoutingInProgress] = useState(false)
  const [earlyRedirectAttempted, setEarlyRedirectAttempted] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const redirectAfterLoginRef = useRef<string | null>(null)
  const routingInProgressRef = useRef(routingInProgress);
  const hasRoutedRef = useRef(hasRouted);
  const earlyRedirectAttemptedRef = useRef(earlyRedirectAttempted);
  const loadingRef = useRef(loading);
  
  // Debug function to get current session
  const debugGetSession = async (): Promise<void> => {
    try {
      console.log('🔍 Manual session check triggered');
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ Session check error:', error);
        return;
      }
      
      console.log('📋 Current session state:', {
        hasSession: !!data.session,
        user: data.session?.user?.email,
        expires: data.session ? new Date(data.session.expires_at * 1000).toLocaleString() : 'N/A'
      });
      
      debugCheckStorageTokens();
    } catch (err) {
      console.error('❌ Error in debugGetSession:', err);
    }
  };
  
  // Load user details when user changes
  useEffect(() => {
    if (user) {
      console.log(`👤 Loading user details for user: ${user.id}`);
      fetchUserDetails(user.id)
        .then((details) => {
          console.log('✅ User details loaded');
          setUserDetails(details);
        })
        .catch((error) => {
          console.error('❌ Error loading user details:', error);
          setAuthErrors(prev => [...prev, `Failed to load user details: ${error.message}`]);
        });
    } else {
      setUserDetails(null);
    }
  }, [user]);

  // DEBUG: Periodically check session status
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const { data } = await supabase.auth.getSession();
        
        if (data.session !== null) {
          console.log('⏱️ Session check (user logged in):', {
            email: data.session?.user?.email,
            expires: new Date(data.session.expires_at * 1000).toLocaleTimeString(),
            remainingTime: Math.round((data.session.expires_at * 1000 - Date.now()) / 1000 / 60) + ' minutes'
          });
        } else if (user !== null) {
          // We have user in state but no session - potential sync issue
          console.warn('⚠️ Session/State mismatch: User in state but no session found');
        }
      } catch (err) {
        console.error('❌ Periodic session check error:', err);
      }
    }, 10000); // Check every 10 seconds
    
    return () => clearInterval(interval);
  }, [user]);

  // Early immediate space redirection - runs only once per session
  const attemptEarlySpaceRedirect = useCallback(async (userId: string): Promise<boolean> => {
    // If on /discover, do not attempt to redirect away.
    if (location.pathname === '/discover') {
      console.log('AuthContext/attemptEarlySpaceRedirect: Currently on /discover. Early space redirection skipped.');
      // Set flags to indicate this path was considered, but no actual redirect will happen here.
      // This helps prevent other logic from re-attempting a redirect from /discover immediately.
      setHasRouted(true); // Treat as handled to prevent re-triggering from other effects
      setEarlyRedirectAttempted(true); // Mark as attempted
      // routingInProgress is not set to false here as it's typically managed by the calling flow or finally blocks.
      return false; // Indicate no redirect was made by this function
    }

    // Only redirect from landing pages
    const landingPaths = ['/', '/app', '/discover'];
    const isLandingPage = landingPaths.includes(location.pathname);
    if (!isLandingPage) {
      console.log('Early redirect skipped - not on a landing page:', location.pathname);
      setHasRouted(true);
      setEarlyRedirectAttempted(true);
      return false;
    }
    if (routingInProgressRef.current || hasRoutedRef.current || earlyRedirectAttemptedRef.current) {
      console.log('Early redirect skipped - already in progress, completed, or previously attempted');
      return false;
    }
    if (location.pathname.includes('/space/')) {
      console.log('Early redirect skipped - already on a space page:', location.pathname);
      setHasRouted(true);
      setEarlyRedirectAttempted(true);
      return true;
    }
    console.log('Attempting early space redirection for user:', userId);
    setEarlyRedirectAttempted(true);
    const safetyTimeoutId = setTimeout(() => {
      console.log('Safety timeout triggered in attemptEarlySpaceRedirect');
    }, 10000);
    try {
      console.log('Calling getUserPreferredSpace to find best space for user:', userId);
      const spaceData = await getUserPreferredSpace(userId);
      clearTimeout(safetyTimeoutId);
      if (spaceData) {
        console.log('Redirecting to user space:', spaceData.subdomain);
        const targetPath = `/space/${spaceData.subdomain}`;
        console.log(`Navigating to ${targetPath}`);
        navigate(targetPath, { replace: true });
        setHasRouted(true);
        try {
          const redirectHistory = JSON.parse(sessionStorage.getItem('redirectHistory') || '[]');
          redirectHistory.push({
            timestamp: new Date().toISOString(),
            from: location.pathname,
            to: targetPath,
            userId
          });
          sessionStorage.setItem('redirectHistory', JSON.stringify(redirectHistory));
        } catch (e) {
          console.error('Error saving redirect history:', e);
        }
        return true;
      } else {
        console.log('No user space found. Staying on current page for now.');
        try {
          const redirectFailures = JSON.parse(sessionStorage.getItem('redirectFailures') || '[]');
          redirectFailures.push({
            timestamp: new Date().toISOString(),
            path: location.pathname,
            userId,
            reason: 'No spaces found'
          });
          sessionStorage.setItem('redirectFailures', JSON.stringify(redirectFailures));
        } catch (e: unknown) {
          console.error('Error saving redirect failure:', e instanceof Error ? e.message : String(e));
        }
        return false;
      }
    } catch (error: unknown) {
      clearTimeout(safetyTimeoutId);
      console.error('Early redirect error:', error);
      try {
        const redirectErrors = JSON.parse(sessionStorage.getItem('redirectErrors') || '[]');
        redirectErrors.push({
          timestamp: new Date().toISOString(),
          path: location.pathname,
          userId,
          error: error instanceof Error ? error.message : String(error)
        });
        sessionStorage.setItem('redirectErrors', JSON.stringify(redirectErrors));
      } catch (e: unknown) {
        console.error('Error saving redirect error:', e instanceof Error ? e.message : String(e));
      }
      return false;
    } finally {
      console.log('(AESR) finally block. HPAR should be managing overall routingInProgress.');
      setRoutingInProgress(false);
    }
    return false; 
  }, [navigate, location.pathname, setHasRouted, setEarlyRedirectAttempted]);

  // useEffect for initial session restore (keep this one)
  useEffect(() => {
    async function getInitialSession() {
      console.log('[AuthContext/getInitialSession] Attempting to get initial session...');
        setLoading(true);
      setHasRouted(false);
      setEarlyRedirectAttempted(false);
      // Do not set routingInProgress to true yet if we might bail for /discover

      const { data: { session }, error } = await supabase.auth.getSession();
      const currentUser = session?.user as User | null;

      // --- START MODIFICATION FOR /discover ---
      if (location.pathname === '/discover') {
        console.log('[AuthContext/getInitialSession] Currently on /discover.');
        
        const userIntendsToStayOnDiscoverViaFlag = sessionStorage.getItem('userWantsDiscover') === 'true';
        if (userIntendsToStayOnDiscoverViaFlag) {
            console.log('[AuthContext/getInitialSession] Clearing userWantsDiscover flag.');
            sessionStorage.removeItem('userWantsDiscover');
        }

        // Stay on /discover if:
        // 1. No current user (logged out).
        // 2. User explicitly navigated here via a flag (handled by clearing flag and then this check).
        // 3. Routing has already been attempted/completed (e.g., refreshing /discover).
        // 4. User explicitly came here via the Space Switcher (record this in sessionStorage)
        if (!currentUser || userIntendsToStayOnDiscoverViaFlag || hasRoutedRef.current || earlyRedirectAttemptedRef.current) {
            console.log('[AuthContext/getInitialSession] Condition to stay on /discover met (no user, flag, or already routed/attempted). Finalizing.');
            setSession(session); 
            setUser(currentUser);    
            if (currentUser) await fetchUserDetails(currentUser.id); else setUserDetails(null);
            setLoading(false); 
            setRoutingInProgress(false); 
            // Set flags to true because we've made a decision for this path.
            setHasRouted(true);
            setEarlyRedirectAttempted(true);
            return; 
          } else {
            // User is on /discover, has a session, but it's a fresh routing scenario (e.g. login landed here).
            // Do not return; allow main logic flow to determine actual destination (e.g. preferred space via /app).
            console.log('[AuthContext/getInitialSession] On /discover with active session, but fresh routing. Proceeding to main logic flow.');
            setSession(session); // Ensure session/user is set for subsequent logic
            setUser(currentUser);
            if (currentUser) await fetchUserDetails(currentUser.id);
            // routingInProgress will be set to true after this block.
        }
      }
      // --- END MODIFICATION FOR /discover ---

      // If not on /discover OR on /discover but fresh routing, proceed.
      // Now it's safe to set routingInProgress for other paths.
      setRoutingInProgress(true); 

      if (error) {
        console.error('[AuthContext/getInitialSession] Error getting session:', error);
        setSession(null); setUser(null); setUserDetails(null); setLoading(false); setRoutingInProgress(false);
        return;
      }

      if (session) {
        console.log('[AuthContext/getInitialSession] Session found (not on /discover path):');
        debugCheckStorageTokens();
        setSession(session);
        if (currentUser) { 
            setUser(currentUser); 
            await fetchUserDetails(currentUser.id);
              } else {
            setUser(null);
            setUserDetails(null);
        }

        const explicitRedirectPath = sessionStorage.getItem('redirect_after_login');
        if (explicitRedirectPath) {
          console.log(`[AuthContext/getInitialSession] Handling redirect_after_login to: ${explicitRedirectPath}`);
          sessionStorage.removeItem('redirect_after_login');
          if (location.pathname !== explicitRedirectPath) navigate(explicitRedirectPath, { replace: true });
          setLoading(false); setHasRouted(true); setEarlyRedirectAttempted(true); setRoutingInProgress(false);
          return;
        }

        if (!hasRouted && !earlyRedirectAttempted && currentUser && 
            !['/', '/login', '/signup', '/auth/callback', '/fix', '/storage-debug'].includes(location.pathname) && 
            !location.pathname.endsWith('/about') && !location.pathname.startsWith('/profile/')) {
          console.log(`[AuthContext/getInitialSession] Attempting early space redirect for user: ${currentUser.id} on path: ${location.pathname}`);
          const redirected = await attemptEarlySpaceRedirect(currentUser.id);
              setEarlyRedirectAttempted(true);
          if (redirected) {
            setHasRouted(true); setRoutingInProgress(false); setLoading(false);
            return;
          }
          console.log('[AuthContext/getInitialSession] Early space redirect did not occur or failed.');
        }
        setLoading(false); setRoutingInProgress(false);
        } else {
        console.log('[AuthContext/getInitialSession] No session found.');
        setSession(null); setUser(null); setUserDetails(null); setLoading(false); setRoutingInProgress(false);
        const publicPaths = ['/', '/discover', '/login', '/signup', '/auth/callback', '/fix', '/storage-debug'];
        if (!publicPaths.includes(location.pathname) && !location.pathname.endsWith('/about')) {
          console.log(`[AuthContext/getInitialSession] No session, on protected path ${location.pathname}. ProtectedRoute will handle redirect.`);
        }
      }
    }

    getInitialSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Keep empty deps for mount-only execution

  // NEW: Moved useEffect for ensureUserUrl to the top level
        useEffect(() => {
          async function ensureUserUrl() {
      if (user && !user.url) { // <--- Now we can directly access user.url without casting
              try {
                console.log('Ensuring user has a URL for user ID:', user.id);
          const { data, error: rpcError } = await supabase.rpc('ensure_user_url', {
                  user_id: user.id
                }) as { data: string | null; error: PostgrestError | null };
                
          if (rpcError) {
            console.error('Failed to ensure user URL:', rpcError.message);
                } else if (data) {
                  console.log('User URL set/retrieved successfully:', data);
            setUser(prevUser => {
              if (prevUser && prevUser.url !== data) {
                // Ensure the returned object matches the User interface
                return { ...prevUser, url: data } as User;
              }
              return prevUser;
            });
                }
              } catch (err) {
                console.error('Error in ensureUserUrl:', err);
              }
            }
          }
    if (user) { 
          ensureUserUrl();
    }
        }, [user]);

  // Listen for auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('🔔 Auth state change event:', event, {
          hasSession: !!newSession,
          user: newSession?.user ? { 
            id: newSession.user.id,
            email: newSession.user.email
          } : null,
          timestamp: new Date().toISOString()
        });

        const currentSessionState = session; // Capture current session from state for comparison

        // Check if this is a focus-triggered revalidation (same user, same token)
        const currentUserId = user?.id; // Use user from state for this check
        const newUserId = newSession?.user?.id;
        const currentTokenSnippet = currentSessionState?.access_token?.substring(0, 9);
        const newTokenSnippet = newSession?.access_token?.substring(0, 9);
        
        const isIdenticalSessionContent = 
          currentSessionState && // Ensure currentSessionState is not null
          newSession &&
          currentUserId === newUserId && // Compare IDs
          currentSessionState.access_token === newSession.access_token && // Compare full tokens
          currentSessionState.expires_at === newSession.expires_at; // Compare expiry
        
        console.log('[AuthFocusDebug] Current session in state BEFORE update:', {
          userId: currentUserId,
          accessTokenSnippet: currentTokenSnippet,
          // isIdenticalToNewSession: isIdenticalSession // Old logic
        });
        
        console.log('[AuthFocusDebug] Incoming newSession details:', {
          userId: newUserId,
          accessTokenSnippet: newTokenSnippet 
        });

        const isFocusRevalidation = event === 'SIGNED_IN' && isIdenticalSessionContent;
        
        if (isFocusRevalidation) {
          console.log('🔁 [AuthFocusDebug] Auth event: SIGNED_IN received, session content is identical. This is likely a focus-triggered re-validation. Skipping setSession and setUser.');
          // DO NOT call setSession(newSession) if content is identical to prevent new reference
          // setUser is already handled by the more detailed check below, which would also skip if user content is identical
          return; 
        }
        
        // Smart setSession: Only update if newSession is substantively different or session is null
        if (!currentSessionState || !newSession || 
            currentSessionState.access_token !== newSession.access_token ||
            currentSessionState.user.id !== newSession.user.id ||
            currentSessionState.expires_at !== newSession.expires_at) {
          console.log('[AuthContext] New session content detected or no current session, calling setSession.');
          setSession(newSession); 
        } else {
          console.log('[AuthContext] Session content appears identical, skipping setSession to maintain reference.');
        }
        
        const timeoutId = setTimeout(() => {
          if (routingInProgress) {
            console.log('⚠️ Auth state change timeout - forcing routing to complete');
            setRoutingInProgress(false);
          }
        }, 5000); 
        
        const oldUser = user; 

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
            setUser(newUserFromSession);
          } else {
            console.log('[AuthFocusDebug] User data appears unchanged (ID, email, metadata). Skipping setUser to potentially avoid unnecessary re-renders.');
          }
        } else {
          console.log('[AuthFocusDebug] No user in new session, calling setUser(null).');
          if (user !== null) setUser(null); // Only call if user state is not already null
        }
        
        switch (event) {
          case 'SIGNED_IN':
            console.log('✅ Auth event: User signed in:', newSession?.user?.email);
            let didNavigateInHandler = false; // Tracks if this handler instance calls navigate

            if (newSession?.user) {
              // If routing flags from refs indicate a previous phase already handled it and is not currently in progress.
              // This check might be too aggressive if a SIGNED_IN event should always re-evaluate.
              // For now, let's assume a SIGNED_IN event means a fresh decision point unless it's a focus revalidation.
              // if (earlyRedirectAttemptedRef.current && hasRoutedRef.current && !routingInProgressRef.current) {
              //   console.log('[AuthContext] SIGNED_IN: Flags indicate routing already handled and not in progress. No action.');
              //   setRoutingInProgress(false); 
              //   return; 
              // }

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
                
                // If on discover page and user explicitly navigated there via the space switcher, stay there
                if (currentPath === '/discover' && userWantsDiscover) {
                  console.log('[AuthContext] SIGNED_IN: On /discover page with userWantsDiscover flag. No redirect.');
                  sessionStorage.removeItem('userWantsDiscover'); // Clear the flag after using it
                  didNavigateInHandler = false;
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
            setHasRouted(true);
            setEarlyRedirectAttempted(true); // Indicate early redirect phase has been considered/attempted
            
            if (!didNavigateInHandler) {
              // If this handler instance itself didn't call navigate(), 
              // ensure routingInProgress is false to unlock UI.
              // If it did navigate, the subsequent page load/auth event will manage routingInProgress.
              console.log(`[AuthContext] SIGNED_IN: No navigation by this handler or already on /app. Setting routingInProgress=false.`);
              setRoutingInProgress(false);
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
            setHasRouted(false);
            setEarlyRedirectAttempted(false);
            setRoutingInProgress(false);
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
            
          default:
            console.log(`ℹ️ Unhandled auth event: ${event}`);
            break;
        }
        
        clearTimeout(timeoutId);
      });

    return () => {
      console.log('🧹 Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname, routingInProgress, session?.access_token, user]); // Updated dependencies

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    console.log('🔑 Signing in user:', email);
    setLoading(true);
    setAuthErrors([]); // Clear previous errors

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.warn('⚠️ Sign in error:', error.message);
        setAuthErrors(prev => [...prev, `Sign in failed: ${error.message}`]);
        // Ensure the returned error object matches AppError (message only)
        const errorToReturn: AppError = { message: error.message };
        return { error: errorToReturn, success: false };
      }

      if (!data.session || !data.user) {
        console.warn('🤔 Sign in attempt returned no session or no user, but no explicit error.');
        const noSessionError: AppError = { message: 'Sign in failed: No session or user returned.' };
        setAuthErrors(prev => [...prev, noSessionError.message]);
        return { error: noSessionError, success: false };
      }
      
      console.log('✅ Sign in successful. Session:', data.session, 'User:', data.user);
      setSession(data.session);
      const typedUser = data.user as User; 
      setUser(typedUser);
      
      // Note: setUserIdForRouting was removed as it was part of an erroneous previous edit.
      // The main session effect should handle post-auth routing logic.

      return { error: null, success: true };
    } catch (err: unknown) {
      console.error('❌ Exception during sign in:', err);
      const message = err instanceof Error ? err.message : String(err);
      setAuthErrors(prev => [...prev, `Sign in exception: ${message}`]);
      const errorResult: { error: AppError; success: boolean } = { error: { message }, success: false };
      return errorResult;
    } finally {
      setLoading(false);
    }
  };

  // Sign up with email and password
  const signUp = async (email: string, password: string, options?: { username?: string; firstName?: string; lastName?: string }) => {
    console.log('📝 Signing up user:', email, options ? 'with metadata' : 'without metadata');
    // Prepare metadata if provided
    const metadata = options ? {
      first_name: options.firstName,
      last_name: options.lastName,
      full_name: `${options.firstName} ${options.lastName}`.trim()
    } : undefined;
    try {
      // Clear any existing session
      console.log('🧹 Clearing any existing session before sign up');
      await supabase.auth.signOut();
      setHasRouted(false);
      // Attempt to sign up
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: metadata
        }
      });
      if (error) {
        console.error('❌ Sign up error:', error.message);
        setAuthErrors(prev => [...prev, `Sign up error: ${error.message}`]);
        return { error, data: null };
      }
      console.log('✅ Sign up successful', {
        user: data.user?.email,
        id: data.user?.id,
        hasSession: !!data.session
      });
      // --- Automatic slug generation and user url update ---
      if (data.user && data.user.id) {
        try {
          console.log('Ensuring new user has a URL for user ID:', data.user.id);
          // Call our database function to ensure user has a URL
          const { data: urlData, error: urlError } = await supabase.rpc('ensure_user_url', {
            user_id: data.user.id
          });
          
          if (urlError) {
            console.error('Failed to ensure URL for new user:', urlError.message);
          } else if (urlData) {
            console.log('URL for new user generated successfully:', urlData);
            // Update user state with the URL
            setUser((prevUser: User | null) => prevUser ? { ...prevUser, url: urlData } as User : prevUser);
          }
        } catch (err: unknown) {
          console.error('Error during URL generation for new user:', err instanceof Error ? err.message : String(err));
        }
      }
      // --- End automatic slug generation ---
      return { error: null, data, success: true };
    } catch (err: unknown) {
      console.error('❌ Exception during sign up:', err);
      const message = err instanceof Error ? err.message : String(err);
      setAuthErrors(prev => [...prev, `Sign up exception: ${message}`]);
      return { error: { message } as AppError, data: null, success: false };
    }
  };

  // Sign out user
  const signOut = async () => {
    console.log('🚪 Signing out user');
    
    // --- START MODIFICATION: Clear state and storage immediately ---
    console.log('🧹 Immediately clearing client-side session state and storage...');
    setUser(null);
    setSession(null);
    setUserDetails(null);
    setHasRouted(false);
    setEarlyRedirectAttempted(false);
    setRoutingInProgress(false); // Reset routing progress immediately
      
    // Clear localStorage items
    const localItemsToClear = [
        'selectedSpaceId', 
        'lastVisitedSpace',
      'lastCreatedSpace',
        'spaceData',
      'supabase.auth.token' // Specific Supabase token key
      ];
    localItemsToClear.forEach(item => {
        try {
          localStorage.removeItem(item);
        } catch (e) {
          console.warn(`Failed to remove ${item} from localStorage:`, e);
        }
      });
      
      // Clear sessionStorage items
    const sessionItemsToClear = [
        'selectedSpaceId', 
        'spaceData', 
        'redirect_after_login', 
        'coming_from_space_switcher'
      ];
    sessionItemsToClear.forEach(item => {
        try {
          sessionStorage.removeItem(item);
        } catch (e) {
          console.warn(`Failed to remove ${item} from sessionStorage:`, e);
        }
      });
      
    // Clear any Supabase keys in localStorage (important for Safari and general cleanup)
      try {
        Object.keys(localStorage)
        .filter(key => key.startsWith('sb-')) // Catches all Supabase-related keys
          .forEach(key => {
          console.log(`Removing Supabase localStorage key: ${key}`);
            localStorage.removeItem(key);
          });
      } catch (e) {
        console.warn('Failed to clear Supabase local storage items:', e);
      }
    // --- END MODIFICATION ---
    
    try {
      // Store the current pathname to determine if we need to manually refresh
      const currentPath = window.location.pathname;
      const isDiscoverPage = currentPath === '/discover';
      
      // 1. First clear all storage items that might cause redirect loops
      // console.log('🧹 Clearing auth-related storage items');
      
      // Clear localStorage items - add lastCreatedSpace to fix the redirection issue
      // const localItems = [
      //   'selectedSpaceId', 
      //   'lastVisitedSpace',
      //   'lastCreatedSpace', // Important: Add this to fix space redirection issues
      //   'spaceData',
      //   // Add Supabase-specific items for Safari
      //   'supabase.auth.token'
      // ];
      
      // localItems.forEach(item => {
      //   try {
      //     localStorage.removeItem(item);
      //   } catch (e) {
      //     console.warn(`Failed to remove ${item} from localStorage:`, e);
      //   }
      // });
      
      // Clear sessionStorage items
      // const sessionItems = [
      //   'selectedSpaceId', 
      //   'spaceData', 
      //   'redirect_after_login', 
      //   'coming_from_space_switcher'
      // ];
      
      // sessionItems.forEach(item => {
      //   try {
      //     sessionStorage.removeItem(item);
      //   } catch (e) {
      //     console.warn(`Failed to remove ${item} from sessionStorage:`, e);
      //   }
      // });
      
      // Clear any Supabase keys in localStorage (important for Safari)
      // try {
      //   Object.keys(localStorage)
      //     .filter(key => key.startsWith('sb-'))
      //     .forEach(key => {
      //       console.log(`Removing Supabase key: ${key}`);
      //       localStorage.removeItem(key);
      //     });
      // } catch (e) {
      //   console.warn('Failed to clear Supabase local storage items:', e);
      // }
      
      // 2. Reset routing flag -- MOVED UP
      // setHasRouted(false);
      
      // 3. Sign out from Supabase
      console.log('🔑 Calling Supabase signOut method');
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      console.log('✅ Supabase sign out successful');
      
      // 4. Reset state -- MOVED UP
      // setUser(null);
      // setSession(null);
      // setUserDetails(null);
      
      // 5. Safari-specific fix for Discover page - force redirect with page reload
      if (isDiscoverPage) {
        console.log('📱 Detected sign out from Discover page, using hard redirect');
        // Use replace to avoid back button issues, and add timestamp to bust cache
        window.location.replace(`/?t=${Date.now()}`);
        return; // Exit early to allow the redirect to happen
      }
      
      // 6. For non-Discover pages, use React Router if possible, fallback to location
      console.log('🔀 Navigating to landing page after sign out');
      try {
        // Navigate with replace to avoid back button issues
        navigate('/', { replace: true });
        
        // Double-check with a delayed fallback for Safari
        setTimeout(() => {
          if (window.location.pathname !== '/') {
            console.log('⚠️ Navigation may have failed, using fallback redirect');
            window.location.replace('/');
          }
        }, 500);
      } catch (navError) {
        console.error('❌ Navigation error:', navError);
        // Fallback to direct location change
        window.location.replace('/');
      }
    } catch (error: unknown) {
      console.error('❌ Error signing out:', error);
      setAuthErrors(prev => [...prev, `Sign out error: ${error instanceof Error ? error.message : String(error)}`]);
      
      // Even on error, make sure we reset the app state
      setUser(null);
      setSession(null);
      
      // Force a hard redirect on error
      console.log('⚠️ Error during sign out, using fallback redirect');
      window.location.replace(`/?error=signout&t=${Date.now()}`);
    }
  };
  
  // Reset test account state
  const resetTestAccountState = async () => {
    console.log('🔄 Resetting test account state');
    
    try {
      // Clear all storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Reset routing flag
      setHasRouted(false);
      
      // Navigate to discover
      navigate('/discover', { replace: true });
      
      return Promise.resolve();
    } catch (error: unknown) {
      console.error('❌ Error resetting test account state:', error);
      const message = error instanceof Error ? error.message : String(error);
      setAuthErrors(prev => [...prev, `Reset test account error: ${message || 'Unknown error'}`]);
      return Promise.reject({ message });
    }
  };

  // Reset password
  const resetPassword = async (email: string) => {
    console.log('🔑 Requesting password reset for:', email);
    setLoading(true);
    setAuthErrors([]);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`, // Corrected redirect, was /reset-password
      });
      if (error) {
        console.warn('⚠️ Password reset error:', error.message);
        setAuthErrors(prev => [...prev, `Password reset failed: ${error.message}`]);
        // Ensure the returned error object matches AppError (message only)
        const errorToReturn: AppError = { message: error.message };
        return { error: errorToReturn, success: false };
      }
      console.log('✅ Password reset email sent successfully.');
      return { error: null, success: true };
    } catch (err: unknown) {
      console.error('❌ Exception during password reset:', err);
      const message = err instanceof Error ? err.message : String(err);
      setAuthErrors(prev => [...prev, `Password reset exception: ${message}`]);
      const errorResult: { error: AppError; success: boolean } = { error: { message }, success: false };
      return errorResult;
    } finally {
      setLoading(false);
    }
  };

  // Auth context value
  const contextValue = useMemo(() => ({
    session,
    user,
    userDetails,
    loading,
    routingInProgress,
    signIn,
    signOut,
    signUp,
    resetPassword,
    resetTestAccountState,
    debugGetSession
  }), [
    session, 
    user, 
    userDetails, 
    loading, 
    routingInProgress, 
    // Assuming signIn, signOut etc. are memoized by useCallback or stable
    // If they are redefined on each render (not typical for functions declared outside useEffect/useCallback),
    // they should also be dependencies or memoized themselves.
    // For now, assuming they are stable as per common practice.
  ]);

  // Expose debug methods to window
  if (typeof window !== 'undefined') {
    (window as Window & typeof globalThis & { authDebug?: AuthDebugType }).authDebug = {
      getSession: debugGetSession,
      checkTokens: debugCheckStorageTokens,
      errors: authErrors,
      clearSession: async () => {
        await supabase.auth.signOut();
        console.log('Session manually cleared');
      },
      routing: {
        state: {
          hasRouted,
          routingInProgress,
          earlyRedirectAttempted,
          pathname: location.pathname
        },
        resetFlags: () => {
          setHasRouted(false);
          setEarlyRedirectAttempted(false);
          setRoutingInProgress(false);
          console.log('🧹 Routing flags manually reset');
        },
        getCurrentUser: () => user,
        testSpaceRouting: async () => {
          if (!user) {
            console.error('❌ No user logged in');
            return 'No user logged in';
          }
          
          console.log('🔍 Manual test of space routing for user:', user.id, user.email);
          const spaceData = await getUserPreferredSpace(user.id);
          console.log('⭐ TEST RESULT:', spaceData ? 
            `Found space: ${spaceData.subdomain}` : 
            'No spaces found for this user'
          );
          return spaceData;
        },
        forceRedirect: async (subdomain?: string) => {
          if (!user) {
            console.error('❌ Cannot redirect - no user logged in');
            return;
          }
          
          if (subdomain) {
            console.log(`🔀 Manually redirecting to /space/${subdomain}`);
            navigate(`/space/${subdomain}`, { replace: true });
            return;
          }
          
          const spaceData = await getUserPreferredSpace(user.id);
          if (spaceData) {
            console.log(`🔀 Manually redirecting to best space: /space/${spaceData.subdomain}`);
            navigate(`/space/${spaceData.subdomain}`, { replace: true });
          } else {
            console.log('❌ Cannot redirect - no spaces found for user');
          }
        },
        testDirectNavigation: (path: string = '/space/nextpath-ai') => {
          console.log(`🔀 Testing direct navigation to: ${path}`);
          navigate(path, { replace: true });
          return `Attempted navigation to ${path}`;
        },
        inspectNavigate: () => {
          console.log('🔎 Inspecting navigate function:', navigate);
          return { navigate, location };
        },
        // Restore showRedirectHistory
        showRedirectHistory: () => ({
          successes: JSON.parse(sessionStorage.getItem('redirectHistory') || '[]'),
          failures: JSON.parse(sessionStorage.getItem('redirectFailures') || '[]'),
          errors: JSON.parse(sessionStorage.getItem('redirectErrors') || '[]'),
          authErrors: authErrors.filter(err => err.includes('redirect'))
        })
      },
      spaces: {
        getSpacesFromDB: async (skipCache = false) => {
          if (!user) {
            console.error('❌ No user logged in');
            return 'No user logged in';
          }

          console.log('🔍 Manually fetching spaces from database for user:', user.id);
          
          try {
            // Check for spaces owned by this user
            const { data: spaces, error } = await supabase
              .from('spaces')
              .select('id, name, subdomain, owner_id')
              .eq('owner_id', user.id);
              
            if (error) {
              console.error('❌ Error fetching spaces:', error);
              return { error };
            }
            
            console.log(`✅ Found ${spaces?.length || 0} spaces owned by user:`, spaces);
            
            // Also check space_access
            const { data: accessSpaces, error: accessError } = await supabase
              .from('space_members')
              .select(`
                id, 
                space_id,
                status,
                role,
                spaces:space_id(id, name, subdomain)
              `)
              .eq('user_id', user.id)
              .eq('status', 'active');
              
            if (accessError) {
              console.error('❌ Error fetching space access:', accessError);
            } else {
              console.log(`✅ Found ${accessSpaces?.length || 0} spaces with active membership:`, accessSpaces);
            }
            
            if (skipCache) {
              return { owned: spaces, access: accessSpaces };
            }
            
            // If we found at least one space, cache the first one
            if (spaces && spaces.length > 0 && spaces[0].subdomain) {
              try {
                console.log('📦 Caching owned space in localStorage:', spaces[0]);
                localStorage.setItem('lastCreatedSpace', JSON.stringify({
                  subdomain: spaces[0].subdomain,
                  id: spaces[0].id,
                  name: spaces[0].name,
                  owner_id: user.id
                }));
              } catch (e) {
                console.error('❌ Error caching space:', e);
              }
            }
            
            return { owned: spaces, access: accessSpaces };
          } catch (e: unknown) {
            console.error('❌ Error in getSpacesFromDB:', e);
            return { error: e instanceof Error ? e : new Error(String(e)) };
          }
        },
        getCachedSpaces: () => {
          try {
            const lastCreated = localStorage.getItem('lastCreatedSpace');
            const lastVisited = localStorage.getItem('lastVisitedSpace');
            
            return {
              lastCreatedSpace: lastCreated ? JSON.parse(lastCreated) : null,
              lastVisitedSpace: lastVisited ? JSON.parse(lastVisited) : null
            };
          } catch (e: unknown) {
            console.error('❌ Error getting cached spaces:', e);
            return { error: e instanceof Error ? e : new Error(String(e)) };
          }
        },
        clearCachedSpaces: () => {
          try {
            localStorage.removeItem('lastCreatedSpace');
            localStorage.removeItem('lastVisitedSpace');
            console.log('✅ Cleared cached spaces from localStorage');
            return true;
          } catch (e: unknown) {
            console.error('❌ Error clearing cached spaces:', e);
            return false;
          }
        }
      }
    };
  }

  useEffect(() => {
    hasRoutedRef.current = hasRouted;
    routingInProgressRef.current = routingInProgress;
    earlyRedirectAttemptedRef.current = earlyRedirectAttempted;
  }, [hasRouted, routingInProgress, earlyRedirectAttempted]);

  const handlePostAuthenticationRouting = useCallback(async (userId: string) => {
    // This is the body for handlePostAuthenticationRouting
    console.log('🧭 (HPAR) Initiating post-authentication routing for user:', userId);
    setRoutingInProgress(true);

    const routingSafetyTimeout = setTimeout(() => {
      console.error('⏱️ SAFETY TIMEOUT: handlePostAuthenticationRouting took too long - forcing routingInProgress to false');
      if (routingInProgressRef.current) {
         setRoutingInProgress(false);
      }
    }, 15000);

    try {
      const explicitRedirectPath = sessionStorage.getItem('redirect_after_login');
      if (explicitRedirectPath) {
        console.log('➡️ (HPAR) Found explicit redirect path after login:', explicitRedirectPath);
        sessionStorage.removeItem('redirect_after_login');
        await new Promise(resolve => setTimeout(resolve, 50));
        console.log('🔀 (HPAR) Redirecting to explicit path:', explicitRedirectPath);
        navigate(explicitRedirectPath, { replace: true });
        setHasRouted(true); // Mark that we took an explicit redirect path
        // setRoutingInProgress(false); // HPAR's finally block will handle this
        clearTimeout(routingSafetyTimeout);
        return;
      }

      console.log('🔍 (HPAR) Calling attemptEarlySpaceRedirect for user:', userId);
      const didRedirectEarly = await attemptEarlySpaceRedirect(userId);
      
      // Allow microtask queue to process any state updates from attemptEarlySpaceRedirect (like setHasRouted)
      await Promise.resolve(); 

      const currentPath = location.pathname;
      console.log('🔍 (HPAR) State after attemptEarlySpaceRedirect call:', {
        didRedirectEarly,
        hasRoutedFromState: hasRoutedRef.current, // Compare with state for debugging
        currentPath,
      });

      if (!didRedirectEarly) { 
        console.log('🤔 (HPAR) didRedirectEarly is false. Evaluating fallbacks.');
        // If attemptEarlySpaceRedirect didn't navigate (e.g. already on space page but returned true, or no space found and returned false)
        // we might still need to decide on /discover or profile page handling.

        // Check if already effectively handled by being on a space page and AESR returned true for it
        if (location.pathname.includes('/space/') && didRedirectEarly) {
             console.log('✅ (HPAR) Already on a space page and attemptEarlySpaceRedirect confirmed it or handled it. No further action.');
             // setHasRouted(true) should have been called by attemptEarlySpaceRedirect if it returned true for this case
        } else {
            const preferredSpaceAfterAttempt = await getUserPreferredSpace(userId);
            console.log('👑 (HPAR) Fresh preferred space after attempt (in fallback):', preferredSpaceAfterAttempt);

            if (currentPath.includes('/space/') && !preferredSpaceAfterAttempt) {
              console.log('❌ (HPAR) On a space page, but no preferred space confirmed for user. Redirecting to /discover.');
              navigate('/discover', { replace: true });
              setHasRouted(true);
            } else {
              // New logic for profile route handling
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
                // Redirect old formats or old malformed routes to the new /profile/username format
                if (usernameFromOldFormat) {
                  console.warn(`🚨 (HPAR) DETECTED OLD or MALFORMED PROFILE ROUTE: ${currentPath}. Redirecting to /profile/${usernameFromOldFormat}`);
                  navigate(`/profile/${usernameFromOldFormat}`, { replace: true });
                  setHasRouted(true);
                } else {
                  console.log('🔀 (HPAR) Malformed old profile route, but no username found. Redirecting to /discover.');
                  navigate('/discover', { replace: true });
                  setHasRouted(true);
                }
              } else if (isNewProfileFormat) {
                // Current path is already in the new /profile/ format
                // We might still want to check for malformed new routes like /profile/username/space
                const isNewMalformedRoute = isNewProfileFormat && currentPath.includes('/space/');
                if (isNewMalformedRoute) {
                  const newMatch = currentPath.match(/\/profile\/([^/]+)/);
                  if (newMatch && newMatch[1]) {
                    const usernameFromNew = newMatch[1];
                    console.warn(`🚨 (HPAR) DETECTED MALFORMED NEW PROFILE ROUTE: ${currentPath}. Correcting to /profile/${usernameFromNew}`);
                    navigate(`/profile/${usernameFromNew}`, { replace: true });
                    setHasRouted(true);
                  } else {
                    console.log('🔀 (HPAR) Malformed new profile route, but no username found. Redirecting to /discover.');
                    navigate('/discover', { replace: true });
                    setHasRouted(true);
                  }
                } else {
                  console.log('🛑 (HPAR) Correctly on a /profile/ route. Allowing profile view.', { currentPath });
                  setHasRouted(true); 
                }
              } else {
                // Only navigate to discover if no space was found by AESR AND we are not on a profile page (old or new).
                console.log('🔀 (HPAR) No space routed by AESR, not on an invalid space page, and not a profile page. Redirecting to /discover.');
                navigate('/discover', { replace: true });
                setHasRouted(true);
              }
            }
        }
      } else { // didRedirectEarly is true
        console.log('✅ (HPAR) Routing to space was successful (attemptEarlySpaceRedirect returned true).');
        // setHasRouted(true) should have been called by attemptEarlySpaceRedirect
      }
    } catch (error: unknown) {
      console.error('❌ (HPAR) Error in handlePostAuthenticationRouting:', error);
      if (!hasRoutedRef.current) {
        console.log('🔀 (HPAR) Redirecting to /discover due to error in routing flow.');
        navigate('/discover', { replace: true });
        setHasRouted(true);
      }
    } finally {
      console.log('🏁 (HPAR) Post-authentication routing finished.');
      setRoutingInProgress(false);
      clearTimeout(routingSafetyTimeout);
    }
  }, [
    navigate, 
    location, 
    setHasRouted, 
    setRoutingInProgress, 
    attemptEarlySpaceRedirect, 
    // getUserPreferredSpace is called directly, not a dep of HPAR itself but used within it.
    // Refs are stable, so not needed in dep array.
  ]);

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}
