import { useState, useEffect, useRef, useCallback } from 'react';
import { navigationAwareRealtimeService } from '@/services/NavigationAwareRealtimeService';

interface UseRealtimeCommentsProps {
  postId: string;
  spaceId?: string;
  userId?: string | null;
  isEnabled?: boolean;
  onNewComment?: (comment: any) => void;
  onCommentUpdate?: (commentId: string) => void;
}

/**
 * 🚀 NAVIGATION-AWARE Real-time Comments Hook using NavigationAwareRealtimeService
 * 
 * ✅ BENEFITS:
 * - Subscriptions survive component unmounting AND navigation
 * - Prevents cleanup during Chat⟷Space navigation
 * - Eliminates comment rerendering during navigation
 * - Maintains all existing functionality
 * - Drop-in replacement for original hook
 */
export const useRealtimeCommentsOptimized = ({
  postId,
  spaceId,
  userId,
  isEnabled = true,
  onNewComment,
  onCommentUpdate,
}: UseRealtimeCommentsProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [newCommentIds, setNewCommentIds] = useState<string[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const subscriptionIdRef = useRef<string | null>(null);
  const callbackRef = useRef({ onNewComment, onCommentUpdate, userId });

  // Update callback ref when callbacks change
  useEffect(() => {
    callbackRef.current = { onNewComment, onCommentUpdate, userId };
  }, [onNewComment, onCommentUpdate, userId]);

  // Clear new comment notifications
  const clearNewComments = useCallback(() => {
    setNewCommentIds([]);
  }, []);

  // Remove specific comment from notifications
  const removeCommentId = useCallback((commentId: string) => {
    setNewCommentIds(prev => prev.filter(id => id !== commentId));
  }, []);

  // Handle real-time events
  const handleRealtimeEvent = useCallback((payload: any) => {
    console.log('🔔 [RealtimeCommentsOptimized] Processing event:', payload);
    
    if (payload.eventType === 'INSERT') {
      const newComment = payload.new;
      console.log('🔔 [RealtimeCommentsOptimized] Processing new comment:', {
        id: newComment.id,
        post_id: newComment.post_id,
        user_id: newComment.user_id,
        content: newComment.content?.substring(0, 30) + '...',
        parent_comment_id: newComment.parent_comment_id
      });
      
      // Call the onNewComment callback
      if (callbackRef.current.onNewComment) {
        console.log('🔔 [RealtimeCommentsOptimized] Calling onNewComment callback');
        callbackRef.current.onNewComment(newComment);
      }
      
      // Add to notifications (unless it's the user's own comment)
      if (newComment.user_id !== callbackRef.current.userId) {
        setNewCommentIds(prev => {
          if (!prev.includes(newComment.id)) {
            return [...prev, newComment.id];
          }
          return prev;
        });
      }
    } else if (payload.eventType === 'UPDATE') {
      const updatedComment = payload.new;
      
      // Call the onCommentUpdate callback
      if (callbackRef.current.onCommentUpdate) {
        callbackRef.current.onCommentUpdate(updatedComment.id);
      }
    }
  }, []);

  // 🚀 NAVIGATION-AWARE: Use NavigationAwareRealtimeService instead of GlobalRealtimeService
  useEffect(() => {
    if (!isEnabled || !postId) {
      setIsConnected(false);
      return;
    }

    console.log(`🔔 [RealtimeCommentsOptimized] Setting up subscription for post: ${postId}`);

    // Use postId as a unique key for the subscription
    const subscriptionId = navigationAwareRealtimeService.subscribe(
      `post:${postId}`, // Use a special key for post-specific subscriptions
      'post_comments',
      handleRealtimeEvent,
      {
        event: '*',
        filter: `post_id=eq.${postId}`
      }
    );

    subscriptionIdRef.current = subscriptionId;
    setIsConnected(true);
    setConnectionError(null);

    return () => {
      console.log('🔔 [RealtimeCommentsOptimized] Cleaning up subscription');
      if (subscriptionIdRef.current) {
        // 🛡️ NAVIGATION-AWARE: This will now check if cleanup should be prevented during navigation
        navigationAwareRealtimeService.unsubscribe(subscriptionIdRef.current);
        subscriptionIdRef.current = null;
      }
      setIsConnected(false);
    };
  }, [postId, userId, isEnabled, handleRealtimeEvent]);

  return {
    isConnected,
    newCommentIds,
    connectionError,
    clearNewComments,
    removeCommentId,
  };
}; 