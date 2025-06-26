/**
 * Simple Phase 3 Testing Script
 * Tests cache system consolidation progress
 */

window.simplePhase3Test = (function() {
  'use strict';

  console.log('🧪 Simple Phase 3 Test Loading...');

  function quickStatus() {
    console.log('\n⚡ PHASE 3 QUICK STATUS CHECK');
    console.log('============================');
    
    // Check if Phase 3 systems are available
    const hasPhase3Script = !!window.Phase3CacheConsolidation;
    const hasSimpleCache = !!window.simpleCache;
    
    // Check for old complex systems in console logs
    const hasOldCacheLogs = true; // Based on user's console showing CacheService: logs
    
    console.log(`📦 Phase 3 script loaded: ${hasPhase3Script ? '✅' : '❌'}`);
    console.log(`💾 Simple cache available: ${hasSimpleCache ? '✅' : '❌'}`);
    console.log(`🚨 Old cache systems active: ${hasOldCacheLogs ? '❌ YES' : '✅ NO'}`);
    
    // Progress calculation
    let progress = 0;
    if (hasPhase3Script) progress += 30;
    if (hasSimpleCache) progress += 30; 
    if (!hasOldCacheLogs) progress += 40;
    
    console.log(`📈 Progress: ${progress}%`);
    
    if (progress < 50) {
      console.log('\n🚨 ACTION NEEDED: Scripts not loaded properly');
      console.log('💡 Try refreshing browser to load Phase 3 scripts');
    } else if (progress < 80) {
      console.log('\n⚠️ PARTIAL SUCCESS: Need to run consolidation');
      console.log('💡 Run: window.Phase3CacheConsolidation.runCompleteConsolidation()');
    } else {
      console.log('\n🎉 SUCCESS: Phase 3 consolidation complete!');
      console.log('🚀 Ready for Phase 4');
    }
    
    return { hasPhase3Script, hasSimpleCache, hasOldCacheLogs, progress };
  }

  function testIfLoaded() {
    console.log('\n🔍 TESTING IF PHASE 3 SCRIPTS LOADED');
    console.log('====================================');
    
    const scripts = [
      { name: 'Phase3CacheConsolidation', exists: !!window.Phase3CacheConsolidation },
      { name: 'simpleCache', exists: !!window.simpleCache },
      { name: 'simpleMobileManager', exists: !!window.simpleMobileManager }
    ];
    
    scripts.forEach(script => {
      console.log(`${script.exists ? '✅' : '❌'} ${script.name}: ${script.exists ? 'LOADED' : 'MISSING'}`);
    });
    
    const allLoaded = scripts.every(s => s.exists);
    console.log(`\n📊 Overall: ${allLoaded ? '✅ ALL LOADED' : '❌ SOME MISSING'}`);
    
    return { scripts, allLoaded };
  }

  function analyzeCurrentCaches() {
    console.log('\n📊 CURRENT CACHE ANALYSIS');
    console.log('=========================');
    
    // Check localStorage for cache data
    const cacheKeys = Object.keys(localStorage).filter(key => 
      key.includes('cache') || key.includes('Cache') || key.includes('space') || key.includes('user')
    );
    
    console.log(`💾 Cache keys in localStorage: ${cacheKeys.length}`);
    if (cacheKeys.length > 0) {
      console.log('Keys:', cacheKeys.slice(0, 5)); // Show first 5
      if (cacheKeys.length > 5) console.log(`... and ${cacheKeys.length - 5} more`);
    }
    
    // Check for window cache objects
    const windowCaches = [
      'advancedCache',
      'persistentCache', 
      'globalCacheCoordinator',
      'cacheService',
      'simpleCache'
    ].filter(cache => window[cache]);
    
    console.log(`🪟 Cache objects on window: ${windowCaches.length}`);
    windowCaches.forEach(cache => {
      console.log(`• ${cache}: ${typeof window[cache]}`);
    });
    
    return { cacheKeys: cacheKeys.length, windowCaches };
  }

  function runBasicTest() {
    console.log('\n🧪 RUNNING BASIC CACHE TEST');
    console.log('===========================');
    
    if (!window.simpleCache) {
      console.error('❌ simpleCache not available - cannot test');
      return false;
    }
    
    try {
      // Test basic functionality
      window.simpleCache.set('test:basic', { message: 'Phase 3 test' });
      const result = window.simpleCache.get('test:basic');
      
      if (result && result.message === 'Phase 3 test') {
        console.log('✅ Basic cache test: PASSED');
        window.simpleCache.invalidate('test:basic'); // Cleanup
        return true;
      } else {
        console.error('❌ Basic cache test: FAILED');
        return false;
      }
    } catch (error) {
      console.error('❌ Cache test error:', error);
      return false;
    }
  }

  function runAllTests() {
    console.log('\n🚀 RUNNING ALL SIMPLE PHASE 3 TESTS');
    console.log('====================================');
    
    const results = {
      status: quickStatus(),
      loading: testIfLoaded(),
      analysis: analyzeCurrentCaches(),
      basicTest: runBasicTest()
    };
    
    const success = results.loading.allLoaded && results.basicTest;
    
    console.log('\n🎯 SUMMARY');
    console.log('==========');
    console.log(`Scripts loaded: ${results.loading.allLoaded ? '✅' : '❌'}`);
    console.log(`Cache test: ${results.basicTest ? '✅' : '❌'}`);
    console.log(`Overall: ${success ? '✅ SUCCESS' : '❌ NEEDS WORK'}`);
    
    if (success) {
      console.log('\n🎉 Phase 3 systems are working!');
      console.log('💡 Next: Check console for old cache activity');
      console.log('💡 Look for: [CacheService:] or [IndexedDBBridgeV2] logs');
    } else {
      console.log('\n⚠️ Phase 3 needs attention');
      console.log('💡 Try: Refresh browser and check script loading');
    }
    
    return results;
  }

  return {
    quickStatus,
    testIfLoaded,
    analyzeCurrentCaches,
    runBasicTest,
    runAllTests
  };
})();

console.log('\n🧪 SIMPLE PHASE 3 TEST LOADED');
console.log('===============================');
console.log('📋 Available commands:');
console.log('• window.simplePhase3Test.runAllTests() - Run all tests');
console.log('• window.simplePhase3Test.quickStatus() - Quick status');
console.log('• window.simplePhase3Test.analyzeCurrentCaches() - Analyze caches');
console.log('\n🚀 START HERE: window.simplePhase3Test.runAllTests()'); 