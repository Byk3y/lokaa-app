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
import { phase1Recovery } from '@/utils/phase1MobileRecovery';
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
              
              // Skip cache warming with subdomain - it needs space ID (UUID format)
              // This prevents 400 Bad Request errors that interfere with member counts
              console.log(`🔧 [App] Skipping cache warming for subdomain: ${spaceSubdomain} (needs space ID)`);
            }
          }, 3000); // Warm cache after app is fully loaded
          
        } catch (bridgeError) {
          console.warn('🔧 [App] Supabase-IndexedDB bridge initialization failed:', bridgeError);
        }
        
        // Initialize cache warming with known data
        initializeCacheWarming();
        
        // Initialize Event-Driven Space Coordinator (Phase 1)
        try {
          const { spaceEventCoordinator } = await import('@/utils/spaceEventCoordinator');
          console.log('🎯 [App] Space Event Coordinator initialized');
          
          // Add to global debugging interface
          if (import.meta.env.DEV) {
            (window as any).spaceEventCoordinator = spaceEventCoordinator;
            (window as any).debugSpaceEvents = {
              getState: () => spaceEventCoordinator.getState(),
              getDebugInfo: () => spaceEventCoordinator.getDebugInfo(),
              dispatchTestEvent: (type = 'space:data-updated') => {
                return spaceEventCoordinator.dispatchEvent(type, {
                  spaceId: 'debug-test-space',
                  subdomain: 'debug-test',
                  source: 'system',
                  timestamp: Date.now()
                });
              },
              switchToTestSpace: () => {
                return spaceEventCoordinator.switchSpace('test-space-id', 'test-space', 'user-action');
              }
            };
            console.log('🎯 [App] Event coordinator debug interface available at window.debugSpaceEvents');
          }
          
        } catch (coordinatorError) {
          console.warn('🎯 [App] Space Event Coordinator initialization failed:', coordinatorError);
        }
        
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

        // Phase 8 AI/ML systems removed for maintainability
        
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

          // Phase 8 cleanup removed - systems no longer present
        } catch (error) {
          console.warn('Cleanup error:', error);
        }
      }
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
