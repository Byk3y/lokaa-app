/**
 * 🚀 Avatar Instant Display Test
 * Test the optimized avatar system for instant space switching
 */

(function() {
  'use strict';

  window.AvatarInstantDisplayTest = {
    
    // Test instant avatar display optimization
    testInstantDisplay() {
      console.log('🧪 [Avatar Test] Testing instant display optimization...');
      
      if (window.AvatarCacheService) {
        const stats = window.AvatarCacheService.getStats();
        console.log('📊 [Avatar Test] Cache Stats:', stats);
        
        if (stats.hitRate > 0.6) {
          console.log('✅ [Avatar Test] Excellent cache performance! Hit rate:', stats.hitRate);
        } else if (stats.hitRate > 0.3) {
          console.log('⚡ [Avatar Test] Good cache performance! Hit rate:', stats.hitRate);
        } else {
          console.log('🔄 [Avatar Test] Cache warming up... Hit rate:', stats.hitRate);
        }
        
        return {
          status: 'success',
          cachePerformance: stats.hitRate > 0.6 ? 'excellent' : stats.hitRate > 0.3 ? 'good' : 'warming',
          stats: stats
        };
      } else {
        console.log('❌ [Avatar Test] AvatarCacheService not available');
        return { status: 'error', message: 'Service not found' };
      }
    },
    
    // Monitor space switching performance
    monitorSpaceSwitching() {
      console.log('👁️ [Avatar Test] Monitoring space switching performance...');
      
      let switchCount = 0;
      let totalLoadTime = 0;
      
      // Hook into console logs to catch avatar cache messages
      const originalLog = console.log;
      console.log = function(...args) {
        const message = args.join(' ');
        
        if (message.includes('[AvatarCache] INSTANT complete')) {
          switchCount++;
          const timeMatch = message.match(/\((\d+)ms\)/);
          if (timeMatch) {
            const loadTime = parseInt(timeMatch[1]);
            totalLoadTime += loadTime;
            console.log(`⚡ [Avatar Test] Switch ${switchCount}: ${loadTime}ms (avg: ${Math.round(totalLoadTime/switchCount)}ms)`);
          }
        }
        
        return originalLog.apply(console, args);
      };
      
      return {
        stop() {
          console.log = originalLog;
          console.log(`📊 [Avatar Test] Monitoring stopped. ${switchCount} switches, avg time: ${switchCount ? Math.round(totalLoadTime/switchCount) : 0}ms`);
        }
      };
    },
    
    // Run comprehensive test
    runComprehensiveTest() {
      console.log('🧪 [Avatar Test] Running comprehensive instant display test...');
      
      const displayTest = this.testInstantDisplay();
      const monitor = this.monitorSpaceSwitching();
      
      setTimeout(() => {
        monitor.stop();
      }, 30000); // Monitor for 30 seconds
      
      return {
        displayTest,
        monitor,
        instructions: 'Test is running! Switch between spaces using the space switcher to see performance metrics.'
      };
    }
  };

  // Auto-expose when loaded
  console.log('🧪 [Avatar Test] Instant display test utilities loaded');
  console.log('💡 [Tip] Use window.AvatarInstantDisplayTest.runComprehensiveTest() to test');

})();
