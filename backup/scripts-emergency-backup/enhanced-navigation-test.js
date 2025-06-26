/**
 * ENHANCED NAVIGATION PROTECTION TEST SUITE
 * Validates the expanded navigation-aware comment fetching protection
 * 
 * NEW PROTECTION SCENARIOS:
 * 1. Chat⟷Space navigation (original)
 * 2. Initial space load (NEW) - Login flow (/app → /space)  
 * 3. Space switching (NEW)
 */

window.enhancedNavigationTest = {
  // Test current login flow issue
  testCurrentIssue() {
    console.log('🎯 Testing CURRENT ISSUE: /app → /space navigation protection');
    console.log('=============================================================');
    
    // Simulate the exact scenario from console logs
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

    console.log('🔍 Current Issue Analysis:');
    console.log(`   Navigation: ${scenario.previousRoute} → ${scenario.currentRoute}`);
    console.log(`   Timing: ${scenario.timeSinceNavigation}ms ago`);
    console.log(`   Recent Navigation: ${isRecentNavigation ? '✅' : '❌'} (< 3000ms)`);
    console.log(`   Initial Space Load: ${isInitialSpaceLoad ? '✅' : '❌'} (app → space detected)`);
    console.log(`   Should Skip Comment Fetch: ${shouldSkip ? '✅ YES' : '❌ NO'}`);

    if (shouldSkip) {
      console.log('\n🎉 SUCCESS! This navigation will prevent excessive comment fetching!');
      console.log('   The enhanced protection correctly identifies /app → /space as initial space load.');
    } else {
      console.log('\n❌ ISSUE! Comment fetching would still occur during this navigation.');
    }

    return shouldSkip;
  },

  // Test all protection scenarios
  testAllScenarios() {
    console.log('🧪 Testing All Protection Scenarios');
    console.log('===================================');

    const testCases = [
      // Initial space load scenarios (NEW)
      { from: '/login', to: '/space/feed', time: 1000, expected: true, type: 'Initial Load' },
      { from: '/app', to: '/nocode-architects/space', time: 1000, expected: true, type: 'Initial Load' },
      { from: '/', to: '/space/feed', time: 1000, expected: true, type: 'Initial Load' },
      { from: '', to: '/space/feed', time: 2000, expected: true, type: 'Initial Load' },
      
      // Chat⟷Space navigation (original)
      { from: '/app/chat', to: '/space/feed', time: 1000, expected: true, type: 'Chat-Space' },
      { from: '/space/feed', to: '/app/chat', time: 1000, expected: true, type: 'Chat-Space' },
      
      // Space switching (NEW)
      { from: '/space1/space', to: '/space2/space', time: 1000, expected: true, type: 'Space Switch' },
      
      // Should NOT protect
      { from: '/settings', to: '/profile', time: 1000, expected: false, type: 'Other Nav' },
      { from: '/app', to: '/space/feed', time: 6000, expected: false, type: 'Too Old' }
    ];

    let passed = 0;
    console.log(`🔬 Running ${testCases.length} test cases...\n`);

    testCases.forEach((test, i) => {
      const isRecent = test.time < 3000;
      
      const isChatSpace = (
        (test.from.includes('/app/chat') && test.to.includes('/space')) ||
        (test.from.includes('/space') && test.to.includes('/app/chat'))
      );
      
      const isInitialLoad = (
        test.to.includes('/space') && (
          test.from.includes('/login') ||
          test.from.includes('/app') ||
          test.from === '/' ||
          test.from.includes('/auth') ||
          test.from === '' ||
          test.time < 5000
        )
      );
      
      const isSpaceSwitch = (
        test.from.includes('/space') && test.to.includes('/space') && 
        test.from !== test.to
      );

      const shouldProtect = isRecent && (isChatSpace || isInitialLoad || isSpaceSwitch);
      const correct = shouldProtect === test.expected;
      
      if (correct) passed++;

      console.log(`${i + 1}. ${test.type}: ${correct ? '✅' : '❌'} ${test.from} → ${test.to} (${test.time}ms ago)`);
      if (!correct) {
        console.log(`   Expected: ${test.expected}, Got: ${shouldProtect}`);
      }
    });

    const score = (passed / testCases.length * 100).toFixed(1);
    console.log(`\n📊 Results: ${passed}/${testCases.length} passed (${score}%)`);
    
    return { passed, total: testCases.length, score: parseFloat(score) };
  },

  // Check live system status
  checkLiveStatus() {
    console.log('🔍 Live System Status Check');
    console.log('===========================');

    if (!window.navigationAwareRealtimeService) {
      console.log('❌ NavigationAwareRealtimeService not available');
      return { available: false };
    }

    const stats = window.navigationAwareRealtimeService.getStats();
    const timeSince = Date.now() - stats.navigationState.lastNavigationTime;

    console.log('📊 Service Status:');
    console.log(`   Total Subscriptions: ${stats.totalSubscriptions}`);
    console.log(`   Protected Subscriptions: ${stats.protectedSubscriptions}`);
    console.log(`   Last Navigation: ${timeSince}ms ago`);
    console.log(`   Routes: ${stats.navigationState.previousRoute} → ${stats.navigationState.currentRoute}`);

    // Check current protection status
    const current = stats.navigationState.currentRoute;
    const previous = stats.navigationState.previousRoute;
    const isRecent = timeSince < 3000;

    const protections = {
      'Chat⟷Space': isRecent && (
        (previous.includes('/app/chat') && current.includes('/space')) ||
        (previous.includes('/space') && current.includes('/app/chat'))
      ),
      'Initial Load': isRecent && current.includes('/space') && (
        previous.includes('/login') ||
        previous.includes('/app') ||
        previous === '/' ||
        previous.includes('/auth') ||
        previous === '' ||
        timeSince < 5000
      ),
      'Space Switch': isRecent && (
        previous.includes('/space') && current.includes('/space') && 
        previous !== current
      )
    };

    console.log('\n🛡️  Current Protection Status:');
    Object.entries(protections).forEach(([type, active]) => {
      console.log(`   ${type}: ${active ? '🟢 ACTIVE (fetches blocked)' : '⚪ Inactive'}`);
    });

    return { available: true, stats, timeSince, protections };
  },

  // Monitor live events
  startLiveMonitoring(duration = 10000) {
    console.log(`🔄 Starting live monitoring for ${duration / 1000} seconds...`);
    console.log('💡 Try navigating between chat and home to see protection in action!');

    const events = [];
    const startTime = Date.now();

    const originalLog = console.log;
    console.log = (...args) => {
      originalLog(...args);
      const message = args.join(' ');
      
      if (message.includes('🛡️') && (message.includes('usePostComments') || message.includes('useComments'))) {
        events.push({
          time: Date.now() - startTime,
          type: 'protection',
          message
        });
      }
      
      if (message.includes('🔔') && message.includes('Fetching comments')) {
        events.push({
          time: Date.now() - startTime,
          type: 'fetch',
          message
        });
      }
    };

    setTimeout(() => {
      console.log = originalLog;
      
      console.log('\n📊 Live Monitoring Results:');
      console.log(`   Duration: ${duration}ms`);
      console.log(`   Events captured: ${events.length}`);
      
      const protectionEvents = events.filter(e => e.type === 'protection');
      const fetchEvents = events.filter(e => e.type === 'fetch');
      
      console.log(`   Protection events: ${protectionEvents.length}`);
      console.log(`   Fetch events: ${fetchEvents.length}`);
      
      if (protectionEvents.length > 0) {
        console.log('\n🛡️  Protection Events:');
        protectionEvents.forEach((event, i) => {
          console.log(`   ${i + 1}. [${event.time}ms] ${event.message}`);
        });
      }
      
      const effectiveness = protectionEvents.length > 0 ? '✅ WORKING' : 
                          fetchEvents.length > 0 ? '⚠️  FETCHES DETECTED' : '📝 NO ACTIVITY';
      console.log(`\n🎯 Protection Effectiveness: ${effectiveness}`);
      
    }, duration);
  },

  // Run all tests
  runAllTests() {
    console.log('🧪 ENHANCED NAVIGATION PROTECTION TEST SUITE');
    console.log('============================================\n');
    
    // Test current issue
    const currentIssue = this.testCurrentIssue();
    console.log('\n');
    
    // Test all scenarios
    const allScenarios = this.testAllScenarios();
    console.log('\n');
    
    // Check live status
    const liveStatus = this.checkLiveStatus();
    console.log('\n');

    // Overall assessment
    console.log('🎯 OVERALL ASSESSMENT');
    console.log('=====================');
    console.log(`Current Issue Fix: ${currentIssue ? '✅ FIXED' : '❌ NEEDS WORK'}`);
    console.log(`Scenario Tests: ${allScenarios.score}% passed`);
    console.log(`Live System: ${liveStatus.available ? '✅ Available' : '❌ Not Available'}`);
    
    if (currentIssue && allScenarios.score >= 90 && liveStatus.available) {
      console.log('\n🎉 EXCELLENT! Enhanced navigation protection is working correctly!');
      console.log('   The /app → /space navigation should now prevent excessive comment fetching.');
    } else {
      console.log('\n⚠️  Some issues detected. Check individual test results above.');
    }

    // Start live monitoring
    console.log('\n🔄 Starting live monitoring...');
    this.startLiveMonitoring();
    
    return { currentIssue, allScenarios, liveStatus };
  }
};

// Auto-run status check
console.log('🧪 Enhanced Navigation Protection Test Suite Loaded!');
console.log('');
console.log('Commands:');
console.log('• window.enhancedNavigationTest.runAllTests() - Complete test suite');
console.log('• window.enhancedNavigationTest.testCurrentIssue() - Test /app → /space fix');
console.log('• window.enhancedNavigationTest.checkLiveStatus() - Check current status');
console.log('• window.enhancedNavigationTest.startLiveMonitoring() - Monitor events');
console.log('');

// Quick status check
setTimeout(() => {
  console.log('🔍 Quick status check...');
  window.enhancedNavigationTest.checkLiveStatus();
  console.log('\n💡 Ready to test! Try: window.enhancedNavigationTest.testCurrentIssue()');
}, 1000); 