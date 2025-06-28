import { useState, useEffect, useRef, useCallback } from 'react';
import { navigationAwareRealtimeService } from '@/services/NavigationAwareRealtimeService';
import { getSupabaseClient } from '@/integrations/supabase/client';

interface UseRealtimeSpaceCommentsProps {
  spaceId: string;
  userId: string | null;
  isEnabled?: boolean;
  onCommentAdded?: (data: {
    postId: string;
    commentId: string;
    authorName: string;
    spaceId: string;
  }) => void;
}

interface UseRealtimeSpaceCommentsReturn {
  isConnected: boolean;
  connectionError: string | null;
}

/**
 * 🚀 NAVIGATION-AWARE useRealtimeSpaceComments using NavigationAwareRealtimeService
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
}: UseRealtimeSpaceCommentsProps): UseRealtimeSpaceCommentsReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const subscriptionIdRef = useRef<string | null>(null);

  // Handle comment events
  const handleCommentEvent = (payload: any) => {
    console.log('🔔 [RealtimeSpaceCommentsOptimized] Comment event:', payload);
    
    if (payload.eventType === 'INSERT' && payload.new) {
      const newComment = payload.new;
      
      // Don't process our own comments
      if (newComment.user_id === userId) {
        console.log('🚫 [RealtimeSpaceCommentsOptimized] Ignoring own comment');
        return;
      }

      console.log('✨ [RealtimeSpaceCommentsOptimized] Processing new comment:', {
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
    }
  };

  // 🚀 NAVIGATION-AWARE: Use NavigationAwareRealtimeService instead of GlobalRealtimeService
  useEffect(() => {
    if (!isEnabled || !spaceId) {
      setIsConnected(false);
      return;
    }

    console.log(`🔔 [RealtimeSpaceCommentsOptimized] Setting up subscription for space: ${spaceId}`);

    const subscriptionId = navigationAwareRealtimeService.subscribe(
      spaceId,
      'post_comments',
      handleCommentEvent,
      {
        event: 'INSERT',
        filter: `space_id=eq.${spaceId}`
      }
    );

    subscriptionIdRef.current = subscriptionId;
    setIsConnected(true);
    setConnectionError(null);

    return () => {
      console.log('🔔 [RealtimeSpaceCommentsOptimized] Cleaning up subscription');
      if (subscriptionIdRef.current) {
        // 🛡️ NAVIGATION-AWARE: This will now check if cleanup should be prevented during navigation
        navigationAwareRealtimeService.unsubscribe(subscriptionIdRef.current);
        subscriptionIdRef.current = null;
      }
      setIsConnected(false);
    };
  }, [spaceId, userId, isEnabled]);

  return {
    isConnected,
    connectionError,
  };
}; 