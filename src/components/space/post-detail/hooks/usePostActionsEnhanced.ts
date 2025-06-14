import { useMemo, useCallback, useState, useEffect } from 'react';
import { usePostDetail } from '@/hooks/usePostDetail';
import { toast } from '@/hooks/use-toast';
import { getSupabaseClient } from '@/integrations/supabase/client';
import type { PostCardProps } from '@/features/posts/types/postCard';

/**
 * Enhanced Post Actions Hook with TanStack Query Caching
 * Maintains the same interface as the original usePostActions but with performance benefits
 */
export function usePostActionsEnhanced(post: PostCardProps | null, userId: string | undefined) {
  // Transform PostCardProps to our PostDetail format
  const postDetail = useMemo(() => {
    if (!post) return undefined;
    
    return {
      id: post.id,
      spaceId: post.spaceId,
      currentUserId: userId || '',
      title: post.title,
      content: post.content,
      createdAt: post.createdAt,
      editedAt: post.editedAt,
      likes: post.likes,
      comments: post.comments,
      media_urls: post.media_urls || [],
      isPinned: post.isPinned || false,
      pinCategory: post.pinCategory,
      poll_data: post.poll_data,
      slug: post.slug,
      category: post.category,
      author: post.author,
      className: post.className || '',
      isAdmin: post.isAdmin || false,
    };
  }, [post, userId]);

  // Use our enhanced hook
  const {
    post: cachedPost,
    hasLiked,
    likeCount,
    isLiking,
    toggleLike,
    error: likeError,
  } = usePostDetail(post?.id || '', userId, postDetail);

  // Pin-related state (keeping original logic for now since it's more complex)
  const [isPinning, setIsPinning] = useState(false);
  const [optimisticPinned, setOptimisticPinned] = useState(post?.isPinned || false);

  // Update pin state when post changes
  useEffect(() => {
    setOptimisticPinned(post?.isPinned || false);
  }, [post?.isPinned]);

  // Handle pin toggle (keeping original implementation)
  const handlePinToggle = useCallback(async (onPinToggled?: Function) => {
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
          onPinToggled(post.id, !currentlyPinned, !currentlyPinned ? (post.category?.name || 'general') : null);
        } else {
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
  }, [userId, post?.id, post?.isAdmin, post?.category?.name, isPinning, optimisticPinned]);

  // Handle like toggle with enhanced error handling
  const handleLikeToggle = useCallback(async () => {
    if (!userId || !post?.id) {
      if (!userId) {
        toast({ title: "Please log in to like posts", variant: "default" });
      }
      return likeCount;
    }

    try {
      await toggleLike();
      
      // Log activity for successful like
      if (!hasLiked) { // Will be liked after toggle
        await getSupabaseClient().from('user_activity_log').insert({
          user_id: userId,
          type: 'like',
          ref_id: post.id,
          meta: { post_id: post.id, space_id: post.spaceId }
        });
      }
      
      return likeCount;
    } catch (error: any) {
      console.error('Error toggling like:', error);
      toast({
        title: "Error",
        description: error.message || "Could not update like status",
        variant: "destructive",
      });
      return likeCount;
    }
      }, [userId, post?.id, post?.spaceId, toggleLike, hasLiked, likeCount]);

  // Return the same interface as the original hook
  return {
    hasLikedPost: hasLiked,
    optimisticLikeCount: likeCount,
    isLikingInProgress: isLiking,
    handleLikeToggle,
    optimisticPinned,
    isPinning,
    handlePinToggle,
  };
} 