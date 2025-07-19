import { log } from '@/utils/logger';
/**
 * Cache utilities for instant space redirects
 * Provides cache warming and validation for optimal user experience
 */

import { QueryClient } from '@tanstack/react-query';
import { CACHE_KEYS, CACHE_TTL, INVALIDATION_PATTERNS } from './cacheKeys';

export interface CachedSpaceInfo {
  id: string;
  name: string;
  subdomain: string;
  timestamp: number;
  userId?: string; // Add user ID to prevent cross-user pollution
}

// ENHANCED: Global cache operation tracking with immediate deduplication
let recentCacheOperations = new Set<string>();
let lastCacheWarmTime = new Map<string, number>();
let pendingCacheOperations = new Map<string, Promise<void>>();

/**
 * Warm cache with space information for instant future redirects
 */
export function warmSpaceCache(spaceData: {
  id: string;
  name: string;
  subdomain: string;
}, userId?: string): void {
  try {
    // ENHANCED: More aggressive redundancy prevention with multi-level checks
    const cacheKey = `warm_${spaceData.id}_${spaceData.subdomain}_${userId || 'anonymous'}`;
    const globalKey = `global_${spaceData.subdomain}_${userId || 'anonymous'}`;
    const now = Date.now();
    
    // LEVEL 1: Check if exact same operation is already pending
    if (pendingCacheOperations.has(cacheKey)) {
      return; // Silently skip if exact operation is pending
    }
    
    // LEVEL 2: Check if we've warmed this cache recently (within 30 seconds)
    const lastWarmTime = lastCacheWarmTime.get(cacheKey);
    if (lastWarmTime && (now - lastWarmTime) < 30000) {
      return; // Silently skip recent operations
    }
    
    // LEVEL 3: Check ongoing operations for any variant of this space
    if (recentCacheOperations.has(globalKey)) {
      return; // Silently skip if any operation for this space is ongoing
    }
    
    // LEVEL 4: Check if cache data is already fresh to prevent unnecessary writes
    const cacheKeyWithUser = userId ? `lastActiveSpace_${userId}` : 'lastActiveSpace';
    const existingCache = localStorage.getItem(cacheKeyWithUser);
    if (existingCache) {
      try {
        const existing = JSON.parse(existingCache);
        if (existing.id === spaceData.id && existing.subdomain === spaceData.subdomain) {
          // Only update if it's been more than 2 minutes (reduced from 5)
          if (existing.timestamp && (now - existing.timestamp) < (2 * 60 * 1000)) {
            return; // Silently skip if cache is fresh
          }
        }
      } catch (e) {
        // Continue with cache update if parsing fails
      }
    }
    
    // Mark operation to prevent redundancy
    recentCacheOperations.add(globalKey);
    lastCacheWarmTime.set(cacheKey, now);
    
    // Create and track the pending operation
    const operation = performCacheWarm(spaceData, now, userId);
    pendingCacheOperations.set(cacheKey, operation);
    
    // Clean up tracking after operation completes
    operation.finally(() => {
      pendingCacheOperations.delete(cacheKey);
      // Clear the flags after 5 seconds (reduced from 10)
      setTimeout(() => {
        recentCacheOperations.delete(globalKey);
      }, 5000);
    });
    
  } catch (error) {
    log.warn('Utils', 'Cache warming error:', error);
  }
}

/**
 * Perform the actual cache warming operation
 */
async function performCacheWarm(spaceData: {
  id: string;
  name: string;
  subdomain: string;
}, timestamp: number, userId?: string): Promise<void> {
  try {
    const cacheData: CachedSpaceInfo = {
      id: spaceData.id,
      name: spaceData.name,
      subdomain: spaceData.subdomain,
      timestamp: timestamp,
      userId: userId // Include user ID to prevent cross-user pollution
    };
    
    // Store in user-specific cache location
    const cacheKey = userId ? `lastActiveSpace_${userId}` : 'lastActiveSpace';
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    
    // Store ownership/membership flags with user ID
    if (spaceData.subdomain && userId) {
      localStorage.setItem(`user_owns_space_${spaceData.subdomain}_${userId}`, 'true');
      localStorage.setItem(`joined_space_${spaceData.subdomain}_${userId}`, JSON.stringify({
        spaceId: spaceData.id,
        name: spaceData.name,
        subdomain: spaceData.subdomain,
        joinedAt: timestamp,
        userId: userId
      }));
    }
    
    // REDUCED LOGGING: Only log once per space per session to minimize noise
    const sessionKey = `cache_logged_${spaceData.subdomain}_${userId || 'anonymous'}`;
    if (!sessionStorage.getItem(sessionKey)) {
      log.debug('Utils', '🚀 [CacheUtils] Cache initialized for:', spaceData.name);
      sessionStorage.setItem(sessionKey, 'true');
    }
    
  } catch (error) {
    log.warn('Utils', 'Cache warming storage error:', error);
  }
}

/**
 * Check if cache contains valid data for a subdomain
 */
export function hasValidCache(subdomain: string, userId?: string): boolean {
  try {
    const cacheKey = userId ? `lastActiveSpace_${userId}` : 'lastActiveSpace';
    const lastActiveSpace = localStorage.getItem(cacheKey);
    if (!lastActiveSpace) return false;
    
    const space = JSON.parse(lastActiveSpace);
    if (!space || space.subdomain !== subdomain) return false;
    
    // Verify user match to prevent cross-user cache access
    if (userId && space.userId && space.userId !== userId) return false;
    
    // Check 5-minute TTL
    const isValid = space.timestamp && (Date.now() - space.timestamp) < (5 * 60 * 1000);
    return isValid;
  } catch (error) {
    return false;
  }
}

/**
 * Clear space cache (called on logout)
 */
export function clearSpaceCache(): void {
  try {
    // Clear all variants of space cache
    const keysToRemove = [
      'lastActiveSpace',
      'lastVisitedSpace',
      'lastJoinedSpace'
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    
    // Clear all user-specific and dynamic cache entries
    const localStorageKeys = Object.keys(localStorage);
    const sessionStorageKeys = Object.keys(sessionStorage);
    
    [...localStorageKeys, ...sessionStorageKeys].forEach(key => {
      if (
        // PERSISTENT CACHE PROTECTION: Never clear PERSISTENT_ prefixed cache
        key.startsWith('PERSISTENT_') ||
        
        // Regular cache patterns (but protect persistent cache)
        (key.startsWith('user_owns_space_') && !key.startsWith('PERSISTENT_')) ||
        (key.startsWith('joined_space_') && !key.startsWith('PERSISTENT_')) ||
        (key.startsWith('lastActiveSpace_') && !key.startsWith('PERSISTENT_')) ||
        (key.startsWith('cache_logged_') && !key.startsWith('PERSISTENT_')) ||
        (key.startsWith('user_member_') && !key.startsWith('PERSISTENT_')) ||
        (key.startsWith('space_data_') && !key.startsWith('PERSISTENT_')) ||
        (key.includes('_spaces_') && !key.startsWith('PERSISTENT_')) ||
        (key.includes('_space_') && !key.startsWith('PERSISTENT_'))
      ) {
        // SKIP if it's a persistent cache key
        if (key.startsWith('PERSISTENT_')) {
          return; // Don't clear persistent cache
        }
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      }
    });
    
    // ENHANCED: Clear all tracking maps and pending operations
    recentCacheOperations.clear();
    lastCacheWarmTime.clear();
    pendingCacheOperations.clear();
    
    log.debug('Utils', '🚀 [CacheUtils] Cleared all space cache data');
  } catch (error) {
    log.warn('Utils', 'Failed to clear space cache:', error);
  }
}

/**
 * Get cached space info if valid
 */
export function getCachedSpaceInfo(userId?: string): CachedSpaceInfo | null {
  try {
    const cacheKey = userId ? `lastActiveSpace_${userId}` : 'lastActiveSpace';
    const lastActiveSpace = localStorage.getItem(cacheKey);
    if (!lastActiveSpace) return null;
    
    const space = JSON.parse(lastActiveSpace);
    if (!space) return null;
    
    // Verify user match to prevent cross-user cache access
    if (userId && space.userId && space.userId !== userId) return null;
    
    // Check 5-minute TTL
    const isValid = space.timestamp && (Date.now() - space.timestamp) < (5 * 60 * 1000);
    if (!isValid) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    return space;
  } catch (error) {
    return null;
  }
}

/**
 * Enhanced Cache Utility Functions
 * Provides optimized cache management and invalidation strategies
 */

// Cache invalidation helpers
export const cacheInvalidation = {
  /**
   * Invalidate post-related caches when post is updated
   */
  invalidatePostUpdate: async (queryClient: QueryClient, postId: string, spaceId: string) => {
    const keysToInvalidate = INVALIDATION_PATTERNS.onPostUpdate(postId, spaceId);
    await Promise.all(
      keysToInvalidate.map(key => queryClient.invalidateQueries({ queryKey: key }))
    );
  },

  /**
   * Invalidate comment-related caches when comment is added
   */
  invalidateCommentAdd: async (queryClient: QueryClient, postId: string, spaceId: string) => {
    const keysToInvalidate = INVALIDATION_PATTERNS.onCommentAdd(postId, spaceId);
    await Promise.all(
      keysToInvalidate.map(key => queryClient.invalidateQueries({ queryKey: key }))
    );
  },

  /**
   * Invalidate like-related caches when like is toggled
   */
  invalidateLikeToggle: async (queryClient: QueryClient, postId: string, userId: string) => {
    const keysToInvalidate = INVALIDATION_PATTERNS.onLikeToggle(postId, userId);
    await Promise.all(
      keysToInvalidate.map(key => queryClient.invalidateQueries({ queryKey: key }))
    );
  },

  /**
   * Clear all caches for a specific space
   */
  clearSpaceCache: async (queryClient: QueryClient, spaceId: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: CACHE_KEYS.posts.bySpace(spaceId) }),
      queryClient.invalidateQueries({ queryKey: CACHE_KEYS.spaces.byId(spaceId) }),
      queryClient.invalidateQueries({ queryKey: CACHE_KEYS.spaces.members(spaceId) }),
      queryClient.invalidateQueries({ queryKey: CACHE_KEYS.spaces.categories(spaceId) }),
    ]);
  },

  /**
   * Clear all user-related caches
   */
  clearUserCache: async (queryClient: QueryClient, userId: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: CACHE_KEYS.users.byId(userId) }),
      queryClient.invalidateQueries({ queryKey: CACHE_KEYS.posts.byUser(userId) }),
      queryClient.invalidateQueries({ queryKey: CACHE_KEYS.comments.byUser(userId) }),
      queryClient.invalidateQueries({ queryKey: CACHE_KEYS.likes.byUser(userId) }),
    ]);
  },
};

// Optimistic update helpers
export const optimisticUpdates = {
  /**
   * Optimistically update post like count
   */
  updatePostLike: (queryClient: QueryClient, postId: string, userId: string, isLiked: boolean, currentCount: number) => {
    const likeStatusKey = CACHE_KEYS.likes.postLikeStatus(postId, userId);
    const postKey = CACHE_KEYS.posts.byId(postId);

    // Update like status
    queryClient.setQueryData(likeStatusKey, isLiked);

    // Update post like count
    queryClient.setQueryData(postKey, (oldData: any) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        like_count: isLiked ? currentCount + 1 : Math.max(0, currentCount - 1),
      };
    });

    // Return rollback function
    return () => {
      queryClient.setQueryData(likeStatusKey, !isLiked);
      queryClient.setQueryData(postKey, (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          like_count: currentCount,
        };
      });
    };
  },

  /**
   * Optimistically update comment count
   */
  updateCommentCount: (queryClient: QueryClient, postId: string, newCount: number) => {
    const postKey = CACHE_KEYS.posts.byId(postId);
    
    const oldData = queryClient.getQueryData(postKey);
    
    queryClient.setQueryData(postKey, (currentData: any) => {
      if (!currentData) return currentData;
      return {
        ...currentData,
        comment_count: newCount,
      };
    });

    // Return rollback function
    return () => {
      queryClient.setQueryData(postKey, oldData);
    };
  },

  /**
   * Optimistically add new comment to comments list
   */
  addComment: (queryClient: QueryClient, postId: string, newComment: any) => {
    const commentsKey = CACHE_KEYS.comments.byPost(postId);
    
    const oldData = queryClient.getQueryData(commentsKey);
    
    queryClient.setQueryData(commentsKey, (currentData: any) => {
      // Handle infinite query structure with pages
      if (currentData?.pages) {
        return {
          ...currentData,
          pages: currentData.pages.map((page: any, index: number) => {
            // Add to the last page
            if (index === currentData.pages.length - 1) {
              return {
                ...page,
                comments: [...(page.comments || []), newComment],
              };
            }
            return page;
          }),
        };
      }
      
      // Fallback for direct array structure (if any legacy code still uses it)
      if (Array.isArray(currentData)) {
        return [...currentData, newComment];
      }
      
      // If no data exists, create initial structure
      return {
        pages: [{
          comments: [newComment],
          nextCursor: undefined,
        }],
        pageParams: [0],
      };
    });

    // Return rollback function
    return () => {
      queryClient.setQueryData(commentsKey, oldData);
    };
  },
};

// Cache prefetching strategies
export const prefetchStrategies = {
  /**
   * Prefetch post details when user hovers over post card
   */
  prefetchPost: async (queryClient: QueryClient, postId: string, fetchFn: () => Promise<any>) => {
    const cacheKey = CACHE_KEYS.posts.byId(postId);
    
    // Only prefetch if not already cached
    if (!queryClient.getQueryData(cacheKey)) {
      await queryClient.prefetchQuery({
        queryKey: cacheKey,
        queryFn: fetchFn,
        staleTime: CACHE_TTL.posts,
      });
    }
  },

  /**
   * Prefetch comments when post modal is likely to be opened
   */
  prefetchComments: async (queryClient: QueryClient, postId: string, fetchFn: () => Promise<any>) => {
    const cacheKey = CACHE_KEYS.comments.byPost(postId);
    
    if (!queryClient.getQueryData(cacheKey)) {
      await queryClient.prefetchQuery({
        queryKey: cacheKey,
        queryFn: fetchFn,
        staleTime: CACHE_TTL.comments,
      });
    }
  },

  /**
   * Prefetch user profile data
   */
  prefetchUser: async (queryClient: QueryClient, userId: string, fetchFn: () => Promise<any>) => {
    const cacheKey = CACHE_KEYS.users.byId(userId);
    
    if (!queryClient.getQueryData(cacheKey)) {
      await queryClient.prefetchQuery({
        queryKey: cacheKey,
        queryFn: fetchFn,
        staleTime: CACHE_TTL.userProfiles,
      });
    }
  },
};

// Cache health monitoring
export const cacheHealth = {
  /**
   * Get cache statistics
   */
  getStats: (queryClient: QueryClient) => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    const stats = {
      totalQueries: queries.length,
      activeQueries: queries.filter(q => q.isActive()).length,
      staleQueries: queries.filter(q => q.isStale()).length,
      errorQueries: queries.filter(q => q.state.status === 'error').length,
      cacheSize: JSON.stringify(cache).length,
    };

    return stats;
  },

  /**
   * Clear stale cache entries
   */
  clearStaleCache: async (queryClient: QueryClient) => {
    const cache = queryClient.getQueryCache();
    const staleQueries = cache.getAll().filter(q => q.isStale());
    
    await Promise.all(
      staleQueries.map(query => 
        queryClient.invalidateQueries({ queryKey: query.queryKey })
      )
    );

    return staleQueries.length;
  },

  /**
   * Memory usage warning
   */
  checkMemoryUsage: (queryClient: QueryClient, maxSizeMB = 50) => {
    const stats = cacheHealth.getStats(queryClient);
    const sizeMB = stats.cacheSize / (1024 * 1024);
    
    if (sizeMB > maxSizeMB) {
      log.warn('Utils', `🚨 Cache size warning: ${sizeMB.toFixed(2)}MB exceeds limit of ${maxSizeMB}MB`);
      return true;
    }
    
    return false;
  },
};

// Cache debugging utilities
export const cacheDebug = {
  /**
   * Log cache hit/miss for debugging
   */
  logCacheAccess: (key: string, hit: boolean, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      log.debug('Utils', 
        `📦 Cache ${hit ? 'HIT' : 'MISS'}: ${JSON.stringify(key)}`,
        data ? `(${Object.keys(data).length} keys)` : ''
      );
    }
  },

  /**
   * Visualize cache state for debugging
   */
  visualizeCache: (queryClient: QueryClient) => {
    if (process.env.NODE_ENV === 'development') {
      const cache = queryClient.getQueryCache();
      const queries = cache.getAll();
      
      log.group('Utils', '🔍 Cache State Visualization');
      queries.forEach(query => {
        log.debug('Utils', `${query.queryKey.join('/')}:`, {
          status: query.state.status,
          dataUpdateCount: query.state.dataUpdateCount,
          isStale: query.isStale(),
          lastUpdated: new Date(query.state.dataUpdatedAt).toLocaleTimeString(),
        });
      });
      log.groupEnd();
    }
  },
}; 