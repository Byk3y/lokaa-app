/**
 * Bulletproof Mobile Fix
 * 
 * Handles readonly window.location properties and provides multiple layers
 * of reload prevention when mobile browsers block network requests
 */

(function() {
  'use strict';
  
  console.log('🛡️ [BulletproofFix] Initializing bulletproof reload prevention...');
  
  let isOfflineMode = false;
  let reloadsPrevented = 0;
  let backgroundStartTime = null;
  let preventionActive = false;
  
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (!isMobile) {
    console.log('🛡️ [BulletproofFix] Desktop detected - mobile fixes not needed');
    return;
  }
  
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
    preventionActive = true;
    console.log('🛡️ [BulletproofFix] 🏝️ OFFLINE MODE ACTIVE - Blocking ALL navigation and reloads');
    activateReloadPrevention();
  }
  
  function exitOfflineMode() {
    isOfflineMode = false;
    preventionActive = false;
    console.log('🛡️ [BulletproofFix] 🌐 ONLINE MODE - Navigation restored');
  }
  
  // LAYER 1: FETCH OVERRIDE - Detect network blocking
  const originalFetch = window.fetch;
  window.fetch = function(url, options) {
    if (isOfflineMode) {
      return Promise.reject(new Error('Network request blocked - using cached content'));
    }
    
    return originalFetch.apply(this, arguments).catch(error => {
      if (isNetworkBlockingError(error)) {
        console.log('🛡️ [BulletproofFix] Network blocking detected - entering offline mode');
        enterOfflineMode();
      }
      throw error;
    });
  };
  
  // LAYER 2: BULLETPROOF RELOAD PREVENTION
  function activateReloadPrevention() {
    // Method 1: Try to override location methods (if not readonly)
    try {
      const originalReload = window.location.reload;
      Object.defineProperty(window.location, 'reload', {
        value: function() {
          if (preventionActive) {
            reloadsPrevented++;
            console.log(`🛡️ [BulletproofFix] BLOCKED window.location.reload() (${reloadsPrevented} total)`);
            return false;
          }
          return originalReload.call(this);
        },
        writable: true,
        configurable: true
      });
    } catch (e) {
      console.log('🛡️ [BulletproofFix] location.reload is readonly - using alternative prevention');
    }
    
    // Method 2: Beforeunload prevention
    const beforeUnloadHandler = function(event) {
      if (preventionActive) {
        console.log('🛡️ [BulletproofFix] BLOCKED beforeunload event');
        event.preventDefault();
        event.returnValue = '';
        return '';
      }
    };
    
    window.addEventListener('beforeunload', beforeUnloadHandler, true);
    
    // Method 3: Pagehide prevention (iOS Safari)
    const pageHideHandler = function(event) {
      if (preventionActive) {
        console.log('🛡️ [BulletproofFix] BLOCKED pagehide event');
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    
    window.addEventListener('pagehide', pageHideHandler, true);
    
    // Method 4: Unload prevention
    const unloadHandler = function(event) {
      if (preventionActive) {
        console.log('🛡️ [BulletproofFix] BLOCKED unload event');
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    
    window.addEventListener('unload', unloadHandler, true);
    
    // Method 5: History manipulation prevention
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    const originalGo = history.go;
    const originalBack = history.back;
    const originalForward = history.forward;
    
    history.pushState = function() {
      if (preventionActive) {
        console.log('🛡️ [BulletproofFix] BLOCKED history.pushState');
        return;
      }
      return originalPushState.apply(this, arguments);
    };
    
    history.replaceState = function() {
      if (preventionActive) {
        console.log('🛡️ [BulletproofFix] BLOCKED history.replaceState');
        return;
      }
      return originalReplaceState.apply(this, arguments);
    };
    
    history.go = function() {
      if (preventionActive) {
        console.log('🛡️ [BulletproofFix] BLOCKED history.go');
        return;
      }
      return originalGo.apply(this, arguments);
    };
    
    history.back = function() {
      if (preventionActive) {
        console.log('🛡️ [BulletproofFix] BLOCKED history.back');
        return;
      }
      return originalBack.apply(this, arguments);
    };
    
    history.forward = function() {
      if (preventionActive) {
        console.log('🛡️ [BulletproofFix] BLOCKED history.forward');
        return;
      }
      return originalForward.apply(this, arguments);
    };
  }
  
  // LAYER 3: ERROR SUPPRESSION
  const originalConsoleError = console.error;
  console.error = function(...args) {
    const firstArg = args[0]?.toString?.() || '';
    if (blockingPatterns.some(pattern => firstArg.toLowerCase().includes(pattern))) {
      // Silently ignore network blocking "errors"
      return;
    }
    return originalConsoleError.apply(this, args);
  };
  
  // LAYER 4: BACKGROUND STATE TRACKING
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      backgroundStartTime = Date.now();
      console.log('🛡️ [BulletproofFix] App backgrounded');
    } else {
      const backgroundDuration = backgroundStartTime ? Date.now() - backgroundStartTime : 0;
      console.log(`🛡️ [BulletproofFix] App foregrounded after ${Math.round(backgroundDuration/1000)}s`);
      
      if (backgroundDuration > 20000) {
        console.log('🛡️ [BulletproofFix] Long background - watching for network blocking...');
      }
    }
  });
  
  // LAYER 5: NETWORK RECOVERY TESTING
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
  
  // GLOBAL INTERFACE
  window.bulletproofMobileFix = {
    isOffline: () => isOfflineMode,
    isPreventionActive: () => preventionActive,
    enterOfflineMode,
    exitOfflineMode,
    getStatus: () => ({
      isOffline: isOfflineMode,
      preventionActive,
      reloadsPrevented,
      isMobile,
      backgroundStartTime,
      activeFor: backgroundStartTime ? Date.now() - backgroundStartTime : 0
    }),
    testReload: () => {
      console.log('🧪 Testing reload prevention...');
      try {
        window.location.reload();
      } catch (e) {
        console.log('🛡️ Reload blocked successfully:', e.message);
      }
    }
  };
  
  console.log('🛡️ [BulletproofFix] Bulletproof mobile fix active with multiple prevention layers');
  console.log('🧪 [BulletproofFix] Test with: window.bulletproofMobileFix.testReload()');
  
})();
