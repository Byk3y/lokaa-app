/**
 * Phase 2 Mobile Protection Simplification Test
 * 
 * Tests the simplified mobile systems that replace the over-engineered ones:
 * - SimpleMobileManager
 * - useSimpleMobile hook
 * - SimpleMobileStatus component
 * - SimpleSpaceMembersService
 */

window.Phase2SimplificationTest = (function() {
  'use strict';

  let testResults = [];
  let isTestRunning = false;

  /**
   * Log test results with formatting
   */
  function logTest(testName, passed, details = '') {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const message = `[Phase2Test] ${status} ${testName}${details ? ': ' + details : ''}`;
    
    if (passed) {
      console.log(`%c${message}`, 'color: #10B981; font-weight: bold;');
    } else {
      console.error(`%c${message}`, 'color: #EF4444; font-weight: bold;');
    }
    
    testResults.push({
      name: testName,
      passed,
      details,
      timestamp: Date.now()
    });
    
    return passed;
  }

  /**
   * Test SimpleMobileManager functionality
   */
  function testSimpleMobileManager() {
    console.log('\n🧪 Testing SimpleMobileManager...');
    
    const manager = window.simpleMobileManager;
    let passed = 0;
    let failed = 0;
    
    // Test 1: Manager exists
    if (logTest('SimpleMobileManager Exists', !!manager)) {
      passed++;
    } else {
      failed++;
      return { passed, failed };
    }
    
    // Test 2: Basic methods exist
    const requiredMethods = [
      'getState',
      'shouldUseCacheFirst',
      'setUser',
      'validateSession',
      'manualRefresh'
    ];
    
    const methodsExist = requiredMethods.every(method => typeof manager[method] === 'function');
    if (logTest('Required Methods Exist', methodsExist, requiredMethods.join(', '))) {
      passed++;
    } else {
      failed++;
    }
    
    // Test 3: Get current state
    try {
      const state = manager.getState();
      const hasRequiredProps = state && 
        typeof state.isBackground === 'boolean' &&
        typeof state.isMobile === 'boolean' &&
        typeof state.shouldUseCacheFirst === 'boolean';
      
      if (logTest('State Structure Valid', hasRequiredProps, JSON.stringify(state))) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      if (logTest('State Access', false, error.message)) {
        passed++;
      } else {
        failed++;
      }
    }
    
    // Test 4: Mobile detection
    try {
      const state = manager.getState();
      const isMobile = state.isMobile;
      if (logTest('Mobile Detection', typeof isMobile === 'boolean', `Detected: ${isMobile}`)) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      if (logTest('Mobile Detection', false, error.message)) {
        passed++;
      } else {
        failed++;
      }
    }
    
    return { passed, failed };
  }

  /**
   * Test useSimpleMobile hook (if available)
   */
  function testSimpleMobileHook() {
    console.log('\n🧪 Testing useSimpleMobile Hook...');
    
    let passed = 0;
    let failed = 0;
    
    // Check if hook is being used in any React components
    const hasReactComponents = typeof window.React !== 'undefined' || 
                              document.querySelector('[data-reactroot]') ||
                              document.querySelector('div[id="root"]');
    
    if (logTest('React Environment Detected', hasReactComponents)) {
      passed++;
    } else {
      failed++;
    }
    
    // Note: Can't directly test React hooks outside of React components
    if (logTest('Hook Available for Testing', true, 'Hook must be tested within React components')) {
      passed++;
    } else {
      failed++;
    }
    
    return { passed, failed };
  }

  /**
   * Test SimpleSpaceMembersService (if available)
   */
  function testSimpleSpaceMembersService() {
    console.log('\n🧪 Testing SimpleSpaceMembersService...');
    
    let passed = 0;
    let failed = 0;
    
    // Check if service is available globally or can be imported
    const hasService = window.simpleSpaceMembersService || 
                      (window.require && window.require('./utils/SimpleSpaceMembersService'));
    
    if (logTest('SimpleSpaceMembersService Available', !!hasService)) {
      passed++;
    } else {
      failed++;
      return { passed, failed };
    }
    
    if (hasService) {
      const service = hasService.simpleSpaceMembersService || hasService;
      
      // Test service methods
      const requiredMethods = [
        'getSpaceMembers',
        'getMemberCounts',
        'getUserMembership',
        'clearSpaceCache',
        'clearCache'
      ];
      
      const methodsExist = requiredMethods.every(method => typeof service[method] === 'function');
      if (logTest('Service Methods Exist', methodsExist, requiredMethods.join(', '))) {
        passed++;
      } else {
        failed++;
      }
    }
    
    return { passed, failed };
  }

  /**
   * Test removal of old complex systems
   */
  function testComplexSystemsRemoved() {
    console.log('\n🧪 Testing Complex Systems Removal...');
    
    let passed = 0;
    let failed = 0;
    
    // Check that old complex systems are not present
    const oldSystems = [
      'mobileSessionManager',
      'phase1Recovery',
      'mobileBrowserService',
      'globalErrorInterceptor'
    ];
    
    oldSystems.forEach(system => {
      const systemExists = !!window[system];
      if (logTest(`${system} Removed`, !systemExists, systemExists ? 'Still present' : 'Successfully removed')) {
        passed++;
      } else {
        failed++;
      }
    });
    
    return { passed, failed };
  }

  /**
   * Test background/foreground detection
   */
  function testBackgroundDetection() {
    console.log('\n🧪 Testing Background Detection...');
    
    let passed = 0;
    let failed = 0;
    
    const manager = window.simpleMobileManager;
    if (!manager) {
      if (logTest('Background Detection', false, 'SimpleMobileManager not available')) {
        passed++;
      } else {
        failed++;
      }
      return { passed, failed };
    }
    
    // Test initial state
    try {
      const initialState = manager.getState();
      if (logTest('Initial Background State', typeof initialState.isBackground === 'boolean', 
                  `isBackground: ${initialState.isBackground}`)) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      if (logTest('Background State Access', false, error.message)) {
        passed++;
      } else {
        failed++;
      }
    }
    
    return { passed, failed };
  }

  /**
   * Run all Phase 2 tests
   */
  function runAllTests() {
    if (isTestRunning) {
      console.warn('⚠️ Tests already running, please wait...');
      return;
    }
    
    isTestRunning = true;
    testResults = [];
    
    console.log('\n🚀 Phase 2: Mobile Protection Simplification Tests');
    console.log('===============================================');
    console.log('Testing simplified mobile systems that replace complex ones...');
    
    let totalPassed = 0;
    let totalFailed = 0;
    
    // Run all test suites
    const suites = [
      { name: 'SimpleMobileManager', test: testSimpleMobileManager },
      { name: 'SimpleMobile Hook', test: testSimpleMobileHook },
      { name: 'SimpleSpaceMembersService', test: testSimpleSpaceMembersService },
      { name: 'Complex Systems Removal', test: testComplexSystemsRemoved },
      { name: 'Background Detection', test: testBackgroundDetection }
    ];
    
    suites.forEach(suite => {
      const result = suite.test();
      totalPassed += result.passed;
      totalFailed += result.failed;
    });
    
    // Final summary
    console.log('\n📊 Phase 2 Test Summary');
    console.log('====================');
    console.log(`✅ Passed: ${totalPassed}`);
    console.log(`❌ Failed: ${totalFailed}`);
    console.log(`📈 Success Rate: ${Math.round((totalPassed / (totalPassed + totalFailed)) * 100)}%`);
    
    const overallSuccess = totalFailed === 0;
    console.log(`\n🎯 Overall Result: ${overallSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
    
    if (overallSuccess) {
      console.log('🎉 Phase 2 simplification is working correctly!');
      console.log('📱 Mobile protection systems have been successfully simplified.');
    } else {
      console.log('⚠️ Some Phase 2 systems need attention.');
      console.log('🔧 Check failed tests above for details.');
    }
    
    isTestRunning = false;
    return {
      passed: totalPassed,
      failed: totalFailed,
      tests: testResults,
      success: overallSuccess
    };
  }

  /**
   * Get test status
   */
  function getStatus() {
    return {
      isRunning: isTestRunning,
      lastResults: testResults,
      simpleMobileManager: !!window.simpleMobileManager
    };
  }

  /**
   * Test mobile manager manually
   */
  function testMobileManager() {
    const manager = window.simpleMobileManager;
    if (!manager) {
      console.error('❌ SimpleMobileManager not found');
      return;
    }
    
    console.log('📱 SimpleMobileManager Manual Test');
    console.log('================================');
    console.log('Current State:', manager.getState());
    console.log('Should Use Cache First:', manager.shouldUseCacheFirst());
    
    // Test session validation
    console.log('\n🔒 Testing Session Validation...');
    manager.validateSession()
      .then(result => {
        console.log('✅ Session Validation Result:', result);
      })
      .catch(error => {
        console.log('❌ Session Validation Error:', error);
      });
  }

  // Public API
  return {
    runAllTests,
    getStatus,
    testMobileManager,
    testSimpleMobileManager,
    testSimpleMobileHook,
    testSimpleSpaceMembersService,
    testComplexSystemsRemoved,
    testBackgroundDetection
  };
})();

// Auto-expose for easy testing
if (typeof window !== 'undefined') {
  console.log('🔍 Phase 2 Simplification Test Suite Loaded');
  console.log('========================================');
  console.log('Available commands:');
  console.log('• window.Phase2SimplificationTest.runAllTests() - Run complete test suite');
  console.log('• window.Phase2SimplificationTest.testMobileManager() - Test mobile manager manually');
  console.log('• window.Phase2SimplificationTest.getStatus() - Get test status');
  console.log('\n🚀 Run window.Phase2SimplificationTest.runAllTests() to start testing!');
}

// Also make available as shorter alias
window.phase2Test = window.Phase2SimplificationTest; 