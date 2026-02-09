import { log } from '@/utils/logger';
// App Initialization Service - extracted from App.tsx
// Handles all app initialization logic in a centralized service

import { supabase } from '@/integrations/supabase/client';
import { devLogger } from '@/utils/developmentLogger';
// DISABLED: PageVisibilityManager causes reload conflicts with comprehensive fix
// import { pageVisibilityManager } from '@/utils/pageVisibilityManager';
// persistentCache removed - using simplified course cache
// Cache warming removed - using simpler cache system
// DISABLED: import { phase1Recovery } from '@/utils/phase1MobileRecovery';
import { initializePostHog } from '@/integrations/posthog';
import { useAppStore } from '@/stores/useAppStore';
import { realtimeManager } from '@/services/RealtimeManager';
import { useSpaceStore } from '@/stores/useSpaceStore';

export interface AppInitializationOptions {
  isDevelopment?: boolean;
  enableDebugInterfaces?: boolean;
  enableMobileRecovery?: boolean;
}

export interface AppInitializationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  debugInterfaces: Record<string, any>;
}

export class AppInitializationService {
  private static instance: AppInitializationService;
  private isInitialized = false;
  private debugInterfaces: Record<string, any> = {};

  static getInstance(): AppInitializationService {
    if (!AppInitializationService.instance) {
      AppInitializationService.instance = new AppInitializationService();
    }
    return AppInitializationService.instance;
  }

  async initialize(options: AppInitializationOptions = {}): Promise<AppInitializationResult> {
    if (this.isInitialized) {
      devLogger.warn('AppInit', 'Service already initialized');
      return {
        success: true,
        errors: [],
        warnings: ['Service already initialized'],
        debugInterfaces: this.debugInterfaces
      };
    }

    const result: AppInitializationResult = {
      success: true,
      errors: [],
      warnings: [],
      debugInterfaces: {}
    };

    const isDevelopment = import.meta.env.DEV;
    const {
      enableDebugInterfaces = isDevelopment,
      enableMobileRecovery = true
    } = options;

    try {
      devLogger.log('AppInit', 'Starting app initialization...');

      // Core Supabase initialization
      await this.initializeSupabase(result);

      // Essential services initialization
      await this.initializeEssentialServices(result);

      // Analytics initialization (PostHog)
      await this.initializeAnalytics(result);

      // Cache systems initialization
      await this.initializeCacheSystems(result);

      // Supabase bridge - removing V2 legacy in favor of clean stores
      // await this.initializeSupabaseBridge(result, isDevelopment);

      // New reactive systems initialization
      await this.initializeUnifiedSystems(result, enableDebugInterfaces);

      // Mobile recovery systems
      if (enableMobileRecovery) {
        // DISABLED: Complex mobile recovery conflicts with simple reload prevention
        // await this.initializeMobileRecovery(result, enableDebugInterfaces);
        devLogger.log('AppInit', 'Mobile recovery disabled - using simple reload prevention system');
      }

      // Development debug interfaces
      if (enableDebugInterfaces) {
        await this.setupDebugInterfaces(result);
      }

      this.isInitialized = true;
      devLogger.log('AppInit', 'App initialization completed successfully');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
      result.errors.push(errorMessage);
      result.success = false;
      if (import.meta.env.DEV) {
        log.error('Service', '❌ [AppInitialization] Initialization failed:', error as Error);
      }
    }

    result.debugInterfaces = this.debugInterfaces;
    return result;
  }

  private async initializeSupabase(result: AppInitializationResult): Promise<void> {
    try {
      devLogger.log('AppInit', 'Initializing Supabase...');
      // Check if Supabase client is available (it's already instantiated)
      if (!supabase) {
        throw new Error('Supabase client is not available');
      }
      devLogger.log('AppInit', 'Supabase client verified');
    } catch (error) {
      const message = 'Supabase initialization failed';
      result.errors.push(message);
      if (import.meta.env.DEV) {
        log.error('Service', '❌ [AppInitialization]', message, error as Error);
      }
    }
  }

  private async initializeEssentialServices(result: AppInitializationResult): Promise<void> {
    try {
      devLogger.log('AppInit', 'Initializing essential services...');

      // DISABLED: Health monitor causes page reloads - mobile protection handled by comprehensive fix in index.html
      // supabaseHealthMonitor.startMonitoring();
      devLogger.log('AppInit', 'Health monitor disabled - mobile protection handled by comprehensive fix');

    } catch (error) {
      const message = 'Essential services initialization failed';
      result.warnings.push(message);
      devLogger.warn('AppInit', message, error);
    }
  }

  private async initializeAnalytics(result: AppInitializationResult): Promise<void> {
    try {
      devLogger.log('AppInit', 'Initializing analytics (PostHog)...');

      // Initialize PostHog
      initializePostHog();

      devLogger.log('AppInit', 'Analytics initialization completed');
    } catch (error) {
      const message = 'Analytics initialization failed';
      result.warnings.push(message);
      devLogger.warn('AppInit', message, error);
    }
  }

  private async initializeCacheSystems(result: AppInitializationResult): Promise<void> {
    try {
      devLogger.log('AppInit', 'Initializing cache systems...');

      // persistentCache.init() removed - using simplified courseCache.ts

      // Cache warming removed - using simplified courseCache.ts

    } catch (error) {
      const message = 'Cache systems initialization failed';
      result.warnings.push(message);
      devLogger.warn('AppInit', message, error);
    }
  }

  private async initializeUnifiedSystems(result: AppInitializationResult, enableDebugInterfaces: boolean): Promise<void> {
    try {
      devLogger.log('AppInit', 'Initializing Unified Foundation Systems...');

      if (enableDebugInterfaces) {
        this.debugInterfaces.appStore = useAppStore.getState();
        this.debugInterfaces.realtimeManager = realtimeManager;
        this.debugInterfaces.spaceStore = useSpaceStore.getState();

        this.debugInterfaces.debugUnified = {
          getAppState: () => useAppStore.getState(),
          getSpaceState: () => useSpaceStore.getState(),
          getRealtimeStats: () => realtimeManager, // Can add getStats if needed
        };
      }

      devLogger.log('AppInit', 'Unified Foundation Systems initialized');
    } catch (error) {
      const message = 'Unified systems initialization failed';
      result.warnings.push(message);
      devLogger.warn('AppInit', message, error);
    }
  }

  private async setupDebugInterfaces(result: AppInitializationResult): Promise<void> {
    try {
      devLogger.log('AppInit', 'Setting up debug interfaces...');

      if (typeof window !== 'undefined') {
        Object.entries(this.debugInterfaces).forEach(([key, value]) => {
          (window as any)[key] = value;
        });

        devLogger.log('AppInit', 'Debug interfaces available on window:', Object.keys(this.debugInterfaces));
      }

    } catch (error) {
      const message = 'Debug interfaces setup failed';
      result.warnings.push(message);
      devLogger.warn('AppInit', message, error);
    }
  }

  cleanup(): void {
    try {
      devLogger.log('AppInit', 'Cleaning up...');
      // persistentCache.cleanup() removed - using simplified cache system
      this.debugInterfaces = {};
    } catch (error) {
      devLogger.warn('AppInit', 'Cleanup error:', error);
    }
  }

  getDebugInterfaces(): Record<string, any> {
    return { ...this.debugInterfaces };
  }

  isServiceInitialized(): boolean {
    return this.isInitialized;
  }
}

export const appInitializationService = AppInitializationService.getInstance(); 