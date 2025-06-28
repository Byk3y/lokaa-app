/**
 * 🔧 FINAL MOBILE MANAGER OVERRIDE
 * 
 * Prevents React from recreating simpleMobileManager after comprehensive fix
 */

console.log('🔧 [FinalOverride] Starting continuous simpleMobileManager override...');

// Create the safe override object
const createSafeSimpleMobileManager = () => ({
  setUser: () => console.log('🔧 [ComprehensiveFix] SimpleMobileManager call blocked'),
  getState: () => ({ 
    isMobile: true, 
    isOnline: true, 
    backgroundDetected: false,
    isBlocked: true,
    source: 'comprehensive-fix'
  }),
  manualRefresh: () => Promise.resolve(true),
  validateSession: () => true,
  shouldUseCacheFirst: () => false,
  stop: () => {},
  disable: () => {},
  cleanup: () => {},
  // Marker to identify our override
  __comprehensiveFixOverride: true
});

// Initial override
window.simpleMobileManager = createSafeSimpleMobileManager();

// Continuous monitoring and override
let overrideCount = 0;
const monitoringInterval = setInterval(() => {
  const current = window.simpleMobileManager;
  
  // Check if it's been replaced by React (doesn't have our marker)
  if (!current || !current.__comprehensiveFixOverride) {
    overrideCount++;
    console.log(`🔧 [FinalOverride] React replaced simpleMobileManager (override #${overrideCount})`);
    window.simpleMobileManager = createSafeSimpleMobileManager();
  }
}, 500); // Check every 500ms

// Global status function
window.simpleMobileManagerStatus = () => {
  return {
    overrideActive: !!window.simpleMobileManager?.__comprehensiveFixOverride,
    overrideCount,
    currentManager: window.simpleMobileManager,
    isBlocked: true
  };
};

// Stop monitoring after 30 seconds (React should have loaded by then)
setTimeout(() => {
  clearInterval(monitoringInterval);
  console.log(`🔧 [FinalOverride] Monitoring stopped after ${overrideCount} overrides`);
  console.log('📋 Final status:', window.simpleMobileManagerStatus());
}, 30000);

console.log('✅ [FinalOverride] Continuous override active for 30 seconds');
console.log('🧪 Check status: window.simpleMobileManagerStatus()'); 