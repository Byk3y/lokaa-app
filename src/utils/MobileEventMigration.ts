import { log } from '@/utils/logger';
/**
 * 🔄 Mobile Event Migration Utilities
 * 
 * Compatibility adapters and migration utilities for transitioning
 * existing mobile systems to the new centralized coordinator.
 */

import { mobileEventCoordinator, MobileEventData, MobileSystemConfig } from './MobileEventCoordinator';

/**
 * Compatibility adapter for existing mobile systems
 */
export class MobileSystemAdapter {
  /**
   * Adapter for MobileSessionManager-style systems
   */
  static createSessionManagerAdapter(legacySystem: any): MobileSystemConfig {
    return {
      name: 'SessionManagerAdapter',
      priority: 50,
      onlyOnMobile: true,
      handler: async (eventData: MobileEventData) => {
        if (eventData.isBackground) {
          // Simulate backgrounded behavior
          if (legacySystem.handleBackgrounded) {
            legacySystem.handleBackgrounded();
          }
        } else {
          // Simulate foregrounded behavior
          if (legacySystem.handleForegrounded) {
            legacySystem.handleForegrounded(eventData.duration || 0);
          }
        }
      }
    };
  }

  /**
   * Adapter for PageVisibilityManager-style systems
   */
  static createVisibilityManagerAdapter(legacySystem: any): MobileSystemConfig {
    return {
      name: 'VisibilityManagerAdapter',
      priority: 60,
      handler: async (eventData: MobileEventData) => {
        if (eventData.eventType === 'visibility') {
          if (legacySystem.handleVisibilityChange) {
            legacySystem.handleVisibilityChange(!eventData.isBackground);
          }
        }
      }
    };
  }

  /**
   * Adapter for React hook-style systems
   */
  static createHookAdapter(name: string, callback: (isBackground: boolean, duration?: number) => void): MobileSystemConfig {
    return {
      name: `HookAdapter_${name}`,
      priority: 70,
      handler: async (eventData: MobileEventData) => {
        if (eventData.eventType === 'visibility') {
          callback(eventData.isBackground, eventData.duration);
        }
      }
    };
  }
}

/**
 * Migration helper for gradual system replacement
 */
export class MobileMigrationHelper {
  private migratedSystems = new Set<string>();
  private legacySystems = new Map<string, any>();

  /**
   * Register a legacy system for eventual migration
   */
  registerLegacySystem(name: string, system: any): void {
    this.legacySystems.set(name, system);
    log.debug('Utils', `📝 [MigrationHelper] Registered legacy system: ${name}`);
  }

  /**
   * Migrate a system to the new coordinator
   */
  migrateSystem(systemName: string, adapter: MobileSystemConfig): void {
    if (this.migratedSystems.has(systemName)) {
      log.debug('Utils', `✅ [MigrationHelper] ${systemName} already migrated`);
      return;
    }

    // Subscribe to new coordinator
    const unsubscribe = mobileEventCoordinator.subscribe(adapter);

    // Mark as migrated
    this.migratedSystems.add(systemName);

    log.debug('Utils', `🔄 [MigrationHelper] Migrated ${systemName} to coordinator`);

    // Store unsubscribe function for cleanup
    (adapter as any).unsubscribe = unsubscribe;
  }

  /**
   * Check migration status
   */
  getMigrationStatus() {
    return {
      totalLegacySystems: this.legacySystems.size,
      migratedSystems: this.migratedSystems.size,
      remainingSystems: this.legacySystems.size - this.migratedSystems.size,
      migratedList: Array.from(this.migratedSystems),
      remainingList: Array.from(this.legacySystems.keys()).filter(name => !this.migratedSystems.has(name))
    };
  }

  /**
   * Migrate all registered systems at once
   */
  migrateAll(): void {
    log.debug('Utils', `🚀 [MigrationHelper] Starting bulk migration of ${this.legacySystems.size} systems...`);

    this.legacySystems.forEach((system, name) => {
      try {
        // Create appropriate adapter based on system type
        let adapter: MobileSystemConfig;

        if (system.handleBackgrounded || system.handleForegrounded) {
          adapter = MobileSystemAdapter.createSessionManagerAdapter(system);
        } else if (system.handleVisibilityChange) {
          adapter = MobileSystemAdapter.createVisibilityManagerAdapter(system);
        } else {
          // Generic adapter
          adapter = {
            name: `GenericAdapter_${name}`,
            handler: async (eventData: MobileEventData) => {
              log.debug('Utils', `📡 [GenericAdapter] ${name} received:`, eventData);
            }
          };
        }

        this.migrateSystem(name, adapter);
      } catch (error) {
        log.warn('Utils', `⚠️ [MigrationHelper] Failed to migrate ${name}:`, error);
      }
    });

    const status = this.getMigrationStatus();
    log.debug('Utils', `✅ [MigrationHelper] Migration complete: ${status.migratedSystems}/${status.totalLegacySystems} systems migrated`);
  }
}

/**
 * Legacy system disable utilities
 */
export class LegacySystemDisabler {
  /**
   * Disable specific legacy systems
   */
  static disableSystem(systemName: string): void {
    if (typeof window === 'undefined') return;

    const disableMap: Record<string, () => void> = {
      mobileSessionManager: () => {
        (window as any).DISABLE_MOBILE_SESSION_MANAGER = true;
        if ((window as any).mobileSessionManager) {
          (window as any).mobileSessionManager.disabled = true;
        }
      },
      
      pageVisibilityManager: () => {
        (window as any).DISABLE_PAGE_VISIBILITY_MANAGER = true;
        if ((window as any).pageVisibilityManager) {
          (window as any).pageVisibilityManager.disabled = true;
        }
      },
      
      mobileBrowserService: () => {
        (window as any).DISABLE_MOBILE_BROWSER_SERVICE = true;
        if ((window as any).mobileBrowserService) {
          (window as any).mobileBrowserService.disabled = true;
        }
      },
      
      simpleMobileManager: () => {
        (window as any).DISABLE_SIMPLE_MOBILE_MANAGER = true;
        if ((window as any).simpleMobileManager) {
          (window as any).simpleMobileManager.disabled = true;
        }
      },
      
      phase2c: () => {
        (window as any).DISABLE_PHASE2C_MOBILE = true;
        if ((window as any).phase2c) {
          (window as any).phase2c.disabled = true;
        }
      }
    };

    const disableFunction = disableMap[systemName];
    if (disableFunction) {
      disableFunction();
      log.debug('Utils', `🔧 [LegacyDisabler] Disabled ${systemName}`);
    } else {
      log.warn('Utils', `⚠️ [LegacyDisabler] Unknown system: ${systemName}`);
    }
  }

  /**
   * Disable all known legacy systems
   */
  static disableAllLegacySystems(): void {
    const systems = [
      'mobileSessionManager',
      'pageVisibilityManager', 
      'mobileBrowserService',
      'simpleMobileManager',
      'phase2c'
    ];

    log.debug('Utils', '🔧 [LegacyDisabler] Disabling all legacy mobile systems...');
    
    systems.forEach(system => {
      this.disableSystem(system);
    });

    // Set additional flags for Option C validation
    if (typeof window !== 'undefined') {
      (window as any).MOBILE_RECOVERY_DISABLED = true;
      (window as any).AGGRESSIVE_RELOAD_DISABLED = true;
      (window as any).DISABLE_MOBILE_LIFECYCLE = true;
      log.debug('Utils', '🔧 [LegacyDisabler] Set additional Option C validation flags');
    }

    log.debug('Utils', `✅ [LegacyDisabler] Disabled ${systems.length} legacy systems`);
  }

  /**
   * Check which systems are still active
   */
  static getActiveSystemsReport(): any {
    if (typeof window === 'undefined') return {};

    return {
      mobileSessionManager: {
        exists: !!(window as any).mobileSessionManager,
        disabled: !!(window as any).DISABLE_MOBILE_SESSION_MANAGER,
        active: !!(window as any).mobileSessionManager && !(window as any).DISABLE_MOBILE_SESSION_MANAGER
      },
      pageVisibilityManager: {
        exists: !!(window as any).pageVisibilityManager,
        disabled: !!(window as any).DISABLE_PAGE_VISIBILITY_MANAGER,
        active: !!(window as any).pageVisibilityManager && !(window as any).DISABLE_PAGE_VISIBILITY_MANAGER
      },
      mobileBrowserService: {
        exists: !!(window as any).mobileBrowserService,
        disabled: !!(window as any).DISABLE_MOBILE_BROWSER_SERVICE,
        active: !!(window as any).mobileBrowserService && !(window as any).DISABLE_MOBILE_BROWSER_SERVICE
      },
      coordinator: {
        active: !!(window as any).MOBILE_EVENT_COORDINATOR_ACTIVE,
        initialized: !!(window as any).MobileEventCoordinator?.isInitialized
      }
    };
  }
}

// Create global migration helper instance
export const mobileMigrationHelper = new MobileMigrationHelper();

// Expose migration utilities globally for debugging
if (typeof window !== 'undefined') {
  (window as any).MobileMigrationHelper = mobileMigrationHelper;
  (window as any).LegacySystemDisabler = LegacySystemDisabler;
  (window as any).getMigrationStatus = () => mobileMigrationHelper.getMigrationStatus();
  (window as any).disableAllLegacySystems = () => LegacySystemDisabler.disableAllLegacySystems();
  (window as any).getActiveSystemsReport = () => LegacySystemDisabler.getActiveSystemsReport();
} 