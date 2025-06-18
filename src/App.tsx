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
// CommunityLayout removed
import { EnhancedErrorBoundary } from '@/components/errors/EnhancedErrorBoundary';
import { errorHandlingSystem } from '@/utils/errorHandlingSystem';

// Import the new unified AppErrorBoundary
import AppErrorBoundary from '@/components/errors/AppErrorBoundary';

import WhiteScreenFix from "@/components/errors/WhiteScreenFix"; // Import the WhiteScreenFix component
import React from "react";
import { Loader2 } from "lucide-react";
import { UserProfileProvider } from '@/contexts/UserProfileContext';

import { GlobalPresenceProvider } from './providers/GlobalPresenceProvider';
import { useUnifiedPresence } from '@/hooks/useUnifiedPresence';

// Import extracted ApplicationRouter
import ApplicationRouter from '@/components/app/ApplicationRouter';

// Import modern modal system
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

// Import the new centralized initialization service
import { appInitializationService } from '@/services/AppInitializationService';

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

// PHASE 1: Enhanced Mobile Session Recovery
import '@/utils/globalErrorInterceptor'; // Initialize 401 error interception
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

// Global debugging interfaces for development preserved for other tools
import '@/utils/mobileConsoleValidation';
// ✅ SIMPLIFIED: Phase 8 AI/ML systems removed for maintainability
// The app now focuses on core functionality without complex AI overlays

export default function App() {
  // FIXED: Simplified cleanup tracking (reduced overhead)
  const cleanup = useCleanupTracker('App');
  
  // FIXED: Add loading state to prevent white screen
  const [appReady, setAppReady] = useState(false);
  
  // Streamlined initialization using centralized service
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const result = await appInitializationService.initialize({
          isDevelopment: import.meta.env?.DEV,
          enableDebugInterfaces: import.meta.env?.DEV,
          enableMobileRecovery: true
        });

        if (!result.success) {
          console.error('🚨 [App] Initialization failed with errors:', result.errors);
        }

        if (result.warnings.length > 0) {
          console.warn('⚠️ [App] Initialization completed with warnings:', result.warnings);
        }

        console.log('✅ [App] Application ready');
        setAppReady(true);
        
      } catch (error) {
        console.error('❌ [App] Initialization error:', error);
        setAppReady(true); // Still allow app to load even if initialization fails
      }
    };
    
    initializeApp();
    
    return () => {
      // Cleanup handled by initialization service
      appInitializationService.cleanup();
    };
  }, []);

  // Loading screen until app is ready
  if (!appReady) {
    return <AppLoadingScreen />;
  }

  return (
    <AppErrorBoundary>
      <HelmetProvider>
        <OptimizedProviderTree>
          <Suspense fallback={<AppLoadingScreen />}>
            <ApplicationRouter />
          </Suspense>
          <UnifiedPresenceInitializer />
          <PWAInitializer />
          {import.meta.env.DEV && <NetworkStatusIndicator />}
          {import.meta.env.DEV && <Phase1MobileRecovery />}
          {import.meta.env.DEV && <FloatingErrorDashboard />}
          <WhiteScreenFix />
          <AuthModalRouter />
        </OptimizedProviderTree>
      </HelmetProvider>
    </AppErrorBoundary>
  );
}
