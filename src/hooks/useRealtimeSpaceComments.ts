import { useState, useEffect, useRef, useCallback } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/integrations/supabase/client';

interface NewCommentData {
  id: string;
  post_id: string;
  user_id: string;
  space_id: string;
  content: string;
  created_at: string;
  parent_comment_id: string | null;
}

interface UseRealtimeSpaceCommentsProps {
  spaceId: string;
  userId: string | null;
  isEnabled?: boolean;
  onCommentAdded?: (postId: string, newCommentCount: number) => void;
}

interface UseRealtimeSpaceCommentsReturn {
  isConnected: boolean;
  connectionError: string | null;
}

/**
 * Hook to handle real-time comment subscriptions for an ENTIRE SPACE
 * ✅ This enables cross-user comment count updates in the feed
 * Similar to how useRealtimePosts works but for comments
 */
export const useRealtimeSpaceComments = ({
  spaceId,
  userId,
  isEnabled = true,
  onCommentAdded,
}: UseRealtimeSpaceCommentsProps): UseRealtimeSpaceCommentsReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const callbackRef = useRef(onCommentAdded);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = onCommentAdded;
  }, [onCommentAdded]);

  // Get comment count for a specific post
  const getPostCommentCount = useCallback(async (postId: string): Promise<number> => {
    try {
      const { count, error } = await getSupabaseClient()
        .from('post_comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);

      if (error) {
        console.error('[RealtimeSpaceComments] Error getting comment count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('[RealtimeSpaceComments] Error getting comment count:', error);
      return 0;
    }
  }, []);

  useEffect(() => {
    if (!isEnabled || !spaceId) {
      setIsConnected(false);
      return;
    }

    console.log(`🔔 [RealtimeSpaceComments] Setting up subscription for space: ${spaceId}`);
    console.log(`🔔 [RealtimeSpaceComments] Filter: space_id=eq.${spaceId}`);
    console.log(`🔔 [RealtimeSpaceComments] Current user ID: ${userId}`);

    // Create channel for ALL comments in this space
    const channel = getSupabaseClient()
      .channel(`space_comments_${spaceId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'post_comments',
          filter: `space_id=eq.${spaceId}`, // 🔥 CRITICAL FIX: Filter by space_id directly!
        },
        async (payload) => {
          console.log('🔔 [RealtimeSpaceComments] New comment detected:', payload);
          
          if (payload.new && typeof payload.new === 'object') {
            const newComment = payload.new as NewCommentData;
            
            console.log('🔔 [RealtimeSpaceComments] Processing new comment:', {
              id: newComment.id,
              post_id: newComment.post_id,
              user_id: newComment.user_id,
              content: newComment.content?.substring(0, 30) + '...',
              currentUserId: userId
            });

            // Don't trigger for own comments (to prevent double updates)
            if (newComment.user_id === userId) {
              console.log('🔔 [RealtimeSpaceComments] Ignoring own comment');
              return;
            }

            // Get the updated comment count for this post
            const newCommentCount = await getPostCommentCount(newComment.post_id);

            console.log(`🔔 [RealtimeSpaceComments] Updating comment count for post ${newComment.post_id}: ${newCommentCount}`);

            // Call the callback to update the cached posts
            if (callbackRef.current) {
              callbackRef.current(newComment.post_id, newCommentCount);
            }
          } else {
            console.warn('🔔 [RealtimeSpaceComments] Invalid payload.new:', payload.new);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'post_comments',
          filter: `space_id=eq.${spaceId}`, // 🔥 CRITICAL FIX: Filter by space_id directly!
        },
        async (payload) => {
          console.log('🔔 [RealtimeSpaceComments] Comment deleted:', payload);
          
          if (payload.old && typeof payload.old === 'object') {
            const deletedComment = payload.old as NewCommentData;

            // Get the updated comment count for this post
            const newCommentCount = await getPostCommentCount(deletedComment.post_id);

            console.log(`🔔 [RealtimeSpaceComments] Updating comment count after deletion for post ${deletedComment.post_id}: ${newCommentCount}`);

            // Call the callback to update the cached posts
            if (callbackRef.current) {
              callbackRef.current(deletedComment.post_id, newCommentCount);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`🔔 [RealtimeSpaceComments] Subscription status: ${status}`);
        
        const isSubscribed = status === 'SUBSCRIBED';
        setIsConnected(isSubscribed);
        
        if (status === 'CHANNEL_ERROR') {
          setConnectionError('Failed to connect to real-time space comments');
        } else if (status === 'SUBSCRIBED') {
          setConnectionError(null);
        }
      });

    channelRef.current = channel;

    // Cleanup function
    return () => {
      console.log('🔔 [RealtimeSpaceComments] Cleaning up subscription');
      if (channelRef.current) {
        getSupabaseClient().removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsConnected(false);
    };
  }, [spaceId, userId, isEnabled, getPostCommentCount]);

  return {
    isConnected,
    connectionError,
  };
}; 