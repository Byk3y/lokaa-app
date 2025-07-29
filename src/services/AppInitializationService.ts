import { log } from '@/utils/logger';
// App Initialization Service - extracted from App.tsx
// Handles all app initialization logic in a centralized service

import { supabase } from '@/integrations/supabase/client';
import { performanceMonitor } from '@/utils/performanceMonitor';
// DISABLED: PageVisibilityManager causes reload conflicts with comprehensive fix
// import { pageVisibilityManager } from '@/utils/pageVisibilityManager';
// persistentCache removed - using simplified course cache
import { supabaseHealthMonitor } from '@/utils/supabaseHealthCheck';
// Cache warming removed - using simpler cache system
// DISABLED: import { phase1Recovery } from '@/utils/phase1MobileRecovery';
import { spaceMembersService } from '@/utils/indexeddb/services/SpaceMembersService';
import { devLogger } from '@/utils/developmentLogger';

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

    const {
      isDevelopment = import.meta.env?.DEV,
      enableDebugInterfaces = isDevelopment,
      enableMobileRecovery = true
    } = options;

    try {
      devLogger.log('AppInit', 'Starting app initialization...');

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
      if (process.env.NODE_ENV === 'development') {
        log.error('Service', '❌ [AppInitialization] Initialization failed:', error);
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
      if (process.env.NODE_ENV === 'development') {
        log.error('Service', '❌ [AppInitialization]', message, error);
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

  private async initializeSupabaseBridge(result: AppInitializationResult, isDevelopment: boolean): Promise<void> {
    try {
      devLogger.log('AppInit', 'Initializing V2 IndexedDB Bridge System...');
      
      // Import and initialize V2 system
      const { indexedDBBridgeV2 } = await import('@/utils/indexeddb/IndexedDBBridgeV2');
      await indexedDBBridgeV2.initialize();
      
      // Import migration adapter for unified interface
      const { migrationAdapter } = await import('@/utils/indexeddb/migration/MigrationAdapter');
      
      devLogger.log('AppInit', 'V2 IndexedDB Bridge System initialized with mobile browser protection');
      
      if (isDevelopment) {
        await import('@/utils/indexedDBDebugger');
        devLogger.log('AppInit', 'IndexedDB debugger loaded for development');
      }
      
      if (isDevelopment) {
        // DESKTOP GUARD: Only load mobile protection test suite on mobile devices
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile) {
          devLogger.log('AppInit', 'Mobile device detected - V2 system includes mobile browser protection');
        } else {
          devLogger.log('AppInit', 'Desktop detected - V2 system with standard caching');
        }
      }
      
      if (isDevelopment) {
        this.debugInterfaces.debugSupabaseBridge = {
          getMetrics: () => migrationAdapter.getMetrics(),
          testMobileBlocking: () => migrationAdapter.testMobileBlockingDetection(),
          clearCache: () => migrationAdapter.clearCache(),
          getSystemStatus: () => migrationAdapter.getSystemStatus(),
          getCurrentSystem: () => migrationAdapter.getCurrentSystem(),
          testSpaceMembers: (spaceId: string) => migrationAdapter.getSpaceMembers(spaceId),
          testUserProfile: (userId: string) => migrationAdapter.getUserProfile(userId),
          testCurrentUser: () => migrationAdapter.getCurrentUser(),
          testPresenceUpdate: (userId: string, isOnline: boolean) => 
            migrationAdapter.updateGlobalPresence(userId, isOnline)
        };

        // V2-specific debugging interfaces
        this.debugInterfaces.debugV2Bridge = {
          checkHealth: () => indexedDBBridgeV2.checkHealth(),
          getServiceMetrics: () => indexedDBBridgeV2.getMetrics(),
          testAllServices: async () => {
            const health = await indexedDBBridgeV2.checkHealth();
            return {
              overall: health.status,
              services: health.services,
              metrics: await indexedDBBridgeV2.getMetrics()
            };
          }
        };
      }
      
      setTimeout(() => {
        const currentPath = window.location.pathname;
        const pathSegments = currentPath.split('/').filter(Boolean);
        if (pathSegments.length > 0 && pathSegments[0] !== 'spaces' && pathSegments[0] !== 'chat') {
          const spaceSubdomain = pathSegments[0];
          devLogger.log('AppInit', `V2 system active for subdomain: ${spaceSubdomain}`);
        }
      }, 3000);
      
    } catch (error) {
      const message = 'V2 IndexedDB Bridge initialization failed';
      result.warnings.push(message);
      devLogger.warn('AppInit', message, error);
    }
  }

  private async initializeSpaceCoordinator(result: AppInitializationResult, enableDebugInterfaces: boolean): Promise<void> {
    try {
      devLogger.log('AppInit', 'Initializing Event-Driven Space Coordinator...');
      
      const { spaceEventCoordinator } = await import('@/utils/spaceEventCoordinator');
      devLogger.log('AppInit', 'Space Event Coordinator initialized');
      
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
      devLogger.warn('AppInit', message, error);
    }
  }

  private async initializeMobileRecovery(result: AppInitializationResult, enableDebugInterfaces: boolean): Promise<void> {
    try {
      devLogger.log('AppInit', 'Initializing Enhanced Mobile Session Recovery...');
      
      // Note: phase1MobileRecovery was removed as part of Phase 1 cleanup
      // Mobile recovery functionality is now handled by the V2 IndexedDB Bridge system
      devLogger.log('AppInit', 'Mobile recovery system cleaned up - using V2 IndexedDB Bridge');
      
      if (enableDebugInterfaces) {
        this.debugInterfaces.testPhase1 = {
          status: () => {
            devLogger.log('AppInit', 'Phase 1 Status Check:');
            devLogger.log('AppInit', 'Available:', typeof (window as any).phase1Recovery !== 'undefined');
            devLogger.log('AppInit', 'Mobile Features Enabled:', typeof (window as any).mobileSessionManager !== 'undefined');
            devLogger.log('AppInit', 'Mobile Lifecycle Debug:', typeof (window as any).mobileLifecycleDebug !== 'undefined');
            devLogger.log('AppInit', 'Phase 1 Component:', typeof (window as any).phase1Component !== 'undefined');
            
            if ((window as any).phase1Recovery) {
              devLogger.log('AppInit', 'Phase 1 Stats:', (window as any).phase1Recovery.getStats());
              devLogger.log('AppInit', 'Phase 1 State:', (window as any).phase1Recovery.getState());
            }
          },
          enableForTesting: () => {
            (window as any).phase1Recovery?.overrideMobileDetection(true);
            (window as any).phase1Recovery?.forceEnable();
            devLogger.log('AppInit', 'Phase 1 force enabled for testing');
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
            devLogger.log('AppInit', 'Simulated 2-second background session');
          }
        };
      }
      
    } catch (error) {
      const message = 'Mobile recovery initialization failed';
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