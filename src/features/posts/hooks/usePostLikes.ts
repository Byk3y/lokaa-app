import { log } from '@/utils/logger';
import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useRealtimePostLikes } from '@/hooks/useRealtimePostLikes';
import { NotificationTriggers } from '@/utils/notificationTriggers';

interface UsePostLikesProps {
  postId: string;
  spaceId: string;
  userId?: string | null;
  initialLikes?: number;
  onLikeToggled?: (postId: string, newLikeCount: number) => void;
  // Notification data
  postTitle?: string;
  postAuthorId?: string;
}

interface UsePostLikesReturn {
  hasLikedPost: boolean;
  optimisticLikeCount: number;
  isLikingInProgress: boolean;
  handleLikeToggle: () => Promise<void>;
  realtimeConnected: boolean;
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
  postTitle,
  postAuthorId,
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
          log.warn('Hook', `Error fetching like status for post ${postId}:`, error.message);
          return;
        }
        setHasLikedPost(!!data);
      } catch (err) {
        log.warn('Hook', `Exception fetching like status for post ${postId}:`, err);
      }
    };
    fetchLikeStatus();
  }, [postId, userId]);

  // Keep optimistic like count in sync with initialLikes prop
  useEffect(() => {
    setOptimisticLikeCount(initialLikes);
  }, [initialLikes]);

  // 🚀 Real-time like updates from other users
  const handleRealtimeLikeAdded = useCallback((likePostId: string, likeUserId: string) => {
    if (likePostId === postId) {
      log.debug('Hook', '🔔 [usePostLikes] Real-time like added:', { likePostId, likeUserId });
      
      // 🔥 FIX: Use state updater to get the new count and pass it to callback
      setOptimisticLikeCount(prevCount => {
        const newCount = prevCount + 1;
        
        // Call callback with the correct new count
        if (onLikeToggled) {
          // Use setTimeout to ensure the callback runs after state update
          setTimeout(() => {
            onLikeToggled(postId, newCount);
          }, 0);
        }
        
        return newCount;
      });
    }
  }, [postId, onLikeToggled]);

  // 🚀 SIMPLIFIED: No complex DELETE handling needed
  // Users toggle likes optimistically - much simpler and more reliable!

  // 🚀 Handle real-time like removals (cross-user unlikes)
  const handleRealtimeLikeRemoved = useCallback((likePostId: string, likeUserId: string) => {
    if (likePostId === 'REFRESH_ALL') {
      // Special signal: refresh like count from database
      log.debug('Hook', '🔔 [usePostLikes] Refreshing like count due to DELETE event');
      
      // Fetch current like count from database
      const refreshLikeCount = async () => {
        try {
          const { count, error } = await getSupabaseClient()
            .from('post_likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', postId);
          
          if (error) {
            log.warn('Hook', '[usePostLikes] Error refreshing like count:', error);
            return;
          }
          
          const actualCount = count || 0;
          log.debug('Hook', `🔔 [usePostLikes] Refreshed like count: ${actualCount} (was: ${optimisticLikeCount})`);
          
          // Update to actual count if different
          if (actualCount !== optimisticLikeCount) {
            setOptimisticLikeCount(actualCount);
            
            // Notify parent of count change
            if (onLikeToggled) {
              setTimeout(() => {
                onLikeToggled(postId, actualCount);
              }, 0);
            }
          }
        } catch (err) {
          log.warn('Hook', '[usePostLikes] Exception refreshing like count:', err);
        }
      };
      
      refreshLikeCount();
    } else {
      // Regular unlike from specific user
      if (likePostId === postId) {
        log.debug('Hook', '🔔 [usePostLikes] Real-time like removed:', { likePostId, likeUserId });
        
        setOptimisticLikeCount(prevCount => {
          const newCount = Math.max(0, prevCount - 1);
          
          // Call callback with the correct new count
          if (onLikeToggled) {
            setTimeout(() => {
              onLikeToggled(postId, newCount);
            }, 0);
          }
          
          return newCount;
        });
      }
    }
  }, [postId, onLikeToggled, optimisticLikeCount]);

  const { isConnected: realtimeConnected } = useRealtimePostLikes({
    spaceId,
    userId,
    enabled: true,
    onLikeAdded: handleRealtimeLikeAdded,
    onLikeRemoved: handleRealtimeLikeRemoved
  });

  const handleLikeToggle = useCallback(async () => {
    if (!userId || !postId || isLikingInProgress) {
      if (!userId) {
        toast({ title: "Please log in to like posts.", variant: "default" });
      }
      return;
    }

    setIsLikingInProgress(true);
    const currentlyLiked = hasLikedPost;
    
    // 🔥 FIX: Calculate new count once and use it consistently
    const newCount = currentlyLiked ? Math.max(0, optimisticLikeCount - 1) : optimisticLikeCount + 1;

    // Optimistic update
    setHasLikedPost(!currentlyLiked);
    setOptimisticLikeCount(newCount);

    try {
      if (currentlyLiked) {
        // Unlike
        const { data, error } = await getSupabaseClient()
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId)
          .select();

        if (error) {
          log.error('Hook', '❌ [usePostLikes] DELETE error:', error);
          throw error;
        }
        
        log.debug('Hook', `✅ [usePostLikes] Deleted ${data?.length || 0} likes for post ${postId}`);
        
        if (!data || data.length === 0) {
          log.warn('Hook', '⚠️ [usePostLikes] No likes were deleted - may not exist in database');
        }
      } else {
        // Like
        const { data, error } = await getSupabaseClient()
          .from('post_likes')
          .insert({ post_id: postId, user_id: userId })
          .select('id')
          .single();

        if (error) throw error;

        // 🚀 Trigger post like notification
        log.debug('Hook', '🔍 [usePostLikes] Checking notification trigger conditions:', {
          postTitle: !!postTitle,
          hasPostAuthorId: !!postAuthorId,
          userId,
          postAuthorId,
          willTrigger: !!(postTitle && postAuthorId && postAuthorId !== userId)
        });
        
        if (postTitle && postAuthorId && postAuthorId !== userId) {
          try {
            log.debug('Hook', '🚀 [usePostLikes] Triggering notification with data:', {
              postId,
              postTitle,
              postAuthorId,
              likerId: userId,
              spaceId,
            });
            
            await NotificationTriggers.onPostLiked({
              postId,
              postTitle,
              postAuthorId,
              likerId: userId,
              spaceId,
            });
            log.debug('Hook', '✅ [usePostLikes] Post like notification triggered successfully');
          } catch (notificationError) {
            log.warn('Hook', '⚠️ [usePostLikes] Failed to trigger notification:', notificationError);
            // Don't fail the like operation if notification fails
          }
        } else {
          log.debug('Hook', '⏭️ [usePostLikes] Skipping notification trigger:', {
            reason: !postTitle ? 'No post title' : !postAuthorId ? 'No post author ID' : 'Self-like (author === liker)'
          });
        }
      }
      // Notify parent of like count change
      if (typeof onLikeToggled === 'function') {
        // 🔥 FIX: Use the newCount calculated during optimistic update
        onLikeToggled(postId, newCount);
      }
    } catch (error: any) {
      log.error('Hook', 'Error toggling like:', error);
      toast({
        title: "Error",
        description: error.message || "Could not update like status.",
        variant: "destructive",
      });
      // Revert optimistic update on error
      setHasLikedPost(currentlyLiked);
      setOptimisticLikeCount(optimisticLikeCount); // Revert to original count
    } finally {
      setIsLikingInProgress(false);
    }
  }, [userId, postId, spaceId, isLikingInProgress, hasLikedPost, optimisticLikeCount, onLikeToggled]);

  return {
    hasLikedPost,
    optimisticLikeCount,
    isLikingInProgress,
    handleLikeToggle,
    realtimeConnected,
  };
}; 