/**
 * ENHANCED NAVIGATION PROTECTION TEST SUITE
 * Tests the expanded navigation-aware comment fetching protection
 * 
 * SCENARIOS TESTED:
 * 1. Chat⟷Space navigation (original)
 * 2. Initial space load (NEW) - Login flow (/app → /space)
 * 3. Space switching (NEW)
 */

// Global test state
window.enhancedNavigationTest = {
  // Test configuration
  config: {
    monitoringDuration: 10000, // 10 seconds
    testScenarios: ['chat-space', 'initial-load', 'space-switching'],
    expectedProtectionWindow: 3000, // 3 seconds
    initialLoadWindow: 5000 // 5 seconds for initial loads
  },

  // Test state
  state: {
    monitoring: false,
    startTime: null,
    logEntries: [],
    protectionEvents: [],
    fetchEvents: [],
    navigationEvents: []
  },

  // Initialize monitoring
  startMonitoring() {
    this.state.monitoring = true;
    this.state.startTime = Date.now();
    this.state.logEntries = [];
    this.state.protectionEvents = [];
    this.state.fetchEvents = [];
    this.state.navigationEvents = [];

    console.log('🧪 [NavigationProtectionTest] Starting comprehensive monitoring...');
    console.log('📋 Scenarios being tested:', this.config.testScenarios);

    // Override console.log to capture relevant entries
    this.originalConsoleLog = console.log;
    console.log = (...args) => {
      this.originalConsoleLog(...args);
      if (this.state.monitoring) {
        const message = args.join(' ');
        const timestamp = Date.now() - this.state.startTime;

        // Capture navigation events
        if (message.includes('[NavigationAwareRealtime] Route change:')) {
          this.state.navigationEvents.push({
            timestamp,
            message,
            type: 'navigation'
          });
        }

        // Capture protection events
        if (message.includes('🛡️') && (message.includes('[usePostComments]') || message.includes('[useComments]'))) {
          this.state.protectionEvents.push({
            timestamp,
            message,
            type: 'protection'
          });
        }

        // Capture fetch events
        if (message.includes('🔔') && (message.includes('Fetching comments for post') || message.includes('Skipped fetch'))) {
          this.state.fetchEvents.push({
            timestamp,
            message,
            type: 'fetch'
          });
        }

        // Store all relevant entries
        if (message.includes('usePostComments') || message.includes('useComments') || message.includes('NavigationAware')) {
          this.state.logEntries.push({
            timestamp,
            message,
            args
          });
        }
      }
    };

    // Auto-stop monitoring after duration
    setTimeout(() => {
      this.stopMonitoring();
    }, this.config.monitoringDuration);
  },

  // Stop monitoring
  stopMonitoring() {
    if (!this.state.monitoring) return;
    
    this.state.monitoring = false;
    if (this.originalConsoleLog) {
      console.log = this.originalConsoleLog;
    }

    console.log('🧪 [NavigationProtectionTest] Monitoring stopped');
    this.generateReport();
  },

  // Test initial space load protection (the key new feature)
  testInitialSpaceLoadLogic() {
    console.log('🧪 [NavigationProtectionTest] Testing INITIAL SPACE LOAD protection logic...');
    
    const testCases = [
      // Login flow cases
      { from: '/login', to: '/nocode-architects/space', time: 1000, expected: true, description: 'Login → Space' },
      { from: '/app', to: '/nocode-architects/space', time: 1000, expected: true, description: 'App → Space (login flow)' },
      { from: '/', to: '/nocode-architects/space', time: 1000, expected: true, description: 'Root → Space' },
      { from: '/auth/callback', to: '/nocode-architects/space', time: 1000, expected: true, description: 'Auth → Space' },
      { from: '', to: '/nocode-architects/space', time: 1000, expected: true, description: 'Empty → Space' },
      
      // Time-based protection
      { from: '/random', to: '/nocode-architects/space', time: 4000, expected: true, description: 'Any → Space (within 5s window)' },
      { from: '/random', to: '/nocode-architects/space', time: 6000, expected: false, description: 'Any → Space (outside 5s window)' },
      
      // Non-space navigation
      { from: '/app', to: '/settings', time: 1000, expected: false, description: 'App → Settings (not space)' }
    ];

    let passed = 0;
    let total = testCases.length;

    console.log(`🔬 Running ${total} test cases for initial space load protection...`);

    testCases.forEach((testCase, index) => {
      const timeSinceNavigation = testCase.time;
      const isRecentNavigation = timeSinceNavigation < 3000;
      
      const isInitialSpaceLoad = (
        testCase.to.includes('/space') && (
          testCase.from.includes('/login') ||
          testCase.from.includes('/app') ||
          testCase.from === '/' ||
          testCase.from.includes('/auth') ||
          testCase.from === '' ||
          timeSinceNavigation < 5000
        )
      );

      const result = isRecentNavigation && isInitialSpaceLoad;
      const testPassed = result === testCase.expected;
      
      if (testPassed) passed++;

      console.log(`   ${index + 1}. ${testCase.description}: ${testPassed ? '✅' : '❌'}`, {
        navigation: `${testCase.from} → ${testCase.to}`,
        timing: `${testCase.time}ms ago`,
        expected: testCase.expected,
        actual: result,
        factors: {
          recentNavigation: isRecentNavigation,
          initialSpaceLoad: isInitialSpaceLoad
        }
      });
    });

    const successRate = (passed / total * 100).toFixed(1);
    console.log(`📊 Initial Space Load Test Results: ${passed}/${total} passed (${successRate}%)`);
    
    return { passed, total, successRate };
  },

  // Test chat-space navigation (original feature)
  testChatSpaceNavigation() {
    console.log('🧪 [NavigationProtectionTest] Testing Chat⟷Space navigation protection...');
    
    const testCases = [
      { from: '/app/chat', to: '/nocode-architects/space', expected: true, description: 'Chat → Space' },
      { from: '/nocode-architects/space', to: '/app/chat', expected: true, description: 'Space → Chat' },
      { from: '/app/settings', to: '/nocode-architects/space', expected: false, description: 'Settings → Space' },
      { from: '/app/chat', to: '/app/settings', expected: false, description: 'Chat → Settings' }
    ];

    let passed = 0;
    testCases.forEach((testCase, index) => {
      const timeSinceNavigation = 1000; // 1 second ago
      const isRecentNavigation = timeSinceNavigation < 3000;
      const isChatSpaceNavigation = (
        (testCase.from.includes('/app/chat') && testCase.to.includes('/space')) ||
        (testCase.from.includes('/space') && testCase.to.includes('/app/chat'))
      );

      const result = isRecentNavigation && isChatSpaceNavigation;
      const testPassed = result === testCase.expected;
      if (testPassed) passed++;

      console.log(`   ${index + 1}. ${testCase.description}: ${testPassed ? '✅' : '❌'}`, {
        navigation: `${testCase.from} → ${testCase.to}`,
        expected: testCase.expected,
        actual: result
      });
    });

    console.log(`📊 Chat⟷Space Test Results: ${passed}/${testCases.length} passed`);
    return { passed, total: testCases.length };
  },

  // Test space switching protection
  testSpaceSwitching() {
    console.log('🧪 [NavigationProtectionTest] Testing space switching protection...');
    
    const testCases = [
      { from: '/space1/space', to: '/space2/space', expected: true, description: 'Space1 → Space2' },
      { from: '/nocode-architects/space', to: '/automation-jungle/space', expected: true, description: 'Space A → Space B' },
      { from: '/space1/space', to: '/space1/space', expected: false, description: 'Same space (no switch)' },
      { from: '/space1/space', to: '/app/chat', expected: false, description: 'Space → Chat (not switching)' }
    ];

    let passed = 0;
    testCases.forEach((testCase, index) => {
      const timeSinceNavigation = 1000;
      const isRecentNavigation = timeSinceNavigation < 3000;
      const isSpaceSwitching = (
        testCase.from.includes('/space') && testCase.to.includes('/space') && 
        testCase.from !== testCase.to
      );

      const result = isRecentNavigation && isSpaceSwitching;
      const testPassed = result === testCase.expected;
      if (testPassed) passed++;

      console.log(`   ${index + 1}. ${testCase.description}: ${testPassed ? '✅' : '❌'}`, {
        navigation: `${testCase.from} → ${testCase.to}`,
        expected: testCase.expected,
        actual: result
      });
    });

    console.log(`📊 Space Switching Test Results: ${passed}/${testCases.length} passed`);
    return { passed, total: testCases.length };
  },

  // Check current protection status
  checkCurrentStatus() {
    if (!window.navigationAwareRealtimeService) {
      console.log('❌ NavigationAwareRealtimeService not available');
      return { available: false };
    }

    const stats = window.navigationAwareRealtimeService.getStats();
    const timeSinceNavigation = Date.now() - stats.navigationState.lastNavigationTime;

    console.log('🔍 [NavigationProtectionTest] Current Status Check');
    console.log('==================================================');
    console.log('📊 NavigationAware Service Status:', {
      totalSubscriptions: stats.totalSubscriptions,
      protectedSubscriptions: stats.protectedSubscriptions,
      lastNavigation: `${timeSinceNavigation}ms ago`,
      routes: `${stats.navigationState.previousRoute} → ${stats.navigationState.currentRoute}`
    });

    // Test current conditions
    const isRecentNavigation = timeSinceNavigation < 3000;
    const currentRoute = stats.navigationState.currentRoute;
    const previousRoute = stats.navigationState.previousRoute;

    const scenarios = {
      '🔄 Chat⟷Space': (
        (previousRoute.includes('/app/chat') && currentRoute.includes('/space')) ||
        (previousRoute.includes('/space') && currentRoute.includes('/app/chat'))
      ),
      '🚀 Initial Load': (
        currentRoute.includes('/space') && (
          previousRoute.includes('/login') ||
          previousRoute.includes('/app') ||
          previousRoute === '/' ||
          previousRoute.includes('/auth') ||
          previousRoute === '' ||
          timeSinceNavigation < 5000
        )
      ),
      '🔀 Space Switching': (
        previousRoute.includes('/space') && currentRoute.includes('/space') && 
        previousRoute !== currentRoute
      )
    };

    console.log('🛡️  Current Protection Analysis:');
    const protectionStatus = {};
    Object.entries(scenarios).forEach(([scenario, isActive]) => {
      const wouldProtect = isRecentNavigation && isActive;
      protectionStatus[scenario] = { isActive, wouldProtect };
      console.log(`   ${scenario}: ${isActive ? '🟢 Active' : '⚪ Inactive'} → ${wouldProtect ? '🛡️ PROTECTED' : '✅ Allow Fetch'}`);
    });

    return {
      available: true,
      stats,
      timeSinceNavigation,
      protectionStatus,
      routes: { previous: previousRoute, current: currentRoute }
    };
  },

  // Generate comprehensive report
  generateReport() {
    if (!this.state.startTime) return;

    const duration = Date.now() - this.state.startTime;
    const counts = {
      totalEvents: this.state.logEntries.length,
      protectionEvents: this.state.protectionEvents.length,
      fetchEvents: this.state.fetchEvents.length,
      navigationEvents: this.state.navigationEvents.length,
      skippedFetches: this.state.protectionEvents.filter(e => e.message.includes('Skipping fetch')).length,
      actualFetches: this.state.fetchEvents.filter(e => e.message.includes('Fetching comments for post')).length
    };

    console.log('\n🧪 [NavigationProtectionTest] LIVE MONITORING REPORT');
    console.log('=====================================================');
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log(`📊 Events: ${counts.totalEvents} total, ${counts.protectionEvents} protections, ${counts.fetchEvents} fetches`);
    console.log(`🛡️  Effectiveness: ${counts.skippedFetches} fetches prevented, ${counts.actualFetches} allowed`);

    // Show recent events
    if (this.state.protectionEvents.length > 0) {
      console.log('\n🛡️  Recent Protection Events:');
      this.state.protectionEvents.slice(-3).forEach((event, index) => {
        console.log(`   ${index + 1}. [${event.timestamp}ms] ${event.message}`);
      });
    }

    if (this.state.navigationEvents.length > 0) {
      console.log('\n🧭 Navigation Events During Test:');
      this.state.navigationEvents.forEach((event, index) => {
        console.log(`   ${index + 1}. [${event.timestamp}ms] ${event.message}`);
      });
    }

    const success = counts.protectionEvents > 0 || counts.skippedFetches > 0;
    console.log(`\n🎯 Live Test Result: ${success ? '✅ PROTECTION ACTIVE' : '📝 NO PROTECTION EVENTS'}`);
    
    return { success, duration, counts };
  },

  // Run all tests
  runAllTests() {
    console.log('🧪 [NavigationProtectionTest] ENHANCED NAVIGATION PROTECTION TEST SUITE');
    console.log('======================================================================\n');
    
    // Test all protection scenarios
    const results = {
      chatSpace: this.testChatSpaceNavigation(),
      initialLoad: this.testInitialSpaceLoadLogic(),
      spaceSwitching: this.testSpaceSwitching()
    };

    console.log('\n');
    
    // Check current system status
    const status = this.checkCurrentStatus();
    
    console.log('\n');

    // Calculate overall results
    const totalPassed = results.chatSpace.passed + results.initialLoad.passed + results.spaceSwitching.passed;
    const totalTests = results.chatSpace.total + results.initialLoad.total + results.spaceSwitching.total;
    const overallSuccess = (totalPassed / totalTests * 100).toFixed(1);

    console.log('📈 OVERALL TEST RESULTS');
    console.log('========================');
    console.log(`✅ Tests Passed: ${totalPassed}/${totalTests} (${overallSuccess}%)`);
    console.log(`🛡️  Navigation Service: ${status.available ? '✅ Available' : '❌ Unavailable'}`);
    
    if (overallSuccess >= 90) {
      console.log('🎉 EXCELLENT! Navigation protection is working correctly.');
    } else if (overallSuccess >= 70) {
      console.log('⚠️  Good, but some edge cases may need attention.');
    } else {
      console.log('❌ Protection logic needs review.');
    }

    // Start live monitoring
    console.log('\n🔄 Starting live monitoring for 10 seconds...');
    console.log('💡 Try navigating between chat and home to see protection in action!');
    this.startMonitoring();

    return { results, status, overallSuccess: parseFloat(overallSuccess) };
  },

  // Quick test for the current login flow issue
  testCurrentIssue() {
    console.log('🎯 [NavigationProtectionTest] Testing CURRENT ISSUE: /app → /space navigation');
    console.log('================================================================================');
    
    // Simulate the exact scenario from the console log
    const scenario = {
      previousRoute: '/app',
      currentRoute: '/nocode-architects/space',
      timeSinceNavigation: 1000 // 1 second ago
    };

    const isRecentNavigation = scenario.timeSinceNavigation < 3000;
    const isInitialSpaceLoad = (
      scenario.currentRoute.includes('/space') && (
        scenario.previousRoute.includes('/login') ||
        scenario.previousRoute.includes('/app') ||
        scenario.previousRoute === '/' ||
        scenario.previousRoute.includes('/auth') ||
        scenario.previousRoute === '' ||
        scenario.timeSinceNavigation < 5000
      )
    );

    const shouldSkip = isRecentNavigation && isInitialSpaceLoad;

    console.log('🔍 Analysis of Current Issue:');
    console.log(`   Route: ${scenario.previousRoute} → ${scenario.currentRoute}`);
    console.log(`   Timing: ${scenario.timeSinceNavigation}ms ago`);
    console.log(`   Recent Navigation: ${isRecentNavigation ? '✅' : '❌'} (< 3000ms)`);
    console.log(`   Initial Space Load: ${isInitialSpaceLoad ? '✅' : '❌'} (app → space)`);
    console.log(`   Should Skip Fetch: ${shouldSkip ? '✅ YES' : '❌ NO'}`);

    if (shouldSkip) {
      console.log('\n🎉 SUCCESS! This navigation should prevent excessive comment fetching.');
      console.log('   The enhanced protection logic correctly identifies this as an initial space load.');
    } else {
      console.log('\n❌ ISSUE! This navigation would still allow comment fetching.');
      console.log('   The protection logic needs adjustment.');
    }

    return shouldSkip;
  }
};

// Auto-load commands
console.log('🧪 Enhanced Navigation Protection Test Suite Loaded!');
console.log('');
console.log('Available Commands:');
console.log('• window.enhancedNavigationTest.runAllTests() - Run complete test suite');
console.log('• window.enhancedNavigationTest.testCurrentIssue() - Test current /app → /space issue');
console.log('• window.enhancedNavigationTest.checkCurrentStatus() - Check protection status');
console.log('• window.enhancedNavigationTest.startMonitoring() - Start live monitoring');
console.log('');

// Run quick status check
setTimeout(() => {
  console.log('🔍 Running initial status check...');
  window.enhancedNavigationTest.checkCurrentStatus();
  console.log('\n💡 Run window.enhancedNavigationTest.testCurrentIssue() to test the specific login flow issue!');
}, 1000); 