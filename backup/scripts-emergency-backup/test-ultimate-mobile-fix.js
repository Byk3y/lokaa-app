/**
 * Test Ultimate Mobile Fix
 * 
 * Monitor and diagnose the Ultimate Mobile Fix to understand why reloads still occur
 */

(function() {
  'use strict';
  
  console.log('🧪 [TestUltimateFix] Ultimate Mobile Fix test suite loaded');
  
  function testUltimateMobileFix() {
    console.log('\n🧪 ULTIMATE MOBILE FIX DIAGNOSTIC');
    console.log('==================================');
    
    // Test Ultimate Mobile Fix status
    if (window.ultimateMobileFix) {
      const status = window.ultimateMobileFix.getStatus();
      console.log('✅ Ultimate Mobile Fix found');
      console.log('📱 Mobile Device:', status.isMobile);
      console.log('🏝️ Offline Mode:', status.isOffline ? '🏝️ ACTIVE' : '🌐 INACTIVE');
      console.log('⏱️ Background Time:', status.backgroundStartTime ? `${Math.round(status.activeFor/1000)}s ago` : 'Never');
    } else {
      console.log('❌ Ultimate Mobile Fix NOT FOUND');
    }
    
    // Test Reload Prevention
    if (window.reloadPrevention) {
      const status = window.reloadPrevention.getStatus();
      console.log('✅ Reload Prevention found');
      console.log('🛡️ Reloads Prevented:', status.reloadsPrevented);
      console.log('🏝️ Offline Mode Active:', status.isOfflineMode);
    } else {
      console.log('❌ Reload Prevention NOT FOUND');
    }
    
    // Test for other systems that might trigger reloads
    const potentialReloadTriggers = [
      'healthMonitor',
      'mobileSessionManager',
      'phase1MobileRecovery',
      'mobileBrowserService',
      'whiteScreenFix',
      'globalErrorInterceptor'
    ];
    
    console.log('\n🔍 POTENTIAL RELOAD TRIGGERS:');
    potentialReloadTriggers.forEach(trigger => {
      if (window[trigger]) {
        console.log(`⚠️ Found: ${trigger} - could trigger reloads`);
      } else {
        console.log(`✅ Safe: ${trigger} not found`);
      }
    });
    
    // Test window.location methods
    console.log('\n🔍 WINDOW.LOCATION METHODS:');
    console.log('window.location.reload type:', typeof window.location.reload);
    console.log('window.location.replace type:', typeof window.location.replace);
    console.log('window.location.assign type:', typeof window.location.assign);
  }
  
  function simulateNetworkBlocking() {
    console.log('\n🧪 SIMULATING NETWORK BLOCKING...');
    if (window.ultimateMobileFix) {
      window.ultimateMobileFix.enterOfflineMode();
      console.log('🏝️ Entered offline mode');
      
      setTimeout(() => {
        console.log('🧪 Testing reload prevention...');
        try {
          window.location.reload();
          console.log('❌ Reload was NOT prevented!');
        } catch(e) {
          console.log('✅ Reload was prevented');
        }
      }, 1000);
    } else {
      console.log('❌ Cannot simulate - Ultimate Mobile Fix not found');
    }
  }
  
  function monitorPageReloads() {
    console.log('\n🔍 MONITORING PAGE RELOADS...');
    
    // Track performance navigation entries
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.type === 'reload') {
          console.log('🚨 PAGE RELOAD DETECTED!', entry);
        }
      }
    });
    
    observer.observe({entryTypes: ['navigation']});
    
    // Monitor window.location changes
    let currentHref = window.location.href;
    setInterval(() => {
      if (window.location.href !== currentHref) {
        console.log('🚨 LOCATION CHANGE DETECTED!', {
          from: currentHref,
          to: window.location.href
        });
        currentHref = window.location.href;
      }
    }, 100);
    
    console.log('👀 Monitoring active - will detect any reloads or navigation changes');
  }
  
  // Global interface
  window.testUltimateMobileFix = {
    test: testUltimateMobileFix,
    simulate: simulateNetworkBlocking,
    monitor: monitorPageReloads,
    
    runAll: () => {
      testUltimateMobileFix();
      monitorPageReloads();
    }
  };
  
  console.log('🧪 Commands available:');
  console.log('  - window.testUltimateMobileFix.test() - Run diagnostic');
  console.log('  - window.testUltimateMobileFix.simulate() - Simulate network blocking');
  console.log('  - window.testUltimateMobileFix.monitor() - Monitor for reloads');
  console.log('  - window.testUltimateMobileFix.runAll() - Run all tests');
  
})(); 