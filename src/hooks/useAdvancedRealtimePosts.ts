import { log } from '@/utils/logger';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface AdvancedRealtimePostsProps {
  spaceId: string;
  userId: string;
  isEnabled?: boolean;
  performanceMode?: 'standard' | 'performance' | 'battery';
  maxReconnectAttempts?: number;
}

interface NewPostData {
  id: string;
  created_at: string;
  user_id: string;
  title: string | null;
  content?: string;
  space_id: string;
}

interface ConnectionHealth {
  status: 'excellent' | 'good' | 'fair' | 'poor';
  latency: number;
  reconnectCount: number;
  packetsReceived: number;
}

const PERFORMANCE_CONFIGS = {
  standard: { debounceMs: 5000, maxBatch: 10, heartbeat: 60000 }, // EGRESS FIX: Increased debounce and heartbeat
  performance: { debounceMs: 3000, maxBatch: 15, heartbeat: 30000 }, // EGRESS FIX: Increased intervals
  battery: { debounceMs: 10000, maxBatch: 5, heartbeat: 120000 }, // EGRESS FIX: Increased intervals
};

export const useAdvancedRealtimePosts = ({
  spaceId,
  userId,
  isEnabled = true,
  performanceMode = 'standard',
  maxReconnectAttempts = 5,
}: AdvancedRealtimePostsProps) => {
  const config = PERFORMANCE_CONFIGS[performanceMode];
  
  const [newPostIds, setNewPostIds] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionHealth, setConnectionHealth] = useState<ConnectionHealth>({
    status: 'excellent',
    latency: 0,
    reconnectCount: 0,
    packetsReceived: 0,
  });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectAttempts = useRef(0);
  const batchQueue = useRef<NewPostData[]>([]);
  const debounceTimer = useRef<NodeJS.Timeout>();
  const heartbeatTimer = useRef<NodeJS.Timeout>();

  // Intelligent batch processing
  const processBatch = useCallback(() => {
    if (batchQueue.current.length === 0) return;

    const batch = [...batchQueue.current];
    batchQueue.current = [];

    const uniqueIds = batch
      .map(post => post.id)
      .filter((id, index, self) => self.indexOf(id) === index);

    setNewPostIds(prev => {
      const newIds = uniqueIds.filter(id => !prev.includes(id));
      if (newIds.length > 0) {
        log.debug('Hook', `✨ [AdvancedRealtime] Processed ${newIds.length} new posts`);
        return [...prev, ...newIds].slice(-20); // Keep only last 20 for memory efficiency
      }
      return prev;
    });
  }, []);

  // Add post to processing queue
  const queuePost = useCallback((postData: NewPostData) => {
    if (postData.user_id === userId) return;

    batchQueue.current.push(postData);
    
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    const delay = batchQueue.current.length >= config.maxBatch ? 500 : config.debounceMs;
    
    debounceTimer.current = setTimeout(processBatch, delay);
  }, [userId, config, processBatch]);

  // Connection management with auto-reconnect
  const establishConnection = useCallback(() => {
    if (!isEnabled || !spaceId) return;

    const startTime = Date.now();
    
    const channel = getSupabaseClient()
      .channel(`posts_${spaceId}_advanced`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
          filter: `space_id=eq.${spaceId}`,
        },
        (payload) => {
          const latency = Date.now() - startTime;
          
          setConnectionHealth(prev => ({
            ...prev,
            latency: (prev.latency + latency) / 2,
            packetsReceived: prev.packetsReceived + 1,
          }));

          if (payload.new && typeof payload.new === 'object') {
            queuePost(payload.new as NewPostData);
          }
        }
      )
      .subscribe((status) => {
        log.debug('Hook', `🔔 [AdvancedRealtime] Status: ${status}`);
        
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          reconnectAttempts.current = 0;
          
          // Start heartbeat
          heartbeatTimer.current = setInterval(() => {
            log.debug('Hook', '💓 [AdvancedRealtime] Heartbeat');
          }, config.heartbeat);
          
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          setConnectionHealth(prev => ({
            ...prev,
            reconnectCount: prev.reconnectCount + 1,
            status: prev.reconnectCount > 2 ? 'poor' : 'fair',
          }));
          
          // Auto-reconnect with exponential backoff
          if (reconnectAttempts.current < maxReconnectAttempts) {
            const backoffDelay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
            setTimeout(() => {
              reconnectAttempts.current++;
              establishConnection();
            }, backoffDelay);
          }
        }
      });

    channelRef.current = channel;
  }, [isEnabled, spaceId, config, maxReconnectAttempts, queuePost]);

  // Setup connection
  useEffect(() => {
    establishConnection();

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (heartbeatTimer.current) clearTimeout(heartbeatTimer.current);
      if (channelRef.current) {
        getSupabaseClient().removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsConnected(false);
    };
  }, [establishConnection]);

  const clearNewPosts = useCallback(() => {
    setNewPostIds([]);
    batchQueue.current = [];
  }, []);

  const forceReconnect = useCallback(() => {
    if (channelRef.current) {
      getSupabaseClient().removeChannel(channelRef.current);
      channelRef.current = null;
    }
    reconnectAttempts.current = 0;
    establishConnection();
  }, [establishConnection]);

  return {
    newPostIds,
    newPostCount: newPostIds.length,
    isConnected,
    connectionHealth,
    clearNewPosts,
    forceReconnect,
  };
}; 