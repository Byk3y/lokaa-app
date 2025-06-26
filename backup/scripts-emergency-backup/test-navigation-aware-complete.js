/**
 * Complete Navigation-Aware Solution Test Suite
 * 
 * Tests both NavigationAwareRealtimeService AND navigation-aware hooks to verify:
 * 1. Subscription protection during Chat⟷Space navigation
 * 2. Fetch skipping for posts/comments during navigation
 * 3. Zero rerendering during navigation
 * 4. NO MORE VISUAL REAPPEARING ANIMATIONS (CRITICAL FIX)
 * 5. Tab component stability during navigation
 * 6. Proper cleanup after navigation settles
 */

window.CompleteNavigationTest = (function() {
  'use strict';

  let testResults = [];
  let isTestRunning = false;
  let navigationTestData = {
    beforeNavigation: {},
    duringNavigation: {},
    afterNavigation: {}
  };

  /**
   * Log test results with formatting
   */
  function logTest(testName, passed, details = '') {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const message = `[CompleteNavigationTest] ${status} ${testName}${details ? ': ' + details : ''}`;
    
    if (passed) {
      console.log(`%c${message}`, 'color: #10B981; font-weight: bold;');
    } else {
      console.error(`%c${message}`, 'color: #EF4444; font-weight: bold;');
    }
    
    testResults.push({ testName, passed, details, timestamp: Date.now() });
    return passed;
  }

  /**
   * Test 1: NavigationAwareRealtimeService is working
   */
  function testNavigationAwareService() {
    console.log('\n🧪 Testing NavigationAwareRealtimeService...');
    
    const serviceExists = typeof window.navigationAwareRealtimeService !== 'undefined';
    if (!serviceExists) {
      return logTest('NavigationAware Service', false, 'Service not available');
    }

    const stats = window.navigationAwareRealtimeService.getStats();
    const hasSubscriptions = stats.totalSubscriptions > 0;
    
    logTest('NavigationAware Service Available', true, `${stats.totalSubscriptions} subscriptions tracked`);
    logTest('Active Subscriptions', hasSubscriptions, `Found ${stats.totalSubscriptions} active subscriptions`);
    
    return true;
  }

  /**
   * Test 2: Check for motion.div elements that could cause reappearing
   */
  function testForMotionElements() {
    console.log('\n🎭 Testing for Motion Elements (should be eliminated)...');
    
    // Check PostCard components for motion elements
    const postCards = document.querySelectorAll('[class*="PostCard"], .space-y-4 > div[class*="relative bg-white"]');
    let foundMotionElements = 0;
    
    postCards.forEach(card => {
      // Check if the element has motion-related attributes
      if (card.style.transform || card.classList.toString().includes('motion') || card.hasAttribute('data-motion')) {
        foundMotionElements++;
      }
    });
    
    const hasMotionElements = foundMotionElements > 0;
    logTest('Motion Elements Eliminated', !hasMotionElements, `Found ${foundMotionElements} motion elements`);
    
    // Check for CSS animations that might cause reappearing
    const elementsWithAnimations = document.querySelectorAll('[style*="opacity: 0"], [style*="transform: translate"]');
    const hasInitialAnimations = elementsWithAnimations.length > 0;
    logTest('Initial Animation States', !hasInitialAnimations, `Found ${elementsWithAnimations.length} elements with initial animation states`);
    
    return !hasMotionElements && !hasInitialAnimations;
  }

  /**
   * Test 3: Capture navigation state before test
   */
  function captureBeforeNavigationState() {
    console.log('\n📊 Capturing before-navigation state...');
    
    if (window.navigationAwareRealtimeService) {
      const stats = window.navigationAwareRealtimeService.getStats();
      navigationTestData.beforeNavigation = {
        subscriptions: stats.totalSubscriptions,
        protectedSubscriptions: stats.protectedSubscriptions,
        currentRoute: stats.navigationState.currentRoute,
        timestamp: Date.now()
      };
      
      logTest('Before State Captured', true, 
        `${stats.totalSubscriptions} subscriptions, route: ${stats.navigationState.currentRoute}`);
    }

    // Capture tab component state
    const tabComponents = window.globalTabComponentManager ? 
      window.globalTabComponentManager.getComponentCount() : 0;
    navigationTestData.beforeNavigation.tabComponents = tabComponents;
    
    logTest('Before Tab Components', true, `${tabComponents} components cached`);
    
    return true;
  }

  /**
   * Test 4: Monitor for visual reappearing animations
   */
  function monitorVisualReappearing() {
    console.log('\n🎯 Setting up visual reappearing monitor...');
    
    let reappearingDetected = false;
    let reappearingCount = 0;
    
    // Monitor for CSS opacity changes that indicate reappearing
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          const target = mutation.target;
          if (target.style && target.style.opacity === '0') {
            // Element is becoming transparent - potential reappearing start
            setTimeout(() => {
              if (target.style.opacity === '1' || target.style.opacity === '') {
                reappearingDetected = true;
                reappearingCount++;
                console.warn('🚨 [ReappearingMonitor] Detected reappearing animation on element:', target);
              }
            }, 50);
          }
        }
      });
    });
    
    // Monitor all post card containers
    const postContainers = document.querySelectorAll('.space-y-4, [class*="PostCard"]');
    postContainers.forEach(container => {
      observer.observe(container, { 
        attributes: true, 
        subtree: true, 
        attributeFilter: ['style'] 
      });
    });
    
    // Store observer for cleanup
    window.CompleteNavigationTest.visualObserver = observer;
    window.CompleteNavigationTest.getReappearingData = () => ({ 
      detected: reappearingDetected, 
      count: reappearingCount 
    });
    
    logTest('Visual Reappearing Monitor Setup', true, 'Monitoring for opacity changes and animations');
    return true;
  }

  /**
   * Test 5: Monitor tab component stability
   */
  function monitorTabStability() {
    console.log('\n🧭 Setting up tab component stability monitoring...');
    
    let tabRecreations = 0;
    let componentCountBefore = window.globalTabComponentManager ? 
      window.globalTabComponentManager.getComponentCount() : 0;
    
    // Monitor tab component recreations
    const originalLog = console.log;
    const componentCreationLogs = [];
    
    console.log = function(...args) {
      const message = args.join(' ');
      if (message.includes('🔧 [useTabManager] Tab creation effect:') || 
          message.includes('✅ [useTabManager] Successfully created/retrieved')) {
        componentCreationLogs.push(message);
        if (message.includes('Successfully created/retrieved feed component')) {
          tabRecreations++;
        }
      }
      originalLog.apply(console, args);
    };
    
    // Store original console.log for restoration
    window.CompleteNavigationTest.originalConsoleLog = originalLog;
    window.CompleteNavigationTest.getTabStabilityData = () => ({ 
      recreations: tabRecreations, 
      logs: componentCreationLogs,
      componentCountBefore,
      componentCountAfter: window.globalTabComponentManager ? 
        window.globalTabComponentManager.getComponentCount() : 0
    });
    
    logTest('Tab Stability Monitor Setup', true, 'Monitoring for component recreation');
    return true;
  }

  /**
   * Test 6: Monitor fetch prevention during navigation
   */
  function monitorFetchPrevention() {
    console.log('\n🛡️ Setting up fetch prevention monitoring...');
    
    // Monitor console logs for fetch skipping
    const fetchSkippedLogs = [];
    const unwantedFetchLogs = [];
    
    const originalLog = console.log;
    console.log = function(...args) {
      const message = args.join(' ');
      if (message.includes('🛡️ [usePostComments] Skipping fetch') || 
          message.includes('🛡️ [useComments] Skipping fetch')) {
        fetchSkippedLogs.push(message);
      }
      if (message.includes('🔔 [usePostComments] Fetching comments') || 
          message.includes('🔔 [RealtimeOptimized]')) {
        unwantedFetchLogs.push(message);
      }
      if (window.CompleteNavigationTest.originalConsoleLog) {
        window.CompleteNavigationTest.originalConsoleLog.apply(console, args);
      } else {
        originalLog.apply(console, args);
      }
    };
    
    window.CompleteNavigationTest.getFetchPreventionData = () => ({ 
      skipped: fetchSkippedLogs, 
      unwanted: unwantedFetchLogs 
    });
    
    logTest('Fetch Prevention Monitor Setup', true, 'Monitoring for unwanted fetches');
    return true;
  }

  /**
   * Test 7: Monitor subscription protection
   */
  function monitorSubscriptionProtection() {
    console.log('\n🛡️ Setting up subscription protection monitoring...');
    
    const protectionLogs = [];
    const cleanupLogs = [];
    
    const originalLog = console.log;
    console.log = function(...args) {
      const message = args.join(' ');
      if (message.includes('🛡️ [NavigationAwareRealtime] Protected subscription')) {
        protectionLogs.push(message);
      }
      if (message.includes('🔔 [RealtimeOptimized] Cleaning up subscription')) {
        cleanupLogs.push(message);
      }
      if (window.CompleteNavigationTest.originalConsoleLog) {
        window.CompleteNavigationTest.originalConsoleLog.apply(console, args);
      } else {
        originalLog.apply(console, args);
      }
    };
    
    window.CompleteNavigationTest.getSubscriptionProtectionData = () => ({ 
      protected: protectionLogs, 
      cleaned: cleanupLogs 
    });
    
    logTest('Subscription Protection Monitor Setup', true, 'Monitoring for unwanted subscription cleanup');
    return true;
  }

  /**
   * Validate all test results
   */
  function validateResults() {
    console.log('\n📊 VALIDATING NAVIGATION TEST RESULTS');
    console.log('=====================================');
    
    // Stop monitoring
    if (window.CompleteNavigationTest.visualObserver) {
      window.CompleteNavigationTest.visualObserver.disconnect();
    }
    
    // Restore console.log
    if (window.CompleteNavigationTest.originalConsoleLog) {
      console.log = window.CompleteNavigationTest.originalConsoleLog;
    }
    
    // Get all monitoring data
    const reappearingData = window.CompleteNavigationTest.getReappearingData ? 
      window.CompleteNavigationTest.getReappearingData() : { detected: false, count: 0 };
    
    const tabStabilityData = window.CompleteNavigationTest.getTabStabilityData ? 
      window.CompleteNavigationTest.getTabStabilityData() : { recreations: 0 };
    
    const fetchData = window.CompleteNavigationTest.getFetchPreventionData ? 
      window.CompleteNavigationTest.getFetchPreventionData() : { skipped: [], unwanted: [] };
    
    const subscriptionData = window.CompleteNavigationTest.getSubscriptionProtectionData ? 
      window.CompleteNavigationTest.getSubscriptionProtectionData() : { protected: [], cleaned: [] };
    
    // Validate results
    const visualReappearingPassed = !reappearingData.detected;
    const tabStabilityPassed = tabStabilityData.recreations === 0;
    const fetchPreventionPassed = fetchData.skipped.length > 0 && fetchData.unwanted.length === 0;
    const subscriptionProtectionPassed = subscriptionData.protected.length > 0 && subscriptionData.cleaned.length === 0;
    
    // Log detailed results
    logTest('🎯 NO VISUAL REAPPEARING', visualReappearingPassed, 
      `Detected: ${reappearingData.detected}, Count: ${reappearingData.count}`);
    
    logTest('🧭 Tab Component Stability', tabStabilityPassed, 
      `Recreations: ${tabStabilityData.recreations}, Components: ${tabStabilityData.componentCountBefore} → ${tabStabilityData.componentCountAfter}`);
    
    logTest('🛡️ Fetch Prevention Active', fetchPreventionPassed, 
      `Skipped: ${fetchData.skipped.length}, Unwanted: ${fetchData.unwanted.length}`);
    
    logTest('🛡️ Subscription Protection Active', subscriptionProtectionPassed, 
      `Protected: ${subscriptionData.protected.length}, Cleaned: ${subscriptionData.cleaned.length}`);
    
    // Overall results
    const allTestsPassed = visualReappearingPassed && tabStabilityPassed && fetchPreventionPassed && subscriptionProtectionPassed;
    
    console.log('\n🎯 FINAL RESULTS:');
    console.log('================');
    
    if (allTestsPassed) {
      console.log('%c🎉 ALL TESTS PASSED! Navigation reappearing issue FIXED!', 'color: #10B981; font-weight: bold; font-size: 16px;');
      console.log('%c✅ No visual reappearing animations detected', 'color: #10B981;');
      console.log('%c✅ Tab components remain stable during navigation', 'color: #10B981;');
      console.log('%c✅ Fetch prevention working correctly', 'color: #10B981;');
      console.log('%c✅ Subscription protection active', 'color: #10B981;');
    } else {
      console.log('%c❌ SOME TESTS FAILED - Navigation issues may persist', 'color: #EF4444; font-weight: bold; font-size: 16px;');
      console.log('Check individual test results above for details.');
    }
    
    return allTestsPassed;
  }

  /**
   * Run the complete test suite
   */
  function runAllTests() {
    console.log('%c🧪 Starting Complete Navigation-Aware Solution Test', 'color: #3B82F6; font-weight: bold; font-size: 16px;');
    console.log('=====================================');
    
    testResults = [];
    isTestRunning = true;
    
    try {
      // Run all test phases
      testNavigationAwareService();
      testForMotionElements();
      captureBeforeNavigationState();
      monitorVisualReappearing();
      monitorTabStability();
      monitorFetchPrevention();
      monitorSubscriptionProtection();
      
      console.log('\n🚀 MANUAL TEST INSTRUCTIONS:');
      console.log('=====================================');
      console.log('1. Navigate to Chat tab/overlay');
      console.log('2. Wait 2 seconds');
      console.log('3. Navigate back to Home/Feed tab');
      console.log('4. Wait 2 seconds');
      console.log('5. Run: CompleteNavigationTest.validateResults()');
      console.log('\n⏱️  You have 30 seconds to complete the test...');
      
      // Auto-timeout after 30 seconds
      setTimeout(() => {
        if (isTestRunning) {
          console.log('\n⏰ Test timeout reached. Running validation...');
          validateResults();
          isTestRunning = false;
        }
      }, 30000);
      
    } catch (error) {
      console.error('❌ Test execution failed:', error);
      isTestRunning = false;
    }
  }

  /**
   * Public API
   */
  return {
    runAllTests,
    validateResults,
    getTestResults: () => testResults,
    isRunning: () => isTestRunning,
    
    // Individual test functions
    testNavigationAwareService,
    testForMotionElements,
    captureBeforeNavigationState,
    monitorVisualReappearing,
    monitorTabStability,
    monitorFetchPrevention,
    monitorSubscriptionProtection
  };
})();

console.log('🧪 Complete Navigation Test Suite loaded');
console.log('📖 Usage:');
console.log('  - CompleteNavigationTest.runAllTests() - Run complete test');
console.log('  - CompleteNavigationTest.validateResults() - Manual validation');
console.log('  - CompleteNavigationTest.getTestResults() - Get test results');
console.log('');
console.log('🎯 This test specifically checks for elimination of visual reappearing animations');
console.log('   (the fix for visual "reappearing" during navigation)');