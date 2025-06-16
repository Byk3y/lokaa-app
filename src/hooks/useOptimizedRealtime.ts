import { useEffect, useRef, useState, useCallback } from 'react';
import { unifiedRealtimeSystem } from '@/utils/unifiedRealtimeSystem';
import { devLogger } from '@/utils/developmentLogger';

interface OptimizedRealtimeOptions {
  spaceId?: string;
  table?: string;
  filter?: string;
  enabled?: boolean;
  debounceMs?: number;
  retryAttempts?: number;
  legacyMode?: boolean;
  onError?: (error: Error) => void;
  onConnectionChange?: (connected: boolean) => void;
}

interface OptimizedRealtimeReturn {
  data: any[];
  loading: boolean;
  error: Error | null;
  connected: boolean;
  retryCount: number;
  subscribe: () => void;
  unsubscribe: () => void;
  reconnect: () => void;
  getDebugInfo: () => any;
}

/**
 * Enhanced real-time hook with optimization features
 * Drop-in replacement for existing real-time hooks
 */
export const useOptimizedRealtime = (options: OptimizedRealtimeOptions): OptimizedRealtimeReturn => {
  const {
    spaceId,
    table = 'posts',
    filter,
    enabled = true,
    debounceMs = 100,
    retryAttempts = 3,
    legacyMode = false,
    onError,
    onConnectionChange
  } = options;

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [connected, setConnected] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const subscriptionRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Debounced data update
  const updateData = useCallback((newData: any[]) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (mountedRef.current) {
        setData(newData);
        setLoading(false);
      }
    }, debounceMs);
  }, [debounceMs]);

  // Subscribe function
  const subscribe = useCallback(() => {
    if (!enabled || !spaceId || subscriptionRef.current) return;

    setLoading(true);
    setError(null);

    try {
      const subscriptionId = unifiedRealtimeSystem.subscribe(
        spaceId,
        table,
        (payload) => {
          devLogger.log('OptimizedRealtime', `📡 Data update for ${table}:${spaceId}`, payload);
          
          if (payload.eventType === 'INSERT') {
            setData(prev => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setData(prev => prev.map(item => 
              item.id === payload.new.id ? payload.new : item
            ));
          } else if (payload.eventType === 'DELETE') {
            setData(prev => prev.filter(item => item.id !== payload.old.id));
          }
          
          setLoading(false);
          setConnected(true);
        },
        {
          filter: filter || `space_id=eq.${spaceId}`,
          priority: 'normal'
        }
      );

      subscriptionRef.current = subscriptionId;
      devLogger.log('OptimizedRealtime', `✅ Subscribed to ${table}:${spaceId}`);
      
    } catch (err) {
      const error = err as Error;
      devLogger.log('OptimizedRealtime', `❌ Failed to subscribe to ${table}:${spaceId}`, error);
      setError(error);
      setLoading(false);
      onError?.(error);
    }
  }, [enabled, spaceId, table, filter, onError]);

  // Unsubscribe function
  const unsubscribe = useCallback(() => {
    if (subscriptionRef.current) {
      unifiedRealtimeSystem.unsubscribe(subscriptionRef.current);
      subscriptionRef.current = null;
      setConnected(false);
      devLogger.log('OptimizedRealtime', `🔌 Unsubscribed from ${table}:${spaceId}`);
    }
  }, [table, spaceId]);

  // Reconnect function
  const reconnect = useCallback(() => {
    unsubscribe();
    setTimeout(subscribe, 1000);
  }, [subscribe, unsubscribe]);

  // Get debug info function
  const getDebugInfo = useCallback(() => {
    return unifiedRealtimeSystem.getDebugInfo();
  }, []);

  // Effect for subscription management
  useEffect(() => {
    if (enabled && spaceId) {
      subscribe();
    }

    return () => {
      unsubscribe();
    };
  }, [enabled, spaceId, subscribe, unsubscribe]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      unsubscribe();
    };
  }, [unsubscribe]);

  return {
    data,
    loading,
    error,
    connected,
    retryCount,
    subscribe,
    unsubscribe,
    reconnect,
    getDebugInfo
  };
};

// Legacy compatibility wrapper
export const useOptimizedRealtimePosts = (options: { spaceId: string; enabled?: boolean }) => {
  return useOptimizedRealtime({
    ...options,
    table: 'posts',
    filter: `space_id=eq.${options.spaceId}`
  });
};

// Migration helper
export const migrateToOptimizedRealtime = (legacyHookName: string) => {
  devLogger.log('OptimizedRealtime', `🔄 Migration helper called for ${legacyHookName}`);
  devLogger.log('OptimizedRealtime', '📋 Migration steps:');
  devLogger.log('OptimizedRealtime', '1. Replace import with useOptimizedRealtime');
  devLogger.log('OptimizedRealtime', '2. Update hook options to new format');
  devLogger.log('OptimizedRealtime', '3. Test with legacyMode: true first');
  devLogger.log('OptimizedRealtime', '4. Remove legacyMode when stable');
}; 