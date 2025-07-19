import { log } from '@/utils/logger';
/**
 * Mobile Loading Test Utility
 * 
 * Helps developers test mobile loading performance by simulating different loading conditions.
 * Run this in your browser console to test different scenarios.
 */

class MobileLoadingTest {
  private originalFetch: typeof window.fetch;
  private isRunning = false;
  
  constructor() {
    this.originalFetch = window.fetch;
  }
  
  /**
   * Run a comprehensive mobile loading test
   */
  runTest(options: {
    simulateSlowNetwork?: boolean;
    clearLocalStorage?: boolean;
    forceReload?: boolean;
    logAccessPatterns?: boolean;
  } = {}) {
    if (this.isRunning) {
      log.warn('Utils', '📱 [Test] Test already running. Please wait or call stopTest() first.');
      return;
    }
    
    this.isRunning = true;
    log.debug('Utils', '📱 [Test] Starting mobile loading test with options:', options);
    
    // 1. Enable logging
    if (options.logAccessPatterns) {
      localStorage.setItem('mobile_debug', 'true');
      log.debug('Utils', '📱 [Test] Enhanced logging enabled');
    }
    
    // 2. Simulate slow network if requested
    if (options.simulateSlowNetwork) {
      this.applyNetworkDelay();
      log.debug('Utils', '📱 [Test] Network delay simulation active');
    }
    
    // 3. Clear localStorage if requested
    if (options.clearLocalStorage) {
      this.clearCaches();
      log.debug('Utils', '📱 [Test] Local storage caches cleared');
    }
    
    // 4. Force reload if requested
    if (options.forceReload) {
      log.debug('Utils', '📱 [Test] Reloading page in 1 second...');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      return;
    }
    
    log.debug('Utils', '📱 [Test] Test ready. Navigate through the app to observe behavior.');
    log.debug('Utils', '📱 [Test] Call window.mobileLoadingTest.stopTest() when finished.');
  }
  
  /**
   * Stop the current test and restore normal behavior
   */
  stopTest() {
    if (!this.isRunning) {
      log.warn('Utils', '📱 [Test] No test is currently running.');
      return;
    }
    
    // Restore original fetch
    window.fetch = this.originalFetch;
    
    // Reset other test conditions
    localStorage.removeItem('mobile_debug');
    
    this.isRunning = false;
    log.debug('Utils', '📱 [Test] Test stopped and normal behavior restored.');
  }
  
  /**
   * Apply network delay to simulate slow mobile connections
   */
  private applyNetworkDelay(minDelay = 500, maxDelay = 2000) {
    // Replace fetch with delayed version
    window.fetch = (...args) => {
      const delay = Math.random() * (maxDelay - minDelay) + minDelay;
      log.debug('Utils', `📱 [Test] Delaying fetch by ${Math.round(delay)}ms`);
      
      return new Promise((resolve) => {
        setTimeout(() => {
          this.originalFetch(...args).then(resolve);
        }, delay);
      });
    };
  }
  
  /**
   * Clear relevant caches to simulate fresh app state
   */
  private clearCaches() {
    // Clear space-related localStorage items
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('lastActiveSpace') || 
          key.startsWith('user_owns_space_') || 
          key.startsWith('user_member_') ||
          key.startsWith('cached_space_') ||
          key.startsWith('trust_token_')) {
        localStorage.removeItem(key);
      }
    });
    
    // Clear sessionStorage items
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('trust_token_')) {
        sessionStorage.removeItem(key);
      }
    });
  }
  
  /**
   * Simulate a background/foreground cycle
   */
  simulateBackgroundCycle(backgroundTimeMs = 5000) {
    if (!this.isRunning) {
      log.warn('Utils', '📱 [Test] Please start a test first with runTest()');
      return;
    }
    
    log.debug('Utils', `📱 [Test] Simulating app going to background for ${backgroundTimeMs}ms`);
    
    // Trigger blur event to simulate backgrounding
    window.dispatchEvent(new Event('blur'));
    
    // Set a timeout to simulate coming back to foreground
    setTimeout(() => {
      log.debug('Utils', '📱 [Test] Simulating app returning to foreground');
      window.dispatchEvent(new Event('focus'));
    }, backgroundTimeMs);
  }
}

// Create and export singleton instance
const mobileLoadingTest = new MobileLoadingTest();

// Expose to window for console access
if (typeof window !== 'undefined') {
  (window as any).mobileLoadingTest = mobileLoadingTest;
}

export default mobileLoadingTest; 