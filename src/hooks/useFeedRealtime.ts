import { useCallback } from 'react';
import { useRealtimePostsOptimized } from "@/hooks/useRealtimePostsOptimized";
import { useNewPostsState } from "@/hooks/useNewPostsState";
import { getSupabaseClient } from '@/integrations/supabase/client';
import { log } from '@/utils/logger';

/**
 * Hook for managing feed real-time updates
 * Extracted from useFeedLogic to isolate real-time logic and prevent unnecessary re-renders
 */
export function useFeedRealtime(
  spaceId: string | undefined,
  userId: string | undefined,
  onPostCreated: (post: any) => void,
  onPostUpdated: (postId: string, updates: any) => void,
  onPostDeleted: (postId: string) => void
) {
  // ============================================================================
  // REAL-TIME POSTS
  // ============================================================================

  const {
    newPostIds,
    newPostCount,
    isConnected: isRealtimeConnected,
    clearNewPosts: clearNewPostsInternal,
  } = useRealtimePostsOptimized({
    spaceId: spaceId || '',
    userId: userId || '',
    isEnabled: !!spaceId && !!userId,
    onPostUpdated,
    onPostDeleted,
  });

  // ============================================================================
  // NEW POSTS STATE MANAGEMENT
  // ============================================================================

  const {
    isLoadingNewPosts,
    isDismissed,
    loadError,
    retryCount,
    handleLoadNewPosts,
    handleDismissNotification,
    updateLastNotificationTime,
  } = useNewPostsState({
    onLoadNewPosts: useCallback(async (postIds: string[]) => {
      log.debug('Hook', `🔄 [FeedRealtime] Loading new posts: ${postIds.join(', ')}`);

      if (!postIds.length || !spaceId) return;

      try {
        // Fetch only the new posts by their IDs from Supabase
        const { data: newPosts, error } = await getSupabaseClient()
          .from('posts')
          .select(`
            id,
            title,
            content,
            created_at,
            updated_at,
            space_id,
            user_id,
            like_count,
            comment_count,
            media_urls,
            is_pinned,
            pin_category,
            pin_position,
            poll_data,
            slug,
            category:space_categories!left (
              id,
              name,
              icon
            )
          `)
          .in('id', postIds)
          .eq('space_id', spaceId)
          .neq('post_type', 'course_page') // ✅ Exclude course lesson posts from main feed
          .order('created_at', { ascending: false });

        if (error) {
          log.error('Hook', '❌ [FeedRealtime] Error fetching new posts:', error);
          throw error;
        }

        if (newPosts && newPosts.length > 0) {
          // Fetch authors for the new posts
          const userIds = Array.from(new Set(newPosts.map((post: any) => post.user_id).filter(id => !!id)));
          const authorsMap = new Map();

          if (userIds.length > 0) {
            const { data: authorsData } = await getSupabaseClient()
              .from('users')
              .select('id, full_name, avatar_url, profile_url, activity_score')
              .in('id', userIds);

            if (authorsData) {
              authorsData.forEach(author => {
                if (author && author.id) {
                  authorsMap.set(author.id, {
                    id: author.id,
                    full_name: author.full_name,
                    avatar_url: author.avatar_url,
                    profile_url: author.profile_url,
                    activity_score: author.activity_score,
                  });
                }
              });
            }
          }

          // Transform posts to match CachedPostType and add to cache
          newPosts.forEach((post: any) => {
            const transformedPost = {
              ...post,
              author: authorsMap.get(post.user_id) || null,
            };
            onPostCreated(transformedPost);
          });

          log.debug('Hook', `✅ [FeedRealtime] Successfully loaded ${newPosts.length} new posts`);
          clearNewPostsInternal();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } catch (error) {
        log.error('Hook', '❌ [FeedRealtime] Failed to load new posts:', error);
        throw error;
      }
    }, [spaceId, onPostCreated, clearNewPostsInternal]),
    maxRetries: 2,
    retryDelay: 3000,
  });

  // ============================================================================
  // REAL-TIME STATE OBJECT
  // ============================================================================

  const realtimeState = {
    newPostIds,
    newPostCount,
    isConnected: isRealtimeConnected,
    isLoadingNewPosts,
    isDismissed,
    loadError,
    retryCount,
  };

  // ============================================================================
  // RETURN INTERFACE
  // ============================================================================

  return {
    // Real-time state
    realtimeState,

    // Individual state getters
    newPostIds,
    newPostCount,
    isConnected: isRealtimeConnected,
    isLoadingNewPosts,
    isDismissed,
    loadError,
    retryCount,

    // Real-time handlers
    handleLoadNewPosts,
    handleDismissNotification,
    clearNewPosts: clearNewPostsInternal,
    updateLastNotificationTime,
  };
}
