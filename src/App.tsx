import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProfileImageProvider } from "@/contexts/ProfileImageContext";
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
      navigate('/app', { replace: true });
    }
  }, [user, loading, location.pathname, navigate]);
  
  return (
    <>
      <RouteLogger />
      <Routes>
        {/* Public routes - accessible without authentication */}
        <Route path="/" element={<LandingPageWrapper />} />
        <Route path="/auth/callback" element={<AuthRedirect />} />
        
        {/* User Profile route - MUST come before subdomain routes */}
        <Route path="/@:slug" element={<ProfileRouteHandler />} />
        
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
          {/* Smart landing - redirects based on user's spaces */}
          <Route path="/app" element={<QuickSpaceRedirect />} />
          
          {/* For testing, keep the original SmartLanding on a different path */}
          <Route path="/smart-landing" element={<SmartLanding />} />
          
          {/* Discover page for finding spaces when user has none */}
          <Route path="/discover" element={<Discover />} />
          
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
          <Route path="/:subdomain" element={<SpaceRedirect />} />
          <Route path="/:subdomain/members" element={<Navigate to="/:subdomain/space/members" replace />} />
          <Route path="/:subdomain/calendar" element={<Navigate to="/:subdomain/space/calendar" replace />} />
          <Route path="/:subdomain/leaderboard" element={<Navigate to="/:subdomain/space/leaderboard" replace />} />
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
        <Router>
          <AuthProvider>
            <ProfileImageProvider>
            <AppRoutes />
            <Toaster />
            </ProfileImageProvider>
          </AuthProvider>
        </Router>
      </HelmetProvider>
    </QueryClientProvider>
  );
}
