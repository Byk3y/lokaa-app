/**
 * Quick Phase 1 Test: GlobalRealtimeService Migration
 * 
 * Tests the first migrated hook to verify subscription pooling is working
 */

window.phase1Test = {
  
  /**
   * Quick status check
   */
  checkStatus() {
    console.log(`\n🧪 PHASE 1 MIGRATION STATUS CHECK\n`);
    
    // Check if GlobalRealtimeService is available
    const hasService = !!window.globalRealtimeService;
    console.log(`📊 GlobalRealtimeService: ${hasService ? '✅ Available' : '❌ Missing'}`);
    
    if (hasService) {
      const stats = window.globalRealtimeService.getStats();
      console.log(`📊 Current subscriptions: ${stats.totalSubscriptions}`);
      console.log(`📊 Total ref count: ${stats.totalRefCount}`);
      
      if (stats.totalSubscriptions > 0) {
        console.log(`🎯 SUCCESS: Subscriptions are active!`);
        
        // Show subscription details
        const subscriptions = window.globalRealtimeService.listSubscriptions();
        console.log(`📋 Active subscriptions:`, subscriptions);
        
        if (stats.totalRefCount > stats.totalSubscriptions) {
          console.log(`🏆 EXCELLENT: Subscription pooling working! (${stats.totalRefCount} refs sharing ${stats.totalSubscriptions} channels)`);
        } else {
          console.log(`⚠️  Single-use subscriptions. Navigate between spaces to see pooling.`);
        }
      } else {
        console.log(`📝 INFO: No active subscriptions yet. Navigate to a space to test.`);
      }
    }
    
    console.log(`\n🔄 NEXT STEPS:\n1. Navigate Chat → Home → Chat\n2. Watch for "[RealtimeOptimized]" logs\n3. Run: window.phase1Test.monitorImprovement()`);
  },
  
  /**
   * Monitor for improvements during navigation
   */
  monitorImprovement() {
    console.log('🎯 Starting improvement monitoring...');
    
    const originalLog = console.log;
    const improvements = {
      optimizedCalls: 0,
      reusedSubscriptions: 0,
      newSubscriptions: 0,
      startTime: Date.now()
    };
    
    console.log = function(...args) {
      const message = args.join(' ');
      
      // Track our optimized hook calls
      if (message.includes('[RealtimeOptimized]')) {
        improvements.optimizedCalls++;
        console.log('📊 [Monitor] Optimized hook called!');
      }
      
      // Track global service usage
      if (message.includes('[GlobalRealtime] Reusing subscription')) {
        improvements.reusedSubscriptions++;
        console.log('🎉 [Monitor] Subscription REUSED - SUCCESS!');
      }
      
      if (message.includes('[GlobalRealtime] Creating new subscription')) {
        improvements.newSubscriptions++;
        console.log('📊 [Monitor] New subscription created');
      }
      
      originalLog.apply(console, args);
    };
    
    // Restore after 60 seconds
    setTimeout(() => {
      console.log = originalLog;
      
      const duration = Date.now() - improvements.startTime;
      console.log(`\n📊 IMPROVEMENT MONITORING RESULTS (${Math.round(duration/1000)}s):`);
      console.log(`🔔 Optimized hook calls: ${improvements.optimizedCalls}`);
      console.log(`♻️  Reused subscriptions: ${improvements.reusedSubscriptions}`);
      console.log(`🆕 New subscriptions: ${improvements.newSubscriptions}`);
      
      const reuseRate = improvements.newSubscriptions > 0 ? 
        Math.round((improvements.reusedSubscriptions / (improvements.reusedSubscriptions + improvements.newSubscriptions)) * 100) : 
        improvements.reusedSubscriptions > 0 ? 100 : 0; // Perfect reuse when no new subscriptions
      
      console.log(`📈 Reuse rate: ${reuseRate}%`);
      
      if (reuseRate === 100 && improvements.reusedSubscriptions > 0) {
        console.log('🎉 PERFECT: 100% subscription reuse achieved! GlobalRealtimeService working flawlessly!');
      } else if (reuseRate > 50) {
        console.log('🎉 EXCELLENT: High subscription reuse achieved!');
      } else if (improvements.optimizedCalls > 0) {
        console.log('👍 GOOD: Optimized hooks working, try more navigation for pooling.');
      } else {
        console.log('⚠️  No optimized hook activity detected. Check migration.');
      }
      
    }, 60000);
    
    console.log('⏱️  Monitoring for 60 seconds. Navigate Chat→Home→Chat to test...');
    return improvements;
  },
  
  /**
   * Show complete migration status
   */
  migrationStatus() {
    console.log(`\n🧪 COMPLETE MIGRATION STATUS\n`);
    
    const migrations = [
      { component: 'AdaptiveRealtimeFeed.tsx', hook: 'useRealtimePostsOptimized', status: '✅ Migrated' },
      { component: 'useFeedLogic.ts', hook: 'useRealtimePostsOptimized', status: '✅ Migrated' },
      { component: 'FeedTab.tsx', hook: 'useRealtimeSpaceCommentsOptimized', status: '✅ Migrated' },
      { component: 'useComments.ts', hook: 'useRealtimeCommentsOptimized', status: '✅ Migrated' },
      { component: 'usePostComments.ts', hook: 'useRealtimeCommentsOptimized', status: '✅ Migrated' },
    ];
    
    console.table(migrations);
    
    console.log(`\n📊 EXPECTED IMPROVEMENT:\n• Subscription churn: 22+ → 2-3 (90%+ reduction)\n• Navigation speed: 500ms+ → <100ms (80% faster)\n• Memory usage: Multiple channels → Single shared channels\n\n🔄 NEW LOGS TO WATCH FOR:\n✅ \"🔔 [RealtimeOptimized]\"\n✅ \"🔔 [RealtimeSpaceCommentsOptimized]\"\n✅ \"🔔 [RealtimeCommentsOptimized]\"\n✅ \"🔔 [GlobalRealtime] Reusing subscription\"\n\n❌ OLD LOGS SHOULD BE GONE:\n❌ \"🔔 [RealtimePosts] Setting up subscription\"\n❌ \"🔔 [RealtimeSpaceComments] Setting up subscription\"\n❌ \"🔔 [RealtimeComments] New subscription created\"\n`);
  },

  /**
   * Quick test of the migration
   */
  quickTest() {
    this.migrationStatus();
    this.checkStatus();
    console.log('\n' + '='.repeat(50));
    console.log('⚡ Starting live monitoring in 3 seconds...');
    setTimeout(() => {
      this.monitorImprovement();
    }, 3000);
  }
};

// Auto-run check
console.log('🧪 [Phase1Test] Testing framework loaded');
console.log('📋 Run: window.phase1Test.quickTest() to start');
console.log('⚡ Quick check: window.phase1Test.checkStatus()');

setTimeout(() => {
  window.phase1Test.checkStatus();
}, 1000); 