// App Initialization Service - extracted from App.tsx
// Handles all app initialization logic in a centralized service

import { initializeSupabase } from '@/integrations/supabase/client';
import { pageVisibilityManager } from '@/utils/pageVisibilityManager';
import { persistentCache } from '@/utils/persistentCache';
import { supabaseHealthMonitor } from '@/utils/supabaseHealthCheck';
import { initializeCacheWarming } from '@/utils/cacheWarming';
import { phase1Recovery } from '@/utils/phase1MobileRecovery';

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
      console.warn('🔧 [AppInitialization] Service already initialized');
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

    const {
      isDevelopment = import.meta.env?.DEV,
      enableDebugInterfaces = isDevelopment,
      enableMobileRecovery = true
    } = options;

    try {
      console.log('🚀 [AppInitialization] Starting app initialization...');

      // Core Supabase initialization
      await this.initializeSupabase(result);

      // Essential services initialization
      await this.initializeEssentialServices(result);

      // Cache systems initialization
      await this.initializeCacheSystems(result);

      // Supabase bridge and mobile protection
      await this.initializeSupabaseBridge(result, isDevelopment);

      // Space coordinator initialization
      await this.initializeSpaceCoordinator(result, enableDebugInterfaces);

      // Mobile recovery systems
      if (enableMobileRecovery) {
        await this.initializeMobileRecovery(result, enableDebugInterfaces);
      }

      // Development debug interfaces
      if (enableDebugInterfaces) {
        await this.setupDebugInterfaces(result);
      }

      this.isInitialized = true;
      console.log('✅ [AppInitialization] App initialization completed successfully');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
      result.errors.push(errorMessage);
      result.success = false;
      console.error('❌ [AppInitialization] Initialization failed:', error);
    }

    result.debugInterfaces = this.debugInterfaces;
    return result;
  }

  private async initializeSupabase(result: AppInitializationResult): Promise<void> {
    try {
      console.log('🔧 [AppInitialization] Initializing Supabase...');
      initializeSupabase();
    } catch (error) {
      const message = 'Supabase initialization failed';
      result.errors.push(message);
      console.error('❌ [AppInitialization]', message, error);
    }
  }

  private async initializeEssentialServices(result: AppInitializationResult): Promise<void> {
    try {
      console.log('🔧 [AppInitialization] Initializing essential services...');
      
      pageVisibilityManager.initialize();
      
      if (!sessionStorage.getItem('session-start')) {
        sessionStorage.setItem('session-start', Date.now().toString());
      }
      
      supabaseHealthMonitor.startMonitoring();
      
    } catch (error) {
      const message = 'Essential services initialization failed';
      result.warnings.push(message);
      console.warn('⚠️ [AppInitialization]', message, error);
    }
  }

  private async initializeCacheSystems(result: AppInitializationResult): Promise<void> {
    try {
      console.log('🔧 [AppInitialization] Initializing cache systems...');
      
      persistentCache.init().catch(err => {
        console.warn('⚠️ [AppInitialization] Persistent cache failed:', err);
        result.warnings.push('Persistent cache initialization failed');
      });
      
      initializeCacheWarming();
      
    } catch (error) {
      const message = 'Cache systems initialization failed';
      result.warnings.push(message);
      console.warn('⚠️ [AppInitialization]', message, error);
    }
  }

  private async initializeSupabaseBridge(result: AppInitializationResult, isDevelopment: boolean): Promise<void> {
    try {
      console.log('🔧 [AppInitialization] Initializing Supabase-IndexedDB bridge...');
      
      const { supabaseIndexedDBBridge } = await import('@/utils/supabaseIndexedDBBridge');
      console.log('🔧 [AppInitialization] Supabase-IndexedDB bridge initialized for mobile browser blocking protection');
      
      if (isDevelopment) {
        await import('@/utils/indexedDBDebugger');
        console.log('🔧 [AppInitialization] IndexedDB debugger loaded for development');
      }
      
      if (isDevelopment) {
        await import('@/utils/mobileBrowserProtectionTest');
        console.log('🔧 [AppInitialization] Mobile browser protection test suite loaded');
      }
      
      if (isDevelopment) {
        this.debugInterfaces.debugSupabaseBridge = {
          getMetrics: () => supabaseIndexedDBBridge.getMetrics(),
          testMobileBlocking: () => supabaseIndexedDBBridge.testMobileBlockingDetection(),
          clearCache: () => supabaseIndexedDBBridge.clearCache(),
          warmCache: (spaceId: string) => supabaseIndexedDBBridge.warmCache(spaceId),
          getCacheStatus: (spaceId: string) => supabaseIndexedDBBridge.getCacheStatus(spaceId),
          testAuthUser: () => supabaseIndexedDBBridge.getCurrentUser(),
          testPresenceUpdate: (userId: string, isOnline: boolean) => supabaseIndexedDBBridge.updateGlobalPresence(userId, isOnline)
        };
      }
      
      setTimeout(() => {
        const currentPath = window.location.pathname;
        const pathSegments = currentPath.split('/').filter(Boolean);
        if (pathSegments.length > 0 && pathSegments[0] !== 'spaces' && pathSegments[0] !== 'chat') {
          const spaceSubdomain = pathSegments[0];
          console.log(`🔧 [AppInitialization] Skipping cache warming for subdomain: ${spaceSubdomain} (needs space ID)`);
        }
      }, 3000);
      
    } catch (error) {
      const message = 'Supabase-IndexedDB bridge initialization failed';
      result.warnings.push(message);
      console.warn('⚠️ [AppInitialization]', message, error);
    }
  }

  private async initializeSpaceCoordinator(result: AppInitializationResult, enableDebugInterfaces: boolean): Promise<void> {
    try {
      console.log('🎯 [AppInitialization] Initializing Event-Driven Space Coordinator...');
      
      const { spaceEventCoordinator } = await import('@/utils/spaceEventCoordinator');
      console.log('🎯 [AppInitialization] Space Event Coordinator initialized');
      
      if (enableDebugInterfaces) {
        this.debugInterfaces.spaceEventCoordinator = spaceEventCoordinator;
        this.debugInterfaces.debugSpaceEvents = {
          getState: () => spaceEventCoordinator.getState(),
          getDebugInfo: () => spaceEventCoordinator.getDebugInfo(),
          dispatchTestEvent: (type: string = 'space:data-updated') => {
            return spaceEventCoordinator.dispatchEvent(type as any, {
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
      }
      
    } catch (error) {
      const message = 'Space Event Coordinator initialization failed';
      result.warnings.push(message);
      console.warn('⚠️ [AppInitialization]', message, error);
    }
  }

  private async initializeMobileRecovery(result: AppInitializationResult, enableDebugInterfaces: boolean): Promise<void> {
    try {
      console.log('📱 [AppInitialization] Initializing Enhanced Mobile Session Recovery...');
      
      phase1Recovery.initialize({
        debugMode: import.meta.env.DEV,
        enableHealthMonitorIntegration: true,
        enablePresenceIntegration: true,
        sessionValidationThreshold: 30000,
        maxRecoveryAttempts: 3
      });
      console.log('📱 [AppInitialization] Phase 1 mobile recovery initialized successfully');
      
      if (enableDebugInterfaces) {
        this.debugInterfaces.testPhase1 = {
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
      
    } catch (error) {
      const message = 'Mobile recovery initialization failed';
      result.warnings.push(message);
      console.warn('⚠️ [AppInitialization]', message, error);
    }
  }

  private async setupDebugInterfaces(result: AppInitializationResult): Promise<void> {
    try {
      console.log('🔧 [AppInitialization] Setting up debug interfaces...');
      
      if (typeof window !== 'undefined') {
        Object.entries(this.debugInterfaces).forEach(([key, value]) => {
          (window as any)[key] = value;
        });
        
        console.log('🔧 [AppInitialization] Debug interfaces available on window:', Object.keys(this.debugInterfaces));
      }
      
    } catch (error) {
      const message = 'Debug interfaces setup failed';
      result.warnings.push(message);
      console.warn('⚠️ [AppInitialization]', message, error);
    }
  }

  cleanup(): void {
    try {
      console.log('🧹 [AppInitialization] Cleaning up...');
      persistentCache.cleanup();
      this.debugInterfaces = {};
    } catch (error) {
      console.warn('⚠️ [AppInitialization] Cleanup error:', error);
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