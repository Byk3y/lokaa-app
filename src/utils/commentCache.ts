/**
 * 🚀 PHASE 3: Advanced Comment Data Caching Strategy
 * 
 * Provides intelligent caching, cache warming, and invalidation for comment data
 * Integrates with TanStack Query infrastructure for optimal performance
 */

import { QueryClient } from '@tanstack/react-query';
import { CACHE_KEYS, CACHE_TTL } from '@/utils/cacheKeys';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { isValidUUID } from '@/utils/uuid';

// Types
interface CommentCacheEntry {
  postId: string;
  commentCount: number;
  hasAvatars: boolean;
  lastUpdated: number;
  priority: 'high' | 'normal' | 'low';
}

interface CommentCacheOptions {
  warmAvatars?: boolean;
  warmComments?: boolean;
  priority?: 'high' | 'normal' | 'low';
  maxAge?: number;
}

interface PreloadResult {
  success: boolean;
  postId: string;
  loadTime: number;
  fromCache: boolean;
  error?: string;
}

class CommentCacheManager {
  private queryClient: QueryClient | null = null;
  private cacheRegistry = new Map<string, CommentCacheEntry>();
  private preloadQueue = new Set<string>();
  private isPreloading = false;

  /**
   * Initialize with QueryClient instance
   */
  init(queryClient: QueryClient) {
    this.queryClient = queryClient;
    console.log('🎯 [CommentCache] Initialized with TanStack Query client');
  }

  /**
   * 🔥 PHASE 3: Smart cache warming for frequently accessed posts
   */
  async warmCommentCache(
    postIds: string[], 
    options: CommentCacheOptions = {}
  ): Promise<PreloadResult[]> {
    if (!this.queryClient) {
      console.warn('🎯 [CommentCache] QueryClient not initialized');
      return [];
    }

    const { warmAvatars = true, warmComments = false, priority = 'normal' } = options;
    const results: PreloadResult[] = [];

    console.log(`🎯 [CommentCache] Warming cache for ${postIds.length} posts (avatars: ${warmAvatars}, comments: ${warmComments})`);

    for (const postId of postIds) {
      const startTime = Date.now();
      
      try {
        // Check if already cached
        const avatarCacheKey = ['comment-avatars', postId, 5];
        const existingAvatarData = this.queryClient.getQueryData(avatarCacheKey);
        const fromCache = !!existingAvatarData;

        if (!fromCache && warmAvatars) {
          // Preload avatar data
          await this.queryClient.prefetchQuery({
            queryKey: avatarCacheKey,
            queryFn: () => this.fetchCommentAvatars(postId, 5),
            staleTime: 2 * 60 * 1000, // 2 minutes
          });
        }

        if (warmComments) {
          // Preload comment data
          const commentCacheKey = CACHE_KEYS.comments.byPost(postId);
          const existingCommentData = this.queryClient.getQueryData(commentCacheKey);
          
          if (!existingCommentData) {
            await this.queryClient.prefetchInfiniteQuery({
              queryKey: commentCacheKey,
              queryFn: ({ pageParam = 0 }) => this.fetchComments(postId, pageParam),
              staleTime: 5 * 60 * 1000, // 5 minutes
              initialPageParam: 0,
            });
          }
        }

        // Register in cache registry
        this.cacheRegistry.set(postId, {
          postId,
          commentCount: 0, // Will be updated by actual data
          hasAvatars: warmAvatars,
          lastUpdated: Date.now(),
          priority
        });

        results.push({
          success: true,
          postId,
          loadTime: Date.now() - startTime,
          fromCache
        });

      } catch (error) {
        console.error(`🎯 [CommentCache] Failed to warm cache for post ${postId}:`, error);
        results.push({
          success: false,
          postId,
          loadTime: Date.now() - startTime,
          fromCache: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log(`🎯 [CommentCache] Cache warming complete: ${results.filter(r => r.success).length}/${results.length} successful`);
    return results;
  }

  /**
   * 🔄 PHASE 3: Intelligent cache invalidation for comment updates
   */
  invalidatePostComments(postId: string, reason: 'new_comment' | 'comment_updated' | 'comment_deleted' = 'new_comment') {
    if (!this.queryClient) return;

    console.log(`🔄 [CommentCache] Invalidating cache for post ${postId} (reason: ${reason})`);

    // Invalidate avatar cache immediately
    this.queryClient.invalidateQueries({
      queryKey: ['comment-avatars', postId]
    });

    // Invalidate comment data cache
    this.queryClient.invalidateQueries({
      queryKey: CACHE_KEYS.comments.byPost(postId)
    });

    // Update registry
    this.cacheRegistry.delete(postId);

    // If new comment, also invalidate comment counts
    if (reason === 'new_comment') {
      this.queryClient.invalidateQueries({
        queryKey: ['comment-counts', postId]
      });
    }
  }

  /**
   * 🚀 PHASE 3: Background cache refresh for stale data
   */
  async backgroundRefresh(postIds: string[]) {
    if (!this.queryClient || this.isPreloading) return;
    
    this.isPreloading = true;
    
    try {
      console.log(`🔄 [CommentCache] Background refresh for ${postIds.length} posts`);
      
      for (const postId of postIds) {
        const entry = this.cacheRegistry.get(postId);
        const isStale = entry && (Date.now() - entry.lastUpdated) > (5 * 60 * 1000); // 5 minutes
        
        if (isStale) {
          // Refresh avatar cache in background
          this.queryClient.invalidateQueries({
            queryKey: ['comment-avatars', postId],
            refetchType: 'none' // Don't refetch immediately
          });
          
          // Update registry
          if (entry) {
            entry.lastUpdated = Date.now();
          }
        }
      }
    } catch (error) {
      console.error('🔄 [CommentCache] Background refresh failed:', error);
    } finally {
      this.isPreloading = false;
    }
  }

  /**
   * 📊 PHASE 3: Cache statistics and monitoring
   */
  getCacheStats() {
    if (!this.queryClient) return null;

    const cache = this.queryClient.getQueryCache();
    const queries = cache.getAll();
    
    const commentQueries = queries.filter(q => 
      q.queryKey[0] === 'comment-avatars' || 
      q.queryKey[0] === 'comments'
    );

    const avatarQueries = queries.filter(q => q.queryKey[0] === 'comment-avatars');
    const commentDataQueries = queries.filter(q => q.queryKey[0] === 'comments');

    return {
      totalCommentQueries: commentQueries.length,
      avatarQueries: avatarQueries.length,
      commentDataQueries: commentDataQueries.length,
      activeQueries: commentQueries.filter(q => q.isActive()).length,
      staleQueries: commentQueries.filter(q => q.isStale()).length,
      registrySize: this.cacheRegistry.size,
      memoryUsage: JSON.stringify(commentQueries).length,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * 🧹 PHASE 3: Cache cleanup for memory optimization
   */
  cleanupStaleCache(maxAge: number = 10 * 60 * 1000) { // 10 minutes default
    if (!this.queryClient) return;

    const cache = this.queryClient.getQueryCache();
    const now = Date.now();
    let cleanedCount = 0;

    // Clean query cache
    cache.getAll().forEach(query => {
      if ((query.queryKey[0] === 'comment-avatars' || query.queryKey[0] === 'comments') &&
          query.state.dataUpdatedAt && (now - query.state.dataUpdatedAt) > maxAge) {
        cache.remove(query);
        cleanedCount++;
      }
    });

    // Clean registry
    const registryBefore = this.cacheRegistry.size;
    this.cacheRegistry.forEach((entry, postId) => {
      if ((now - entry.lastUpdated) > maxAge) {
        this.cacheRegistry.delete(postId);
      }
    });

    console.log(`🧹 [CommentCache] Cleanup completed: ${cleanedCount} queries, ${registryBefore - this.cacheRegistry.size} registry entries removed`);
  }

  /**
   * Helper method to fetch comment avatars
   */
  private async fetchCommentAvatars(postId: string, maxCommenters: number) {
    // 🛡️ VALIDATION: Check for valid UUID format to prevent 400 errors
    if (!isValidUUID(postId)) {
      console.log(`📭 [CommentCache] Skipping invalid post ID: ${postId}`);
      return [];
    }

    // 🐛 FIX: Use separate query approach to resolve 400 error
    // First get comment user IDs
    const { data: comments, error: commentsError } = await getSupabaseClient()
      .from('post_comments')
      .select('user_id, created_at')
      .eq('post_id', postId)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: false })
      .limit(maxCommenters * 2);

    if (commentsError) {
      // Don't throw error, just log and return empty array
      console.log(`📭 [CommentCache] No comments found for post ${postId}:`, commentsError.message);
      return [];
    }
    
    if (!comments || comments.length === 0) {
      console.log(`📭 [CommentCache] No comments found for post ${postId}`);
      return [];
    }

    // Get unique user IDs (most recent first)
    const uniqueUserIds = [...new Set(comments.map(c => c.user_id))].slice(0, maxCommenters);
    if (uniqueUserIds.length === 0) return [];

    // Now get user data for these user IDs
    const { data: users, error: usersError } = await getSupabaseClient()
      .from('users')
      .select('id, full_name, avatar_url')
      .in('id', uniqueUserIds);

    if (usersError) {
      console.log(`📭 [CommentCache] Failed to fetch users for post ${postId}:`, usersError.message);
      return [];
    }
    
    if (!users || users.length === 0) return [];

    // Convert to expected format
    return users.map(user => ({
      id: user.id,
      name: user.full_name,
      avatar: user.avatar_url
    }));
  }

  /**
   * Helper method to fetch comments
   */
  private async fetchComments(postId: string, pageParam: number) {
    // 🛡️ VALIDATION: Check for valid UUID format to prevent 400 errors
    if (!isValidUUID(postId)) {
      console.log(`📭 [CommentCache] Skipping invalid post ID: ${postId}`);
      return {
        comments: [],
        nextCursor: undefined,
      };
    }

    const limit = 20;
    const offset = pageParam * limit;
    
    // 🐛 FIX: Use separate query approach to avoid 400 errors
    // First get comment data without user join
    const { data: comments, error: commentsError } = await getSupabaseClient()
      .from('post_comments')
      .select('id, content, created_at, user_id, post_id, space_id, parent_comment_id')
      .eq('post_id', postId)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);
      
    if (commentsError) {
      console.log(`📭 [CommentCache] Failed to fetch comments for post ${postId}:`, commentsError.message);
      return {
        comments: [],
        nextCursor: undefined,
      };
    }
    
    if (!comments || comments.length === 0) {
      return {
        comments: [],
        nextCursor: undefined,
      };
    }

    // Get unique user IDs for author data
    const uniqueUserIds = [...new Set(comments.map(c => c.user_id))];
    
    // Fetch user data separately
    const { data: users, error: usersError } = await getSupabaseClient()
      .from('users')
      .select('id, full_name, avatar_url')
      .in('id', uniqueUserIds);

    if (usersError) {
      console.warn('🚨 [CommentCache] Failed to fetch user data, proceeding with comments only:', usersError);
    }

    // Create user lookup map
    const userMap = new Map((users || []).map(user => [user.id, user]));

    // Combine comment data with user data
    const enrichedComments = comments.map(comment => ({
      ...comment,
      author: userMap.get(comment.user_id) || {
        id: comment.user_id,
        full_name: 'Unknown User',
        avatar_url: null
      },
      like_count: [] // Initialize empty for now, will be populated by likes hook
    }));
    
    return {
      comments: enrichedComments,
      nextCursor: enrichedComments.length === limit ? pageParam + 1 : undefined,
    };
  }
}

// Export singleton instance
export const commentCacheManager = new CommentCacheManager();

// Export utility functions
export const commentCache = {
  /**
   * Initialize comment cache with QueryClient
   */
  init: (queryClient: QueryClient) => commentCacheManager.init(queryClient),

  /**
   * Warm cache for posts in viewport
   */
  warmCache: (postIds: string[], options?: CommentCacheOptions) => 
    commentCacheManager.warmCommentCache(postIds, options),

  /**
   * Invalidate cache when comments change
   */
  invalidate: (postId: string, reason?: 'new_comment' | 'comment_updated' | 'comment_deleted') => 
    commentCacheManager.invalidatePostComments(postId, reason),

  /**
   * Background refresh for performance
   */
  backgroundRefresh: (postIds: string[]) => commentCacheManager.backgroundRefresh(postIds),

  /**
   * Get cache statistics
   */
  getStats: () => commentCacheManager.getCacheStats(),

  /**
   * Cleanup stale cache entries
   */
  cleanup: (maxAge?: number) => commentCacheManager.cleanupStaleCache(maxAge),
};

// 🔧 Debug utilities for development
if (typeof window !== 'undefined') {
  (window as any).commentCacheDebug = {
    getStats: () => commentCache.getStats(),
    cleanup: () => commentCache.cleanup(),
    warmCache: (postIds: string[]) => commentCache.warmCache(postIds),
    manager: commentCacheManager
  };
} 