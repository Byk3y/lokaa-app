import { log } from '@/utils/logger';
import { useEffect, useState, useRef } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeCommentLikesProps {
  spaceId: string;
  userId?: string;
  enabled?: boolean;
  onLikeAdded?: (commentId: string, userId: string) => void;
  onLikeRemoved?: (commentId: string, userId: string) => void;
}

interface UseRealtimeCommentLikesReturn {
  isConnected: boolean;
  connectionStatus: string;
}

/**
 * 🚀 Real-time hook for comment likes using Supabase subscriptions
 * Follows the same pattern as useRealtimePostLikes
 */
export const useRealtimeCommentLikes = ({
  spaceId,
  userId,
  enabled = true,
  onLikeAdded,
  onLikeRemoved
}: UseRealtimeCommentLikesProps): UseRealtimeCommentLikesReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('IDLE');
  const channelRef = useRef<RealtimeChannel | null>(null);
  const enabledRef = useRef(enabled);

  // Update enabled ref when prop changes
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !spaceId) {
      log.debug('Hook', '🔔 [RealtimeCommentLikes] Skipping subscription setup - disabled or no spaceId');
      return;
    }

    const supabase = getSupabaseClient();
    const channelName = `comment-likes-${spaceId}`;

    log.debug('Hook', '🔔 [RealtimeCommentLikes] Setting up subscription for space:', spaceId);
    log.debug('Hook', '🔔 [RealtimeCommentLikes] Current user ID:', userId);

    // Create channel for comment likes (all spaces - we'll filter in JavaScript)
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comment_likes'
        },
        async (payload) => {
          log.debug('Hook', '🔔 [RealtimeCommentLikes] New comment like detected:', payload);
          
          if (payload.new && typeof payload.new === 'object') {
            const newLike = payload.new as any;
            const { comment_id, user_id } = newLike;

            // Skip if it's the current user's own like (already handled optimistically)
            if (userId && user_id === userId) {
              log.debug('Hook', '🔔 [RealtimeCommentLikes] Skipping own comment like');
              return;
            }

            // 🔍 SPACE FILTERING: Check if this comment belongs to our current space
            try {
              const { data: comment, error } = await supabase
                .from('post_comments')
                .select('space_id')
                .eq('id', comment_id)
                .single();

              if (error) {
                log.warn('Hook', '🔔 [RealtimeCommentLikes] Could not verify comment space:', error);
                return;
              }

              if (comment?.space_id !== spaceId) {
                log.debug('Hook', '🔔 [RealtimeCommentLikes] Comment like is for different space, ignoring');
                return;
              }

              log.debug('Hook', '🔔 [RealtimeCommentLikes] Processing comment like from other user:', {
                commentId: comment_id,
                userId: user_id,
                spaceId: comment.space_id
              });

              if (onLikeAdded) {
                onLikeAdded(comment_id, user_id);
              }
            } catch (err) {
              log.warn('Hook', '🔔 [RealtimeCommentLikes] Error checking comment space:', err);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'comment_likes'
        },
        async (payload) => {
          log.debug('Hook', '🔔 [RealtimeCommentLikes] Comment like removed:', payload);
          
          if (payload.old && typeof payload.old === 'object') {
            const oldLike = payload.old as any;
            const { comment_id, user_id } = oldLike;

            // Skip if it's the current user's own unlike (already handled optimistically)
            if (userId && user_id === userId) {
              log.debug('Hook', '🔔 [RealtimeCommentLikes] Skipping own comment unlike');
              return;
            }

            // 🔍 SPACE FILTERING: Check if this comment belongs to our current space
            try {
              const { data: comment, error } = await supabase
                .from('post_comments')
                .select('space_id')
                .eq('id', comment_id)
                .single();

              if (error) {
                log.warn('Hook', '🔔 [RealtimeCommentLikes] Could not verify comment space for unlike:', error);
                return;
              }

              if (comment?.space_id !== spaceId) {
                log.debug('Hook', '🔔 [RealtimeCommentLikes] Comment unlike is for different space, ignoring');
                return;
              }

              log.debug('Hook', '🔔 [RealtimeCommentLikes] Processing comment unlike from other user:', {
                commentId: comment_id,
                userId: user_id,
                spaceId: comment.space_id
              });

              if (onLikeRemoved) {
                onLikeRemoved(comment_id, user_id);
              }
            } catch (err) {
              log.warn('Hook', '🔔 [RealtimeCommentLikes] Error checking comment space for unlike:', err);
            }
          }
        }
      )
      .subscribe((status) => {
        log.debug('Hook', `🔔 [RealtimeCommentLikes] Subscription status: ${status}`);
        setConnectionStatus(status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    return () => {
      log.debug('Hook', '🔔 [RealtimeCommentLikes] Cleaning up subscription');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsConnected(false);
      setConnectionStatus('CLOSED');
    };
  }, [spaceId, userId, enabled, onLikeAdded, onLikeRemoved]);

  return {
    isConnected,
    connectionStatus
  };
}; 