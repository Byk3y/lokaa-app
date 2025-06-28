import { useEffect, useState, useRef } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

// 🔧 GLOBAL SUBSCRIPTION MANAGER: Prevent duplicate subscriptions for same space
// Each space gets ONE subscription shared by all PostCard components
interface GlobalSubscription {
  channel: RealtimeChannel;
  refCount: number;
  callbacks: Set<{
    onLikeAdded?: (postId: string, userId: string) => void;
    onLikeRemoved?: (postId: string, userId: string) => void;
  }>;
}

const globalSubscriptions = new Map<string, GlobalSubscription>();

interface UseRealtimePostLikesProps {
  spaceId: string;
  userId?: string;
  enabled?: boolean;
  onLikeAdded?: (postId: string, userId: string) => void;
  onLikeRemoved?: (postId: string, userId: string) => void; // 🔥 RE-ADDED: For cross-user unlike updates
}

interface UseRealtimePostLikesReturn {
  isConnected: boolean;
  connectionStatus: string;
}

/**
 * 🚀 Real-time hook for post likes using Supabase subscriptions
 * Follows the same pattern as useRealtimeCommentsOptimized
 */
export const useRealtimePostLikes = ({
  spaceId,
  userId,
  enabled = true,
  onLikeAdded,
  onLikeRemoved
}: UseRealtimePostLikesProps): UseRealtimePostLikesReturn => {
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
      console.log('🔔 [RealtimePostLikes] Skipping subscription setup - disabled or no spaceId');
      return;
    }

    console.log('🔔 [RealtimePostLikes] Setting up subscription for space:', spaceId);
    console.log('🔔 [RealtimePostLikes] Current user ID:', userId);

    // Create callback object for this hook instance
    const callbackObj = { onLikeAdded, onLikeRemoved };

    // Check if subscription already exists for this space
    const existingSubscription = globalSubscriptions.get(spaceId);
    
    if (existingSubscription) {
      // Reuse existing subscription
      existingSubscription.refCount++;
      existingSubscription.callbacks.add(callbackObj);
      setIsConnected(true);
      setConnectionStatus('SUBSCRIBED');
      console.log(`🔔 [RealtimePostLikes] Reusing existing subscription for space: ${spaceId} (refs: ${existingSubscription.refCount})`);
      
      // Store reference for cleanup
      channelRef.current = existingSubscription.channel;
    } else {
      // Create new subscription
      const supabase = getSupabaseClient();
      const channelName = `post-likes-${spaceId}`;
      const callbacks = new Set([callbackObj]);

      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'post_likes'
          },
          async (payload) => {
            console.log('🔔 [RealtimePostLikes] New like detected:', payload);
            
            if (payload.new && typeof payload.new === 'object') {
              const newLike = payload.new as any;
              const { post_id, user_id } = newLike;

              // Skip if it's the current user's own like (already handled optimistically)
              if (userId && user_id === userId) {
                console.log('🔔 [RealtimePostLikes] Skipping own like');
                return;
              }

              // 🔍 SPACE FILTERING: Check if this post belongs to our current space
              try {
                const { data: post, error } = await supabase
                  .from('posts')
                  .select('space_id')
                  .eq('id', post_id)
                  .single();

                if (error) {
                  console.warn('🔔 [RealtimePostLikes] Could not verify post space:', error);
                  return;
                }

                if (post?.space_id !== spaceId) {
                  console.log('🔔 [RealtimePostLikes] Like is for different space, ignoring');
                  return;
                }

                console.log('🔔 [RealtimePostLikes] Processing like from other user:', {
                  postId: post_id,
                  userId: user_id,
                  spaceId: post.space_id
                });

                // Notify all callbacks for this space
                callbacks.forEach(callback => {
                  if (callback.onLikeAdded) {
                    callback.onLikeAdded(post_id, user_id);
                  }
                });
              } catch (err) {
                console.warn('🔔 [RealtimePostLikes] Error checking post space:', err);
              }
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'post_likes'
          },
          async (payload) => {
            console.log('🔔 [RealtimePostLikes] Like deletion detected:', payload);
            
            // 🔥 CRITICAL ISSUE: DELETE events only contain the primary key (id)
            // We can't determine which post was unliked without post_id and user_id
            // Solution: Trigger a like count refresh for all visible posts
            
            console.log('🔔 [RealtimePostLikes] Triggering like count refresh due to DELETE event');
            
            // Notify all callbacks to refresh their like counts
            callbacks.forEach(callback => {
              if (callback.onLikeRemoved) {
                // Use special signal to indicate "refresh all counts"
                callback.onLikeRemoved('REFRESH_ALL', 'unknown_user');
              }
            });
          }
        )
        .subscribe((status) => {
          console.log(`🔔 [RealtimePostLikes] Subscription status: ${status}`);
          setConnectionStatus(status);
          setIsConnected(status === 'SUBSCRIBED');
        });

      // Store subscription globally
      globalSubscriptions.set(spaceId, {
        channel,
        refCount: 1,
        callbacks
      });

      channelRef.current = channel;
      console.log(`🔔 [RealtimePostLikes] New subscription created for space: ${spaceId}`);
    }

    return () => {
      console.log('🔔 [RealtimePostLikes] Cleaning up subscription');
      
      const subscription = globalSubscriptions.get(spaceId);
      if (subscription) {
        // Remove our callback
        subscription.callbacks.delete(callbackObj);
        subscription.refCount--;
        
        console.log(`🔔 [RealtimePostLikes] Decremented ref count for space: ${spaceId} (refs: ${subscription.refCount})`);
        
        // If no more references, clean up the subscription
        if (subscription.refCount <= 0) {
          console.log(`🔔 [RealtimePostLikes] Removing subscription for space: ${spaceId}`);
          const supabase = getSupabaseClient();
          supabase.removeChannel(subscription.channel);
          globalSubscriptions.delete(spaceId);
        }
      }
      
      channelRef.current = null;
      setIsConnected(false);
      setConnectionStatus('CLOSED');
    };
  }, [spaceId, userId, enabled, onLikeAdded, onLikeRemoved]);

  return {
    isConnected,
    connectionStatus
  };
}; 