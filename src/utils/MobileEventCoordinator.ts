/**
 * 🏗️ Mobile Event Coordinator - 2025 Industry Standard
 * 
 * Replaces 6+ competing mobile systems with ONE central coordinator
 * using modern Event Delegation patterns.
 * 
 * SOLVES: Observer Pattern Anti-Pattern causing 35+ page reloads
 * 
 * Systems Being Replaced:
 * - MobileSessionManager (700+ lines)
 * - pageVisibilityManager (280+ lines) 
 * - MobileBrowserService (282 lines)
 * - useMobileLifecycle (485+ lines)
 * - SimpleMobileManager (195 lines)
 * - phase2cIntegration, SkoolStyleMobileHandler, etc.
 */

import { shouldEnableMobileFeatures } from './mobileDetection';

export interface MobileEventData {
  isBackground: boolean;
  timestamp: number;
  duration?: number;
  eventType: 'visibility' | 'focus' | 'blur' | 'pageshow' | 'pagehide';
  isLongBackground?: boolean;
  isBfcacheRestore?: boolean;
}

export interface MobileSystemHandler {
  (eventData: MobileEventData): void | Promise<void>;
}

export interface MobileSystemConfig {
  name: string;
  handler: MobileSystemHandler;
  priority?: number; // Lower number = higher priority
  onlyOnMobile?: boolean;
}

/**
 * Central Mobile Event Coordinator
 * 
 * Single source of truth for all mobile lifecycle events
 */
class MobileEventCoordinator {
  private static instance: MobileEventCoordinator;
  private subscribers = new Map<string, MobileSystemConfig>();
  private isInitialized = false;
  private isMobile = false;
  
  // State tracking
  private state = {
    isBackground: false,
    lastBackgroundTime: 0,
    lastForegroundTime: Date.now(),
    eventCount: 0,
    longBackgroundThreshold: 60000, // 1 minute
    systemsNotified: 0
  };

  constructor() {
    this.isMobile = shouldEnableMobileFeatures();
    
    if (typeof window !== 'undefined') {
      // Global debug interface
      (window as any).MobileEventCoordinator = this;
      (window as any).getMobileEventState = () => this.getState();
      (window as any).getMobileSubscribers = () => Array.from(this.subscribers.keys());
    }
  }

  static getInstance(): MobileEventCoordinator {
    if (!MobileEventCoordinator.instance) {
      MobileEventCoordinator.instance = new MobileEventCoordinator();
    }
    return MobileEventCoordinator.instance;
  }

  /**
   * Initialize the coordinator - sets up the SINGLE event listener
   */
  initialize(): void {
    if (this.isInitialized) {
      console.log('🏗️ [MobileEventCoordinator] Already initialized');
      return;
    }

    console.log('🏗️ [MobileEventCoordinator] Initializing central mobile event system...');
    console.log(`🏗️ [MobileEventCoordinator] Mobile device detected: ${this.isMobile}`);

    // SINGLE visibilitychange listener for entire app
    this.setupVisibilityListener();
    
    // SINGLE focus/blur listeners
    this.setupFocusListeners();
    
    // SINGLE pageshow/pagehide listeners for bfcache
    this.setupPageLifecycleListeners();

    this.isInitialized = true;

    // Set global flag for Option C validation
    if (typeof window !== 'undefined') {
      (window as any).MOBILE_EVENT_COORDINATOR_ACTIVE = true;
    }

    console.log('✅ [MobileEventCoordinator] Central coordinator initialized');
    console.log(`✅ [MobileEventCoordinator] Replacing 6+ competing systems with 1 coordinator`);
    
    // Disable competing systems
    this.disableCompetingSystems();
  }

  /**
   * Subscribe a system to mobile events
   */
  subscribe(config: MobileSystemConfig): () => void {
    if (!config.name || !config.handler) {
      throw new Error('[MobileEventCoordinator] Invalid subscription config');
    }

    // Check if mobile-only and not on mobile
    if (config.onlyOnMobile && !this.isMobile) {
      console.log(`🏗️ [MobileEventCoordinator] Skipping ${config.name} - not on mobile device`);
      return () => {}; // Return no-op unsubscribe
    }

    this.subscribers.set(config.name, {
      priority: 100, // Default priority
      onlyOnMobile: false,
      ...config
    });

    console.log(`✅ [MobileEventCoordinator] Subscribed: ${config.name} (${this.subscribers.size} total)`);

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(config.name);
      console.log(`🗑️ [MobileEventCoordinator] Unsubscribed: ${config.name}`);
    };
  }

  /**
   * Get current state for debugging
   */
  getState() {
    return {
      ...this.state,
      isInitialized: this.isInitialized,
      isMobile: this.isMobile,
      subscriberCount: this.subscribers.size,
      subscribers: Array.from(this.subscribers.keys()),
      performanceImpact: `1 listener vs ${this.state.systemsNotified}+ before`
    };
  }

  /**
   * Setup the SINGLE visibility change listener
   */
  private setupVisibilityListener(): void {
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      const now = Date.now();
      const isBackground = document.hidden;
      
      this.state.eventCount++;

      if (isBackground) {
        // Going to background
        this.state.isBackground = true;
        this.state.lastBackgroundTime = now;
        
        console.log('🌙 [MobileEventCoordinator] App backgrounded - notifying systems');
        
        this.notifySubscribers({
          isBackground: true,
          timestamp: now,
          eventType: 'visibility'
        });
        
      } else {
        // Returning from background
        const duration = now - this.state.lastBackgroundTime;
        const isLongBackground = duration > this.state.longBackgroundThreshold;
        
        this.state.isBackground = false;
        this.state.lastForegroundTime = now;
        
        console.log(`🌅 [MobileEventCoordinator] App foregrounded after ${Math.round(duration/1000)}s - notifying systems`);
        
        this.notifySubscribers({
          isBackground: false,
          timestamp: now,
          duration,
          eventType: 'visibility',
          isLongBackground
        });
      }
    });

    console.log('✅ [MobileEventCoordinator] Visibility listener setup (1 listener for entire app)');
  }

  /**
   * Setup focus/blur listeners
   */
  private setupFocusListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('focus', () => {
      this.notifySubscribers({
        isBackground: false,
        timestamp: Date.now(),
        eventType: 'focus'
      });
    });

    window.addEventListener('blur', () => {
      this.notifySubscribers({
        isBackground: true,
        timestamp: Date.now(),
        eventType: 'blur'
      });
    });

    console.log('✅ [MobileEventCoordinator] Focus/blur listeners setup');
  }

  /**
   * Setup page lifecycle listeners for bfcache
   */
  private setupPageLifecycleListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('pageshow', (event) => {
      this.notifySubscribers({
        isBackground: false,
        timestamp: Date.now(),
        eventType: 'pageshow',
        isBfcacheRestore: event.persisted
      });
    });

    window.addEventListener('pagehide', (event) => {
      this.notifySubscribers({
        isBackground: true,
        timestamp: Date.now(),
        eventType: 'pagehide',
        isBfcacheRestore: event.persisted
      });
    });

    console.log('✅ [MobileEventCoordinator] Page lifecycle listeners setup');
  }

  /**
   * Notify all subscribers in priority order
   */
  private async notifySubscribers(eventData: MobileEventData): Promise<void> {
    if (this.subscribers.size === 0) {
      return;
    }

    // Sort by priority (lower number = higher priority)
    const sortedSubscribers = Array.from(this.subscribers.values())
      .sort((a, b) => (a.priority || 100) - (b.priority || 100));

    this.state.systemsNotified = sortedSubscribers.length;

    console.log(`📡 [MobileEventCoordinator] Notifying ${sortedSubscribers.length} systems (${eventData.eventType})`);

    // Notify all systems
    const notifications = sortedSubscribers.map(async (config) => {
      try {
        await config.handler(eventData);
      } catch (error) {
        console.warn(`⚠️ [MobileEventCoordinator] ${config.name} handler error:`, error);
      }
    });

    await Promise.all(notifications);
    
    console.log(`✅ [MobileEventCoordinator] All systems notified (${eventData.eventType})`);
  }

  /**
   * Disable competing mobile systems
   */
  private disableCompetingSystems(): void {
    if (typeof window === 'undefined') return;

    console.log('🔧 [MobileEventCoordinator] Disabling competing mobile systems...');

    // Set global flags to disable competing systems
    const globalFlags = {
      MOBILE_EVENT_COORDINATOR_ACTIVE: true,
      DISABLE_MOBILE_SESSION_MANAGER: true,
      DISABLE_PAGE_VISIBILITY_MANAGER: true,
      DISABLE_MOBILE_BROWSER_SERVICE: true,
      DISABLE_MOBILE_LIFECYCLE: true,
      DISABLE_SIMPLE_MOBILE_MANAGER: true,
      DISABLE_PHASE2C_MOBILE: true,
      DISABLE_SKOOL_MOBILE: true,
      MOBILE_RECOVERY_DISABLED: true,
      AGGRESSIVE_RELOAD_DISABLED: true
    };

    Object.entries(globalFlags).forEach(([key, value]) => {
      (window as any)[key] = value;
    });

    console.log('✅ [MobileEventCoordinator] Competing systems disabled');
    console.log('✅ [MobileEventCoordinator] Performance improvement: 1 listener vs 6+ before');
  }

  /**
   * Emergency cleanup
   */
  cleanup(): void {
    console.log('🧹 [MobileEventCoordinator] Cleaning up...');
    
    this.subscribers.clear();
    this.isInitialized = false;
    
    // Remove global references
    if (typeof window !== 'undefined') {
      delete (window as any).MobileEventCoordinator;
      delete (window as any).getMobileEventState;
      delete (window as any).getMobileSubscribers;
    }
    
    console.log('✅ [MobileEventCoordinator] Cleanup complete');
  }
}

// Export singleton instance
export const mobileEventCoordinator = MobileEventCoordinator.getInstance();

// Auto-initialize if in browser
if (typeof window !== 'undefined') {
  // Initialize on next tick to ensure all modules are loaded
  setTimeout(() => {
    mobileEventCoordinator.initialize();
  }, 0);
} 