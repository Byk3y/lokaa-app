import { log } from '@/utils/logger';
import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { prefetchStrategies } from '@/utils/cacheUtils';
import { CACHE_KEYS } from '@/utils/cacheKeys';
import { getSupabaseClient } from '@/integrations/supabase/client';

/**
 * Hook for intelligent hover-based prefetching
 * Preloads data when user hovers over interactive elements
 */
export function useHoverPrefetch() {
  const queryClient = useQueryClient();
  const prefetchTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Clear timeout when component unmounts
  const clearPrefetchTimeout = useCallback((key: string) => {
    const timeout = prefetchTimeouts.current.get(key);
    if (timeout) {
      clearTimeout(timeout);
      prefetchTimeouts.current.delete(key);
    }
  }, []);

  // Prefetch post details on hover
  const prefetchPost = useCallback((postId: string, delay = 150) => {
    const timeoutKey = `post-${postId}`;
    
    // Clear any existing timeout
    clearPrefetchTimeout(timeoutKey);
    
    // Set new timeout for prefetching
    const timeout = setTimeout(async () => {
      try {
        await prefetchStrategies.prefetchPost(
          queryClient,
          postId,
          async () => {
            const { data, error } = await getSupabaseClient()
              .from('posts')
              .select(`
                id,
                created_at,
                content,
                title,
                like_count,
                comment_count,
                user_id,
                space_id,
                media_urls,
                is_pinned,
                pinned_at,
                pin_position,
                pin_category,
                edited_at,
                poll_data,
                slug,
                category:space_categories!left (id, name, icon)
              `)
              .eq('id', postId)
              .single();
              
            if (error) throw error;
            return data;
          }
        );
      } catch (error) {
        log.warn('Hook', `Failed to prefetch post ${postId}:`, error);
      }
    }, delay);
    
    prefetchTimeouts.current.set(timeoutKey, timeout);
  }, [queryClient, clearPrefetchTimeout]);

  // Prefetch comments on hover
  const prefetchComments = useCallback((postId: string, delay = 200) => {
    const timeoutKey = `comments-${postId}`;
    
    clearPrefetchTimeout(timeoutKey);
    
    const timeout = setTimeout(async () => {
      try {
        await prefetchStrategies.prefetchComments(
          queryClient,
          postId,
          async () => {
            const { data, error } = await getSupabaseClient()
              .from('comments')
              .select(`
                id,
                content,
                created_at,
                user_id,
                post_id,
                space_id,
                like_count,
                reply_count
              `)
              .eq('post_id', postId)
              .order('created_at', { ascending: true })
              .limit(10); // Prefetch first 10 comments only
              
            if (error) throw error;
            return data || [];
          }
        );
      } catch (error) {
        log.warn('Hook', `Failed to prefetch comments for post ${postId}:`, error);
      }
    }, delay);
    
    prefetchTimeouts.current.set(timeoutKey, timeout);
  }, [queryClient, clearPrefetchTimeout]);

  // Prefetch user profile on hover
  const prefetchUser = useCallback((userId: string, delay = 100) => {
    const timeoutKey = `user-${userId}`;
    
    clearPrefetchTimeout(timeoutKey);
    
    const timeout = setTimeout(async () => {
      try {
        await prefetchStrategies.prefetchUser(
          queryClient,
          userId,
          async () => {
            const { data, error } = await getSupabaseClient()
              .from('users')
              .select('id, full_name, avatar_url, profile_url, activity_score')
              .eq('id', userId)
              .single();
              
            if (error) throw error;
            return data;
          }
        );
      } catch (error) {
        log.warn('Hook', `Failed to prefetch user ${userId}:`, error);
      }
    }, delay);
    
    prefetchTimeouts.current.set(timeoutKey, timeout);
  }, [queryClient, clearPrefetchTimeout]);

  // Cancel prefetch when hover ends
  const cancelPrefetch = useCallback((type: 'post' | 'comments' | 'user', id: string) => {
    const timeoutKey = `${type}-${id}`;
    clearPrefetchTimeout(timeoutKey);
  }, [clearPrefetchTimeout]);

  // Intelligent prefetch that decides what to prefetch based on context
  const smartPrefetch = useCallback((context: {
    postId?: string;
    userId?: string;
    prefetchComments?: boolean;
    prefetchUser?: boolean;
    delays?: {
      post?: number;
      comments?: number;
      user?: number;
    };
  }) => {
    const { postId, userId, prefetchComments: shouldPrefetchComments, prefetchUser: shouldPrefetchUser, delays = {} } = context;
    
    if (postId) {
      prefetchPost(postId, delays.post);
      
      if (shouldPrefetchComments) {
        prefetchComments(postId, delays.comments);
      }
    }
    
    if (userId && shouldPrefetchUser) {
      prefetchUser(userId, delays.user);
    }
  }, [prefetchPost, prefetchComments, prefetchUser]);

  // Check if data is already cached
  const isCached = useCallback((type: 'post' | 'comments' | 'user', id: string) => {
    let cacheKey;
    
    switch (type) {
      case 'post':
        cacheKey = CACHE_KEYS.posts.byId(id);
        break;
      case 'comments':
        cacheKey = CACHE_KEYS.comments.byPost(id);
        break;
      case 'user':
        cacheKey = CACHE_KEYS.users.byId(id);
        break;
      default:
        return false;
    }
    
    return !!queryClient.getQueryData(cacheKey);
  }, [queryClient]);

  // Get prefetch event handlers for easy use in components
  const getPrefetchHandlers = useCallback((context: Parameters<typeof smartPrefetch>[0]) => {
    return {
      onMouseEnter: () => smartPrefetch(context),
      onMouseLeave: () => {
        if (context.postId) {
          cancelPrefetch('post', context.postId);
          if (context.prefetchComments) {
            cancelPrefetch('comments', context.postId);
          }
        }
        if (context.userId && context.prefetchUser) {
          cancelPrefetch('user', context.userId);
        }
      },
    };
  }, [smartPrefetch, cancelPrefetch]);

  return {
    prefetchPost,
    prefetchComments,
    prefetchUser,
    cancelPrefetch,
    smartPrefetch,
    isCached,
    getPrefetchHandlers,
  };
} 