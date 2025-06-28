import { getSupabaseClient } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface SubscriptionData {
  channel: RealtimeChannel;
  callbacks: Set<Function>;
  refCount: number;
  lastUsed: number;
  spaceId: string;
  table: string;
}

/**
 * Global Realtime Subscription Service
 * 
 * Prevents subscription churn by pooling and reusing Supabase real-time subscriptions
 * across component mounts/unmounts. This dramatically reduces the 22+ subscription
 * recreations that happen during Chat→Home navigation.
 */
class GlobalRealtimeService {
  private subscriptions = new Map<string, SubscriptionData>();
  private cleanupInterval: NodeJS.Timeout;
  private isEnabled = true;

  constructor() {
    // Cleanup unused subscriptions every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleSubscriptions();
    }, 5 * 60 * 1000);

    // Make available globally for debugging
    if (typeof window !== 'undefined') {
      (window as any).globalRealtimeService = this;
    }

    console.log('🔔 [GlobalRealtimeService] Initialized');
  }

  /**
   * Subscribe to real-time events
   * Returns subscription ID for cleanup
   */
  subscribe(
    spaceId: string,
    table: string,
    callback: Function,
    options: {
      event?: string;
      filter?: string;
    } = {}
  ): string {
    if (!this.isEnabled || !spaceId || !table) {
      console.warn('[GlobalRealtimeService] Invalid subscription parameters');
      return '';
    }

    const { event = '*', filter } = options;
    const key = `${spaceId}:${table}:${filter || 'all'}:${event}`;
    const subscriptionId = `${key}:${Date.now()}:${Math.random().toString(36).slice(2)}`;

    let subscription = this.subscriptions.get(key);

    if (!subscription) {
      // Create new subscription
      console.log(`🔔 [GlobalRealtime] Creating new subscription: ${key}`);
      
      const channel = this.createChannel(spaceId, table, event, filter);
      
      subscription = {
        channel,
        callbacks: new Set([callback]),
        refCount: 1,
        lastUsed: Date.now(),
        spaceId,
        table
      };
      
      this.subscriptions.set(key, subscription);
    } else {
      // Reuse existing subscription
      console.log(`🔔 [GlobalRealtime] Reusing subscription: ${key} (refs: ${subscription.refCount + 1})`);
      
      subscription.callbacks.add(callback);
      subscription.refCount++;
      subscription.lastUsed = Date.now();
    }

    return subscriptionId;
  }

  /**
   * Unsubscribe from real-time events
   */
  unsubscribe(subscriptionId: string): void {
    if (!subscriptionId) return;

    // Find the subscription by matching the key prefix
    for (const [key, subscription] of this.subscriptions.entries()) {
      if (subscriptionId.startsWith(key)) {
        subscription.refCount--;
        
        console.log(`🔔 [GlobalRealtime] Unsubscribing: ${key} (refs: ${subscription.refCount})`);
        
        if (subscription.refCount <= 0) {
          // Don't immediately cleanup - add grace period to prevent churn
          setTimeout(() => {
            const currentSubscription = this.subscriptions.get(key);
            if (currentSubscription && currentSubscription.refCount <= 0) {
              console.log(`🔔 [GlobalRealtime] Cleaning up subscription: ${key}`);
              currentSubscription.channel.unsubscribe();
              this.subscriptions.delete(key);
            }
          }, 10000); // 10 second grace period
        }
        break;
      }
    }
  }

  /**
   * Create a Supabase real-time channel
   */
  private createChannel(
    spaceId: string,
    table: string,
    event: string,
    filter?: string
  ): RealtimeChannel {
    const channelName = `global_${table}_${spaceId}_${filter || 'all'}_${Date.now()}`;
    
    const channel = getSupabaseClient()
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: event as any,
          schema: 'public',
          table,
          filter: filter || `space_id=eq.${spaceId}`,
        },
        (payload) => {
          const key = `${spaceId}:${table}:${filter || 'all'}:${event}`;
          const subscription = this.subscriptions.get(key);
          
          if (subscription) {
            // Update last used timestamp
            subscription.lastUsed = Date.now();
            
            // Notify all callbacks
            subscription.callbacks.forEach(callback => {
              try {
                callback(payload);
              } catch (error) {
                console.error('[GlobalRealtime] Callback error:', error);
              }
            });
          }
        }
      )
      .subscribe((status) => {
        const key = `${spaceId}:${table}:${filter || 'all'}:${event}`;
        console.log(`🔔 [GlobalRealtime] Channel status for ${key}: ${status}`);
      });

    return channel;
  }

  /**
   * Cleanup stale subscriptions that haven't been used recently
   */
  private cleanupStaleSubscriptions(): void {
    const now = Date.now();
    const staleThreshold = 10 * 60 * 1000; // 10 minutes
    let cleanedCount = 0;

    for (const [key, subscription] of this.subscriptions.entries()) {
      const isStale = now - subscription.lastUsed > staleThreshold;
      const hasNoRefs = subscription.refCount <= 0;
      
      if (isStale && hasNoRefs) {
        console.log(`🔔 [GlobalRealtime] Cleaning up stale subscription: ${key}`);
        subscription.channel.unsubscribe();
        this.subscriptions.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🔔 [GlobalRealtime] Cleaned up ${cleanedCount} stale subscriptions`);
    }
  }

  /**
   * Get service statistics for monitoring
   */
  getStats() {
    const stats = {
      totalSubscriptions: this.subscriptions.size,
      totalRefCount: 0,
      subscriptionsBySpace: new Map<string, number>(),
      subscriptionsByTable: new Map<string, number>(),
    };

    for (const [key, subscription] of this.subscriptions.entries()) {
      stats.totalRefCount += subscription.refCount;
      
      // Count by space
      const spaceCount = stats.subscriptionsBySpace.get(subscription.spaceId) || 0;
      stats.subscriptionsBySpace.set(subscription.spaceId, spaceCount + 1);
      
      // Count by table
      const tableCount = stats.subscriptionsByTable.get(subscription.table) || 0;
      stats.subscriptionsByTable.set(subscription.table, tableCount + 1);
    }

    return stats;
  }

  /**
   * Debug method to list all active subscriptions
   */
  listSubscriptions() {
    console.log('🔔 [GlobalRealtime] Active subscriptions:');
    for (const [key, subscription] of this.subscriptions.entries()) {
      console.log(`  ${key}: ${subscription.refCount} refs, last used ${new Date(subscription.lastUsed).toLocaleTimeString()}`);
    }
  }

  /**
   * Disable the service (for testing)
   */
  disable() {
    this.isEnabled = false;
    console.log('🔔 [GlobalRealtime] Service disabled');
  }

  /**
   * Enable the service
   */
  enable() {
    this.isEnabled = true;
    console.log('🔔 [GlobalRealtime] Service enabled');
  }

  /**
   * Cleanup all subscriptions (for shutdown)
   */
  destroy() {
    console.log('🔔 [GlobalRealtime] Destroying all subscriptions');
    
    for (const [key, subscription] of this.subscriptions.entries()) {
      subscription.channel.unsubscribe();
    }
    
    this.subscriptions.clear();
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Create singleton instance
export const globalRealtimeService = new GlobalRealtimeService();

// Export for debugging
if (typeof window !== 'undefined') {
  (window as any).globalRealtimeService = globalRealtimeService;
} 