import { useEffect, useState } from 'react';
import { useRealtime } from '@/hooks/useRealtime';

interface UseGlobalRealtimeOptions {
  event?: string;
  filter?: string;
  enabled?: boolean;
}

/**
 * useGlobalRealtime - Compatibility wrapper for the new unified useRealtime hook
 */
export const useGlobalRealtime = (
  spaceId: string | null,
  table: string,
  callback: (payload: any) => void,
  options: UseGlobalRealtimeOptions = {}
) => {
  const { event = '*', filter, enabled = true } = options;
  const [isConnected, setIsConnected] = useState(false);

  useRealtime(
    (enabled && spaceId) ? spaceId : undefined,
    table,
    callback,
    {
      event: event as 'INSERT' | 'UPDATE' | 'DELETE' | '*',
      filter,
      protectOnNavigation: true
    }
  );

  useEffect(() => {
    setIsConnected(enabled && !!spaceId);
  }, [enabled, spaceId]);

  return {
    isConnected,
    subscriptionId: `compat:${spaceId}:${table}`
  };
};

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

export const useGlobalRealtimePostComments = (
  postId: string | null,
  callback: (payload: any) => void,
  enabled = true
) => {
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