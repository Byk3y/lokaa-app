/**
 * Search Performance Monitoring Utility
 * Tracks search metrics and provides performance insights
 */

export interface SearchMetrics {
  query: string;
  spaceId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  resultsCount: number;
  cacheHit: boolean;
  error?: string;
}

export interface SearchPerformanceStats {
  totalSearches: number;
  averageResponseTime: number;
  cacheHitRate: number;
  errorRate: number;
  popularQueries: Array<{ query: string; count: number }>;
  slowQueries: Array<{ query: string; duration: number }>;
}

class SearchPerformanceMonitor {
  private metrics: SearchMetrics[] = [];
  private readonly MAX_METRICS = 1000; // Keep last 1000 searches
  private readonly SLOW_QUERY_THRESHOLD = 1000; // 1 second

  /**
   * Start tracking a search operation
   */
  startSearch(query: string, spaceId: string): string {
    const searchId = `${spaceId}:${query}:${Date.now()}`;
    const metric: SearchMetrics = {
      query,
      spaceId,
      startTime: performance.now(),
      resultsCount: 0,
      cacheHit: false
    };
    
    this.metrics.push(metric);
    
    // Keep only the last MAX_METRICS entries
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }
    
    return searchId;
  }

  /**
   * Complete tracking a search operation
   */
  completeSearch(
    searchId: string, 
    resultsCount: number, 
    cacheHit = false, 
    error?: string
  ): void {
    const metric = this.metrics.find(m => 
      `${m.spaceId}:${m.query}:${m.startTime}` === searchId
    );
    
    if (metric) {
      metric.endTime = performance.now();
      metric.duration = metric.endTime - metric.startTime;
      metric.resultsCount = resultsCount;
      metric.cacheHit = cacheHit;
      if (error) {
        metric.error = error;
      }
    }
  }

  /**
   * Get performance statistics
   */
  getStats(): SearchPerformanceStats {
    const completedSearches = this.metrics.filter(m => m.duration !== undefined);
    
    if (completedSearches.length === 0) {
      return {
        totalSearches: 0,
        averageResponseTime: 0,
        cacheHitRate: 0,
        errorRate: 0,
        popularQueries: [],
        slowQueries: []
      };
    }

    const totalSearches = completedSearches.length;
    const averageResponseTime = completedSearches.reduce((sum, m) => sum + (m.duration || 0), 0) / totalSearches;
    const cacheHitRate = completedSearches.filter(m => m.cacheHit).length / totalSearches;
    const errorRate = completedSearches.filter(m => m.error).length / totalSearches;

    // Popular queries
    const queryCounts = new Map<string, number>();
    completedSearches.forEach(m => {
      const count = queryCounts.get(m.query) || 0;
      queryCounts.set(m.query, count + 1);
    });
    
    const popularQueries = Array.from(queryCounts.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Slow queries
    const slowQueries = completedSearches
      .filter(m => (m.duration || 0) > this.SLOW_QUERY_THRESHOLD)
      .map(m => ({ query: m.query, duration: m.duration || 0 }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    return {
      totalSearches,
      averageResponseTime,
      cacheHitRate,
      errorRate,
      popularQueries,
      slowQueries
    };
  }

  /**
   * Get recent search metrics
   */
  getRecentMetrics(limit = 20): SearchMetrics[] {
    return this.metrics.slice(-limit).reverse();
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Export metrics for debugging
   */
  exportMetrics(): SearchMetrics[] {
    return [...this.metrics];
  }

  /**
   * Get performance insights
   */
  getInsights(): string[] {
    const stats = this.getStats();
    const insights: string[] = [];

    if (stats.totalSearches === 0) {
      return ['No search data available'];
    }

    // Response time insights
    if (stats.averageResponseTime > 500) {
      insights.push(`⚠️ Average response time is ${stats.averageResponseTime.toFixed(0)}ms - consider optimizing`);
    } else if (stats.averageResponseTime < 200) {
      insights.push(`✅ Excellent average response time: ${stats.averageResponseTime.toFixed(0)}ms`);
    }

    // Cache insights
    if (stats.cacheHitRate < 0.3) {
      insights.push(`⚠️ Low cache hit rate (${(stats.cacheHitRate * 100).toFixed(1)}%) - consider improving caching`);
    } else if (stats.cacheHitRate > 0.7) {
      insights.push(`✅ Great cache hit rate: ${(stats.cacheHitRate * 100).toFixed(1)}%`);
    }

    // Error insights
    if (stats.errorRate > 0.05) {
      insights.push(`⚠️ High error rate: ${(stats.errorRate * 100).toFixed(1)}% - investigate search failures`);
    }

    // Slow query insights
    if (stats.slowQueries.length > 0) {
      insights.push(`🐌 ${stats.slowQueries.length} slow queries detected - consider query optimization`);
    }

    return insights;
  }
}

// Singleton instance
export const searchPerformanceMonitor = new SearchPerformanceMonitor();

// Development helper functions
if (import.meta.env.DEV) {
  (window as any).searchPerformance = {
    getStats: () => searchPerformanceMonitor.getStats(),
    getRecentMetrics: (limit?: number) => searchPerformanceMonitor.getRecentMetrics(limit),
    getInsights: () => searchPerformanceMonitor.getInsights(),
    clear: () => searchPerformanceMonitor.clear(),
    export: () => searchPerformanceMonitor.exportMetrics()
  };
} 