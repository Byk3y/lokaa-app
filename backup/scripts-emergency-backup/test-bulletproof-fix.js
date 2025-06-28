/**
 * Test Bulletproof Mobile Fix
 * 
 * Monitor and test the bulletproof mobile fix system
 */

(function() {
  'use strict';
  
  console.log('🧪 [TestBulletproof] Bulletproof test suite loaded');
  
  function runTest() {
    console.log('\n🛡️ BULLETPROOF MOBILE FIX TEST');
    console.log('===============================');
    
    if (window.bulletproofMobileFix) {
      const status = window.bulletproofMobileFix.getStatus();
      console.log('✅ Bulletproof Mobile Fix found');
      console.log('📱 Mobile Device:', status.isMobile);
      console.log('🏝️ Offline Mode:', status.isOffline ? '🏝️ ACTIVE' : '🌐 INACTIVE');
      console.log('🛡️ Prevention Active:', status.preventionActive ? '🛡️ ACTIVE' : '🔓 INACTIVE');
      console.log('🛡️ Reloads Prevented:', status.reloadsPrevented);
      console.log('⏱️ Background Duration:', status.backgroundStartTime ? `${Math.round(status.activeFor/1000)}s ago` : 'Never');
      
      console.log('\n🧪 Testing reload prevention...');
      window.bulletproofMobileFix.testReload();
      
    } else {
      console.log('❌ Bulletproof Mobile Fix NOT FOUND');
    }
  }
  
  function quickCheck() {
    if (window.bulletproofMobileFix) {
      const status = window.bulletproofMobileFix.getStatus();
      console.log(`🛡️ [QuickCheck] Mobile: ${status.isMobile}, Offline: ${status.isOffline}, Prevention: ${status.preventionActive}, Reloads Blocked: ${status.reloadsPrevented}`);
    } else {
      console.log('❌ [QuickCheck] Bulletproof fix not found');
    }
  }
  
  function simulateNetworkBlocking() {
    console.log('🧪 [Simulate] Entering offline mode...');
    if (window.bulletproofMobileFix) {
      window.bulletproofMobileFix.enterOfflineMode();
      setTimeout(() => {
        console.log('🧪 [Simulate] Testing reload...');
        try {
          window.location.reload();
        } catch (e) {
          console.log('🛡️ [Simulate] Reload blocked:', e.message);
        }
      }, 1000);
    }
  }
  
  function monitorForReloads() {
    console.log('🔍 [Monitor] Starting reload monitoring...');
    
    // Monitor for any page navigation that would indicate a reload
    const startTime = Date.now();
    let reloadDetected = false;
    
    // Method 1: Performance navigation timing
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.type === 'reload' || entry.type === 'navigate') {
          console.log('🚨 [Monitor] PAGE NAVIGATION DETECTED!', entry);
          reloadDetected = true;
        }
      }
    });
    
    try {
      observer.observe({entryTypes: ['navigation']});
    } catch (e) {
      console.log('📊 [Monitor] Performance observer not supported');
    }
    
    // Method 2: DOM content loaded detection
    if (document.readyState === 'loading') {
      console.log('🚨 [Monitor] DOM is still loading - possible reload detected!');
      reloadDetected = true;
    }
    
    // Method 3: Check for app initialization
    setTimeout(() => {
      const root = document.querySelector('#root');
      const hasContent = root?.children?.length > 0;
      
      if (!hasContent) {
        console.log('🚨 [Monitor] App not loaded - possible white screen or reload');
      } else {
        console.log('✅ [Monitor] App loaded successfully');
      }
      
      console.log(`📊 [Monitor] Monitoring summary after 5s:`);
      console.log(`  - Reload detected: ${reloadDetected}`);
      console.log(`  - App loaded: ${hasContent}`);
      console.log(`  - Time since start: ${Date.now() - startTime}ms`);
      
    }, 5000);
  }
  
  window.testBulletproofFix = {
    run: runTest,
    check: quickCheck,
    simulate: simulateNetworkBlocking,
    monitor: monitorForReloads,
    
    runAll: () => {
      runTest();
      monitorForReloads();
    }
  };
  
  console.log('🧪 Commands available:');
  console.log('  - window.testBulletproofFix.run() - Full test');
  console.log('  - window.testBulletproofFix.check() - Quick status');
  console.log('  - window.testBulletproofFix.simulate() - Simulate network blocking');
  console.log('  - window.testBulletproofFix.monitor() - Monitor for reloads');
  console.log('  - window.testBulletproofFix.runAll() - Run all tests');
  
})();
