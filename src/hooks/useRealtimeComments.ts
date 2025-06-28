/**
 * 🔔 REAL-TIME COMMENTS SYSTEM - OPTIMIZED
 * 
 * Listens for new comments on posts in real-time and updates the UI instantly.
 * Similar to useRealtimePosts but for comments on the post_comments table.
 * 
 * ✅ FIXED: Excessive subscription churn that caused comments to disappear
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface NewCommentData {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_comment_id?: string | null;
  space_id: string;
}

interface UseRealtimeCommentsProps {
  postId: string;
  spaceId?: string;
  userId?: string | null;
  isEnabled?: boolean;
  onNewComment?: (comment: NewCommentData) => void;
  onCommentUpdate?: (commentId: string) => void;
}

// Global subscription manager to prevent duplicate subscriptions
const globalSubscriptions = new Map<string, {
  channel: RealtimeChannel;
  refCount: number;
  callbacks: Set<{
    onNewComment?: (comment: NewCommentData) => void;
    onCommentUpdate?: (commentId: string) => void;
    userId?: string | null;
  }>;
}>();

/**
 * Hook to handle real-time comment subscriptions for a specific post
 * ✅ OPTIMIZED: Prevents subscription churn and comment disappearing
 */
export const useRealtimeComments = ({
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
  
  const callbackRef = useRef({ onNewComment, onCommentUpdate, userId });
  const stablePostIdRef = useRef<string | null>(null);
  const isSubscribedRef = useRef(false);

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

  // Debounced subscription setup to prevent rapid churn
  const setupSubscriptionDebounced = useCallback((targetPostId: string) => {
    // Prevent setting up subscription for the same post multiple times
    if (stablePostIdRef.current === targetPostId && isSubscribedRef.current) {
      console.log(`🔔 [RealtimeComments] Subscription already exists for post: ${targetPostId}`);
      return;
    }

    // Cleanup previous subscription if different post
    if (stablePostIdRef.current && stablePostIdRef.current !== targetPostId) {
      cleanupSubscription(stablePostIdRef.current);
    }

    stablePostIdRef.current = targetPostId;
    console.log(`🔔 [RealtimeComments] Setting up subscription for post: ${targetPostId}`);
    console.log(`🔔 [RealtimeComments] Filter: post_id=eq.${targetPostId}`);
    
    // Check if subscription already exists globally
    const existingSubscription = globalSubscriptions.get(targetPostId);
    
    if (existingSubscription) {
      // Add our callbacks to existing subscription
      existingSubscription.refCount++;
      existingSubscription.callbacks.add(callbackRef.current);
      setIsConnected(true);
      isSubscribedRef.current = true;
      console.log(`🔔 [RealtimeComments] Reusing existing subscription for post: ${targetPostId} (refs: ${existingSubscription.refCount})`);
      return;
    }

    // Create new subscription
    const callbacks = new Set([callbackRef.current]);
    
    const channel = getSupabaseClient()
      .channel(`post_comments_${targetPostId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'post_comments',
          filter: `post_id=eq.${targetPostId}`,
        },
        (payload) => {
          console.log('🔔 [RealtimeComments] New comment detected:', payload);
          
          if (payload.new && typeof payload.new === 'object') {
            const newComment = payload.new as NewCommentData;
            console.log('🔔 [RealtimeComments] Processing new comment:', {
              id: newComment.id,
              post_id: newComment.post_id,
              user_id: newComment.user_id,
              content: newComment.content?.substring(0, 30) + '...',
              parent_comment_id: newComment.parent_comment_id
            });
            
            // Notify all callbacks for this post
            callbacks.forEach(callback => {
              if (callback.onNewComment) {
                console.log('🔔 [RealtimeComments] Calling onNewComment callback');
                callback.onNewComment(newComment);
              }
              
              // Add to notifications (unless it's the user's own comment)
              if (newComment.user_id !== callback.userId) {
                setNewCommentIds(prev => {
                  if (!prev.includes(newComment.id)) {
                    return [...prev, newComment.id];
                  }
                  return prev;
                });
              }
            });
          } else {
            console.warn('🔔 [RealtimeComments] Invalid payload.new:', payload.new);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'post_comments',
          filter: `post_id=eq.${targetPostId}`,
        },
        (payload) => {
          console.log('🔔 [RealtimeComments] Comment updated:', payload);
          if (payload.new && typeof payload.new === 'object') {
            const updatedComment = payload.new as NewCommentData;
            
            // Notify all callbacks for this post
            callbacks.forEach(callback => {
              if (callback.onCommentUpdate) {
                callback.onCommentUpdate(updatedComment.id);
              }
            });
          }
        }
      )
      .subscribe((status) => {
        console.log(`🔔 [RealtimeComments] Subscription status: ${status}`);
        
        const isSubscribed = status === 'SUBSCRIBED';
        setIsConnected(isSubscribed);
        isSubscribedRef.current = isSubscribed;
        
        if (status === 'CHANNEL_ERROR') {
          setConnectionError('Failed to connect to real-time comments');
        } else if (status === 'SUBSCRIBED') {
          setConnectionError(null);
        }
      });

    // Store subscription globally
    globalSubscriptions.set(targetPostId, {
      channel,
      refCount: 1,
      callbacks
    });

    console.log(`🔔 [RealtimeComments] New subscription created for post: ${targetPostId}`);
  }, []);

  // Cleanup subscription
  const cleanupSubscription = useCallback((targetPostId: string) => {
    const subscription = globalSubscriptions.get(targetPostId);
    
    if (!subscription) {
      console.log(`🔔 [RealtimeComments] No subscription found for cleanup: ${targetPostId}`);
      return;
    }

    // Remove our callback
    subscription.callbacks.delete(callbackRef.current);
    subscription.refCount--;

    console.log(`🔔 [RealtimeComments] Cleaning up subscription for post: ${targetPostId} (remaining refs: ${subscription.refCount})`);

    // If no more references, actually cleanup the subscription
    if (subscription.refCount <= 0) {
      console.log(`🔔 [RealtimeComments] Fully removing subscription for post: ${targetPostId}`);
      getSupabaseClient().removeChannel(subscription.channel);
      globalSubscriptions.delete(targetPostId);
    }

    // Update local state
    if (stablePostIdRef.current === targetPostId) {
      setIsConnected(false);
      setConnectionError(null);
      isSubscribedRef.current = false;
      stablePostIdRef.current = null;
    }
  }, []);

  // Set up real-time subscription with debouncing
  useEffect(() => {
    if (!isEnabled || !postId) {
      console.log('🔔 [RealtimeComments] Subscription disabled or no postId:', { isEnabled, postId });
      return;
    }

    // Add a small delay to prevent rapid subscription churn
    const debounceTimeout = setTimeout(() => {
      setupSubscriptionDebounced(postId);
    }, 100); // 100ms debounce

    // Cleanup function
    return () => {
      clearTimeout(debounceTimeout);
      if (stablePostIdRef.current) {
        cleanupSubscription(stablePostIdRef.current);
      }
    };
  }, [postId, isEnabled, setupSubscriptionDebounced, cleanupSubscription]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stablePostIdRef.current) {
        cleanupSubscription(stablePostIdRef.current);
      }
    };
  }, [cleanupSubscription]);

  return {
    isConnected,
    connectionError,
    newCommentIds,
    newCommentCount: newCommentIds.length,
    clearNewComments,
    removeCommentId,
  };
};
