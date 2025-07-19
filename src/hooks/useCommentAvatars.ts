import { log } from '@/utils/logger';
import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { CACHE_KEYS, QUERY_OPTIONS } from '@/utils/cacheKeys';

interface CommentAuthor {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface CommentAvatar {
  avatar?: string | null;
  name?: string | null;
  id?: string;
}

interface UseCommentAvatarsReturn {
  commenters: CommentAvatar[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * 🚀 PHASE 3: Enhanced lightweight hook for fetching recent commenter avatars
 * Now uses TanStack Query for advanced caching and optimization
 */
export function useCommentAvatars(
  postId: string | undefined,
  maxCommenters: number = 3
): UseCommentAvatarsReturn {
  const [localError, setLocalError] = useState<string | null>(null);

  // 🔍 Enhanced validation and skip logic
  const shouldSkip = !postId || 
    typeof postId !== 'string' || 
    postId.trim() === '' ||
    maxCommenters <= 0;

  // 🎯 TanStack Query with navigation-aware caching
  const query = useQuery({
    queryKey: [CACHE_KEYS.COMMENT_AVATARS, postId, maxCommenters],
    queryFn: async () => {
      if (shouldSkip) {
        return [];
      }

      try {
        // 🐛 FIX: Use separate queries to avoid 400 errors
        // First get comment user IDs and check if any exist
        const { data: comments, error: commentsError } = await getSupabaseClient()
          .from('post_comments')
          .select('user_id, created_at')
          .eq('post_id', postId!)
          .is('parent_comment_id', null)
          .order('created_at', { ascending: false })
          .limit(maxCommenters * 2);

        if (commentsError) {
          log.error('Hook', '🚨 [useCommentAvatars] Comments query error:', commentsError);
          throw new Error(`Failed to fetch comments: ${commentsError.message}`);
        }

        // ✅ Return early if no comments exist - prevents 400 errors
        if (!comments || comments.length === 0) {
          log.debug('Hook', `📭 [useCommentAvatars] No comments found for post ${postId}`);
          return [];
        }

        // Get unique user IDs (most recent first)
        const uniqueUserIds = [...new Set(comments.map(c => c.user_id))].slice(0, maxCommenters);
        
        if (uniqueUserIds.length === 0) {
          return [];
        }

        // Now fetch user data for these IDs
        const { data: users, error: usersError } = await getSupabaseClient()
          .from('users')
          .select('id, full_name, avatar_url')
          .in('id', uniqueUserIds);

        if (usersError) {
          log.error('Hook', '🚨 [useCommentAvatars] Users query error:', usersError);
          throw new Error(`Failed to fetch user data: ${usersError.message}`);
        }

        if (!users || users.length === 0) {
          return [];
        }

        // Create user lookup map for efficient ordering
        const userMap = new Map(users.map(user => [user.id, user]));
        
        // Return users in the order they commented (preserve original comment order)
        const result = uniqueUserIds
          .map(userId => {
            const user = userMap.get(userId);
            return user ? {
              id: user.id,
              name: user.full_name,
              avatar: user.avatar_url
            } : null;
          })
          .filter(Boolean) as CommentAvatar[];

        const loadTime = performance.now();
        log.debug('Hook', 
          `🎭 [useCommentAvatars] Fetched ${result.length} avatars for post ${postId} in ${(loadTime % 1000).toFixed(2)}ms`
        );

        setLocalError(null);
        return result;

      } catch (error: any) {
        const errorMsg = error?.message || 'Unknown error occurred';
        log.error('Hook', '🚨 [useCommentAvatars] Query failed:', error);
        setLocalError(errorMsg);
        throw error;
      }
    },
    enabled: !shouldSkip,
    staleTime: QUERY_OPTIONS.COMMENT_AVATARS.staleTime,
    gcTime: QUERY_OPTIONS.COMMENT_AVATARS.gcTime,
    retry: (failureCount, error: any) => {
      // Don't retry on 400 errors (bad request) or 404 (not found)
      if (error?.status === 400 || error?.status === 404) {
        log.debug('Hook', `🚫 [useCommentAvatars] Not retrying ${error.status} error for post ${postId}`);
        return false;
      }
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });

  // Manual refetch function
  const refetch = useCallback(async () => {
    try {
      setLocalError(null);
      await query.refetch();
    } catch (error: any) {
      log.error('Hook', '🚨 [useCommentAvatars] Manual refetch failed:', error);
      setLocalError(error?.message || 'Refetch failed');
    }
  }, [query]);

  return {
    commenters: query.data || [],
    loading: query.isLoading || query.isFetching,
    error: query.error?.message || localError,
    refetch
  };
} 