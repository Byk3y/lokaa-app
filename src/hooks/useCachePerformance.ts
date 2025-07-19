import { log } from '@/utils/logger';
import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { cacheHealth, cacheDebug } from '@/utils/cacheUtils';

interface CacheMetrics {
  totalQueries: number;
  activeQueries: number;
  staleQueries: number;
  errorQueries: number;
  cacheSize: number;
  hitRate: number;
  memoryUsageMB: number;
  lastUpdated: Date;
}

interface CacheEvent {
  type: 'hit' | 'miss' | 'error' | 'prefetch';
  key: string;
  timestamp: Date;
  duration?: number;
}

/**
 * Hook for monitoring and analyzing cache performance
 * Provides insights into cache efficiency and memory usage
 */
export function useCachePerformance() {
  const queryClient = useQueryClient();
  const [metrics, setMetrics] = useState<CacheMetrics | null>(null);
  const [events, setEvents] = useState<CacheEvent[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Collect cache metrics
  const collectMetrics = useCallback(() => {
    const stats = cacheHealth.getStats(queryClient);
    const memoryUsageMB = stats.cacheSize / (1024 * 1024);
    
    // Calculate hit rate from recent events
    const recentEvents = events.slice(-100); // Last 100 events
    const hits = recentEvents.filter(e => e.type === 'hit').length;
    const totalRequests = recentEvents.filter(e => e.type === 'hit' || e.type === 'miss').length;
    const hitRate = totalRequests > 0 ? (hits / totalRequests) * 100 : 0;

    const newMetrics: CacheMetrics = {
      totalQueries: stats.totalQueries,
      activeQueries: stats.activeQueries,
      staleQueries: stats.staleQueries,
      errorQueries: stats.errorQueries,
      cacheSize: stats.cacheSize,
      hitRate,
      memoryUsageMB,
      lastUpdated: new Date(),
    };

    setMetrics(newMetrics);
    return newMetrics;
  }, [queryClient, events]);

  // Log cache event
  const logEvent = useCallback((event: Omit<CacheEvent, 'timestamp'>) => {
    const newEvent: CacheEvent = {
      ...event,
      timestamp: new Date(),
    };
    
    setEvents(prev => {
      // Keep only last 1000 events to prevent memory issues
      const updated = [...prev, newEvent];
      return updated.slice(-1000);
    });
  }, []);

  // Start performance monitoring
  const startMonitoring = useCallback(() => {
    if (isMonitoring) return;
    
    setIsMonitoring(true);
    
    // Collect metrics every 5 seconds
    const metricsInterval = setInterval(collectMetrics, 5000);
    
    // Initial collection
    collectMetrics();
    
    if (process.env.NODE_ENV === 'development') {
      log.debug('Hook', '🔍 Cache performance monitoring started');
    }
    
    return () => {
      clearInterval(metricsInterval);
      setIsMonitoring(false);
    };
  }, [isMonitoring, collectMetrics]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
  }, []);

  // Clear stale cache entries
  const cleanupStaleCache = useCallback(async () => {
    const clearedCount = await cacheHealth.clearStaleCache(queryClient);
    
    logEvent({
      type: 'prefetch',
      key: 'cache_cleanup',
      duration: 0,
    });
    
    // Recollect metrics after cleanup
    collectMetrics();
    
    return clearedCount;
  }, [queryClient, logEvent, collectMetrics]);

  // Check for memory issues
  const checkMemoryHealth = useCallback((maxSizeMB = 50) => {
    const isOverLimit = cacheHealth.checkMemoryUsage(queryClient, maxSizeMB);
    
    if (isOverLimit && metrics) {
      logEvent({
        type: 'error',
        key: 'memory_warning',
        duration: 0,
      });
      
      return {
        warning: true,
        currentUsage: metrics.memoryUsageMB,
        limit: maxSizeMB,
        recommendation: 'Consider calling cleanupStaleCache() or reducing cache TTL',
      };
    }
    
    return { warning: false };
  }, [queryClient, metrics, logEvent]);

  // Get cache statistics for debugging
  const getDebugInfo = useCallback(() => {
    return {
      metrics,
      recentEvents: events.slice(-20),
      cacheVisualization: () => cacheDebug.visualizeCache(queryClient),
    };
  }, [metrics, events, queryClient]);

  // Get performance insights
  const getPerformanceInsights = useCallback(() => {
    if (!metrics) return null;
    
    const insights: string[] = [];
    
    // Hit rate analysis
    if (metrics.hitRate < 70) {
      insights.push(`Low cache hit rate (${metrics.hitRate.toFixed(1)}%). Consider increasing TTL or implementing prefetching.`);
    } else if (metrics.hitRate > 90) {
      insights.push(`Excellent cache hit rate (${metrics.hitRate.toFixed(1)}%)! Cache is working efficiently.`);
    }
    
    // Memory analysis
    if (metrics.memoryUsageMB > 50) {
      insights.push(`High memory usage (${metrics.memoryUsageMB.toFixed(2)}MB). Consider cache cleanup.`);
    }
    
    // Stale queries analysis
    if (metrics.staleQueries > metrics.totalQueries * 0.3) {
      insights.push(`Many stale queries (${metrics.staleQueries}/${metrics.totalQueries}). Consider background refresh.`);
    }
    
    // Error analysis
    if (metrics.errorQueries > 0) {
      insights.push(`${metrics.errorQueries} queries have errors. Check network connectivity and API endpoints.`);
    }
    
    return insights;
  }, [metrics]);

  // Export cache data for analysis
  const exportCacheData = useCallback(() => {
    return {
      metrics,
      events: events.slice(-500), // Last 500 events
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };
  }, [metrics, events]);

  // Auto-start monitoring in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const cleanup = startMonitoring();
      return cleanup;
    }
  }, [startMonitoring]);

  return {
    // Data
    metrics,
    events: events.slice(-50), // Return last 50 events
    isMonitoring,
    
    // Actions
    startMonitoring,
    stopMonitoring,
    collectMetrics,
    cleanupStaleCache,
    checkMemoryHealth,
    
    // Analytics
    getDebugInfo,
    getPerformanceInsights,
    exportCacheData,
    
    // Utilities
    logEvent,
  };
} 