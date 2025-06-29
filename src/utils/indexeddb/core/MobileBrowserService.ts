/**
 * Mobile Browser Detection Service
 * 
 * Handles mobile browser detection, background state management,
 * and cache-first logic for mobile environments
 */

import { IMobileBrowserService, MobileBrowserInfo } from '../types';

/**
 * Mobile Browser Service
 * 
 * Specialized service for mobile browser detection and behavior management
 */
export class MobileBrowserService implements IMobileBrowserService {
  private lastVisibilityChange: number | null = null;
  private mobileBackgroundState = false;
  private visibilityChangeListener: (() => void) | null = null;

  constructor() {
    this.setupMobileDetection();
  }

  /**
   * Setup mobile browser detection and event listeners
   */
  setupMobileDetection(): void {
    // OPTION C FIX: Check disable flag - don't initialize if Mobile Event Coordinator is managing events
    if (typeof window !== 'undefined' && (window as any).DISABLE_MOBILE_BROWSER_SERVICE) {
      console.log('🔧 [MobileBrowserService] DISABLED - Mobile Event Coordinator is managing events');
      return;
    }
    
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return; // Not in browser environment
    }

    // Track visibility changes for background detection
    this.visibilityChangeListener = () => {
      this.lastVisibilityChange = Date.now();
      
      if (!document.hidden) {
        // User returned from background
        this.handleBackgroundReturn();
      } else {
        // User went to background
        this.handleBackgroundStart();
      }
    };

    document.addEventListener('visibilitychange', this.visibilityChangeListener);

    // Store reference for global access
    if (typeof window !== 'undefined') {
      (window as any).__lastVisibilityChange = this.lastVisibilityChange;
      (window as any).__mobileBackgroundState = this.mobileBackgroundState;
    }

    console.log('[MobileBrowserService] Mobile detection setup completed');
  }

  /**
   * Detect current mobile browser environment
   */
  detectEnvironment(): MobileBrowserInfo {
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const platform = typeof navigator !== 'undefined' ? navigator.platform : '';

    // Mobile detection patterns
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    
    // Check for recent background return
    const recentBackgroundReturn = this.lastVisibilityChange && 
      (Date.now() - this.lastVisibilityChange) < 60000; // 60 seconds
    
    // Check for hard refresh/reload
    const isHardRefresh = typeof performance !== 'undefined' && 
      (performance.navigation?.type === 1 || 
       (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming)?.type === 'reload');
    
    // Check mobile background state
    const mobileBackgroundDetected = this.mobileBackgroundState;
    
    // Check if initial load
    const isInitialLoad = typeof performance !== 'undefined' &&
      (performance.getEntriesByType('navigation').length === 0 ||
       (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming)?.type === 'navigate');

    const shouldUseCacheFirst = isMobile && (
      recentBackgroundReturn ||
      isHardRefresh ||
      mobileBackgroundDetected ||
      isInitialLoad
    );

    return {
      isMobile,
      userAgent,
      platform,
      shouldUseCacheFirst,
      recentBackgroundReturn: !!recentBackgroundReturn,
      isHardRefresh: !!isHardRefresh,
      mobileBackgroundDetected
    };
  }

  /**
   * Determine if cache-first approach should be used
   */
  shouldUseCacheFirst(): boolean {
    const env = this.detectEnvironment();
    return env.shouldUseCacheFirst;
  }

  /**
   * Check if an error indicates mobile browser blocking
   */
  isMobileBrowserBlocking(error: any): boolean {
    if (!error) return false;

    const errorMessage = error?.message?.toLowerCase() || '';
    
    // Common mobile browser blocking error patterns
    const blockingPatterns = [
      'access control checks',
      'load failed',
      'network error',
      'failed to fetch',
      'timeout',
      'cors',
      'cross-origin',
      'blocked by client'
    ];

    return blockingPatterns.some(pattern => errorMessage.includes(pattern));
  }

  /**
   * Handle user returning from background
   */
  private handleBackgroundReturn(): void {
    const env = this.detectEnvironment();
    
    if (env.isMobile) {
      console.log('[MobileBrowserService] Mobile user returned from background - checking for blocking');
      
      // Set flag for potential blocking
      this.mobileBackgroundState = true;
      
      // Update global reference
      if (typeof window !== 'undefined') {
        (window as any).__mobileBackgroundState = true;
      }
      
      // Clear the flag after a delay (network requests should be attempted)
      setTimeout(() => {
        this.mobileBackgroundState = false;
        if (typeof window !== 'undefined') {
          (window as any).__mobileBackgroundState = false;
        }
      }, 45000); // 45 seconds
    }
  }

  /**
   * Handle user going to background
   */
  private handleBackgroundStart(): void {
    const env = this.detectEnvironment();
    
    if (env.isMobile) {
      console.log('[MobileBrowserService] Mobile user went to background');
      // Could implement additional background handling here
    }
  }

  /**
   * Test mobile blocking detection (for debugging)
   */
  testMobileBlockingDetection(): {
    environment: MobileBrowserInfo;
    wouldUseCache: boolean;
    timeSinceBackground: number | null;
  } {
    const environment = this.detectEnvironment();
    const wouldUseCache = this.shouldUseCacheFirst();
    const timeSinceBackground = this.lastVisibilityChange ? 
      Date.now() - this.lastVisibilityChange : null;

    return {
      environment,
      wouldUseCache,
      timeSinceBackground
    };
  }

  /**
   * Force cache-first mode (for testing)
   */
  forceCacheFirstMode(): void {
    this.mobileBackgroundState = true;
    if (typeof window !== 'undefined') {
      (window as any).__mobileBackgroundState = true;
    }
    console.log('[MobileBrowserService] Cache-first mode forced');
  }

  /**
   * Clear cache-first mode
   */
  clearCacheFirstMode(): void {
    this.mobileBackgroundState = false;
    if (typeof window !== 'undefined') {
      (window as any).__mobileBackgroundState = false;
    }
    console.log('[MobileBrowserService] Cache-first mode cleared');
  }

  /**
   * Get mobile browser capabilities
   */
  getMobileBrowserCapabilities(): {
    supportsServiceWorker: boolean;
    supportsIndexedDB: boolean;
    supportsWebSockets: boolean;
    connectionType?: string;
    isOnline: boolean;
  } {
    const capabilities = {
      supportsServiceWorker: 'serviceWorker' in navigator,
      supportsIndexedDB: 'indexedDB' in window,
      supportsWebSockets: 'WebSocket' in window,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true
    };

    // Add connection type if available
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;
    
    if (connection) {
      return {
        ...capabilities,
        connectionType: connection.effectiveType || connection.type || 'unknown'
      };
    }

    return capabilities;
  }

  /**
   * Cleanup event listeners
   */
  cleanup(): void {
    if (this.visibilityChangeListener && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityChangeListener);
      this.visibilityChangeListener = null;
    }

    // Clear global references
    if (typeof window !== 'undefined') {
      delete (window as any).__lastVisibilityChange;
      delete (window as any).__mobileBackgroundState;
    }

    console.log('[MobileBrowserService] Cleanup completed');
  }

  /**
   * Get debug information
   */
  getDebugInfo(): {
    lastVisibilityChange: number | null;
    mobileBackgroundState: boolean;
    environment: MobileBrowserInfo;
    capabilities: ReturnType<typeof this.getMobileBrowserCapabilities>;
  } {
    return {
      lastVisibilityChange: this.lastVisibilityChange,
      mobileBackgroundState: this.mobileBackgroundState,
      environment: this.detectEnvironment(),
      capabilities: this.getMobileBrowserCapabilities()
    };
  }
}

// OPTION C FIX: Only create singleton instance if not disabled
let mobileBrowserServiceInstance: MobileBrowserService | null = null;

function getMobileBrowserService(): MobileBrowserService {
  if (!mobileBrowserServiceInstance) {
    mobileBrowserServiceInstance = new MobileBrowserService();
  }
  return mobileBrowserServiceInstance;
}

// Export lazy singleton using Proxy that checks disable flag on every call
export const mobileBrowserService = new Proxy({} as MobileBrowserService, {
  get(target, prop) {
    // Check disable flag on EVERY method/property access
    if (typeof window !== 'undefined' && (window as any).DISABLE_MOBILE_BROWSER_SERVICE) {
      // Return no-op functions for disabled state
      if (prop === 'setupMobileDetection') return () => console.log('🔧 [MobileBrowserService] setupMobileDetection DISABLED - Mobile Event Coordinator is managing events');
      if (prop === 'detectEnvironment') return () => ({
        isMobile: false,
        userAgent: '',
        platform: '',
        shouldUseCacheFirst: false,
        recentBackgroundReturn: false,
        isHardRefresh: false,
        mobileBackgroundDetected: false
      });
      if (prop === 'shouldUseCacheFirst') return () => false;
      if (prop === 'isMobileBrowserBlocking') return () => false;
      if (prop === 'testMobileBlockingDetection') return () => ({
        environment: {
          isMobile: false,
          userAgent: '',
          platform: '',
          shouldUseCacheFirst: false,
          recentBackgroundReturn: false,
          isHardRefresh: false,
          mobileBackgroundDetected: false
        },
        wouldUseCache: false,
        timeSinceBackground: null
      });
      if (prop === 'forceCacheFirstMode') return () => {};
      if (prop === 'clearCacheFirstMode') return () => {};
      if (prop === 'getMobileBrowserCapabilities') return () => ({
        supportsServiceWorker: false,
        supportsIndexedDB: false,
        supportsWebSockets: false,
        isOnline: true
      });
      if (prop === 'cleanup') return () => {};
      if (prop === 'getDebugInfo') return () => ({
        lastVisibilityChange: null,
        mobileBackgroundState: false,
        environment: {
          isMobile: false,
          userAgent: '',
          platform: '',
          shouldUseCacheFirst: false,
          recentBackgroundReturn: false,
          isHardRefresh: false,
          mobileBackgroundDetected: false
        },
        capabilities: {
          supportsServiceWorker: false,
          supportsIndexedDB: false,
          supportsWebSockets: false,
          isOnline: true
        }
      });
      // Return no-op for any other property
      return () => {};
    }
    
    // Normal operation - get real instance and bind methods
    const instance = getMobileBrowserService();
    const value = (instance as any)[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  }
}); 