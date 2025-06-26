/**
 * Final Comment Fetch Fix Test
 * 
 * Tests that the expanded navigation-aware protection prevents
 * excessive comment fetching during initial space load
 */

window.FinalCommentFetchTest = (function() {
  'use strict';

  let commentFetchCount = 0;
  let protectedFetchCount = 0;
  let monitoringActive = false;
  let testStartTime = 0;

  function startMonitoring() {
    if (monitoringActive) return;
    
    console.log('%c🎯 Final Comment Fetch Test - Starting Monitoring', 'color: #10B981; font-weight: bold; font-size: 14px;');
    console.log('=====================================');
    
    monitoringActive = true;
    testStartTime = Date.now();
    commentFetchCount = 0;
    protectedFetchCount = 0;

    // Monitor console logs for comment fetches
    const originalLog = console.log;
    console.log = function(...args) {
      const message = args.join(' ');
      
      // Count actual comment fetches
      if (message.includes('🔔 [usePostComments] Fetching comments for post:') ||
          message.includes('🔔 [useComments] Fetching comments for post:')) {
        commentFetchCount++;
        console.error(`%c⚠️ FETCH #${commentFetchCount}: ${message}`, 'color: #EF4444; font-weight: bold;');
      }
      
      // Count protected/skipped fetches (this is what we want to see)
      else if (message.includes('🛡️') && message.includes('Skipping fetch for post') && 
               (message.includes('initial space load') || message.includes('recent navigation'))) {
        protectedFetchCount++;
        console.log(`%c✅ PROTECTED #${protectedFetchCount}: ${message}`, 'color: #10B981; font-weight: bold;');
      }
      
      // Call original log
      originalLog.apply(console, args);
    };

    // Auto-stop monitoring after 10 seconds
    setTimeout(() => {
      stopMonitoring();
    }, 10000);

    console.log('📊 Monitoring comment fetches for 10 seconds...');
    console.log('🛡️ GOOD: Look for "Skipping fetch" messages (protection working)');
    console.log('⚠️ BAD: Look for "Fetching comments" messages (should be minimal)');
  }

  function stopMonitoring() {
    if (!monitoringActive) return;
    
    monitoringActive = false;
    const testDuration = Date.now() - testStartTime;
    
    console.log('%c📊 Final Comment Fetch Test Results', 'color: #8B5CF6; font-weight: bold; font-size: 14px;');
    console.log('=====================================');
    console.log(`⏱️ Test Duration: ${Math.round(testDuration / 1000)}s`);
    console.log(`📊 Total Comment Fetches: ${commentFetchCount}`);
    console.log(`🛡️ Protected/Skipped Fetches: ${protectedFetchCount}`);
    
    // Evaluate results
    if (commentFetchCount === 0) {
      console.log('%c🎉 PERFECT! Zero comment fetches during test period', 'color: #10B981; font-weight: bold;');
    } else if (commentFetchCount <= 5) {
      console.log('%c✅ GOOD! Minimal comment fetches (≤5)', 'color: #10B981; font-weight: bold;');
    } else if (commentFetchCount <= 10) {
      console.log('%c⚠️ FAIR: Some comment fetches (6-10)', 'color: #F59E0B; font-weight: bold;');
    } else {
      console.log('%c❌ POOR: Many comment fetches (>10)', 'color: #EF4444; font-weight: bold;');
    }
    
    if (protectedFetchCount > 0) {
      console.log(`%c🛡️ Protection is working! ${protectedFetchCount} fetches were prevented`, 'color: #10B981; font-weight: bold;');
    } else {
      console.log('%c⚠️ No protection messages seen (might not be navigating)', 'color: #F59E0B; font-weight: bold;');
    }
    
    // Navigation state check
    if (window.navigationAwareRealtimeService) {
      const stats = window.navigationAwareRealtimeService.getStats();
      console.log('🧭 Navigation State:', {
        previousRoute: stats.navigationState.previousRoute,
        currentRoute: stats.navigationState.currentRoute,
        lastNavigation: new Date(stats.navigationState.lastNavigationTime).toLocaleTimeString(),
        protectedSubscriptions: stats.protectedSubscriptions
      });
    }
    
    // Recommendations
    console.log('\n🎯 RECOMMENDATIONS:');
    if (commentFetchCount > 10) {
      console.log('• Try refreshing the page and running the test again');
      console.log('• Navigate Chat → Home to trigger navigation protection');
    } else {
      console.log('• ✅ Comment fetch optimization is working well!');
    }
  }

  function runQuickTest() {
    console.log('%c🚀 Running Quick Comment Fetch Test', 'color: #3B82F6; font-weight: bold;');
    
    // Check current state
    const currentCommentElements = document.querySelectorAll('[data-comment-id], .comment-item');
    const currentPosts = document.querySelectorAll('.bg-white.border'); // PostCard selector
    
    console.log(`📊 Current State:`);
    console.log(`  • ${currentPosts.length} post cards visible`);
    console.log(`  • ${currentCommentElements.length} comment elements visible`);
    
    // Check navigation-aware service
    if (window.navigationAwareRealtimeService) {
      const stats = window.navigationAwareRealtimeService.getStats();
      const timeSinceNav = Date.now() - stats.navigationState.lastNavigationTime;
      console.log(`  • Navigation service: ✅ Active`);
      console.log(`  • Last navigation: ${Math.round(timeSinceNav / 1000)}s ago`);
      console.log(`  • Protected subscriptions: ${stats.protectedSubscriptions}`);
      
      if (timeSinceNav < 5000) {
        console.log('%c🛡️ Recent navigation detected - protection should be active', 'color: #10B981; font-weight: bold;');
      } else {
        console.log('%c⚠️ No recent navigation - protection may not be triggered', 'color: #F59E0B; font-weight: bold;');
      }
    } else {
      console.log(`  • Navigation service: ❌ Not available`);
    }
    
    // Start monitoring
    startMonitoring();
  }

  return {
    runQuickTest,
    startMonitoring,
    stopMonitoring,
    getStats: () => ({
      commentFetchCount,
      protectedFetchCount,
      monitoringActive,
      testDuration: monitoringActive ? Date.now() - testStartTime : 0
    })
  };
})();

// Auto-run on script load
console.log('%c🚀 Final Comment Fetch Test Available!', 'color: #3B82F6; font-weight: bold;');
console.log('Commands:');
console.log('• FinalCommentFetchTest.runQuickTest() - Run quick test');
console.log('• FinalCommentFetchTest.startMonitoring() - Start monitoring');
console.log('• FinalCommentFetchTest.stopMonitoring() - Stop and get results'); 