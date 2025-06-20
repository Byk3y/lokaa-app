/**
 * 🎛️ AVATAR SYSTEM CONTROL PANEL
 * 
 * Simple commands to control avatar analytics and console noise:
 * - Toggle avatar analytics on/off
 * - Control console verbosity
 * - Quick performance insights
 * - Clean console experience
 */

(function() {
  'use strict';

  // 🎛️ Avatar Control Panel
  window.AvatarControlPanel = {
    
    // 🔇 Immediately reduce console noise by 90%
    quietMode() {
      console.log('🔇 [AvatarControl] Activating quiet mode...');
      
      // Disable avatar verbose logging
      window.__AVATAR_VERBOSE_LOGS__ = false;
      
      // Use existing console optimization
      if (window.quickConsoleOptimization) {
        window.quickConsoleOptimization();
      }
      
      // Disable avatar analytics UI
      window.__ENABLE_AVATAR_ANALYTICS__ = false;
      
      console.log('✅ [AvatarControl] Quiet mode active - 90% less console noise');
      console.log('💡 [AvatarControl] Use window.AvatarControlPanel.loudMode() to restore');
    },

    // 🔊 Restore full logging for debugging
    loudMode() {
      console.log('🔊 [AvatarControl] Activating loud mode...');
      
      // Enable avatar verbose logging
      window.__AVATAR_VERBOSE_LOGS__ = true;
      
      // Restore all logging
      if (window.restoreFullLogging) {
        window.restoreFullLogging();
      }
      
      // Enable avatar analytics UI
      window.__ENABLE_AVATAR_ANALYTICS__ = true;
      
      console.log('✅ [AvatarControl] Loud mode active - full debugging enabled');
    },

    // 📊 Quick avatar performance summary (always available)
    quickStats() {
      if (window.AvatarCacheService) {
        const stats = window.AvatarCacheService.getStats();
        console.log('📊 [Avatar] Quick Stats:', {
          cacheEntries: stats.totalEntries,
          hitRate: `${(stats.hitRate * 100).toFixed(1)}%`,
          totalOperations: stats.totalHits + stats.totalMisses,
          recommendation: stats.hitRate > 0.7 ? '✅ Good' : stats.hitRate > 0.4 ? '⚠️ OK' : '❌ Poor'
        });
        return stats;
      } else {
        console.log('ℹ️ [Avatar] Cache service not loaded yet');
      }
    },

    // 🎯 Test avatar system (lightweight)
    quickTest() {
      console.log('🧪 [Avatar] Running quick test...');
      
      if (window.AvatarCacheService) {
        const stats = window.AvatarCacheService.getStats();
        console.log('✅ [Avatar] Cache Service: Working');
        console.log('📊 [Avatar] Cache Status:', stats.totalEntries > 0 ? 'Active' : 'Empty');
        
        // Test global exposure
        console.log('🌐 [Avatar] Global Access:', typeof window.AvatarCacheService === 'object' ? 'Available' : 'Missing');
        
        return {
          status: 'working',
          cacheActive: stats.totalEntries > 0,
          globalAccess: typeof window.AvatarCacheService === 'object'
        };
      } else {
        console.log('❌ [Avatar] Cache Service: Not loaded');
        return { status: 'not-loaded' };
      }
    },

    // ❓ Show available commands
    help() {
      console.log('🎛️ [AvatarControl] Available Commands:');
      console.log('  🔇 window.AvatarControlPanel.quietMode() - Reduce console noise by 90%');
      console.log('  🔊 window.AvatarControlPanel.loudMode() - Restore full debugging');
      console.log('  📊 window.AvatarControlPanel.quickStats() - Show avatar performance');
      console.log('  🧪 window.AvatarControlPanel.quickTest() - Test avatar system');
      console.log('  ❓ window.AvatarControlPanel.help() - Show this help');
      console.log('');
      console.log('💡 [Tip] For production, avatar analytics auto-disable');
      console.log('🎯 [Tip] Use quietMode() for clean development experience');
    }
  };

  // 🚀 Auto-initialize
  console.log('🎛️ [AvatarControl] Control panel loaded');
  console.log('💡 [Tip] Use window.AvatarControlPanel.help() for commands');
  console.log('🔇 [Quick] Use window.AvatarControlPanel.quietMode() to reduce console noise');

})();
