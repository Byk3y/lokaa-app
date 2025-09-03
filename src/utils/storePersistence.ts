import { log } from '@/utils/logger';
/**
 * 🚀 Store State Persistence Utility
 * 
 * Phase 6B: Provides automatic state persistence and cache key management
 * for Zustand stores with smart hydration capabilities.
 */

import { smartStateHydrator } from '@/services/SmartStateHydrator';
import { stateSerializer } from '@/utils/stateSerialization';

// Store persistence configuration
export interface StorePersistenceConfig {
  storeName: string;
  userId: string;
  autoSave?: boolean;
  saveInterval?: number;
  sensitiveKeys?: string[];
  backgroundSync?: {
    enabled: boolean;
    interval: number;
    maxRetries: number;
  };
}

// Store persistence manager
export class StorePersistenceManager {
  private static instances: Map<string, StorePersistenceManager> = new Map();
  private config: StorePersistenceConfig;
  private saveTimeout: NodeJS.Timeout | null = null;
  private lastSavedState: any = null;
  private isInitialized = false;

  private constructor(config: StorePersistenceConfig) {
    this.config = {
      autoSave: true,
      saveInterval: 5000,
      sensitiveKeys: [],
      backgroundSync: {
        enabled: true,
        interval: 60000,
        maxRetries: 3
      },
      ...config
    };
  }

  /**
   * Get or create persistence manager instance
   */
  static getInstance(config: StorePersistenceConfig): StorePersistenceManager {
    const key = `${config.storeName}-${config.userId}`;
    
    if (!StorePersistenceManager.instances.has(key)) {
      StorePersistenceManager.instances.set(key, new StorePersistenceManager(config));
    }
    
    return StorePersistenceManager.instances.get(key)!;
  }

  /**
   * Initialize store persistence
   */
  async initialize(initialState: any): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      const componentId = this.generateComponentId();
      
      // Try to hydrate from cache
      const result = await smartStateHydrator.hydrateComponent(
        componentId,
        this.config.userId,
        initialState
      );

      if (result.success && result.state) {
        log.debug('Utils', `✅ [StorePersistence] Hydrated ${this.config.storeName} from cache`);
        return true;
      }

      log.debug('Utils', `❌ [StorePersistence] No cache found for ${this.config.storeName}`);
      return false;
    } catch (error) {
      log.error('Utils', `🚨 [StorePersistence] Initialization failed for ${this.config.storeName}:`, error);
      return false;
    }
  }

  /**
   * Save store state to cache
   */
  async saveState(state: any): Promise<boolean> {
    try {
      // Clean sensitive data
      const cleanedState = stateSerializer.cleanState(state, this.config.sensitiveKeys);
      
      // Save to cache
      const success = await smartStateHydrator.saveComponentState(
        this.generateComponentId(),
        this.config.userId,
        cleanedState
      );

      if (success) {
        this.lastSavedState = state;
        log.debug('Utils', `💾 [StorePersistence] Saved state for ${this.config.storeName}`);
      }

      return success;
    } catch (error) {
      log.error('Utils', `🚨 [StorePersistence] Failed to save state for ${this.config.storeName}:`, error);
      return false;
    }
  }

  /**
   * Debounced auto-save
   */
  debouncedSave(state: any): void {
    if (!this.config.autoSave) return;

    // Clear existing timeout
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    // Set new timeout
    this.saveTimeout = setTimeout(() => {
      this.saveState(state);
    }, this.config.saveInterval);
  }

  /**
   * Enable background sync
   */
  enableBackgroundSync(syncFunction: () => Promise<void>): void {
    if (!this.config.backgroundSync?.enabled) return;

    const componentId = this.generateComponentId();
    
    smartStateHydrator.enableBackgroundSync(componentId, syncFunction, {
      enabled: true,
      interval: this.config.backgroundSync.interval,
      maxRetries: this.config.backgroundSync.maxRetries
    });

    log.debug('Utils', `🔄 [StorePersistence] Background sync enabled for ${this.config.storeName}`);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    const componentId = this.generateComponentId();
    smartStateHydrator.clearComponentCache(componentId, this.config.userId);
    
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    
    this.lastSavedState = null;
    log.debug('Utils', `🧹 [StorePersistence] Cleared cache for ${this.config.storeName}`);
  }

  /**
   * Get hydration status
   */
  getHydrationStatus(): string {
    const componentId = this.generateComponentId();
    return smartStateHydrator.getHydrationStatus(componentId);
  }

  /**
   * Check if state has changed
   */
  hasStateChanged(newState: any): boolean {
    if (!this.lastSavedState) return true;
    
    try {
      return JSON.stringify(newState) !== JSON.stringify(this.lastSavedState);
    } catch {
      return true; // If serialization fails, assume changed
    }
  }

  // =================== PRIVATE METHODS ===================

  private generateComponentId(): string {
    return `${this.config.storeName}-store`;
  }

  /**
   * Cleanup on destroy
   */
  destroy(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    const key = `${this.config.storeName}-${this.config.userId}`;
    StorePersistenceManager.instances.delete(key);
  }
}

/**
 * 🎯 ZUSTAND PERSISTENCE MIDDLEWARE
 * Higher-order function that adds persistence to Zustand stores
 */
export function withPersistence<T extends Record<string, any>>(
  storeConfig: T,
  persistenceConfig: Omit<StorePersistenceConfig, 'storeName' | 'userId'>
) {
  return (set: any, get: any, api: any) => {
    const store = storeConfig(set, get, api);
    let persistenceManager: StorePersistenceManager | null = null;

    // Initialize persistence when store is created
    const originalSetState = api.setState;
    api.setState = (partial: any, replace?: boolean) => {
      const result = originalSetState(partial, replace);
      
      // Auto-save state changes
      if (persistenceManager) {
        const newState = get();
        if (persistenceManager.hasStateChanged(newState)) {
          persistenceManager.debouncedSave(newState);
        }
      }
      
      return result;
    };

    // Add persistence methods to store
    return {
      ...store,
      
      // Initialize persistence
      initializePersistence: async (userId: string) => {
        persistenceManager = StorePersistenceManager.getInstance({
          ...persistenceConfig,
          storeName: api.getState().storeName || 'unknown',
          userId
        });
        
        const initialState = get();
        return await persistenceManager.initialize(initialState);
      },
      
      // Save state manually
      saveState: async () => {
        if (persistenceManager) {
          return await persistenceManager.saveState(get());
        }
        return false;
      },
      
      // Clear cache
      clearCache: () => {
        if (persistenceManager) {
          persistenceManager.clearCache();
        }
      },
      
      // Get hydration status
      getHydrationStatus: () => {
        if (persistenceManager) {
          return persistenceManager.getHydrationStatus();
        }
        return 'idle';
      },
      
      // Enable background sync
      enableBackgroundSync: (syncFunction: () => Promise<void>) => {
        if (persistenceManager) {
          persistenceManager.enableBackgroundSync(syncFunction);
        }
      }
    };
  };
}

/**
 * 🎯 CACHE KEY GENERATOR
 * Generates consistent cache keys for different store types
 */
export class CacheKeyGenerator {
  /**
   * Generate cache key for store state
   */
  static generateStoreKey(storeName: string, userId: string, context?: string): string {
    const baseKey = `store_${storeName}_${userId}`;
    return context ? `${baseKey}_${context}` : baseKey;
  }

  /**
   * Generate cache key for component state
   */
  static generateComponentKey(componentId: string, userId: string, spaceId?: string): string {
    const baseKey = `component_${componentId}_${userId}`;
    return spaceId ? `${baseKey}_${spaceId}` : baseKey;
  }

  /**
   * Generate cache key for user-specific data
   */
  static generateUserKey(userId: string, dataType: string, context?: string): string {
    const baseKey = `user_${userId}_${dataType}`;
    return context ? `${baseKey}_${context}` : baseKey;
  }

  /**
   * Generate cache key for space-specific data
   */
  static generateSpaceKey(spaceId: string, dataType: string, userId?: string): string {
    const baseKey = `space_${spaceId}_${dataType}`;
    return userId ? `${baseKey}_${userId}` : baseKey;
  }
}

// Export types
export type { StorePersistenceConfig };
