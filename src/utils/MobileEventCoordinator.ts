import { log } from '@/utils/logger';
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

  private focusHandler: (() => void) | null = null;
  private blurHandler: (() => void) | null = null;

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
      log.debug('Utils', '🏗️ [MobileEventCoordinator] Already initialized');
      return;
    }

    log.debug('Utils', '🏗️ [MobileEventCoordinator] Initializing central mobile event system...');
    log.debug('Utils', `🏗️ [MobileEventCoordinator] Mobile device detected: ${this.isMobile}`);

    // DESKTOP GUARD: Don't initialize mobile systems on desktop
    if (!this.isMobile) {
      log.debug('Utils', '🖥️ [MobileEventCoordinator] Desktop detected - mobile systems disabled');
      this.isInitialized = true;
      
      // Still set disable flags to prevent competing mobile systems from running
      this.disableCompetingSystems();
      return;
    }

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

    log.debug('Utils', '✅ [MobileEventCoordinator] Central coordinator initialized');
    log.debug('Utils', `✅ [MobileEventCoordinator] Replacing 6+ competing systems with 1 coordinator`);
    
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
      log.debug('Utils', `🏗️ [MobileEventCoordinator] Skipping ${config.name} - not on mobile device`);
      return () => {}; // Return no-op unsubscribe
    }

    this.subscribers.set(config.name, {
      priority: 100, // Default priority
      onlyOnMobile: false,
      ...config
    });

    log.debug('Utils', `✅ [MobileEventCoordinator] Subscribed: ${config.name} (${this.subscribers.size} total)`);

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(config.name);
      log.debug('Utils', `🗑️ [MobileEventCoordinator] Unsubscribed: ${config.name}`);
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
        
        log.debug('Utils', '🌙 [MobileEventCoordinator] App backgrounded - notifying systems');
        
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
        
        log.debug('Utils', `🌅 [MobileEventCoordinator] App foregrounded after ${Math.round(duration/1000)}s - notifying systems`);
        
        this.notifySubscribers({
          isBackground: false,
          timestamp: now,
          duration,
          eventType: 'visibility',
          isLongBackground
        });
      }
    });

    log.debug('Utils', '✅ [MobileEventCoordinator] Visibility listener setup (1 listener for entire app)');
  }

  /**
   * Setup focus/blur listeners
   */
  private setupFocusListeners(): void {
    if (typeof window === 'undefined') return;

    const handleFocus = () => {
      this.notifySubscribers({
        isBackground: false,
        timestamp: Date.now(),
        eventType: 'focus'
      });
    };

    const handleBlur = () => {
      this.notifySubscribers({
        isBackground: true,
        timestamp: Date.now(),
        eventType: 'blur'
      });
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    // Store handlers for cleanup
    this.focusHandler = handleFocus;
    this.blurHandler = handleBlur;

    log.debug('Utils', '✅ [MobileEventCoordinator] Focus/blur listeners setup');
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

    log.debug('Utils', '✅ [MobileEventCoordinator] Page lifecycle listeners setup');
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

    log.debug('Utils', `📡 [MobileEventCoordinator] Notifying ${sortedSubscribers.length} systems (${eventData.eventType})`);

    // Notify all systems
    const notifications = sortedSubscribers.map(async (config) => {
      try {
        await config.handler(eventData);
      } catch (error) {
        log.warn('Utils', `⚠️ [MobileEventCoordinator] ${config.name} handler error:`, error);
      }
    });

    await Promise.all(notifications);
    
    log.debug('Utils', `✅ [MobileEventCoordinator] All systems notified (${eventData.eventType})`);
  }

  /**
   * Disable competing mobile systems
   */
  private disableCompetingSystems(): void {
    if (typeof window === 'undefined') return;

    log.debug('Utils', '🔧 [MobileEventCoordinator] Disabling competing mobile systems...');

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

    log.debug('Utils', '✅ [MobileEventCoordinator] Competing systems disabled');
    log.debug('Utils', '✅ [MobileEventCoordinator] Performance improvement: 1 listener vs 6+ before');
  }

  /**
   * Emergency cleanup
   */
  cleanup(): void {
    log.debug('Utils', '🧹 [MobileEventCoordinator] Cleaning up...');
    
    this.subscribers.clear();
    this.isInitialized = false;
    
    // Remove event listeners
    if (typeof window !== 'undefined') {
      if (this.focusHandler) {
        window.removeEventListener('focus', this.focusHandler);
        this.focusHandler = null;
      }
      if (this.blurHandler) {
        window.removeEventListener('blur', this.blurHandler);
        this.blurHandler = null;
      }
      
      // Remove global references
      delete (window as any).MobileEventCoordinator;
      delete (window as any).getMobileEventState;
      delete (window as any).getMobileSubscribers;
    }
    
    log.debug('Utils', '✅ [MobileEventCoordinator] Cleanup complete');
  }
}

// Export singleton instance
export const mobileEventCoordinator = MobileEventCoordinator.getInstance();

// Auto-initialize only on mobile devices
if (typeof window !== 'undefined') {
  // Only initialize on mobile devices to prevent unnecessary desktop overhead
  if (shouldEnableMobileFeatures()) {
    // Initialize on next tick to ensure all modules are loaded
    setTimeout(() => {
      mobileEventCoordinator.initialize();
    }, 0);
  } else {
    log.debug('Utils', '🖥️ [MobileEventCoordinator] Desktop detected - skipping mobile event coordination');
  }
} 