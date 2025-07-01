// Navigation Optimization Controls
window.navigationOptimization = {
  isQuietMode: false,
  
  /**
   * Enable quiet mode to reduce console noise during navigation testing
   */
  enableQuietMode() {
    this.isQuietMode = true;
    
    // Reduce navigation-aware realtime service logging
    if (window.navigationAwareRealtimeService) {
      const service = window.navigationAwareRealtimeService;
      
      // Override noisy console.log methods
      if (!service._originalLog) {
        service._originalLog = console.log;
        
        console.log = function(...args) {
          const message = args.join(' ');
          
          // Filter out noisy navigation logs during quiet mode
          if (window.navigationOptimization.isQuietMode) {
            if (message.includes('🧭 [NavigationAwareRealtime]') ||
                message.includes('🛡️ [NavigationAwareRealtime]') ||
                message.includes('🔔 [RealtimeSpaceCommentsOptimized]') ||
                message.includes('🔔 [RealtimeOptimized]') ||
                message.includes('🔔 [GlobalRealtime]')) {
              return; // Suppress these logs
            }
          }
          
          service._originalLog.apply(console, args);
        };
      }
    }
    
    console.log('🔇 [NavigationOptimization] Quiet mode enabled - reduced console noise');
  },
  
  /**
   * Disable quiet mode to restore full logging
   */
  disableQuietMode() {
    this.isQuietMode = false;
    
    if (window.navigationAwareRealtimeService && window.navigationAwareRealtimeService._originalLog) {
      console.log = window.navigationAwareRealtimeService._originalLog;
      delete window.navigationAwareRealtimeService._originalLog;
    }
    
    console.log('🔊 [NavigationOptimization] Quiet mode disabled - full logging restored');
  },
  
  /**
   * Get navigation service statistics
   */
  getNavigationStats() {
    if (!window.navigationAwareRealtimeService) {
      return { error: 'NavigationAwareRealtimeService not available' };
    }
    
    const stats = window.navigationAwareRealtimeService.getStats();
    console.log('📊 [NavigationOptimization] Current stats:', {
      totalSubscriptions: stats.totalSubscriptions,
      protectedSubscriptions: stats.protectedSubscriptions,
      isNavigating: stats.navigationState.isNavigating,
      currentRoute: stats.navigationState.currentRoute,
      previousRoute: stats.navigationState.previousRoute
    });
    
    return stats;
  },
  
  /**
   * Quick test of navigation optimization
   */
  quickTest() {
    console.log('🧪 [NavigationOptimization] Running quick test...');
    
    const stats = this.getNavigationStats();
    if (stats.error) {
      console.error('❌ NavigationAwareRealtimeService not available');
      return false;
    }
    
    console.log(`✅ ${stats.totalSubscriptions} total subscriptions, ${stats.protectedSubscriptions} protected`);
    
    // Test quiet mode
    this.enableQuietMode();
    console.log('🔔 [RealtimeOptimized] This log should be suppressed');
    this.disableQuietMode();
    console.log('🔔 [RealtimeOptimized] This log should appear');
    
    console.log('🎉 Navigation optimization quick test completed');
    return true;
  }
};

// Add Phase 1 PostDetailModal comment fix test
window.testPostDetailModalComments = function() {
  console.log('🎭 [Phase1Fix] Testing PostDetailModal comment loading...');
  
  // Check for modal presence
  const modal = document.querySelector('[role="dialog"]');
  if (!modal) {
    console.log('❌ No PostDetailModal found. Click on a post to open it.');
    return false;
  }
  
  console.log('✅ PostDetailModal detected');
  
  // Check for modal context bypass in console logs
  const originalLog = console.log;
  let modalContextDetected = false;
  
  console.log = (...args) => {
    if (args[0]?.includes('Modal context detected - allowing fetch')) {
      modalContextDetected = true;
    }
    originalLog.apply(console, args);
  };
  
  // Trigger a test fetch
  setTimeout(() => {
    console.log = originalLog;
    
    if (modalContextDetected) {
      console.log('✅ Modal context bypass working correctly');
    } else {
      console.log('ℹ️ Modal context bypass not detected (may already be cached)');
    }
    
    // Check for actual comments
    const comments = modal.querySelectorAll('.comment-item, [data-testid="comment"]');
    if (comments.length > 0) {
      console.log(`✅ Comments loaded: ${comments.length} comments found`);
      return true;
    } else {
      console.log('❌ No comments found in modal');
      return false;
    }
  }, 2000);
}; 