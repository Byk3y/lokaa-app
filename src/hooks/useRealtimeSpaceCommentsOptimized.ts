import { useState, useEffect } from 'react';
import { useRealtime } from '@/hooks/useRealtime';

interface UseRealtimeSpaceCommentsProps {
  spaceId: string;
  userId: string | null;
  isEnabled?: boolean;
  onCommentAdded?: (data: any) => void;
  onCommentUpdate?: (commentId: string) => void;
}

interface UseRealtimeSpaceCommentsReturn {
  isConnected: boolean;
  connectionError: string | null;
}

/**
 * 🚀 NAVIGATION-AWARE useRealtimeSpaceComments using pooled RealtimeManager
 * 
 * ✅ BENEFITS:
 * - Subscriptions survive component unmounting AND navigation
 * - Prevents cleanup during Chat⟷Space navigation
 * - Eliminates comment count rerendering during navigation
 * - Maintains all existing functionality
 * - Drop-in replacement for original hook
 */
export const useRealtimeSpaceCommentsOptimized = ({
  spaceId,
  userId,
  isEnabled = true,
  onCommentAdded,
  onCommentUpdate,
}: UseRealtimeSpaceCommentsProps): UseRealtimeSpaceCommentsReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError] = useState<string | null>(null);

  // Handle comment events
  const handleCommentEvent = (payload: any) => {
    log.debug('Hook', '🔔 [RealtimeSpaceCommentsOptimized] Comment event:', payload);

    if (payload.eventType === 'INSERT' && payload.new) {
      const newComment = payload.new;

      // Don't process our own comments
      if (newComment.user_id === userId) {
        log.debug('Hook', '🚫 [RealtimeSpaceCommentsOptimized] Ignoring own comment');
        return;
      }

      log.debug('Hook', '✨ [RealtimeSpaceCommentsOptimized] Processing new comment:', {
        commentId: newComment.id,
        postId: newComment.post_id,
        userId: newComment.user_id,
        spaceId: newComment.space_id
      });

      // Trigger callback if provided
      if (onCommentAdded) {
        onCommentAdded({
          postId: newComment.post_id,
          commentId: newComment.id,
          authorName: newComment.author_name || 'Someone',
          spaceId: newComment.space_id
        });
      }
    } else if (payload.eventType === 'UPDATE' && payload.new) {
      const updatedComment = payload.new;

      log.debug('Hook', '📝 [RealtimeSpaceCommentsOptimized] Processing comment update:', {
        commentId: updatedComment.id,
        postId: updatedComment.post_id
      });

      // Trigger update callback if provided
      if (onCommentUpdate) {
        onCommentUpdate(updatedComment.id);
      }
    }
  };

  useRealtime(
    isEnabled ? spaceId : undefined,
    'post_comments',
    handleCommentEvent,
    {
      event: 'INSERT',
      filter: `space_id=eq.${spaceId}`,
      protectOnNavigation: true
    }
  );

  useEffect(() => {
    setIsConnected(isEnabled && !!spaceId);
  }, [isEnabled, spaceId]);

  return {
    isConnected,
    connectionError,
  };
}; 