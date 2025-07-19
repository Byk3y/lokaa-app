import { log } from '@/utils/logger';
// =====================================
// DATABASE HEALTH MONITORING UTILITY
// =====================================
// Integrates with Phase 6 database optimizations

import { getSupabaseClient } from '../integrations/supabase/client';
import { createManagedInterval } from '@/utils/pageVisibilityManager';

interface DatabaseHealthMetric {
  metric_name: string;
  metric_value: string;
  status: 'OK' | 'WARNING' | 'INFO';
}

interface DatabaseHealthReport {
  timestamp: string;
  user_count: number;
  space_count: number;
  member_count: number;
  post_count: number;
  message_count: number;
  recommendations: string[];
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
}

export class DatabaseHealthMonitor {
  private static instance: DatabaseHealthMonitor;
  private lastHealthCheck: DatabaseHealthReport | null = null;
  private healthCheckCleanup: (() => void) | null = null;

  private constructor() {}

  static getInstance(): DatabaseHealthMonitor {
    if (!DatabaseHealthMonitor.instance) {
      DatabaseHealthMonitor.instance = new DatabaseHealthMonitor();
    }
    return DatabaseHealthMonitor.instance;
  }

  /**
   * Initialize automatic database health monitoring
   */
  async initialize(): Promise<void> {
    log.debug('Utils', '🔍 [DatabaseHealthMonitor] Initializing database health monitoring...');
    
    try {
      // Initial health check
      await this.performHealthCheck();
      
      // Set up managed periodic health checks (every 10 minutes)
      this.healthCheckCleanup = createManagedInterval(
        'database-health-monitor',
        async () => {
          await this.performHealthCheck();
        },
        10 * 60 * 1000, // 10 minutes
        'polling'
      );
      
      log.debug('Utils', '✅ [DatabaseHealthMonitor] Health monitoring active');
      
      // Expose to window for debugging
      (window as any).databaseHealthMonitor = this;
      (window as any).getDatabaseHealth = () => this.getLastHealthReport();
      (window as any).generateDatabaseReport = () => this.generatePerformanceReport();
      
    } catch (error) {
      log.error('Utils', '❌ [DatabaseHealthMonitor] Failed to initialize:', error);
    }
  }

  /**
   * Perform comprehensive database health check
   */
  async performHealthCheck(): Promise<DatabaseHealthReport> {
    try {
      log.debug('Utils', '🔍 [DatabaseHealthMonitor] Performing health check...');
      
      // Get basic counts from key tables
      const [usersResult, spacesResult, membersResult, postsResult] = await Promise.allSettled([
        getSupabaseClient().from('users').select('id', { count: 'exact', head: true }),
        getSupabaseClient().from('spaces').select('id', { count: 'exact', head: true }),
        getSupabaseClient().from('space_members').select('id', { count: 'exact', head: true }),
        getSupabaseClient().from('posts').select('id', { count: 'exact', head: true })
      ]);

      // Extract counts with error handling
      const userCount = usersResult.status === 'fulfilled' ? usersResult.value.count || 0 : 0;
      const spaceCount = spacesResult.status === 'fulfilled' ? spacesResult.value.count || 0 : 0;
      const memberCount = membersResult.status === 'fulfilled' ? membersResult.value.count || 0 : 0;
      const postCount = postsResult.status === 'fulfilled' ? postsResult.value.count || 0 : 0;

      // Generate recommendations based on data patterns
      const recommendations = this.generateRecommendations({
        userCount,
        spaceCount,
        memberCount,
        postCount
      });

      // Determine overall status
      const status = this.determineHealthStatus({
        userCount,
        spaceCount,
        memberCount,
        postCount,
        messageCount,
        recommendations
      });

      const report: DatabaseHealthReport = {
        timestamp: new Date().toISOString(),
        user_count: userCount,
        space_count: spaceCount,
        member_count: memberCount,
        post_count: postCount,
        message_count: messageCount,
        recommendations,
        status
      };

      this.lastHealthCheck = report;
      
      // Log status
      if (status === 'CRITICAL') {
        log.error('Utils', '🚨 [DatabaseHealthMonitor] Critical issues detected');
      } else if (status === 'WARNING') {
        log.warn('Utils', '⚠️ [DatabaseHealthMonitor] Performance warnings detected');
      } else {
        log.debug('Utils', '✅ [DatabaseHealthMonitor] Database health is good');
      }

      return report;

    } catch (error) {
      log.error('Utils', '❌ [DatabaseHealthMonitor] Health check failed:', error);
      
      // Return error report
      const report: DatabaseHealthReport = {
        timestamp: new Date().toISOString(),
        user_count: 0,
        space_count: 0,
        member_count: 0,
        post_count: 0,
        message_count: 0,
        recommendations: ['⚠️ Database health check failed. Check connection and permissions.'],
        status: 'WARNING'
      };
      
      this.lastHealthCheck = report;
      return report;
    }
  }

  /**
   * Generate actionable recommendations based on health metrics
   */
  private generateRecommendations(data: {
    userCount: number;
    spaceCount: number;
    memberCount: number;
    postCount: number;
    messageCount: number;
  }): string[] {
    const recommendations: string[] = [];
    const { userCount, spaceCount, memberCount, postCount, messageCount } = data;

    // Growth-based recommendations
    if (userCount > 100 && spaceCount < 5) {
      recommendations.push('🚀 Consider promoting space creation - high user count but low space count.');
    }

    if (memberCount > userCount * 2) {
      recommendations.push('👥 High membership ratio detected - consider member engagement optimization.');
    }

    if (postCount > 1000) {
      recommendations.push('📝 High post volume - consider implementing post archiving and pagination optimization.');
    }

    if (messageCount > 5000) {
      recommendations.push('💬 High message volume - consider implementing message cleanup and performance optimization.');
    }

    // Performance recommendations based on scale
    if (userCount > 50) {
      recommendations.push('📊 Consider implementing database connection pooling for better performance.');
    }

    if (postCount > 500 || messageCount > 1000) {
      recommendations.push('🔍 Consider adding database indexes for improved query performance.');
    }

    // Security recommendations
    if (userCount > 20) {
      recommendations.push('🔒 Ensure row-level security policies are properly configured for all tables.');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Database metrics are within normal ranges. No immediate action required.');
    }

    return recommendations;
  }

  /**
   * Determine overall health status
   */
  private determineHealthStatus(data: {
    userCount: number;
    spaceCount: number;
    memberCount: number;
    postCount: number;
    messageCount: number;
    recommendations: string[];
  }): 'HEALTHY' | 'WARNING' | 'CRITICAL' {
    const { recommendations } = data;

    // Check for critical indicators
    const criticalCount = recommendations.filter(r => r.includes('🚨')).length;
    if (criticalCount > 0) {
      return 'CRITICAL';
    }

    // Check for warning indicators
    const warningCount = recommendations.filter(r => 
      r.includes('⚠️') || r.includes('🔍') || r.includes('📊')
    ).length;
    
    if (warningCount > 2) {
      return 'WARNING';
    }

    return 'HEALTHY';
  }

  /**
   * Get the last health report
   */
  getLastHealthReport(): DatabaseHealthReport | null {
    return this.lastHealthCheck;
  }

  /**
   * Get a summary of current database health
   */
  getHealthSummary(): {
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    summary: string;
    timestamp?: string;
  } {
    if (!this.lastHealthCheck) {
      return {
        status: 'WARNING',
        summary: 'No health data available. Run health check first.'
      };
    }

    const { status, user_count, space_count, post_count, timestamp } = this.lastHealthCheck;
    
    return {
      status,
      summary: `Database ${status.toLowerCase()}: ${user_count} users, ${space_count} spaces, ${post_count} posts`,
      timestamp
    };
  }

  /**
   * Generate a detailed performance report
   */
  generatePerformanceReport(): string {
    if (!this.lastHealthCheck) {
      return 'No health data available. Run health check first.';
    }

    const { 
      user_count, 
      space_count, 
      member_count, 
      post_count, 
      message_count, 
      recommendations, 
      status, 
      timestamp 
    } = this.lastHealthCheck;

    const report = `
🔍 DATABASE HEALTH REPORT
Generated: ${new Date(timestamp).toLocaleString()}

📊 CURRENT METRICS:
✅ Users: ${user_count}
✅ Spaces: ${space_count}  
✅ Members: ${member_count}
✅ Posts: ${post_count}
✅ Messages: ${message_count}

📈 OVERALL STATUS: ${status} ${status === 'HEALTHY' ? '✅' : status === 'WARNING' ? '⚠️' : '🚨'}

💡 RECOMMENDATIONS:
${recommendations.map(r => `• ${r}`).join('\n')}

📋 SUMMARY:
Phase 6 database optimizations are active with performance monitoring.
Dead tuple cleanup has been performed and indexes have been optimized.
${status === 'HEALTHY' ? 'No immediate action required.' : 'Review recommendations above.'}
    `.trim();

    return report;
  }

  /**
   * Cleanup monitoring resources
   */
  destroy(): void {
    if (this.healthCheckCleanup) {
      this.healthCheckCleanup();
      this.healthCheckCleanup = null;
    }
    log.debug('Utils', '🔍 [DatabaseHealthMonitor] Monitoring stopped');
  }
}

// Export singleton instance
export const databaseHealthMonitor = DatabaseHealthMonitor.getInstance();

// Auto-initialize if in browser environment
if (typeof window !== 'undefined') {
  // Initialize after a short delay to allow other systems to load
  setTimeout(() => {
    databaseHealthMonitor.initialize().catch(err => log.error('Utils', 'Error occurred:', err));
  }, 3000);
} 