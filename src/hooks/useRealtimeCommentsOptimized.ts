import { useState, useCallback, useEffect } from 'react';
import { useRealtime } from '@/hooks/useRealtime';

interface UseRealtimeCommentsProps {
  postId: string;
  spaceId?: string;
  userId?: string | null;
  isEnabled?: boolean;
  onNewComment?: (comment: any) => void;
  onCommentUpdate?: (commentId: string) => void;
}

/**
 * useRealtimeCommentsOptimized - Simplified version using the unified useRealtime hook
 */
export const useRealtimeCommentsOptimized = ({
  postId,
  userId,
  isEnabled = true,
  onNewComment,
  onCommentUpdate,
}: UseRealtimeCommentsProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [newCommentIds, setNewCommentIds] = useState<string[]>([]);

  // Handle events
  const handleRealtimeEvent = useCallback((payload: any) => {
    if (payload.eventType === 'INSERT') {
      const newComment = payload.new;
      if (onNewComment) onNewComment(newComment);

      if (newComment.user_id !== userId) {
        setNewCommentIds((prev: string[]) => prev.includes(newComment.id) ? prev : [...prev, newComment.id]);
      }
    } else if (payload.eventType === 'UPDATE') {
      if (onCommentUpdate) onCommentUpdate(payload.new.id);
    }
  }, [onNewComment, onCommentUpdate, userId]);

  // Use the unified hook
  useRealtime(
    isEnabled ? `post:${postId}` : null,
    'post_comments',
    handleRealtimeEvent,
    {
      event: '*',
      filter: `post_id=eq.${postId}`,
      protectOnNavigation: true
    }
  );

  useEffect(() => {
    setIsConnected(isEnabled && !!postId);
  }, [isEnabled, postId]);

  const clearNewComments = useCallback(() => setNewCommentIds([]), []);
  const removeCommentId = useCallback((id: string) => setNewCommentIds((prev: string[]) => prev.filter(p => p !== id)), []);

  return {
    isConnected,
    newCommentIds,
    connectionError: null,
    clearNewComments,
    removeCommentId,
  };
};