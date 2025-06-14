import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface UsePostLikesProps {
  postId: string;
  spaceId: string;
  userId?: string | null;
  initialLikes?: number;
  onLikeToggled?: (postId: string, newLikeCount: number) => void;
}

interface UsePostLikesReturn {
  hasLikedPost: boolean;
  optimisticLikeCount: number;
  isLikingInProgress: boolean;
  handleLikeToggle: () => Promise<void>;
}

/**
 * Custom hook to manage post likes
 */
export const usePostLikes = ({
  postId,
  spaceId,
  userId,
  initialLikes = 0,
  onLikeToggled,
}: UsePostLikesProps): UsePostLikesReturn => {
  const [hasLikedPost, setHasLikedPost] = useState(false);
  const [optimisticLikeCount, setOptimisticLikeCount] = useState(initialLikes);
  const [isLikingInProgress, setIsLikingInProgress] = useState(false);

  // Fetch initial like status
  useEffect(() => {
    if (!userId || !postId) return;

    const fetchLikeStatus = async () => {
      try {
        const { data, error } = await getSupabaseClient()
          .from('post_likes')
          .select('id')
          .eq('post_id', postId)
          .eq('user_id', userId)
          .maybeSingle();

        if (error) {
          console.warn(`Error fetching like status for post ${postId}:`, error.message);
          return;
        }
        setHasLikedPost(!!data);
      } catch (err) {
        console.warn(`Exception fetching like status for post ${postId}:`, err);
      }
    };
    fetchLikeStatus();
  }, [postId, userId]);

  // Keep optimistic like count in sync with initialLikes prop
  useEffect(() => {
    setOptimisticLikeCount(initialLikes);
  }, [initialLikes]);

  const handleLikeToggle = useCallback(async () => {
    if (!userId || !postId || isLikingInProgress) {
      if (!userId) {
        toast({ title: "Please log in to like posts.", variant: "default" });
      }
      return;
    }

    setIsLikingInProgress(true);
    const currentlyLiked = hasLikedPost;

    // Optimistic update
    setHasLikedPost(!currentlyLiked);
    setOptimisticLikeCount(prevCount => currentlyLiked ? prevCount - 1 : prevCount + 1);

    try {
      if (currentlyLiked) {
        // Unlike
        const { error } = await getSupabaseClient()
          .from('post_likes')
          .delete()
          .match({ post_id: postId, user_id: userId });

        if (error) throw error;
      } else {
        // Like
        const { data, error } = await getSupabaseClient()
          .from('post_likes')
          .insert({ post_id: postId, user_id: userId })
          .select('id')
          .single();

        if (error) throw error;

        // Log activity in user_activity_log
        await getSupabaseClient().from('user_activity_log').insert({
          user_id: userId,
          type: 'like',
          ref_id: postId, // The post ID
          meta: { post_id: postId, space_id: spaceId }
        });
      }
      // Notify parent of like count change
      if (typeof onLikeToggled === 'function') {
        onLikeToggled(postId, !currentlyLiked ? optimisticLikeCount + 1 : optimisticLikeCount - 1);
      }
    } catch (error: any) {
      console.error('Error toggling like:', error);
      toast({
        title: "Error",
        description: error.message || "Could not update like status.",
        variant: "destructive",
      });
      // Revert optimistic update on error
      setHasLikedPost(currentlyLiked);
      setOptimisticLikeCount(prevCount => currentlyLiked ? prevCount + 1 : prevCount - 1);
    } finally {
      setIsLikingInProgress(false);
    }
  }, [userId, postId, spaceId, isLikingInProgress, hasLikedPost, optimisticLikeCount, onLikeToggled]);

  return {
    hasLikedPost,
    optimisticLikeCount,
    isLikingInProgress,
    handleLikeToggle,
  };
}; 