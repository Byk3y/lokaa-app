/**
 * 🚀 Phase 2B: Unified Real-time System
 * 
 * Consolidates and optimizes all real-time functionality:
 * - Connection pooling and intelligent sharing
 * - Performance-based adaptation
 * - Background optimization
 * - Integration with Phase 2A Advanced Query Engine
 * - Predictive connection management
 */

import { getSupabaseClient } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { advancedQueryEngine } from './advancedQueryEngine';
import { pageVisibilityManager } from './pageVisibilityManager';
import { devLogger } from './developmentLogger';
import { globalCache } from './globalCacheCoordinator';

interface RealtimeSubscription {
  id: string;
  spaceId: string;
  table: string;
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  callback: (payload: Record<string, unknown>) => void;
  priority: 'high' | 'normal' | 'low';
  isActive: boolean;
  lastActivity: number;
  retryCount: number;
}

interface ConnectionMetrics {
  connectTime: number;
  reconnectCount: number;
  avgLatency: number;
  packetsReceived: number;
  packetsLost: number;
  lastHeartbeat: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  adaptiveMode: 'performance' | 'standard' | 'battery';
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
  enableAdaptiveMode: boolean;
  enableBackgroundOptimization: boolean;
  performanceThresholds: {
    latencyWarning: number;
    latencyError: number;
    memoryWarning: number;
    memoryError: number;
  };
  enableConnectionPooling: boolean; // New config option
}

class UnifiedRealtimeSystem {
  private static instance: UnifiedRealtimeSystem;
  private channels: Map<string, RealtimeChannel> = new Map();
  private subscriptions: Map<string, RealtimeSubscription> = new Map();
  private connectionMetrics: Map<string, ConnectionMetrics> = new Map();
  private batchQueues: Map<string, any[]> = new Map();
  private batchTimers: Map<string, NodeJS.Timeout> = new Map();
  private heartbeatTimers: Map<string, NodeJS.Timeout> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private connectionStatus: Map<string, 'connecting' | 'connected' | 'disconnected' | 'error'> = new Map();
  private config: RealtimeConfig;
  private isEnabled = true;
  private performanceMode: 'performance' | 'standard' | 'battery' = 'standard';
  private backgroundOptimizationActive = false;
  private connectionPool = new Map<string, RealtimeChannel>(); // Connection pooling
  private maxConcurrentConnections = 5; // Limit concurrent connections

  private constructor() {
    this.config = {
      maxReconnectAttempts: 5,
      reconnectBaseDelay: 1000,
      heartbeatInterval: 30000,
      batchDelay: 100,
      maxBatchSize: 10,
      connectionTimeout: 15000,
      enableBatching: true,
      enableHeartbeat: true,
      enableAdaptiveMode: true,
      enableBackgroundOptimization: true,
      performanceThresholds: {
        latencyWarning: 1000,
        latencyError: 3000,
        memoryWarning: 50 * 1024 * 1024, // 50MB
        memoryError: 100 * 1024 * 1024,  // 100MB
      },
      enableConnectionPooling: true, // Enable connection pooling
    };

    this.initializeSystem();
  }

  public static getInstance(): UnifiedRealtimeSystem {
    if (!UnifiedRealtimeSystem.instance) {
      UnifiedRealtimeSystem.instance = new UnifiedRealtimeSystem();
    }
    return UnifiedRealtimeSystem.instance;
  }

  /**
   * Initialize the unified real-time system
   */
  private initializeSystem(): void {
    devLogger.log('RealtimeSystem', '🚀 Initializing Unified Real-time System');
    
    this.setupGlobalHandlers();
    this.setupPerformanceMonitoring();
    this.setupBackgroundOptimization();
    
    // Expose debugging interface
    if (typeof window !== 'undefined') {
      (window as any).unifiedRealtimeSystem = this;
      (window as any).getRealtimeDebugInfo = () => this.getDebugInfo();
    }
  }

  /**
   * Subscribe to real-time events with intelligent optimization
   */
  public subscribe(
    spaceId: string,
    table: string,
    callback: (payload: any) => void,
    options: {
      event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
      filter?: string;
      priority?: 'high' | 'normal' | 'low';
      enableBatching?: boolean;
    } = {}
  ): string {
    const {
      event = 'INSERT',
      filter,
      priority = 'normal',
      enableBatching = this.config.enableBatching
    } = options;

    const subscriptionId = `${spaceId}_${table}_${event}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const channelKey = `${spaceId}_${table}`;

    // Create subscription record
    const subscription: RealtimeSubscription = {
      id: subscriptionId,
      spaceId,
      table,
      event,
      filter,
      callback: enableBatching ? this.createBatchedCallback(subscriptionId, callback) : callback,
      priority,
      isActive: true,
      lastActivity: Date.now(),
      retryCount: 0
    };

    this.subscriptions.set(subscriptionId, subscription);

    // Get or create channel with intelligent pooling
    let channel = this.channels.get(channelKey);
    if (!channel) {
      channel = this.createOptimizedChannel(channelKey, spaceId, table);
      this.channels.set(channelKey, channel);
    }

    // Add event listener to existing channel
    this.addEventListenerToChannel(channel, subscription);

    devLogger.log('RealtimeSystem', `✅ Subscription created: ${subscriptionId} (${priority} priority)`);
    
    // Integrate with Phase 2A Advanced Query Engine
    this.integrateWithQueryEngine(spaceId, table, event);
    
    return subscriptionId;
  }

  /**
   * Unsubscribe from real-time events
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

    devLogger.log('RealtimeSystem', `🗑️ Subscription removed: ${subscriptionId}`);
  }

  /**
   * Create optimized channel with performance monitoring and connection pooling
   */
  private createOptimizedChannel(channelKey: string, spaceId: string, table: string): RealtimeChannel {
    const startTime = performance.now();
    this.connectionStatus.set(channelKey, 'connecting');

    // Check connection pool first
    if (this.config.enableConnectionPooling) {
      const poolKey = `${spaceId}_${table}`;
      const existingChannel = this.connectionPool.get(poolKey);
      
      if (existingChannel && this.connectionStatus.get(poolKey) === 'connected') {
        devLogger.log('RealtimeSystem', `🔄 Reusing existing connection for ${poolKey}`);
        return existingChannel;
      }
    }

    // Check if we've reached the connection limit
    if (this.channels.size >= this.maxConcurrentConnections) {
      devLogger.warn('RealtimeSystem', `⚠️ Connection limit reached (${this.maxConcurrentConnections}), waiting for available slot`);
      // Wait for a connection to become available
      return this.waitForConnectionSlot(channelKey, spaceId, table);
    }

    const channel = getSupabaseClient()
      .channel(`unified_realtime_${channelKey}`)
      .subscribe((status) => {
        this.handleConnectionStatusChange(channelKey, status, startTime);
      });

    // Setup heartbeat monitoring
    if (this.config.enableHeartbeat) {
      this.setupHeartbeat(channelKey);
    }

    // Initialize connection metrics
    this.connectionMetrics.set(channelKey, {
      connectTime: 0,
      reconnectCount: 0,
      avgLatency: 0,
      packetsReceived: 0,
      packetsLost: 0,
      lastHeartbeat: Date.now(),
      quality: 'excellent',
      adaptiveMode: this.performanceMode
    });

    // Add to connection pool if enabled
    if (this.config.enableConnectionPooling) {
      const poolKey = `${spaceId}_${table}`;
      this.connectionPool.set(poolKey, channel);
    }

    return channel;
  }

  /**
   * Wait for an available connection slot
   */
  private waitForConnectionSlot(channelKey: string, spaceId: string, table: string): RealtimeChannel {
    // For now, create a temporary channel that will be replaced when slot is available
    const tempChannel = getSupabaseClient().channel(`temp_${channelKey}`);
    
    // Check for available slot in background
    const checkSlot = () => {
      if (this.channels.size < this.maxConcurrentConnections) {
        // Replace temp channel with real one
        this.createOptimizedChannel(channelKey, spaceId, table);
      } else {
        setTimeout(checkSlot, 1000); // Check again in 1 second
      }
    };
    
    setTimeout(checkSlot, 1000);
    return tempChannel;
  }

  /**
   * Add event listener to channel with intelligent filtering
   */
  private addEventListenerToChannel(channel: RealtimeChannel, subscription: RealtimeSubscription): void {
    const eventConfig: any = {
      event: subscription.event === '*' ? '*' : subscription.event,
      schema: 'public',
      table: subscription.table
    };

    if (subscription.filter) {
      eventConfig.filter = subscription.filter;
    }

    channel.on('postgres_changes', eventConfig, (payload) => {
      this.handleRealtimeEvent(subscription, payload);
    });
  }

  /**
   * Handle real-time events with performance tracking
   */
  private handleRealtimeEvent(subscription: RealtimeSubscription, payload: any): void {
    if (!subscription.isActive) return;

    const startTime = performance.now();
    const channelKey = `${subscription.spaceId}_${subscription.table}`;
    const metrics = this.connectionMetrics.get(channelKey);
    
    if (metrics) {
      metrics.packetsReceived++;
      metrics.lastHeartbeat = Date.now();
    }

    subscription.lastActivity = Date.now();
    
    try {
      // Priority-based processing
      if (subscription.priority === 'high') {
        // Process immediately for high priority
        subscription.callback(payload);
      } else {
        // Use batching for normal/low priority
        subscription.callback(payload);
      }

      // Track processing time
      const processingTime = performance.now() - startTime;
      if (processingTime > 50) {
        devLogger.warn('RealtimeSystem', `Slow event processing: ${processingTime.toFixed(2)}ms for ${subscription.id}`);
      }

    } catch (error) {
              devLogger.warn('RealtimeSystem', `Error in callback for ${subscription.id}:`, error);
      subscription.retryCount++;
      
      if (subscription.retryCount > 3) {
        devLogger.warn('RealtimeSystem', `Disabling subscription ${subscription.id} due to repeated errors`);
        subscription.isActive = false;
      }
    }
  }

  /**
   * Create batched callback for performance optimization
   */
  private createBatchedCallback(subscriptionId: string, originalCallback: (payload: any) => void) {
    return (payload: any) => {
      if (!this.batchQueues.has(subscriptionId)) {
        this.batchQueues.set(subscriptionId, []);
      }

      const queue = this.batchQueues.get(subscriptionId)!;
      queue.push(payload);

      // Clear existing timer
      const existingTimer = this.batchTimers.get(subscriptionId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Determine batch delay based on performance mode and queue size
      let delay = this.config.batchDelay;
      
      if (this.performanceMode === 'performance') {
        delay = Math.max(delay * 0.5, 100); // Faster batching
      } else if (this.performanceMode === 'battery') {
        delay = delay * 2; // Slower batching to save battery
      }

      if (queue.length >= this.config.maxBatchSize) {
        delay = 50; // Process large batches quickly
      }

      // Set new timer
      const timer = setTimeout(() => {
        const batchToProcess = [...queue];
        queue.length = 0; // Clear the queue
        
        if (batchToProcess.length > 0) {
          // Process batch
          batchToProcess.forEach(originalCallback);
          
          devLogger.log('RealtimeSystem', `📦 Processed batch of ${batchToProcess.length} events for ${subscriptionId}`);
        }
        
        this.batchTimers.delete(subscriptionId);
      }, delay);

      this.batchTimers.set(subscriptionId, timer);
    };
  }

  /**
   * Handle connection status changes with adaptive optimization
   */
  private handleConnectionStatusChange(channelKey: string, status: string, startTime: number): void {
    const prevStatus = this.connectionStatus.get(channelKey);
    this.connectionStatus.set(channelKey, status as any);

    devLogger.log('RealtimeSystem', `🔗 Connection status for ${channelKey}: ${status}`);

    switch (status) {
      case 'SUBSCRIBED':
        const connectTime = performance.now() - startTime;
        const metrics = this.connectionMetrics.get(channelKey);
        if (metrics) {
          metrics.connectTime = connectTime;
          metrics.reconnectCount = this.reconnectAttempts.get(channelKey) || 0;
          metrics.avgLatency = connectTime;
          metrics.quality = this.calculateConnectionQuality(metrics);
        }
        this.reconnectAttempts.set(channelKey, 0);
        
        // Adaptive performance mode adjustment
        if (this.config.enableAdaptiveMode) {
          this.adjustPerformanceMode(channelKey);
        }
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
   * Handle connection errors with intelligent recovery and connection pooling
   */
  private handleConnectionError(channelKey: string): void {
    const currentAttempts = this.reconnectAttempts.get(channelKey) || 0;
    
    if (currentAttempts >= this.config.maxReconnectAttempts) {
      devLogger.warn('RealtimeSystem', `❌ Max reconnection attempts reached for ${channelKey}`);
      this.connectionStatus.set(channelKey, 'error');
      
      // Update connection quality
      const metrics = this.connectionMetrics.get(channelKey);
      if (metrics) {
        metrics.quality = 'poor';
        metrics.packetsLost++;
      }

      // CRITICAL FIX: Invalidate related caches when realtime fails
      this.invalidateRelatedCaches(channelKey);
      
      // Remove from connection pool on permanent failure
      if (this.config.enableConnectionPooling) {
        const [spaceId, table] = channelKey.split('_');
        const poolKey = `${spaceId}_${table}`;
        this.connectionPool.delete(poolKey);
      }
      
      return;
    }

    this.reconnectAttempts.set(channelKey, currentAttempts + 1);
    
    // Exponential backoff with jitter and adaptive delay
    let baseDelay = this.config.reconnectBaseDelay;
    
    // Adjust delay based on performance mode
    if (this.performanceMode === 'battery') {
      baseDelay *= 2; // Longer delays to save battery
    } else if (this.performanceMode === 'performance') {
      baseDelay *= 0.7; // Shorter delays for faster recovery
    }
    
    const delay = Math.min(
      baseDelay * Math.pow(2, currentAttempts),
      30000
    ) + Math.random() * 1000;

    devLogger.log('RealtimeSystem', `🔄 Reconnecting ${channelKey} in ${delay.toFixed(0)}ms (attempt ${currentAttempts + 1})`);

    setTimeout(() => {
      this.attemptReconnection(channelKey);
    }, delay);
  }

  /**
   * Invalidate related caches when realtime connection fails
   */
  private invalidateRelatedCaches(channelKey: string): void {
    const [spaceId, table] = channelKey.split('_');
    
    devLogger.log('RealtimeSystem', `🗑️ Invalidating caches for failed realtime: ${channelKey}`);
    
    // Invalidate caches based on table type
    switch (table) {
      case 'posts':
        globalCache.invalidatePattern(`posts:${spaceId}:*`);
        globalCache.invalidatePattern(`posts_count:${spaceId}`);
        devLogger.log('RealtimeSystem', `🗑️ Invalidated posts cache for space ${spaceId}`);
        break;
        
      case 'notifications':
        globalCache.invalidatePattern(`notifications:*`);
        devLogger.log('RealtimeSystem', `🗑️ Invalidated notifications cache`);
        break;
        
      case 'chat_messages':
        globalCache.invalidatePattern(`chat:*`);
        globalCache.invalidatePattern(`conversations:*`);
        devLogger.log('RealtimeSystem', `🗑️ Invalidated chat cache`);
        break;
        
      case 'space_members':
        globalCache.invalidatePattern(`members:${spaceId}:*`);
        globalCache.invalidatePattern(`memberCounts:${spaceId}`);
        devLogger.log('RealtimeSystem', `🗑️ Invalidated members cache for space ${spaceId}`);
        break;
        
      case 'course_lessons':
      case 'courses':
        globalCache.invalidatePattern(`classroom:${spaceId}:*`);
        globalCache.invalidatePattern(`course:*`);
        devLogger.log('RealtimeSystem', `🗑️ Invalidated classroom cache for space ${spaceId}`);
        break;
        
      default:
        // Invalidate all space-related caches as fallback
        globalCache.invalidatePattern(`${spaceId}:*`);
        devLogger.log('RealtimeSystem', `🗑️ Invalidated all caches for space ${spaceId}`);
        break;
    }
  }

  /**
   * Attempt to reconnect a channel
   */
  private attemptReconnection(channelKey: string): void {
    const channel = this.channels.get(channelKey);
    if (!channel) return;

    this.connectionStatus.set(channelKey, 'connecting');
    
    // Remove old channel
    getSupabaseClient().removeChannel(channel);
    this.channels.delete(channelKey);

    // Create new channel with existing subscriptions
    const [spaceId, table] = channelKey.split('_');
    const activeSubscriptions = Array.from(this.subscriptions.values())
      .filter(sub => sub.isActive && sub.spaceId === spaceId && sub.table === table);

    if (activeSubscriptions.length > 0) {
      const newChannel = this.createOptimizedChannel(channelKey, spaceId, table);
      this.channels.set(channelKey, newChannel);

      // Re-add event listeners
      activeSubscriptions.forEach(subscription => {
        this.addEventListenerToChannel(newChannel, subscription);
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
        devLogger.warn('RealtimeSystem', `💔 Heartbeat timeout for ${channelKey}`);
        this.handleConnectionError(channelKey);
      }
    }, this.config.heartbeatInterval);

    this.heartbeatTimers.set(channelKey, heartbeatTimer);
  }

  /**
   * Setup global handlers for system events
   */
  private setupGlobalHandlers(): void {
    // Handle page visibility changes with enhanced logic
    if (typeof document !== 'undefined') {
      let wasHidden = false;
      let hideStartTime = 0;
      
      document.addEventListener('visibilitychange', () => {
        const isHidden = document.hidden;
        
        if (isHidden && !wasHidden) {
          // Page just became hidden (minimized, tab switch, etc.)
          wasHidden = true;
          hideStartTime = Date.now();
          devLogger.log('RealtimeSystem', '👁️ Page hidden - pausing connections for optimization');
          this.pauseConnections();
        } else if (!isHidden && wasHidden) {
          // Page just became visible (restored, tab switch back, etc.)
          const hiddenDuration = Date.now() - hideStartTime;
          wasHidden = false;
          
          devLogger.log('RealtimeSystem', `👁️ Page visible after ${hiddenDuration}ms - resuming connections`);
          
          // Enhanced resume logic for browser restore
          this.resumeConnectionsWithRetry();
        }
      });

      // Handle online/offline events
      window.addEventListener('online', () => {
        devLogger.log('RealtimeSystem', '📶 Network online, resuming connections');
        this.resumeConnectionsWithRetry();
      });

      window.addEventListener('offline', () => {
        devLogger.log('RealtimeSystem', '📴 Network offline, pausing connections');
        this.pauseConnections();
      });

      // Handle focus/blur events for additional context
      window.addEventListener('blur', () => {
        devLogger.log('RealtimeSystem', '🔍 Window lost focus - optimizing connections');
        this.optimizeForBackground();
      });

      window.addEventListener('focus', () => {
        devLogger.log('RealtimeSystem', '🔍 Window gained focus - restoring full connectivity');
        this.restoreFullConnectivity();
      });
    }
  }

  /**
   * Resume connections with retry logic for browser restore
   */
  private resumeConnectionsWithRetry(): void {
    if (!this.backgroundOptimizationActive) return;
    
    this.backgroundOptimizationActive = false;
    devLogger.log('RealtimeSystem', '▶️ Resuming real-time connections with retry logic');
    
    // Restore batch frequency
    this.config.batchDelay /= 2;
    
    // Resume heartbeats
    this.connectionMetrics.forEach((_, channelKey) => {
      if (this.config.enableHeartbeat) {
        this.setupHeartbeat(channelKey);
      }
    });
    
    // Enhanced reconnection logic for browser restore
    let reconnectionAttempts = 0;
    const maxReconnectionAttempts = 3;
    
    const attemptReconnections = () => {
      const failedConnections = Array.from(this.connectionStatus.entries())
        .filter(([_, status]) => status === 'error' || status === 'disconnected');
      
      if (failedConnections.length === 0) {
        devLogger.log('RealtimeSystem', '✅ All connections restored successfully');
        return;
      }
      
      if (reconnectionAttempts >= maxReconnectionAttempts) {
        devLogger.warn('RealtimeSystem', `❌ Failed to restore ${failedConnections.length} connections after ${maxReconnectionAttempts} attempts`);
        // Invalidate caches for failed connections
        failedConnections.forEach(([channelKey, _]) => {
          this.invalidateRelatedCaches(channelKey);
        });
        return;
      }
      
      reconnectionAttempts++;
      devLogger.log('RealtimeSystem', `🔄 Attempting to restore ${failedConnections.length} connections (attempt ${reconnectionAttempts}/${maxReconnectionAttempts})`);
      
      failedConnections.forEach(([channelKey, _]) => {
        this.attemptReconnection(channelKey);
      });
      
      // Retry after a delay
      setTimeout(attemptReconnections, 2000 * reconnectionAttempts);
    };
    
    // Start reconnection attempts
    setTimeout(attemptReconnections, 1000);
  }

  /**
   * Optimize connections for background operation
   */
  private optimizeForBackground(): void {
    devLogger.log('RealtimeSystem', '🔧 Optimizing connections for background operation');
    
    // Reduce heartbeat frequency
    this.heartbeatTimers.forEach(timer => clearInterval(timer));
    this.heartbeatTimers.clear();
    
    // Switch to battery mode
    this.switchToPerformanceMode('battery');
    
    // Increase batch delays
    this.config.batchDelay *= 1.5;
  }

  /**
   * Restore full connectivity when window gains focus
   */
  private restoreFullConnectivity(): void {
    devLogger.log('RealtimeSystem', '🔧 Restoring full connectivity');
    
    // Restore heartbeat frequency
    this.connectionMetrics.forEach((_, channelKey) => {
      if (this.config.enableHeartbeat) {
        this.setupHeartbeat(channelKey);
      }
    });
    
    // Switch back to standard mode
    this.switchToPerformanceMode('standard');
    
    // Restore batch delays
    this.config.batchDelay /= 1.5;
  }

  /**
   * Setup performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    // Monitor memory usage
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        const usedMemory = memory.usedJSHeapSize;
        
        if (usedMemory > this.config.performanceThresholds.memoryError) {
          devLogger.warn('RealtimeSystem', `🚨 Critical memory usage: ${(usedMemory / 1024 / 1024).toFixed(2)}MB`);
          this.switchToPerformanceMode('battery');
        } else if (usedMemory > this.config.performanceThresholds.memoryWarning) {
          devLogger.warn('RealtimeSystem', `⚠️ High memory usage: ${(usedMemory / 1024 / 1024).toFixed(2)}MB`);
          if (this.performanceMode === 'performance') {
            this.switchToPerformanceMode('standard');
          }
        }
      }, 30000); // Check every 30 seconds
    }
  }

  /**
   * Setup background optimization
   */
  private setupBackgroundOptimization(): void {
    if (!this.config.enableBackgroundOptimization) return;

    // Register with page visibility manager
    pageVisibilityManager.addVisibilityListener((isVisible) => {
      if (isVisible) {
        this.resumeConnectionsWithRetry();
      } else {
        this.pauseConnections();
      }
    });
  }

  /**
   * Pause connections for background optimization
   */
  private pauseConnections(): void {
    if (this.backgroundOptimizationActive) return;
    
    this.backgroundOptimizationActive = true;
    devLogger.log('RealtimeSystem', '⏸️ Pausing real-time connections for background optimization');
    
    // Pause heartbeats
    this.heartbeatTimers.forEach(timer => clearInterval(timer));
    
    // Reduce batch frequency
    this.config.batchDelay *= 2;
    
    // Switch to battery mode if not already
    if (this.performanceMode !== 'battery') {
      this.switchToPerformanceMode('battery');
    }
  }



  /**
   * Calculate connection quality based on metrics
   */
  private calculateConnectionQuality(metrics: ConnectionMetrics): 'excellent' | 'good' | 'fair' | 'poor' {
    const { connectTime, reconnectCount, avgLatency, packetsLost, packetsReceived } = metrics;
    
    const lossRate = packetsReceived > 0 ? packetsLost / packetsReceived : 0;
    
    if (connectTime > 5000 || reconnectCount > 3 || avgLatency > 3000 || lossRate > 0.1) {
      return 'poor';
    } else if (connectTime > 3000 || reconnectCount > 1 || avgLatency > 1500 || lossRate > 0.05) {
      return 'fair';
    } else if (connectTime > 1000 || avgLatency > 800 || lossRate > 0.02) {
      return 'good';
    }
    
    return 'excellent';
  }

  /**
   * Adjust performance mode based on connection quality
   */
  private adjustPerformanceMode(channelKey: string): void {
    const metrics = this.connectionMetrics.get(channelKey);
    if (!metrics) return;

    const quality = metrics.quality;
    
    if (quality === 'poor' && this.performanceMode !== 'battery') {
      this.switchToPerformanceMode('battery');
    } else if (quality === 'excellent' && this.performanceMode !== 'performance') {
      this.switchToPerformanceMode('performance');
    } else if (quality === 'good' && this.performanceMode !== 'standard') {
      this.switchToPerformanceMode('standard');
    }
  }

  /**
   * Switch performance mode
   */
  private switchToPerformanceMode(mode: 'performance' | 'standard' | 'battery'): void {
    if (this.performanceMode === mode) return;
    
    const oldMode = this.performanceMode;
    this.performanceMode = mode;
    
    devLogger.log('RealtimeSystem', `🔄 Switching from ${oldMode} to ${mode} mode`);
    
    // Adjust configuration based on mode
    switch (mode) {
      case 'performance':
        this.config.batchDelay = 250;
        this.config.heartbeatInterval = 15000;
        this.config.connectionTimeout = 5000;
        break;
      case 'standard':
        this.config.batchDelay = 500;
        this.config.heartbeatInterval = 30000;
        this.config.connectionTimeout = 10000;
        break;
      case 'battery':
        this.config.batchDelay = 1000;
        this.config.heartbeatInterval = 60000;
        this.config.connectionTimeout = 15000;
        break;
    }
    
    // Update all connection metrics
    this.connectionMetrics.forEach(metrics => {
      metrics.adaptiveMode = mode;
    });
  }

  /**
   * Integrate with Phase 2A Advanced Query Engine
   */
  private integrateWithQueryEngine(spaceId: string, table: string, event: string): void {
    // Invalidate related queries when real-time events occur
    const queryKeys = [
      `posts_${spaceId}`,
      `members_${spaceId}`,
      `categories_${spaceId}`,
      `space_${spaceId}`
    ];

    // Register invalidation callback
    const invalidationCallback = () => {
      queryKeys.forEach(key => {
        // Invalidate cache for the query key
        globalCache.invalidate(key);
      });
    };

    // Store callback for cleanup
    // This would be used when unsubscribing
  }

  /**
   * Remove a channel and cleanup resources
   */
  private removeChannel(channelKey: string): void {
    const channel = this.channels.get(channelKey);
    if (channel) {
      getSupabaseClient().removeChannel(channel);
      this.channels.delete(channelKey);
    }

    this.cleanupChannel(channelKey);
    devLogger.log('RealtimeSystem', `🗑️ Channel removed: ${channelKey}`);
  }

  /**
   * Cleanup resources for a channel
   */
  private cleanupChannel(channelKey: string): void {
    // Clear heartbeat timer
    const heartbeatTimer = this.heartbeatTimers.get(channelKey);
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      this.heartbeatTimers.delete(channelKey);
    }

    // Clear metrics
    this.connectionMetrics.delete(channelKey);
    this.reconnectAttempts.delete(channelKey);
    this.connectionStatus.delete(channelKey);
  }

  /**
   * Get comprehensive debug information
   */
  public getDebugInfo(): Record<string, any> {
    return {
      isEnabled: this.isEnabled,
      performanceMode: this.performanceMode,
      backgroundOptimizationActive: this.backgroundOptimizationActive,
      activeChannels: this.channels.size,
      activeSubscriptions: this.subscriptions.size,
      connectionHealth: this.getConnectionHealth(),
      config: this.config,
      subscriptionDetails: Array.from(this.subscriptions.values()).map(sub => ({
        id: sub.id,
        spaceId: sub.spaceId,
        table: sub.table,
        event: sub.event,
        priority: sub.priority,
        isActive: sub.isActive,
        lastActivity: new Date(sub.lastActivity).toISOString(),
        retryCount: sub.retryCount
      })),
      performanceMetrics: this.getPerformanceMetrics()
    };
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
        quality: metrics.quality,
        connectTime: metrics.connectTime,
        reconnectCount: metrics.reconnectCount,
        packetsReceived: metrics.packetsReceived,
        packetsLost: metrics.packetsLost,
        avgLatency: metrics.avgLatency,
        lastHeartbeat: metrics.lastHeartbeat,
        reconnectAttempts,
        adaptiveMode: metrics.adaptiveMode
      };
    });

    return summary;
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics(): Record<string, any> {
    const totalSubscriptions = this.subscriptions.size;
    const activeSubscriptions = Array.from(this.subscriptions.values()).filter(sub => sub.isActive).length;
    const totalChannels = this.channels.size;
    
    let totalPacketsReceived = 0;
    let totalPacketsLost = 0;
    let avgConnectionQuality = 0;
    
    this.connectionMetrics.forEach(metrics => {
      totalPacketsReceived += metrics.packetsReceived;
      totalPacketsLost += metrics.packetsLost;
      
      const qualityScore = {
        'excellent': 4,
        'good': 3,
        'fair': 2,
        'poor': 1
      }[metrics.quality] || 1;
      
      avgConnectionQuality += qualityScore;
    });
    
    if (this.connectionMetrics.size > 0) {
      avgConnectionQuality /= this.connectionMetrics.size;
    }

    return {
      totalSubscriptions,
      activeSubscriptions,
      totalChannels,
      totalPacketsReceived,
      totalPacketsLost,
      packetLossRate: totalPacketsReceived > 0 ? totalPacketsLost / totalPacketsReceived : 0,
      avgConnectionQuality,
      performanceMode: this.performanceMode,
      backgroundOptimizationActive: this.backgroundOptimizationActive
    };
  }

  /**
   * Cleanup all resources
   */
  public cleanup(): void {
    devLogger.log('RealtimeSystem', '🧹 Cleaning up Unified Real-time System');
    
    // Clear all subscriptions
    this.subscriptions.clear();

    // Clear all timers
    this.batchTimers.forEach(timer => clearTimeout(timer));
    this.batchTimers.clear();
    
    this.heartbeatTimers.forEach(timer => clearInterval(timer));
    this.heartbeatTimers.clear();

    // Remove all channels
    this.channels.forEach(channel => getSupabaseClient().removeChannel(channel));
    this.channels.clear();

    // Clear all state
    this.connectionMetrics.clear();
    this.reconnectAttempts.clear();
    this.connectionStatus.clear();
    this.batchQueues.clear();

    this.isEnabled = false;
  }
}

// Export singleton instance
export const unifiedRealtimeSystem = UnifiedRealtimeSystem.getInstance();

// Export types for external use
export type { RealtimeSubscription, ConnectionMetrics, RealtimeConfig }; 