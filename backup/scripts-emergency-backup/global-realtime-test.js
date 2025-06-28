/**
 * Global Realtime Service Testing Framework
 * 
 * Tests the migration from direct Supabase subscriptions to GlobalRealtimeService
 * Monitors subscription churn during Chat→Home navigation
 */

window.globalRealtimeTest = {
  // Test data
  testResults: [],
  navigationCount: 0,
  
  /**
   * Monitor subscription activity during navigation
   */
  startNavigationTest() {
    console.log('🧪 [GlobalRealtimeTest] Starting navigation test...');
    
    // Reset counters
    this.testResults = [];
    this.navigationCount = 0;
    
    // Hook into console.log to monitor subscription messages
    const originalLog = console.log;
    const subscriptionLogs = [];
    
    console.log = function(...args) {
      const message = args.join(' ');
      
      // Track subscription-related logs
      if (message.includes('[GlobalRealtime]') || 
          message.includes('[RealtimePosts]') ||
          message.includes('[RealtimeComments]') ||
          message.includes('[RealtimeSpaceComments]')) {
        
        subscriptionLogs.push({
          timestamp: new Date().toISOString(),
          message,
          type: message.includes('Creating') ? 'CREATE' :
                message.includes('Reusing') ? 'REUSE' :
                message.includes('Cleaning') ? 'CLEANUP' : 'OTHER'
        });
      }
      
      originalLog.apply(console, args);
    };
    
    // Store original function for cleanup
    this._originalLog = originalLog;
    this._subscriptionLogs = subscriptionLogs;
    
    console.log('✅ [GlobalRealtimeTest] Monitoring started. Navigate Chat → Home to test.');
    console.log('📊 Use window.globalRealtimeTest.getResults() to see results');
  },
  
  /**
   * Stop monitoring and show results
   */
  stopNavigationTest() {
    if (this._originalLog) {
      console.log = this._originalLog;
    }
    
    const results = this.analyzeResults();
    console.log('🧪 [GlobalRealtimeTest] Test completed:', results);
    return results;
  },
  
  /**
   * Analyze subscription logs
   */
  analyzeResults() {
    const logs = this._subscriptionLogs || [];
    
    const creates = logs.filter(log => log.type === 'CREATE').length;
    const reuses = logs.filter(log => log.type === 'REUSE').length;
    const cleanups = logs.filter(log => log.type === 'CLEANUP').length;
    
    const improvement = creates > 0 ? Math.round((reuses / (creates + reuses)) * 100) : 0;
    
    return {
      totalLogs: logs.length,
      subscriptionCreates: creates,
      subscriptionReuses: reuses,
      subscriptionCleanups: cleanups,
      reusePercentage: improvement,
      efficiency: improvement > 70 ? 'EXCELLENT' : 
                 improvement > 40 ? 'GOOD' : 
                 improvement > 0 ? 'MODERATE' : 'POOR',
      logs: logs.slice(-10) // Last 10 logs for review
    };
  },
  
  /**
   * Test navigation between chat and home
   */
  async testChatHomeNavigation() {
    console.log('🧪 [GlobalRealtimeTest] Testing Chat → Home navigation...');
    
    this.startNavigationTest();
    
    // Simulate navigation (user would do this manually)
    console.log('👆 Please navigate: Chat → Home → Chat → Home');
    console.log('⏱️  Wait 10 seconds, then run window.globalRealtimeTest.stopNavigationTest()');
    
    return new Promise((resolve) => {
      setTimeout(() => {
        const results = this.stopNavigationTest();
        resolve(results);
      }, 15000); // 15 second timeout
    });
  },
  
  /**
   * Check GlobalRealtimeService status
   */
  checkServiceStatus() {
    if (typeof window.globalRealtimeService === 'undefined') {
      console.error('❌ GlobalRealtimeService not found on window object');
      return { status: 'NOT_FOUND' };
    }
    
    const stats = window.globalRealtimeService.getStats();
    const status = {
      status: 'ACTIVE',
      ...stats,
      timestamp: new Date().toISOString()
    };
    
    console.log('📊 [GlobalRealtimeService] Status:', status);
    return status;
  },
  
  /**
   * Compare before/after subscription counts
   */
  measureSubscriptionChurn() {
    console.log('📊 [GlobalRealtimeTest] Measuring subscription churn...');
    
    // Start monitoring
    this.startNavigationTest();
    
    // Instructions for manual testing
    console.log(`
🧪 SUBSCRIPTION CHURN TEST:

1. Note current stats: ${JSON.stringify(this.checkServiceStatus())}
2. Navigate: Chat → Home (count "Creating" vs "Reusing" messages)
3. Navigate: Home → Chat (count messages again)
4. Run: window.globalRealtimeTest.stopNavigationTest()

📈 EXPECTED RESULTS:
- Before: 22+ "Setting up subscription" messages
- After: Mostly "Reusing subscription" messages
- Target: 80%+ reuse rate
    `);
  },
  
  /**
   * Test specific hook migration
   */
  testHookMigration(hookName) {
    console.log(`🧪 [GlobalRealtimeTest] Testing ${hookName} migration...`);
    
    const beforeStats = this.checkServiceStatus();
    
    console.log(`
📋 HOOK MIGRATION TEST: ${hookName}

1. Before stats: ${JSON.stringify(beforeStats)}
2. Trigger the hook (navigate to space with ${hookName})
3. Check for subscription reuse messages
4. Run: window.globalRealtimeTest.checkServiceStatus()

✅ SUCCESS CRITERIA:
- Hook creates subscription OR reuses existing
- Subscription count increases by 0-1 (not 5+)
- No "Setting up subscription" logs from old system
    `);
  },
  
  /**
   * Full system test
   */
  async runFullTest() {
    console.log('🚀 [GlobalRealtimeTest] Running full system test...');
    
    const results = {
      serviceStatus: this.checkServiceStatus(),
      timestamp: new Date().toISOString()
    };
    
    console.log(`
🧪 FULL SYSTEM TEST STARTED

Current Status: ${JSON.stringify(results.serviceStatus)}

📋 TEST SEQUENCE:
1. Check service initialization ✅
2. Test Chat → Home navigation (manual)
3. Measure subscription efficiency 
4. Validate hook migrations

⏭️  NEXT STEPS:
- Run: window.globalRealtimeTest.testChatHomeNavigation()
- Or manually navigate and use: window.globalRealtimeTest.measureSubscriptionChurn()
    `);
    
    return results;
  },
  
  /**
   * Get current test results
   */
  getResults() {
    return {
      serviceStatus: this.checkServiceStatus(),
      subscriptionLogs: this._subscriptionLogs || [],
      analysis: this.analyzeResults(),
      timestamp: new Date().toISOString()
    };
  },
  
  /**
   * Quick debug commands
   */
  debugCommands() {
    console.log(`
🔧 DEBUG COMMANDS:

// Check service status
window.globalRealtimeService.getStats()

// List active subscriptions  
window.globalRealtimeService.listSubscriptions()

// Test navigation monitoring
window.globalRealtimeTest.startNavigationTest()
window.globalRealtimeTest.stopNavigationTest()

// Full system test
window.globalRealtimeTest.runFullTest()

// Check results
window.globalRealtimeTest.getResults()
    `);
  }
};

// Auto-initialize
console.log('🧪 [GlobalRealtimeTest] Testing framework loaded');
console.log('📋 Run: window.globalRealtimeTest.runFullTest() to start');
console.log('🔧 Run: window.globalRealtimeTest.debugCommands() for help');

// Auto-check service status
setTimeout(() => {
  window.globalRealtimeTest.checkServiceStatus();
}, 1000); 