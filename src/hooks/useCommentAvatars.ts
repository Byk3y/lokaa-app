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
  maxCommenters: number = 5
): UseCommentAvatarsReturn {
  // 🚀 PHASE 3: Use TanStack Query for enhanced caching
  const {
    data: commenters = [],
    isLoading: loading,
    error: queryError,
    refetch,
    isError
  } = useQuery({
    queryKey: ['comment-avatars', postId, maxCommenters],
    queryFn: async (): Promise<CommentAvatar[]> => {
      if (!postId) return [];

      console.log(`🎭 [useCommentAvatars] Fetching avatars for post ${postId} (Phase 3 TanStack Query)`);
      
      // Lightweight query to get only recent commenter info
      const { data, error } = await getSupabaseClient()
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
        .order('created_at', { ascending: false })
        .limit(maxCommenters * 2); // Fetch extra to handle duplicates

      if (error) {
        console.error('Error fetching comment avatars:', error);
        throw error;
      }

      if (!data || data.length === 0) return [];

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
      
      console.log(`🎭 [useCommentAvatars] Fetched ${commentersArray.length} avatars for post ${postId} (TanStack Query cached)`);
      return commentersArray;
    },
    enabled: !!postId,
    // 🚀 PHASE 3: Optimized caching configuration
    staleTime: 2 * 60 * 1000, // 2 minutes - avatars don't change frequently
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
    refetchOnWindowFocus: false, // Don't refetch on window focus
    retry: 1, // Only retry once for avatar failures
    // 🎯 PHASE 3: Navigation-aware skip logic built into enabled
    ...QUERY_OPTIONS.standard
  });

  // Navigation-aware logic - disable query during recent navigation
  const [navigationSkip, setNavigationSkip] = useState(false);

  useEffect(() => {
    const shouldSkipFetch = () => {
      if (typeof window === 'undefined') return false;

      const navigationService = (window as any).navigationAwareRealtimeService;
      if (!navigationService) return false;

      const stats = navigationService.getStats();
      const timeSinceNavigation = Date.now() - stats.navigationState.lastNavigationTime;
      const isRecentNavigation = timeSinceNavigation < 2000; // 2 seconds

      // Check for Chat⟷Space navigation patterns
      const { previousRoute, currentRoute } = stats.navigationState;
      const isChatSpaceNavigation = 
        (previousRoute?.includes('/app/chat') && currentRoute?.includes('/space')) ||
        (previousRoute?.includes('/space') && currentRoute?.includes('/app/chat'));

      return isRecentNavigation && isChatSpaceNavigation;
    };

    const skip = shouldSkipFetch();
    if (skip !== navigationSkip) {
      setNavigationSkip(skip);
      if (skip) {
        console.log(`🛡️ [useCommentAvatars] Navigation skip enabled for post ${postId}`);
      }
    }
  }, [postId, navigationSkip]);

  // 🚀 PHASE 3: Enhanced refetch function with promise return
  const enhancedRefetch = useCallback(async () => {
    try {
      await refetch();
    } catch (error) {
      console.error('Error refetching comment avatars:', error);
      throw error;
    }
  }, [refetch]);

  return {
    commenters: navigationSkip ? [] : commenters,
    loading: navigationSkip ? false : loading,
    error: isError && queryError ? (queryError as Error).message : null,
    refetch: enhancedRefetch
  };
} 