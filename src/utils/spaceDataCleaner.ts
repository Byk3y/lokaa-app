/**
 * 🧹 COMPREHENSIVE SPACE DATA CLEANER
 * 
 * This utility ensures complete cleanup of all space-related data when switching
 * between spaces to prevent cross-space data contamination.
 * 
 * CRITICAL FOR: Fixing SpaceInfoSidebar showing wrong space data after switching
 */

import { clearUnifiedPresenceCache } from '@/hooks/useUnifiedPresence';
import { globalCache } from '@/utils/globalCacheCoordinator';

// Track which space we're currently cleaning to prevent loops
let currentlyCleaningSpace: string | null = null;

/**
 * Clear presence data for a specific space
 */
export const clearSpacePresence = async (spaceId: string): Promise<void> => {
  if (!spaceId) return;
  
  try {
    console.log(`🧹 [SpaceDataCleaner] Clearing presence data for space: ${spaceId}`);
    
    // Call the unified presence cache clearer with space filter
    if (typeof window !== 'undefined' && (window as any).clearSpacePresenceData) {
      await (window as any).clearSpacePresenceData(spaceId);
    }
    
    // Clear global cache entries for this space
    if (globalCache && typeof globalCache.invalidatePattern === 'function') {
      globalCache.invalidatePattern(spaceId);
    }
    
    console.log(`✅ [SpaceDataCleaner] Presence data cleared for space: ${spaceId}`);
  } catch (error) {
    console.error(`❌ [SpaceDataCleaner] Failed to clear presence for space ${spaceId}:`, error);
  }
};

/**
 * Clear member counts cache for a specific space
 */
export const clearSpaceMemberCounts = async (spaceId: string): Promise<void> => {
  if (!spaceId) return;
  
  try {
    console.log(`🧹 [SpaceDataCleaner] Clearing member counts for space: ${spaceId}`);
    
    // Clear from global cache coordinator
    if (globalCache && typeof globalCache.unsubscribe === 'function') {
      globalCache.unsubscribe(`memberCounts:${spaceId}`, 'space-switch-cleanup');
    }
    
    // Clear from localStorage cache if any
    const memberCountKeys = [
      `memberCounts_${spaceId}`,
      `space_members_cache_${spaceId}`,
      `optimized_member_counts_${spaceId}`
    ];
    
    memberCountKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn(`Failed to clear localStorage key: ${key}`, e);
      }
    });
    
    console.log(`✅ [SpaceDataCleaner] Member counts cleared for space: ${spaceId}`);
  } catch (error) {
    console.error(`❌ [SpaceDataCleaner] Failed to clear member counts for space ${spaceId}:`, error);
  }
};

/**
 * Clear all cached data for a specific space
 */
export const clearSpaceCache = async (spaceId: string): Promise<void> => {
  if (!spaceId) return;
  
  try {
    console.log(`🧹 [SpaceDataCleaner] Clearing all cache for space: ${spaceId}`);
    
    // Clear various cache stores
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
        console.warn(`Failed to clear cache key: ${key}`, e);
      }
    });
    
    console.log(`✅ [SpaceDataCleaner] Cache cleared for space: ${spaceId}`);
  } catch (error) {
    console.error(`❌ [SpaceDataCleaner] Failed to clear cache for space ${spaceId}:`, error);
  }
};

/**
 * Clear hook states for space switching
 */
export const clearSpaceHookStates = async (): Promise<void> => {
  try {
    console.log(`🧹 [SpaceDataCleaner] Clearing hook states for space switch`);
    
    // Clear member counts hook states if accessible
    if (typeof window !== 'undefined') {
      // Signal to hooks that they should reset their state (actual space switch)
      window.dispatchEvent(new CustomEvent('spaceSwitch', {
        detail: { action: 'clearStates', timestamp: Date.now(), source: 'spaceSwitch' }
      }));
      
      // Clear any global hook caches
      if ((window as any).clearMemberCountsCache) {
        (window as any).clearMemberCountsCache();
      }
      
      if ((window as any).clearSpaceHookStates) {
        (window as any).clearSpaceHookStates();
      }
    }
    
    console.log(`✅ [SpaceDataCleaner] Hook states cleared`);
  } catch (error) {
    console.error(`❌ [SpaceDataCleaner] Failed to clear hook states:`, error);
  }
};

/**
 * MAIN FUNCTION: Comprehensive space data cleanup
 * This is called when switching between spaces
 */
export const clearAllSpaceData = async (options: {
  currentSpaceId?: string;
  targetSpaceId?: string;
  clearAll?: boolean;
} = {}): Promise<void> => {
  const { currentSpaceId, targetSpaceId, clearAll = false } = options;
  
  // Prevent recursive calls
  const cleanupId = currentSpaceId || 'all';
  if (currentlyCleaningSpace === cleanupId) {
    console.log(`🔄 [SpaceDataCleaner] Already cleaning ${cleanupId}, skipping duplicate`);
    return;
  }
  
  currentlyCleaningSpace = cleanupId;
  
  try {
    console.log(`🧹 [SpaceDataCleaner] Starting comprehensive space cleanup:`, {
      currentSpaceId,
      targetSpaceId,
      clearAll,
      timestamp: new Date().toISOString()
    });
    
    // Phase 1: Clear presence data
    if (clearAll) {
      console.log(`🧹 [SpaceDataCleaner] Clearing ALL presence data`);
      clearUnifiedPresenceCache();
    } else if (currentSpaceId) {
      await clearSpacePresence(currentSpaceId);
    }
    
    // Phase 2: Clear member counts
    if (currentSpaceId) {
      await clearSpaceMemberCounts(currentSpaceId);
    }
    
    // Phase 3: Clear general cache
    if (currentSpaceId) {
      await clearSpaceCache(currentSpaceId);
    }
    
    // Phase 4: Clear hook states
    await clearSpaceHookStates();
    
    // Phase 5: Clear global cache coordinator
    if (globalCache && typeof globalCache.clearAll === 'function' && clearAll) {
      globalCache.clearAll();
    }
    
    // Small delay to ensure all async operations complete
    await new Promise(resolve => setTimeout(resolve, 50));
    
    console.log(`✅ [SpaceDataCleaner] Comprehensive cleanup completed successfully`);
    
  } catch (error) {
    console.error(`❌ [SpaceDataCleaner] Cleanup failed:`, error);
  } finally {
    currentlyCleaningSpace = null;
  }
};

/**
 * Export for emergency manual cleanup from console
 */
if (typeof window !== 'undefined') {
  (window as any).clearAllSpaceData = clearAllSpaceData;
  (window as any).clearSpacePresence = clearSpacePresence;
  (window as any).clearSpaceMemberCounts = clearSpaceMemberCounts;
} 