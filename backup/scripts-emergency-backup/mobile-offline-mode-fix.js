/**
 * Mobile Offline Mode Fix
 * 
 * Makes the app behave like it's "offline" when mobile browsers block network requests
 * after backgrounding, instead of treating it as an error that needs recovery.
 * 
 * Key insight: When there's no internet, the app works perfectly with cached content.
 * We want the same behavior when mobile browsers temporarily block network access.
 */

(function() {
  'use strict';
  
  console.log('🏝️ [OfflineMode] Mobile offline mode fix initializing...');
  
  // Track mobile background state
  let isInMobileOfflineMode = false;
  let networkBlockingDetected = false;
  let backgroundTime = null;
  
  // Mobile detection
  function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 768 && 'ontouchstart' in window);
  }
  
  // Detect network blocking patterns
  function isNetworkBlockingError(error) {
    if (!error) return false;
    const message = error.message?.toLowerCase() || error.toString?.()?.toLowerCase() || '';
    return message.includes('access control checks') ||
           message.includes('load failed') ||
           message.includes('fetch api cannot load') ||
           message.includes('cors') ||
           message.includes('blocked by client');
  }
  
  // Override fetch to gracefully handle blocked requests
  const originalFetch = window.fetch;
  window.fetch = function(url, options) {
    // If we're in mobile offline mode, reject immediately to trigger cache
    if (isInMobileOfflineMode && isMobileDevice()) {
      console.log('🏝️ [OfflineMode] Simulating offline - using cache for:', url);
      return Promise.reject(new Error('Simulating offline mode for mobile browser blocking'));
    }
    
    return originalFetch.apply(this, arguments).catch(error => {
      // If this looks like mobile browser blocking, enter offline mode
      if (isMobileDevice() && isNetworkBlockingError(error)) {
        console.log('🏝️ [OfflineMode] Network blocking detected, entering offline mode');
        networkBlockingDetected = true;
        enterMobileOfflineMode();
      }
      throw error;
    });
  };
  
  // Enter mobile offline mode
  function enterMobileOfflineMode() {
    if (isInMobileOfflineMode) return;
    
    isInMobileOfflineMode = true;
    console.log('🏝️ [OfflineMode] Entered mobile offline mode - using cached content');
    
    // Disable aggressive recovery systems
    disableAggressiveRecovery();
    
    // Auto-exit offline mode after network recovers
    setTimeout(() => {
      testNetworkRecovery();
    }, 5000);
  }
  
  // Test if network has recovered
  function testNetworkRecovery() {
    if (!isInMobileOfflineMode) return;
    
    // Try a simple network request
    originalFetch('/favicon.ico', { method: 'HEAD', cache: 'no-cache' })
      .then(() => {
        console.log('🏝️ [OfflineMode] Network recovered, exiting offline mode');
        exitMobileOfflineMode();
      })
      .catch(() => {
        // Still blocked, try again later
        setTimeout(testNetworkRecovery, 10000);
      });
  }
  
  // Exit mobile offline mode
  function exitMobileOfflineMode() {
    isInMobileOfflineMode = false;
    networkBlockingDetected = false;
    console.log('🏝️ [OfflineMode] Exited mobile offline mode');
  }
  
  // Disable aggressive recovery systems
  function disableAggressiveRecovery() {
    // Disable health monitor recovery
    if (window.healthMonitor) {
      const originalRecover = window.healthMonitor.attemptRecovery;
      window.healthMonitor.attemptRecovery = function() {
        if (isInMobileOfflineMode) {
          console.log('🏝️ [OfflineMode] Blocked health monitor recovery - in offline mode');
          return Promise.resolve();
        }
        return originalRecover.apply(this, arguments);
      };
    }
    
    // Disable session recovery
    if (window.mobileSessionManager) {
      const originalRecover = window.mobileSessionManager.attemptRecovery;
      window.mobileSessionManager.attemptRecovery = function() {
        if (isInMobileOfflineMode) {
          console.log('🏝️ [OfflineMode] Blocked session recovery - in offline mode');
          return Promise.resolve();
        }
        return originalRecover.apply(this, arguments);
      };
    }
    
    // Suppress error logging for network blocking
    const originalConsoleError = console.error;
    console.error = function(...args) {
      if (isInMobileOfflineMode && args.some(arg => 
        typeof arg === 'string' && (
          arg.includes('access control checks') ||
          arg.includes('Fetch API cannot load') ||
          arg.includes('Load failed')
        )
      )) {
        // Suppress these errors in offline mode
        return;
      }
      return originalConsoleError.apply(this, args);
    };
  }
  
  // Handle page visibility changes
  document.addEventListener('visibilitychange', function() {
    if (!isMobileDevice()) return;
    
    if (document.hidden) {
      backgroundTime = Date.now();
      console.log('🏝️ [OfflineMode] App backgrounded');
    } else {
      const backgroundDuration = backgroundTime ? Date.now() - backgroundTime : 0;
      console.log(`🏝️ [OfflineMode] App foregrounded after ${backgroundDuration}ms`);
      
      // If backgrounded for more than 30 seconds, prepare for potential blocking
      if (backgroundDuration > 30000) {
        console.log('🏝️ [OfflineMode] Long background detected, watching for network blocking');
        // Don't immediately enter offline mode, just be ready for it
      }
    }
  });
  
  // Global interface for debugging
  window.mobileOfflineMode = {
    isActive: () => isInMobileOfflineMode,
    enter: enterMobileOfflineMode,
    exit: exitMobileOfflineMode,
    testNetwork: testNetworkRecovery,
    getStatus: () => ({
      isInOfflineMode: isInMobileOfflineMode,
      networkBlockingDetected,
      backgroundTime,
      isMobile: isMobileDevice()
    })
  };
  
  console.log('🏝️ [OfflineMode] Mobile offline mode fix ready');
  console.log('🏝️ [OfflineMode] Debug: window.mobileOfflineMode.getStatus()');
  
})(); 