/**
 * Comprehensive Mobile Fix
 * 
 * Complete solution that prevents BOTH network request errors AND page reloads
 * Based on user insight: "When there's no internet, the screen doesn't move at all"
 */

(function() {
  'use strict';
  
  console.log('🏝️ [ComprehensiveFix] Initializing complete mobile fix...');
  
  let isOfflineMode = false;
  let reloadsPrevented = 0;
  let backgroundStartTime = null;
  
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (!isMobile) {
    console.log('🏝️ [ComprehensiveFix] Desktop detected - mobile fixes not needed');
    return;
  }
  
  // Store original methods IMMEDIATELY
  const originalReload = window.location.reload.bind(window.location);
  const originalReplace = window.location.replace.bind(window.location);
  const originalAssign = window.location.assign.bind(window.location);
  const originalFetch = window.fetch.bind(window);
  
  // Network blocking patterns
  const blockingPatterns = [
    'access control checks',
    'load failed', 
    'fetch api cannot load',
    'cors',
    'blocked by client',
    'network error',
    'failed to fetch'
  ];
  
  function isNetworkBlockingError(error) {
    if (!error) return false;
    const message = (error.message || error.toString()).toLowerCase();
    return blockingPatterns.some(pattern => message.includes(pattern));
  }
  
  function enterOfflineMode() {
    if (isOfflineMode) return;
    isOfflineMode = true;
    console.log('🏝️ [ComprehensiveFix] 🏝️ OFFLINE MODE ACTIVE - Blocking ALL reloads and using cached content');
  }
  
  function exitOfflineMode() {
    isOfflineMode = false;
    console.log('🏝️ [ComprehensiveFix] 🌐 ONLINE MODE - Network recovered, reloads allowed');
  }
  
  // 1. OVERRIDE FETCH - Detect network blocking
  window.fetch = function(url, options) {
    if (isOfflineMode) {
      return Promise.reject(new Error('Network request blocked - using cached content'));
    }
    
    return originalFetch(url, options).catch(error => {
      if (isNetworkBlockingError(error)) {
        console.log('🏝️ [ComprehensiveFix] Network blocking detected - entering offline mode');
        enterOfflineMode();
      }
      throw error;
    });
  };
  
  // 2. OVERRIDE ALL RELOAD METHODS
  window.location.reload = function(forceReload) {
    if (isOfflineMode) {
      reloadsPrevented++;
      console.log(`🛡️ [ComprehensiveFix] BLOCKED window.location.reload() - staying in offline mode (${reloadsPrevented} total)`);
      return false;
    }
    return originalReload(forceReload);
  };
  
  window.location.replace = function(url) {
    if (isOfflineMode) {
      reloadsPrevented++;
      console.log(`🛡️ [ComprehensiveFix] BLOCKED window.location.replace() - staying in offline mode (${reloadsPrevented} total)`);
      return false;
    }
    return originalReplace(url);
  };
  
  window.location.assign = function(url) {
    if (isOfflineMode) {
      reloadsPrevented++;
      console.log(`🛡️ [ComprehensiveFix] BLOCKED window.location.assign() - staying in offline mode (${reloadsPrevented} total)`);
      return false;
    }
    return originalAssign(url);
  };
  
  // 3. BLOCK ERROR HANDLERS THAT TRIGGER RELOADS
  const originalWindowError = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    if (isOfflineMode) {
      console.log('🛡️ [ComprehensiveFix] Suppressed window.onerror during offline mode');
      return true;
    }
    if (originalWindowError) {
      return originalWindowError.call(this, message, source, lineno, colno, error);
    }
  };
  
  const originalUnhandledRejection = window.onunhandledrejection;
  window.onunhandledrejection = function(event) {
    if (isOfflineMode) {
      console.log('🛡️ [ComprehensiveFix] Suppressed unhandledrejection during offline mode');
      event.preventDefault();
      return;
    }
    if (originalUnhandledRejection) {
      return originalUnhandledRejection.call(this, event);
    }
  };
  
  // 4. SUPPRESS ERROR CONSOLE LOGS
  const originalConsoleError = console.error;
  console.error = function(...args) {
    const firstArg = args[0]?.toString?.() || '';
    if (blockingPatterns.some(pattern => firstArg.toLowerCase().includes(pattern))) {
      // Silently ignore network blocking "errors"
      return;
    }
    return originalConsoleError.apply(this, args);
  };
  
  // 5. BACKGROUND STATE TRACKING
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      backgroundStartTime = Date.now();
      console.log('🏝️ [ComprehensiveFix] App backgrounded');
    } else {
      const backgroundDuration = backgroundStartTime ? Date.now() - backgroundStartTime : 0;
      console.log(`🏝️ [ComprehensiveFix] App foregrounded after ${Math.round(backgroundDuration/1000)}s`);
      
      if (backgroundDuration > 20000) {
        console.log('🏝️ [ComprehensiveFix] Long background - watching for network blocking...');
      }
    }
  });
  
  // 6. NETWORK RECOVERY TESTING
  function testNetworkRecovery() {
    if (!isOfflineMode) return;
    
    originalFetch('/favicon.ico', { 
      method: 'HEAD',
      cache: 'no-cache',
      signal: AbortSignal.timeout(3000)
    })
    .then(() => {
      exitOfflineMode();
    })
    .catch(() => {
      setTimeout(testNetworkRecovery, 5000);
    });
  }
  
  // Start network testing when offline
  setInterval(() => {
    if (isOfflineMode) {
      testNetworkRecovery();
    }
  }, 5000);
  
  // 7. GLOBAL INTERFACE
  window.comprehensiveMobileFix = {
    isOffline: () => isOfflineMode,
    enterOfflineMode,
    exitOfflineMode,
    getStatus: () => ({
      isOffline: isOfflineMode,
      reloadsPrevented,
      isMobile,
      backgroundStartTime,
      activeFor: backgroundStartTime ? Date.now() - backgroundStartTime : 0
    }),
    testReload: () => {
      console.log('🧪 Testing reload prevention...');
      window.location.reload();
    }
  };
  
  console.log('🏝️ [ComprehensiveFix] Complete mobile fix active');
  console.log('🧪 [ComprehensiveFix] Test with: window.comprehensiveMobileFix.testReload()');
  
})();
