import { log } from '@/utils/logger';
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useOptimizedAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { checkActiveSession } from "@/utils/directAuth";

import { useEffect, useState } from "react";

interface PublicRouteProps {
  component: React.ReactNode;
  redirectTo?: string;
  forcePublic?: boolean;
}

export default function PublicRoute({ component, redirectTo = "/app", forcePublic = false }: PublicRouteProps) {
  const { user, loading } = useOptimizedAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isCheckingActiveSession, setIsCheckingActiveSession] = useState(false);
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [isDirectNavigation, setIsDirectNavigation] = useState(false);
  const [hasSpaces, setHasSpaces] = useState<boolean | null>(null);
  const [isBackNavigation, setIsBackNavigation] = useState(false);

  


  // ✅ CRITICAL FIX: Detect back button navigation to prevent flash
  useEffect(() => {
    const checkNavigationType = () => {
      // Check if this is back button navigation by looking at navigation history
      const isBack = window.history.state && 
                    location.pathname === "/" && 
                    document.referrer.includes(window.location.origin);
      
      // Consider it a direct navigation if we're on the root path and either:
      // 1. There's no referrer (typed URL/bookmark/external link)
      // 2. The referrer is from a different origin
      const isDirect = 
        location.pathname === "/" && 
        (!document.referrer || !document.referrer.includes(window.location.origin));
        
      log.debug('Component', 'PublicRoute: Navigation check:', {
        pathname: location.pathname,
        referrer: document.referrer,
        isDirect,
        isBack,
        historyState: window.history.state
      });
      
      setIsDirectNavigation(isDirect);
      setIsBackNavigation(isBack);
    };
    
    checkNavigationType();
  }, [location.pathname]);

  // 🚀 [Phase 2] ENHANCED: More aggressive cached space detection for direct navigation
  useEffect(() => {
    if (user && location.pathname === "/" && !forcePublic) {

      // Check for cached space data with multiple fallbacks
      const checkCachedSpaces = () => {
        try {
          // Primary cache sources
          const cacheKeys = ['lastActiveSpace', 'lastVisitedSpace', 'lastJoinedSpace'];
          
          for (const key of cacheKeys) {
            const cachedData = localStorage.getItem(key);
            if (!cachedData) continue;
            
            const space = JSON.parse(cachedData);
            if (!space || !space.subdomain) continue;
            
            // 🚀 [Phase 2] More lenient validation for instant navigation
            const isValid = !space.timestamp || (Date.now() - space.timestamp) < (10 * 60 * 1000); // 10 minutes
            if (isValid) {
              log.debug('Component', `🚀 [Phase 2] PublicRoute found cached space: ${space.name}, enabling direct navigation`);
              setHasSpaces(true);
              return;
            }
          }
          
          // 🚀 [Phase 2] FALLBACK: Check membership data
          const membershipSources = ['userSpaces', 'spaceMemberships', 'ownedSpaces', 'joinedSpaces'];
          for (const source of membershipSources) {
            const membershipData = localStorage.getItem(source);
            if (!membershipData) continue;
            
            try {
              const spaces = JSON.parse(membershipData);
              if (Array.isArray(spaces) && spaces.length > 0) {
                const validSpace = spaces.find(s => s && s.subdomain);
                if (validSpace) {
                  log.debug('Component', `🚀 [Phase 2] PublicRoute found membership data in ${source}, enabling direct navigation`);
                  setHasSpaces(true);
                  return;
                }
              }
            } catch (e) {
              log.warn('Component', `🚀 [Phase 2] Error parsing ${source}:`, e);
            }
          }
          
          // 🚀 [Phase 2] LAST RESORT: Check for any space-related data
          const spaceKeys = Object.keys(localStorage).filter(key => 
            key.includes('space') && !key.includes('check') && !key.includes('session')
          );
          
          if (spaceKeys.length > 0) {
            log.debug('Component', `🚀 [Phase 2] PublicRoute found space-related data keys: ${spaceKeys.join(', ')}`);
            setHasSpaces(true);
            return;
          }
          
          // No valid space data found
          log.debug('Component', '🚀 [Phase 2] PublicRoute: No space data found, user needs space detection');
          setHasSpaces(false);
        } catch (error) {
          log.warn('Component', '🚀 [Phase 2] PublicRoute: Error checking cached spaces:', error);
          setHasSpaces(false);
        }
      };
      
      checkCachedSpaces();
    }
  }, [user, location.pathname, forcePublic]);

  // Extra session check for root path to prevent auto-login bypass
  useEffect(() => {
    async function verifySession() {
      if (location.pathname === "/" && !user) {
        // Check if we're coming from a sign out to skip verification
        const isSignOutRedirect = sessionStorage.getItem('lokaa-signing-out') === 'true';
        if (isSignOutRedirect) {
          log.debug('Component', 'PublicRoute: Detected sign out redirect, skipping session verification');
          sessionStorage.removeItem('lokaa-signing-out');
          setHasActiveSession(false);
          setIsCheckingActiveSession(false);
          return;
        }

        setIsCheckingActiveSession(true);
        try {
          const isActive = await checkActiveSession();
          log.debug('Component', 'PublicRoute: Additional session check result:', isActive);
          setHasActiveSession(isActive);
        } catch (error) {
          log.error('Component', 'PublicRoute: Error in additional session check:', error);
        } finally {
          setIsCheckingActiveSession(false);
        }
      }
    }
    
    verifySession();
  }, [location.pathname, user]);

  log.debug('Component', '🔥 [CRITICAL FIX] PublicRoute Debug:', {
    user: user ? `logged in as ${user.email}` : 'not logged in',
    loading,
    redirectTo,
    forcePublic,
    pathname: location.pathname,
    hasActiveSession,
    isCheckingActiveSession,
    isDirectNavigation,
    hasSpaces,
    component: component ? 'provided' : 'missing',
    raceCondition: hasActiveSession && !user && !loading ? 'DETECTED' : 'none'
  });

  // 🔥 [CRITICAL FIX] Enhanced loading states to prevent race conditions
  if (loading || isCheckingActiveSession) {
    log.debug('Component', '🔥 [CRITICAL FIX] PublicRoute: Auth loading, preventing premature redirects...');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">
            {isCheckingActiveSession ? 'Verifying session...' : 'Loading authentication...'}
          </p>
        </div>
      </div>
    );
  }

  // 🔥 [CRITICAL FIX] Additional safety check for session/user race condition
  if (hasActiveSession && !user && !loading) {
    log.debug('Component', '🔥 [CRITICAL FIX] PublicRoute: Session detected but user not loaded yet, waiting...');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Completing authentication...</p>
        </div>
      </div>
    );
  }



  // 🔥 [CRITICAL FIX] Only navigate if auth is completely loaded
  if (user && !forcePublic && !loading && hasSpaces === true) {
    log.debug('Component', '🚀 [Phase 2] PublicRoute: User has cached spaces and auth complete, triggering direct navigation flow');
    return <Navigate to={redirectTo} replace state={{ from: location, directSpaceNavigation: true, skipApp: true }} />;
  }

  // 🔥 [CRITICAL FIX] Only navigate if auth is completely loaded
  if (user && !forcePublic && !loading && hasSpaces === false) {
    log.debug('Component', '🚀 [Phase 2] PublicRoute: User authenticated and auth complete but no cached spaces, using QuickSpaceRedirect flow');
    return <Navigate to={redirectTo} replace state={{ from: location, needsSpaceDetection: true, useQuickRedirect: true }} />;
  }

  // If direct navigation to root, show landing page only if user is NOT logged in
  if (isDirectNavigation && location.pathname === "/" && !user) {
    log.debug('Component', 'PublicRoute: Direct navigation to root by unauthenticated user, showing landing page');
    return <>{component}</>;
  }

  // ✅ CRITICAL FIX: Handle back button navigation gracefully
  // If user navigated back to root, respect their choice and show landing page
  if (isBackNavigation && user && !forcePublic && !loading) {
    log.debug('Component', '🚀 [Phase 2] PublicRoute: Back navigation detected, showing landing page (user can navigate manually)');
    // Don't auto-redirect on back navigation - let user choose where to go
    return <>{component}</>;
  }

  // 🔥 [CRITICAL FIX] Only redirect if we have BOTH user AND complete auth loading
  if (user && !forcePublic && !loading && !isBackNavigation) {
    log.debug('Component', '🚀 [Phase 2] PublicRoute: User is authenticated and auth loading complete, triggering smart redirect system:', redirectTo);
    // Use replace to prevent flashing of content
    return <Navigate to={redirectTo} replace state={{ from: location, smartRedirect: true }} />;
  }

  // 🔥 [CRITICAL FIX] Do NOT redirect on session alone - wait for user object
  // This prevents the infinite loop between PublicRoute and ProtectedRoute
  if (location.pathname === "/" && hasActiveSession && !forcePublic && !isDirectNavigation && user && !loading) {
    log.debug('Component', '🚀 [Phase 2] PublicRoute: Active session detected with complete user, triggering smart redirect system:', redirectTo);
    return <Navigate to={redirectTo} replace state={{ from: location, sessionDetected: true }} />;
  }

  // If there's an active session but forcePublic is true, don't redirect but warn about it
  if ((user || (location.pathname === "/" && hasActiveSession)) && forcePublic && location.pathname === "/") {
    log.warn('Component', 'PublicRoute: User is authenticated but showing public content due to forcePublic flag');
  }

  // If user is not authenticated or we're forcing public view, show the public content
  log.debug('Component', 'PublicRoute: Showing public content');
  return <>{component}</>;
} 