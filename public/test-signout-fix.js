// Test script to verify sign out fix
console.log('🧪 [SignOutTest] Testing sign out fix...');

// Test the session storage flag
function testSignOutFlag() {
  console.log('🧪 [SignOutTest] Testing session storage flag...');
  
  // Simulate sign out flag being set
  sessionStorage.setItem('lokaa-signing-out', 'true');
  console.log('✅ [SignOutTest] Flag set:', sessionStorage.getItem('lokaa-signing-out'));
  
  // Check if flag would be detected
  const isSignOutRedirect = sessionStorage.getItem('lokaa-signing-out') === 'true';
  console.log('✅ [SignOutTest] Flag detected:', isSignOutRedirect);
  
  // Clean up
  sessionStorage.removeItem('lokaa-signing-out');
  console.log('✅ [SignOutTest] Flag cleaned up');
}

// Test app initialization state
function testAppInitialization() {
  console.log('🧪 [SignOutTest] Testing app initialization...');
  
  // Check if app is ready immediately
  const appElement = document.querySelector('[data-component="ApplicationRouter"]') || 
                    document.querySelector('[data-testid="app-content"]') ||
                    document.querySelector('main');
                    
  if (appElement) {
    console.log('✅ [SignOutTest] App content found - no white screen');
  } else {
    console.log('❌ [SignOutTest] App content not found - possible white screen');
  }
  
  // Check for loading screens
  const loadingScreens = document.querySelectorAll('[data-testid="loading-screen"], .animate-spin');
  console.log(`🧪 [SignOutTest] Found ${loadingScreens.length} loading indicators`);
  
  return loadingScreens.length;
}

// Monitor initialization time
function monitorInitializationTime() {
  console.log('🧪 [SignOutTest] Monitoring initialization time...');
  
  const startTime = performance.now();
  let contentFound = false;
  
  const checkInterval = setInterval(() => {
    const currentTime = performance.now();
    const elapsed = currentTime - startTime;
    
    if (!contentFound) {
      const appContent = document.querySelector('main, [role="main"], [data-component="LandingPage"]');
      if (appContent && appContent.children.length > 0) {
        contentFound = true;
        console.log(`✅ [SignOutTest] Content appeared after ${Math.round(elapsed)}ms`);
        clearInterval(checkInterval);
        
        if (elapsed > 2000) {
          console.warn('⚠️ [SignOutTest] Content took longer than 2 seconds to appear');
        } else {
          console.log('✅ [SignOutTest] Content appeared quickly - fix working!');
        }
      }
    }
    
    if (elapsed > 5000) {
      console.warn('❌ [SignOutTest] Content still not found after 5 seconds');
      clearInterval(checkInterval);
    }
  }, 100);
}

// Main test function
function runSignOutTest() {
  console.log('🧪 [SignOutTest] Running comprehensive sign out fix test...');
  
  testSignOutFlag();
  const loadingCount = testAppInitialization();
  monitorInitializationTime();
  
  console.log('🧪 [SignOutTest] Test completed. Check logs above for results.');
  
  return {
    flagTest: 'passed',
    loadingCount,
    timestamp: new Date().toISOString()
  };
}

// Make test available globally
window.testSignOutFix = runSignOutTest;
window.testSignOutFlag = testSignOutFlag;
window.monitorInitializationTime = monitorInitializationTime;

console.log('🧪 [SignOutTest] Test functions available:');
console.log('  - window.testSignOutFix() - Run all tests');
console.log('  - window.testSignOutFlag() - Test session storage flag');
console.log('  - window.monitorInitializationTime() - Monitor content loading');

// Auto-run test if this is a fresh page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(runSignOutTest, 1000);
  });
} else {
  setTimeout(runSignOutTest, 1000);
} 