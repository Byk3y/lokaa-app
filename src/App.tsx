import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import PublicRoute from "@/components/auth/PublicRoute";
import AuthRedirect from "@/components/auth/AuthRedirect";
import CommunityLayout from "@/components/layout/CommunityLayout";
import CreatorDashboard from "@/pages/CreatorDashboard";
import SmartLanding from "@/pages/SmartLanding";
import QuickSpaceRedirect from "@/pages/QuickSpaceRedirect";
import Discover from "@/pages/Discover";
import Space from "@/pages/Space";
import SpaceAboutPage from "@/pages/SpaceAboutPage";
import Dashboard from "@/pages/Dashboard"; // Import for direct redirection
import CreateSpace from "@/pages/CreateSpace";
import CreateSpaceWrapper from "@/pages/CreateSpaceWrapper"; // Import the wrapper component
import { LandingPageWrapper } from "@/pages/LandingPage";
import WhiteScreenFix from "@/components/errors/WhiteScreenFix"; // Import the WhiteScreenFix component
import React from "react";
import { Loader2 } from "lucide-react";
import SpaceAbout from "./pages/SpaceAbout";

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
        
        {/* Recovery tools route - public access */}
        <Route path="/fix" element={<WhiteScreenFix />} />
        
        {/* Space about page - public access */}
        <Route path="/:subdomain/about" element={<SpaceAboutPage />} />
        
        {/* Redirect auth routes to home with appropriate modal */}
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
          
          {/* Space routes */}
          <Route path="/space/:subdomain" element={<Space />} />
          <Route path="/space/:subdomain/about" element={<SpaceAbout />} />
          <Route path="/s/:subdomain" element={<Space />} />
          
          {/* Temporary direct route to test creator dashboard */}
          <Route path="/direct-dashboard" element={<Dashboard />} />
          
          {/* Legacy Community routes - will be phased out in favor of /space/:subdomain */}
          <Route path="/c/:communitySlug/*" element={<CommunityLayout />}>
            {/* All legacy routes inside CommunityLayout will redirect to home */}
          </Route>
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
        staleTime: 0, // Don't use cached data for critical auth-related queries
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <Router>
          <AuthProvider>
            <AppRoutes />
            <Toaster />
          </AuthProvider>
        </Router>
      </HelmetProvider>
    </QueryClientProvider>
  );
}
