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
}

class NavigationAwareRealtimeService {
  private subscriptions = new Map<string, PersistentSubscription>();
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
   * Subscribe with navigation awareness
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
    const subscriptionId = globalRealtimeService.subscribe(spaceId, table, callback, options);
    
    if (subscriptionId) {
      const key = `${spaceId}:${table}:${options.filter || 'all'}:${options.event || '*'}`;
      
      this.subscriptions.set(key, {
        subscriptionId,
        spaceId,
        table,
        lastUsed: Date.now(),
        route: this.navigationState.currentRoute,
        isProtected: false
      });

      console.log(`🧭 [NavigationAwareRealtime] Subscription created: ${key}`);
    }

    return subscriptionId;
  }

  /**
   * Navigation-aware unsubscribe
   */
  unsubscribe(subscriptionId: string): void {
    // Find the subscription
    let subscriptionKey = '';
    let subscription: PersistentSubscription | undefined;
    
    for (const [key, sub] of this.subscriptions.entries()) {
      if (sub.subscriptionId === subscriptionId) {
        subscriptionKey = key;
        subscription = sub;
        break;
      }
    }

    if (!subscription) {
      console.warn(`🧭 [NavigationAwareRealtime] Subscription not found for unsubscribe: ${subscriptionId}`);
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
      console.log(`🛡️ [NavigationAwareRealtime] Preventing cleanup during navigation: ${subscriptionKey}`);
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
          console.log(`🛡️ [NavigationAwareRealtime] Removed protection from: ${subscriptionKey}`);
        }
      }, 10000); // 10 seconds grace period
      
      return;
    }

    // Normal cleanup for non-navigation scenarios
    console.log(`🧭 [NavigationAwareRealtime] Normal cleanup: ${subscriptionKey}`);
    globalRealtimeService.unsubscribe(subscriptionId);
    this.subscriptions.delete(subscriptionKey);
  }

  /**
   * Force cleanup (for app shutdown, logout, etc.)
   */
  forceCleanup(): void {
    console.log('🧭 [NavigationAwareRealtime] Force cleanup of all subscriptions');
    
    for (const [key, subscription] of this.subscriptions.entries()) {
      globalRealtimeService.unsubscribe(subscription.subscriptionId);
    }
    
    this.subscriptions.clear();
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      totalSubscriptions: this.subscriptions.size,
      protectedSubscriptions: Array.from(this.subscriptions.values()).filter(s => s.isProtected).length,
      navigationState: this.navigationState,
      subscriptionDetails: Array.from(this.subscriptions.entries()).map(([key, sub]) => ({
        key,
        spaceId: sub.spaceId,
        table: sub.table,
        route: sub.route,
        isProtected: sub.isProtected,
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