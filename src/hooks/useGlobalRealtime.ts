import { useEffect, useRef, useState } from 'react';
import { globalRealtimeService } from '@/services/GlobalRealtimeService';

interface UseGlobalRealtimeOptions {
  event?: string;
  filter?: string;
  enabled?: boolean;
}

/**
 * Hook to use GlobalRealtimeService
 * 
 * Drop-in replacement for direct Supabase real-time subscriptions
 * that automatically handles subscription pooling and reuse.
 */
export const useGlobalRealtime = (
  spaceId: string | null,
  table: string,
  callback: (payload: any) => void,
  options: UseGlobalRealtimeOptions = {}
) => {
  const { event = '*', filter, enabled = true } = options;
  
  const [isConnected, setIsConnected] = useState(false);
  const subscriptionIdRef = useRef<string | null>(null);
  const callbackRef = useRef(callback);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Create a stable callback that uses the ref
  const stableCallback = useRef((payload: any) => {
    callbackRef.current(payload);
  });

  useEffect(() => {
    if (!enabled || !spaceId || !table) {
      setIsConnected(false);
      return;
    }

    console.log(`🔔 [useGlobalRealtime] Subscribing to ${table} for space ${spaceId}`);

    // Subscribe using global service
    subscriptionIdRef.current = globalRealtimeService.subscribe(
      spaceId,
      table,
      stableCallback.current,
      { event, filter }
    );

    setIsConnected(true);

    // Cleanup function
    return () => {
      if (subscriptionIdRef.current) {
        console.log(`🔔 [useGlobalRealtime] Unsubscribing from ${table} for space ${spaceId}`);
        globalRealtimeService.unsubscribe(subscriptionIdRef.current);
        subscriptionIdRef.current = null;
      }
      setIsConnected(false);
    };
  }, [spaceId, table, event, filter, enabled]);

  return {
    isConnected,
    subscriptionId: subscriptionIdRef.current
  };
};

/**
 * Hook specifically for posts real-time subscriptions
 */
export const useGlobalRealtimePosts = (
  spaceId: string | null,
  callback: (payload: any) => void,
  enabled = true
) => {
  return useGlobalRealtime(
    spaceId,
    'posts',
    callback,
    {
      event: '*',
      filter: spaceId ? `space_id=eq.${spaceId}` : undefined,
      enabled
    }
  );
};

/**
 * Hook specifically for comments real-time subscriptions
 */
export const useGlobalRealtimeComments = (
  spaceId: string | null,
  callback: (payload: any) => void,
  enabled = true
) => {
  return useGlobalRealtime(
    spaceId,
    'post_comments',
    callback,
    {
      event: '*',
      filter: spaceId ? `space_id=eq.${spaceId}` : undefined,
      enabled
    }
  );
};

/**
 * Hook specifically for individual post comments
 */
export const useGlobalRealtimePostComments = (
  postId: string | null,
  callback: (payload: any) => void,
  enabled = true
) => {
  // We still need spaceId for the global service, but we can extract it from the post
  // For now, we'll use a special marker to indicate this is a post-specific subscription
  return useGlobalRealtime(
    postId ? `post:${postId}` : null,
    'post_comments',
    callback,
    {
      event: '*',
      filter: postId ? `post_id=eq.${postId}` : undefined,
      enabled
    }
  );
}; 