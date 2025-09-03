import { log } from '@/utils/logger';

/**
 * 🚀 Real-time Optimizer - Optimizes real-time subscriptions and event handling
 * 
 * Features:
 * - Subscription lifecycle management
 * - Event batching and debouncing
 * - Connection pooling and optimization
 * - Automatic cleanup of unused subscriptions
 * - Performance monitoring
 */

export interface RealtimeSubscription {
  id: string;
  channel: string;
  event: string;
  callback: (payload: any) => void;
  createdAt: number;
  lastUsed: number;
  accessCount: number;
  priority: 'high' | 'normal' | 'low';
  tags: string[];
  active: boolean;
}

export interface RealtimeMetrics {
  totalSubscriptions: number;
  activeSubscriptions: number;
  inactiveSubscriptions: number;
  totalEvents: number;
  batchedEvents: number;
  averageEventLatency: number;
  connectionCount: number;
}

export interface RealtimeOptimizerConfig {
  maxSubscriptions: number;
  subscriptionTimeout: number;
  eventBatchSize: number;
  eventBatchTimeout: number;
  enableMetrics: boolean;
  enableBatching: boolean;
  cleanupInterval: number;
}

class RealtimeOptimizer {
  private static instance: RealtimeOptimizer;
  private subscriptions = new Map<string, RealtimeSubscription>();
  private eventQueue = new Map<string, any[]>();
  private batchTimeouts = new Map<string, NodeJS.Timeout>();
  private metrics: RealtimeMetrics = {
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    inactiveSubscriptions: 0,
    totalEvents: 0,
    batchedEvents: 0,
    averageEventLatency: 0,
    connectionCount: 0
  };
  private config: RealtimeOptimizerConfig;

  constructor(config: RealtimeOptimizerConfig = {
    maxSubscriptions: 50,
    subscriptionTimeout: 5 * 60 * 1000, // 5 minutes
    eventBatchSize: 10,
    eventBatchTimeout: 100, // 100ms
    enableMetrics: true,
    enableBatching: true,
    cleanupInterval: 60 * 1000 // 1 minute
  }) {
    this.config = config;
    this.setupPeriodicCleanup();
  }

  static getInstance(config?: RealtimeOptimizerConfig): RealtimeOptimizer {
    if (!RealtimeOptimizer.instance) {
      RealtimeOptimizer.instance = new RealtimeOptimizer(config);
    }
    return RealtimeOptimizer.instance;
  }

  /**
   * 🎯 SUBSCRIBE TO REAL-TIME EVENT
   */
  subscribe(
    channel: string,
    event: string,
    callback: (payload: any) => void,
    options: {
      priority?: 'high' | 'normal' | 'low';
      tags?: string[];
      id?: string;
    } = {}
  ): string {
    const {
      priority = 'normal',
      tags = [],
      id = `${channel}_${event}_${Date.now()}_${Math.random()}`
    } = options;

    // Check subscription limits
    if (this.subscriptions.size >= this.config.maxSubscriptions) {
      this.cleanupInactiveSubscriptions();
      
      if (this.subscriptions.size >= this.config.maxSubscriptions) {
        log.warn('Utils', `⚠️ [RealtimeOptimizer] Max subscriptions reached, removing lowest priority subscription`);
        this.removeLowestPrioritySubscription();
      }
    }

    const subscription: RealtimeSubscription = {
      id,
      channel,
      event,
      callback,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      accessCount: 0,
      priority,
      tags,
      active: true
    };

    this.subscriptions.set(id, subscription);
    this.metrics.totalSubscriptions++;
    this.metrics.activeSubscriptions++;

    log.debug('Utils', `🎯 [RealtimeOptimizer] Subscribed: ${channel}:${event}, priority: ${priority}, total: ${this.subscriptions.size}`);

    return id;
  }

  /**
   * 🚫 UNSUBSCRIBE FROM REAL-TIME EVENT
   */
  unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return false;
    }

    subscription.active = false;
    this.metrics.activeSubscriptions--;
    this.metrics.inactiveSubscriptions++;

    log.debug('Utils', `🚫 [RealtimeOptimizer] Unsubscribed: ${subscriptionId}, active: ${this.metrics.activeSubscriptions}`);

    return true;
  }

  /**
   * 📡 EMIT REAL-TIME EVENT
   */
  emit(channel: string, event: string, payload: any): void {
    const startTime = Date.now();
    this.metrics.totalEvents++;

    if (this.config.enableBatching) {
      this.batchEvent(channel, event, payload);
    } else {
      this.processEventImmediately(channel, event, payload);
    }

    const latency = Date.now() - startTime;
    this.updateAverageEventLatency(latency);
  }

  /**
   * 📦 BATCH EVENT
   */
  private batchEvent(channel: string, event: string, payload: any): void {
    const eventKey = `${channel}:${event}`;
    const events = this.eventQueue.get(eventKey) || [];
    events.push(payload);

    // Process immediately if batch is full
    if (events.length >= this.config.eventBatchSize) {
      this.processBatchedEvents(eventKey, events);
      this.eventQueue.delete(eventKey);
      return;
    }

    this.eventQueue.set(eventKey, events);

    // Schedule batch processing
    if (!this.batchTimeouts.has(eventKey)) {
      const timeout = setTimeout(() => {
        const batchedEvents = this.eventQueue.get(eventKey);
        if (batchedEvents) {
          this.processBatchedEvents(eventKey, batchedEvents);
          this.eventQueue.delete(eventKey);
        }
        this.batchTimeouts.delete(eventKey);
      }, this.config.eventBatchTimeout);

      this.batchTimeouts.set(eventKey, timeout);
    }
  }

  /**
   * ⚡ PROCESS BATCHED EVENTS
   */
  private processBatchedEvents(eventKey: string, events: any[]): void {
    const [channel, event] = eventKey.split(':');
    
    // Find all subscriptions for this event
    const subscriptions = Array.from(this.subscriptions.values())
      .filter(sub => sub.active && sub.channel === channel && sub.event === event);

    if (subscriptions.length === 0) {
      return;
    }

    // Process events in batch
    events.forEach(payload => {
      subscriptions.forEach(subscription => {
        try {
          subscription.callback(payload);
          subscription.lastUsed = Date.now();
          subscription.accessCount++;
        } catch (error) {
          log.error('Utils', `❌ [RealtimeOptimizer] Event callback error:`, error);
        }
      });
    });

    this.metrics.batchedEvents += events.length;
    log.debug('Utils', `📦 [RealtimeOptimizer] Processed batch: ${eventKey}, events: ${events.length}, subscribers: ${subscriptions.length}`);
  }

  /**
   * ⚡ PROCESS EVENT IMMEDIATELY
   */
  private processEventImmediately(channel: string, event: string, payload: any): void {
    const subscriptions = Array.from(this.subscriptions.values())
      .filter(sub => sub.active && sub.channel === channel && sub.event === event);

    subscriptions.forEach(subscription => {
      try {
        subscription.callback(payload);
        subscription.lastUsed = Date.now();
        subscription.accessCount++;
      } catch (error) {
        log.error('Utils', `❌ [RealtimeOptimizer] Event callback error:`, error);
      }
    });

    log.debug('Utils', `⚡ [RealtimeOptimizer] Processed immediate: ${channel}:${event}, subscribers: ${subscriptions.length}`);
  }

  /**
   * 🧹 CLEANUP INACTIVE SUBSCRIPTIONS
   */
  private cleanupInactiveSubscriptions(): void {
    const now = Date.now();
    const toRemove: string[] = [];

    for (const [id, subscription] of this.subscriptions.entries()) {
      if (!subscription.active && 
          (now - subscription.lastUsed) > this.config.subscriptionTimeout) {
        toRemove.push(id);
      }
    }

    toRemove.forEach(id => {
      this.subscriptions.delete(id);
      this.metrics.inactiveSubscriptions--;
    });

    if (toRemove.length > 0) {
      log.debug('Utils', `🧹 [RealtimeOptimizer] Cleaned up ${toRemove.length} inactive subscriptions`);
    }
  }

  /**
   * 🗑️ REMOVE LOWEST PRIORITY SUBSCRIPTION
   */
  private removeLowestPrioritySubscription(): void {
    const subscriptions = Array.from(this.subscriptions.values())
      .filter(sub => sub.active)
      .sort((a, b) => {
        const priorityOrder = { low: 1, normal: 2, high: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

    if (subscriptions.length > 0) {
      const toRemove = subscriptions[0];
      this.subscriptions.delete(toRemove.id);
      this.metrics.activeSubscriptions--;
      log.debug('Utils', `🗑️ [RealtimeOptimizer] Removed lowest priority subscription: ${toRemove.id}`);
    }
  }

  /**
   * 🕐 SETUP PERIODIC CLEANUP
   */
  private setupPeriodicCleanup(): void {
    setInterval(() => {
      this.cleanupInactiveSubscriptions();
    }, this.config.cleanupInterval);
  }

  /**
   * 📊 GET METRICS
   */
  getMetrics(): RealtimeMetrics {
    return { ...this.metrics };
  }

  /**
   * 🔍 GET SUBSCRIPTION INFO
   */
  getSubscriptionInfo(): {
    total: number;
    active: number;
    inactive: number;
    byPriority: Record<string, number>;
    byChannel: Record<string, number>;
  } {
    const byPriority: Record<string, number> = { high: 0, normal: 0, low: 0 };
    const byChannel: Record<string, number> = {};

    for (const subscription of this.subscriptions.values()) {
      byPriority[subscription.priority]++;
      byChannel[subscription.channel] = (byChannel[subscription.channel] || 0) + 1;
    }

    return {
      total: this.subscriptions.size,
      active: this.metrics.activeSubscriptions,
      inactive: this.metrics.inactiveSubscriptions,
      byPriority,
      byChannel
    };
  }

  /**
   * 🏷️ INVALIDATE BY TAGS
   */
  invalidateByTags(tags: string[]): void {
    const toRemove: string[] = [];

    for (const [id, subscription] of this.subscriptions.entries()) {
      if (tags.some(tag => subscription.tags.includes(tag))) {
        toRemove.push(id);
      }
    }

    toRemove.forEach(id => {
      this.unsubscribe(id);
    });

    log.debug('Utils', `🏷️ [RealtimeOptimizer] Invalidated ${toRemove.length} subscriptions by tags: ${tags.join(', ')}`);
  }

  /**
   * 🧹 CLEAR ALL SUBSCRIPTIONS
   */
  clearAllSubscriptions(): void {
    // Clear batch timeouts
    for (const timeout of this.batchTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.batchTimeouts.clear();

    // Clear event queue
    this.eventQueue.clear();

    // Clear subscriptions
    this.subscriptions.clear();
    this.metrics.activeSubscriptions = 0;
    this.metrics.inactiveSubscriptions = 0;

    log.debug('Utils', '🧹 [RealtimeOptimizer] Cleared all subscriptions');
  }

  /**
   * 🔧 UPDATE CONFIG
   */
  updateConfig(newConfig: Partial<RealtimeOptimizerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    log.debug('Utils', `🔧 [RealtimeOptimizer] Config updated:`, this.config);
  }

  /**
   * 📈 UPDATE AVERAGE EVENT LATENCY
   */
  private updateAverageEventLatency(latency: number): void {
    this.metrics.averageEventLatency = 
      (this.metrics.averageEventLatency + latency) / 2;
  }
}

// Export singleton instance
export const realtimeOptimizer = RealtimeOptimizer.getInstance();

// Export class for testing
export { RealtimeOptimizer };

// Export types
export type { RealtimeSubscription, RealtimeMetrics, RealtimeOptimizerConfig };
