import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate, useParams, Outlet } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProfileImageProvider } from "@/contexts/ProfileImageContext";
import { SpaceProvider } from "@/contexts/SpaceContext";
import { MembershipProvider } from "@/contexts/MembershipContext";
import { SpaceMembershipProvider } from "@/contexts/SpaceMembershipContext";
import { Toaster } from "@/components/ui/toaster";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import SpaceProtectedRoute from "@/components/auth/SpaceProtectedRoute";
import PublicRoute from "@/components/auth/PublicRoute";
import AuthRedirect from "@/components/auth/AuthRedirect";
import CommunityLayout from "@/components/layout/CommunityLayout";
import CreatorDashboard from "@/pages/CreatorDashboard";
import SmartLanding from "@/pages/SmartLanding";
import QuickSpaceRedirect from "@/pages/QuickSpaceRedirect";
import Discover from "@/pages/Discover";
import Space from "@/pages/Space";
import SpaceAboutPage from "@/pages/SpaceAboutPage";
import SpaceDebugPage from "@/pages/SpaceDebugPage"; // Import the SpaceDebugPage component
import SpaceRedirect from "@/pages/SpaceRedirect";
import Dashboard from "@/pages/Dashboard"; // Import for direct redirection
import CreateSpace from "@/pages/CreateSpace";
import CreateSpaceWrapper from "@/pages/CreateSpaceWrapper"; // Import the wrapper component
import { LandingPageWrapper } from "@/pages/LandingPage";
import WhiteScreenFix from "@/components/errors/WhiteScreenFix"; // Import the WhiteScreenFix component
import StorageDebugger from "@/pages/StorageDebugger"; // Import the Storage Debugger
import UserSettings from "@/pages/UserSettings"; // Import the UserSettings page
import React from "react";
import { Loader2 } from "lucide-react";
import Profile from "@/pages/Profile";
import ProfileRouteHandler from "@/components/profile/ProfileRouteHandler"; // Import the new ProfileRouteHandler
import SpaceJoinPage from "@/pages/SpaceJoinPage"; // Import the SpaceJoinPage component
import SubdomainRouteHandler from "@/router/SubdomainRouteHandler"; // <--- IMPORT NEW HANDLER

// Import our modal utility for authentication
import "@/utils/authModals";

// Route logger component to track route changes
function RouteLogger() {
  const location = useLocation();
  
  useEffect(() => {
    console.log('Route changed to:', location.pathname);
  }, [location]);
  
  return null;
}

// Add special handling for the automation-jungle route
function AutomationJungleRedirect() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isRedirecting, setIsRedirecting] = useState(true);

  useEffect(() => {
    // If the URL pattern is like /automation-jungle/space/feed
    // we want to normalize it to /:subdomain/space/feed
    
    const pathSegments = location.pathname.split('/');
    if (pathSegments[1] === 'automation-jungle') {
      // This is a direct access URL to automation-jungle without the proper structure
      // Normalize it to match our expected format
      let normalizedPath = `/${pathSegments[1]}/space`;
      
      // Add any remaining path segments
      if (pathSegments.length > 2) {
        const remainingSegments = pathSegments.slice(3).join('/');
        if (remainingSegments) {
          normalizedPath += `/${remainingSegments}`;
        }
      } else {
        // Default to feed if no other segments
        normalizedPath += '/feed';
      }
      
      console.log(`Normalizing automation jungle URL from ${location.pathname} to ${normalizedPath}`);
      
      // Redirect to the normalized path
      navigate(normalizedPath, { replace: true });
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
}

// Wrapper component for routes
function AppRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  
  // Handle root path redirection based on auth state
  useEffect(() => {
    // Skip if auth is still loading
    if (loading) return;
    
    // Only redirect non-direct navigations to the root path
    const isDirectNavigation = 
      location.pathname === "/" && 
      (!document.referrer || !document.referrer.includes(window.location.origin));
    
    if (user && location.pathname === '/' && !isDirectNavigation) {
      console.log('AppRoutes: User is logged in on root path, redirecting to SmartLanding');
      // Send to SmartLanding which will handle space redirection
      // navigate('/app', { replace: true }); // Temporarily commented out for diagnosis
    }
  }, [user, loading, location.pathname, navigate]);
  
  return (
    <>
      <RouteLogger />
      <Routes>
        {/* Public routes - accessible without authentication */}
        <Route path="/" element={<LandingPageWrapper />} />
        <Route path="/auth/callback" element={<AuthRedirect />} />
        
        {/* User Profile route - MOVED INSIDE ProtectedRoute below
        <Route path="/@:slug" element={<ProfileRouteHandler />} /> 
        */}
        
        {/* Fix for incorrect profile routes */}
        <Route path="/profile" element={<Navigate to="/settings/profile" replace />} />
        <Route path="/profile/space/feed" element={<Navigate to="/settings/profile" replace />} />
        
        {/* Public space about page - no auth required */}
        <Route path="/:subdomain/about" element={<SpaceAboutPage />} />
        
        {/* Recovery tools route - public access */}
        <Route path="/fix" element={<WhiteScreenFix />} />
        
        {/* Debug tools - public access */}
        <Route path="/storage-debug" element={<StorageDebugger />} />
        
        {/* Core system routes - exact matches first */}
        <Route path="/signup" element={
          <Navigate to="/" replace state={{ showAuthModal: 'signup' }} />
        } />
        <Route path="/login" element={
          <Navigate to="/" replace state={{ showAuthModal: 'login' }} />
        } />
        <Route path="/forgot-password" element={
          <Navigate to="/" replace state={{ showAuthModal: 'forgot' }} />
        } />
        
        {/* Create page with modal auth handling */}
        <Route path="/create" element={<CreateSpaceWrapper />} />
        <Route path="/create-space" element={<CreateSpaceWrapper />} />

        {/* Protected routes - require authentication */}
        <Route element={<ProtectedRoute />}>
          {/* User Profile route - MUST come before subdomain routes */}
          {/* <Route path="/@:slug" element={<ProfileRouteHandler />} /> */}
          <Route path="/profile/:slug" element={<ProfileRouteHandler />} /> {/* Using :slug as the param name, maps to profile_url */}

          {/* Smart landing - redirects based on user's spaces */}
          <Route path="/app" element={<QuickSpaceRedirect />} />
          
          {/* For testing, keep the original SmartLanding on a different path */}
          <Route path="/smart-landing" element={<SmartLanding />} />
          
          {/* Discover page for finding spaces when user has none */}
          <Route path="/discover" element={<Discover />} />
          
          {/* Space join route - handles joining a space */}
          <Route path="/space/join/:spaceId" element={<SpaceJoinPage />} />
          
          {/* Creator Dashboard (accessible via profile dropdown) */}
          <Route path="/dashboard" element={<CreatorDashboard />} />
          
          {/* Temporary direct route to test creator dashboard */}
          <Route path="/direct-dashboard" element={<Dashboard />} />
          
          {/* Legacy Space routes - redirect to new structure */}
          <Route path="/space/:subdomain" element={<Navigate to="/:subdomain" replace />} />
          <Route path="/s/:subdomain" element={<Navigate to="/:subdomain" replace />} />
          <Route path="/space/:subdomain/about" element={<Navigate to="/:subdomain/about" replace />} />
          <Route path="/space/:subdomain/members" element={<Navigate to="/:subdomain/space/members" replace />} />
          <Route path="/space/:subdomain/calendar" element={<Navigate to="/:subdomain/space/calendar" replace />} />
          <Route path="/space/:subdomain/leaderboard" element={<Navigate to="/:subdomain/space/leaderboard" replace />} />
          
          {/* Legacy /subdomain direct routes - redirect to new structure */}
          <Route path="/:subdomain" element={<SubdomainRouteHandler />} />
          <Route path="/:subdomain/members" element={<Navigate to="/:subdomain/space/members" replace />} />
          <Route path="/:subdomain/calendar" element={<Navigate to="/:subdomain/space/calendar" replace />} />
          <Route path="/:subdomain/leaderboard" element={<Navigate to="/:subdomain/space/leaderboard" replace />} />
        </Route>
        
        {/* Route Handler for normalizing automation-jungle URLs */}
        <Route path="/automation-jungle/*" element={<AutomationJungleRedirect />}>
          <Route path="*" element={<Navigate to="/automation-jungle/space/feed" replace />} />
        </Route>
        
        {/* Protected space routes - require space membership */}
        <Route path="/:subdomain/space" element={<SpaceProtectedRoute />}>
          <Route index element={<Space initialTab="community" />} />
          <Route path="feed" element={<Space initialTab="community" />} />
          <Route path="community" element={<Space initialTab="community" />} />
          <Route path="about" element={<Space initialTab="about" />} />
          <Route path="members" element={<Space initialTab="members" />} />
          <Route path="classroom" element={<Space initialTab="classroom" />} />
          <Route path="calendar" element={<Space initialTab="calendar" />} />
          <Route path="leaderboard" element={<Space initialTab="leaderboard" />} />
          <Route path="debug" element={<SpaceDebugPage />} />
        </Route>

        {/* User Settings route */}
        <Route element={<ProtectedRoute />}>
          <Route path="/settings" element={<UserSettings />} />
          <Route path="/settings/:tab" element={<UserSettings />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        // Increase staleTime to prevent automatic refetches when the app remounts
        // This helps with tab switching without refreshing data unnecessarily
        staleTime: 5 * 60 * 1000, // 5 minutes - data is considered fresh for 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes - keep data in cache for 10 minutes
      },
    },
  }));

  // Debug: Log when the App component mounts and unmounts
  useEffect(() => {
    console.log('[App Debug] App component mounted at', new Date());
    return () => {
      console.log('[App Debug] App component unmounted at', new Date());
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <SpaceMembershipProvider>
            <AuthProvider>
              <ProfileImageProvider>
                <SpaceProvider>
                  <MembershipProvider>
                    <AppRoutes />
                    <Toaster />
                  </MembershipProvider>
                </SpaceProvider>
              </ProfileImageProvider>
            </AuthProvider>
          </SpaceMembershipProvider>
        </Router>
      </HelmetProvider>
    </QueryClientProvider>
  );
}
