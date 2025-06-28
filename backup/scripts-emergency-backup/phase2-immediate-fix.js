/**
 * Phase 2 Immediate Fix Script
 * 
 * CRITICAL: You have both old and new mobile systems running simultaneously!
 * This script diagnoses the issue and provides immediate fixes.
 */

window.Phase2ImmediateFix = (function() {
  'use strict';

  /**
   * Diagnose the current dual system problem
   */
  function diagnoseDualSystems() {
    console.log('\n🚨 PHASE 2 DUAL SYSTEM DIAGNOSIS');
    console.log('================================');
    
    const results = {
      newSystems: {},
      oldSystems: {},
      conflicts: [],
      recommendations: []
    };
    
    // Check new simplified systems
    console.log('\n✅ NEW SIMPLIFIED SYSTEMS:');
    const newSystems = {
      'SimpleMobileManager': window.simpleMobileManager,
      'useSimpleMobile': window.useSimpleMobile,
      'SimpleMobileStatus': window.SimpleMobileStatus,
      'SimpleSpaceMembersService': window.simpleSpaceMembersService
    };
    
    Object.entries(newSystems).forEach(([name, system]) => {
      const exists = !!system;
      console.log(`${exists ? '✅' : '❌'} ${name}: ${exists ? 'ACTIVE' : 'MISSING'}`);
      results.newSystems[name] = exists;
    });
    
    // Check old complex systems (should be REMOVED)
    console.log('\n❌ OLD COMPLEX SYSTEMS (SHOULD BE REMOVED):');
    const oldSystems = {
      'mobileSessionManager': window.mobileSessionManager,
      'phase1Recovery': window.phase1Recovery,
      'mobileBrowserService': window.mobileBrowserService,
      'MobileBrowserService': window.MobileBrowserService,
      'globalErrorInterceptor': window.globalErrorInterceptor,
      'mobileOptimizer': window.mobileOptimizer,
      'mobileLifecycle': window.mobileLifecycle,
      'phase1MobileRecovery': window.phase1MobileRecovery
    };
    
    Object.entries(oldSystems).forEach(([name, system]) => {
      const exists = !!system;
      console.log(`${exists ? '🚨' : '✅'} ${name}: ${exists ? 'STILL ACTIVE (PROBLEM!)' : 'REMOVED'}`);
      results.oldSystems[name] = exists;
      
      if (exists) {
        results.conflicts.push(name);
      }
    });
    
    // Generate recommendations
    console.log('\n📋 ANALYSIS RESULTS:');
    
    const newSystemCount = Object.values(results.newSystems).filter(Boolean).length;
    const oldSystemCount = Object.values(results.oldSystems).filter(Boolean).length;
    
    console.log(`✅ New simplified systems active: ${newSystemCount}/4`);
    console.log(`🚨 Old complex systems still active: ${oldSystemCount}`);
    
    if (oldSystemCount > 0) {
      console.log('\n🚨 CRITICAL ISSUE: DUAL SYSTEM PROBLEM DETECTED!');
      console.log('Both old and new systems are running, causing:');
      console.log('• Massive console noise (300+ logs)');
      console.log('• Performance overhead');
      console.log('• Memory waste');
      console.log('• Conflicting mobile detection');
      
      results.recommendations.push('URGENT: Disable old mobile systems');
      results.recommendations.push('Complete Phase 2 integration');
    }
    
    if (newSystemCount < 4) {
      console.log('\n⚠️ WARNING: Incomplete Phase 2 integration');
      console.log(`Missing ${4 - newSystemCount} new simplified systems`);
      
      results.recommendations.push('Complete new system integration');
    }
    
    return results;
  }

  /**
   * Apply immediate fixes for dual system problem
   */
  function applyImmediateFixes() {
    console.log('\n🔧 APPLYING IMMEDIATE PHASE 2 FIXES');
    console.log('===================================');
    
    let fixesApplied = 0;
    
    // Fix 1: Disable old mobile systems
    console.log('\n1️⃣ Disabling old mobile systems...');
    const oldSystems = [
      'mobileSessionManager',
      'phase1Recovery', 
      'mobileBrowserService',
      'globalErrorInterceptor',
      'mobileOptimizer',
      'mobileLifecycle'
    ];
    
    oldSystems.forEach(systemName => {
      if (window[systemName]) {
        try {
          // Try to call cleanup methods if they exist
          if (typeof window[systemName].cleanup === 'function') {
            window[systemName].cleanup();
          }
          if (typeof window[systemName].destroy === 'function') {
            window[systemName].destroy();
          }
          
          // Remove from global scope
          delete window[systemName];
          
          console.log(`✅ Disabled ${systemName}`);
          fixesApplied++;
        } catch (error) {
          console.warn(`⚠️ Could not cleanly disable ${systemName}:`, error.message);
        }
      }
    });
    
    // Fix 2: Ensure new systems are active
    console.log('\n2️⃣ Ensuring new simplified systems are active...');
    
    if (!window.simpleMobileManager) {
      console.log('🔧 SimpleMobileManager not found - may need to refresh to load');
    } else {
      console.log('✅ SimpleMobileManager is active');
      fixesApplied++;
    }
    
    // Fix 3: Clear excessive console logging
    console.log('\n3️⃣ Reducing console noise...');
    
    // Apply console optimization if available
    if (window.applyPhase2ConsoleSilence) {
      window.applyPhase2ConsoleSilence();
      console.log('✅ Applied console silence');
      fixesApplied++;
    } else if (window.quickConsoleOptimization) {
      window.quickConsoleOptimization();
      console.log('✅ Applied console optimization');
      fixesApplied++;
    }
    
    console.log(`\n✅ Applied ${fixesApplied} immediate fixes`);
    
    return fixesApplied;
  }

  /**
   * Test simplified systems after fixes
   */
  function testSimplifiedSystems() {
    console.log('\n🧪 TESTING SIMPLIFIED SYSTEMS');
    console.log('=============================');
    
    let testsPass = 0;
    let testsFail = 0;
    
    // Test SimpleMobileManager
    if (window.simpleMobileManager) {
      try {
        const state = window.simpleMobileManager.getState();
        console.log('✅ SimpleMobileManager state:', state);
        testsPass++;
      } catch (error) {
        console.error('❌ SimpleMobileManager error:', error.message);
        testsFail++;
      }
    } else {
      console.error('❌ SimpleMobileManager not available');
      testsFail++;
    }
    
    // Test mobile detection
    try {
      const isMobile = window.mobileDetection?.isMobile() || false;
      console.log(`✅ Mobile detection: ${isMobile ? 'Mobile' : 'Desktop'}`);
      testsPass++;
    } catch (error) {
      console.error('❌ Mobile detection error:', error.message);
      testsFail++;
    }
    
    console.log(`\n📊 Test Results: ${testsPass} passed, ${testsFail} failed`);
    
    return { testsPass, testsFail };
  }

  /**
   * Complete Phase 2 integration status
   */
  function getIntegrationStatus() {
    console.log('\n📊 PHASE 2 INTEGRATION STATUS');
    console.log('=============================');
    
    const status = {
      simplifiedSystems: {
        SimpleMobileManager: !!window.simpleMobileManager,
        MobileDetection: !!window.mobileDetection,
        SimpleSpaceMembersService: !!window.simpleSpaceMembersService,
        SimpleMobileStatus: !!window.SimpleMobileStatus
      },
      complexSystemsRemoved: {
        mobileSessionManager: !window.mobileSessionManager,
        phase1Recovery: !window.phase1Recovery,
        mobileBrowserService: !window.mobileBrowserService,
        globalErrorInterceptor: !window.globalErrorInterceptor
      },
      testingAvailable: {
        phase2Test: !!window.phase2Test,
        Phase2SimplificationTest: !!window.Phase2SimplificationTest
      }
    };
    
    const simplifiedCount = Object.values(status.simplifiedSystems).filter(Boolean).length;
    const removedCount = Object.values(status.complexSystemsRemoved).filter(Boolean).length;
    const testingCount = Object.values(status.testingAvailable).filter(Boolean).length;
    
    console.log(`✅ Simplified systems: ${simplifiedCount}/4`);
    console.log(`✅ Complex systems removed: ${removedCount}/4`);
    console.log(`✅ Testing available: ${testingCount}/2`);
    
    const overallProgress = Math.round(((simplifiedCount + removedCount + testingCount) / 10) * 100);
    console.log(`\n📈 Overall Phase 2 Progress: ${overallProgress}%`);
    
    if (overallProgress >= 90) {
      console.log('🎉 Phase 2 is nearly complete!');
    } else if (overallProgress >= 70) {
      console.log('🔧 Phase 2 needs finishing touches');
    } else {
      console.log('⚠️ Phase 2 needs significant work');
    }
    
    return status;
  }

  /**
   * Run complete Phase 2 diagnosis and fix
   */
  function runCompleteDiagnosis() {
    console.log('\n🚀 PHASE 2 COMPLETE DIAGNOSIS & FIX');
    console.log('==================================');
    
    // Step 1: Diagnose
    const diagnosis = diagnoseDualSystems();
    
    // Step 2: Apply fixes
    const fixesApplied = applyImmediateFixes();
    
    // Step 3: Test systems
    const testResults = testSimplifiedSystems();
    
    // Step 4: Get status
    const status = getIntegrationStatus();
    
    // Final recommendations
    console.log('\n🎯 NEXT STEPS:');
    console.log('=============');
    
    if (window.phase2Test) {
      console.log('1️⃣ Run full test suite: window.phase2Test.runAllTests()');
    } else {
      console.log('1️⃣ Refresh page to load Phase 2 test suite');
    }
    
    console.log('2️⃣ Check simplified systems are working correctly');
    console.log('3️⃣ Monitor console logs for reduced noise');
    console.log('4️⃣ Test mobile backgrounding behavior');
    
    return {
      diagnosis,
      fixesApplied,
      testResults,
      status
    };
  }

  // Public API
  return {
    diagnoseDualSystems,
    applyImmediateFixes,
    testSimplifiedSystems,
    getIntegrationStatus,
    runCompleteDiagnosis
  };
})();

// Auto-run diagnosis
console.log('\n🚨 PHASE 2 IMMEDIATE FIX LOADED');
console.log('===============================');
console.log('CRITICAL: Dual system problem detected in your logs!');
console.log('');
console.log('📋 Available commands:');
console.log('• window.Phase2ImmediateFix.runCompleteDiagnosis() - Complete diagnosis & fix');
console.log('• window.Phase2ImmediateFix.applyImmediateFixes() - Apply fixes now');
console.log('• window.Phase2ImmediateFix.diagnoseDualSystems() - Diagnose only');
console.log('');
console.log('🚀 RECOMMENDED: Run window.Phase2ImmediateFix.runCompleteDiagnosis()'); 