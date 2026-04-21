import { log } from '@/utils/logger';
import { Suspense, useEffect } from "react";
import { Toaster } from '@/components/ui/toaster';

// Core components and hooks
import { AppLoadingScreen, UnifiedPresenceInitializer } from '@/components/app/AppComponents';
import { useAppInitialization } from '@/hooks/useAppInitialization';
import { useAppLifecycle } from '@/hooks/useAppLifecycle';
import { useSessionLongevity } from '@/hooks/useSessionLongevity';
import { useAppStore } from '@/stores/useAppStore';
import { useToast } from '@/hooks/use-toast';

// Services and providers
import AppErrorBoundary from '@/components/errors/AppErrorBoundary';
import ApplicationRouter from '@/components/app/ApplicationRouter';
import { OptimizedProviderTree } from '@/providers/OptimizedProviders';

import { AuthModalRouter } from '@/features/auth/components/modals';

// CRITICAL: Load Supabase error protection FIRST
import { supabaseLoadFailedBlocker } from '@/utils/supabaseLoadFailedBlocker';

// Service Worker cleanup
import '@/utils/serviceWorkerCleanup';

// Phase 3.2: Performance optimizations
import { initCriticalCSS } from '@/utils/criticalCSS';
import { initFontOptimization } from '@/utils/fontOptimizer';
import { performanceMonitor } from '@/utils/performanceMonitor';

// Core services
import { preventScrollRestoration } from '@/utils/scrollPositionManager';

export default function App() {
  const { appReady } = useAppInitialization();
  const isOnline = useAppStore((state) => state.isOnline);
  const { toast } = useToast();

  // Root Lifecycle & Session management
  useAppLifecycle();
  useSessionLongevity();

  // Prevent browser scroll restoration to avoid mobile scroll issues
  useEffect(() => {
    preventScrollRestoration();
  }, []);

  // Handle network status changes
  useEffect(() => {
    if (!isOnline) {
      toast({
        variant: 'destructive',
        title: "🔌 You're offline",
        description: "Changes will sync when you're back.",
      });
    }
  }, [isOnline, toast]);

  // Phase 3.2: Initialize performance optimizations
  useEffect(() => {
    initCriticalCSS({
      enabled: import.meta.env.PROD,
      maxSize: 14000,
    });

    initFontOptimization({
      enabled: import.meta.env.PROD,
      displayStrategy: 'swap',
      useSwap: true,
    });

    performanceMonitor.init();

    if (import.meta.env.DEV) {
      setTimeout(() => {
        const metrics = performanceMonitor.getMetrics();
        const score = performanceMonitor.getPerformanceScore();
        console.log('🚀 Performance Metrics:', metrics);
        console.log('📊 Performance Score:', score.toFixed(1) + '/100');
      }, 3000);
    }
  }, []);

  // Listen for manual reload requests
  useEffect(() => {
    const handleManualReloadNeeded = (event: Event) => {
      const detail = (event as CustomEvent<{ variant?: 'default' | 'destructive'; title: string; description: string }>).detail;
      toast({
        variant: detail.variant || 'destructive',
        title: detail.title,
        description: detail.description,
      });
    };

    window.addEventListener('supabase-manual-reload-needed', handleManualReloadNeeded as EventListener);
    return () => window.removeEventListener('supabase-manual-reload-needed', handleManualReloadNeeded as EventListener);
  }, [toast]);

  useEffect(() => {
    // CRITICAL: Initialize Supabase error protection
    void supabaseLoadFailedBlocker;
    log.debug('App', '🛡️ [App] Supabase Load Failed Blocker loaded and active');
  }, []);

  // Ensure app initialization is complete
  if (!appReady) {
    return null;
  }

  return (
    <AppErrorBoundary>
      <OptimizedProviderTree>
        <Suspense fallback={<AppLoadingScreen />}>
          <ApplicationRouter />
        </Suspense>
        <UnifiedPresenceInitializer />
        <AuthModalRouter />
        <Toaster />
      </OptimizedProviderTree>
    </AppErrorBoundary>
  );
}
