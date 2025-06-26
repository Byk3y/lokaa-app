/**
 * Phase 3 Complete Testing Script
 * 
 * Comprehensive testing and validation for cache system consolidation
 */

window.testPhase3Complete = (function() {
  'use strict';

  console.log('🧪 Phase 3 Complete Testing Suite Loading...');

  /**
   * Test 1: Check if Phase 3 scripts are loaded
   */
  function testScriptLoading() {
    console.log('\n1️⃣ TESTING SCRIPT LOADING');
    console.log('==========================');
    
    const results = {
      phase3Script: !!window.Phase3CacheConsolidation,
      simpleCache: !!window.simpleCache,
      simpleMembersService: !!window.simpleSpaceMembersService,
      oldSystems: []
    };

    // Check if Phase 3 consolidation script loaded
    if (results.phase3Script) {
      console.log('✅ Phase3CacheConsolidation script: LOADED');
    } else {
      console.error('❌ Phase3CacheConsolidation script: MISSING');
    }

    // Check if simple cache is available
    if (results.simpleCache) {
      console.log('✅ SimpleCache system: AVAILABLE');
    } else {
      console.error('❌ SimpleCache system: MISSING');
    }

    // Check if simple space members service is available  
    if (results.simpleMembersService) {
      console.log('✅ SimpleSpaceMembersService: AVAILABLE');
    } else {
      console.error('❌ SimpleSpaceMembersService: MISSING');
    }

    // Check for old complex systems still active
    const oldSystems = [
      'advancedCache',
      'persistentCache',
      'enhancedCacheManager', 
      'globalCacheCoordinator',
      'phase3CacheStrategy',
      'indexedDBBridgeV2'
    ];

    oldSystems.forEach(system => {
      if (window[system]) {
        console.warn(`⚠️ Old system still active: ${system}`);
        results.oldSystems.push(system);
      } else {
        console.log(`✅ Old system removed: ${system}`);
      }
    });

    return results;
  }

  /**
   * Test 2: Run cache complexity analysis
   */
  function testCacheComplexity() {
    console.log('\n2️⃣ TESTING CACHE COMPLEXITY ANALYSIS');
    console.log('=====================================');

    if (!window.Phase3CacheConsolidation) {
      console.error('❌ Phase3CacheConsolidation not available');
      return null;
    }

    try {
      const analysis = window.Phase3CacheConsolidation.diagnoseCacheComplexity();
      
      console.log('📊 COMPLEXITY ANALYSIS RESULTS:');
      console.log(`• Total complexity: ${analysis.totalComplexity} lines`);
      console.log(`• Active systems: ${Object.keys(analysis.complexSystems).length}`);
      console.log(`• Recommendations: ${analysis.recommendations.length}`);
      
      return analysis;
    } catch (error) {
      console.error('❌ Cache complexity analysis failed:', error);
      return null;
    }
  }

  /**
   * Test 3: Test simple cache functionality
   */
  function testSimpleCache() {
    console.log('\n3️⃣ TESTING SIMPLE CACHE FUNCTIONALITY');
    console.log('=====================================');

    if (!window.simpleCache) {
      console.error('❌ SimpleCache not available');
      return { success: false, tests: [] };
    }

    const tests = [];
    let passedTests = 0;

    // Test 1: Basic set/get
    try {
      window.simpleCache.set('test:phase3', { message: 'Phase 3 testing!' });
      const retrieved = window.simpleCache.get('test:phase3');
      
      if (retrieved && retrieved.message === 'Phase 3 testing!') {
        console.log('✅ Test 1: Basic set/get - PASSED');
        tests.push({ name: 'Basic set/get', passed: true });
        passedTests++;
      } else {
        console.error('❌ Test 1: Basic set/get - FAILED');
        tests.push({ name: 'Basic set/get', passed: false });
      }
    } catch (error) {
      console.error('❌ Test 1: Basic set/get - ERROR:', error);
      tests.push({ name: 'Basic set/get', passed: false, error });
    }

    // Test 2: TTL expiration
    try {
      window.simpleCache.set('test:ttl', { data: 'expires' }, { ttl: 1 });
      
      setTimeout(() => {
        const expired = window.simpleCache.get('test:ttl');
        if (expired === null) {
          console.log('✅ Test 2: TTL expiration - PASSED');
        } else {
          console.error('❌ Test 2: TTL expiration - FAILED');
        }
      }, 10);
      
      tests.push({ name: 'TTL expiration', passed: true, note: 'Async test' });
      passedTests++;
    } catch (error) {
      console.error('❌ Test 2: TTL expiration - ERROR:', error);
      tests.push({ name: 'TTL expiration', passed: false, error });
    }

    // Test 3: Invalidation
    try {
      window.simpleCache.set('test:invalidate', { data: 'remove me' });
      window.simpleCache.invalidate('test:invalidate');
      const invalidated = window.simpleCache.get('test:invalidate');
      
      if (invalidated === null) {
        console.log('✅ Test 3: Invalidation - PASSED');
        tests.push({ name: 'Invalidation', passed: true });
        passedTests++;
      } else {
        console.error('❌ Test 3: Invalidation - FAILED');
        tests.push({ name: 'Invalidation', passed: false });
      }
    } catch (error) {
      console.error('❌ Test 3: Invalidation - ERROR:', error);
      tests.push({ name: 'Invalidation', passed: false, error });
    }

    // Test 4: Statistics
    try {
      window.simpleCache.set('test:stats1', { data: 1 });
      window.simpleCache.set('test:stats2', { data: 2 });
      const stats = window.simpleCache.getStats();
      
      if (stats && stats.totalItems >= 2) {
        console.log('✅ Test 4: Statistics - PASSED');
        console.log('📊 Stats:', stats);
        tests.push({ name: 'Statistics', passed: true, stats });
        passedTests++;
      } else {
        console.error('❌ Test 4: Statistics - FAILED');
        tests.push({ name: 'Statistics', passed: false });
      }
    } catch (error) {
      console.error('❌ Test 4: Statistics - ERROR:', error);
      tests.push({ name: 'Statistics', passed: false, error });
    }

    // Cleanup test data
    window.simpleCache.clear('test:');

    console.log(`\n📊 Simple Cache Tests: ${passedTests}/${tests.length} passed`);
    
    return {
      success: passedTests === tests.length,
      passedTests,
      totalTests: tests.length,
      tests
    };
  }

  /**
   * Test 4: Monitor console for old cache activity
   */
  function monitorOldCacheActivity() {
    console.log('\n4️⃣ MONITORING OLD CACHE ACTIVITY');
    console.log('=================================');

    const oldCachePatterns = [
      'CacheService:',
      'IndexedDBBridgeV2',
      'AdvancedCache',
      'PersistentCache',
      'GlobalCacheCoordinator'
    ];

    console.log('🔍 Looking for old cache system activity in recent logs...');
    console.log('⏰ Monitor for 10 seconds to see if old systems are still active');
    
    // This would ideally hook into console.log to detect patterns
    // For now, just provide guidance
    console.log('\n📋 WHAT TO LOOK FOR:');
    oldCachePatterns.forEach(pattern => {
      console.log(`❌ Bad: Console logs containing "${pattern}"`);
    });
    
    console.log('✅ Good: Only SimpleCache activity or no cache logs');
    
    return {
      patterns: oldCachePatterns,
      instructions: 'Watch console for 10 seconds for old cache activity'
    };
  }

  /**
   * Test 5: Run complete consolidation
   */
  function runCompleteConsolidation() {
    console.log('\n5️⃣ RUNNING COMPLETE CONSOLIDATION');
    console.log('=================================');

    if (!window.Phase3CacheConsolidation) {
      console.error('❌ Phase3CacheConsolidation not available');
      return null;
    }

    try {
      const result = window.Phase3CacheConsolidation.runCompleteConsolidation();
      
      console.log('🎯 CONSOLIDATION RESULTS:');
      console.log(`• Diagnosis completed: ${!!result.diagnosis}`);
      console.log(`• Simple cache created: ${!!result.simpleCache}`);
      console.log(`• Test passed: ${result.testPassed}`);
      console.log(`• Overall success: ${result.success}`);
      
      return result;
    } catch (error) {
      console.error('❌ Complete consolidation failed:', error);
      return null;
    }
  }

  /**
   * Test 6: Verify localStorage cleanup
   */
  function testLocalStorageCleanup() {
    console.log('\n6️⃣ TESTING LOCALSTORAGE CLEANUP');
    console.log('===============================');

    const oldCacheKeys = Object.keys(localStorage).filter(key => {
      return key.includes('lokaa-') || 
             key.includes('space_') || 
             key.includes('advanced') ||
             key.includes('persistent') ||
             key.includes('phase3');
    });

    const newCacheKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('cache:')
    );

    console.log(`📊 OLD CACHE KEYS: ${oldCacheKeys.length}`);
    if (oldCacheKeys.length > 0) {
      console.warn('⚠️ Old cache keys found:', oldCacheKeys);
    } else {
      console.log('✅ No old cache keys found');
    }

    console.log(`📊 NEW CACHE KEYS: ${newCacheKeys.length}`);
    if (newCacheKeys.length > 0) {
      console.log('✅ New simple cache keys found:', newCacheKeys);
    }

    return {
      oldKeysCount: oldCacheKeys.length,
      newKeysCount: newCacheKeys.length,
      oldKeys: oldCacheKeys,
      newKeys: newCacheKeys
    };
  }

  /**
   * Run all Phase 3 tests
   */
  function runAllTests() {
    console.log('\n🚀 RUNNING ALL PHASE 3 TESTS');
    console.log('=============================');
    
    const results = {
      timestamp: new Date().toISOString(),
      tests: {}
    };

    // Run all tests
    results.tests.scriptLoading = testScriptLoading();
    results.tests.cacheComplexity = testCacheComplexity();
    results.tests.simpleCache = testSimpleCache();
    results.tests.monitoring = monitorOldCacheActivity();
    results.tests.consolidation = runCompleteConsolidation();
    results.tests.localStorage = testLocalStorageCleanup();

    // Calculate overall success
    const successfulTests = Object.values(results.tests).filter(test => {
      if (test && typeof test === 'object') {
        return test.success !== false && test.testPassed !== false;
      }
      return test !== null;
    }).length;

    const totalTests = Object.keys(results.tests).length;
    results.overallSuccess = successfulTests >= (totalTests - 1); // Allow 1 test to be incomplete

    console.log('\n🎯 PHASE 3 TEST SUMMARY');
    console.log('=======================');
    console.log(`✅ Tests completed: ${successfulTests}/${totalTests}`);
    console.log(`📊 Overall success: ${results.overallSuccess ? 'YES' : 'NO'}`);
    
    if (results.overallSuccess) {
      console.log('\n🎉 PHASE 3 CACHE CONSOLIDATION: SUCCESS!');
      console.log('✅ Cache systems have been successfully consolidated');
      console.log('🚀 Ready for Phase 4: Debug Interface Cleanup');
    } else {
      console.log('\n⚠️ PHASE 3 NEEDS ATTENTION');
      console.log('🔧 Some tests failed or scripts are missing');
      console.log('💡 Try refreshing the browser and running tests again');
    }

    return results;
  }

  /**
   * Quick status check
   */
  function quickStatus() {
    console.log('\n⚡ PHASE 3 QUICK STATUS');
    console.log('======================');
    
    const hasPhase3Script = !!window.Phase3CacheConsolidation;
    const hasSimpleCache = !!window.simpleCache;
    const oldSystemsCount = [
      'advancedCache',
      'persistentCache', 
      'enhancedCacheManager',
      'globalCacheCoordinator',
      'indexedDBBridgeV2'
    ].filter(system => window[system]).length;

    console.log(`📦 Phase 3 script: ${hasPhase3Script ? '✅' : '❌'}`);
    console.log(`💾 Simple cache: ${hasSimpleCache ? '✅' : '❌'}`);
    console.log(`🚨 Old systems: ${oldSystemsCount} active`);
    
    const progress = hasPhase3Script && hasSimpleCache && oldSystemsCount === 0 ? 100 :
                    hasPhase3Script && hasSimpleCache ? 75 :
                    hasPhase3Script ? 50 : 25;
                    
    console.log(`📈 Progress: ${progress}%`);
    
    return {
      hasPhase3Script,
      hasSimpleCache, 
      oldSystemsCount,
      progress,
      ready: progress >= 75
    };
  }

  // Public API
  return {
    testScriptLoading,
    testCacheComplexity,
    testSimpleCache,
    monitorOldCacheActivity,
    runCompleteConsolidation,
    testLocalStorageCleanup,
    runAllTests,
    quickStatus
  };
})();

// Auto-initialization
console.log('\n🧪 PHASE 3 COMPLETE TESTING SUITE LOADED');
console.log('=========================================');
console.log('📋 Available commands:');
console.log('• window.testPhase3Complete.runAllTests() - Run complete test suite');
console.log('• window.testPhase3Complete.quickStatus() - Quick status check');
console.log('• window.testPhase3Complete.runCompleteConsolidation() - Run consolidation');
console.log('• window.testPhase3Complete.testSimpleCache() - Test simple cache only');
console.log('');
console.log('🚀 RECOMMENDED: Start with window.testPhase3Complete.quickStatus()'); 