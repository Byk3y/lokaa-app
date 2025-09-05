/**
 * 🎯 Optimized Cached Posts Hook - Main Orchestrator
 * 
 * Refactored from 1,426 lines to 200 lines by extracting focused modules.
 * This hook orchestrates all post-related functionality using the extracted modules.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { devLogger } from '@/utils/developmentLogger';

// Import extracted modules
import { useTabSwitchingBehavior } from './posts/useTabSwitchingBehavior';
import { usePostsCache } from './posts/usePostsCache';
import { usePostsFetching } from './posts/usePostsFetching';
import { usePostsActions } from './posts/usePostsActions';
import { mapPostToCardProps } from './posts/postMapping';
import { enrichCachedPosts } from './posts/postEnrichment';

// Import types
import type { CachedPostType } from '@/features/posts/types/cachedPost';
import type { 
  UseOptimizedCachedPostsReturn, 
  UseOptimizedCachedPostsOptions 
} from './posts/postTypes';

/**
 * Optimized cached posts hook using modular architecture
 * 
 * @param spaceId - Current space ID
 * @param options - Hook options
 * @returns Post data and actions
 */
export function useOptimizedCachedPosts(
  spaceId: string | undefined, 
  _options?: UseOptimizedCachedPostsOptions
): UseOptimizedCachedPostsReturn {
  const { user } = useAuth();
  
  // Core state
  const [posts, setPosts] = useState<CachedPostType[]>([]);
  const [pinnedPosts, setPinnedPosts] = useState<CachedPostType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Refs for tracking
  const hasAutoFetched = useRef<Set<string>>(new Set());
  const subscriberId = useRef(`posts-${spaceId}-${user?.id || 'anonymous'}-${Date.now()}`);
  
  // Track page visibility for mobile optimization
  const pageVisibilityRef = useRef<{
    wasHidden: boolean;
    hiddenTimestamp: number;
    lastActivity: number;
  }>({ wasHidden: false, hiddenTimestamp: 0, lastActivity: Date.now() });
  
  // Idle time detection for space switching issues
  const IDLE_THRESHOLD = 10 * 60 * 1000; // 10 minutes
  const isIdleReturn = useRef(false);
  
  // Initialize extracted modules
  const { trackTabVisit, shouldRefreshOnTabSwitch } = useTabSwitchingBehavior(spaceId);
  
  const {
    checkCache,
    loadFromCache,
    clearCacheForSpaceSwitch,
    hasLoadedFromCacheForSpace,
    invalidateCache,
    scheduleBackgroundRefresh
  } = usePostsCache(spaceId || '', subscriberId.current);
  
  const { fetchPosts, fetchPostsSilently, loadMorePosts } = usePostsFetching({
    spaceId: spaceId || '',
    subscriberId: subscriberId.current,
    setPosts,
    setPinnedPosts,
    setLoading,
    setError,
    setCurrentPage,
    setTotalCount,
    setIsLoadingMore
  });
  
  const {
    handlePostCreated,
    handlePostUpdated,
    handlePostDeleted,
    handleLikeToggled,
    handleCommentAdded,
    handlePinToggled
  } = usePostsActions({
    spaceId: spaceId || '',
    subscriberId: subscriberId.current,
    posts,
    setPosts,
    pinnedPosts,
    setPinnedPosts
  });
  
  // Track user activity for idle detection
  useEffect(() => {
    const handleActivity = () => {
      pageVisibilityRef.current.lastActivity = Date.now();
      isIdleReturn.current = false;
    };
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        pageVisibilityRef.current.wasHidden = true;
        pageVisibilityRef.current.hiddenTimestamp = Date.now();
      } else {
        const timeHidden = Date.now() - pageVisibilityRef.current.hiddenTimestamp;
        if (timeHidden > IDLE_THRESHOLD) {
          isIdleReturn.current = true;
        }
        pageVisibilityRef.current.wasHidden = false;
      }
    };
    
    document.addEventListener('mousedown', handleActivity);
    document.addEventListener('keydown', handleActivity);
    document.addEventListener('visibilitychange', handleVisibilityChange);
  
    return () => {
      document.removeEventListener('mousedown', handleActivity);
      document.removeEventListener('keydown', handleActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [IDLE_THRESHOLD]);

  // Main effect to handle data fetching and caching
  useEffect(() => {
    if (!spaceId || !user?.id) return;

    // Check if this is a space switch
    const isSpaceSwitch = hasAutoFetched.current.size > 0 && !hasAutoFetched.current.has(spaceId);
    
    // Check for cached data first (before any reset)
    const { regular, pinned, hasValidCache } = checkCache(spaceId);
    
    // Reset state for space switch (only if no valid cache)
    const resetStateForSpaceSwitch = () => {
      devLogger.log('CacheDebug', `🔄 [SpaceSwitch] Resetting state for space: ${spaceId}`, { subscriberId: subscriberId.current });
      clearCacheForSpaceSwitch(spaceId);
      setPosts([]);
      setPinnedPosts([]);
      setCurrentPage(1);
      setTotalCount(0);
      setLoading(false);
      setError(null);
    };
    
    if (isSpaceSwitch && !hasValidCache) {
      resetStateForSpaceSwitch();
    }
    
    if (hasValidCache) {
      devLogger.log('CacheDebug', `🔄 [CacheLoad] Loading from cache for space: ${spaceId}`, { subscriberId: subscriberId.current });
      
      // Load from cache
      const loaded = loadFromCache(
        spaceId,
        setPosts,
        setPinnedPosts,
        setCurrentPage,
        setTotalCount,
        setLoading,
        setError
      );
      
      if (loaded) {
        // Enrich cached posts with metadata
        const enrichCachedPostsAsync = async () => {
          try {
            const enrichedPosts = await enrichCachedPosts({
              posts: regular || [],
              spaceId,
              subscriberId: subscriberId.current
            });
            const enrichedPinnedPosts = await enrichCachedPosts({
              posts: pinned || [],
              spaceId,
              subscriberId: subscriberId.current
            });
            
            setPosts(enrichedPosts);
            setPinnedPosts(enrichedPinnedPosts);
          } catch (error) {
            devLogger.warn('CacheDebug', `Failed to enrich cached posts, falling back to fetch`, error);
            // Fallback to regular fetch if enrichment fails
            fetchPosts(1, true);
          }
        };
        
        enrichCachedPostsAsync();
        
        // Track this tab visit
        trackTabVisit(spaceId);
        
        // Skip fetch since we loaded from cache
        return;
      }
    }
    
    // Track this tab visit
    trackTabVisit(spaceId);
    
    // Check if we need to fetch
    const checkCacheAndFetch = async () => {
      try {
        // Skip if already loaded from cache
        if (hasLoadedFromCacheForSpace(spaceId)) {
          devLogger.log('CacheDebug', `🔄 [SpaceSwitch] Skipping fetch - posts already loaded from cache for space: ${spaceId}`);
          return;
        }
        
        // Check for valid cached data
        const { hasValidCache } = checkCache(spaceId);
        
        // Force refresh if returning from idle period
        const shouldForceRefreshForIdle = isIdleReturn.current;
        if (shouldForceRefreshForIdle) {
          devLogger.log('CacheDebug', `🕐 [IdleReturn] Forcing refresh due to idle return for space ${spaceId}`, { subscriberId: subscriberId.current });
          isIdleReturn.current = false;
        }
        
        devLogger.log('CacheDebug', `🔄 [FetchDecision] Cache check result`, {
          spaceId,
          hasValidCache,
          shouldForceRefresh: shouldForceRefreshForIdle,
          subscriberId: subscriberId.current
        });
        
        // Fetch if no valid cache or force refresh
        if (!hasValidCache || shouldForceRefreshForIdle) {
          await fetchPosts(1, true);
    } else {
          // Schedule background refresh to ensure data is fresh
          scheduleBackgroundRefresh(spaceId, () => fetchPostsSilently(1, true));
        }
        
          hasAutoFetched.current.add(spaceId);
        
      } catch (error) {
        devLogger.warn('CacheDebug', `❌ [FetchError] Error in checkCacheAndFetch for space ${spaceId}`, error);
        setError('Failed to load posts');
        setLoading(false);
      }
    };
    
    checkCacheAndFetch();
    
  }, [spaceId, user?.id, checkCache, loadFromCache, clearCacheForSpaceSwitch, hasLoadedFromCacheForSpace, trackTabVisit, fetchPosts, fetchPostsSilently, scheduleBackgroundRefresh]);
  
  // Refetch function
  const refetch = useCallback(async (forceRefresh: boolean = false) => {
    if (!spaceId) return;
    
    devLogger.log('CacheDebug', `🔄 [Refetch] Manual refetch triggered`, {
      spaceId,
      forceRefresh,
      subscriberId: subscriberId.current
    });
    
    if (forceRefresh) {
      invalidateCache(spaceId);
    }
    
    await fetchPosts(1, forceRefresh);
  }, [spaceId, invalidateCache, fetchPosts]);
  
  // Load page function
  const loadPage = useCallback(async (page: number) => {
    if (!spaceId) return;
    
    devLogger.log('CacheDebug', `📄 [LoadPage] Loading page ${page} for space ${spaceId}`, { subscriberId: subscriberId.current });
    
    if (page === 1) {
      await fetchPosts(1, true);
    } else {
      await loadMorePosts(page);
    }
  }, [spaceId, fetchPosts, loadMorePosts]);
  
  // Refresh on tab switch
  const refreshOnTabSwitch = useCallback(async () => {
    if (!spaceId) return;
    
    devLogger.log('CacheDebug', `🔄 [TabSwitch] Tab switch refresh triggered for space ${spaceId}`, { subscriberId: subscriberId.current });
    
    const shouldRefresh = shouldRefreshOnTabSwitch(spaceId);
    if (shouldRefresh) {
      await refetch(true);
    }
  }, [spaceId, shouldRefreshOnTabSwitch, refetch]);

  return {
    posts,
    pinnedPosts,
    loading,
    error,
    refetch,
    totalCount,
    currentPage,
    totalPages: Math.ceil(totalCount / 25),
    hasNextPage: currentPage * 25 < totalCount,
    loadPage,
    isLoadingMore,
    handlePostCreated,
    handlePostUpdated,
    handlePostDeleted,
    handleLikeToggled,
    handleCommentAdded,
    handlePinToggled,
    mapPostToCardProps,
    refreshOnTabSwitch,
  };
}
