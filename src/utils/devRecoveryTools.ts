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
    console.log('🧹 [DevTools] Clearing all caches...');
    
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
    
    console.log('🧹 [DevTools] All caches cleared, reloading...');
    setTimeout(() => window.location.reload(), 500);
  };
  
  /**
   * Fix HMR module import issues
   */
  (window as any).fixHMR = () => {
    console.log('🔄 [DevTools] Fixing HMR module import issues...');
    
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
    console.log('🚑 [DevTools] Emergency module error recovery...');
    
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
      console.log(`🗑️ Removed: ${key}`);
    });
    
    // Hard reload
    window.location.href = window.location.href;
  };
  
  /**
   * Check system health
   */
  (window as any).checkSystemHealth = () => {
    console.log('🔍 [DevTools] System Health Check');
    console.log('================================');
    
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
    
    console.table(report);
    return report;
  };
  
  /**
   * Monitor for module errors and auto-recover
   */
  (window as any).enableAutoRecovery = () => {
    console.log('🤖 [DevTools] Auto-recovery enabled');
    
    window.addEventListener('error', (event) => {
      if (event.message?.includes('Importing a module script failed')) {
        console.warn('🔄 [AutoRecovery] Module import failure detected, auto-recovering...');
        (window as any).__lastError = event.error;
        
        setTimeout(() => {
          (window as any).fixHMR();
        }, 1000);
      }
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason?.message?.includes('Importing a module script failed')) {
        console.warn('🔄 [AutoRecovery] Async module failure detected, auto-recovering...');
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
  console.log('🔧 [DevTools] Recovery tools loaded:');
  console.log('   - window.clearAllCaches()');
  console.log('   - window.fixHMR()');
  console.log('   - window.recoverFromModuleError()');
  console.log('   - window.checkSystemHealth()');
  console.log('   - window.enableAutoRecovery() (already enabled)');
  
} 