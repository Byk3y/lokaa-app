/**
 * Mobile Browser Protection Test Suite
 * 
 * Comprehensive testing utility to validate IndexedDB bridge and protected auth systems
 * Tests all components that previously caused "Fetch API cannot load" errors
 */

import { supabaseIndexedDBBridge } from './supabaseIndexedDBBridge';
import { getProtectedCurrentUser, updateProtectedPresence, shouldUseCacheFirst } from './protectedAuth';

interface TestResult {
  name: string;
  success: boolean;
  details: any;
  duration: number;
  errors?: string[];
}

class MobileBrowserProtectionTest {
  private results: TestResult[] = [];

  /**
   * Run all protection tests
   */
  async runAllTests(): Promise<TestResult[]> {
    console.log('🧪 [MobileProtectionTest] Starting comprehensive mobile browser protection tests...');
    
    this.results = [];
    
    // Test 1: IndexedDB Bridge Core Functions
    await this.testIndexedDBBridge();
    
    // Test 2: Protected Auth Functions
    await this.testProtectedAuth();
    
    // Test 3: User Profile Protection
    await this.testUserProfileProtection();
    
    // Test 4: Presence System Protection  
    await this.testPresenceProtection();
    
    // Test 5: Cache-First Logic
    await this.testCacheFirstLogic();
    
    // Test 6: Mobile Browser Blocking Detection
    await this.testMobileBlockingDetection();
    
    // Print summary
    this.printTestSummary();
    
    return this.results;
  }

  /**
   * Test IndexedDB Bridge core functionality
   */
  private async testIndexedDBBridge(): Promise<void> {
    const startTime = Date.now();
    const errors: string[] = [];
    
    try {
      // Test metrics access
      const metrics = supabaseIndexedDBBridge.getMetrics();
      if (!metrics || typeof metrics.totalRequests !== 'number') {
        errors.push('Metrics not accessible or invalid format');
      }
      
      // Test cache status
      const cacheStatus = await supabaseIndexedDBBridge.getCacheStatus('test-space');
      if (!cacheStatus) {
        errors.push('Cache status check failed');
      }
      
      // Test mobile blocking detection
      const blockingTest = supabaseIndexedDBBridge.testMobileBlockingDetection();
      if (!blockingTest || typeof blockingTest.isMobile !== 'boolean') {
        errors.push('Mobile blocking detection failed');
      }
      
      this.results.push({
        name: 'IndexedDB Bridge Core',
        success: errors.length === 0,
        details: { metrics, cacheStatus, blockingTest },
        duration: Date.now() - startTime,
        errors: errors.length > 0 ? errors : undefined
      });
      
    } catch (error) {
      this.results.push({
        name: 'IndexedDB Bridge Core',
        success: false,
        details: { error: error.message },
        duration: Date.now() - startTime,
        errors: [`Bridge test failed: ${error.message}`]
      });
    }
  }

  /**
   * Test protected auth functions
   */
  private async testProtectedAuth(): Promise<void> {
    const startTime = Date.now();
    const errors: string[] = [];
    
    try {
      // Test protected current user
      const userResult = await getProtectedCurrentUser();
      if (!userResult || !userResult.data) {
        errors.push('Protected current user call failed');
      }
      
      // Test cache-first logic
      const cacheFirst = shouldUseCacheFirst();
      if (typeof cacheFirst !== 'boolean') {
        errors.push('Cache-first logic check failed');
      }
      
      this.results.push({
        name: 'Protected Auth Functions',
        success: errors.length === 0,
        details: { 
          userResult: userResult ? { hasUser: !!userResult.data?.user, fromCache: userResult.fromCache } : null,
          cacheFirst 
        },
        duration: Date.now() - startTime,
        errors: errors.length > 0 ? errors : undefined
      });
      
    } catch (error) {
      this.results.push({
        name: 'Protected Auth Functions',
        success: false,
        details: { error: error.message },
        duration: Date.now() - startTime,
        errors: [`Protected auth test failed: ${error.message}`]
      });
    }
  }

  /**
   * Test user profile protection
   */
  private async testUserProfileProtection(): Promise<void> {
    const startTime = Date.now();
    const errors: string[] = [];
    
    try {
      // Test user profile query protection
      const testUserId = 'test-user-id';
      const profileResult = await supabaseIndexedDBBridge.getUserProfile(testUserId, ['profile_url', 'full_name']);
      
      if (!profileResult) {
        errors.push('User profile query returned null');
      }
      
      // Should handle errors gracefully without throwing
      this.results.push({
        name: 'User Profile Protection',
        success: errors.length === 0,
        details: { 
          profileResult: profileResult ? { 
            fromCache: profileResult.fromCache, 
            hasError: !!profileResult.error,
            reason: profileResult.reason 
          } : null 
        },
        duration: Date.now() - startTime,
        errors: errors.length > 0 ? errors : undefined
      });
      
    } catch (error) {
      this.results.push({
        name: 'User Profile Protection',
        success: false,
        details: { error: error.message },
        duration: Date.now() - startTime,
        errors: [`User profile test failed: ${error.message}`]
      });
    }
  }

  /**
   * Test presence system protection
   */
  private async testPresenceProtection(): Promise<void> {
    const startTime = Date.now();
    const errors: string[] = [];
    
    try {
      // Test protected presence update
      const testUserId = 'test-user-id';
      const presenceResult = await updateProtectedPresence(testUserId, true);
      
      if (!presenceResult) {
        errors.push('Presence update returned null');
      }
      
      // Should handle errors gracefully
      this.results.push({
        name: 'Presence System Protection',
        success: errors.length === 0,
        details: { 
          presenceResult: presenceResult ? {
            fromCache: presenceResult.fromCache,
            hasError: !!presenceResult.error,
            reason: presenceResult.reason
          } : null
        },
        duration: Date.now() - startTime,
        errors: errors.length > 0 ? errors : undefined
      });
      
    } catch (error) {
      this.results.push({
        name: 'Presence System Protection',
        success: false,
        details: { error: error.message },
        duration: Date.now() - startTime,
        errors: [`Presence test failed: ${error.message}`]
      });
    }
  }

  /**
   * Test cache-first logic
   */
  private async testCacheFirstLogic(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const cacheFirstEnabled = shouldUseCacheFirst();
      
      this.results.push({
        name: 'Cache-First Logic',
        success: true,
        details: { 
          isMobile,
          cacheFirstEnabled,
          explanation: isMobile ? 
            'Mobile detected - cache-first will activate when returning from background' :
            'Desktop detected - cache-first only used when explicitly enabled'
        },
        duration: Date.now() - startTime
      });
      
    } catch (error) {
      this.results.push({
        name: 'Cache-First Logic',
        success: false,
        details: { error: error.message },
        duration: Date.now() - startTime,
        errors: [`Cache-first test failed: ${error.message}`]
      });
    }
  }

  /**
   * Test mobile browser blocking detection
   */
  private async testMobileBlockingDetection(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const detection = supabaseIndexedDBBridge.testMobileBlockingDetection();
      const metrics = supabaseIndexedDBBridge.getMetrics();
      
      this.results.push({
        name: 'Mobile Blocking Detection',
        success: true,
        details: { 
          detection,
          currentMetrics: {
            totalRequests: metrics.totalRequests,
            cacheHits: metrics.cacheHits,
            mobileBlockingDetected: metrics.mobileBlockingDetected,
            networkFailures: metrics.networkFailures
          }
        },
        duration: Date.now() - startTime
      });
      
    } catch (error) {
      this.results.push({
        name: 'Mobile Blocking Detection',
        success: false,
        details: { error: error.message },
        duration: Date.now() - startTime,
        errors: [`Mobile blocking detection failed: ${error.message}`]
      });
    }
  }

  /**
   * Print test summary
   */
  private printTestSummary(): void {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    
    console.log('\n🧪 [MobileProtectionTest] TEST SUMMARY');
    console.log('============================================');
    console.log(`✅ Passed: ${passedTests}/${totalTests}`);
    console.log(`❌ Failed: ${failedTests}/${totalTests}`);
    console.log(`📊 Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
    
    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.filter(r => !r.success).forEach(result => {
        console.log(`   - ${result.name}: ${result.errors?.join(', ') || 'Unknown error'}`);
      });
    }
    
    console.log('\n📋 Detailed Results:');
    this.results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`   ${status} ${result.name} (${result.duration}ms)`);
      if (result.details && typeof result.details === 'object') {
        console.log(`      Details:`, result.details);
      }
    });
    
    console.log('\n🔧 Available Commands:');
    console.log('   - window.mobileBrowserProtectionTest.runAllTests()');
    console.log('   - window.debugSupabaseBridge.getMetrics()');
    console.log('   - window.debugSupabaseBridge.testMobileBlocking()');
  }

  /**
   * Get test results
   */
  getResults(): TestResult[] {
    return this.results;
  }

  /**
   * Get summary stats
   */
  getSummary() {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.success).length;
    
    return {
      totalTests,
      passedTests,
      failedTests: totalTests - passedTests,
      successRate: Math.round((passedTests / totalTests) * 100),
      averageDuration: Math.round(this.results.reduce((sum, r) => sum + r.duration, 0) / totalTests)
    };
  }
}

// Create global instance
const mobileBrowserProtectionTest = new MobileBrowserProtectionTest();

// Expose to window for browser console access
if (typeof window !== 'undefined') {
  (window as any).mobileBrowserProtectionTest = {
    runAllTests: () => mobileBrowserProtectionTest.runAllTests(),
    getResults: () => mobileBrowserProtectionTest.getResults(),
    getSummary: () => mobileBrowserProtectionTest.getSummary()
  };
  
  console.log('🔧 [MobileProtectionTest] Test suite loaded. Available commands:');
  console.log('  - window.mobileBrowserProtectionTest.runAllTests() - Run all protection tests');
  console.log('  - window.mobileBrowserProtectionTest.getResults() - Get detailed test results');
  console.log('  - window.mobileBrowserProtectionTest.getSummary() - Get test summary stats');
}

export default mobileBrowserProtectionTest; 