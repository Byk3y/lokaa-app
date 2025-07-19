import { log } from '@/utils/logger';
/**
 * 🚀 Unified Realtime Manager
 * 
 * Consolidates useRealtimePosts.ts + useOptimizedRealtimePosts.ts + useAdvancedRealtimePosts.ts
 * into a single, efficient realtime system with:
 * - Connection pooling and sharing
 * - Intelligent reconnection strategies
 * - Batched event processing
 * - Memory-efficient subscription management
 */

import { createClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/integrations/supabase/client';

type RealtimeChannel = any; // Type from Supabase

interface RealtimeSubscription {
  id: string;
  spaceId: string;
  table: string;
  filter?: string;
  callback: (payload: any) => void;
  isActive: boolean;
  lastActivity: number;
}

interface ConnectionMetrics {
  connectTime: number;
  reconnectCount: number;
  avgLatency: number;
  packetsReceived: number;
  lastHeartbeat: number;
}

interface RealtimeConfig {
  maxReconnectAttempts: number;
  reconnectBaseDelay: number;
  heartbeatInterval: number;
  batchDelay: number;
  maxBatchSize: number;
  connectionTimeout: number;
  enableBatching: boolean;
  enableHeartbeat: boolean;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting';

class UnifiedRealtimeManager {
  private static instance: UnifiedRealtimeManager;
  private channels: Map<string, RealtimeChannel> = new Map();
  private subscriptions: Map<string, RealtimeSubscription> = new Map();
  private connectionMetrics: Map<string, ConnectionMetrics> = new Map();
  private batchQueues: Map<string, any[]> = new Map();
  private batchTimers: Map<string, NodeJS.Timeout> = new Map();
  private heartbeatTimers: Map<string, NodeJS.Timeout> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private connectionStatus: Map<string, ConnectionStatus> = new Map();
  private config: RealtimeConfig;
  private isEnabled = true;

  private constructor() {
    this.config = {
      maxReconnectAttempts: 5,
      reconnectBaseDelay: 1000,
      heartbeatInterval: 30000,
      batchDelay: 100,
      maxBatchSize: 10,
      connectionTimeout: 10000,
      enableBatching: true,
      enableHeartbeat: true
    };

    this.setupGlobalHandlers();
  }

  public static getInstance(): UnifiedRealtimeManager {
    if (!UnifiedRealtimeManager.instance) {
      UnifiedRealtimeManager.instance = new UnifiedRealtimeManager();
    }
    return UnifiedRealtimeManager.instance;
  }

  /**
   * Subscribe to realtime events for a specific table in a space
   */
  public subscribe(
    spaceId: string,
    table: string,
    callback: (payload: any) => void,
    options: {
      filter?: string;
      event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
      enableBatching?: boolean;
    } = {}
  ): string {
    const {
      filter,
      event = 'INSERT',
      enableBatching = this.config.enableBatching
    } = options;

    const subscriptionId = `${spaceId}_${table}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const channelKey = `${spaceId}_${table}`;

    // Create subscription record
    const subscription: RealtimeSubscription = {
      id: subscriptionId,
      spaceId,
      table,
      filter,
      callback: enableBatching ? this.createBatchedCallback(subscriptionId, callback) : callback,
      isActive: true,
      lastActivity: Date.now()
    };

    this.subscriptions.set(subscriptionId, subscription);

    // Get or create channel
    let channel = this.channels.get(channelKey);
    if (!channel) {
      channel = this.createChannel(channelKey, spaceId, table);
      this.channels.set(channelKey, channel);
    }

    // Add event listener to existing channel
    this.addEventListenerToChannel(channel, event, filter || '', subscription);

    log.debug('Utils', `🔔 [UnifiedRealtime] Subscription created: ${subscriptionId} for ${table} in space ${spaceId}`);
    
    return subscriptionId;
  }

  /**
   * Unsubscribe from realtime events
   */
  public unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    subscription.isActive = false;
    this.subscriptions.delete(subscriptionId);

    // Clear batch timer if it exists
    const batchTimer = this.batchTimers.get(subscriptionId);
    if (batchTimer) {
      clearTimeout(batchTimer);
      this.batchTimers.delete(subscriptionId);
    }

    // Clear batch queue
    this.batchQueues.delete(subscriptionId);

    // Check if we can remove the channel
    const channelKey = `${subscription.spaceId}_${subscription.table}`;
    const hasActiveSubscriptions = Array.from(this.subscriptions.values())
      .some(sub => sub.isActive && `${sub.spaceId}_${sub.table}` === channelKey);

    if (!hasActiveSubscriptions) {
      this.removeChannel(channelKey);
    }

    log.debug('Utils', `🔔 [UnifiedRealtime] Subscription removed: ${subscriptionId}`);
  }

  /**
   * Create a new channel
   */
  private createChannel(channelKey: string, spaceId: string, table: string): RealtimeChannel {
    const startTime = performance.now();
    this.connectionStatus.set(channelKey, 'connecting');

    const channel = getSupabaseClient()
      .channel(`unified_${channelKey}`)
      .subscribe((status) => {
        this.handleConnectionStatusChange(channelKey, status, startTime);
      });

    // Setup heartbeat if enabled
    if (this.config.enableHeartbeat) {
      this.setupHeartbeat(channelKey);
    }

    return channel;
  }

  /**
   * Add event listener to channel
   */
  private addEventListenerToChannel(
    channel: RealtimeChannel,
    event: string,
    filter: string,
    subscription: RealtimeSubscription
  ): void {
    const eventConfig: any = {
      event: event === '*' ? '*' : event,
      schema: 'public',
      table: subscription.table
    };

    if (filter) {
      eventConfig.filter = filter;
    }

    channel.on('postgres_changes', eventConfig, (payload) => {
      this.handleRealtimeEvent(subscription, payload);
    });
  }

  /**
   * Handle realtime events
   */
  private handleRealtimeEvent(subscription: RealtimeSubscription, payload: any): void {
    if (!subscription.isActive) return;

    const channelKey = `${subscription.spaceId}_${subscription.table}`;
    const metrics = this.connectionMetrics.get(channelKey);
    
    if (metrics) {
      metrics.packetsReceived++;
      metrics.lastHeartbeat = Date.now();
    }

    subscription.lastActivity = Date.now();
    
    // Call the callback (either direct or batched)
    try {
      subscription.callback(payload);
    } catch (error) {
      log.error('Utils', `🔔 [UnifiedRealtime] Error in callback for ${subscription.id}:`, error);
    }
  }

  /**
   * Create batched callback
   */
  private createBatchedCallback(subscriptionId: string, originalCallback: (payload: any) => void) {
    return (payload: any) => {
      // Add to batch queue
      let queue = this.batchQueues.get(subscriptionId);
      if (!queue) {
        queue = [];
        this.batchQueues.set(subscriptionId, queue);
      }

      queue.push(payload);

      // Clear existing timer
      const existingTimer = this.batchTimers.get(subscriptionId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Process batch if it's full or after delay
      if (queue.length >= this.config.maxBatchSize) {
        this.processBatch(subscriptionId, originalCallback);
      } else {
        const timer = setTimeout(() => {
          this.processBatch(subscriptionId, originalCallback);
        }, this.config.batchDelay);
        
        this.batchTimers.set(subscriptionId, timer);
      }
    };
  }

  /**
   * Process batched events
   */
  private processBatch(subscriptionId: string, callback: (payload: any) => void): void {
    const queue = this.batchQueues.get(subscriptionId);
    if (!queue || queue.length === 0) return;

    // Clear timer
    const timer = this.batchTimers.get(subscriptionId);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(subscriptionId);
    }

    // Process all events in batch
    const events = [...queue];
    queue.length = 0; // Clear queue

    if (import.meta.env.DEV) {
      log.debug('Utils', `🔔 [UnifiedRealtime] Processing batch of ${events.length} events for ${subscriptionId}`);
    }

    // Call callback with each event
    events.forEach(payload => {
      try {
        callback(payload);
      } catch (error) {
        log.error('Utils', `🔔 [UnifiedRealtime] Batch callback error:`, error);
      }
    });
  }

  /**
   * Handle connection status changes
   */
  private handleConnectionStatusChange(channelKey: string, status: string, startTime: number): void {
    const prevStatus = this.connectionStatus.get(channelKey);
    this.connectionStatus.set(channelKey, status as ConnectionStatus);

    log.debug('Utils', `🔔 [UnifiedRealtime] Connection status for ${channelKey}: ${status}`);

    switch (status) {
      case 'SUBSCRIBED':
        const connectTime = performance.now() - startTime;
        this.connectionMetrics.set(channelKey, {
          connectTime,
          reconnectCount: this.reconnectAttempts.get(channelKey) || 0,
          avgLatency: connectTime,
          packetsReceived: 0,
          lastHeartbeat: Date.now()
        });
        this.reconnectAttempts.set(channelKey, 0);
        break;

      case 'CHANNEL_ERROR':
        this.handleConnectionError(channelKey);
        break;

      case 'CLOSED':
        this.cleanupChannel(channelKey);
        break;
    }
  }

  /**
   * Handle connection errors with smart reconnection
   */
  private handleConnectionError(channelKey: string): void {
    const currentAttempts = this.reconnectAttempts.get(channelKey) || 0;
    
    if (currentAttempts >= this.config.maxReconnectAttempts) {
      log.error('Utils', `🔔 [UnifiedRealtime] Max reconnection attempts reached for ${channelKey}`);
      this.connectionStatus.set(channelKey, 'error');
      return;
    }

    this.reconnectAttempts.set(channelKey, currentAttempts + 1);
    
    // Exponential backoff with jitter
    const delay = Math.min(
      this.config.reconnectBaseDelay * Math.pow(2, currentAttempts),
      30000
    ) + Math.random() * 1000;

    log.debug('Utils', `🔔 [UnifiedRealtime] Reconnecting ${channelKey} in ${delay.toFixed(0)}ms (attempt ${currentAttempts + 1})`);

    setTimeout(() => {
      this.attemptReconnection(channelKey);
    }, delay);
  }

  /**
   * Attempt to reconnect a channel
   */
  private attemptReconnection(channelKey: string): void {
    const channel = this.channels.get(channelKey);
    if (!channel) return;

    this.connectionStatus.set(channelKey, 'reconnecting');
    
    // Remove old channel
    getSupabaseClient().removeChannel(channel);
    this.channels.delete(channelKey);

    // Create new channel with existing subscriptions
    const [spaceId, table] = channelKey.split('_');
    const activeSubscriptions = Array.from(this.subscriptions.values())
      .filter(sub => sub.isActive && sub.spaceId === spaceId && sub.table === table);

    if (activeSubscriptions.length > 0) {
      const newChannel = this.createChannel(channelKey, spaceId, table);
      this.channels.set(channelKey, newChannel);

      // Re-add event listeners
      activeSubscriptions.forEach(subscription => {
        this.addEventListenerToChannel(newChannel, 'INSERT', subscription.filter || '', subscription);
      });
    }
  }

  /**
   * Setup heartbeat monitoring
   */
  private setupHeartbeat(channelKey: string): void {
    const heartbeatTimer = setInterval(() => {
      const metrics = this.connectionMetrics.get(channelKey);
      if (metrics && Date.now() - metrics.lastHeartbeat > this.config.heartbeatInterval * 2) {
        log.warn('Utils', `🔔 [UnifiedRealtime] Heartbeat timeout for ${channelKey}`);
        this.handleConnectionError(channelKey);
      }
    }, this.config.heartbeatInterval);

    this.heartbeatTimers.set(channelKey, heartbeatTimer);
  }

  /**
   * Remove a channel
   */
  private removeChannel(channelKey: string): void {
    const channel = this.channels.get(channelKey);
    if (channel) {
      getSupabaseClient().removeChannel(channel);
      this.channels.delete(channelKey);
    }

    this.cleanupChannel(channelKey);
    log.debug('Utils', `🔔 [UnifiedRealtime] Channel removed: ${channelKey}`);
  }

  /**
   * Cleanup resources for a channel
   */
  private cleanupChannel(channelKey: string): void {
    // Clear heartbeat timer
    const heartbeatTimer = this.heartbeatTimers.get(channelKey);
    if (heartbeatTimer) {
      clearTimeout(heartbeatTimer);
      this.heartbeatTimers.delete(channelKey);
    }

    // Clear metrics
    this.connectionMetrics.delete(channelKey);
    this.reconnectAttempts.delete(channelKey);
    this.connectionStatus.delete(channelKey);
  }

  /**
   * Setup global handlers
   */
  private setupGlobalHandlers(): void {
    // Handle page visibility changes
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.pauseConnections();
        } else {
          this.resumeConnections();
        }
      });
    }

    // Handle network changes
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        log.debug('Utils', '🔔 [UnifiedRealtime] Network back online, resuming connections');
        this.resumeConnections();
      });

      window.addEventListener('offline', () => {
        log.debug('Utils', '🔔 [UnifiedRealtime] Network offline, pausing connections');
        this.pauseConnections();
      });
    }
  }

  /**
   * Pause all connections
   */
  private pauseConnections(): void {
    this.isEnabled = false;
    log.debug('Utils', '🔔 [UnifiedRealtime] Pausing all realtime connections');
  }

  /**
   * Resume all connections
   */
  private resumeConnections(): void {
    this.isEnabled = true;
    log.debug('Utils', '🔔 [UnifiedRealtime] Resuming all realtime connections');
    
    // Check and reconnect any failed connections
    this.connectionStatus.forEach((status, channelKey) => {
      if (status === 'error' || status === 'disconnected') {
        this.attemptReconnection(channelKey);
      }
    });
  }

  /**
   * Get connection health summary
   */
  public getConnectionHealth(): Record<string, any> {
    const summary: Record<string, any> = {};

    this.connectionMetrics.forEach((metrics, channelKey) => {
      const status = this.connectionStatus.get(channelKey);
      const reconnectAttempts = this.reconnectAttempts.get(channelKey) || 0;

      summary[channelKey] = {
        status,
        connectTime: metrics.connectTime,
        reconnectCount: metrics.reconnectCount,
        packetsReceived: metrics.packetsReceived,
        avgLatency: metrics.avgLatency,
        lastHeartbeat: metrics.lastHeartbeat,
        reconnectAttempts,
        health: this.calculateChannelHealth(metrics, status, reconnectAttempts)
      };
    });

    return summary;
  }

  /**
   * Calculate channel health score
   */
  private calculateChannelHealth(
    metrics: ConnectionMetrics,
    status: ConnectionStatus | undefined,
    reconnectAttempts: number
  ): 'excellent' | 'good' | 'fair' | 'poor' {
    if (status !== 'connected') return 'poor';
    if (reconnectAttempts > 3 || metrics.connectTime > 5000) return 'poor';
    if (reconnectAttempts > 1 || metrics.connectTime > 3000) return 'fair';
    if (metrics.connectTime > 1000) return 'good';
    return 'excellent';
  }

  /**
   * Get debug information
   */
  public getDebugInfo(): Record<string, any> {
    return {
      activeChannels: this.channels.size,
      activeSubscriptions: this.subscriptions.size,
      connectionHealth: this.getConnectionHealth(),
      config: this.config,
      isEnabled: this.isEnabled,
      subscriptionDetails: Array.from(this.subscriptions.values()).map(sub => ({
        id: sub.id,
        spaceId: sub.spaceId,
        table: sub.table,
        isActive: sub.isActive,
        lastActivity: new Date(sub.lastActivity).toISOString()
      }))
    };
  }

  /**
   * Cleanup all resources
   */
  public cleanup(): void {
    // Clear all subscriptions
    this.subscriptions.clear();

    // Clear all timers
    this.batchTimers.forEach(timer => clearTimeout(timer));
    this.batchTimers.clear();
    
    this.heartbeatTimers.forEach(timer => clearTimeout(timer));
    this.heartbeatTimers.clear();

    // Remove all channels
    this.channels.forEach(channel => getSupabaseClient().removeChannel(channel));
    this.channels.clear();

    // Clear all state
    this.connectionMetrics.clear();
    this.reconnectAttempts.clear();
    this.connectionStatus.clear();
    this.batchQueues.clear();

    log.debug('Utils', '🔔 [UnifiedRealtime] Complete cleanup performed');
  }
}

// Export singleton instance
export const unifiedRealtimeManager = UnifiedRealtimeManager.getInstance();

// Expose to window for debugging
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).unifiedRealtimeManager = unifiedRealtimeManager;
  (window as any).getRealtimeHealth = () => unifiedRealtimeManager.getConnectionHealth();
  (window as any).getRealtimeDebugInfo = () => unifiedRealtimeManager.getDebugInfo();
}

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    unifiedRealtimeManager.cleanup();
  });
}

export default unifiedRealtimeManager; 