/**
 * 🎯 Posts Cache Management - Cache Operations & Background Refresh
 * 
 * Extracted from useOptimizedCachedPosts.ts to handle cache management,
 * background refresh, and cache invalidation logic.
 */

import { useRef, useCallback } from 'react';
import { globalCache } from '@/utils/globalCacheCoordinator';
import { devLogger } from '@/utils/developmentLogger';
import type { CachedPostType } from '@/features/posts/types/cachedPost';
import type { CacheManagementParams } from './postTypes';

/**
 * Posts cache management hook
 * 
 * @param spaceId - Current space ID
 * @param subscriberId - Unique subscriber identifier
 * @returns Cache management utilities
 */
export function usePostsCache(spaceId: string, subscriberId: string) {
  // Track when we've loaded from cache to prevent duplicate fetches
  const hasLoadedFromCache = useRef<Set<string>>(new Set());
  
  // Check for cached data
  const checkCache = useCallback((spaceId: string) => {
    const regularKey = `posts:${spaceId}:1:25`;
    const pinnedKey = `posts:${spaceId}:pinned`;
    
    const cachedRegular = globalCache.getCachedData<any[]>(regularKey);
    const cachedPinned = globalCache.getCachedData<any[]>(pinnedKey);
    
    return {
      regular: cachedRegular,
      pinned: cachedPinned,
      hasValidCache: cachedRegular && Array.isArray(cachedRegular) && cachedPinned && Array.isArray(cachedPinned)
    };
  }, []);
  
  // Load posts from cache
  const loadFromCache = useCallback((
    spaceId: string,
    setPosts: (posts: CachedPostType[]) => void,
    setPinnedPosts: (posts: CachedPostType[]) => void,
    setCurrentPage: (page: number) => void,
    setTotalCount: (count: number) => void,
    setLoading: (loading: boolean) => void,
    setError: (error: string | null) => void
  ) => {
    const { regular, pinned, hasValidCache } = checkCache(spaceId);
    
    if (hasValidCache) {
      devLogger.log('CacheDebug', `🔄 [CacheLoad] Loading posts from cache for space: ${spaceId}`, {
        regular: regular?.length || 0,
        pinned: pinned?.length || 0,
        subscriberId
      });
      
      setPosts(regular || []);
      setPinnedPosts(pinned || []);
      setCurrentPage(1);
      setTotalCount((regular?.length || 0) + (pinned?.length || 0));
      setLoading(false);
      setError(null);
      
      // Mark as loaded from cache
      hasLoadedFromCache.current.add(spaceId);
      
      return true;
    }
    
    return false;
  }, [checkCache]);
  
  // Clear cache for space switch
  const clearCacheForSpaceSwitch = useCallback((spaceId: string) => {
    devLogger.log('CacheDebug', `🧹 [SpaceSwitch] Clearing cache tracking for space: ${spaceId}`, { subscriberId });
    hasLoadedFromCache.current.delete(spaceId);
  }, [subscriberId]);
  
  // Check if already loaded from cache
  const hasLoadedFromCacheForSpace = useCallback((spaceId: string) => {
    return hasLoadedFromCache.current.has(spaceId);
  }, []);
  
  // Invalidate cache
  const invalidateCache = useCallback((spaceId: string) => {
    const regularKey = `posts:${spaceId}:1:25`;
    const pinnedKey = `posts:${spaceId}:pinned`;
    
    globalCache.invalidate(regularKey);
    globalCache.invalidate(pinnedKey);
    
    devLogger.log('CacheDebug', `🗑️ [CacheInvalidate] Invalidated cache for space: ${spaceId}`, { subscriberId });
  }, [subscriberId]);
  
  // Background refresh (silent)
  const scheduleBackgroundRefresh = useCallback((
    spaceId: string,
    fetchPostsSilently: () => Promise<void>
  ) => {
    devLogger.log('CacheDebug', `🔄 [BackgroundRefresh] Scheduling background refresh for space ${spaceId}`, { subscriberId });
    
    // Schedule background refresh after a short delay
    setTimeout(() => {
      fetchPostsSilently();
    }, 1000);
  }, [subscriberId]);
  
  return {
    checkCache,
    loadFromCache,
    clearCacheForSpaceSwitch,
    hasLoadedFromCacheForSpace,
    invalidateCache,
    scheduleBackgroundRefresh
  };
}
