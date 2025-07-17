import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { PostCardProps } from '@/components/space/PostCard';

/**
 * Hook to handle post actions like like/unlike and pin/unpin
 */
export function usePostActions(post: PostCardProps | null, userId: string | undefined) {
  const [hasLikedPost, setHasLikedPost] = useState(false);
  const [optimisticLikeCount, setOptimisticLikeCount] = useState(post?.likes || 0);
  const [isLikingInProgress, setIsLikingInProgress] = useState(false);
  const [isPinning, setIsPinning] = useState(false);
  const [optimisticPinned, setOptimisticPinned] = useState(post?.isPinned || false);

  // Load initial post data and like status
  useEffect(() => {
    if (post) {
      setOptimisticLikeCount(post.likes || 0);
      setOptimisticPinned(post.isPinned || false);
      
      if (post.id && userId) {
        fetchLikeStatus(post.id, userId);
      }
    }
  }, [post, userId]);

  // Fetch user's like status for this post
  const fetchLikeStatus = async (postId: string, userId: string) => {
    try {
      const { data, error } = await getSupabaseClient()
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      
      setHasLikedPost(!!data);
    } catch (err) {
      console.warn(`Error fetching like status for post ${postId}:`, err);
    }
  };

  // Handle liking/unliking a post
  const handleLikeToggle = async () => {
    if (!userId || !post?.id || isLikingInProgress) {
      if(!userId) {
        toast({ title: "Please log in to like posts", variant: "default" });
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
          .match({ post_id: post.id, user_id: userId });

        if (error) throw error;
      } else {
        // Like
        const { error } = await getSupabaseClient()
          .from('post_likes')
          .insert({ post_id: post.id, user_id: userId })
          .select('id')
          .single();

        if (error) throw error;
      }
    } catch (error: any) {
      console.error('Error toggling like:', error);
      toast({
        title: "Error",
        description: error.message || "Could not update like status",
        variant: "destructive",
      });
      // Revert optimistic update on error
      setHasLikedPost(currentlyLiked);
      setOptimisticLikeCount(prevCount => currentlyLiked ? prevCount + 1 : prevCount - 1);
    } finally {
      setIsLikingInProgress(false);
    }
  };

  // Handle pin toggle
  const handlePinToggle = async (onPinToggled?: Function) => {
    if (!userId || !post?.id || !post.isAdmin || isPinning) return;
    
    setIsPinning(true);
    const currentlyPinned = optimisticPinned;
    
    // Get the current pin count to check if we'll exceed the limit
    let currentPinnedCount = 0;
    try {
      const { data, error } = await getSupabaseClient()
        .from('posts')
        .select('id', { count: 'exact' })
        .eq('is_pinned', true);
      
      if (!error && data) {
        currentPinnedCount = data.length;
      }
    } catch (err) {
      console.error("Error checking pinned post count:", err);
    }
    
    // Optimistic update
    setOptimisticPinned(!currentlyPinned);
    
    try {
      // Cast function name type to work around TypeScript issues
      const functionName = 'toggle_post_pin' as any;
      
      if (currentlyPinned) {
        // Unpin
        const { data, error } = await getSupabaseClient()
          .rpc(functionName, { 
            post_id: post.id,
            pin_action: 'unpin'
          });

        if (error) throw error;
      } else {
        // Pin
        const { data, error } = await getSupabaseClient()
          .rpc(functionName, { 
            post_id: post.id,
            pin_action: 'pin',
            category: post.category?.name || 'general'
          });

        if (error) throw error;
      }

      // Notify parent of pin change if callback is provided
      if (typeof onPinToggled === 'function') {
        if (!currentlyPinned && currentPinnedCount >= 4) {
          // We're pinning a 5th post, so we might need to do a full refresh
          onPinToggled(post.id, !currentlyPinned, !currentlyPinned ? (post.category?.name || 'general') : null);
        } else {
          // Normal case
          onPinToggled(post.id, !currentlyPinned, !currentlyPinned ? (post.category?.name || 'general') : null);
        }
      }
    } catch (error: any) {
      console.error('Error toggling pin:', error);
      toast({
        title: "Error",
        description: error.message || "Could not update pin status.",
        variant: "destructive",
      });
      // Revert optimistic update
      setOptimisticPinned(currentlyPinned);
    } finally {
      setIsPinning(false);
    }
  };

  return {
    hasLikedPost,
    optimisticLikeCount,
    isLikingInProgress,
    handleLikeToggle,
    optimisticPinned,
    isPinning,
    handlePinToggle,
  };
} 