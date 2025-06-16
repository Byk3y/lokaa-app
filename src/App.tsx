import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate, useParams, Outlet } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect, Suspense, useRef } from "react";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider, useOptimizedAuth } from "@/contexts/AuthContext";
import { ProfileImageProvider } from "@/contexts/ProfileImageContext";
import { SpaceProvider } from "@/contexts/SpaceContext";
import { MembershipProvider } from "@/contexts/MembershipContext";
import { ChatProvider } from "@/features/chat/compat/ChatContextCompat";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import SpaceProtectedRoute from "@/components/auth/SpaceProtectedRoute";
import PublicRoute from "@/components/auth/PublicRoute";
import AuthRedirect from "@/components/auth/AuthRedirect";
// CommunityLayout removed
import { ErrorBoundary } from 'react-error-boundary';
import { EnhancedErrorBoundary } from '@/components/errors/EnhancedErrorBoundary';
import { errorHandlingSystem } from '@/utils/errorHandlingSystem';

// Lazy-loaded routes for performance optimization
import * as LazyRoutes from "@/routes/LazyRoutes";
import { RouteLoadingFallback, SpaceLoadingFallback } from "@/routes/LazyRoutes";

import WhiteScreenFix from "@/components/errors/WhiteScreenFix"; // Import the WhiteScreenFix component
import React from "react";
import { Loader2 } from "lucide-react";
import ProfileRouteHandler from "@/components/profile/ProfileRouteHandler"; // Import the new ProfileRouteHandler
import SubdomainRouteHandler from "@/router/SubdomainRouteHandler"; // <--- IMPORT NEW HANDLER
import { UserProfileProvider } from '@/contexts/UserProfileContext';

import SpaceShellLayout from "@/components/layout/SpaceShellLayout";
import SpaceTabContent from "@/components/space/SpaceTabContent";
import PostLegacyRedirect from "@/components/PostLegacyRedirect"; // Import the legacy redirect component
import { GlobalPresenceProvider } from './providers/GlobalPresenceProvider';
import { useUnifiedPresence } from '@/hooks/useUnifiedPresence';

// Import modern modal system
import { ModalProvider } from '@/shared/components/modals';
import { AuthModalRouter } from '@/features/auth/components/modals';

// 🚀 Phase 5B Performance Optimizations
import { OptimizedProviderTree } from '@/providers/OptimizedProviders';
import performanceMonitor from '@/utils/performanceMonitor';
import { persistentCache } from '@/utils/persistentCache';
import { useCleanupTracker } from '@/hooks/useCleanupTracker';

// 🔧 Phase 6A: Progressive Web App (PWA) Features
import { serviceWorkerManager } from '@/utils/serviceWorkerManager';
import { usePWA, useInstallPrompt } from '@/hooks/usePWA';
import NetworkStatusIndicator from '@/components/errors/NetworkStatusIndicator';
import PWAInitializer from '@/components/pwa/PWAInitializer';

// Phase 5B Testing Tools (Development only)
import '@/utils/phase5bTestUtils';
import '@/utils/phase5bPerformanceFix';
import '@/utils/phase5bPerformanceFixV2';
import '@/utils/smartRedirectValidation';
import '@/utils/performanceTestUtils'; // Final performance testing suite

// Import presence debugging utilities
import '@/utils/presenceDebugger';
import '@/utils/presenceTestUtils';
import '@/utils/mediaDebugger';

// Import console cleanup utility
import '@/utils/developmentLogger';
import '@/utils/consoleCleanup';
import '@/utils/consoleOptimizationReport';
import '@/utils/presenceTestingUtility';
import '@/utils/databaseConnectivityTest';
import '@/utils/mobileDetection';
import { initializeCacheWarming } from '@/utils/cacheWarming';

// Import mobile browser blocking test utilities
import '@/utils/mobileBrowserBlockingTest';

// Phase 2C: Predictive Cache Integration
import '@/utils/phase2cIntegration';

// Phase 4A: Error Tracking & Reporting Integration
import '@/utils/phase4aIntegration';
import { FloatingErrorDashboard } from '@/components/debug/ErrorAnalyticsDashboard';

// Phase 4B: User Analytics & A/B Testing Integration
import '@/utils/phase4bIntegration';

// Phase 5: Mobile Optimization & PWA Integration
import '@/utils/phase5Integration';

// Phase 3: Enhanced User Experience & Performance Integration
import '@/utils/phase3PerformanceOptimizer';
import '@/utils/phase3CacheStrategy';
import '@/utils/phase3RenderOptimizer';
import '@/utils/phase3UXPatterns';
import '@/utils/phase3TestingFramework';

// Phase 6: Bundle Optimization & Code Splitting Integration
import '@/utils/phase6Integration';

// Phase 7: Advanced Features & Production Readiness
import { advancedCache } from '@/utils/advancedCacheManager';
import { seoManager } from '@/utils/seoManager';
import { pageVisibilityManager } from '@/utils/pageVisibilityManager';
import '@/utils/phase7Integration';

// Phase 8A: AI/ML Integration & Smart Features
import '@/utils/phase8aIntegration';

// PHASE 1: Enhanced Mobile Session Recovery
import { phase1Recovery } from '@/utils/phase1MobileRecovery';
import Phase1MobileRecovery from '@/components/mobile/Phase1MobileRecovery';

import { navigationCoordinator } from "@/utils/navigationCoordinator";
import { authFlowStateManager } from "@/utils/authFlowStateManager";
import ChatPage from '@/pages/ChatPage'; // <-- IMPORT CHAT PAGE

import '@/utils/hmrMonitor'; // Initialize HMR monitoring
import { trackRouteChange } from '@/hooks/useSpaceSettingsStore';

// REMOVED: Mobile Safari workaround - now handled by mobileOptimizationLayer
// import '@/utils/mobileSupabaseWorkaround';

// Supabase Health Monitor
import { supabaseHealthMonitor } from '@/utils/supabaseHealthCheck';
import { initializeSupabase } from '@/integrations/supabase/client'; // Import the new initializer

// 🔧 Development HMR Error Recovery
if (import.meta.env?.DEV && typeof window !== 'undefined') {
  const originalError = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    if (typeof message === 'string' && message.includes('Importing a module script failed')) {
      console.warn('🔄 [HMR Fix] Module import failed detected, attempting recovery...');
      
      // Try to recover by triggering a gentle reload after a short delay
      setTimeout(() => {
        console.log('🔄 [HMR Fix] Reloading to recover from module import failure');
        window.location.reload();
      }, 1000);
      
      return true; // Prevent default error handling
    }
    
    // Call original error handler for other errors
    if (originalError) {
      return originalError(message, source, lineno, colno, error);
    }
    return false;
  };
  
  // Also handle unhandled promise rejections (async import failures)
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.message?.includes('Importing a module script failed')) {
      console.warn('🔄 [HMR Fix] Async module import failed, attempting recovery...');
      event.preventDefault(); // Prevent unhandled rejection error
      
      setTimeout(() => {
        console.log('🔄 [HMR Fix] Reloading to recover from async import failure');
        window.location.reload();
      }, 1000);
    }
  });
  
  console.log('🔧 [HMR Fix] Module import error recovery installed');
}

// Higher-order component to safely handle auth context
function withAuthSafety<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  return function SafeAuthComponent(props: P) {
    try {
      return <Component {...props} />;
    } catch (error) {
      if (error instanceof Error && error.message.includes('useOptimizedAuth must be used within an AuthProvider')) {
        console.warn(`🔒 [${componentName}] Auth context not ready yet, skipping render`);
        return null;
      }
      // Re-throw other errors
      throw error;
    }
  };
}

// Route logger component to track route changes
function RouteLogger() {
  const location = useLocation();
  
  useEffect(() => {
    console.log('Route changed to:', location.pathname);
  }, [location]);
  
  return null;
}

// Unified Presence Initializer - ensures global presence system is active
const UnifiedPresenceInitializer = withAuthSafety(function UnifiedPresenceInitializer() {
  const { user } = useOptimizedAuth();
  const { isInitialized } = useUnifiedPresence();
  
  useEffect(() => {
    if (user?.id && isInitialized) {
      console.log('🌐 [UnifiedPresence] Global presence system initialized for user:', user.id);
    }
  }, [user?.id, isInitialized]);
  
  return null;
}, 'UnifiedPresenceInitializer');

// Add special handling for the automation-jungle route
const AutomationJungleRedirect = withAuthSafety(function AutomationJungleRedirect() {
  const { user } = useOptimizedAuth();
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
        console.warn('Detected malformed URL with multiple "space" segments:', location.pathname);
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
      
      console.log(`Normalizing automation jungle URL from ${location.pathname} to ${normalizedPath}`);
      
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

// Wrapper component for routes
const AppRoutes = withAuthSafety(function AppRoutes() {
  const { user, loading } = useOptimizedAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Initialize NavigationCoordinator with React Router's navigate function
  useEffect(() => {
    navigationCoordinator.initialize(navigate);
    console.log('🚀 [NavigationCoordinator] Initialized with navigate function');
  }, [navigate]);
  
  // The complex redirection logic has been removed.
  // The AuthProvider now provides a simple `loading` and `user` state.
  // The `ProtectedRoute` and `PublicRoute` components will use this state
  // to handle redirection, which is a much cleaner and more standard approach.

  if (loading) {
    return <AppLoadingScreen />;
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
        <Route path="/auth/callback" element={<AuthRedirect />} />
        
        {/* Legacy @username format support */}
        <Route path="/@:slug" element={<ProfileRouteHandler />} />
        
        {/* Fix for incorrect profile routes */}
        <Route path="/profile" element={<Navigate to="/settings/profile" replace />} />
        <Route path="/profile/space/feed" element={<Navigate to="/settings/profile" replace />} />
        
        {/* Public space about page - no auth required */}
        <Route path="/:subdomain/about" element={
          <Suspense fallback={<SpaceLoadingFallback />}>
            <LazyRoutes.SpaceAboutPage />
          </Suspense>
        } />
        
        {/* Public Discover page - no auth required, enhanced progressively */}
        <Route path="/discover" element={
          <Suspense fallback={<RouteLoadingFallback />}>
            <LazyRoutes.Discover />
          </Suspense>
        } />
        
        {/* Recovery tools route - public access */}
        <Route path="/fix" element={<WhiteScreenFix><div>Recovery tools loaded</div></WhiteScreenFix>} />
        
        {/* Debug tools - public access */}
        <Route path="/storage-debug" element={
          <Suspense fallback={<RouteLoadingFallback />}>
            <LazyRoutes.StorageDebugger />
          </Suspense>
        } />
        
        {/* Add our Supabase example page - public access */}
        <Route path="/supabase-example" element={
          <Suspense fallback={<RouteLoadingFallback />}>
            <LazyRoutes.SupabaseExample />
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
          {/* Chat page for mobile */}
          <Route path="/app/chat" element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <LazyRoutes.ChatPage />
            </Suspense>
          } />
          
          {/* User Profile route - MUST come before subdomain routes */}
          <Route path="/profile/:slug" element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <LazyRoutes.Profile />
            </Suspense>
          } />
          
          {/* Messages route - redirect to homepage since we use modals for messaging */}
          <Route path="/messages" element={<Navigate to="/" replace />} />
          <Route path="/messages/space" element={<Navigate to="/" replace />} />
          <Route path="/messages/space/*" element={<Navigate to="/" replace />} />
          <Route path="/messages/:any" element={<Navigate to="/" replace />} />
          
          {/* Smart landing - redirects based on user's spaces */}
          <Route path="/app" element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <LazyRoutes.QuickSpaceRedirect />
            </Suspense>
          } />
          
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
        
        {/* Protected space routes - require space membership */}
        <Route path="/:subdomain/space" element={<SpaceProtectedRoute />}>
          {/* Post detail page with slug URL */}
          <Route path=":postSlug" element={
            <Suspense fallback={<SpaceLoadingFallback />}>
              <LazyRoutes.PostDetailPage />
            </Suspense>
          } />
          
          {/* Replace all individual space tab routes with our new shell layout */}
          <Route element={<SpaceShellLayout />}>
            <Route index element={<SpaceTabContent />} />
            {/* Add a redirect from /feed to the root path for backward compatibility */}
            <Route path="feed" element={<Navigate to="." replace />} />
            <Route path="community" element={<SpaceTabContent />} />
            <Route path="about" element={<SpaceTabContent />} />
            <Route path="members" element={<SpaceTabContent />} />
            <Route path="classroom" element={<SpaceTabContent />} />
            <Route path="calendar" element={<SpaceTabContent />} />
            <Route path="leaderboard" element={<SpaceTabContent />} />
          </Route>
          {/* Keep the debug route separate as it's not a tab */}
          <Route path="debug" element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <LazyRoutes.SpaceDebugPage />
            </Suspense>
          } />
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

        {/* Legacy /subdomain direct routes - WITH VALIDATION TO AVOID ROOT PATH */}
        <Route element={<ProtectedRoute><Outlet /></ProtectedRoute>}>
          <Route path="/:subdomain" element={
            <Suspense fallback={<SpaceLoadingFallback />}>
              <LazyRoutes.SpaceRedirectWithValidation />
            </Suspense>
          } />
          <Route path="/:subdomain/members" element={<Navigate to="/:subdomain/space/members" replace />} />
          <Route path="/:subdomain/calendar" element={<Navigate to="/:subdomain/space/calendar" replace />} />
          <Route path="/:subdomain/leaderboard" element={<Navigate to="/:subdomain/space/leaderboard" replace />} />
        </Route>
        
        {/* Profile Routes - Handled by ProfileRouteHandler */}
        <Route path="/@:username/*" element={<ProfileRouteHandler />} />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}, 'AppRoutes');

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

// Error boundary fallback component for debugging
function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  console.error('🚨 React Error Boundary caught error:', error);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-2xl w-full">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Application Error</h2>
        <p className="text-gray-700 mb-4">
          Something went wrong. This error has been logged for debugging.
        </p>
        <details className="mb-4">
          <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
            Show Error Details
          </summary>
          <div className="mt-2 p-4 bg-gray-100 rounded text-sm font-mono">
            <div className="text-red-600 font-bold">Error: {error.message}</div>
            <div className="mt-2 text-gray-600 whitespace-pre-wrap">{error.stack}</div>
          </div>
        </details>
        <div className="flex gap-4">
          <button 
            onClick={resetErrorBoundary}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
}

// Development Module Error Recovery Component
const ModuleErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => {
  const isModuleError = error.message?.includes('Importing a module script failed') || 
                       error.message?.includes('Loading chunk') ||
                       error.name === 'ChunkLoadError';

  if (!isModuleError) {
    // Not a module error, use regular error fallback
    throw error;
  }

  console.error('🚨 [ModuleErrorFallback] Caught module import error:', error);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
        <div className="text-orange-500 text-6xl mb-4">🔄</div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Development Module Error</h2>
        <p className="text-gray-600 mb-4">
          A module failed to load during development. This is usually caused by HMR (Hot Module Replacement) issues.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-6">
          <p className="text-sm text-blue-800">
            <strong>Quick Fix:</strong> This often resolves automatically. Try the options below.
          </p>
        </div>
        <div className="flex gap-3 justify-center mb-4">
          <button 
            onClick={() => {
              console.log('🔄 [ModuleErrorFallback] Attempting recovery...');
              resetErrorBoundary();
            }}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            🔄 Try Again
          </button>
          <button 
            onClick={() => {
              console.log('🔄 [ModuleErrorFallback] Hard reload...');
              window.location.reload();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            ↻ Reload Page
          </button>
        </div>
        {import.meta.env?.DEV && (
          <details className="text-left">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 mb-2">
              🔧 Technical Details
            </summary>
            <div className="bg-gray-100 p-3 rounded text-xs">
              <div><strong>Error:</strong> {error.message}</div>
              <div><strong>Type:</strong> {error.name}</div>
              <div><strong>Time:</strong> {new Date().toLocaleTimeString()}</div>
            </div>
          </details>
        )}
        <p className="text-xs text-gray-400 mt-4">
          This error boundary only catches module loading issues during development.
        </p>
      </div>
    </div>
  );
};

// DEBUG: Add debugging utilities to window
if (typeof window !== 'undefined') {
  (window as any).debugPostsCache = () => {
    const postsCache = localStorage.getItem('posts_cache_235e68d1-89df-4d2d-8945-e7756d60de20');
    if (postsCache) {
      const parsed = JSON.parse(postsCache);
      console.log('📦 [Debug] Posts cache:', parsed);
      
      if (parsed.data && Array.isArray(parsed.data)) {
        const postsWithMedia = parsed.data.filter((post: any) => post.media_urls && post.media_urls.length > 0);
        console.log('📦 [Debug] Posts with media:', postsWithMedia.length);
        postsWithMedia.forEach((post: any) => {
          console.log(`📦 [Debug] Post "${post.title}" media:`, post.media_urls);
        });
      }
    } else {
      console.log('📦 [Debug] No posts cache found');
    }
  };
  
  (window as any).debugMediaConversion = () => {
    console.log('🧪 [Debug] Testing media conversion...');
    if ((window as any).MediaDebugger?.testMediaConversionWithSamples) {
      (window as any).MediaDebugger.testMediaConversionWithSamples();
    } else {
      console.log('❌ [Debug] MediaDebugger not available');
    }
  };
  
  (window as any).testDatabaseFormats = () => {
    console.log('🧪 [Debug] Testing database media formats...');
    if ((window as any).MediaDebugger?.testDatabaseMediaFormats) {
      return (window as any).MediaDebugger.testDatabaseMediaFormats();
    } else {
      console.log('❌ [Debug] MediaDebugger not available');
    }
  };
}

// Global debugging interfaces for development
if (typeof window !== 'undefined') {
  // Phase 8A global interfaces - Import but let the module set up its own interface
  import('@/utils/phase8aIntegration').then((module) => {
    // The module already sets up (window as any).phase8a properly in its own code
    // Just verify it's available
    if ((window as any).phase8a) {
      console.log('🤖 Phase 8A global interface loaded and verified');
    } else {
      console.warn('⚠️ Phase 8A global interface not found, setting up fallback');
      (window as any).phase8a = {
        runAllTests: () => module.phase8aIntegration.runAllTests(),
        getStatus: () => module.phase8aIntegration.getStatus(),
        triggerTestJourney: (context?: any) => module.phase8aIntegration.triggerTestJourney(context),
                 clearHistory: () => {},
        journeyManager: null
      };
    }
  }).catch(err => {
    console.warn('Failed to load Phase 8A global interface:', err);
  });
  
  // Phase 8B global interfaces - Import the actual instance
  import('@/utils/phase8bIntegration').then((module) => {
    // Get the instance and create enhanced global interface
    const phase8bInstance = module.phase8bIntegration;
    
    (window as any).phase8b = {
      // Main integration methods
      getStatus: () => phase8bInstance.getStatus(),
      getMetrics: () => phase8bInstance.getMetrics(),
      runTest: () => phase8bInstance.runComprehensiveTest(),
      updateConfig: (config) => phase8bInstance.updateConfig(config),
      recordInteraction: (userId, interaction) => phase8bInstance.recordUserInteraction(userId, interaction),
      getUserSession: (userId) => phase8bInstance.getUserSession(userId),
      getAllSessions: () => phase8bInstance.getAllSessions(),
      getComponentStatus: () => phase8bInstance.getComponentStatus(),
      getUserExperienceRecommendations: (userId) => phase8bInstance.getUserExperienceRecommendations(userId),
      cleanup: () => phase8bInstance.cleanup(),
      
      // UI Adaptation Methods
      resetAdaptations: () => phase8bInstance.resetAdaptations(),
      getAdaptations: () => phase8bInstance.getActiveAdaptations(),
      getActiveAdaptations: () => phase8bInstance.getActiveAdaptations(),
      
      // Test methods
      testIntegration: () => {
        console.log('🎯 Testing Phase 8B integration...');
        return phase8bInstance.runComprehensiveTest();
      },
      
      testUserExperience: () => {
        console.log('👤 Testing user experience flow...');
        const userId = 'ux_test_user_' + Date.now();
        
        // Simulate user interactions
        phase8bInstance.recordUserInteraction(userId, {
          type: 'page_view',
          target: 'dashboard',
          success: true,
          duration: 1200
        });
        
        phase8bInstance.recordUserInteraction(userId, {
          type: 'click_button',
          target: 'create_post',
          success: true,
          duration: 300
        });
        
        phase8bInstance.recordUserInteraction(userId, {
          type: 'form_submit',
          target: 'post_form',
          success: false,
          duration: 5000
        });
        
        // Get recommendations
        const recommendations = phase8bInstance.getUserExperienceRecommendations(userId);
        const session = phase8bInstance.getUserSession(userId);
        
        console.log('✅ User experience test completed', {
          userId,
          session: session ? {
            interactions: session.interactions.length,
            experienceScore: session.experienceScore,
            satisfactionLevel: session.satisfactionLevel
          } : null,
          recommendations
        });
        
        return { userId, session, recommendations };
      },
      
      testSystemCoordination: () => {
        console.log('🤝 Testing system coordination...');
        const componentStatus = phase8bInstance.getComponentStatus();
        const status = phase8bInstance.getStatus();
        
        console.log('✅ System coordination test completed', {
          integrationHealth: status.integrationHealth,
          activeComponents: status.activeComponents,
          componentStatus: Object.fromEntries(componentStatus)
        });
        
        return status;
      }
    };
    
    console.log('🎯 Phase 8B global interface loaded');
  }).catch(err => {
    console.warn('Failed to load Phase 8B global interface:', err);
  });
  
  // Individual Phase 8B component interfaces
  import('@/utils/predictiveUIEngine').then((module) => {
    (window as any).predictiveUIEngine = module.predictiveUIEngine;
    console.log('🔮 Predictive UI Engine global interface loaded');
  }).catch(err => {
    console.warn('Failed to load Predictive UI Engine interface:', err);
  });
  
  import('@/utils/userBehaviorPredictor').then((module) => {
    (window as any).userBehaviorPredictor = module.userBehaviorPredictor;
    console.log('🧠 User Behavior Predictor global interface loaded');
  }).catch(err => {
    console.warn('Failed to load User Behavior Predictor interface:', err);
  });
  
  import('@/utils/personalizationEngine').then((module) => {
    (window as any).personalizationEngine = module.personalizationEngine;
    console.log('🎨 Personalization Engine global interface loaded');
  }).catch(err => {
    console.warn('Failed to load Personalization Engine interface:', err);
  });
  
  import('@/utils/adaptiveInterfaceManager').then((module) => {
    (window as any).adaptiveInterfaceManager = module.adaptiveInterfaceManager;
    console.log('🔄 Adaptive Interface Manager global interface loaded');
  }).catch(err => {
    console.warn('Failed to load Adaptive Interface Manager interface:', err);
  });
  
  // Other phase interfaces (keeping as placeholders for now)
  (window as any).phase3PerformanceOptimizer = '@/utils/phase3PerformanceOptimizer';
  (window as any).phase3TestingFramework = '@/utils/phase3TestingFramework';
  (window as any).phase3UXPatterns = '@/utils/phase3UXPatterns';
  (window as any).phase4a = '@/utils/phase4aIntegration';
  (window as any).phase4b = '@/utils/phase4bIntegration';
  (window as any).phase5 = '@/utils/phase5Integration';
  (window as any).phase6 = '@/utils/phase6Integration';
  (window as any).phase7 = '@/utils/phase7Integration';
}

export default function App() {
  // FIXED: Simplified cleanup tracking (reduced overhead)
  const cleanup = useCleanupTracker('App');
  
  // FIXED: Add loading state to prevent white screen
  const [appReady, setAppReady] = useState(false);
  
  // Streamlined initialization
  useEffect(() => {
    const initializeAppAsync = async () => {
      try {
        // ✅ CRITICAL FIX: Initialize Supabase client after app mounts
        initializeSupabase();

        // Phase 6: Performance monitoring is now auto-initialized
        // via the unified system in OptimizedProviders
        
        // Initialize essential services
        pageVisibilityManager.initialize();
        
        // Track session start for PWA mobile detection
        if (!sessionStorage.getItem('session-start')) {
          sessionStorage.setItem('session-start', Date.now().toString());
        }
        
        // Initialize persistent cache asynchronously
        persistentCache.init().catch(err => {
          if (import.meta.env.DEV) {
            console.warn('Persistent cache failed:', err);
          }
        });
        
        // Initialize Supabase health monitoring
        supabaseHealthMonitor.startMonitoring();
        
        // CRITICAL: Initialize Supabase-IndexedDB bridge for mobile browser blocking fix
        try {
          const { supabaseIndexedDBBridge } = await import('@/utils/supabaseIndexedDBBridge');
          console.log('🔧 [App] Supabase-IndexedDB bridge initialized for mobile browser blocking protection');
          
          // Load IndexedDB debugger in development
          if (import.meta.env.DEV) {
            await import('@/utils/indexedDBDebugger');
            console.log('🔧 [App] IndexedDB debugger loaded for development');
          }
          
          // Load mobile browser protection test suite
          if (import.meta.env.DEV) {
            await import('@/utils/mobileBrowserProtectionTest');
            console.log('🔧 [App] Mobile browser protection test suite loaded');
          }
          
          // Add to global debugging interface
          if (import.meta.env.DEV) {
            (window as any).debugSupabaseBridge = {
              getMetrics: () => supabaseIndexedDBBridge.getMetrics(),
              testMobileBlocking: () => supabaseIndexedDBBridge.testMobileBlockingDetection(),
              clearCache: () => supabaseIndexedDBBridge.clearCache(),
              warmCache: (spaceId: string) => supabaseIndexedDBBridge.warmCache(spaceId),
              getCacheStatus: (spaceId: string) => supabaseIndexedDBBridge.getCacheStatus(spaceId),
              testAuthUser: () => supabaseIndexedDBBridge.getCurrentUser(),
              testPresenceUpdate: (userId: string, isOnline: boolean) => supabaseIndexedDBBridge.updateGlobalPresence(userId, isOnline)
            };
            console.log('🔧 [App] Enhanced debug interface available at window.debugSupabaseBridge');
          }
          
          // Warm cache for current space if available
          setTimeout(() => {
            const currentPath = window.location.pathname;
            const pathSegments = currentPath.split('/').filter(Boolean);
            if (pathSegments.length > 0 && pathSegments[0] !== 'spaces' && pathSegments[0] !== 'chat') {
              const spaceSubdomain = pathSegments[0];
                             // Silent cache warming for better mobile performance
               supabaseIndexedDBBridge.warmCacheForSpace(spaceSubdomain).catch(() => {
                 // Silent fail for cache warming
               });
              console.log(`🔧 [App] Cache warming initiated for space: ${spaceSubdomain}`);
            }
          }, 3000); // Warm cache after app is fully loaded
          
        } catch (bridgeError) {
          console.warn('🔧 [App] Supabase-IndexedDB bridge initialization failed:', bridgeError);
        }
        
        // Initialize cache warming with known data
        initializeCacheWarming();
        
        // PHASE 1: Initialize Enhanced Mobile Session Recovery
        try {
          phase1Recovery.initialize({
            debugMode: import.meta.env.DEV,
            enableHealthMonitorIntegration: true,
            enablePresenceIntegration: true,
            sessionValidationThreshold: 30000, // 30 seconds
            maxRecoveryAttempts: 3
          });
          console.log('📱 [App] Phase 1 mobile recovery initialized successfully');
          
          // Add global debugging interface
          if (import.meta.env.DEV) {
            (window as any).testPhase1 = {
              status: () => {
                console.log('📱 Phase 1 Status Check:');
                console.log('Available:', typeof (window as any).phase1Recovery !== 'undefined');
                console.log('Mobile Features Enabled:', typeof (window as any).mobileSessionManager !== 'undefined');
                console.log('Mobile Lifecycle Debug:', typeof (window as any).mobileLifecycleDebug !== 'undefined');
                console.log('Phase 1 Component:', typeof (window as any).phase1Component !== 'undefined');
                
                if ((window as any).phase1Recovery) {
                  console.log('Phase 1 Stats:', (window as any).phase1Recovery.getStats());
                  console.log('Phase 1 State:', (window as any).phase1Recovery.getState());
                }
              },
              enableForTesting: () => {
                (window as any).phase1Recovery?.overrideMobileDetection(true);
                (window as any).phase1Recovery?.forceEnable();
                console.log('📱 Phase 1 force enabled for testing');
              },
              triggerRecovery: () => {
                return (window as any).phase1Recovery?.triggerRecovery();
              },
              validateSession: () => {
                return (window as any).phase1Recovery?.validateSession();
              },
              simulateBackground: () => {
                (window as any).mobileLifecycleDebug?.forceBackground();
                setTimeout(() => {
                  (window as any).mobileLifecycleDebug?.forceReturn();
                }, 2000);
                console.log('📱 Simulated 2-second background session');
              }
            };
          }
          
        } catch (phase1Error) {
          console.warn('📱 [App] Phase 1 mobile recovery failed to initialize:', phase1Error);
        }
        
        // Phase 8A: Initialize AI/ML Systems
        try {
          const { phase8aIntegration } = await import('@/utils/phase8aIntegration');
          console.log('🤖 Phase 8A AI/ML Systems initialized');
        } catch (error) {
          console.warn('Phase 8A initialization failed:', error);
        }
        
        // Phase 8B: Initialize Predictive User Experience
        try {
          const { phase8bIntegration } = await import('@/utils/phase8bIntegration');
          await phase8bIntegration.initialize();
          console.log('🎯 Phase 8B Predictive UX Systems initialized');
        } catch (error) {
          console.warn('Phase 8B initialization failed:', error);
        }
        
        // Phase 8C: Initialize Automated Optimization
        try {
          const { phase8cIntegration } = await import('@/utils/phase8cIntegration');
          console.log('🚀 Phase 8C Automated Optimization Systems initialized');
        } catch (error) {
          console.warn('Phase 8C initialization failed:', error);
        }
        
        setAppReady(true);
        
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('App initialization error:', error);
        }
        setAppReady(true);
      }
    };
    
    initializeAppAsync();
    
    return () => {
      if (import.meta.env.DEV) {
        try {
          // Phase 6: Cleanup handled by unified system
          persistentCache.cleanup();
          
          // Phase 8A: Shutdown AI/ML systems
          if ((window as any).phase8?.shutdown) {
            (window as any).phase8.shutdown();
          }
          
          // Phase 8B: Shutdown Predictive UX systems
          if ((window as any).phase8b?.cleanup) {
            (window as any).phase8b.cleanup();
          }
          
          // Phase 8C: Shutdown Automated Optimization systems
          if ((window as any).phase8c?.cleanup) {
            (window as any).phase8c.cleanup();
          }
        } catch (error) {
          console.warn('Cleanup error:', error);
        }
      }
    };
  }, []);

  // Simplified debug logging (dev only)
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[App] Mounted at', new Date().toLocaleTimeString());
      return () => {
        console.log('[App] Unmounted at', new Date().toLocaleTimeString());
        try {
          advancedCache.destroy();
          seoManager.destroy();
        } catch (error) {
          console.warn('Cleanup error:', error);
        }
      };
    }
  }, []);
  
  // FIXED: Show loading screen while app initializes
  if (!appReady) {
    return <AppLoadingScreen />;
  }

  // Use OptimizedProviderTree with enhanced error handling for module loading
  return (
    <ErrorBoundary
      FallbackComponent={({ error, resetErrorBoundary }: any) => {
        // Check if this is a module loading error
        const isModuleError = (
          error.message?.includes('Importing a module script failed') ||
          error.message?.includes('Loading chunk') ||
          error.name === 'ChunkLoadError'
        );

        if (isModuleError) {
          return <ModuleErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />;
        }

        // Use regular error fallback for other errors
        return <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />;
      }}
      onError={(error, errorInfo) => {
        console.error('🚨 [App] Error Boundary caught:', error, errorInfo);
        
        // Special handling for module errors
        if (error.message?.includes('Importing a module script failed')) {
          console.error('🚨 [App] Module import failure detected - this is likely an HMR issue');
        }
      }}
      onReset={() => {
        console.log('🔄 [App] Error boundary reset');
        // For module errors, try a gentler reset first
        if (import.meta.env?.DEV) {
          setTimeout(() => {
            window.location.reload();
          }, 100);
        } else {
          window.location.reload();
        }
      }}
    >
      <OptimizedProviderTree>
        <PWAInitializer />
        <RouteLogger />
        <UnifiedPresenceInitializer />
        <Phase1MobileRecovery />
        <AppRoutes />

        <Toaster />
        <AuthModalRouter />
        
        {/* Phase 4A: Floating Error Dashboard */}
        <FloatingErrorDashboard />
      </OptimizedProviderTree>
    </ErrorBoundary>
  );
}
