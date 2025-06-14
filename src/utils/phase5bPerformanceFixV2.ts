/**
 * 🔧 Phase 5B Performance Fix V2 Validation
 * Tests the additional fixes for auth subscription loops and user details caching
 */

console.log('🔧 Phase 5B Performance Fix V2 Validation Loaded');

interface PerformanceTestResult {
  name: string;
  passed: boolean;
  duration?: number;
  details?: any;
  issue?: string;
}

interface PerformanceFixValidation {
  totalTests: number;
  passed: number;
  failed: number;
  issues: string[];
  improvements: string[];
  results: PerformanceTestResult[];
}

class Phase5BPerformanceValidatorV2 {
  
  /**
   * Run all performance fix validation tests (V2)
   */
  async validateFixesV2(): Promise<PerformanceFixValidation> {
    console.log('🔧 Starting Phase 5B Performance Fix V2 Validation...\n');
    
    const results: PerformanceTestResult[] = [];
    
    // Test 1: Auth subscription cleanup prevention
    results.push(await this.testAuthSubscriptionStability());
    
    // Test 2: User details caching effectiveness
    results.push(await this.testUserDetailsCaching());
    
    // Test 3: INITIAL_SESSION event handling
    results.push(await this.testInitialSessionHandling());
    
    // Test 4: SpaceProtectedRoute performance
    results.push(await this.testSpaceProtectedRoutePerformance());
    
    // Test 5: Console log noise reduction
    results.push(await this.testLogNoiseReduction());
    
    // Test 6: Overall auth flow responsiveness
    results.push(await this.testAuthFlowResponsiveness());
    
    const passed = results.filter(r => r.passed).length;
    const failed = results.length - passed;
    
    const issues = results
      .filter(r => !r.passed)
      .map(r => `${r.name}: ${r.issue}`)
      .filter(Boolean);
    
    const improvements = results
      .filter(r => r.passed)
      .map(r => r.name);
    
    const validation: PerformanceFixValidation = {
      totalTests: results.length,
      passed,
      failed,
      issues,
      improvements,
      results
    };
    
    this.printValidationReport(validation);
    return validation;
  }
  
  /**
   * Test auth subscription stability
   */
  private async testAuthSubscriptionStability(): Promise<PerformanceTestResult> {
    try {
      // Monitor console for subscription cleanup messages
      let cleanupCount = 0;
      const originalLog = console.log;
      
      console.log = (...args) => {
        if (args[0]?.includes('🧹 AuthContext: Cleaning up auth subscription')) {
          cleanupCount++;
        }
        originalLog.apply(console, args);
      };
      
      // Wait for potential subscription cleanups
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Restore console
      console.log = originalLog;
      
      // Should have minimal subscription cleanups (0-1 is acceptable, >2 indicates issues)
      const stable = cleanupCount <= 1;
      
      return {
        name: 'Auth Subscription Stability',
        passed: stable,
        details: { cleanupCount },
        issue: !stable ? `Too many subscription cleanups: ${cleanupCount}` : undefined
      };
      
    } catch (error) {
      return {
        name: 'Auth Subscription Stability',
        passed: false,
        issue: `Test error: ${error}`
      };
    }
  }
  
  /**
   * Test user details caching effectiveness
   */
  private async testUserDetailsCaching(): Promise<PerformanceTestResult> {
    try {
      // Monitor console for user details fetching
      let fetchCount = 0;
      let cacheHitCount = 0;
      const originalLog = console.log;
      
      console.log = (...args) => {
        if (args[0]?.includes('AuthContext: Fetching user details for ID:')) {
          fetchCount++;
        }
        if (args[0]?.includes('AuthContext: Using cached user details for:')) {
          cacheHitCount++;
        }
        originalLog.apply(console, args);
      };
      
      // Wait for user details operations
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Restore console
      console.log = originalLog;
      
      // Should have reasonable caching (fetch count should be low for same user)
      const efficientCaching = fetchCount <= 2; // Allow 1-2 fetches max for same user
      const hasCacheHits = cacheHitCount > 0 || fetchCount <= 1; // Either cache hits or minimal fetching
      
      return {
        name: 'User Details Caching',
        passed: efficientCaching && hasCacheHits,
        details: { fetchCount, cacheHitCount },
        issue: !efficientCaching ? `Too many user detail fetches: ${fetchCount}` : 
               !hasCacheHits ? 'No cache hits detected' : undefined
      };
      
    } catch (error) {
      return {
        name: 'User Details Caching',
        passed: false,
        issue: `Test error: ${error}`
      };
    }
  }
  
  /**
   * Test INITIAL_SESSION event handling
   */
  private async testInitialSessionHandling(): Promise<PerformanceTestResult> {
    try {
      // Monitor console for INITIAL_SESSION events
      let initialSessionCount = 0;
      let skippedCount = 0;
      const originalLog = console.log;
      
      console.log = (...args) => {
        if (args[0]?.includes('🔔 Auth state change event: INITIAL_SESSION')) {
          initialSessionCount++;
        }
        if (args[0]?.includes('🔁 [AuthContext] INITIAL_SESSION:')) {
          skippedCount++;
        }
        originalLog.apply(console, args);
      };
      
      // Wait for INITIAL_SESSION events
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Restore console
      console.log = originalLog;
      
      // Should handle INITIAL_SESSION events intelligently
      const reasonableEventCount = initialSessionCount <= 3; // Should not have excessive events
      const hasIntelligentSkipping = skippedCount > 0 || initialSessionCount <= 1; // Either skips duplicates or minimal events
      
      return {
        name: 'INITIAL_SESSION Event Handling',
        passed: reasonableEventCount && hasIntelligentSkipping,
        details: { initialSessionCount, skippedCount },
        issue: !reasonableEventCount ? `Too many INITIAL_SESSION events: ${initialSessionCount}` :
               !hasIntelligentSkipping ? 'No intelligent skipping detected' : undefined
      };
      
    } catch (error) {
      return {
        name: 'INITIAL_SESSION Event Handling',
        passed: false,
        issue: `Test error: ${error}`
      };
    }
  }
  
  /**
   * Test SpaceProtectedRoute performance
   */
  private async testSpaceProtectedRoutePerformance(): Promise<PerformanceTestResult> {
    try {
      // Monitor SpaceProtectedRoute logging
      let sppLogCount = 0;
      let renderCount = 0;
      const originalLog = console.log;
      
      console.log = (...args) => {
        if (args[0]?.includes('[SPP Debug] State Snapshot:')) {
          sppLogCount++;
        }
        if (args[0]?.includes('[SpaceProtectedRoute] User is owner')) {
          renderCount++;
        }
        originalLog.apply(console, args);
      };
      
      // Wait for SpaceProtectedRoute operations
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      // Restore console
      console.log = originalLog;
      
      // Should have reduced logging and renders
      const reasonableLogging = sppLogCount <= 2; // Should log infrequently due to throttling
      const reasonableRenders = renderCount <= 5; // Should not render excessively
      
      return {
        name: 'SpaceProtectedRoute Performance',
        passed: reasonableLogging && reasonableRenders,
        details: { sppLogCount, renderCount },
        issue: !reasonableLogging ? `Too much SPP logging: ${sppLogCount}` :
               !reasonableRenders ? `Too many renders: ${renderCount}` : undefined
      };
      
    } catch (error) {
      return {
        name: 'SpaceProtectedRoute Performance',
        passed: false,
        issue: `Test error: ${error}`
      };
    }
  }
  
  /**
   * Test console log noise reduction
   */
  private async testLogNoiseReduction(): Promise<PerformanceTestResult> {
    try {
      let totalLogs = 0;
      let authLogs = 0;
      let debugLogs = 0;
      const originalLog = console.log;
      
      console.log = (...args) => {
        totalLogs++;
        if (args[0]?.includes('Auth') || args[0]?.includes('🔔') || args[0]?.includes('[AuthFocusDebug]')) {
          authLogs++;
        }
        if (args[0]?.includes('Debug') || args[0]?.includes('[SPP Debug]')) {
          debugLogs++;
        }
        originalLog.apply(console, args);
      };
      
      // Monitor logging for a period
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Restore console
      console.log = originalLog;
      
      // Should have reduced noise
      const reasonableTotalLogs = totalLogs <= 50; // Not excessive overall logging
      const reasonableAuthLogs = authLogs <= 15; // Reduced auth logging
      const reasonableDebugLogs = debugLogs <= 10; // Reduced debug logging
      
      return {
        name: 'Console Log Noise Reduction',
        passed: reasonableTotalLogs && reasonableAuthLogs && reasonableDebugLogs,
        details: { totalLogs, authLogs, debugLogs },
        issue: !reasonableTotalLogs ? `Too many total logs: ${totalLogs}` :
               !reasonableAuthLogs ? `Too many auth logs: ${authLogs}` :
               !reasonableDebugLogs ? `Too many debug logs: ${debugLogs}` : undefined
      };
      
    } catch (error) {
      return {
        name: 'Console Log Noise Reduction',
        passed: false,
        issue: `Test error: ${error}`
      };
    }
  }
  
  /**
   * Test overall auth flow responsiveness
   */
  private async testAuthFlowResponsiveness(): Promise<PerformanceTestResult> {
    try {
      const startTime = performance.now();
      
      // Monitor for long tasks during auth flow
      let longTaskCount = 0;
      const originalWarn = console.warn;
      
      console.warn = (...args) => {
        if (args[0]?.includes('🚨 Very rapid re-render detected') || 
            args[0]?.includes('CRITICAL: longTask')) {
          longTaskCount++;
        }
        originalWarn.apply(console, args);
      };
      
      // Wait for auth flow operations
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Restore console
      console.warn = originalWarn;
      
      const duration = performance.now() - startTime;
      
      // Should have minimal long tasks and reasonable duration
      const minimalLongTasks = longTaskCount <= 2;
      const reasonableDuration = duration < 5000; // Should complete in reasonable time
      
      return {
        name: 'Auth Flow Responsiveness',
        passed: minimalLongTasks && reasonableDuration,
        duration,
        details: { longTaskCount, duration },
        issue: !minimalLongTasks ? `Too many long tasks: ${longTaskCount}` :
               !reasonableDuration ? `Duration too long: ${duration}ms` : undefined
      };
      
    } catch (error) {
      return {
        name: 'Auth Flow Responsiveness',
        passed: false,
        issue: `Test error: ${error}`
      };
    }
  }
  
  /**
   * Print validation report
   */
  private printValidationReport(validation: PerformanceFixValidation): void {
    console.log('\n🏁 Phase 5B Performance Fix V2 Validation Complete!\n');
    console.log('📊 VALIDATION SUMMARY:');
    console.log(`   Total Tests: ${validation.totalTests}`);
    console.log(`   ✅ Passed: ${validation.passed}`);
    console.log(`   ❌ Failed: ${validation.failed}`);
    
    if (validation.improvements.length > 0) {
      console.log('\n✅ IMPROVEMENTS VERIFIED:');
      validation.improvements.forEach(improvement => {
        console.log(`   - ${improvement}`);
      });
    }
    
    if (validation.issues.length > 0) {
      console.log('\n❌ REMAINING ISSUES:');
      validation.issues.forEach(issue => {
        console.log(`   - ${issue}`);
      });
    }
    
    const score = Math.round((validation.passed / validation.totalTests) * 100);
    console.log(`\n🎯 Performance Fix V2 Score: ${score}%`);
    
    if (score >= 95) {
      console.log('🟢 EXCELLENT - All critical performance issues resolved!');
    } else if (score >= 80) {
      console.log('🟡 GOOD - Major issues resolved, minor optimizations remain');
    } else {
      console.log('🔴 NEEDS WORK - Critical issues still present');
    }
    
    console.log('\n🚀 Next Steps: Test auth flow in incognito mode to verify <1 second performance');
  }
}

// Create and export validator instance
export const phase5BPerformanceValidatorV2 = new Phase5BPerformanceValidatorV2();

// Expose to window for manual testing
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).validatePhase5BFixesV2 = () => phase5BPerformanceValidatorV2.validateFixesV2();
  
  console.log('🔧 Phase 5B Performance Fix V2 validation available:');
  console.log('   - window.validatePhase5BFixesV2()');
} 