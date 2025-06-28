/**
 * 🚨 DISABLE ALL MOBILE SYSTEMS
 * 
 * Overrides and disables all conflicting mobile systems
 * that are still loading despite the comprehensive fix
 */

console.log('🚨 [DisableMobileSystems] Disabling all conflicting mobile systems...');

// Override SimpleMobileManager to do nothing
if (typeof window !== 'undefined') {
  // Create a no-op SimpleMobileManager
  const NoOpMobileManager = {
    setUser: () => console.log('🔧 [NoOpMobileManager] setUser disabled'),
    getState: () => ({ 
      isMobile: false, 
      isBackground: false, 
      needsSessionCheck: false, 
      isRefreshing: false 
    }),
    shouldUseCacheFirst: () => false,
    validateSession: () => Promise.resolve({ action: 'continue' }),
    manualRefresh: () => Promise.resolve(true)
  };
  
  // Override any global mobile managers
  window.simpleMobileManager = NoOpMobileManager;
  window.mobileSessionManager = NoOpMobileManager;
  window.mobileOptimizationLayer = {
    initialize: () => console.log('🔧 [NoOpMobileOptimizer] initialize disabled'),
    getCapabilities: () => ({ isMobile: false })
  };
  
  // Disable Page Visibility Manager
  window.pageVisibilityManager = {
    initialize: () => console.log('🔧 [NoOpPageVisibility] initialize disabled'),
    destroy: () => console.log('🔧 [NoOpPageVisibility] destroy disabled')
  };
  
  // Override mobile lifecycle hooks
  const noOpHook = () => ({
    isBackground: false,
    needsSessionCheck: false,
    isRefreshing: false,
    isMobile: false
  });
  
  // Create module overrides
  window.__MOBILE_MODULES_DISABLED__ = true;
  
  console.log('✅ [DisableMobileSystems] All mobile systems disabled via overrides');
} 