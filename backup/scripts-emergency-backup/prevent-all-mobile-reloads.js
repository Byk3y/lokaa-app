/**
 * Prevent All Mobile Reloads
 * 
 * COMPLETE RELOAD PREVENTION when mobile browsers block network requests
 * 
 * User insight: "When there's no internet, the screen doesn't move at all"
 * Solution: Block ALL reload mechanisms when network blocking is detected
 */

(function() {
  'use strict';
  
  console.log('🛡️ [ReloadPrevention] Initializing complete reload prevention...');
  
  // State tracking
  let networkBlocked = false;
  let reloadsPrevented = 0;
  let originalReload = null;
  let originalReplace = null;
  let originalAssign = null;
  
  // Mobile detection
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (!isMobile) {
    console.log('🛡️ [ReloadPrevention] Desktop detected - skipping reload prevention');
    return;
  }
  
  // Store original methods
  if (typeof window !== 'undefined') {
    originalReload = window.location.reload;
    originalReplace = window.location.replace;
    originalAssign = window.location.assign;
  }
  
  /**
   * Detect if we're in network blocking state
   */
  function detectNetworkBlocking() {
    // Check if Ultimate Mobile Fix is in offline mode
    if (window.ultimateMobileFix) {
      const status = window.ultimateMobileFix.getStatus();
      return status.isOffline;
    }
    
    // Fallback detection
    return networkBlocked;
  }
  
  /**
   * Prevent all page reloads
   */
  function preventAllReloads() {
    if (typeof window === 'undefined') return;
    
    // Override window.location.reload
    window.location.reload = function() {
      if (detectNetworkBlocking()) {
        reloadsPrevented++;
        console.log(`🛡️ [ReloadPrevention] BLOCKED window.location.reload() (${reloadsPrevented} total)`);
        console.log('🏝️ [ReloadPrevention] Staying in offline mode - no reload');
        return false;
      }
      return originalReload.call(this);
    };
    
    // Override window.location.replace
    window.location.replace = function(url) {
      if (detectNetworkBlocking()) {
        reloadsPrevented++;
        console.log(`🛡️ [ReloadPrevention] BLOCKED window.location.replace() (${reloadsPrevented} total)`);
        return false;
      }
      return originalReplace.call(this, url);
    };
    
    // Override window.location.assign
    window.location.assign = function(url) {
      if (detectNetworkBlocking()) {
        reloadsPrevented++;
        console.log(`🛡️ [ReloadPrevention] BLOCKED window.location.assign() (${reloadsPrevented} total)`);
        return false;
      }
      return originalAssign.call(this, url);
    };
    
    // Block direct location changes
    let currentHref = window.location.href;
    Object.defineProperty(window.location, 'href', {
      get: function() {
        return currentHref;
      },
      set: function(value) {
        if (detectNetworkBlocking()) {
          reloadsPrevented++;
          console.log(`🛡️ [ReloadPrevention] BLOCKED location.href change (${reloadsPrevented} total)`);
          return;
        }
        currentHref = value;
        originalAssign.call(window.location, value);
      }
    });
  }
  
  /**
   * Block aggressive error recovery systems
   */
  function blockErrorRecovery() {
    // Override console.error to detect reload triggers
    const originalConsoleError = console.error;
    console.error = function(...args) {
      const errorMessage = args.join(' ').toLowerCase();
      
      // Block reloads triggered by errors during network blocking
      if (detectNetworkBlocking() && (
        errorMessage.includes('load failed') ||
        errorMessage.includes('fetch failed') ||
        errorMessage.includes('network error') ||
        errorMessage.includes('access control')
      )) {
        console.log('🛡️ [ReloadPrevention] Suppressing error that could trigger reload:', errorMessage);
        return; // Don't log errors that might trigger reloads
      }
      
      return originalConsoleError.apply(this, args);
    };
    
    // Block window.onerror during network blocking
    const originalWindowError = window.onerror;
    window.onerror = function(message, source, lineno, colno, error) {
      if (detectNetworkBlocking()) {
        console.log('🛡️ [ReloadPrevention] Suppressed window.onerror during network blocking');
        return true; // Prevent default error handling
      }
      if (originalWindowError) {
        return originalWindowError.call(this, message, source, lineno, colno, error);
      }
    };
    
    // Block unhandledrejection during network blocking
    const originalUnhandledRejection = window.onunhandledrejection;
    window.onunhandledrejection = function(event) {
      if (detectNetworkBlocking()) {
        console.log('🛡️ [ReloadPrevention] Suppressed unhandledrejection during network blocking');
        event.preventDefault();
        return;
      }
      if (originalUnhandledRejection) {
        return originalUnhandledRejection.call(this, event);
      }
    };
  }
  
  /**
   * Monitor for network blocking state changes
   */
  function monitorNetworkState() {
    setInterval(() => {
      const wasBlocked = networkBlocked;
      networkBlocked = detectNetworkBlocking();
      
      if (!wasBlocked && networkBlocked) {
        console.log('🛡️ [ReloadPrevention] Network blocking detected - ALL RELOADS BLOCKED');
      } else if (wasBlocked && !networkBlocked) {
        console.log('🛡️ [ReloadPrevention] Network restored - reloads allowed');
      }
    }, 1000);
  }
  
  /**
   * Provide debug interface
   */
  function setupDebugInterface() {
    window.reloadPrevention = {
      getStatus: () => ({
        isMobile,
        networkBlocked: detectNetworkBlocking(),
        reloadsPrevented,
        active: true
      }),
      
      forceBlock: () => {
        networkBlocked = true;
        console.log('🛡️ [ReloadPrevention] Force blocked all reloads');
      },
      
      allowReloads: () => {
        networkBlocked = false;
        console.log('🛡️ [ReloadPrevention] Reloads now allowed');
      },
      
      testReload: () => {
        console.log('🧪 [ReloadPrevention] Testing reload prevention...');
        window.location.reload();
      }
    };
  }
  
  // Initialize everything
  preventAllReloads();
  blockErrorRecovery();
  monitorNetworkState();
  setupDebugInterface();
  
  console.log('🛡️ [ReloadPrevention] Complete reload prevention active for mobile');
  console.log('🧪 [ReloadPrevention] Test with: window.reloadPrevention.testReload()');
  
})(); 