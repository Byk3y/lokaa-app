import { log } from '@/utils/logger';
/**
 * Development Recovery Tools
 * 
 * Quick utilities for common development issues including:
 * - HMR module import failures
 * - Cache clearing
 * - Error recovery
 */

// Only available in development
if (import.meta.env?.DEV && typeof window !== 'undefined') {
  
  /**
   * Clear all caches and force reload
   */
  (window as any).clearAllCaches = () => {
    log.debug('Utils', '🧹 [DevTools] Clearing all caches...');
    
    // Clear localStorage
    localStorage.clear();
    
    // Clear sessionStorage  
    sessionStorage.clear();
    
    // Clear service worker caches if available
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }
    
    // Clear any custom caches
    if ((window as any).persistentCache) {
      (window as any).persistentCache.clear();
    }
    
    log.debug('Utils', '🧹 [DevTools] All caches cleared, reloading...');
    setTimeout(() => window.location.reload(), 500);
  };
  
  /**
   * Fix HMR module import issues
   */
  (window as any).fixHMR = () => {
    log.debug('Utils', '🔄 [DevTools] Fixing HMR module import issues...');
    
    // Try to reset Vite's module cache
    if ((window as any).__vite_plugin_react_preamble_installed__) {
      (window as any).__vite_plugin_react_preamble_installed__ = false;
    }
    
    // Force hard reload after clearing
    setTimeout(() => {
      window.location.href = window.location.href;
    }, 100);
  };
  
  /**
   * Quick recovery from module errors
   */
  (window as any).recoverFromModuleError = () => {
    log.debug('Utils', '🚑 [DevTools] Emergency module error recovery...');
    
    // Clear problematic localStorage entries
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('cache') || key.includes('state'))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      log.debug('Utils', `🗑️ Removed: ${key}`);
    });
    
    // Hard reload
    window.location.href = window.location.href;
  };
  
  /**
   * Check system health
   */
  (window as any).checkSystemHealth = () => {
    log.debug('Utils', '🔍 [DevTools] System Health Check');
    log.debug('Utils', '================================');
    
    const report = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      location: window.location.href,
      localStorage: {
        usage: JSON.stringify(localStorage).length,
        keys: Object.keys(localStorage).length
      },
      sessionStorage: {
        usage: JSON.stringify(sessionStorage).length,
        keys: Object.keys(sessionStorage).length
      },
      performance: {
        navigation: (performance as any).navigation,
        timing: performance.timing,
        memory: (performance as any).memory
      },
      errors: {
        hasErrors: !!(window as any).__lastError,
        lastError: (window as any).__lastError
      }
    };
    
    log.table('Utils',(report);
    return report;
  };
  
  /**
   * Monitor for module errors and auto-recover - MOBILE-AWARE VERSION
   */
  (window as any).enableAutoRecovery = () => {
    // Mobile detection utility
    const isMobileBrowser = () => {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    };
    
    if (isMobileBrowser()) {
      log.debug('Utils', '🤖 [DevTools] Auto-recovery DISABLED on mobile browser (prevents false positives from network blocking)');
      return;
    }
    
    log.debug('Utils', '🤖 [DevTools] Auto-recovery enabled (desktop browser)');
    
    window.addEventListener('error', (event) => {
      if (event.message?.includes('Importing a module script failed')) {
        log.warn('Utils', '🔄 [AutoRecovery] Module import failure detected, auto-recovering...');
        (window as any).__lastError = event.error;
        
        setTimeout(() => {
          (window as any).fixHMR();
        }, 1000);
      }
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason?.message?.includes('Importing a module script failed')) {
        log.warn('Utils', '🔄 [AutoRecovery] Async module failure detected, auto-recovering...');
        event.preventDefault();
        
        setTimeout(() => {
          (window as any).fixHMR();
        }, 1000);
      }
    });
  };
  
  // Auto-enable recovery in development
  (window as any).enableAutoRecovery();
  
  // Print available tools
  log.debug('Utils', '🔧 [DevTools] Recovery tools loaded:');
  log.debug('Utils', '   - window.clearAllCaches()');
  log.debug('Utils', '   - window.fixHMR()');
  log.debug('Utils', '   - window.recoverFromModuleError()');
  log.debug('Utils', '   - window.checkSystemHealth()');
  log.debug('Utils', '   - window.enableAutoRecovery() (already enabled)');
  
} 