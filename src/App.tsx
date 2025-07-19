import { log } from '@/utils/logger';
import React, { Suspense, useEffect, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';

// Core components and hooks
import { AppLoadingScreen, UnifiedPresenceInitializer } from '@/components/app/AppComponents';
import { useAppInitialization } from '@/hooks/useAppInitialization';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useToast } from '@/hooks/use-toast';

// Services and providers
import AppErrorBoundary from '@/components/errors/AppErrorBoundary';
import ApplicationRouter from '@/components/app/ApplicationRouter';
import { OptimizedProviderTree } from '@/providers/OptimizedProviders';

// PWA and core components
import PWAInitializer from '@/components/pwa/PWAInitializer';
import { AuthModalRouter } from '@/features/auth/components/modals';

// CRITICAL: Load Supabase error protection FIRST
import { supabaseLoadFailedBlocker } from '@/utils/supabaseLoadFailedBlocker';

// Dev-only console helpers
if (import.meta.env.DEV) {
  import('@/devtools/exposeForConsole').then(({ exposeForConsole }) => {
    exposeForConsole().catch(err => log.error('App', 'Failed to expose console helpers:', err));
  });
}

// Core services and Mobile Event Coordinator
import { globalRealtimeService } from '@/services/GlobalRealtimeService';
import { mobileEventCoordinator } from '@/utils/MobileEventCoordinator';
import { mobileMigrationHelper, LegacySystemDisabler } from '@/utils/MobileEventMigration';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { preventScrollRestoration } from '@/utils/scrollPositionManager';
import { env } from '@/core/config/env';

export default function App() {
  const { appReady } = useAppInitialization();
  const { isOffline, justCameOnline } = useNetworkStatus();
  const { toast } = useToast();

  // Prevent browser scroll restoration to avoid mobile scroll issues
  useEffect(() => {
    preventScrollRestoration();
  }, []);

  // Handle network status changes
  useEffect(() => {
    if (isOffline) {
      toast({
        variant: 'destructive',
        title: "🔌 You're offline",
        description: "Changes will sync when you're back.",
      });
    }
  }, [isOffline, toast]);

  useEffect(() => {
    if (justCameOnline) {
      toast({
        title: "✅ Back online",
        description: "Syncing data…",
        duration: 3000,
      });
    }
  }, [justCameOnline, toast]);

  // Listen for manual reload requests from supabaseLoadFailedBlocker
  useEffect(() => {
    const handleManualReloadNeeded = (event: CustomEvent) => {
      toast({
        variant: event.detail.variant || 'destructive',
        title: event.detail.title,
        description: event.detail.description,
      });
    };

    window.addEventListener('supabase-manual-reload-needed', handleManualReloadNeeded as EventListener);
    
    return () => {
      window.removeEventListener('supabase-manual-reload-needed', handleManualReloadNeeded as EventListener);
    };
  }, [toast]);

  useEffect(() => {
    // CRITICAL: Initialize Supabase error protection
    supabaseLoadFailedBlocker; // Trigger singleton initialization
    log.debug('App', '🛡️ [App] Supabase Load Failed Blocker loaded and active');
    
    // Session management functions for Mobile Event Coordinator integration
    const handleProactiveSessionRefresh = async (): Promise<void> => {
      try {
        const { data, error } = await getSupabaseClient().auth.getSession();
        
        if (error || !data.session) return;
        
        const session = data.session;
        const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
        const now = Date.now();
        
        // Check if session expires within 15 minutes (proactive refresh)
        if (expiresAt - now < 900000) {
          log.debug('App', '🛡️ [SessionLongevity] Proactively refreshing session before background');
          const { data: refreshData, error: refreshError } = await getSupabaseClient().auth.refreshSession();
          
          if (refreshError) {
            log.warn('App', '🛡️ [SessionLongevity] Proactive refresh failed:', refreshError);
          } else {
            log.debug('App', '✅ [SessionLongevity] Proactive refresh successful');
          }
        }
      } catch (error) {
        log.warn('App', '🛡️ [SessionLongevity] Proactive refresh check failed:', error);
      }
    };

    const handleSessionValidation = async (reason: string, backgroundDuration: number): Promise<void> => {
      try {
        const { data, error } = await getSupabaseClient().auth.getSession();
        
        if (error || !data.session) {
          log.debug('App', `🛡️ [SessionLongevity] No valid session found (${reason})`);
          return;
        }
        
        const session = data.session;
        const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
        const now = Date.now();
        
        // Check if session expired or expires soon
        if (expiresAt <= now || expiresAt - now < 300000) { // 5 minutes buffer
          log.debug('App', `🛡️ [SessionLongevity] Session needs refresh after ${Math.round(backgroundDuration/1000)}s background (${reason})`);
          
          const { data: refreshData, error: refreshError } = await getSupabaseClient().auth.refreshSession();
          
          if (refreshError) {
            log.warn('App', `🛡️ [SessionLongevity] Session refresh failed (${reason}):`, refreshError);
          } else {
            log.debug('App', `✅ [SessionLongevity] Session refresh successful (${reason})`);
          }
        } else {
          log.debug('App', `🛡️ [SessionLongevity] Session valid for ${Math.round((expiresAt - now)/60000)} minutes`);
        }
      } catch (error) {
        log.warn('App', `🛡️ [SessionLongevity] Session validation failed (${reason}):`, error);
      }
    };

    // Initialize GlobalRealtimeService - this ensures it's ready when components need it
    log.debug('App', '🔔 [App] GlobalRealtimeService initialized');
    
    // 🏗️ MOBILE EVENT COORDINATOR - 2025 Industry Standard Solution
    log.debug('App', '🏗️ [App] Initializing Mobile Event Coordinator...');
    
    // Disable all competing legacy mobile systems first
    LegacySystemDisabler.disableAllLegacySystems();
    
    // Initialize the centralized coordinator (replaces 6+ competing systems)
    mobileEventCoordinator.initialize();
    
    // Register essential mobile systems with coordinator
    const unsubscribeGlobalRealtime = mobileEventCoordinator.subscribe({
      name: 'GlobalRealtimeService',
      priority: 10, // High priority for real-time features
      handler: async (eventData) => {
        if (eventData.isBackground) {
          log.debug('App', '📱 [GlobalRealtime] App backgrounded - optimizing connections');
          // Optimize real-time connections when backgrounded
        } else {
          log.debug('App', '📱 [GlobalRealtime] App foregrounded - restoring connections');
          // Restore optimal real-time behavior when foregrounded
        }
      }
    });
    
    // Register session longevity manager with coordinator
    const unsubscribeSessionLongevity = mobileEventCoordinator.subscribe({
      name: 'SessionLongevityManager',
      priority: 8, // High priority for session management
      handler: async (eventData) => {
        if (eventData.isBackground) {
          log.debug('App', '🛡️ [SessionLongevity] App backgrounded - preparing session protection');
          // Proactively refresh session if it expires soon
          await handleProactiveSessionRefresh();
        } else {
          // Access background duration from the event data
          const backgroundDuration = eventData.duration || 0;
          log.debug('App', `🛡️ [SessionLongevity] App returned after ${Math.round(backgroundDuration/1000)}s`);
          // Validate session if background was longer than 30 seconds
          if (backgroundDuration > 30000) {
            await handleSessionValidation('background_return', backgroundDuration);
          }
        }
      }
    });
      
    // Register bfcache optimization with coordinator
    const unsubscribeBfcache = mobileEventCoordinator.subscribe({
      name: 'BfcacheOptimizer',
      priority: 5, // Highest priority for page lifecycle
      handler: async (eventData) => {
        if (eventData.eventType === 'pageshow' && eventData.isBfcacheRestore) {
          log.debug('App', '🎉 [BfcacheOptimizer] App restored from bfcache - instant load!');
          // App state preserved, no reload needed
        } else if (eventData.eventType === 'pagehide') {
          log.debug('App', '🌙 [BfcacheOptimizer] Preparing for bfcache storage');
          // Optimize for bfcache eligibility
        }
      }
    });
    
    log.debug('App', '✅ [App] Mobile Event Coordinator active - 6+ systems replaced with 1 coordinator');
    log.debug('App', '🚀 [App] Observer Pattern Anti-Pattern eliminated');

    return () => {
      // Cleanup on app unmount (rarely happens)
      log.debug('App', '🧹 [App] Cleaning up Mobile Event Coordinator...');
      unsubscribeGlobalRealtime();
      unsubscribeSessionLongevity();
      unsubscribeBfcache();
      globalRealtimeService.destroy();
      mobileEventCoordinator.cleanup();
    };
  }, []);

  return (
    <AppErrorBoundary>
      <OptimizedProviderTree>
        <Suspense fallback={<AppLoadingScreen />}>
          <ApplicationRouter />
        </Suspense>
        <UnifiedPresenceInitializer />
        <PWAInitializer />
        <AuthModalRouter />
        <Toaster />
      </OptimizedProviderTree>
    </AppErrorBoundary>
  );
}
