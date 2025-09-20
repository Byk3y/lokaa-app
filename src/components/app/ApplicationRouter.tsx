import { log } from '@/utils/logger';
import { Routes, Route, Navigate, useLocation, useNavigate, Outlet } from "react-router-dom";
import { useState, useEffect, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { posthog } from '@/integrations/posthog';

// Import auth components and hooks
import { useOptimizedAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

// Import lazy routes and loading fallbacks
import * as LazyRoutes from "@/routes/LazyRoutes";
import { RouteLoadingFallback, SpaceLoadingFallback } from "@/routes/LazyRoutes";

// Import layout components - converted to lazy loading for better code splitting
import { lazy } from "react";
const TrulyPersistentAppShell = lazy(() => import("@/components/layout/TrulyPersistentAppShell"));
const PostLegacyRedirect = lazy(() => import("@/components/PostLegacyRedirect"));
const ProfileRouteHandler = lazy(() => import("@/components/profile/ProfileRouteHandler"));
const WhiteScreenFix = lazy(() => import("@/components/errors/WhiteScreenFix"));

// Import navigation coordinator
import { navigationCoordinator } from "@/utils/navigationCoordinator";

// Import path restoration components
import SmartRedirectWithPathRestoration from "./SmartRedirectWithPathRestoration";

// Higher-order component for auth safety (imported from App.tsx)
function withAuthSafety<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  return function SafeAuthComponent(props: P) {
    try {
      return <Component {...props} />;
    } catch (error) {
      if (error instanceof Error && error.message.includes('useOptimizedAuth must be used within an AuthProvider')) {
        log.warn('Component', `🔒 [${componentName}] Auth context not ready yet, skipping render`);
        return null;
      }
      // Re-throw other errors
      throw error;
    }
  };
}

// Route logger component to track route changes and persist paths
function RouteLogger() {
  const location = useLocation();
  
  useEffect(() => {
    log.debug('Component', 'Route changed to:', location.pathname);
    
    // Import and use path restoration utilities
    import('@/utils/pathRestoration').then(({ persistPath }) => {
      persistPath(location.pathname);
    }).catch(error => {
      log.warn('Component', 'Failed to import path restoration utilities:', error);
    });
  }, [location]);
  
  return null;
}

// Add special handling for the automation-jungle route
const AutomationJungleRedirect = withAuthSafety(function AutomationJungleRedirect() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isRedirecting, setIsRedirecting] = useState(true);

  useEffect(() => {
    // If the URL pattern is like /automation-jungle/space/feed
    // we want to normalize it to /:subdomain/space
    
    const pathSegments = location.pathname.split('/');
    if (pathSegments[1] === 'automation-jungle') {
      // Prevent /space/space duplication by validating the path structure
      if (pathSegments.includes('space') && pathSegments.filter(s => s === 'space').length > 1) {
        log.warn('Component', 'Detected malformed URL with multiple "space" segments:', location.pathname);
        // Clean up by redirecting to the proper structure
        navigate('/automation-jungle/space', { replace: true });
        return;
      }
      
      // This is a direct access URL to automation-jungle without the proper structure
      // Normalize it to match our expected format
      let normalizedPath = `/${pathSegments[1]}/space`;
      
      // Add any remaining path segments, but skip 'feed' since it's now the default
      if (pathSegments.length > 3) {
        const remainingSegments = pathSegments.slice(3).filter(segment => segment !== 'feed').join('/');
        if (remainingSegments) {
          normalizedPath += `/${remainingSegments}`;
        }
      }
      
      log.debug('Component', `Normalizing automation jungle URL from ${location.pathname} to ${normalizedPath}`);
      
      // Only redirect if the path actually changed
      if (normalizedPath !== location.pathname) {
        navigate(normalizedPath, { replace: true });
      } else {
        setIsRedirecting(false);
      }
    } else {
      // Not a special URL, no need to redirect
      setIsRedirecting(false);
    }
  }, [location.pathname, navigate]);

  if (isRedirecting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <div className="flex items-center justify-center mb-4">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-800">
              Redirecting...
            </h2>
          </div>
        </div>
      </div>
    );
  }

  // Not redirecting, proceed with normal route
  return <Outlet />;
}, 'AutomationJungleRedirect');

// Simple loading screen component to prevent white screen
function AppLoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50" style={{ minHeight: '100vh' }}>
      <div className="flex flex-col items-center">
        <div className="animate-spin h-8 w-8 rounded-full border-t-2 border-b-2 border-teal-500 mb-3"></div>
        <p className="text-gray-600 text-base font-medium">Loading Lokaa...</p>
        <p className="text-gray-400 text-sm mt-1">Setting up your workspace</p>
      </div>
    </div>
  );
}

// Main ApplicationRouter component - extracted from App.tsx AppRoutes
const ApplicationRouter = withAuthSafety(function ApplicationRouter() {
  const { loading } = useOptimizedAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Initialize NavigationCoordinator with React Router's navigate function
  useEffect(() => {
    navigationCoordinator.initialize(navigate);
    log.debug('Component', '🚀 [NavigationCoordinator] Initialized with navigate function');
  }, [navigate]);

  // Track page views for PostHog analytics
  useEffect(() => {
    if (posthog) {
      posthog.capture('$pageview', {
        $current_url: window.location.href,
        page_title: document.title,
        pathname: location.pathname,
        search: location.search
      });
      console.log('📄 [PostHog] Page view tracked:', location.pathname);
    }
  }, [location]);
  
  // The complex redirection logic has been removed.
  // The AuthProvider now provides a simple `loading` and `user` state.
  // The `ProtectedRoute` and `PublicRoute` components will use this state
  // to handle redirection, which is a much cleaner and more standard approach.

  // Check if we're coming from a sign out to skip loading screen
  const isSignOutRedirect = sessionStorage.getItem('lokaa-signing-out') === 'true';
  if (isSignOutRedirect) {
    // Clear the flag and skip loading screen
    sessionStorage.removeItem('lokaa-signing-out');
    log.debug('Component', '🚪 [ApplicationRouter] Detected sign out redirect, skipping loading screen');
  } else if (loading) {
    // Do not block public routes with the global spinner
    const path = location.pathname;
    const isPublicPath = /^\/(|login$|signup$|forgot-password$|auth(\/?|$).+|debug$|storage-debug$|fix$)/.test(path);
    const isSpaceRoute = path.match(/^\/[^\/]+\/space/);
    
    // CRITICAL FIX: Don't show loading screen for space routes - let space components handle their own loading
    if (!isPublicPath && !isSpaceRoute) {
      return <AppLoadingScreen />;
    }
  }
  
  return (
    <>
      <RouteLogger />
      <Routes>
        {/* Public routes - accessible without authentication */}
        <Route path="/" element={
          <Suspense fallback={<RouteLoadingFallback />}>
            <LazyRoutes.LandingPageWrapper />
          </Suspense>
        } />
        <Route path="/auth/confirm" element={
          <Suspense fallback={<RouteLoadingFallback />}>
            <LazyRoutes.LandingPageWrapper />
          </Suspense>
        } />
        
        {/* Legacy @username format support */}
        <Route path="/@:slug" element={
          <Suspense fallback={<RouteLoadingFallback />}>
            <ProfileRouteHandler />
          </Suspense>
        } />
        
        {/* Fix for incorrect profile routes */}
        <Route path="/profile" element={<Navigate to="/settings/profile" replace />} />
        <Route path="/profile/space/feed" element={<Navigate to="/settings/profile" replace />} />
        
        {/* Public space about page - no auth required */}
        <Route path="/:subdomain/about" element={
          <Suspense fallback={<SpaceLoadingFallback />}>
            <LazyRoutes.SpaceAboutPage />
          </Suspense>
        } />
        
        {/* Recovery tools route - public access */}
        <Route path="/fix" element={
          <Suspense fallback={<RouteLoadingFallback />}>
            <WhiteScreenFix><div>Recovery tools loaded</div></WhiteScreenFix>
          </Suspense>
        } />
        
        {/* Debug tools - public access */}
        <Route path="/storage-debug" element={
          <Suspense fallback={<RouteLoadingFallback />}>
            <LazyRoutes.StorageDebugger />
          </Suspense>
        } />
        

        
        {/* Debug page - public access for development */}
        <Route path="/debug" element={
          <Suspense fallback={<RouteLoadingFallback />}>
            <LazyRoutes.DebugPage />
          </Suspense>
        } />
        
        {/* Core system routes - render modals directly on these URLs for better UX */}
        <Route path="/login" element={
          <Suspense fallback={<RouteLoadingFallback />}>
            <LazyRoutes.LandingPageWrapper />
          </Suspense>
        } />
        <Route path="/signup" element={
          <Suspense fallback={<RouteLoadingFallback />}>
            <LazyRoutes.LandingPageWrapper />
          </Suspense>
        } />
        <Route path="/forgot-password" element={
          <Suspense fallback={<RouteLoadingFallback />}>
            <LazyRoutes.LandingPageWrapper />
          </Suspense>
        } />
        
        {/* Password reset page - handles reset links from emails */}
        <Route path="/reset-password" element={
          <Suspense fallback={<RouteLoadingFallback />}>
            <LazyRoutes.ResetPasswordPage />
          </Suspense>
        } />
        
        {/* OAuth callback handler */}
        <Route path="/auth/callback" element={
          <Suspense fallback={<RouteLoadingFallback />}>
            <LazyRoutes.AuthCallback />
          </Suspense>
        } />
        
        {/* Create page with modal auth handling */}
        <Route path="/create" element={
          <Suspense fallback={<RouteLoadingFallback />}>
            <LazyRoutes.CreateSpaceWrapper />
          </Suspense>
        } />
        <Route path="/create-space" element={
          <Suspense fallback={<RouteLoadingFallback />}>
            <LazyRoutes.CreateSpaceWrapper />
          </Suspense>
        } />

        {/* Protected routes - require authentication */}
        <Route element={<ProtectedRoute><Outlet /></ProtectedRoute>}>
          {/* REVOLUTIONARY FIX: Single Persistent Shell Route */}
          {/* This captures ALL app routes and renders everything simultaneously */}
          <Route element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <TrulyPersistentAppShell />
            </Suspense>
          }>
            {/* Chat routes */}
            <Route path="/app/chat" element={<div />} />
            <Route path="/app/notifications" element={<div />} />
            <Route path="/notifs" element={<div />} />
            
            {/* User Profile route - moved inside persistent shell */}
            <Route path="/profile/:slug" element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <LazyRoutes.Profile />
              </Suspense>
            } />
            
            {/* ✅ FIXED: Simplified space routes - tab content handled by PersistentTabContent */}
            <Route path="/:subdomain/space" element={<div />} />
            <Route path="/:subdomain/space/feed" element={<div />} />
            <Route path="/:subdomain/space/about" element={<div />} />
            <Route path="/:subdomain/space/members" element={<div />} />
            <Route path="/:subdomain/space/classroom" element={<div />} />
            <Route path="/:subdomain/space/classroom/:courseSlug" element={<div />} />
            <Route path="/:subdomain/space/calendar" element={<div />} />
            <Route path="/:subdomain/space/leaderboard" element={<div />} />
            <Route path="/:subdomain/space/search" element={<div />} />
            
            {/* Course detail pages - moved inside persistent shell to prevent unmounting */}
            <Route path="/:subdomain/course/:courseSlug" element={<div />} />
            
            {/* NEW: Slug-based content routes (member-only) */}
            <Route path="/:subdomain/space/classroom/:courseSlug" element={<div />} />
            <Route path="/:subdomain/space/classroom/:courseSlug/:lessonSlug" element={<div />} />
            <Route path="/:subdomain/profile/:username" element={<div />} />
            
            {/* Discover page - moved inside persistent shell to prevent unmounting during navigation */}
            <Route path="/discover" element={<div />} />
          </Route>
          
          {/* Special routes outside persistent shell that need React Router */}
          <Route element={<ProtectedRoute><Outlet /></ProtectedRoute>}>
            {/* Post detail pages - use different route pattern to avoid conflict */}
            <Route path="/:subdomain/post/:postSlug" element={
              <Suspense fallback={<SpaceLoadingFallback />}>
                <LazyRoutes.PostDetailPage />
              </Suspense>
            } />
            {/* Debug pages - use different route pattern to avoid conflict */}
            <Route path="/:subdomain/debug" element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <LazyRoutes.SpaceDebugPage />
              </Suspense>
            } />
          </Route>

          {/* NEW: Legacy redirect routes for backward compatibility */}
          <Route element={<ProtectedRoute><Outlet /></ProtectedRoute>}>
            {/* Post redirects (ID to slug) */}
            <Route path="/:subdomain/post/:postId" element={
              <Suspense fallback={<SpaceLoadingFallback />}>
                <LazyRoutes.PostLegacyRedirect />
              </Suspense>
            } />
            <Route path="/spaces/:spaceId/posts/:postId" element={
              <Suspense fallback={<SpaceLoadingFallback />}>
                <LazyRoutes.PostLegacyRedirect />
              </Suspense>
            } />
            
            {/* Course redirects (ID to slug) */}
            <Route path="/:subdomain/space/classroom/:courseId" element={
              <Suspense fallback={<SpaceLoadingFallback />}>
                <LazyRoutes.CourseLegacyRedirect />
              </Suspense>
            } />
            <Route path="/:subdomain/space/classroom/:courseId/:lessonId" element={
              <Suspense fallback={<SpaceLoadingFallback />}>
                <LazyRoutes.LessonLegacyRedirect />
              </Suspense>
            } />
            
            {/* Profile redirects (global to space-specific) */}
            <Route path="/profile/:uuid" element={
              <Suspense fallback={<SpaceLoadingFallback />}>
                <LazyRoutes.ProfileLegacyRedirect />
              </Suspense>
            } />
          </Route>

          {/* Messages route - redirect to homepage since we use modals for messaging */}
          <Route path="/messages" element={<Navigate to="/" replace />} />
          <Route path="/messages/space" element={<Navigate to="/" replace />} />
          <Route path="/messages/space/*" element={<Navigate to="/" replace />} />
          <Route path="/messages/:any" element={<Navigate to="/" replace />} />
          
          {/* Smart landing with path restoration - attempts path restoration first, then redirects based on user's spaces */}
          <Route path="/app" element={<SmartRedirectWithPathRestoration />} />
          
          {/* For testing, keep the original SmartLanding on a different path */}
          <Route path="/smart-landing" element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <LazyRoutes.SmartLanding />
            </Suspense>
          } />
          
          {/* Space join route - handles joining a space */}
          <Route path="/space/join/:spaceId" element={
            <Suspense fallback={<SpaceLoadingFallback />}>
              <LazyRoutes.SpaceJoinPage />
            </Suspense>
          } />
          
          {/* Legacy Space routes - redirect to new structure */}
          <Route path="/space/:subdomain" element={<Navigate to="/:subdomain" replace />} />
          <Route path="/s/:subdomain" element={<Navigate to="/:subdomain" replace />} />
          <Route path="/space/:subdomain/about" element={<Navigate to="/:subdomain/about" replace />} />
          <Route path="/space/:subdomain/members" element={<Navigate to="/:subdomain/space/members" replace />} />
          <Route path="/space/:subdomain/calendar" element={<Navigate to="/:subdomain/space/calendar" replace />} />
          <Route path="/space/:subdomain/leaderboard" element={<Navigate to="/:subdomain/space/leaderboard" replace />} />
          
          {/* Legacy post URLs - redirect to slug-based URLs */}
          <Route path="/spaces/:spaceId/posts/:postId" element={<PostLegacyRedirect />} />
          <Route path="/space/:subdomain/posts/:postId" element={<PostLegacyRedirect />} />
        </Route>
        
        {/* Route Handler for normalizing automation-jungle URLs */}
        <Route path="/automation-jungle/*" element={<AutomationJungleRedirect />}>
          <Route path="*" element={<Navigate to="/automation-jungle/space" replace />} />
        </Route>

        {/* User Settings route */}
        <Route element={<ProtectedRoute><Outlet /></ProtectedRoute>}>
          <Route path="/settings" element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <LazyRoutes.UserSettings />
            </Suspense>
          } />
          <Route path="/settings/:tab" element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <LazyRoutes.UserSettings />
            </Suspense>
          } />
        </Route>

        {/* Legacy /subdomain direct routes - PUBLIC ACCESS for invite links */}
        <Route path="/:subdomain" element={
          <Suspense fallback={<SpaceLoadingFallback />}>
            <LazyRoutes.SpaceRedirectWithValidation />
          </Suspense>
        } />
        
        {/* Legacy subdomain routes - PROTECTED */}
        <Route element={<ProtectedRoute><Outlet /></ProtectedRoute>}>
          <Route path="/:subdomain/members" element={<Navigate to="/:subdomain/space/members" replace />} />
          <Route path="/:subdomain/calendar" element={<Navigate to="/:subdomain/space/calendar" replace />} />
          <Route path="/:subdomain/leaderboard" element={<Navigate to="/:subdomain/space/leaderboard" replace />} />
        </Route>
        
        {/* Profile Routes - Handled by ProfileRouteHandler */}
        <Route path="/@:username/*" element={
          <Suspense fallback={<RouteLoadingFallback />}>
            <ProfileRouteHandler />
          </Suspense>
        } />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}, 'ApplicationRouter');

export default ApplicationRouter; 