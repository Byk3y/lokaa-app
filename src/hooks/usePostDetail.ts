import { log } from '@/utils/logger';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { CACHE_KEYS, QUERY_OPTIONS } from '@/utils/cacheKeys';
import { optimisticUpdates, cacheInvalidation, cacheDebug, prefetchStrategies } from '@/utils/cacheUtils';
import type { PostCardProps } from '@/features/posts/types/postCard';

// Types
interface PostDetail extends PostCardProps {
  // Extended post details for modal
  view_count?: number;
  share_count?: number;
}

interface LikeToggleParams {
  postId: string;
  userId: string;
  currentLikeCount: number;
  currentlyLiked: boolean;
}

interface CommentAddParams {
  postId: string;
  content: string;
  userId: string;
  spaceId: string;
}

/**
 * Enhanced Post Detail Hook with TanStack Query
 * Provides optimized caching, optimistic updates, and prefetching
 */
export function usePostDetail(postId: string, loggedInUserId?: string, initialData?: PostDetail) {
  const queryClient = useQueryClient();
  
  // Post detail query with caching
  const {
    data: post,
    isLoading,
    error,
    refetch: refetchPost,
  } = useQuery({
    queryKey: CACHE_KEYS.posts.byId(postId),
    queryFn: async () => {
      cacheDebug.logCacheAccess(CACHE_KEYS.posts.byId(postId).join('/'), false);
      
      const { data, error } = await getSupabaseClient()
        .from('posts')
        .select(`
          id,
          created_at,
          updated_at,
          content,
          title,
          like_count,
          comment_count,
          user_id,
          space_id,
          media_urls,
          is_pinned,
          pinned_at,
          pinned_by,
          pin_position,
          pin_category,
          edited_at,
          poll_data,
          slug,
          category_id,
          category:space_categories!left (id, name, icon)
        `)
        .eq('id', postId)
        .single() as any;
        
      if (error) throw error;
      if (!data) throw new Error('Post not found');

      // Fetch author separately since there's no foreign key relationship
      let author = null;
      if (data.user_id) {
        const { data: authorData, error: authorError } = await getSupabaseClient()
          .from('users')
          .select('id, full_name, avatar_url, profile_url, activity_score')
          .eq('id', data.user_id)
          .single() as any;
        
        if (!authorError && authorData) {
          author = authorData;
        }
      }
      
      // Transform data to match PostCardProps interface
      const transformedPost: PostDetail = {
        id: data.id,
        spaceId: data.space_id,
        currentUserId: loggedInUserId || '',
        title: data.title,
        content: data.content,
        createdAt: data.created_at,
        editedAt: data.edited_at,
        likes: data.like_count || 0,
        comments: data.comment_count || 0,
        media_urls: data.media_urls || [],
        isPinned: data.is_pinned || false,
        pinCategory: data.pin_category,
        poll_data: data.poll_data,
        slug: data.slug,
        category: data.category ? {
          id: data.category.id,
          name: data.category.name,
          icon: data.category.icon,
        } : null,
        author: {
          id: author?.id || data.user_id,
          name: author?.full_name || 'Unknown User',
          avatar: author?.avatar_url,
        },
        className: '',
        isAdmin: false, // Will be determined by context
      };
      
      cacheDebug.logCacheAccess(CACHE_KEYS.posts.byId(postId).join('/'), true, transformedPost);
      return transformedPost;
    },
    ...QUERY_OPTIONS.standard,
    initialData,
    enabled: !!postId,
  });

  // Like status query - now uses logged-in user ID
  const {
    data: hasLiked = false,
    isLoading: isLikeStatusLoading,
  } = useQuery({
    queryKey: CACHE_KEYS.likes.postLikeStatus(postId, loggedInUserId || ''),
    queryFn: async () => {
      if (!loggedInUserId) return false;
      
      const { data, error } = await getSupabaseClient()
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', loggedInUserId)
        .maybeSingle();
        
      if (error) throw error;
      return !!data;
    },
    ...QUERY_OPTIONS.realtime,
    enabled: !!postId && !!loggedInUserId,
  });

  // Like toggle mutation with optimistic updates
  const likeMutation = useMutation({
    mutationFn: async ({ postId, userId, currentlyLiked }: LikeToggleParams) => {
      if (currentlyLiked) {
        // Unlike
        const { error } = await getSupabaseClient()
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId);
        if (error) throw error;
        return false;
      } else {
        // Like
        const { error } = await getSupabaseClient()
          .from('post_likes')
          .insert({ post_id: postId, user_id: userId });
        if (error) throw error;
        return true;
      }
    },
    onMutate: async ({ postId, userId, currentLikeCount, currentlyLiked }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: CACHE_KEYS.posts.byId(postId) });
      await queryClient.cancelQueries({ queryKey: CACHE_KEYS.likes.postLikeStatus(postId, userId) });

      // Optimistically update
      const rollback = optimisticUpdates.updatePostLike(
        queryClient,
        postId,
        userId,
        !currentlyLiked,
        currentLikeCount
      );

      return { rollback };
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.rollback) {
        context.rollback();
      }
      log.error('Hook', 'Like toggle failed:', error);
    },
    onSuccess: async (result, { postId, userId }) => {
      // Invalidate related queries to sync with server
      await cacheInvalidation.invalidateLikeToggle(queryClient, postId, userId);
    },
  });

  // Derived state for optimistic updates
  const optimisticLikeCount = useMemo(() => {
    if (likeMutation.isPending) {
      if (hasLiked) {
        return Math.max(0, (post?.likes || 0) - 1);
      } else {
        return (post?.likes || 0) + 1;
      }
    }
    return post?.likes || 0;
  }, [post?.likes, hasLiked, likeMutation.isPending]);

  const optimisticHasLiked = useMemo(() => {
    if (likeMutation.isPending) {
      return !hasLiked;
    }
    return hasLiked;
  }, [hasLiked, likeMutation.isPending]);

  // Actions
  const toggleLike = useCallback(async () => {
    if (!loggedInUserId || !post?.id) return;

    await likeMutation.mutateAsync({
      postId: post.id,
      userId: loggedInUserId,
      currentLikeCount: post.likes,
      currentlyLiked: hasLiked,
    });
  }, [post?.id, loggedInUserId, post?.likes, hasLiked, likeMutation]);

  // Prefetching helpers
  const prefetchComments = useCallback(async () => {
    if (!post?.id) return;
    
    await prefetchStrategies.prefetchComments(
      queryClient,
      post.id,
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
          .eq('post_id', post.id)
          .order('created_at', { ascending: true });
          
        if (error) throw error;
        return data || [];
      }
    );
  }, [post?.id, queryClient]);

  const prefetchUserProfile = useCallback(async (userId: string) => {
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
  }, [queryClient]);

  return {
    // Data
    post,
    hasLiked: optimisticHasLiked,
    likeCount: optimisticLikeCount,
    
    // Loading states
    isLoading,
    isLikeStatusLoading,
    isLiking: likeMutation.isPending,
    
    // Error states
    error,
    likeError: likeMutation.error,
    
    // Actions
    toggleLike,
    refetchPost,
    
    // Prefetching
    prefetchComments,
    prefetchUserProfile,
    
    // Utilities
    invalidateCache: () => cacheInvalidation.invalidatePostUpdate(queryClient, postId, post?.spaceId || ''),
  };
}

/**
 * Hook for bulk post operations and caching
 */
export function usePostCache() {
  const queryClient = useQueryClient();

  const invalidateAllPosts = useCallback(async (spaceId?: string) => {
    if (spaceId) {
      await queryClient.invalidateQueries({ queryKey: CACHE_KEYS.posts.bySpace(spaceId) });
    } else {
      await queryClient.invalidateQueries({ queryKey: CACHE_KEYS.posts.all });
    }
  }, [queryClient]);

  const prefetchPost = useCallback(async (postId: string) => {
    await prefetchStrategies.prefetchPost(
      queryClient,
      postId,
      async () => {
        const { data, error } = await getSupabaseClient()
          .from('posts')
          .select('*')
          .eq('id', postId)
          .single();
          
        if (error) throw error;
        return data;
      }
    );
  }, [queryClient]);

  return {
    invalidateAllPosts,
    prefetchPost,
    queryClient,
  };
} 