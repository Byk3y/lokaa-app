/**
 * Chat→Home Rerendering Diagnostic Script
 * 
 * Monitors the complete rerendering issue when navigating from chat to home
 */

window.chatHomeRerenderDiagnostic = (function() {
  'use strict';

  console.log('🔍 Chat→Home Rerender Diagnostic Loading...');

  let navigationLog = [];
  let componentMountLog = [];
  let subscriptionLog = [];
  let isMonitoring = false;

  /**
   * Monitor navigation rerendering behavior
   */
  function startMonitoring() {
    console.log('\n🎯 STARTING CHAT→HOME RERENDER MONITORING');
    console.log('========================================');
    
    isMonitoring = true;
    navigationLog = [];
    componentMountLog = [];
    subscriptionLog = [];

    // Override console.log to capture specific events
    const originalLog = console.log;
    console.log = function(...args) {
      if (isMonitoring) {
        const message = args.join(' ');
        
        // Track navigation events
        if (message.includes('Route change tracked') || 
            message.includes('🔄 [BottomNav] Navigating')) {
          navigationLog.push({
            timestamp: Date.now(),
            message: message,
            type: 'navigation'
          });
        }
        
        // Track component mounting/unmounting
        if (message.includes('Component unmounting') || 
            message.includes('Rendered with state') ||
            message.includes('SpaceShellLayout') ||
            message.includes('ChatContainer') ||
            message.includes('FeedTab')) {
          componentMountLog.push({
            timestamp: Date.now(),
            message: message,
            type: 'component'
          });
        }
        
        // Track subscription events
        if (message.includes('Cleaning up subscription') || 
            message.includes('Setting up subscription') ||
            message.includes('New subscription created') ||
            message.includes('Subscription status')) {
          subscriptionLog.push({
            timestamp: Date.now(),
            message: message,
            type: 'subscription'
          });
        }
      }
      
      return originalLog.apply(console, args);
    };

    // Restore after 30 seconds
    setTimeout(() => {
      console.log = originalLog;
      console.log('🔍 Monitoring stopped after 30 seconds');
    }, 30000);

    console.log('✅ Monitoring active for 30 seconds');
    console.log('📋 Navigate: Chat → Home to capture the issue');
    console.log('📋 Then run: window.chatHomeRerenderDiagnostic.analyzeLogs()');
  }

  /**
   * Analyze captured logs for rerendering patterns
   */
  function analyzeLogs() {
    console.log('\n📊 CHAT→HOME RERENDER ANALYSIS');
    console.log('===============================');
    
    if (!navigationLog.length && !componentMountLog.length && !subscriptionLog.length) {
      console.log('❌ No logs captured. Run startMonitoring() first and navigate Chat→Home');
      return;
    }

    // Analyze navigation flow
    console.log('\n🧭 NAVIGATION FLOW:');
    navigationLog.forEach((entry, index) => {
      const timestamp = new Date(entry.timestamp).toTimeString().split(' ')[0];
      console.log(`${index + 1}. [${timestamp}] ${entry.message}`);
    });

    // Analyze component lifecycle
    console.log('\n🔄 COMPONENT LIFECYCLE:');
    componentMountLog.forEach((entry, index) => {
      const timestamp = new Date(entry.timestamp).toTimeString().split(' ')[0];
      console.log(`${index + 1}. [${timestamp}] ${entry.message}`);
    });

    // Analyze subscription churn
    console.log('\n📡 SUBSCRIPTION CHURN:');
    const cleanupCount = subscriptionLog.filter(log => log.message.includes('Cleaning up')).length;
    const setupCount = subscriptionLog.filter(log => log.message.includes('Setting up')).length;
    const newCount = subscriptionLog.filter(log => log.message.includes('New subscription')).length;
    
    console.log(`🗑️ Subscriptions cleaned up: ${cleanupCount}`);
    console.log(`🔧 Subscriptions set up: ${setupCount}`);
    console.log(`✨ New subscriptions created: ${newCount}`);
    
    if (cleanupCount > 0 && setupCount > 0) {
      console.log('\n🚨 SUBSCRIPTION CHURN DETECTED!');
      console.log('This indicates complete component unmount/remount during navigation');
    }

    // Show recent subscription events
    console.log('\n📋 Recent subscription events:');
    subscriptionLog.slice(-10).forEach((entry, index) => {
      const timestamp = new Date(entry.timestamp).toTimeString().split(' ')[0];
      console.log(`${index + 1}. [${timestamp}] ${entry.message}`);
    });

    // Provide diagnosis
    console.log('\n🎯 DIAGNOSIS:');
    if (cleanupCount > 10 && setupCount > 10) {
      console.log('❌ SEVERE: Complete real-time subscription teardown/recreation');
      console.log('❌ CAUSE: SpaceShellLayout unmount/remount during Chat→Home navigation');
      console.log('❌ IMPACT: All posts, comments, and real-time features rerender from scratch');
    } else if (cleanupCount > 0) {
      console.log('⚠️ MODERATE: Some subscription recreation detected');
    } else {
      console.log('✅ GOOD: No subscription churn detected');
    }

    return {
      navigationEvents: navigationLog.length,
      componentEvents: componentMountLog.length,
      subscriptionCleanups: cleanupCount,
      subscriptionSetups: setupCount,
      severityLevel: cleanupCount > 10 ? 'SEVERE' : cleanupCount > 0 ? 'MODERATE' : 'NONE'
    };
  }

  /**
   * Test the Chat→Home navigation flow
   */
  function testChatHomeFlow() {
    console.log('\n🧪 TESTING CHAT→HOME NAVIGATION FLOW');
    console.log('====================================');
    
    // Check current route
    const currentPath = window.location.pathname;
    console.log(`📍 Current path: ${currentPath}`);
    
    // Check if we're in SpaceShellLayout
    const spaceShellElement = document.querySelector('[data-space-shell]');
    const isInSpaceShell = !!spaceShellElement;
    console.log(`🏠 In SpaceShellLayout: ${isInSpaceShell}`);
    
    // Check for active subscriptions
    const hasRealtimeElements = document.querySelectorAll('[data-realtime-subscription]');
    console.log(`📡 Active realtime elements: ${hasRealtimeElements.length}`);
    
    // Check for post cards
    const postCards = document.querySelectorAll('[data-post-card], .post-card, [class*="PostCard"]');
    console.log(`📰 Post cards visible: ${postCards.length}`);
    
    // Check for category filters
    const categoryFilters = document.querySelectorAll('[data-category-filter], .category-filter, [class*="Category"]');
    console.log(`🏷️ Category filters visible: ${categoryFilters.length}`);

    const diagnosis = {
      currentPath,
      isInSpaceShell,
      activeSubscriptions: hasRealtimeElements.length,
      visiblePosts: postCards.length,
      visibleCategories: categoryFilters.length,
      expectedBehavior: 'Posts and categories should NOT rerender when returning from chat',
      actualBehavior: 'Complete rerendering occurs due to component unmount/remount'
    };

    console.log('\n📊 Test Results:', diagnosis);
    return diagnosis;
  }

  /**
   * Get architectural analysis
   */
  function getArchitecturalAnalysis() {
    console.log('\n🏗️ ARCHITECTURAL ANALYSIS');
    console.log('=========================');
    
    console.log('🔍 Current Component Architecture:');
    console.log('├── /app/chat (ChatPage) - OUTSIDE SpaceShellLayout');
    console.log('└── /space-name/space (SpacePage) - INSIDE SpaceShellLayout');
    console.log('');
    console.log('🚨 Problem: Different component trees cause complete unmount/remount');
    console.log('');
    console.log('💡 Solutions:');
    console.log('1. Move ChatPage INSIDE SpaceShellLayout');
    console.log('2. Create persistent subscription manager');
    console.log('3. Implement component-level caching');
    console.log('4. Use React.memo() and stable refs for heavy components');
    
    return {
      problem: 'ChatPage outside SpaceShellLayout',
      impact: 'Complete component tree remount',
      solutions: [
        'Move ChatPage inside SpaceShellLayout',
        'Persistent subscription manager',
        'Component-level caching',
        'React.memo optimization'
      ]
    };
  }

  // Public API
  return {
    startMonitoring,
    analyzeLogs,
    testChatHomeFlow,
    getArchitecturalAnalysis,
    
    // Quick commands
    quickTest: function() {
      console.log('🚀 Running quick Chat→Home flow test...');
      const result = testChatHomeFlow();
      getArchitecturalAnalysis();
      return result;
    },
    
    fullDiagnostic: function() {
      console.log('🔍 Running full diagnostic...');
      startMonitoring();
      console.log('');
      console.log('⏭️ Now navigate: Chat → Home → run analyzeLogs()');
    }
  };
})();

// Auto-initialize
console.log('✅ Chat→Home Rerender Diagnostic Loaded');
console.log('📋 Available commands:');
console.log('• window.chatHomeRerenderDiagnostic.quickTest() - Quick analysis');
console.log('• window.chatHomeRerenderDiagnostic.fullDiagnostic() - Full monitoring');
console.log('• window.chatHomeRerenderDiagnostic.startMonitoring() - Start monitoring');
console.log('• window.chatHomeRerenderDiagnostic.analyzeLogs() - Analyze captured logs'); 