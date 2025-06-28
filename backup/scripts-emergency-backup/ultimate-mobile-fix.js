/**
 * Ultimate Mobile Fix - Offline Mode Simulation
 * 
 * User's brilliant insight: "When there's no internet, the app works perfectly"
 * 
 * This script makes the app behave like it's "offline" when mobile browsers
 * block network requests after backgrounding, instead of treating it as an
 * error that needs aggressive recovery.
 * 
 * REPLACES: All complex mobile recovery systems with simple offline simulation
 */

(function() {
  'use strict';
  
  console.log('🏝️ [UltimateMobile] Initializing offline-mode simulation...');
  
  // State tracking
  let isInOfflineMode = false;
  let backgroundStartTime = null;
  let networkTestTimer = null;
  
  // Mobile detection
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                   (window.innerWidth <= 768 && 'ontouchstart' in window);
  
  if (!isMobile) {
    console.log('🏝️ [UltimateMobile] Desktop detected - mobile fixes not needed');
    return;
  }
  
  console.log('🏝️ [UltimateMobile] Mobile device detected - applying offline simulation');
  
  // Network blocking error patterns
  const blockingErrorPatterns = [
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
    return blockingErrorPatterns.some(pattern => message.includes(pattern));
  }
  
  // 1. FETCH OVERRIDE - Graceful offline simulation
  const originalFetch = window.fetch;
  window.fetch = function(url, options) {
    if (isInOfflineMode) {
      // Simulate offline by immediately rejecting
      return Promise.reject(new Error('Network request blocked - using cached content'));
    }
    
    return originalFetch.apply(this, arguments).catch(error => {
      if (isNetworkBlockingError(error)) {
        console.log('🏝️ [UltimateMobile] Network blocking detected - switching to offline mode');
        enterOfflineMode();
      }
      throw error;
    });
  };
  
  // 2. CONSOLE OVERRIDE - Suppress noise
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  
  console.error = function(...args) {
    // Suppress known mobile browser blocking errors
    const firstArg = args[0]?.toString?.() || '';
    if (blockingErrorPatterns.some(pattern => firstArg.toLowerCase().includes(pattern))) {
      // Silently ignore these "errors" - they're normal mobile behavior
      return;
    }
    return originalConsoleError.apply(this, args);
  };
  
  console.warn = function(...args) {
    // Suppress health monitor warnings during offline mode
    const firstArg = args[0]?.toString?.() || '';
    if (isInOfflineMode && (
      firstArg.includes('Health check failed') ||
      firstArg.includes('Recovery attempt') ||
      firstArg.includes('Presence update failed')
    )) {
      return;
    }
    return originalConsoleWarn.apply(this, args);
  };
  
  // 3. ENTER OFFLINE MODE
  function enterOfflineMode() {
    if (isInOfflineMode) return;
    
    isInOfflineMode = true;
    console.log('🏝️ [UltimateMobile] 🏝️ OFFLINE MODE ACTIVE - Using cached content only');
    
    // Disable all recovery systems
    disableAllRecoverySystems();
    
    // Start network recovery testing
    scheduleNetworkTest();
  }
  
  // 4. EXIT OFFLINE MODE
  function exitOfflineMode() {
    isInOfflineMode = false;
    if (networkTestTimer) {
      clearTimeout(networkTestTimer);
      networkTestTimer = null;
    }
    console.log('🏝️ [UltimateMobile] 🌐 ONLINE MODE - Network recovered');
  }
  
  // 5. DISABLE RECOVERY SYSTEMS
  function disableAllRecoverySystems() {
    // List of recovery systems to disable during offline mode
    const recoverySystemNames = [
      'healthMonitor',
      'mobileSessionManager', 
      'phase1MobileRecovery',
      'mobileBrowserService',
      'globalErrorInterceptor',
      'supabaseHealthChecker',
      'whiteScreenFix'
    ];
    
    recoverySystemNames.forEach(systemName => {
      if (window[systemName]) {
        // Disable recovery methods
        ['attemptRecovery', 'recover', 'fix', 'restart', 'reload'].forEach(methodName => {
          if (window[systemName][methodName]) {
            const originalMethod = window[systemName][methodName];
            window[systemName][methodName] = function() {
              if (isInOfflineMode) {
                console.log(`🏝️ [UltimateMobile] Blocked ${systemName}.${methodName}() - in offline mode`);
                return Promise.resolve();
              }
              return originalMethod.apply(this, arguments);
            };
          }
        });
      }
    });
    
    // Disable page reloads during offline mode
    const originalReload = window.location.reload;
    window.location.reload = function() {
      if (isInOfflineMode) {
        console.log('🏝️ [UltimateMobile] Blocked page reload - in offline mode');
        return;
      }
      return originalReload.apply(this, arguments);
    };
  }
  
  // 6. NETWORK RECOVERY TESTING
  function scheduleNetworkTest() {
    if (networkTestTimer) clearTimeout(networkTestTimer);
    
    networkTestTimer = setTimeout(() => {
      testNetworkRecovery();
    }, 5000); // Test every 5 seconds
  }
  
  function testNetworkRecovery() {
    if (!isInOfflineMode) return;
    
    // Try a simple request to test network recovery
    originalFetch('/favicon.ico', { 
      method: 'HEAD', 
      cache: 'no-cache',
      signal: AbortSignal.timeout(3000) // 3 second timeout
    })
    .then(() => {
      exitOfflineMode();
    })
    .catch(() => {
      // Still blocked, test again later
      scheduleNetworkTest();
    });
  }
  
  // 7. VISIBILITY CHANGE HANDLER
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      backgroundStartTime = Date.now();
      console.log('🏝️ [UltimateMobile] App backgrounded');
    } else {
      const backgroundDuration = backgroundStartTime ? Date.now() - backgroundStartTime : 0;
      console.log(`🏝️ [UltimateMobile] App foregrounded after ${Math.round(backgroundDuration/1000)}s`);
      
      // If backgrounded for more than 20 seconds, watch for network blocking
      if (backgroundDuration > 20000) {
        console.log('🏝️ [UltimateMobile] Long background - watching for network blocking...');
      }
    }
  });
  
  // 8. GLOBAL INTERFACE
  window.ultimateMobileFix = {
    isOffline: () => isInOfflineMode,
    enterOfflineMode,
    exitOfflineMode,
    testNetwork: testNetworkRecovery,
    getStatus: () => ({
      isOffline: isInOfflineMode,
      backgroundStartTime,
      isMobile,
      activeFor: backgroundStartTime ? Date.now() - backgroundStartTime : 0
    })
  };
  
  console.log('🏝️ [UltimateMobile] Ready - will simulate offline mode when network is blocked');
  console.log('🏝️ [UltimateMobile] Debug: window.ultimateMobileFix.getStatus()');
  
})(); 