import { Suspense } from "react";

// Core components and hooks
import { AppLoadingScreen, UnifiedPresenceInitializer } from '@/components/app/AppComponents';
import { useAppInitialization } from '@/hooks/useAppInitialization';
import { useGlobalPerformanceDashboard } from '@/hooks/useGlobalPerformanceDashboard';

// Services and providers
import AppErrorBoundary from '@/components/errors/AppErrorBoundary';
import ApplicationRouter from '@/components/app/ApplicationRouter';
import { OptimizedProviderTree } from '@/providers/OptimizedProviders';

// PWA and core components
import PWAInitializer from '@/components/pwa/PWAInitializer';
import WhiteScreenFix from "@/components/errors/WhiteScreenFix";
import { AuthModalRouter } from '@/features/auth/components/modals';

// Development-only components
import NetworkStatusIndicator from '@/components/errors/NetworkStatusIndicator';
import Phase1MobileRecovery from '@/components/mobile/Phase1MobileRecovery';
import { FloatingErrorDashboard } from '@/components/debug/ErrorAnalyticsDashboard';
import { AvatarPerformanceDashboard } from '@/components/debug/AvatarPerformanceDashboard';
import { GlobalPerformanceDashboard } from '@/components/debug/GlobalPerformanceDashboard';

export default function App() {
  const { appReady } = useAppInitialization();
  const { isVisible: showGlobalDashboard, isDevelopment } = useGlobalPerformanceDashboard();

  if (!appReady) {
    return <AppLoadingScreen />;
  }

  return (
    <AppErrorBoundary>
      <OptimizedProviderTree>
        <Suspense fallback={<AppLoadingScreen />}>
          <ApplicationRouter />
        </Suspense>
        <UnifiedPresenceInitializer />
        <PWAInitializer />
        
        {/* Development-only components */}
        {isDevelopment && <NetworkStatusIndicator />}
        {isDevelopment && <Phase1MobileRecovery />}
        {isDevelopment && <FloatingErrorDashboard />}
        {isDevelopment && <AvatarPerformanceDashboard />}
        
        {/* Global Performance Dashboard - Unified System Monitoring */}
        {isDevelopment && showGlobalDashboard && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
            <div className="fixed inset-4 bg-white rounded-lg shadow-xl overflow-auto">
              <GlobalPerformanceDashboard />
            </div>
          </div>
        )}
        
        <WhiteScreenFix />
        <AuthModalRouter />
      </OptimizedProviderTree>
    </AppErrorBoundary>
  );
}
