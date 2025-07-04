/**
 * 🧹 COMPREHENSIVE SPACE DATA CLEANER
 * 
 * This utility ensures complete cleanup of all space-related data when switching
 * between spaces to prevent cross-space data contamination.
 */

import { clearSpacePresenceCache } from '@/hooks/useSimpleSpacePresence';
import { globalCache } from '@/utils/globalCacheCoordinator';

/**
 * Clear all cached data for a specific space
 */
export const clearSpaceCache = async (spaceId: string): Promise<void> => {
  if (!spaceId) return;
  
  try {
    console.log(`🧹 [SpaceDataCleaner] Clearing all cache for space: ${spaceId}`);
    
    // Clear localStorage/sessionStorage cache stores
    const cacheKeys = [
      `space_fallback_${spaceId}`,
      `space_data_${spaceId}`,
      `space_members_${spaceId}`,
      `space_posts_${spaceId}`,
      `space_settings_${spaceId}`,
      `leaderboard_${spaceId}`,
      `categories_${spaceId}`
    ];
    
    cacheKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      } catch (e) {
        console.warn(`Failed to clear ${key}:`, e);
      }
    });

    // Invalidate global cache coordinator for this space
    if (globalCache?.invalidate) {
      globalCache.invalidate(`categories:${spaceId}`);
      globalCache.invalidate(`posts:${spaceId}`);
      console.log(`✅ [SpaceDataCleaner] Global cache invalidated for space: ${spaceId}`);
    }

    // Clear categories cache from Zustand store
    if ((window as any).useCategoriesCache) {
      (window as any).useCategoriesCache.getState().invalidateCache(spaceId);
    }
    
    console.log(`✅ [SpaceDataCleaner] Cache cleared for space: ${spaceId}`);
  } catch (error) {
    console.error(`❌ [SpaceDataCleaner] Error clearing cache for space ${spaceId}:`, error);
  }
};

/**
 * Clear member counts for a specific space
 */
export const clearMemberCountsForSpace = async (spaceId: string): Promise<void> => {
  if (!spaceId) return;
  
  try {
    console.log(`🧹 [SpaceDataCleaner] Clearing member counts for space: ${spaceId}`);
    
    // Clear UnifiedPresence cache for this space
    if (clearSpacePresenceCache) {
      await clearSpacePresenceCache(spaceId);
    }
    
    // Clear member counts from singleton if available
    if ((window as any).getSingletonMemberStates) {
      const states = (window as any).getSingletonMemberStates();
      if (states[spaceId]) {
        delete states[spaceId];
      }
    }
    
    console.log(`✅ [SpaceDataCleaner] Member counts cleared for space: ${spaceId}`);
  } catch (error) {
    console.error(`❌ [SpaceDataCleaner] Error clearing member counts for space ${spaceId}:`, error);
  }
};

/**
 * Clear hook states during space switching
 */
export const clearHookStates = (): void => {
  try {
    console.log(`🧹 [SpaceDataCleaner] Clearing hook states for space switch`);
    
    // Dispatch space switch event to notify hooks
    const event = new CustomEvent('spaceSwitch', {
      detail: { action: 'clearStates' }
    });
    window.dispatchEvent(event);
    
    console.log(`✅ [SpaceDataCleaner] Hook states cleared`);
  } catch (error) {
    console.error(`❌ [SpaceDataCleaner] Error clearing hook states:`, error);
  }
};

/**
 * Comprehensive cleanup for space switching
 */
export const clearAllSpaceData = async (
  currentSpaceId?: string, 
  targetSpaceId?: string,
  clearAll: boolean = false
): Promise<void> => {
  const timestamp = new Date().toISOString();
  
  console.log(`🧹 [SpaceDataCleaner] Starting comprehensive space cleanup:`, {
    currentSpaceId,
    targetSpaceId,
    clearAll,
    timestamp
  });
  
  try {
    // Clear member counts for current space
    if (currentSpaceId) {
      await clearMemberCountsForSpace(currentSpaceId);
    }
    
    // Clear cache for current space
    if (currentSpaceId) {
      await clearSpaceCache(currentSpaceId);
    }
    
    // Clear hook states
    clearHookStates();
    
    console.log(`✅ [SpaceDataCleaner] Comprehensive cleanup completed successfully`);
  } catch (error) {
    console.error(`❌ [SpaceDataCleaner] Error during comprehensive cleanup:`, error);
  }
}; 