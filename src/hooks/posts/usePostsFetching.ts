/**
 * 🎯 Posts Fetching - Data Fetching & Retry Logic
 * 
 * Extracted from useOptimizedCachedPosts.ts to handle data fetching,
 * retry mechanisms, and error handling for posts.
 */

import { useCallback } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { globalCache } from '@/utils/globalCacheCoordinator';
import { devLogger } from '@/utils/developmentLogger';
import { enrichPostsWithMetadata } from './postEnrichment';
import type { CachedPostType } from '@/features/posts/types/cachedPost';
import type { FetchingParams } from './postTypes';

/**
 * Posts fetching hook with retry logic and error handling
 * 
 * @param params - Fetching parameters
 * @returns Fetching utilities
 */
export function usePostsFetching(params: FetchingParams) {
  const {
    spaceId,
    subscriberId,
    setPosts,
    setPinnedPosts,
    setLoading,
    setError,
    setCurrentPage,
    setTotalCount,
    setIsLoadingMore
  } = params;

  // Silent fetch (doesn't affect loading state)
  const fetchPostsSilently = useCallback(async (page: number = 1, forceRefresh: boolean = false) => {
    if (!spaceId) return;

    try {
      devLogger.log('CacheDebug', `🔄 [SilentFetch] Starting silent fetch for space ${spaceId}`, {
        page,
        forceRefresh,
        subscriberId
      });

      const offset = (page - 1) * 25;
      
      // Fetch regular posts
      const { data: regularPosts, error: regularError } = await getSupabaseClient()!
        .from('posts')
        .select(`
          id, created_at, content, title, like_count, comment_count, 
          user_id, space_id, media_urls, category_id, is_pinned, 
          pinned_at, pin_position, pin_category, edited_at, poll_data, slug
        `)
        .eq('space_id', spaceId)
        .eq('is_pinned', false)
        .neq('post_type', 'course_page')
        .order('created_at', { ascending: false })
        .range(offset, offset + 24);

      if (regularError) throw regularError;

      // Fetch pinned posts
      const { data: pinnedPosts, error: pinnedError } = await getSupabaseClient()!
        .from('posts')
        .select(`
          id, created_at, content, title, like_count, comment_count, 
          user_id, space_id, media_urls, category_id, is_pinned, 
          pinned_at, pin_position, pin_category, edited_at, poll_data, slug
        `)
        .eq('space_id', spaceId)
        .eq('is_pinned', true)
        .order('pin_position', { ascending: true });

      if (pinnedError) throw pinnedError;

      // Enrich posts with metadata
      const enrichedPosts = await enrichPostsWithMetadata(regularPosts || [], spaceId, subscriberId);
      const enrichedPinnedPosts = await enrichPostsWithMetadata(pinnedPosts || [], spaceId, subscriberId);

      // Update state silently (no loading state changes)
      setPosts(enrichedPosts);
      setPinnedPosts(enrichedPinnedPosts);
      setCurrentPage(page);
      setTotalCount((enrichedPosts.length + enrichedPinnedPosts.length));

      devLogger.log('CacheDebug', `✅ [SilentFetch] Silent fetch completed for space ${spaceId}`, {
        regular: enrichedPosts.length,
        pinned: enrichedPinnedPosts.length,
        subscriberId
      });

    } catch (error) {
      devLogger.error('CacheDebug', `❌ [SilentFetch] Silent fetch failed for space ${spaceId}`, error);
      // Silent fetch doesn't set error state to avoid UI disruption
    }
  }, [spaceId, subscriberId, setPosts, setPinnedPosts, setCurrentPage, setTotalCount]);

  // Regular fetch with loading states
  const fetchPosts = useCallback(async (page: number = 1, forceRefresh: boolean = false) => {
    if (!spaceId) return;

    const maxRetries = 2;
    let retryCount = 0;
    let lastError: any;

    const attemptFetch = async () => {
      const offset = (page - 1) * 25;
      
      // Fetch regular posts
      const { data: regularPosts, error: regularError } = await getSupabaseClient()!
        .from('posts')
        .select(`
          id, created_at, content, title, like_count, comment_count, 
          user_id, space_id, media_urls, category_id, is_pinned, 
          pinned_at, pin_position, pin_category, edited_at, poll_data, slug
        `)
        .eq('space_id', spaceId)
        .eq('is_pinned', false)
        .neq('post_type', 'course_page')
        .order('created_at', { ascending: false })
        .range(offset, offset + 24);

      if (regularError) throw regularError;

      // Fetch pinned posts
      const { data: pinnedPosts, error: pinnedError } = await getSupabaseClient()!
        .from('posts')
        .select(`
          id, created_at, content, title, like_count, comment_count, 
          user_id, space_id, media_urls, category_id, is_pinned, 
          pinned_at, pin_position, pin_category, edited_at, poll_data, slug
        `)
        .eq('space_id', spaceId)
        .eq('is_pinned', true)
        .order('pin_position', { ascending: true });

      if (pinnedError) throw pinnedError;

      return { regularPosts, pinnedPosts };
    };

    // Retry loop with exponential backoff
    while (retryCount < maxRetries) {
      try {
        setLoading(true);
        setError(null);

        const { regularPosts, pinnedPosts } = await attemptFetch();
        
        // Enrich posts with metadata
        const enrichedPosts = await enrichPostsWithMetadata(regularPosts || [], spaceId, subscriberId);
        const enrichedPinnedPosts = await enrichPostsWithMetadata(pinnedPosts || [], spaceId, subscriberId);

        setPosts(enrichedPosts);
        setPinnedPosts(enrichedPinnedPosts);
        setCurrentPage(page);
        setTotalCount((enrichedPosts.length + enrichedPinnedPosts.length));
        setLoading(false);

        // Cache the fetched data
        const regularKey = `posts:${spaceId}:${page}:25`;
        const pinnedKey = `posts:${spaceId}:pinned`;
        
        globalCache.set(regularKey, enrichedPosts);
        globalCache.set(pinnedKey, enrichedPinnedPosts);
        
        devLogger.log('CacheDebug', `Posts loaded and cached successfully`, {
          regular: enrichedPosts.length,
          pinned: enrichedPinnedPosts.length,
          subscriberId,
          fromRefresh: forceRefresh,
          retryCount,
          cacheKeys: { regularKey, pinnedKey }
        });

        return; // Success, exit retry loop
      } catch (error) {
        retryCount++;
        lastError = error;
        
        devLogger.warn('CacheDebug', `Fetch attempt ${retryCount} failed for space ${spaceId}`, {
          error: error instanceof Error ? error.message : String(error),
          retryCount,
          maxRetries,
          subscriberId
        });

        if (retryCount < maxRetries) {
          // Exponential backoff: wait 1s, then 2s
          const delay = Math.pow(2, retryCount - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    const errorMessage = lastError instanceof Error ? lastError.message : 'Failed to fetch posts';
    setError(errorMessage);
    setLoading(false);
    
    devLogger.error('CacheDebug', `All fetch attempts failed for space ${spaceId}`, {
      error: errorMessage,
      retryCount,
      subscriberId
    });
  }, [spaceId, subscriberId, setPosts, setPinnedPosts, setLoading, setError, setCurrentPage, setTotalCount]);

  // Load more posts (pagination)
  const loadMorePosts = useCallback(async (page: number) => {
    if (!spaceId) return;

    try {
      setIsLoadingMore(true);
      
      const offset = (page - 1) * 25;
      
      const { data: regularPosts, error: regularError } = await getSupabaseClient()!
        .from('posts')
        .select(`
          id, created_at, content, title, like_count, comment_count, 
          user_id, space_id, media_urls, category_id, is_pinned, 
          pinned_at, pin_position, pin_category, edited_at, poll_data, slug
        `)
        .eq('space_id', spaceId)
        .eq('is_pinned', false)
        .neq('post_type', 'course_page')
        .order('created_at', { ascending: false })
        .range(offset, offset + 24);

      if (regularError) throw regularError;

      const enrichedPosts = await enrichPostsWithMetadata(regularPosts || [], spaceId, subscriberId);
      
      setPosts(prevPosts => [...prevPosts, ...enrichedPosts]);
      setCurrentPage(page);
      setIsLoadingMore(false);

      devLogger.log('CacheDebug', `Loaded more posts for space ${spaceId}`, {
        page,
        newPosts: enrichedPosts.length,
        subscriberId
      });

    } catch (error) {
      setIsLoadingMore(false);
      devLogger.error('CacheDebug', `Failed to load more posts for space ${spaceId}`, error);
    }
  }, [spaceId, subscriberId, setPosts, setCurrentPage, setIsLoadingMore]);

  return {
    fetchPosts,
    fetchPostsSilently,
    loadMorePosts
  };
}
