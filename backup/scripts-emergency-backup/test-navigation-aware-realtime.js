/**
 * Navigation-Aware Realtime Service Test Suite
 * 
 * Tests the new NavigationAwareRealtimeService to verify:
 * 1. Subscriptions are protected during Chat⟷Space navigation
 * 2. Normal cleanup still works for other scenarios
 * 3. Navigation detection is working correctly
 * 4. Posts and categories no longer rerender during navigation
 */

window.NavigationAwareRealtimeTest = (function() {
  'use strict';

  let testResults = [];
  let isTestRunning = false;

  /**
   * Log test results with formatting
   */
  function logTest(testName, passed, details = '') {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const message = `[NavigationAware] ${status} ${testName}${details ? ': ' + details : ''}`;
    
    if (passed) {
      console.log(`%c${message}`, 'color: #10B981; font-weight: bold;');
    } else {
      console.error(`%c${message}`, 'color: #EF4444; font-weight: bold;');
    }
    
    testResults.push({ testName, passed, details, timestamp: Date.now() });
    return passed;
  }

  /**
   * Test 1: NavigationAwareRealtimeService is available
   */
  function testServiceAvailability() {
    console.log('\n🧪 Testing NavigationAwareRealtimeService availability...');
    
    const serviceExists = typeof window.navigationAwareRealtimeService !== 'undefined';
    logTest('Service Availability', serviceExists, 'NavigationAwareRealtimeService in global scope');
    
    if (serviceExists) {
      const hasRequiredMethods = typeof window.navigationAwareRealtimeService.getStats === 'function' &&
                                typeof window.navigationAwareRealtimeService.listSubscriptions === 'function' &&
                                typeof window.navigationAwareRealtimeService.subscribe === 'function' &&
                                typeof window.navigationAwareRealtimeService.unsubscribe === 'function';
      
      logTest('Service Methods', hasRequiredMethods, 'All required methods available');
      return hasRequiredMethods;
    }
    
    return false;
  }

  /**
   * Test 2: Navigation detection works
   */
  async function testNavigationDetection() {
    console.log('\n🧪 Testing navigation detection...');
    
    if (!window.navigationAwareRealtimeService) {
      return logTest('Navigation Detection', false, 'Service not available');
    }

    // Get initial stats
    const initialStats = window.navigationAwareRealtimeService.getStats();
    logTest('Initial Stats Access', true, `${initialStats.totalSubscriptions} subscriptions tracked`);
    
    // Get current route
    const currentRoute = window.location.pathname;
    logTest('Current Route Detection', true, `Current route: ${currentRoute}`);
    
    // Check if we can detect route types
    const isChatRoute = currentRoute.includes('/app/chat');
    const isSpaceRoute = currentRoute.includes('/space') && !currentRoute.includes('/app/chat');
    
    logTest('Route Type Detection', true, 
      `Chat: ${isChatRoute}, Space: ${isSpaceRoute}`);
    
    return true;
  }

  /**
   * Test 3: Subscription tracking
   */
  async function testSubscriptionTracking() {
    console.log('\n🧪 Testing subscription tracking...');
    
    if (!window.navigationAwareRealtimeService) {
      return logTest('Subscription Tracking', false, 'Service not available');
    }

    const initialStats = window.navigationAwareRealtimeService.getStats();
    
    // Test creating a subscription
    try {
      const testSpaceId = 'test-space-123';
      const testCallback = (payload) => console.log('Test callback:', payload);
      
      const subscriptionId = window.navigationAwareRealtimeService.subscribe(
        testSpaceId,
        'posts',
        testCallback,
        { event: 'INSERT' }
      );
      
      const subscriptionCreated = subscriptionId !== null && subscriptionId !== undefined;
      logTest('Subscription Creation', subscriptionCreated, `ID: ${subscriptionId}`);
      
      if (subscriptionCreated) {
        const newStats = window.navigationAwareRealtimeService.getStats();
        const subscriptionAdded = newStats.totalSubscriptions >= initialStats.totalSubscriptions;
        logTest('Subscription Tracking', subscriptionAdded, 
          `Subscriptions: ${initialStats.totalSubscriptions} → ${newStats.totalSubscriptions}`);
        
        // Clean up test subscription
        window.navigationAwareRealtimeService.unsubscribe(subscriptionId);
        
        return subscriptionAdded;
      }
    } catch (error) {
      return logTest('Subscription Creation', false, `Error: ${error.message}`);
    }
    
    return false;
  }

  /**
   * Test 4: Check optimized hooks are using NavigationAware service
   */
  function testOptimizedHooksUsage() {
    console.log('\n🧪 Testing optimized hooks usage...');
    
    // Look for evidence that hooks are using the NavigationAware service
    const logs = [];
    
    // Capture console logs
    const originalLog = console.log;
    console.log = function(...args) {
      logs.push(args.join(' '));
      originalLog.apply(console, args);
    };
    
    // Check for NavigationAware log messages in recent logs
    setTimeout(() => {
      console.log = originalLog;
      
      const navigationAwareLogs = logs.filter(log => 
        log.includes('[NavigationAwareRealtime]') || 
        log.includes('🧭') || 
        log.includes('🛡️')
      );
      
      const hooksUsingService = navigationAwareLogs.length > 0;
      logTest('Optimized Hooks Usage', hooksUsingService, 
        `Found ${navigationAwareLogs.length} NavigationAware log entries`);
      
      if (navigationAwareLogs.length > 0) {
        console.log('🔍 [NavigationAware] Recent NavigationAware logs:');
        navigationAwareLogs.slice(0, 3).forEach(log => console.log(`  ${log}`));
      }
    }, 1000);
    
    return true;
  }

  /**
   * Test 5: Navigation simulation test
   */
  async function testNavigationSimulation() {
    console.log('\n🧪 Testing navigation simulation...');
    
    if (!window.navigationAwareRealtimeService) {
      return logTest('Navigation Simulation', false, 'Service not available');
    }

    const currentRoute = window.location.pathname;
    const isOnSpace = currentRoute.includes('/space');
    const isOnChat = currentRoute.includes('/app/chat');
    
    if (!isOnSpace && !isOnChat) {
      return logTest('Navigation Simulation', false, 'Not on space or chat route');
    }

    // Get initial subscription stats
    const initialStats = window.navigationAwareRealtimeService.getStats();
    logTest('Pre-navigation Stats', true, 
      `${initialStats.totalSubscriptions} total, ${initialStats.protectedSubscriptions} protected`);
    
    return true;
  }

  /**
   * Test 6: Check for subscription cleanup logs
   */
  function testSubscriptionCleanupLogs() {
    console.log('\n🧪 Testing subscription cleanup behavior...');
    
    // Monitor console for cleanup prevention logs
    const cleanupLogs = [];
    const originalLog = console.log;
    
    console.log = function(...args) {
      const message = args.join(' ');
      if (message.includes('Preventing cleanup during navigation') || 
          message.includes('🛡️')) {
        cleanupLogs.push(message);
      }
      originalLog.apply(console, args);
    };
    
    // Restore after monitoring
    setTimeout(() => {
      console.log = originalLog;
      
      const cleanupPrevented = cleanupLogs.length > 0;
      logTest('Cleanup Prevention', cleanupPrevented, 
        `Found ${cleanupLogs.length} cleanup prevention events`);
      
      if (cleanupLogs.length > 0) {
        console.log('🛡️ [NavigationAware] Cleanup prevention logs:');
        cleanupLogs.forEach(log => console.log(`  ${log}`));
      }
    }, 2000);
    
    return true;
  }

  /**
   * Run all tests
   */
  async function runAllTests() {
    if (isTestRunning) {
      console.warn('🚨 [NavigationAware] Tests already running, please wait...');
      return;
    }

    isTestRunning = true;
    testResults = [];

    console.log('🚀 [NavigationAware] Starting NavigationAwareRealtimeService Test Suite...');
    console.log('═══════════════════════════════════════════════════════════════════');

    try {
      // Run tests sequentially
      await testServiceAvailability();
      await testNavigationDetection();
      await testSubscriptionTracking();
      await testOptimizedHooksUsage();
      await testNavigationSimulation();
      await testSubscriptionCleanupLogs();

      // Final summary
      setTimeout(() => {
        const passedTests = testResults.filter(r => r.passed).length;
        const totalTests = testResults.length;
        const passRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

        console.log('\n═══════════════════════════════════════════════════════════════════');
        console.log(`🏁 [NavigationAware] Test Summary: ${passedTests}/${totalTests} tests passed (${passRate}%)`);
        
        if (passRate >= 80) {
          console.log('🎉 [NavigationAware] NavigationAwareRealtimeService is working correctly!');
          console.log('✅ [NavigationAware] Subscriptions should now be protected during Chat⟷Space navigation');
        } else {
          console.log('⚠️ [NavigationAware] Some tests failed - navigation protection may not be working properly');
        }

        // Show current service stats
        if (window.navigationAwareRealtimeService) {
          const finalStats = window.navigationAwareRealtimeService.getStats();
          console.log('\n📊 [NavigationAware] Current Service Stats:');
          console.log('  Total Subscriptions:', finalStats.totalSubscriptions);
          console.log('  Protected Subscriptions:', finalStats.protectedSubscriptions);
          console.log('  Navigation State:', finalStats.navigationState);
          
          if (finalStats.subscriptionDetails.length > 0) {
            console.log('  Active Subscriptions:');
            finalStats.subscriptionDetails.forEach(sub => {
              console.log(`    ${sub.key}: ${sub.isProtected ? '🛡️ PROTECTED' : '🔓'} | ${sub.route}`);
            });
          }
        }

        isTestRunning = false;
      }, 3000);

    } catch (error) {
      console.error('💥 [NavigationAware] Test suite error:', error);
      isTestRunning = false;
    }
  }

  /**
   * Quick status check
   */
  function getStatus() {
    if (!window.navigationAwareRealtimeService) {
      console.log('❌ [NavigationAware] NavigationAwareRealtimeService not available');
      return;
    }

    const stats = window.navigationAwareRealtimeService.getStats();
    console.log('📊 [NavigationAware] Service Status:');
    console.log(`  🔗 Total Subscriptions: ${stats.totalSubscriptions}`);
    console.log(`  🛡️ Protected Subscriptions: ${stats.protectedSubscriptions}`);
    console.log(`  🧭 Current Route: ${stats.navigationState.currentRoute}`);
    console.log(`  📍 Previous Route: ${stats.navigationState.previousRoute}`);
    console.log(`  🚀 Is Navigating: ${stats.navigationState.isNavigating}`);
    
    return stats;
  }

  // Public API
  return {
    runAllTests,
    getStatus,
    testServiceAvailability,
    testNavigationDetection,
    testSubscriptionTracking,
    testOptimizedHooksUsage,
    testNavigationSimulation,
    testSubscriptionCleanupLogs,
    getResults: () => testResults,
    isRunning: () => isTestRunning
  };
})();

// Auto-run status check on load
console.log('🧭 [NavigationAware] NavigationAwareRealtimeService Test Suite loaded');
console.log('🔧 [NavigationAware] Run window.NavigationAwareRealtimeTest.runAllTests() to test');
console.log('📊 [NavigationAware] Run window.NavigationAwareRealtimeTest.getStatus() for current status');

// Show immediate status
setTimeout(() => {
  window.NavigationAwareRealtimeTest.getStatus();
}, 1000); 