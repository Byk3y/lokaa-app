import { Suspense } from "react";
import { HelmetProvider } from "react-helmet-async";
import React from "react";

// Import extracted components and hooks
import { AppLoadingScreen, UnifiedPresenceInitializer } from '@/components/app/AppComponents';
import { useAppInitialization } from '@/hooks/useAppInitialization';

// Import extracted services
import AppErrorBoundary from '@/components/errors/AppErrorBoundary';
import ApplicationRouter from '@/components/app/ApplicationRouter';

// Core providers
import { OptimizedProviderTree } from '@/providers/OptimizedProviders';

// PWA and development components
import PWAInitializer from '@/components/pwa/PWAInitializer';
import NetworkStatusIndicator from '@/components/errors/NetworkStatusIndicator';
import Phase1MobileRecovery from '@/components/mobile/Phase1MobileRecovery';
import { FloatingErrorDashboard } from '@/components/debug/ErrorAnalyticsDashboard';

// Modal and fix components
import { AuthModalRouter } from '@/features/auth/components/modals';
import WhiteScreenFix from "@/components/errors/WhiteScreenFix";

export default function App() {
  const { appReady } = useAppInitialization();

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
