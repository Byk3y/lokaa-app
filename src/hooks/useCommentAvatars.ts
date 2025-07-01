import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';

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
 * Lightweight hook for fetching recent commenter avatars for PostCard display
 * This replaces the heavy usePostComments hook for avatar-only use cases
 */
export function useCommentAvatars(
  postId: string | undefined,
  maxCommenters: number = 5
): UseCommentAvatarsReturn {
  const [commenters, setCommenters] = useState<CommentAvatar[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCommentAvatars = useCallback(async () => {
    if (!postId) {
      setCommenters([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Lightweight query to get only recent commenter info
      const { data, error: queryError } = await getSupabaseClient()
        .from('post_comments')
        .select(`
          user_id,
          created_at,
          users!inner (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('post_id', postId)
        .is('parent_comment_id', null) // Only top-level comments
        .order('created_at', { ascending: false });

      if (queryError) {
        console.error('Error fetching comment avatars:', queryError);
        setError(queryError.message);
        return;
      }

      if (data) {
        // Get unique commenters (most recent first)
        const uniqueCommenters = new Map<string, CommentAvatar>();
        
        data.forEach(comment => {
          const user = comment.users as unknown as CommentAuthor;
          if (user && user.id && !uniqueCommenters.has(user.id)) {
            uniqueCommenters.set(user.id, {
              id: user.id,
              name: user.full_name,
              avatar: user.avatar_url
            });
          }
        });

        // Convert to array and limit to maxCommenters
        const commentersArray = Array.from(uniqueCommenters.values()).slice(0, maxCommenters);
        
        console.log(`🎭 [useCommentAvatars] Fetched ${commentersArray.length} avatars for post ${postId}`);
        setCommenters(commentersArray);
      }
    } catch (err) {
      console.error('Error in useCommentAvatars:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [postId, maxCommenters]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchCommentAvatars();
  }, [fetchCommentAvatars]);

  // Navigation-aware logic - skip during recent navigation
  useEffect(() => {
    const shouldSkipFetch = () => {
      if (typeof window === 'undefined') return false;

      const navigationService = (window as any).navigationAwareRealtimeService;
      if (!navigationService) return false;

      const stats = navigationService.getStats();
      const timeSinceNavigation = Date.now() - stats.navigationState.lastNavigationTime;
      const isRecentNavigation = timeSinceNavigation < 3000; // 3 seconds

      // Check for Chat⟷Space navigation patterns
      const { previousRoute, currentRoute } = stats.navigationState;
      const isChatSpaceNavigation = 
        (previousRoute?.includes('/app/chat') && currentRoute?.includes('/space')) ||
        (previousRoute?.includes('/space') && currentRoute?.includes('/app/chat'));

      return isRecentNavigation && isChatSpaceNavigation;
    };

    // Only fetch if not during navigation
    if (!shouldSkipFetch()) {
      fetchCommentAvatars();
    } else {
      console.log(`🛡️ [useCommentAvatars] Skipping fetch for post ${postId} due to navigation`);
    }
  }, [postId, fetchCommentAvatars]);

  return {
    commenters,
    loading,
    error,
    refetch: fetchCommentAvatars
  };
} 