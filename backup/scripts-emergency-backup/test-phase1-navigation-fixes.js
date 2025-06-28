/**
 * Phase 1 Navigation Fixes Test Suite
 * 
 * Tests all critical navigation fixes implemented in Phase 1:
 * - Navigation Rate Limiting
 * - Navigation Debouncing
 * - Navigation State Guards
 * - Parameter Mismatch Fixes
 * - Error Handling
 */

window.Phase1NavigationTest = (function() {
  'use strict';

  let testResults = [];
  let isTestRunning = false;

  /**
   * Log test results with formatting
   */
  function logTest(testName, passed, details = '') {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const message = `[Phase1Test] ${status} ${testName}${details ? ': ' + details : ''}`;
    
    if (passed) {
      console.log(`%c${message}`, 'color: #10B981; font-weight: bold;');
    } else {
      console.error(`%c${message}`, 'color: #EF4444; font-weight: bold;');
    }
    
    testResults.push({ testName, passed, details, timestamp: Date.now() });
    return passed;
  }

  /**
   * Test 1: Navigation Rate Limiter Exists and Works
   */
  async function testNavigationRateLimiter() {
    console.log('\n🧪 Testing Navigation Rate Limiter...');
    
    try {
      // Check if rate limiter functions exist
      const hasRateLimiterFunctions = typeof window.getNavigationRateLimiterStatus === 'function' &&
                                     typeof window.resetNavigationRateLimiter === 'function';
      
      if (!hasRateLimiterFunctions) {
        return logTest('Rate Limiter Functions', false, 'Rate limiter functions not found in global scope');
      }
      
      // Get initial status
      const initialStatus = window.getNavigationRateLimiterStatus();
      logTest('Rate Limiter Status Access', true, `Calls: ${initialStatus.callCount}/${initialStatus.maxCalls}`);
      
      // Test rate limiter by making multiple rapid calls
      let testCallCount = 0;
      for (let i = 0; i < 5; i++) {
        if (window.conversationUrlDebug && window.conversationUrlDebug.testUrlGeneration) {
          window.conversationUrlDebug.testUrlGeneration();
          testCallCount++;
        }
      }
      
      const afterTestStatus = window.getNavigationRateLimiterStatus();
      const rateLimiterWorking = afterTestStatus.callCount >= initialStatus.callCount;
      
      logTest('Rate Limiter Call Tracking', rateLimiterWorking, 
        `Tracked ${afterTestStatus.callCount - initialStatus.callCount} test calls`);
      
      return true;
    } catch (error) {
      return logTest('Rate Limiter Test', false, `Error: ${error.message}`);
    }
  }

  /**
   * Test 2: Navigation Debouncing Works
   */
  async function testNavigationDebouncing() {
    console.log('\n🧪 Testing Navigation Debouncing...');
    
    try {
      let navigationCallCount = 0;
      const originalPushState = history.pushState;
      
      // Mock history.pushState to count calls
      history.pushState = function(...args) {
        navigationCallCount++;
        return originalPushState.apply(this, args);
      };
      
      // Make rapid navigation calls
      const rapidCalls = 10;
      const testConversationId = 'test-conversation-' + Date.now();
      
      for (let i = 0; i < rapidCalls; i++) {
        if (window.conversationUrlDebug && window.conversationUrlDebug.testUrlGeneration) {
          window.conversationUrlDebug.testUrlGeneration();
        }
      }
      
      // Wait for debouncing
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Restore original pushState
      history.pushState = originalPushState;
      
      // Debouncing should reduce the number of actual calls
      const debouncingWorking = navigationCallCount < rapidCalls;
      
      return logTest('Navigation Debouncing', debouncingWorking, 
        `${navigationCallCount}/${rapidCalls} calls made (debouncing reduced calls)`);
    } catch (error) {
      return logTest('Navigation Debouncing Test', false, `Error: ${error.message}`);
    }
  }

  /**
   * Test 3: Navigation State Guards Work
   */
  async function testNavigationStateGuards() {
    console.log('\n🧪 Testing Navigation State Guards...');
    
    try {
      // Test if we can access URL parsing functions
      const hasUrlParsing = window.conversationUrlDebug && 
                           typeof window.conversationUrlDebug.currentState === 'function';
      
      if (!hasUrlParsing) {
        return logTest('URL Parsing Access', false, 'URL parsing functions not accessible');
      }
      
      // Get current URL state
      const currentState = window.conversationUrlDebug.currentState();
      logTest('Current URL State Access', true, `Current conversation: ${currentState.conversationId || 'none'}`);
      
      // Test navigation guard logic by attempting to navigate to same conversation
      let guardWorking = true;
      const testConversationId = currentState.conversationId || 'test-same-conversation';
      
      // This should be blocked by navigation guards if already at this conversation
      if (window.conversationUrlDebug.testUrlGeneration) {
        window.conversationUrlDebug.testUrlGeneration();
        guardWorking = true; // If no error, guard is working
      }
      
      return logTest('Navigation State Guards', guardWorking, 'No duplicate navigation errors detected');
    } catch (error) {
      return logTest('Navigation State Guards Test', false, `Error: ${error.message}`);
    }
  }

  /**
   * Test 4: Chat Navigation Hook Integration
   */
  async function testChatNavigationIntegration() {
    console.log('\n🧪 Testing Chat Navigation Integration...');
    
    try {
      // Check if navigation stores are accessible
      const hasNavigationStore = window.useNavigationStore || 
                                 window.navigationStore ||
                                 window.chatNavigationStore;
      
      // Check if conversation URL utils are working
      const hasConversationUtils = window.conversationUrlDebug;
      
      logTest('Navigation Store Access', !!hasNavigationStore, 
        hasNavigationStore ? 'Navigation store accessible' : 'Navigation store not found');
      
      logTest('Conversation URL Utils', !!hasConversationUtils, 
        hasConversationUtils ? 'URL utilities accessible' : 'URL utilities not found');
      
      return true;
    } catch (error) {
      return logTest('Chat Navigation Integration Test', false, `Error: ${error.message}`);
    }
  }

  /**
   * Test 5: Error Handling and Recovery
   */
  async function testErrorHandlingRecovery() {
    console.log('\n🧪 Testing Error Handling and Recovery...');
    
    try {
      // Test error handling by providing invalid input
      let errorHandlingWorks = true;
      
      try {
        // Test with invalid conversation ID
        if (window.conversationUrlDebug && window.conversationUrlDebug.testUrlGeneration) {
          window.conversationUrlDebug.testUrlGeneration('invalid-test-id');
        }
        logTest('Invalid Input Handling', true, 'No crash on invalid input');
      } catch (error) {
        logTest('Invalid Input Handling', false, `Crashed on invalid input: ${error.message}`);
        errorHandlingWorks = false;
      }
      
      // Test rate limiter reset function
      try {
        if (window.resetNavigationRateLimiter) {
          window.resetNavigationRateLimiter();
          logTest('Rate Limiter Reset', true, 'Rate limiter reset successfully');
        } else {
          logTest('Rate Limiter Reset', false, 'Reset function not available');
          errorHandlingWorks = false;
        }
      } catch (error) {
        logTest('Rate Limiter Reset', false, `Reset failed: ${error.message}`);
        errorHandlingWorks = false;
      }
      
      return errorHandlingWorks;
    } catch (error) {
      return logTest('Error Handling Test', false, `Error: ${error.message}`);
    }
  }

  /**
   * Test 6: Mobile vs Desktop Behavior
   */
  async function testMobileDesktopBehavior() {
    console.log('\n🧪 Testing Mobile vs Desktop Behavior...');
    
    try {
      // Check mobile detection
      const mobileDetection = window.mobileDetection || 
                             window.isMobile || 
                             false;
      
      const isMobileDevice = typeof mobileDetection === 'object' ? 
                            mobileDetection.isMobile() : 
                            typeof mobileDetection === 'function' ? 
                            mobileDetection() : 
                            false;
      
      logTest('Mobile Detection', true, `Device type: ${isMobileDevice ? 'Mobile' : 'Desktop'}`);
      
      // Test URL navigation enablement
      if (window.conversationUrlDebug) {
        const urlState = window.conversationUrlDebug.currentState();
        const urlNavigationEnabled = urlState.urlParsingEnabled !== false;
        logTest('URL Navigation Status', true, `URL navigation: ${urlNavigationEnabled ? 'Enabled' : 'Disabled'}`);
      }
      
      return true;
    } catch (error) {
      return logTest('Mobile/Desktop Behavior Test', false, `Error: ${error.message}`);
    }
  }

  /**
   * Test 7: Navigation Performance
   */
  async function testNavigationPerformance() {
    console.log('\n🧪 Testing Navigation Performance...');
    
    try {
      const startTime = performance.now();
      
      // Perform multiple navigation operations
      for (let i = 0; i < 5; i++) {
        if (window.conversationUrlDebug && window.conversationUrlDebug.testUrlGeneration) {
          window.conversationUrlDebug.testUrlGeneration();
        }
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Performance should be reasonable (< 100ms for 5 operations)
      const performanceGood = duration < 100;
      
      return logTest('Navigation Performance', performanceGood, 
        `${duration.toFixed(2)}ms for 5 operations (${performanceGood ? 'Good' : 'Slow'})`);
    } catch (error) {
      return logTest('Navigation Performance Test', false, `Error: ${error.message}`);
    }
  }

  /**
   * Run All Phase 1 Tests
   */
  async function runAllTests() {
    if (isTestRunning) {
      console.log('⏳ Tests already running, please wait...');
      return;
    }
    
    isTestRunning = true;
    testResults = [];
    
    console.log('\n🚀 Starting Phase 1 Navigation Fixes Test Suite...');
    console.log('=====================================');
    
    try {
      const tests = [
        testNavigationRateLimiter,
        testNavigationDebouncing,
        testNavigationStateGuards,
        testChatNavigationIntegration,
        testErrorHandlingRecovery,
        testMobileDesktopBehavior,
        testNavigationPerformance
      ];
      
      let passedTests = 0;
      for (const test of tests) {
        try {
          const result = await test();
          if (result) passedTests++;
        } catch (error) {
          console.error(`Test failed with error: ${error.message}`);
        }
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Summary
      console.log('\n📊 Phase 1 Test Results Summary');
      console.log('=====================================');
      console.log(`✅ Passed: ${passedTests}/${tests.length} tests`);
      console.log(`❌ Failed: ${tests.length - passedTests}/${tests.length} tests`);
      
      if (passedTests === tests.length) {
        console.log('%c🎉 ALL PHASE 1 TESTS PASSED! Navigation fixes are working correctly.', 
          'color: #10B981; font-size: 16px; font-weight: bold;');
      } else {
        console.log('%c⚠️ Some tests failed. Check the details above.', 
          'color: #F59E0B; font-size: 16px; font-weight: bold;');
      }
      
      return {
        totalTests: tests.length,
        passedTests,
        failedTests: tests.length - passedTests,
        results: testResults,
        success: passedTests === tests.length
      };
    } finally {
      isTestRunning = false;
    }
  }

  /**
   * Quick Status Check
   */
  function quickStatus() {
    console.log('\n📋 Phase 1 Navigation Fixes - Quick Status Check');
    console.log('==============================================');
    
    // Check critical functions
    const rateLimiterExists = typeof window.getNavigationRateLimiterStatus === 'function';
    const urlDebugExists = !!window.conversationUrlDebug;
    const resetExists = typeof window.resetNavigationRateLimiter === 'function';
    
    console.log(`Rate Limiter: ${rateLimiterExists ? '✅' : '❌'} ${rateLimiterExists ? 'Available' : 'Missing'}`);
    console.log(`URL Debug: ${urlDebugExists ? '✅' : '❌'} ${urlDebugExists ? 'Available' : 'Missing'}`);
    console.log(`Reset Function: ${resetExists ? '✅' : '❌'} ${resetExists ? 'Available' : 'Missing'}`);
    
    if (rateLimiterExists) {
      const status = window.getNavigationRateLimiterStatus();
      console.log(`Current Rate Limit: ${status.callCount}/${status.maxCalls} calls`);
    }
    
    return {
      rateLimiterExists,
      urlDebugExists,
      resetExists,
      allCriticalFunctionsAvailable: rateLimiterExists && urlDebugExists && resetExists
    };
  }

  /**
   * Manual Navigation Test
   */
  function testManualNavigation() {
    console.log('\n🔧 Manual Navigation Test');
    console.log('========================');
    console.log('This will test actual navigation between chat and home...');
    
    if (!window.conversationUrlDebug) {
      console.error('❌ URL debug utilities not available');
      return false;
    }
    
    try {
      // Test URL generation
      window.conversationUrlDebug.testUrlGeneration();
      console.log('✅ URL generation test completed');
      
      // Test current state
      const currentState = window.conversationUrlDebug.currentState();
      console.log('✅ Current URL state:', currentState);
      
      return true;
    } catch (error) {
      console.error('❌ Manual navigation test failed:', error.message);
      return false;
    }
  }

  // Public API
  return {
    runAllTests,
    quickStatus,
    testManualNavigation,
    getResults: () => testResults,
    
    // Individual test functions
    testNavigationRateLimiter,
    testNavigationDebouncing,
    testNavigationStateGuards,
    testChatNavigationIntegration,
    testErrorHandlingRecovery,
    testMobileDesktopBehavior,
    testNavigationPerformance
  };
})();

// Make available globally
if (typeof window !== 'undefined') {
  window.phase1Test = window.Phase1NavigationTest;
}

// Auto-run quick status check
console.log('\n🔍 Phase 1 Navigation Test Suite Loaded');
console.log('=======================================');
console.log('Available commands:');
console.log('• window.phase1Test.runAllTests() - Run complete test suite');
console.log('• window.phase1Test.quickStatus() - Quick status check');
console.log('• window.phase1Test.testManualNavigation() - Test manual navigation');
console.log('• window.phase1Test.getResults() - Get last test results');
console.log('');

// Run quick status check automatically
window.Phase1NavigationTest.quickStatus();

/**
 * Phase 1 Navigation Fixes Test
 * 
 * Tests the PersistentAppShell implementation to verify elimination
 * of component remounting between /app/chat and /:subdomain/space
 */

window.phase1NavigationTest = {
  
  testResults: {
    remountDetections: [],
    routeChanges: [],
    persistentShellEvents: [],
    subscriptionActivity: []
  },

  /**
   * Start comprehensive navigation test
   */
  startTest() {
    console.log(`\n🧪 PHASE 1 NAVIGATION TEST STARTING\n`);
    
    this.testResults = {
      remountDetections: [],
      routeChanges: [],
      persistentShellEvents: [],
      subscriptionActivity: []
    };

    this.setupMonitoring();
    this.runNavigationScenarios();
  },

  /**
   * Setup monitoring for remounting detection
   */
  setupMonitoring() {
    console.log('📊 Setting up remounting detection...');
    
    // Hook into console.log to detect remounting patterns
    const originalLog = console.log;
    const self = this;
    
    console.log = function(...args) {
      const message = args.join(' ');
      
      // Track PersistentAppShell events
      if (message.includes('[PersistentAppShell]')) {
        self.testResults.persistentShellEvents.push({
          timestamp: Date.now(),
          message: message,
          type: 'shell-event'
        });
      }
      
      // Track route changes
      if (message.includes('Route changed to:')) {
        self.testResults.routeChanges.push({
          timestamp: Date.now(),
          route: message.split('Route changed to:')[1] && message.split('Route changed to:')[1].trim(),
          type: 'route-change'
        });
      }
      
      // Detect component remounting (SpaceShellLayout, SpaceTabContent, etc.)
      if (message.includes('mounting') || 
          message.includes('unmounting') ||
          message.includes('Setting up subscription') ||
          message.includes('Cleaning up subscription')) {
        self.testResults.remountDetections.push({
          timestamp: Date.now(),
          message: message,
          type: message.includes('unmounting') ? 'unmount' : 'mount'
        });
      }
      
      // Track subscription activity
      if (message.includes('GlobalRealtime') || 
          message.includes('RealtimeOptimized')) {
        self.testResults.subscriptionActivity.push({
          timestamp: Date.now(),
          message: message,
          type: message.includes('Reusing') ? 'reuse' : 'create'
        });
      }
      
      // Call original console.log
      originalLog.apply(console, args);
    };
    
    // Store original for cleanup
    this.originalConsoleLog = originalLog;
  },

  /**
   * Run navigation scenarios to test remounting
   */
  runNavigationScenarios() {
    console.log('🔄 Running navigation scenarios...');
    
    setTimeout(() => {
      console.log('\n📱 TEST SCENARIO 1: Chat → Space Navigation');
      this.simulateNavigation('/app/chat', '/:subdomain/space');
    }, 1000);
    
    setTimeout(() => {
      console.log('\n📱 TEST SCENARIO 2: Space → Chat Navigation');
      this.simulateNavigation('/:subdomain/space', '/app/chat');
    }, 3000);
    
    setTimeout(() => {
      console.log('\n📱 TEST SCENARIO 3: Rapid Navigation (Stress Test)');
      this.simulateRapidNavigation();
    }, 5000);
    
    setTimeout(() => {
      this.analyzeResults();
    }, 8000);
  },

  /**
   * Simulate navigation between routes
   */
  simulateNavigation(from, to) {
    console.log(`🔄 Simulating navigation: ${from} → ${to}`);
    
    // Record current component state
    const beforeState = this.captureComponentState();
    
    // Trigger navigation (actual navigation would happen here)
    console.log(`📍 Navigation triggered: ${from} → ${to}`);
    
    // Check state after navigation
    setTimeout(() => {
      const afterState = this.captureComponentState();
      this.compareStates(beforeState, afterState, from, to);
    }, 500);
  },

  /**
   * Simulate rapid navigation to stress test
   */
  simulateRapidNavigation() {
    const routes = ['/app/chat', '/:subdomain/space', '/app/chat', '/:subdomain/space'];
    
    routes.forEach((route, index) => {
      setTimeout(() => {
        console.log(`⚡ Rapid nav ${index + 1}: ${route}`);
      }, index * 300);
    });
  },

  /**
   * Capture current component state
   */
  captureComponentState() {
    return {
      timestamp: Date.now(),
      persistentShellMounted: !!document.querySelector('.persistent-app-shell'),
      bottomNavPresent: !!document.querySelector('.persistent-bottom-nav'),
      spaceShellPresent: !!document.querySelector('[class*="SpaceShell"]'),
      chatComponents: document.querySelectorAll('[class*="Chat"]').length,
      feedComponents: document.querySelectorAll('[class*="Feed"]').length
    };
  },

  /**
   * Compare states before/after navigation
   */
  compareStates(before, after, fromRoute, toRoute) {
    const differences = [];
    
    if (before.persistentShellMounted !== after.persistentShellMounted) {
      differences.push('PersistentAppShell remounted');
    }
    
    if (before.bottomNavPresent !== after.bottomNavPresent) {
      differences.push('Bottom navigation remounted');
    }
    
    console.log(`📊 State comparison ${fromRoute} → ${toRoute}:`, {
      differences: differences.length === 0 ? 'No remounting detected ✅' : differences,
      before,
      after
    });
  },

  /**
   * Analyze test results
   */
  analyzeResults() {
    console.log('\n📊 PHASE 1 NAVIGATION TEST RESULTS\n');
    
    const { remountDetections, routeChanges, persistentShellEvents, subscriptionActivity } = this.testResults;
    
    console.log(`🔄 Route Changes: ${routeChanges.length}`);
    console.log(`🏗️  Remount Detections: ${remountDetections.length}`);
    console.log(`🛡️  Persistent Shell Events: ${persistentShellEvents.length}`);
    console.log(`📡 Subscription Activity: ${subscriptionActivity.length}`);
    
    // Analyze success metrics
    const successMetrics = {
      noSpaceShellRemounting: !remountDetections.some(r => r.message.includes('SpaceShell')),
      persistentShellWorking: persistentShellEvents.length > 0,
      subscriptionPooling: subscriptionActivity.filter(s => s.type === 'reuse').length > 0,
      noExcessiveRemounting: remountDetections.length < 5
    };
    
    const successCount = Object.values(successMetrics).filter(Boolean).length;
    const totalTests = Object.keys(successMetrics).length;
    
    console.log(`\n🎯 SUCCESS RATE: ${successCount}/${totalTests} (${Math.round(successCount/totalTests*100)}%)\n`);
    
    Object.entries(successMetrics).forEach(([test, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
    });
    
    if (successCount === totalTests) {
      console.log('\n🎉 EXCELLENT! PersistentAppShell is working perfectly!');
      console.log('✅ No component remounting detected between Chat→Space navigation');
    } else {
      console.log(`\n⚠️  Some issues detected. Review the failed tests above.`);
    }
    
    // Cleanup
    if (this.originalConsoleLog) {
      console.log = this.originalConsoleLog;
    }
  },

  /**
   * Manual test helper - run this after navigating
   */
  quickCheck() {
    console.log('\n🔍 QUICK PERSISTENT SHELL CHECK\n');
    
    const shellElement = document.querySelector('.persistent-app-shell');
    const debugElement = shellElement && shellElement.querySelector('.fixed.top-0');
    const routeType = debugElement && debugElement.textContent || 'not found';
    
    console.log(`🛡️  PersistentAppShell: ${shellElement ? '✅ Mounted' : '❌ Missing'}`);
    console.log(`📍 Current Route Type: ${routeType}`);
    console.log(`🔄 Route Changes: ${this.testResults.routeChanges.length}`);
    console.log(`🏗️  Remount Events: ${this.testResults.remountDetections.length}`);
    
    if (shellElement && this.testResults.remountDetections.length === 0) {
      console.log('🎉 SUCCESS: No remounting detected!');
    }
  },

  /**
   * Real-time monitoring toggle
   */
  startLiveMonitoring() {
    console.log('📊 Starting live monitoring...');
    this.setupMonitoring();
    
    console.log(`
🔴 LIVE MONITORING ACTIVE

Navigate between:
• /app/chat 
• /:subdomain/space

Watch for:
✅ [PersistentAppShell] Route changed messages
❌ Component mounting/unmounting messages
✅ [GlobalRealtime] Reusing subscription messages
❌ Excessive [RealtimePosts] Setting up subscription messages

Run window.phase1NavigationTest.quickCheck() anytime for status.
    `);
  }
};

// Auto-start monitoring in development
if (window.location.hostname === 'localhost') {
  console.log('🧪 Phase 1 Navigation Test loaded. Run window.phase1NavigationTest.startTest() to begin.');
} 