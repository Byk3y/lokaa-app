/**
 * 🚀 Phase 2B: Unified Real-time React Integration Hook
 * 
 * Provides seamless React integration for the unified real-time system:
 * - Automatic subscription management
 * - Component lifecycle integration
 * - Performance monitoring
 * - Error handling and recovery
 */

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { unifiedRealtimeSystem } from '@/utils/unifiedRealtimeSystem';
import type { RealtimeSubscription } from '@/utils/unifiedRealtimeSystem';
import { devLogger } from '@/utils/developmentLogger';

interface UseUnifiedRealtimeOptions {
  enabled?: boolean;
  priority?: 'high' | 'normal' | 'low';
  enableBatching?: boolean;
  filter?: string;
  onError?: (error: Error) => void;
  onConnectionChange?: (status: 'connected' | 'disconnected' | 'error') => void;
}

interface UseUnifiedRealtimeReturn {
  isConnected: boolean;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
  subscriptionCount: number;
  lastActivity: Date | null;
  error: Error | null;
  retry: () => void;
  getMetrics: () => Record<string, any>;
}

/**
 * Hook for subscribing to real-time events with unified optimization
 */
export function useUnifiedRealtime(
  spaceId: string | null,
  table: string,
  callback: (payload: any) => void,
  options: UseUnifiedRealtimeOptions = {}
): UseUnifiedRealtimeReturn {
  const {
    enabled = true,
    priority = 'normal',
    enableBatching = true,
    filter,
    onError,
    onConnectionChange
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'fair' | 'poor' | 'unknown'>('unknown');
  const [subscriptionCount, setSubscriptionCount] = useState(0);
  const [lastActivity, setLastActivity] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const subscriptionIdsRef = useRef<string[]>([]);
  const callbackRef = useRef(callback);
  const optionsRef = useRef(options);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  // Update refs when dependencies change
  useEffect(() => {
    callbackRef.current = callback;
    optionsRef.current = options;
  }, [callback, options]);

  /**
   * Enhanced callback with error handling and metrics
   */
  const enhancedCallback = useCallback((payload: any) => {
    try {
      setLastActivity(new Date());
      setError(null);
      retryCountRef.current = 0;
      
      callbackRef.current(payload);
      
      devLogger.log('UnifiedRealtime', `📨 Event received for ${table} in space ${spaceId}`);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown callback error');
      setError(error);
      
      devLogger.warn('UnifiedRealtime', `Error in callback for ${table}:`, error);
      
      if (optionsRef.current.onError) {
        optionsRef.current.onError(error);
      }
      
      // Retry logic
      retryCountRef.current++;
      if (retryCountRef.current <= maxRetries) {
        devLogger.log('UnifiedRealtime', `Retrying callback (${retryCountRef.current}/${maxRetries})`);
        setTimeout(() => {
          try {
            callbackRef.current(payload);
          } catch (retryErr) {
            devLogger.warn('UnifiedRealtime', 'Retry failed:', retryErr);
          }
        }, 1000 * retryCountRef.current);
      }
    }
  }, [spaceId, table]);

  /**
   * Subscribe to real-time events
   */
  const subscribe = useCallback(() => {
    if (!spaceId || !enabled) return;

    try {
      const subscriptionId = unifiedRealtimeSystem.subscribe(
        spaceId,
        table,
        enhancedCallback,
        {
          event: '*', // Listen to all events by default
          filter,
          priority,
          enableBatching
        }
      );

      subscriptionIdsRef.current.push(subscriptionId);
      setSubscriptionCount(prev => prev + 1);
      setIsConnected(true);
      
      devLogger.log('UnifiedRealtime', `🔗 Subscribed to ${table} in space ${spaceId} (${subscriptionId})`);
      
      if (onConnectionChange) {
        onConnectionChange('connected');
      }

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Subscription failed');
      setError(error);
      setIsConnected(false);
      
      devLogger.warn('UnifiedRealtime', `Failed to subscribe to ${table}:`, error);
      
      if (onError) {
        onError(error);
      }
      
      if (onConnectionChange) {
        onConnectionChange('error');
      }
    }
  }, [spaceId, table, enabled, enhancedCallback, filter, priority, enableBatching, onError, onConnectionChange]);

  /**
   * Unsubscribe from all real-time events
   */
  const unsubscribe = useCallback(() => {
    subscriptionIdsRef.current.forEach(subscriptionId => {
      try {
        unifiedRealtimeSystem.unsubscribe(subscriptionId);
        devLogger.log('UnifiedRealtime', `🔌 Unsubscribed from ${subscriptionId}`);
      } catch (err) {
        devLogger.warn('UnifiedRealtime', `Failed to unsubscribe from ${subscriptionId}:`, err);
      }
    });

    subscriptionIdsRef.current = [];
    setSubscriptionCount(0);
    setIsConnected(false);
    
    if (onConnectionChange) {
      onConnectionChange('disconnected');
    }
  }, [onConnectionChange]);

  /**
   * Retry connection
   */
  const retry = useCallback(() => {
    devLogger.log('UnifiedRealtime', `🔄 Retrying connection for ${table} in space ${spaceId}`);
    
    unsubscribe();
    setError(null);
    
    // Retry after a short delay
    setTimeout(() => {
      subscribe();
    }, 1000);
  }, [subscribe, unsubscribe, table, spaceId]);

  /**
   * Get performance metrics
   */
  const getMetrics = useCallback(() => {
    const debugInfo = unifiedRealtimeSystem.getDebugInfo();
    const connectionHealth = unifiedRealtimeSystem.getConnectionHealth();
    
    return {
      ...debugInfo,
      connectionHealth,
      currentSubscriptions: subscriptionIdsRef.current,
      lastActivity: lastActivity?.toISOString(),
      error: error?.message,
      retryCount: retryCountRef.current
    };
  }, [lastActivity, error]);

  /**
   * Monitor connection quality
   */
  useEffect(() => {
    if (!spaceId) return;

    const interval = setInterval(() => {
      const connectionHealth = unifiedRealtimeSystem.getConnectionHealth();
      const channelKey = `${spaceId}_${table}`;
      const channelHealth = connectionHealth[channelKey];
      
      if (channelHealth) {
        setConnectionQuality(channelHealth.quality || 'unknown');
        
        // Update connection status based on health
        if (channelHealth.status === 'error') {
          setIsConnected(false);
          if (onConnectionChange) {
            onConnectionChange('error');
          }
        } else if (channelHealth.status === 'connected' || channelHealth.status === 'SUBSCRIBED') {
          setIsConnected(true);
          if (onConnectionChange) {
            onConnectionChange('connected');
          }
        }
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [spaceId, table, onConnectionChange]);

  /**
   * Subscribe on mount and when dependencies change
   */
  useEffect(() => {
    if (enabled && spaceId) {
      subscribe();
    }

    return () => {
      unsubscribe();
    };
  }, [enabled, spaceId, subscribe, unsubscribe]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      unsubscribe();
    };
  }, [unsubscribe]);

  return {
    isConnected,
    connectionQuality,
    subscriptionCount,
    lastActivity,
    error,
    retry,
    getMetrics
  };
}

/**
 * Hook for multiple real-time subscriptions with unified management
 */
export function useMultipleUnifiedRealtime(
  subscriptions: Array<{
    spaceId: string;
    table: string;
    callback: (payload: any) => void;
    options?: UseUnifiedRealtimeOptions;
  }>,
  globalOptions: UseUnifiedRealtimeOptions = {}
): {
  connections: Record<string, UseUnifiedRealtimeReturn>;
  overallHealth: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
  totalSubscriptions: number;
  retryAll: () => void;
  getGlobalMetrics: () => Record<string, any>;
} {
  const [connections, setConnections] = useState<Record<string, UseUnifiedRealtimeReturn>>({});

  // Create individual connections
  const connectionResults = subscriptions.map((sub, index) => {
    const key = `${sub.spaceId}_${sub.table}_${index}`;
    const result = useUnifiedRealtime(
      sub.spaceId,
      sub.table,
      sub.callback,
      { ...globalOptions, ...sub.options }
    );
    
    return { key, result };
  });

  // Update connections state
  useEffect(() => {
    const newConnections: Record<string, UseUnifiedRealtimeReturn> = {};
    connectionResults.forEach(({ key, result }) => {
      newConnections[key] = result;
    });
    setConnections(newConnections);
  }, [connectionResults]);

  // Calculate overall health
  const overallHealth = useMemo(() => {
    const qualities = Object.values(connections).map(conn => conn.connectionQuality);
    if (qualities.length === 0) return 'unknown';
    
    const qualityScores = {
      'excellent': 4,
      'good': 3,
      'fair': 2,
      'poor': 1,
      'unknown': 0
    };
    
    const avgScore = qualities.reduce((sum, quality) => sum + qualityScores[quality], 0) / qualities.length;
    
    if (avgScore >= 3.5) return 'excellent';
    if (avgScore >= 2.5) return 'good';
    if (avgScore >= 1.5) return 'fair';
    if (avgScore >= 0.5) return 'poor';
    return 'unknown';
  }, [connections]);

  // Calculate total subscriptions
  const totalSubscriptions = useMemo(() => {
    return Object.values(connections).reduce((sum, conn) => sum + conn.subscriptionCount, 0);
  }, [connections]);

  // Retry all connections
  const retryAll = useCallback(() => {
    Object.values(connections).forEach(conn => conn.retry());
  }, [connections]);

  // Get global metrics
  const getGlobalMetrics = useCallback(() => {
    const globalMetrics = unifiedRealtimeSystem.getDebugInfo();
    const connectionMetrics = Object.entries(connections).map(([key, conn]) => ({
      key,
      metrics: conn.getMetrics()
    }));
    
    return {
      ...globalMetrics,
      connectionMetrics,
      overallHealth,
      totalSubscriptions
    };
  }, [connections, overallHealth, totalSubscriptions]);

  return {
    connections,
    overallHealth,
    totalSubscriptions,
    retryAll,
    getGlobalMetrics
  };
}

/**
 * Hook for real-time presence management (Legacy - use useSpacePresence from useUnifiedPresence.ts instead)
 * @deprecated Use useSpacePresence from useUnifiedPresence.ts for proper presence management
 */
export function useRealtimePresence(
  spaceId: string | null,
  userId: string | null,
  options: {
    enabled?: boolean;
    heartbeatInterval?: number;
    onPresenceChange?: (presence: any[]) => void;
  } = {}
): {
  isOnline: boolean;
  presenceList: any[];
  onlineCount: number;
  updatePresence: (data: any) => void;
  error: Error | null;
} {
  const { enabled = true, heartbeatInterval = 30000, onPresenceChange } = options;
  
  const [isOnline, setIsOnline] = useState(false);
  const [presenceList, setPresenceList] = useState<any[]>([]);
  const [error, setError] = useState<Error | null>(null);

  // Subscribe to presence events
  const { isConnected } = useUnifiedRealtime(
    spaceId,
    'presence',
    useCallback((payload) => {
      try {
        const { eventType, presence } = payload;
        
        if (eventType === 'presence_diff') {
          setPresenceList(presence || []);
          if (onPresenceChange) {
            onPresenceChange(presence || []);
          }
        }
        
        setError(null);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Presence update failed');
        setError(error);
        devLogger.warn('UnifiedPresence', 'Error handling presence update:', error);
      }
    }, [onPresenceChange]),
    {
      enabled: enabled && !!spaceId && !!userId,
      priority: 'high', // Presence updates are high priority
      enableBatching: false // Don't batch presence updates
    }
  );

  // Update online status based on connection
  useEffect(() => {
    setIsOnline(isConnected);
  }, [isConnected]);

  // Calculate online count
  const onlineCount = useMemo(() => {
    return presenceList.length;
  }, [presenceList]);

  // Update presence data
  const updatePresence = useCallback((data: any) => {
    if (!spaceId || !userId) return;
    
    try {
      // This would integrate with the presence system
      // For now, we'll just log the update
      devLogger.log('UnifiedPresence', `Updating presence for user ${userId} in space ${spaceId}:`, data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update presence');
      setError(error);
      devLogger.warn('UnifiedPresence', 'Failed to update presence:', error);
    }
  }, [spaceId, userId]);

  return {
    isOnline,
    presenceList,
    onlineCount,
    updatePresence,
    error
  };
}

// Re-export types for convenience
export type { UseUnifiedRealtimeOptions, UseUnifiedRealtimeReturn }; 