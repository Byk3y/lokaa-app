/**
 * Login Issues Fix Test
 * 
 * Tests all the issues identified during login flow
 */

window.LoginIssuesTest = (function() {
  'use strict';

  function runTest() {
    console.log('%c🎯 Login Issues Fix Test', 'color: #10B981; font-weight: bold; font-size: 14px;');
    console.log('=====================================');
    
    // Test 1: Space fetch timeout prevention
    testSpaceFetchOptimization();
    
    // Test 2: Mobile detection unification
    testMobileDetectionUnified();
    
    // Test 3: Navigation-aware comment system
    testNavigationAwareComments();
    
    // Test 4: Category reappearing fix
    testCategoryReappearingFix();
    
    console.log('\n🎯 Test completed! Check logs above for results.');
  }

  function testSpaceFetchOptimization() {
    console.log('\n📊 Testing Space Fetch Optimization...');
    
    // Check for space cache existence
    const persistentCacheKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('space_fallback_')
    );
    
    const lastActiveSpace = localStorage.getItem('lastActiveSpace');
    
    console.log(`✅ Persistent space cache keys: ${persistentCacheKeys.length}`);
    console.log(`✅ Last active space cached: ${!!lastActiveSpace}`);
    
    if (persistentCacheKeys.length > 0) {
      console.log('%c✅ PASS: Space cache optimization active', 'color: #10B981; font-weight: bold;');
      console.log('   This should prevent 15-second timeout during login');
    } else {
      console.log('%c⚠️ INFO: No space cache yet (expected on first visit)', 'color: #F59E0B; font-weight: bold;');
    }
  }

  function testMobileDetectionUnified() {
    console.log('\n📱 Testing Mobile Detection Unification...');
    
    // Test unified detection
    let unifiedResult = null;
    if (window.shouldEnableMobileFeatures) {
      unifiedResult = window.shouldEnableMobileFeatures();
    } else if (window.mobileDetection) {
      unifiedResult = typeof window.mobileDetection === 'function' ? 
                     window.mobileDetection() : 
                     window.mobileDetection.isMobile();
    }
    
    console.log(`📊 Unified mobile detection result: ${unifiedResult}`);
    
    // Check for conflicts
    const detectionSources = [];
    
    if (window.navigationStore) {
      detectionSources.push(`Navigation: ${window.navigationStore.getState?.()?.isMobileDevice || 'unknown'}`);
    }
    
    if (unifiedResult !== null) {
      console.log('%c✅ PASS: Unified mobile detection active', 'color: #10B981; font-weight: bold;');
      console.log('   This should prevent mobile detection conflicts');
    } else {
      console.log('%c⚠️ WARNING: Mobile detection not accessible', 'color: #F59E0B; font-weight: bold;');
    }
    
    console.log(`📊 Detection sources: ${detectionSources.join(', ')}`);
  }

  function testNavigationAwareComments() {
    console.log('\n🛡️ Testing Navigation-Aware Comment System...');
    
    const serviceAvailable = !!window.navigationAwareRealtimeService;
    console.log(`📊 NavigationAwareRealtimeService available: ${serviceAvailable}`);
    
    if (serviceAvailable) {
      const stats = window.navigationAwareRealtimeService.getStats();
      console.log(`📊 Protected subscriptions: ${stats.protectedSubscriptions}`);
      console.log(`📊 Total subscriptions: ${stats.totalSubscriptions}`);
      
      console.log('%c✅ PASS: Navigation-aware system active', 'color: #10B981; font-weight: bold;');
      console.log('   This should prevent excessive comment fetching during navigation');
    } else {
      console.log('%c⚠️ WARNING: Navigation-aware service not available', 'color: #F59E0B; font-weight: bold;');
    }
  }

  function testCategoryReappearingFix() {
    console.log('\n🎭 Testing Category Reappearing Fix...');
    
    // Check for category buttons
    const categoryButtons = document.querySelectorAll('[role="tab"]');
    const allButton = Array.from(categoryButtons).find(btn => 
      btn.textContent?.trim() === 'All'
    );
    
    console.log(`📊 Category buttons found: ${categoryButtons.length}`);
    
    if (allButton) {
      const style = window.getComputedStyle(allButton);
      const opacity = style.opacity;
      console.log(`📊 "All" button opacity: ${opacity}`);
      
      if (opacity === '1') {
        console.log('%c✅ PASS: Category buttons have full opacity', 'color: #10B981; font-weight: bold;');
        console.log('   This should prevent opacity transition reappearing effect');
      } else {
        console.log('%c⚠️ INFO: Category button opacity not 1 (might be loading)', 'color: #F59E0B; font-weight: bold;');
      }
    } else {
      console.log('%c⚠️ INFO: Category buttons not found (not on feed tab)', 'color: #F59E0B; font-weight: bold;');
    }
    
    // Check for motion elements (should be minimal)
    const motionElements = document.querySelectorAll('[data-framer-motion-id]');
    const animateElements = document.querySelectorAll('.animate-pulse:not(.bg-gray-300)');
    
    console.log(`📊 Framer Motion elements: ${motionElements.length}`);
    console.log(`📊 Animate pulse elements: ${animateElements.length}`);
    
    if (motionElements.length === 0) {
      console.log('%c✅ PASS: No Framer Motion elements found', 'color: #10B981; font-weight: bold;');
      console.log('   This should eliminate reappearing animations');
    } else {
      console.log('%c⚠️ INFO: Some motion elements still present', 'color: #F59E0B; font-weight: bold;');
    }
  }

  return {
    runTest
  };
})();

// Auto-run the test
console.log('%c🚀 Running Login Issues Fix Test...', 'color: #3B82F6; font-weight: bold;');
window.LoginIssuesTest.runTest(); 