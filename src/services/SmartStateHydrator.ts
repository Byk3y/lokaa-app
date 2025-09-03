import { log } from '@/utils/logger';
/**
 * 🚀 Smart State Hydrator Service
 * 
 * Phase 6B: Coordinates between existing cache systems to provide instant
 * component state restoration on refresh, eliminating loading spinners.
 * 
 * Integrates with:
 * - EnhancedCacheManager (memory cache)
 * - SimpleCache (localStorage cache)
 * - AuthFlowStateManager (loading coordination)
 */

import { enhancedCacheManager } from './EnhancedCacheManager';
import { simpleCache } from '@/utils/SimpleCache';
// import { authFlowStateManager } from '@/utils/authFlowStateManager'; // Unused import
import { loadingStateManager, LoadingOperation } from '@/managers/LoadingStateManager';

// Hydration status types
export type HydrationStatus = 'idle' | 'hydrating' | 'hydrated' | 'failed' | 'syncing';

// Component state interface
export interface ComponentState {
  data: any;
  timestamp: number;
  version: string;
  componentId: string;
  userId: string;
  context?: Record<string, any>;
}

// Hydration result interface
export interface HydrationResult {
  success: boolean;
  state?: ComponentState;
  source?: 'memory' | 'localStorage' | 'none';
  error?: string;
  hydrationTime?: number;
}

// Background sync configuration
export interface BackgroundSyncConfig {
  enabled: boolean;
  interval?: number;
  maxRetries?: number;
  retryDelay?: number;
}

class SmartStateHydrator {
  private static instance: SmartStateHydrator;
  private hydrationCache: Map<string, ComponentState> = new Map();
  private backgroundSyncTasks: Map<string, NodeJS.Timeout> = new Map();
  private hydrationStatus: Map<string, HydrationStatus> = new Map();
  private syncCallbacks: Map<string, Function> = new Map();

  // Cache priority order (fastest to slowest)
  private readonly CACHE_PRIORITY = [
    'memory',      // EnhancedCacheManager memory cache
    'localStorage' // SimpleCache localStorage
  ] as const;

  private constructor() {
    this.initializeDebugTools();
    
    // CRITICAL FIX: Listen to space switch events to clear space-specific cache
    window.addEventListener('spaceSwitch', (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.action === 'clearStates') {
        log.debug('Service', `🔄 [SmartStateHydrator] Space switch event received, clearing space-specific cache`);
        this.clearSpaceSpecificCache();
      }
    });
    
    log.debug('Service', '🚀 [SmartStateHydrator] Initialized');
  }

  static getInstance(): SmartStateHydrator {
    if (!SmartStateHydrator.instance) {
      SmartStateHydrator.instance = new SmartStateHydrator();
    }
    return SmartStateHydrator.instance;
  }

  /**
   * 🎯 MAIN HYDRATION METHOD
   * Attempts to restore component state from cache immediately
   */
    async hydrateComponent(
    componentId: string,
    userId: string,
    fallbackState?: any
  ): Promise<HydrationResult> {
    const startTime = Date.now();
    this.setHydrationStatus(componentId, 'hydrating');

    try {
      log.debug('Service', `🚀 [SmartStateHydrator] Starting hydration for component: ${componentId}`);
      log.debug('Service', `🔍 [SmartStateHydrator] User ID: ${userId}`);
      log.debug('Service', `🔍 [SmartStateHydrator] Fallback state available: ${!!fallbackState}`);

      // Add timeout to prevent blocking - increased to 5000ms for better reliability
      const timeoutPromise = new Promise<HydrationResult>((_, reject) => {
        setTimeout(() => {
          log.warn('Service', `⏰ [SmartStateHydrator] Hydration timeout for ${componentId} (this is normal for slow networks)`);
          reject(new Error('Hydration timeout'));
        }, 5000); // Increased to 5 seconds for better reliability
      });

      console.log(`🔍 [SmartStateHydrator] About to call performHydration for ${componentId}`);
      
      const hydrationPromise = this.performHydration(componentId, userId, fallbackState, startTime).catch(error => {
        log.error('Service', `🚨 [SmartStateHydrator] performHydration failed for ${componentId}:`, error instanceof Error ? error : new Error(String(error)));
        throw error;
      });
      
      console.log(`🔍 [SmartStateHydrator] performHydration called, awaiting result for ${componentId}`);

      const result = await Promise.race([hydrationPromise, timeoutPromise]);
      
      log.debug('Service', `🔍 [SmartStateHydrator] Promise.race completed for ${componentId}`);
      
      log.debug('Service', `✅ [SmartStateHydrator] Hydration completed for ${componentId}:`, {
        success: result.success,
        source: result.source,
        hydrationTime: result.hydrationTime,
        hasState: !!result.state
      });

      return result;

    } catch (error) {
      this.setHydrationStatus(componentId, 'failed');
      log.error('Service', `🚨 [SmartStateHydrator] Hydration failed for ${componentId}:`, error instanceof Error ? error : new Error(String(error)));
      
      return {
        success: false,
        source: 'none',
        error: error instanceof Error ? error.message : String(error),
        hydrationTime: Date.now() - startTime
      };
    }
  }

  private async performHydration(
    componentId: string, 
    userId: string, 
    fallbackState: any,
    startTime: number
  ): Promise<HydrationResult> {
    console.log(`🔍 [SmartStateHydrator] performHydration method called for ${componentId}`);
    console.log(`🔍 [SmartStateHydrator] Attempting hydration from cache sources:`, this.CACHE_PRIORITY);
    
    // Try cache sources in priority order
    for (const source of this.CACHE_PRIORITY) {
      try {
        console.log(`🔍 [SmartStateHydrator] Trying cache source: ${source} for ${componentId}`);
        const result = await this.tryCacheSource(source, componentId, userId);
        
        console.log(`🔍 [SmartStateHydrator] Cache source ${source} result:`, {
          success: result.success,
          hasState: !!result.state,
          stateKeys: result.state ? Object.keys(result.state) : []
        });
        
        if (result.success && result.state) {
          // CRITICAL FIX: Validate that cached data is for the current space
          if (this.isValidForCurrentSpace(componentId, result.state)) {
            // Cache hit - restore state immediately
            this.hydrationCache.set(componentId, result.state);
            this.setHydrationStatus(componentId, 'hydrated');
            
            const hydrationTime = Date.now() - startTime;
            console.log(`✅ [SmartStateHydrator] Hydrated ${componentId} from ${source} in ${hydrationTime}ms`);
            
            // Notify loading manager to skip loading operations
            this.notifyLoadingManager(componentId, true);
            
            console.log(`🔍 [SmartStateHydrator] Returning successful hydration result for ${componentId}`);
            return {
              success: true,
              state: result.state,
              source,
              hydrationTime
            };
          } else {
            // Cached data is for a different space - clear it and continue
            log.debug('Service', `🚫 [SmartStateHydrator] Cached data for ${componentId} is from different space, skipping restoration`);
            this.clearComponentCache(componentId, userId);
            continue; // Try next cache source
          }
        }
      } catch (error) {
        log.warn('Service', `⚠️ [SmartStateHydrator] Cache source ${source} failed:`, error);
        continue;
      }
    }

    // No cache hit - use fallback state if provided
    if (fallbackState) {
      const fallbackComponentState: ComponentState = {
        data: fallbackState,
        timestamp: Date.now(),
        version: '1.0.0',
        componentId,
        userId
      };

      this.hydrationCache.set(componentId, fallbackComponentState);
      this.setHydrationStatus(componentId, 'hydrated');
      
      log.debug('Service', `🔄 [SmartStateHydrator] Using fallback state for ${componentId}`);
      
      return {
        success: true,
        state: fallbackComponentState,
        source: 'none',
        hydrationTime: Date.now() - startTime
      };
    }

    // No cache and no fallback
    this.setHydrationStatus(componentId, 'failed');
    log.debug('Service', `❌ [SmartStateHydrator] No cache found for ${componentId}`);
    
    return {
      success: false,
      source: 'none',
      error: 'No cached state available',
      hydrationTime: Date.now() - startTime
    };
  }

  /**
   * 💾 SAVE COMPONENT STATE TO CACHE
   * Persists component state across all cache layers with timeout protection
   */
  async saveComponentState(
    componentId: string,
    userId: string,
    state: any,
    context?: Record<string, any>,
    timeoutMs: number = 3000
  ): Promise<boolean> {
    try {
      const componentState: ComponentState = {
        data: state,
        timestamp: Date.now(),
        version: '1.0.0',
        componentId,
        userId,
        context
      };

      const cacheKey = this.generateCacheKey(componentId, userId);

      // Add timeout protection to prevent UI blocking
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(() => {
          log.warn('Service', `⏰ [SmartStateHydrator] Save timeout for ${componentId} after ${timeoutMs}ms (this prevents UI blocking)`);
          reject(new Error(`Save timeout after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      const savePromise = Promise.all([
        this.saveToMemoryCache(cacheKey, componentState),
        this.saveToLocalStorageCache(cacheKey, componentState)
      ]).then(() => true);

      // Race between save operation and timeout
      const result = await Promise.race([savePromise, timeoutPromise]);

      // Update in-memory cache
      this.hydrationCache.set(componentId, componentState);
      
      log.debug('Service', `💾 [SmartStateHydrator] Saved state for ${componentId}`);
      return result;

    } catch (error) {
      log.error('Service', `🚨 [SmartStateHydrator] Failed to save state for ${componentId}:`, error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /**
   * 🔄 ENABLE BACKGROUND SYNC
   * Sets up background synchronization for a component
   */
  enableBackgroundSync(
    componentId: string,
    syncFunction: Function,
    config: BackgroundSyncConfig = { enabled: true, interval: 30000 }
  ): void {
    if (!config.enabled) return;

    // Clear existing sync task
    this.clearBackgroundSync(componentId);

    // Store sync callback
    this.syncCallbacks.set(componentId, syncFunction);

    // Set up periodic sync
    const syncTask = setInterval(async () => {
      try {
        this.setHydrationStatus(componentId, 'syncing');
        await syncFunction();
        this.setHydrationStatus(componentId, 'hydrated');
        log.debug('Service', `🔄 [SmartStateHydrator] Background sync completed for ${componentId}`);
      } catch (error) {
        log.warn('Service', `⚠️ [SmartStateHydrator] Background sync failed for ${componentId}:`, error);
        this.setHydrationStatus(componentId, 'hydrated'); // Reset to hydrated state
      }
    }, config.interval);

    this.backgroundSyncTasks.set(componentId, syncTask);
    log.debug('Service', `🔄 [SmartStateHydrator] Background sync enabled for ${componentId}`);
  }

  /**
   * 🛑 CLEAR BACKGROUND SYNC
   */
  clearBackgroundSync(componentId: string): void {
    const syncTask = this.backgroundSyncTasks.get(componentId);
    if (syncTask) {
      clearInterval(syncTask);
      this.backgroundSyncTasks.delete(componentId);
    }
    this.syncCallbacks.delete(componentId);
  }

  /**
   * 📊 GET HYDRATION STATUS
   */
  getHydrationStatus(componentId: string): HydrationStatus {
    return this.hydrationStatus.get(componentId) || 'idle';
  }

  /**
   * 🧹 CLEAR COMPONENT CACHE
   */
  clearComponentCache(componentId: string, userId: string): void {
    const cacheKey = this.generateCacheKey(componentId, userId);
    
    // Clear from all cache layers
    enhancedCacheManager.invalidate({ key: cacheKey });
    simpleCache.invalidate(cacheKey);
    
    // Clear from memory
    this.hydrationCache.delete(componentId);
    this.hydrationStatus.delete(componentId);
    
    // Clear background sync
    this.clearBackgroundSync(componentId);
    
    log.debug('Service', `🧹 [SmartStateHydrator] Cleared cache for ${componentId}`);
  }

  /**
   * 🔍 VALIDATE CACHED DATA FOR CURRENT SPACE
   * Prevents cross-space contamination by checking if cached data is for the current space
   */
  private isValidForCurrentSpace(componentId: string, cachedState: ComponentState): boolean {
    try {
      // Extract space ID from component ID (e.g., "feed-tab-235e68d1-89df-4d2d-8945-e7756d60de20")
      const spaceIdMatch = componentId.match(/feed-tab-([a-f0-9-]+)|space-settings-modal-([a-f0-9-]+)/);
      if (!spaceIdMatch) {
        // If we can't extract space ID, allow the cache (for non-space-specific components)
        return true;
      }
      
      const cachedSpaceId = spaceIdMatch[1] || spaceIdMatch[2];
      
      // Get current space ID from the cached state data
      const currentSpaceId = cachedState.data?.currentSpaceData?.id || 
                           cachedState.data?.spaceId || 
                           cachedState.context?.spaceId;
      
      if (!currentSpaceId) {
        // If we can't determine the current space ID, allow the cache
        return true;
      }
      
      const isValid = cachedSpaceId === currentSpaceId;
      
      if (!isValid) {
        log.debug('Service', `🚫 [SmartStateHydrator] Space mismatch for ${componentId}: cached=${cachedSpaceId}, current=${currentSpaceId}`);
      }
      
      return isValid;
    } catch (error) {
      log.warn('Service', `⚠️ [SmartStateHydrator] Error validating space for ${componentId}:`, error);
      // If validation fails, allow the cache to be safe
      return true;
    }
  }

  /**
   * 🧹 CLEAR ALL SPACE-SPECIFIC CACHE
   * Called when switching spaces to prevent cross-space contamination
   */
  clearSpaceSpecificCache(): void {
    try {
      log.debug('Service', `🧹 [SmartStateHydrator] Clearing all space-specific cache entries`);
      
      let clearedCount = 0;
      
      // Clear from memory cache (most important - this is where the issue is)
      const memoryKeysToDelete: string[] = [];
      for (const [componentId] of this.hydrationCache) {
        if (componentId.includes('feed-tab-') || componentId.includes('space-settings-modal-')) {
          memoryKeysToDelete.push(componentId);
        }
      }
      
      memoryKeysToDelete.forEach(componentId => {
        this.hydrationCache.delete(componentId);
        this.hydrationStatus.delete(componentId);
        this.clearBackgroundSync(componentId);
        clearedCount++;
        log.debug('Service', `🧹 [SmartStateHydrator] Cleared space-specific memory cache: ${componentId}`);
      });
      
      // Clear from simple cache - look for actual cache keys with user ID
      if (typeof localStorage !== 'undefined') {
        const localStorageKeys = Object.keys(localStorage);
        const simpleKeysToDelete = localStorageKeys.filter(key => 
          key.startsWith('cache:') && (key.includes('hydrated_state_feed-tab-') || key.includes('hydrated_state_space-settings-modal-'))
        );
        
        simpleKeysToDelete.forEach(key => {
          localStorage.removeItem(key);
          clearedCount++;
          log.debug('Service', `🧹 [SmartStateHydrator] Cleared space-specific simple cache: ${key}`);
        });
      }
      
      // Clear from enhanced cache manager using available API
      // Look for actual cache keys with user ID pattern
      if (typeof localStorage !== 'undefined') {
        const localStorageKeys = Object.keys(localStorage);
        const enhancedKeysToDelete = localStorageKeys.filter(key => 
          key.includes('hydrated_state_feed-tab-') || key.includes('hydrated_state_space-settings-modal-')
        );
        
        enhancedKeysToDelete.forEach(key => {
          enhancedCacheManager.invalidate({ key: key as string });
          clearedCount++;
          log.debug('Service', `🧹 [SmartStateHydrator] Cleared space-specific enhanced cache: ${key}`);
        });
      }
      
      log.debug('Service', `✅ [SmartStateHydrator] Space-specific cache clearing completed - ${clearedCount} entries cleared`);
    } catch (error) {
      log.error('Service', `❌ [SmartStateHydrator] Error clearing space-specific cache:`, error instanceof Error ? error : new Error(String(error)));
      // Don't throw - we want space switching to continue even if cache clearing fails
    }
  }

  // =================== PRIVATE METHODS ===================

  private async tryCacheSource(
    source: 'memory' | 'localStorage',
    componentId: string,
    userId: string
  ): Promise<{ success: boolean; state?: ComponentState }> {
    const cacheKey = this.generateCacheKey(componentId, userId);

    try {
      switch (source) {
        case 'memory':
          return this.tryMemoryCache(cacheKey);
        case 'localStorage':
          return this.tryLocalStorageCache(cacheKey);
        default:
          return { success: false };
      }
    } catch (error) {
      log.warn('Service', `⚠️ [SmartStateHydrator] Cache source ${source} failed:`, error instanceof Error ? error : new Error(String(error)));
      return { success: false };
    }
  }

  private tryMemoryCache(cacheKey: string): { success: boolean; state?: ComponentState } {
    const entry = enhancedCacheManager.get(cacheKey);
    if (entry && this.isValidState(entry.data)) {
      return { success: true, state: entry.data as ComponentState };
    }
    return { success: false };
  }

  private tryLocalStorageCache(cacheKey: string): { success: boolean; state?: ComponentState } {
    const cached = simpleCache.get(cacheKey);
    if (cached && this.isValidState(cached)) {
      return { success: true, state: cached as ComponentState };
    }
    return { success: false };
  }

  private async saveToMemoryCache(cacheKey: string, state: ComponentState): Promise<void> {
    enhancedCacheManager.set(cacheKey, state, {
      ttl: 5 * 60 * 1000, // 5 minutes
      tags: ['component-state', 'hydration'],
      source: 'smart-hydrator'
    });
  }

  private async saveToLocalStorageCache(cacheKey: string, state: ComponentState): Promise<void> {
    simpleCache.set(cacheKey, state, {
      ttl: 10 * 60 * 1000, // 10 minutes
      persist: true
    });
  }

  private generateCacheKey(componentId: string, userId: string): string {
    return `hydrated_state_${componentId}_${userId}`;
  }

  private isValidState(state: any): boolean {
    return state && 
           typeof state === 'object' && 
           state.data !== undefined && 
           state.timestamp && 
           state.componentId;
  }

  private setHydrationStatus(componentId: string, status: HydrationStatus): void {
    this.hydrationStatus.set(componentId, status);
  }

  private notifyLoadingManager(_componentId: string, isHydrated: boolean): void {
    if (isHydrated) {
      // Skip loading operations when component is hydrated
      loadingStateManager.completeOperation(LoadingOperation.SPACE_DATA_FETCH);
      loadingStateManager.completeOperation(LoadingOperation.SPACE_ACCESS);
    }
  }

  private initializeDebugTools(): void {
    if (process.env.NODE_ENV === 'development') {
      (window as any).smartStateHydrator = this;
      (window as any).debugHydration = () => {
        log.debug('Service', '🚀 Smart State Hydrator Debug:', {
          hydrationCache: Array.from(this.hydrationCache.entries()),
          hydrationStatus: Array.from(this.hydrationStatus.entries()),
          backgroundSyncTasks: Array.from(this.backgroundSyncTasks.keys()),
          syncCallbacks: Array.from(this.syncCallbacks.keys())
        });
      };
    }
  }
}

// Export singleton instance
export const smartStateHydrator = SmartStateHydrator.getInstance();

// Types are already exported in their declarations above
