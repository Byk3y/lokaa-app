import { useEffect, useState } from 'react';
import { shouldEnableMobileFeatures } from './mobileDetection';

/**
 * 🔋 Page Visibility Manager
 * 
 * Intelligently manages background activity based on page visibility.
 * Pauses intervals, subscriptions, and API calls when tab is hidden,
 * resumes when user returns - preventing connection errors during idle periods.
 */

interface BackgroundActivity {
  id: string;
  pause: () => void;
  resume: () => void;
  type: 'interval' | 'subscription' | 'polling' | 'heartbeat';
}

class PageVisibilityManager {
  private static instance: PageVisibilityManager;
  private activities: Map<string, BackgroundActivity> = new Map();
  private isVisible: boolean = true;
  private listeners: Set<(visible: boolean) => void> = new Set();
  private initialized: boolean = false;

  private constructor() {}

  static getInstance(): PageVisibilityManager {
    if (!PageVisibilityManager.instance) {
      PageVisibilityManager.instance = new PageVisibilityManager();
    }
    return PageVisibilityManager.instance;
  }

  /**
   * Initialize the visibility manager
   * Only activates on mobile devices to prevent unnecessary desktop tab switching logs
   */
  initialize(): void {
    if (this.initialized) return;

    // OPTION C FIX: Check disable flag - don't initialize if Mobile Event Coordinator is managing events
    if (typeof window !== 'undefined' && (window as any).DISABLE_PAGE_VISIBILITY_MANAGER) {
      console.log('🔧 [PageVisibilityManager] DISABLED - Mobile Event Coordinator is managing events');
      this.initialized = true; // Mark as initialized but don't set up listeners
      return;
    }

    // Only enable page visibility management on mobile devices
    if (!shouldEnableMobileFeatures()) {
      console.log('🔋 [PageVisibilityManager] Desktop detected - page visibility management disabled');
      this.initialized = true; // Mark as initialized but don't set up listeners
      return;
    }

    // Set initial visibility state
    this.isVisible = !document.hidden;

    // Listen for visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

    // Also listen for focus/blur as backup
    window.addEventListener('focus', this.handleFocus.bind(this));
    window.addEventListener('blur', this.handleBlur.bind(this));

    this.initialized = true;

    console.log('🔋 [PageVisibilityManager] Initialized - managing background activity on mobile device');
    
    // Expose to window for debugging
    (window as any).pageVisibilityManager = this;
    (window as any).getBackgroundActivities = () => Array.from(this.activities.keys());
  }

  /**
   * Register a background activity to be managed
   */
  registerActivity(activity: BackgroundActivity): void {
    this.activities.set(activity.id, activity);
    
    // If page is currently hidden, immediately pause the activity
    if (!this.isVisible) {
      try {
        activity.pause();
        console.log(`⏸️ [PageVisibilityManager] Immediately paused ${activity.id} (${activity.type})`);
      } catch (error) {
        console.warn(`⚠️ [PageVisibilityManager] Failed to pause ${activity.id}:`, error);
      }
    }
  }

  /**
   * Unregister a background activity
   */
  unregisterActivity(id: string): void {
    const activity = this.activities.get(id);
    if (activity) {
      this.activities.delete(id);
      console.log(`🗑️ [PageVisibilityManager] Unregistered ${id}`);
    }
  }

  /**
   * Add a listener for visibility changes
   */
  addVisibilityListener(listener: (visible: boolean) => void): () => void {
    this.listeners.add(listener);
    
    // Return cleanup function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Get current visibility state
   */
  get pageVisible(): boolean {
    return this.isVisible;
  }

  /**
   * Handle visibility change events
   */
  private handleVisibilityChange(): void {
    const wasVisible = this.isVisible;
    this.isVisible = !document.hidden;
    
    if (wasVisible !== this.isVisible) {
      console.log(`🔋 [PageVisibilityManager] Page ${this.isVisible ? 'visible' : 'hidden'} - ${this.isVisible ? 'resuming' : 'pausing'} ${this.activities.size} activities`);
      
      if (this.isVisible) {
        this.resumeAllActivities();
      } else {
        this.pauseAllActivities();
      }
      
      // Notify listeners
      this.listeners.forEach(listener => {
        try {
          listener(this.isVisible);
        } catch (error) {
          console.warn('⚠️ [PageVisibilityManager] Listener error:', error);
        }
      });
    }
  }

  /**
   * Handle focus events (backup mechanism)
   */
  private handleFocus(): void {
    if (!this.isVisible) {
      console.log('🔋 [PageVisibilityManager] Window focused - resuming activities');
      this.isVisible = true;
      this.resumeAllActivities();
      this.listeners.forEach(listener => listener(true));
    }
  }

  /**
   * Handle blur events (backup mechanism)
   */
  private handleBlur(): void {
    // Add small delay to avoid false positives from quick focus changes
    setTimeout(() => {
      if (document.hidden && this.isVisible) {
        console.log('🔋 [PageVisibilityManager] Window blurred and hidden - pausing activities');
        this.isVisible = false;
        this.pauseAllActivities();
        this.listeners.forEach(listener => listener(false));
      }
    }, 100);
  }

  /**
   * Pause all registered activities
   */
  private pauseAllActivities(): void {
    let pausedCount = 0;
    
    this.activities.forEach((activity, id) => {
      try {
        activity.pause();
        pausedCount++;
        console.log(`⏸️ [PageVisibilityManager] Paused ${id} (${activity.type})`);
      } catch (error) {
        console.warn(`⚠️ [PageVisibilityManager] Failed to pause ${id}:`, error);
      }
    });
    
    console.log(`⏸️ [PageVisibilityManager] Paused ${pausedCount}/${this.activities.size} background activities`);
  }

  /**
   * Resume all registered activities
   */
  private resumeAllActivities(): void {
    let resumedCount = 0;
    
    // Small delay to ensure page is fully active
    setTimeout(() => {
      this.activities.forEach((activity, id) => {
        try {
          activity.resume();
          resumedCount++;
          console.log(`▶️ [PageVisibilityManager] Resumed ${id} (${activity.type})`);
        } catch (error) {
          console.warn(`⚠️ [PageVisibilityManager] Failed to resume ${id}:`, error);
        }
      });
      
      console.log(`▶️ [PageVisibilityManager] Resumed ${resumedCount}/${this.activities.size} background activities`);
    }, 250); // 250ms delay for smooth resume
  }

  /**
   * Get activity status for debugging
   */
  getActivityStatus(): { id: string; type: string; active: boolean }[] {
    return Array.from(this.activities.entries()).map(([id, activity]) => ({
      id,
      type: activity.type,
      active: this.isVisible
    }));
  }

  /**
   * Cleanup - called when app unmounts
   */
  destroy(): void {
    document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    window.removeEventListener('focus', this.handleFocus.bind(this));
    window.removeEventListener('blur', this.handleBlur.bind(this));
    
    this.activities.clear();
    this.listeners.clear();
    this.initialized = false;
    
    console.log('🔋 [PageVisibilityManager] Destroyed');
  }
}

// OPTION C FIX: Only create singleton instance if not disabled
let pageVisibilityManagerInstance: PageVisibilityManager | null = null;

function getPageVisibilityManager(): PageVisibilityManager {
  if (!pageVisibilityManagerInstance) {
    // Check disable flag before creating instance
    if (typeof window !== 'undefined' && (window as any).DISABLE_PAGE_VISIBILITY_MANAGER) {
      console.log('🔧 [PageVisibilityManager] Singleton creation DISABLED - Mobile Event Coordinator is managing events');
      // Return a no-op instance
      pageVisibilityManagerInstance = {
        initialize: () => {},
        registerActivity: () => {},
        unregisterActivity: () => {},
        addVisibilityListener: () => () => {},
        get pageVisible() { return true; },
        getActivityStatus: () => [],
        destroy: () => {}
      } as unknown as PageVisibilityManager;
    } else {
      pageVisibilityManagerInstance = PageVisibilityManager.getInstance();
    }
  }
  return pageVisibilityManagerInstance;
}

// Export lazy singleton using Proxy for deferred creation
export const pageVisibilityManager = new Proxy({} as PageVisibilityManager, {
  get(target, prop) {
    const instance = getPageVisibilityManager();
    const value = (instance as any)[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  }
});

/**
 * 🎣 React Hook for easy integration
 */
/**
 * FIXED: Converted to const export for React Fast Refresh compatibility
 */
export const usePageVisibility = () => {
  const [isVisible, setIsVisible] = useState(pageVisibilityManager.pageVisible);

  useEffect(() => {
    const unsubscribe = pageVisibilityManager.addVisibilityListener(setIsVisible);
    return unsubscribe;
  }, []);

  return isVisible;
}

/**
 * 🛠️ Helper function to create managed intervals
 */
export function createManagedInterval(
  id: string,
  callback: () => void,
  delay: number,
  type: 'heartbeat' | 'polling' = 'polling'
): () => void {
  let intervalId: NodeJS.Timeout | null = null;

  const activity: BackgroundActivity = {
    id,
    type,
    pause: () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    },
    resume: () => {
      if (!intervalId) {
        intervalId = setInterval(callback, delay);
      }
    }
  };

  // Start the interval
  intervalId = setInterval(callback, delay);
  
  // Register with visibility manager
  pageVisibilityManager.registerActivity(activity);

  // Return cleanup function
  return () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    pageVisibilityManager.unregisterActivity(id);
  };
}

/**
 * 🔄 Helper function to create managed subscriptions
 */
export function createManagedSubscription(
  id: string,
  setupFn: () => { unsubscribe: () => void },
  type: 'subscription' = 'subscription'
): () => void {
  let subscription: { unsubscribe: () => void } | null = null;

  const activity: BackgroundActivity = {
    id,
    type,
    pause: () => {
      if (subscription) {
        subscription.unsubscribe();
        subscription = null;
      }
    },
    resume: () => {
      if (!subscription) {
        try {
          subscription = setupFn();
        } catch (error) {
          console.warn(`⚠️ [PageVisibilityManager] Failed to resume subscription ${id}:`, error);
        }
      }
    }
  };

  // Setup initial subscription
  subscription = setupFn();
  
  // Register with visibility manager
  pageVisibilityManager.registerActivity(activity);

  // Return cleanup function
  return () => {
    if (subscription) {
      subscription.unsubscribe();
      subscription = null;
    }
    pageVisibilityManager.unregisterActivity(id);
  };
}

export default pageVisibilityManager; 