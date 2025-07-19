import { log } from '@/utils/logger';
/**
 * Database Connectivity Test Utility
 * 
 * Helps diagnose database timeout issues by testing basic connectivity
 * and measuring response times for different query types.
 */

import { getSupabaseClient } from '@/integrations/supabase/client';

interface ConnectivityTestResult {
  test: string;
  success: boolean;
  duration: number;
  error?: string;
  details?: any;
}

class DatabaseConnectivityTest {
  private results: ConnectivityTestResult[] = [];

  /**
   * Run a comprehensive connectivity test
   */
  async runFullTest(): Promise<ConnectivityTestResult[]> {
    this.results = [];
    
    log.debug('Utils', '🔍 [DB Test] Starting database connectivity test...');
    
    // Test 1: Basic connection test
    await this.testBasicConnection();
    
    // Test 2: Simple count query
    await this.testSimpleCount();
    
    // Test 3: Space query (what's timing out)
    await this.testSpaceQuery();
    
    // Test 4: Posts count query
    await this.testPostsCount();
    
    // Test 5: Categories query
    await this.testCategoriesQuery();
    
    // Test 6: Member counts query
    await this.testMemberCounts();
    
    this.printResults();
    return this.results;
  }

  /**
   * Quick connectivity test
   */
  async runQuickTest(): Promise<ConnectivityTestResult[]> {
    this.results = [];
    
    log.debug('Utils', '⚡ [DB Test] Running quick connectivity test...');
    
    await this.testBasicConnection();
    await this.testSimpleCount();
    
    this.printResults();
    return this.results;
  }

  private async testBasicConnection() {
    const startTime = performance.now();
    
    try {
      const { data, error } = await Promise.race([
        getSupabaseClient().from('spaces').select('id').limit(1),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Basic connection timeout')), 5000);
        })
      ]);
      
      const duration = performance.now() - startTime;
      
      if (error) throw error;
      
      this.results.push({
        test: 'Basic Connection',
        success: true,
        duration,
        details: { recordCount: data?.length || 0 }
      });
      
    } catch (error) {
      const duration = performance.now() - startTime;
      this.results.push({
        test: 'Basic Connection',
        success: false,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async testSimpleCount() {
    const startTime = performance.now();
    
    try {
      const { count, error } = await Promise.race([
        getSupabaseClient().from('spaces').select('*', { count: 'exact', head: true }),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Simple count timeout')), 8000);
        })
      ]);
      
      const duration = performance.now() - startTime;
      
      if (error) throw error;
      
      this.results.push({
        test: 'Simple Count Query',
        success: true,
        duration,
        details: { totalSpaces: count }
      });
      
    } catch (error) {
      const duration = performance.now() - startTime;
      this.results.push({
        test: 'Simple Count Query',
        success: false,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async testSpaceQuery() {
    const startTime = performance.now();
    const subdomain = 'nocode-architects';
    
    try {
      const { data, error } = await Promise.race([
        getSupabaseClient()
          .from('spaces')
          .select('*')
          .eq('subdomain', subdomain)
          .single(),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Space query timeout')), 12000);
        })
      ]);
      
      const duration = performance.now() - startTime;
      
      if (error) throw error;
      
      this.results.push({
        test: 'Space Query (nocode-architects)',
        success: true,
        duration,
        details: { spaceId: data?.id, spaceName: data?.name }
      });
      
    } catch (error) {
      const duration = performance.now() - startTime;
      this.results.push({
        test: 'Space Query (nocode-architects)',
        success: false,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async testPostsCount() {
    const startTime = performance.now();
    const spaceId = '235e68d1-89df-4d2d-8945-e7756d60de20';
    
    try {
      const { count, error } = await Promise.race([
        getSupabaseClient()
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('space_id', spaceId),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Posts count timeout')), 15000);
        })
      ]);
      
      const duration = performance.now() - startTime;
      
      if (error) throw error;
      
      this.results.push({
        test: 'Posts Count Query',
        success: true,
        duration,
        details: { totalPosts: count }
      });
      
    } catch (error) {
      const duration = performance.now() - startTime;
      this.results.push({
        test: 'Posts Count Query',
        success: false,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async testCategoriesQuery() {
    const startTime = performance.now();
    const spaceId = '235e68d1-89df-4d2d-8945-e7756d60de20';
    
    try {
      const { data, error } = await Promise.race([
        getSupabaseClient()
          .from('space_categories')
          .select('*')
          .eq('space_id', spaceId)
          .eq('is_archived', false),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Categories query timeout')), 15000);
        })
      ]);
      
      const duration = performance.now() - startTime;
      
      if (error) throw error;
      
      this.results.push({
        test: 'Categories Query',
        success: true,
        duration,
        details: { categoriesCount: data?.length || 0 }
      });
      
    } catch (error) {
      const duration = performance.now() - startTime;
      this.results.push({
        test: 'Categories Query',
        success: false,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async testMemberCounts() {
    const startTime = performance.now();
    const spaceId = '235e68d1-89df-4d2d-8945-e7756d60de20';
    
    try {
      const { data, error } = await Promise.race([
        getSupabaseClient()
          .from('space_members')
          .select('role, status, user_id')
          .eq('space_id', spaceId)
          .eq('status', 'active'),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Member counts timeout')), 12000);
        })
      ]);
      
      const duration = performance.now() - startTime;
      
      if (error) throw error;
      
      this.results.push({
        test: 'Member Counts Query',
        success: true,
        duration,
        details: { membersCount: data?.length || 0 }
      });
      
    } catch (error) {
      const duration = performance.now() - startTime;
      this.results.push({
        test: 'Member Counts Query',
        success: false,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private printResults() {
    log.debug('Utils', '\n📊 [DB Test] Database Connectivity Test Results:');
    log.debug('Utils', '================================================');
    
    let totalTests = this.results.length;
    let passedTests = this.results.filter(r => r.success).length;
    let failedTests = totalTests - passedTests;
    
    this.results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const duration = `${result.duration.toFixed(0)}ms`;
      
      log.debug('Utils', `${status} ${result.test}: ${duration}`);
      
      if (result.success && result.details) {
        log.debug('Utils', `   Details:`, result.details);
      }
      
      if (!result.success && result.error) {
        log.debug('Utils', `   Error: ${result.error}`);
      }
    });
    
    log.debug('Utils', '================================================');
    log.debug('Utils', `📈 Summary: ${passedTests}/${totalTests} tests passed`);
    
    if (failedTests > 0) {
      log.debug('Utils', '🔧 Recommendations:');
      
      const hasTimeouts = this.results.some(r => !r.success && r.error?.includes('timeout'));
      const hasSlowQueries = this.results.some(r => r.success && r.duration > 5000);
      
      if (hasTimeouts) {
        log.debug('Utils', '  - Database queries are timing out - check network connectivity');
        log.debug('Utils', '  - Consider increasing timeout values if network is slow');
        log.debug('Utils', '  - Check if Supabase service is experiencing issues');
      }
      
      if (hasSlowQueries) {
        log.debug('Utils', '  - Some queries are slow (>5s) - database may be under load');
        log.debug('Utils', '  - Consider optimizing queries or adding indexes');
      }
    } else {
      log.debug('Utils', '🎉 All database connectivity tests passed!');
    }
    
    log.debug('Utils', '\n');
  }

  /**
   * Get network information
   */
  getNetworkInfo() {
    const connection = (navigator as any).connection;
    
    return {
      userAgent: navigator.userAgent,
      online: navigator.onLine,
      connectionType: connection?.effectiveType || 'unknown',
      downlink: connection?.downlink || 'unknown',
      rtt: connection?.rtt || 'unknown',
      saveData: connection?.saveData || false
    };
  }
}

// Create singleton instance
export const dbConnectivityTest = new DatabaseConnectivityTest();

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).dbConnectivityTest = dbConnectivityTest;
  (window as any).testDatabaseConnectivity = () => dbConnectivityTest.runFullTest();
  (window as any).quickDbTest = () => dbConnectivityTest.runQuickTest();
}

// Make database test available but don't auto-run unless there are issues
if (process.env.NODE_ENV === 'development') {
  // Only show availability message, don't auto-run tests
  setTimeout(() => {
    log.debug('Utils', '🔍 [DB Test] Database connectivity test utility loaded (auto-run disabled)');
    log.debug('Utils', '🔧 Available commands:');
    log.debug('Utils', '  - window.testDatabaseConnectivity() - Run full connectivity test');
    log.debug('Utils', '  - window.quickDbTest() - Run quick connectivity test');
    log.debug('Utils', '  - window.dbConnectivityTest.getNetworkInfo() - Show network information');
  }, 3000);
}

export default dbConnectivityTest; 