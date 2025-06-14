import { useCallback } from 'react';
import { usePostDetail } from './usePostDetail';
import type { PostCardProps } from '@/features/posts/types/postCard';

/**
 * Enhanced post actions hook
 * Provides post actions with optimistic updates and error handling
 */
export function usePostActionsEnhanced(
  post: PostCardProps, 
  userId?: string // This is the logged-in user ID
) {
  // Pass logged-in user ID to usePostDetail
  const { toggleLike, isLiking, prefetchComments } = usePostDetail(
    post.id, 
    userId, // Pass logged-in user ID here
    {
      ...post,
      // Don't override currentUserId here - let usePostDetail handle it correctly
    }
  );

  const handleLike = useCallback(async () => {
    await toggleLike();
  }, [toggleLike]);

  return {
    handleLike,
    isLikeLoading: isLiking,
    prefetchComments,
  };
} 