import React, { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import { fetchUserDetails } from '@/utils/authUtils'
import { useNavigate, useLocation } from 'react-router-dom'
import { generateSlug } from '@/utils/slugUtils'

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

/**
 * Utility function to get the user's preferred space for redirection
 * Prioritizes last created space, then owned spaces, then joined spaces, and finally any cached space
 */
async function getUserPreferredSpace(userId: string): Promise<{ subdomain: string } | null> {
  if (!userId) {
    console.error('❌ getUserPreferredSpace called with empty userId');
    return null;
  }

  console.log('Finding preferred space for user:', userId);
    
  try {
    // PRIORITY 1: Last Created Space from localStorage
    console.log('Checking lastCreatedSpace in localStorage');
    try {
      const lastCreatedSpaceJson = localStorage.getItem('lastCreatedSpace');
      
      if (lastCreatedSpaceJson) {
        try {
          const lastCreatedSpace = JSON.parse(lastCreatedSpaceJson);
          
          if (lastCreatedSpace?.subdomain) {
            // Verify it exists in the database
            const { data, error } = await supabase
            .from('spaces')
              .select('id, subdomain')
              .eq('subdomain', lastCreatedSpace.subdomain)
            .single();
            
            if (error) {
              console.log('Error verifying lastCreatedSpace:', error.message);
            } else if (data) {
              console.log('Using lastCreatedSpace:', data.subdomain);
              return { subdomain: data.subdomain };
          } else {
              console.log('lastCreatedSpace not found in database');
              // Clean up invalid entry
            localStorage.removeItem('lastCreatedSpace');
          }
          } else {
            console.log('lastCreatedSpace missing subdomain');
          }
        } catch (parseError) {
          console.error('Error parsing lastCreatedSpace:', parseError);
          // Invalid JSON - remove it
          localStorage.removeItem('lastCreatedSpace');
        }
            } else {
        console.log('No lastCreatedSpace found in localStorage');
      }
    } catch (storageError) {
      console.error('Error accessing localStorage:', storageError);
    }
    
    // PRIORITY 2: Owned Spaces
    console.log('Checking for spaces owned by user');
    try {
      const { data: ownedSpaces, error } = await supabase
      .from('spaces')
      .select('id, subdomain, name, created_at')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });
    
      if (error) {
        console.error('Error fetching owned spaces:', error.message);
    } else if (ownedSpaces && ownedSpaces.length > 0) {
        console.log(`Found ${ownedSpaces.length} owned spaces`);
        
        // Find first space with valid subdomain
        const validSpace = ownedSpaces.find(space => !!space.subdomain);
      
        if (validSpace) {
          console.log('Using owned space:', validSpace.subdomain);
          
          // Cache this for future use
        try {
            localStorage.setItem('lastCreatedSpace', JSON.stringify({
              id: validSpace.id,
              subdomain: validSpace.subdomain,
              name: validSpace.name,
              owner_id: userId
            }));
            console.log('Cached owned space in localStorage');
        } catch (e) {
            console.warn('Failed to cache space:', e);
        }
        
          return { subdomain: validSpace.subdomain };
        } else {
          console.log('No owned spaces with valid subdomain found');
      }
    } else {
        console.log('No owned spaces found');
    }
    } catch (dbError) {
      console.error('Database error when checking owned spaces:', dbError);
    }
    
    // PRIORITY 3: Joined Spaces via space_access
    console.log('Checking spaces user has access to');
    try {
      const { data: accessRecords, error } = await supabase
      .from('space_access')
      .select(`
        id,
        space_id,
        spaces:space_id(id, subdomain, name)
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
      if (error) {
        console.error('Error fetching space access records:', error.message);
    } else if (accessRecords && accessRecords.length > 0) {
        console.log(`Found ${accessRecords.length} space access records`);
      
        // Find first access record with valid space data and subdomain
        const validRecord = accessRecords.find(record => 
          record.spaces && 
          (record.spaces as any).subdomain
        );
      
        if (validRecord) {
          const space = validRecord.spaces as any;
          console.log('Using space from access records:', space.subdomain);
        
          // Cache for future use
        try {
          localStorage.setItem('lastVisitedSpace', JSON.stringify({
              id: space.id,
              subdomain: space.subdomain,
              name: space.name
          }));
            console.log('Cached joined space in localStorage');
        } catch (e) {
            console.warn('Failed to cache space:', e);
        }
        
          return { subdomain: space.subdomain };
      } else {
          console.log('No valid spaces found in access records');
      }
    } else {
        console.log('No space access records found');
    }
    } catch (dbError) {
      console.error('Database error when checking joined spaces:', dbError);
    }

    // No valid space found through any method
    console.log('No spaces found for user after checking all priorities');
    return null;
  } catch (error) {
    console.error('Unexpected error in getUserPreferredSpace:', error);
    return null;
  }
}

// Helper to generate a unique user URL slug
async function generateUniqueUserSlug(user: any) {
  if (!user) return null;
  // Try username, email prefix, full name, or fallback to user id
  const baseCandidates = [
    user.user_metadata?.username,
    user.email?.split('@')[0],
    (user.user_metadata?.firstName && user.user_metadata?.lastName) ? `${user.user_metadata.firstName}-${user.user_metadata.lastName}` : null,
    user.user_metadata?.fullName,
    user.id
  ].filter(Boolean);

  for (let base of baseCandidates) {
    let slug = generateSlug(base);
    let unique = false;
    let attempt = 0;
    let candidate = slug;
    while (!unique && attempt < 5) {
      // Check uniqueness in users table
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('url', candidate)
        .maybeSingle();
      if (!data) {
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
  session: Session | null
  user: User | null
  userDetails: any | null
  loading: boolean
  routingInProgress: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, options?: { firstName?: string, lastName?: string }) => Promise<{ error: any, data: any }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: any }>
  resetTestAccountState: () => Promise<void>
  debugGetSession: () => Promise<void>
}

// Create the context with default values
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Custom hook to use the auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [userDetails, setUserDetails] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [authErrors, setAuthErrors] = useState<string[]>([])
  const [hasRouted, setHasRouted] = useState(false)
  const [routingInProgress, setRoutingInProgress] = useState(false)
  const [earlyRedirectAttempted, setEarlyRedirectAttempted] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  
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
  const attemptEarlySpaceRedirect = useCallback(async (userId: string) => {
    // Skip if we're already in the process of routing or have already routed
    if (routingInProgress || hasRouted || earlyRedirectAttempted) {
      console.log('Early redirect skipped - already in progress or completed');
      return;
    }
    
    // Skip if user is already on a space page
    if (location.pathname.startsWith('/space/')) {
      console.log('Early redirect skipped - already on a space page:', location.pathname);
      return;
    }
    
    console.log('Attempting early space redirection for user:', userId);
    
    // Mark that we're attempting redirection and it's in progress
    setEarlyRedirectAttempted(true);
    setRoutingInProgress(true);
    
    // Set safety timeout to reset routingInProgress in case of unexpected issues
    const safetyTimeoutId = setTimeout(() => {
      console.log('Safety timeout triggered - resetting routingInProgress');
      setRoutingInProgress(false);
    }, 10000); // 10 seconds should be more than enough
    
    try {
      // Use the getUserPreferredSpace utility directly from this context
      console.log('Calling getUserPreferredSpace to find best space for user:', userId);
      const spaceData = await getUserPreferredSpace(userId);
      
      // Clear the safety timeout since we got a response
      clearTimeout(safetyTimeoutId);
      
      if (spaceData) {
        console.log('Redirecting to user space:', spaceData.subdomain);
        
        // Log the exact path we're navigating to
        const targetPath = `/space/${spaceData.subdomain}`;
        console.log(`Navigating to ${targetPath}`);
        
        // Navigate immediately to the space
        navigate(targetPath, { replace: true });
        
        // Mark that we've successfully routed to avoid duplicate redirections
        setHasRouted(true);
        
        // Track successful redirect in sessionStorage for debugging
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
      } else {
        console.log('No user space found. Staying on current page for now.');
        
        // Track failed redirect attempt in sessionStorage for debugging
        try {
          const redirectFailures = JSON.parse(sessionStorage.getItem('redirectFailures') || '[]');
          redirectFailures.push({
            timestamp: new Date().toISOString(),
            path: location.pathname,
            userId,
            reason: 'No spaces found'
          });
          sessionStorage.setItem('redirectFailures', JSON.stringify(redirectFailures));
        } catch (e) {
          console.error('Error saving redirect failure:', e);
        }
      }
    } catch (error) {
      // Clear the safety timeout
      clearTimeout(safetyTimeoutId);
      
      console.error('Early redirect error:', error);
      
      // Track error in sessionStorage for debugging
      try {
        const redirectErrors = JSON.parse(sessionStorage.getItem('redirectErrors') || '[]');
        redirectErrors.push({
          timestamp: new Date().toISOString(),
          path: location.pathname,
          userId,
          error: error.message || String(error)
        });
        sessionStorage.setItem('redirectErrors', JSON.stringify(redirectErrors));
      } catch (e) {
        console.error('Error saving redirect error:', e);
      }
    } finally {
      console.log('Setting routingInProgress to false after early redirect attempt');
      setRoutingInProgress(false);
    }
  }, [navigate, location.pathname, routingInProgress, hasRouted, earlyRedirectAttempted]);

  // Handle initial session restore
  useEffect(() => {
    async function getInitialSession() {
      try {
        setLoading(true);
        
        // Set a safety timeout to prevent infinite loading
        const safetyTimeout = setTimeout(() => {
          console.error('⏱️ SAFETY TIMEOUT: Session check took too long - forcing loading to complete');
          setLoading(false);
        }, 5000); // 5 second safety timeout
        
        console.log('🔄 Starting initial session check process');
        console.log('⏱️ Time:', new Date().toISOString());
        
        // Log Supabase config (with partial key for security)
        const supabaseUrl = (supabase as any)?.supabaseUrl || 'undefined';
        const supabaseKey = (supabase as any)?.supabaseKey || 'undefined';
        console.log('🔌 Supabase config check:', {
          url: supabaseUrl,
          key: supabaseKey ? `${supabaseKey.substring(0, 5)}...${supabaseKey.substring(supabaseKey.length - 4)}` : 'undefined',
          initialized: !!supabase,
          authEnabled: !!supabase?.auth
        });
        
        console.log('📡 Calling supabase.auth.getSession()...');
        const sessionResult = await supabase.auth.getSession();
        console.log('📥 Raw getSession result:', JSON.stringify({
          data: sessionResult.data ? {
            hasSession: !!sessionResult.data.session,
            user: sessionResult.data.session?.user ? {
              id: sessionResult.data.session.user.id,
              email: sessionResult.data.session.user.email,
            } : null
          } : null,
          error: sessionResult.error ? {
            message: sessionResult.error.message,
            name: sessionResult.error.name
          } : null
        }));
        
        const { data: { session }, error } = sessionResult;

        if (error) {
          console.error('❌ Error getting initial session:', error.message, error);
          clearTimeout(safetyTimeout);
          setLoading(false);
          return;
        }
        
        if (session) {
          console.log('✅ Initial session found:', {
            userId: session.user.id,
            email: session.user.email,
            expires: new Date(session.expires_at * 1000).toLocaleString()
          });
          
          // Set session and user state
          console.log('📝 BEFORE setting session state:', { 
            currentSession: session ? 'exists' : 'null',
            currentUser: user ? 'exists' : 'null'
          });
          
          setSession(session);
          setUser(session.user);
          
          // Log state immediately after (won't reflect changes yet due to React's batching)
          console.log('📝 AFTER setting session and user state (not reflected yet due to React batching)');
          
          // TEMPORARILY DISABLE SPACE REDIRECTION to isolate login issues
          console.log('⚠️ Space redirection temporarily disabled to diagnose login issues');
          
          // Wait a moment, then log the updated state 
          setTimeout(() => {
            console.log('🔍 Session state after update:', {
              hasUser: !!user,
              user: user ? { id: user.id, email: user.email } : null,
              hasSession: !!session,
              loading,
              routingInProgress,
              hasRouted,
              pathname: location.pathname
            });
          }, 100);
          
          /* DISABLED FOR NOW - will re-enable after fixing login issues
          // Log current routing state before redirect attempt
          console.log('🚦 Current routing state:', {
            hasRouted,
            routingInProgress,
            earlyRedirectAttempted,
            currentPath: location.pathname
          });
          
          // Delay the redirect attempt slightly to ensure state has been updated
          console.log('⏱️ Delaying space redirect by 250ms to avoid race conditions');
          setTimeout(() => {
          // Trigger early space redirection immediately if user is authenticated
            console.log('🚀 Triggering early space redirection from getInitialSession');
          attemptEarlySpaceRedirect(session.user.id);
          }, 250);
          */
        } else {
          console.log('ℹ️ No initial session found');
        }
        
        // Clear safety timeout since we completed normally
        clearTimeout(safetyTimeout);
        
        // Log final auth state
        console.log('🏁 Final auth state after session check:', {
          authenticated: !!session,
          user: session?.user ? { id: session.user.id, email: session.user.email } : null,
          pathname: location.pathname,
          loading: false
        });

        // After setting user/session in getInitialSession and onAuthStateChange, ensure user has a url
        useEffect(() => {
          async function ensureUserUrl() {
            if (user && !(user as any).url) {
              try {
                console.log('Ensuring user has a URL for user ID:', user.id);
                // Call our new database function to ensure user has a URL
                const { data, error } = await (supabase.rpc as any)('ensure_user_url', {
                  user_id: user.id
                });
                
                if (error) {
                  console.error('Failed to ensure user URL:', error.message);
                } else if (data) {
                  console.log('User URL set/retrieved successfully:', data);
                  // Update the user state with the URL
                  setUser((prev: any) => ({ ...prev, url: data }));
                }
              } catch (err) {
                console.error('Error in ensureUserUrl:', err);
              }
            }
          }
          ensureUserUrl();
          // Only run when user changes
        }, [user]);
      } catch (error) {
        console.error('❌ Exception getting initial session:', error);
      } finally {
        setLoading(false);
        console.log('✅ Loading state set to FALSE');
      }
    }

    getInitialSession();
  }, [/* Temporarily remove attemptEarlySpaceRedirect dependency to isolate login issues */]);

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
        
        // Set a timeout to prevent infinite blocking
        const timeoutId = setTimeout(() => {
          if (routingInProgress) {
            console.log('⚠️ Auth state change timeout - forcing routing to complete');
            setRoutingInProgress(false);
          }
        }, 5000); // 5 second timeout
        
        // Log before setting state
        console.log('📝 BEFORE updating state in onAuthStateChange:', {
          currentUser: user ? { id: user.id, email: user.email } : null,
          newUser: newSession?.user ? { id: newSession.user.id, email: newSession.user.email } : null
        });
        
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        // Log after setting state (react batching won't show updated values yet)
        console.log('📝 AFTER setting state in onAuthStateChange (not reflected yet due to React batching)');
        
        switch (event) {
          case 'SIGNED_IN':
            console.log('✅ Auth event: User signed in:', newSession?.user?.email);
            
            if (newSession?.user) {
              // Reset routing flags at the start of a new session
              setHasRouted(false);
              setEarlyRedirectAttempted(false);
            
              // Check for redirect_after_login in sessionStorage first
              const redirectPath = sessionStorage.getItem('redirect_after_login');
              if (redirectPath) {
                console.log('➡️ Auth event: Found redirect path after login:', redirectPath);
                sessionStorage.removeItem('redirect_after_login');
                
                // Add a small delay to ensure state is updated
                setTimeout(() => {
                  console.log('🔀 Auth event: Redirecting to explicit path:', redirectPath);
                  navigate(redirectPath, { replace: true });
                  setHasRouted(true);
                  setRoutingInProgress(false);
                }, 300);
              } else {
                // TEMPORARILY DISABLE SPACE REDIRECTION
                console.log('⚠️ Space redirection in onAuthStateChange temporarily disabled');
                setRoutingInProgress(false);
                
                /* DISABLED for now to fix login issues
                // Attempt early space redirection immediately if no explicit redirect path
                console.log('🔍 Auth event: No explicit redirect path, checking for user spaces');
                await attemptEarlySpaceRedirect(newSession.user.id);
                
                // Double check if the redirection was successful
                if (!hasRouted && !location.pathname.startsWith('/space/')) {
                  console.log('ℹ️ Auth event: No spaces found and not on a space page, may redirect to discover');
                  // Don't explicitly redirect to discover here - let the component handle that if needed
                }
                */
                
                // Instead of redirecting to spaces, just make sure loading state is completed
                console.log('✅ Auth event: Sign-in completed, setting routingInProgress to false');
                setRoutingInProgress(false);
              }
            }
            break;
            
          case 'SIGNED_OUT':
            console.log('👋 Auth event: User signed out');
            // Reset routing flag on sign out
            setHasRouted(false);
            setEarlyRedirectAttempted(false);
            setRoutingInProgress(false);
            // Redirect to landing page if on a protected route
            if (location.pathname !== '/' && 
                location.pathname !== '/signin' && 
                location.pathname !== '/signup' &&
                location.pathname !== '/login') {
              console.log('➡️ Auth event: Redirecting to landing page after logout');
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
        
        // Ensure routingInProgress is reset in all cases
        setTimeout(() => {
          if (routingInProgress) {
            console.log('⚠️ routingInProgress still true after auth event - resetting');
            setRoutingInProgress(false);
          }
        }, 1000);
        
        // Clear the timeout when the auth state change is handled
        clearTimeout(timeoutId);
        
        // Finally log the current state 
        setTimeout(() => {
          console.log('🏁 Final state after auth event:', {
            event,
            user: newSession?.user ? { id: newSession.user.id, email: newSession.user.email } : null,
            authenticated: !!newSession,
            pathname: location.pathname,
            routingInProgress,
            hasRouted
          });
        }, 200);
      });

    return () => {
      console.log('🧹 Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname, /* Remove dependencies to isolate login issues */]);

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    console.log('🔑 Signing in user:', email);
    console.log('📅 Login attempt timestamp:', new Date().toISOString());
    
    try {
      // Reset the hasRouted flag for the new login session
      setHasRouted(false);
      setEarlyRedirectAttempted(false);
      
      // Log browser details for troubleshooting
      console.log(' Browser info:', {
        userAgent: navigator.userAgent,
        language: navigator.language,
        cookiesEnabled: navigator.cookieEnabled,
        localStorage: typeof localStorage !== 'undefined',
        platform: navigator.platform
      });
      
      // Verify Supabase client is configured
      console.log('🔌 Supabase client check:', {
        initialized: !!supabase,
        authEnabled: !!supabase?.auth,
        hasSignInMethod: !!supabase?.auth?.signInWithPassword
      });
      
      // Set routing in progress to prevent UI flashes
      setRoutingInProgress(true);
      
      // Set safety timeout to prevent UI from hanging
      const safetyTimeout = setTimeout(() => {
        console.error('⏱️ SAFETY TIMEOUT: Sign-in took too long - forcing routingInProgress to false');
        setRoutingInProgress(false);
      }, 10000); // 10 second safety timeout
      
      // Attempt to sign in
      console.log('🔑 Sending signInWithPassword request...');
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      // Clear safety timeout
      clearTimeout(safetyTimeout);
      
      if (error) {
        console.error('❌ Sign in error:', error.message);
        console.error('❌ Error details:', {
          code: error.code,
          status: error.status,
          name: error.name,
          message: error.message,
        });
        setAuthErrors(prev => [...prev, `Sign in error: ${error.message}`]);
        setRoutingInProgress(false);
        return { error };
      }
      
      console.log('✅ Sign in successful', {
        user: data.user?.email,
        userId: data.user?.id,
        hasSession: !!data.session,
        expires: data.session ? new Date(data.session.expires_at * 1000).toLocaleString() : 'N/A',
        sessionId: data.session ? 'session-exists' : 'no-session'
      });
      
      // Inspect user object for debugging
      if (data.user) {
        console.log('👤 User details:', {
          id: data.user.id,
          email: data.user.email,
          emailConfirmed: data.user.email_confirmed_at,
          phone: data.user.phone,
          lastSignIn: data.user.last_sign_in_at,
          createdAt: data.user.created_at,
          updatedAt: data.user.updated_at,
          hasMetadata: !!data.user.user_metadata,
          roles: data.user.app_metadata?.roles || []
        });
      }
      
      // Manual state update in case onAuthStateChange doesn't fire immediately
      console.log('📝 BEFORE updating session and user in signIn function');
      setSession(data.session);
      setUser(data.user);
      console.log('📝 AFTER updating session and user in signIn function (not reflected yet due to React batching)');
      
      // Verify tokens were stored
      setTimeout(() => {
        console.log('🔍 Verifying token storage after login');
        const hasTokens = debugCheckStorageTokens();
        console.log('🔐 Token verification result:', hasTokens ? 'Tokens found' : 'Tokens missing');
      }, 100);
      
      // Check for redirect_after_login in sessionStorage
      const redirectPath = sessionStorage.getItem('redirect_after_login');
      if (redirectPath) {
        console.log('➡️ Found redirect path after login:', redirectPath);
        sessionStorage.removeItem('redirect_after_login');
        
        // Add a small delay to ensure all state is updated
        setTimeout(() => {
          // If there's a specific redirect target, prioritize it over space routing
          console.log('🔀 Redirecting to explicit path:', redirectPath);
          navigate(redirectPath, { replace: true });
          
          // Mark that we've routed this session to avoid double redirects
          setHasRouted(true);
          setRoutingInProgress(false);
        }, 300);
        
        return { error: null };
      }
      
      // Perform space check and routing
      if (data.user?.id) {
        console.log('🧭 Initiating redirection flow for user:', data.user.id);
        
        try {
          // Use attemptEarlySpaceRedirect to find and navigate to user's space
          console.log('🔍 Attempting early space redirection');
          await attemptEarlySpaceRedirect(data.user.id);
          
          // Wait a moment to ensure the hasRouted flag is updated if redirection happened
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Re-check hasRouted flag - if it's true, a space was found and redirection happened
          console.log('🔍 Checking if space redirection was successful:', 
            hasRouted ? 'YES - user was redirected to a space' : 'NO - no redirection occurred');
          
          // If we get here and hasRouted is still false, then we didn't find any spaces
          // Only redirect to discover if no spaces were found, and after a delay
          if (!hasRouted) {
            console.log('❌ No user space found, checking if we should redirect to discover page');
            console.log('🔍 Current pathname:', location.pathname);
            console.log('🔍 Starts with /@?', location.pathname.startsWith('/@'));
            console.log('🔍 Is profile URL (check):', location.pathname.match(/^\/@[^\/]+$/));
            
            // IMPORTANT: Profile routes need special handling - NEVER redirect away from profiles
            const isProfileRoute = location.pathname.startsWith('/@') || location.pathname.startsWith('/profile/');
            const isExactProfileRoute = !!(location.pathname.match(/^\/@[^\/]+$/) || location.pathname.match(/^\/profile\/[^\/]+$/));
            
            // Check for malformed profile routes (with extra path segments)
            const isMalformedProfileRoute = location.pathname.startsWith('/@') && location.pathname.includes('/space');
            if (isMalformedProfileRoute) {
              console.warn('🚨 DETECTED MALFORMED PROFILE ROUTE:', location.pathname);
              console.warn('🚨 This might indicate a routing issue with the profile page');
              
              // Extract the username from the malformed URL
              const match = location.pathname.match(/\/@([^\/]+)/);
              if (match && match[1]) {
                const username = match[1];
                console.log('🔄 Will redirect from malformed route to proper profile route:', `/@${username}`);
                
                // Redirect to the correct profile route
                setTimeout(() => {
                  navigate(`/@${username}`, { replace: true });
                }, 100);
                
                // Return early to prevent further processing
                return;
              }
            }

            // Always log profile route detection for debugging
            if (isProfileRoute) {
              console.log('🔍 AUTH CONTEXT: Profile route detected!', {
                path: location.pathname,
                isExactProfileRoute
              });
            }
            
            if (isProfileRoute) {
              console.log('🛑 NOT redirecting from profile page:', location.pathname);
              console.log('🛑 Profile route detected - allowing profile view without redirect');
              setHasRouted(true);
              setRoutingInProgress(false);
            } else {
              // Only redirect to /discover if not on a profile page
              setTimeout(() => {
                console.log('🔀 Redirecting to /discover (no spaces found)');
                navigate('/discover', { replace: true });
                setHasRouted(true);
                setRoutingInProgress(false);
              }, 300);
            }
          } else {
            console.log('✅ User already redirected to their space, no further redirection needed');
            // Ensure routingInProgress is reset
            setRoutingInProgress(false);
          }
        } catch (error) {
          console.error('❌ Error in redirection flow:', error);
          
          // Fallback to discover on error with a small delay
          setTimeout(() => {
            console.log('🔀 Redirecting to /discover (error fallback)');
            navigate('/discover', { replace: true });
            setHasRouted(true);
            setRoutingInProgress(false);
          }, 300);
        }
      } else {
        // If no user ID, fall back to discover
        console.log('⚠️ No user ID available after sign in, redirecting to discover');
        setTimeout(() => {
          console.log('🔀 Redirecting to /discover (no user ID)');
          navigate('/discover', { replace: true });
          setHasRouted(true);
          setRoutingInProgress(false);
        }, 300);
      }
      
      return { error: null };
    } catch (err: any) {
      console.error('❌ Exception during sign in:', err);
      console.error('❌ Exception details:', {
        name: err.name || 'Unknown error name',
        message: err.message || 'Unknown error message',
        stack: err.stack ? err.stack.split('\n')[0] : 'No stack trace',
        code: err.code,
        type: typeof err
      });
      setAuthErrors(prev => [...prev, `Sign in exception: ${err.message || err}`]);
      setRoutingInProgress(false);
      return { error: err };
    }
  };

  // Sign up with email and password
  const signUp = async (email: string, password: string, options?: { firstName?: string, lastName?: string }) => {
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
          const { data: urlData, error: urlError } = await (supabase.rpc as any)('ensure_user_url', {
            user_id: data.user.id
          });
          
          if (urlError) {
            console.error('Failed to ensure URL for new user:', urlError.message);
          } else if (urlData) {
            console.log('URL for new user generated successfully:', urlData);
            // Update user state with the URL
            setUser((prev: any) => prev ? { ...prev, url: urlData } : prev);
          }
        } catch (err) {
          console.error('Error during URL generation for new user:', err);
        }
      }
      // --- End automatic slug generation ---
      return { error: null, data };
    } catch (err: any) {
      console.error('❌ Exception during sign up:', err);
      setAuthErrors(prev => [...prev, `Sign up exception: ${err.message || err}`]);
      return { error: err, data: null };
    }
  };

  // Sign out user
  const signOut = async () => {
    console.log('🚪 Signing out user');
    
    try {
      // Store the current pathname to determine if we need to manually refresh
      const currentPath = window.location.pathname;
      const isDiscoverPage = currentPath === '/discover';
      
      // 1. First clear all storage items that might cause redirect loops
      console.log('🧹 Clearing auth-related storage items');
      
      // Clear localStorage items
      const localItems = [
        'selectedSpaceId', 
        'lastVisitedSpace', 
        'spaceData',
        // Add Supabase-specific items for Safari
        'supabase.auth.token'
      ];
      
      localItems.forEach(item => {
        try {
          localStorage.removeItem(item);
        } catch (e) {
          console.warn(`Failed to remove ${item} from localStorage:`, e);
        }
      });
      
      // Clear sessionStorage items
      const sessionItems = [
        'selectedSpaceId', 
        'spaceData', 
        'redirect_after_login', 
        'coming_from_space_switcher'
      ];
      
      sessionItems.forEach(item => {
        try {
          sessionStorage.removeItem(item);
        } catch (e) {
          console.warn(`Failed to remove ${item} from sessionStorage:`, e);
        }
      });
      
      // Clear any Supabase keys in localStorage (important for Safari)
      try {
        Object.keys(localStorage)
          .filter(key => key.startsWith('sb-'))
          .forEach(key => {
            console.log(`Removing Supabase key: ${key}`);
            localStorage.removeItem(key);
          });
      } catch (e) {
        console.warn('Failed to clear Supabase local storage items:', e);
      }
      
      // 2. Reset routing flag
      setHasRouted(false);
      
      // 3. Sign out from Supabase
      console.log('🔑 Calling Supabase signOut method');
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      console.log('✅ Supabase sign out successful');
      
      // 4. Reset state
      setUser(null);
      setSession(null);
      setUserDetails(null);
      
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
    } catch (error: any) {
      console.error('❌ Error signing out:', error);
      setAuthErrors(prev => [...prev, `Sign out error: ${error.message || error}`]);
      
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
    } catch (error: any) {
      console.error('❌ Error resetting test account state:', error);
      setAuthErrors(prev => [...prev, `Reset test account error: ${error.message || error}`]);
      return Promise.reject(error);
    }
  };

  // Reset password
  const resetPassword = async (email: string) => {
    console.log('🔑 Sending password reset for:', email);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) {
        console.error('❌ Password reset error:', error.message);
        setAuthErrors(prev => [...prev, `Password reset error: ${error.message}`]);
      }
      
      return { error };
    } catch (err: any) {
      console.error('❌ Exception during password reset:', err);
      setAuthErrors(prev => [...prev, `Password reset exception: ${err.message || err}`]);
      return { error: err };
    }
  };

  // Auth context value
  const value = {
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
  };

  // Expose debug methods to window
  if (typeof window !== 'undefined') {
    (window as any).authDebug = {
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
              .from('space_access')
              .select(`
                id, 
                space_id,
                spaces:space_id(id, name, subdomain)
              `)
              .eq('user_id', user.id)
              .eq('is_active', true);
              
            if (accessError) {
              console.error('❌ Error fetching space access:', accessError);
            } else {
              console.log(`✅ Found ${accessSpaces?.length || 0} spaces with access:`, accessSpaces);
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
          } catch (e) {
            console.error('❌ Error in getSpacesFromDB:', e);
            return { error: e };
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
          } catch (e) {
            console.error('❌ Error getting cached spaces:', e);
            return { error: e };
          }
        },
        clearCachedSpaces: () => {
          try {
            localStorage.removeItem('lastCreatedSpace');
            localStorage.removeItem('lastVisitedSpace');
            console.log('✅ Cleared cached spaces from localStorage');
            return true;
          } catch (e) {
            console.error('❌ Error clearing cached spaces:', e);
            return false;
          }
        }
      }
    };
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
