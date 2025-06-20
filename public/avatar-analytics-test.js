/**
 * 🧪 AVATAR ANALYTICS TEST
 * Quick test to verify the avatar performance dashboard is working
 */

(function() {
  'use strict';

  window.TestAvatarAnalytics = {
    // 🧪 Test if avatar analytics button works
    testButton() {
      console.log('🧪 [Test] Testing avatar analytics button...');
      
      // Check if AvatarCacheService is available
      if (window.AvatarCacheService) {
        console.log('✅ [Test] AvatarCacheService loaded');
        
        // Get stats to test functionality
        const stats = window.AvatarCacheService.getStats();
        console.log('📊 [Test] Cache stats:', stats);
        
        // Test performance test
        window.AvatarCacheService.runPerformanceTest();
        
        return {
          status: 'success',
          cacheLoaded: true,
          stats: stats
        };
      } else {
        console.log('❌ [Test] AvatarCacheService not found');
        return {
          status: 'error',
          cacheLoaded: false
        };
      }
    },

    // 🎯 Quick validation
    validate() {
      console.log('🎯 [Test] Validating avatar system...');
      
      const checks = {
        cacheService: !!window.AvatarCacheService,
        controlPanel: !!window.AvatarControlPanel,
        quietMode: typeof window.AvatarControlPanel?.quietMode === 'function',
        stats: typeof window.AvatarControlPanel?.quickStats === 'function'
      };
      
      console.log('✅ [Test] Validation results:', checks);
      
      const allPassed = Object.values(checks).every(Boolean);
      console.log(allPassed ? '✅ [Test] All checks passed!' : '❌ [Test] Some checks failed');
      
      return { checks, allPassed };
    }
  };

  console.log('🧪 [AvatarTest] Test utilities loaded');
  console.log('💡 [Tip] Use window.TestAvatarAnalytics.testButton() to test');
  console.log('🎯 [Tip] Use window.TestAvatarAnalytics.validate() to validate');

})();
