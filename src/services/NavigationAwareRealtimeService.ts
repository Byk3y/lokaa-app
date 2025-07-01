/**
 * Navigation-Aware Realtime Service
 * 
 * Prevents subscription cleanup during Chat⟷Space navigation while maintaining
 * proper cleanup for other scenarios. This eliminates the posts/categories 
 * rerendering issue by keeping subscriptions alive during navigation.
 */

import { globalRealtimeService } from './GlobalRealtimeService';

// Global window type declaration
declare global {
  interface Window {
    navigationAwareRealtimeService?: NavigationAwareRealtimeService;
  }
}

interface NavigationState {
  currentRoute: string;
  previousRoute: string;
  isNavigating: boolean;
  lastNavigationTime: number;
}

interface PersistentSubscription {
  subscriptionId: string;
  spaceId: string;
  table: string;
  lastUsed: number;
  route: string;
  isProtected: boolean; // Protected from navigation cleanup
  priority: 'space' | 'post' | 'component'; // 🎯 PHASE 2: Subscription priority
  refCount: number; // 🎯 PHASE 2: Reference counting for shared subscriptions
}

class NavigationAwareRealtimeService {
  private subscriptions = new Map<string, PersistentSubscription>();
  private subscriptionIdToKey = new Map<string, string>(); // Map subscription IDs to keys
  private subscriptionDeduplication = new Map<string, string>(); // 🎯 PHASE 2: Deduplication map
  private navigationState: NavigationState = {
    currentRoute: '',
    previousRoute: '',
    isNavigating: false,
    lastNavigationTime: 0
  };
  private routeChangeTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.setupNavigationTracking();
    
    // Make available globally for debugging
    if (typeof window !== 'undefined') {
      (window as any).navigationAwareRealtimeService = this;
    }

    console.log('🧭 [NavigationAwareRealtime] Service initialized');
  }

  /**
   * Track navigation changes to prevent cleanup during Chat⟷Space navigation
   */
  private setupNavigationTracking(): void {
    if (typeof window === 'undefined') return;

    // Listen for route changes
    const handleRouteChange = () => {
      const currentPath = window.location.pathname;
      
      this.navigationState.previousRoute = this.navigationState.currentRoute;
      this.navigationState.currentRoute = currentPath;
      this.navigationState.isNavigating = true;
      this.navigationState.lastNavigationTime = Date.now();

      console.log(`🧭 [NavigationAwareRealtime] Route change: ${this.navigationState.previousRoute} → ${currentPath}`);

      // Check if this is Chat⟷Space navigation
      const isChatSpaceNavigation = this.isChatSpaceNavigation(
        this.navigationState.previousRoute,
        currentPath
      );

      if (isChatSpaceNavigation) {
        console.log('🛡️ [NavigationAwareRealtime] Chat⟷Space navigation detected - protecting subscriptions');
        this.protectSpaceSubscriptions();
      }

      // Clear navigation flag after a delay
      if (this.routeChangeTimeout) {
        clearTimeout(this.routeChangeTimeout);
      }
      
      this.routeChangeTimeout = setTimeout(() => {
        this.navigationState.isNavigating = false;
        console.log('🧭 [NavigationAwareRealtime] Navigation settled');
      }, 2000);
    };

    // Listen for navigation events
    window.addEventListener('popstate', handleRouteChange);
    
    // Also listen for programmatic navigation
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      const result = originalPushState.apply(this, args);
      handleRouteChange();
      return result;
    };
    
    history.replaceState = function(...args) {
      const result = originalReplaceState.apply(this, args);
      handleRouteChange();
      return result;
    };

    // Initial route setup
    handleRouteChange();
  }

  /**
   * Check if navigation is between chat and space routes
   */
  private isChatSpaceNavigation(fromRoute: string, toRoute: string): boolean {
    const isChatRoute = (route: string) => route.includes('/app/chat');
    const isSpaceRoute = (route: string) => route.includes('/space') && !route.includes('/app/chat');

    return (
      (isChatRoute(fromRoute) && isSpaceRoute(toRoute)) ||
      (isSpaceRoute(fromRoute) && isChatRoute(toRoute))
    );
  }

  /**
   * Protect space subscriptions from cleanup during navigation
   */
  private protectSpaceSubscriptions(): void {
    for (const [key, subscription] of this.subscriptions.entries()) {
      if (subscription.spaceId && subscription.table === 'posts' || subscription.table === 'post_comments') {
        subscription.isProtected = true;
        subscription.lastUsed = Date.now();
        console.log(`🛡️ [NavigationAwareRealtime] Protected subscription: ${key}`);
      }
    }
  }

  /**
   * 🎯 PHASE 2: Determine subscription priority based on table and context
   */
  private getSubscriptionPriority(table: string, spaceId: string): 'space' | 'post' | 'component' {
    if (table === 'posts' || table === 'post_comments') {
      return spaceId ? 'space' : 'post';
    }
    return 'component';
  }

  /**
   * 🎯 PHASE 2: Check for existing compatible subscription
   */
  private findExistingSubscription(spaceId: string, table: string, options: any): string | null {
    const baseKey = `${spaceId}:${table}`;
    
    // Look for existing subscriptions that can be shared
    for (const [key, subscription] of this.subscriptions.entries()) {
      if (key.startsWith(baseKey) && subscription.refCount > 0) {
        console.log(`🎯 [NavigationAwareRealtime] Found existing subscription to reuse: ${key}`);
        return key;
      }
    }
    
    return null;
  }

  /**
   * Subscribe with navigation awareness and deduplication
   */
  subscribe(
    spaceId: string,
    table: string,
    callback: Function,
    options: {
      event?: string;
      filter?: string;
      priority?: 'space' | 'post' | 'component';
    } = {}
  ): string {
    const key = `${spaceId}:${table}:${options.filter || 'all'}:${options.event || '*'}`;
    
    // 🎯 PHASE 2: Check for existing subscription to reuse
    const existingKey = this.findExistingSubscription(spaceId, table, options);
    if (existingKey && this.subscriptions.has(existingKey)) {
      const existing = this.subscriptions.get(existingKey)!;
      existing.refCount += 1;
      existing.lastUsed = Date.now();
      
      console.log(`🎯 [NavigationAwareRealtime] Reusing subscription: ${existingKey} (refs: ${existing.refCount})`);
      
      // Map this new request to the existing subscription
      this.subscriptionIdToKey.set(existing.subscriptionId, existingKey);
      this.subscriptionDeduplication.set(key, existingKey);
      
      return existing.subscriptionId;
    }
    
    // Create new subscription
    const subscriptionId = globalRealtimeService.subscribe(spaceId, table, callback, options);
    
    if (subscriptionId) {
      const priority = options.priority || this.getSubscriptionPriority(table, spaceId);
      
      this.subscriptions.set(key, {
        subscriptionId,
        spaceId,
        table,
        lastUsed: Date.now(),
        route: this.navigationState.currentRoute,
        isProtected: false,
        priority, // 🎯 PHASE 2: Add priority
        refCount: 1 // 🎯 PHASE 2: Add reference counting
      });

      this.subscriptionIdToKey.set(subscriptionId, key);

      console.log(`🎯 [NavigationAwareRealtime] New subscription created: ${key} (priority: ${priority})`);
    }

    return subscriptionId;
  }

  /**
   * 🎯 PHASE 2: Navigation-aware unsubscribe with reference counting
   */
  unsubscribe(subscriptionId: string): void {
    const key = this.subscriptionIdToKey.get(subscriptionId);

    if (!key) {
      // FIXED: Only warn if subscription should exist
      if (this.subscriptions.size > 0) {
        console.warn(`🧭 [NavigationAwareRealtime] Subscription not found for unsubscribe: ${subscriptionId}`);
      }
      return;
    }

    // 🎯 PHASE 2: Check if this is a deduplicated subscription
    const actualKey = this.subscriptionDeduplication.get(key) || key;
    const subscription = this.subscriptions.get(actualKey);

    if (!subscription) {
      console.warn(`🧭 [NavigationAwareRealtime] Subscription not found for unsubscribe: ${actualKey}`);
      return;
    }

    const timeSinceNavigation = Date.now() - this.navigationState.lastNavigationTime;
    const isRecentNavigation = timeSinceNavigation < 5000; // 5 seconds
    const isChatSpaceTransition = this.isChatSpaceNavigation(
      this.navigationState.previousRoute,
      this.navigationState.currentRoute
    );

    // Prevent cleanup during Chat⟷Space navigation
    if (subscription.isProtected || (isRecentNavigation && isChatSpaceTransition)) {
      console.log(`🛡️ [NavigationAwareRealtime] Preventing cleanup during navigation: ${actualKey}`);
      console.log(`🛡️ [NavigationAwareRealtime] Details:`, {
        isProtected: subscription.isProtected,
        isRecentNavigation,
        isChatSpaceTransition,
        timeSinceNavigation,
        fromRoute: this.navigationState.previousRoute,
        toRoute: this.navigationState.currentRoute
      });
      
      // Remove protection flag after navigation settles
      setTimeout(() => {
        if (subscription) {
          subscription.isProtected = false;
          console.log(`🛡️ [NavigationAwareRealtime] Removed protection from: ${actualKey}`);
        }
      }, 10000); // 10 seconds grace period
      
      return;
    }

    // 🎯 PHASE 2: Decrement reference count
    subscription.refCount -= 1;
    subscription.lastUsed = Date.now();

    console.log(`🎯 [NavigationAwareRealtime] Decremented refs for ${actualKey}: ${subscription.refCount}`);

    // Only cleanup when no more references
    if (subscription.refCount <= 0) {
      console.log(`🎯 [NavigationAwareRealtime] Final cleanup: ${actualKey}`);
      globalRealtimeService.unsubscribe(subscription.subscriptionId);
      this.subscriptions.delete(actualKey);
      this.subscriptionIdToKey.delete(subscriptionId);
      
      // Clean up deduplication map
      this.subscriptionDeduplication.delete(key);
    } else {
      console.log(`🎯 [NavigationAwareRealtime] Keeping shared subscription: ${actualKey} (${subscription.refCount} refs remaining)`);
    }
  }

  /**
   * Force cleanup (for app shutdown, logout, etc.)
   */
  forceCleanup(): void {
    console.log('�� [NavigationAwareRealtime] Force cleanup of all subscriptions');
    
    for (const [key, subscription] of this.subscriptions.entries()) {
      globalRealtimeService.unsubscribe(subscription.subscriptionId);
    }
    
    this.subscriptions.clear();
    this.subscriptionIdToKey.clear();
  }

  /**
   * 🎯 PHASE 2: Enhanced service statistics with priority and reference counting
   */
  getStats() {
    const subscriptions = Array.from(this.subscriptions.values());
    return {
      totalSubscriptions: this.subscriptions.size,
      protectedSubscriptions: subscriptions.filter(s => s.isProtected).length,
      sharedSubscriptions: subscriptions.filter(s => s.refCount > 1).length, // 🎯 PHASE 2
      totalReferences: subscriptions.reduce((sum, s) => sum + s.refCount, 0), // 🎯 PHASE 2
      deduplicationMapSize: this.subscriptionDeduplication.size, // 🎯 PHASE 2
      navigationState: this.navigationState,
      subscriptionDetails: Array.from(this.subscriptions.entries()).map(([key, sub]) => ({
        key,
        spaceId: sub.spaceId,
        table: sub.table,
        route: sub.route,
        isProtected: sub.isProtected,
        priority: sub.priority, // 🎯 PHASE 2
        refCount: sub.refCount, // 🎯 PHASE 2
        lastUsed: new Date(sub.lastUsed).toLocaleTimeString()
      }))
    };
  }

  /**
   * Debug method
   */
  listSubscriptions() {
    console.log('🧭 [NavigationAwareRealtime] Active subscriptions:');
    for (const [key, subscription] of this.subscriptions.entries()) {
      console.log(`  ${key}: ${subscription.isProtected ? '🛡️ PROTECTED' : '🔓'} | Route: ${subscription.route} | Last used: ${new Date(subscription.lastUsed).toLocaleTimeString()}`);
    }
  }
}

// Export singleton instance
export const navigationAwareRealtimeService = new NavigationAwareRealtimeService(); 