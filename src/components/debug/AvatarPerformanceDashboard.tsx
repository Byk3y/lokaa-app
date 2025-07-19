import { log } from '@/utils/logger';
/**
 * 📊 LIVE AVATAR PERFORMANCE DASHBOARD
 * 
 * Real-time monitoring dashboard for avatar system performance:
 * - Live cache performance metrics with charts
 * - Avatar loading performance analytics
 * - Space member preloading efficiency
 * - Memory usage and optimization insights
 * - Actionable performance recommendations
 * 
 * 🎛️ CONTROLS: Can be easily disabled for production
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AvatarCacheService } from '@/services/AvatarCacheService';
import { 
  Activity, 
  Zap, 
  Database, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  BarChart3,
  Settings,
  Eye,
  Target,
  Gauge,
  EyeOff
} from 'lucide-react';

// 🎛️ Global control for avatar analytics
const ENABLE_AVATAR_ANALYTICS = process.env.NODE_ENV === 'development' && 
  (typeof window !== 'undefined' && (window as any).__ENABLE_AVATAR_ANALYTICS__ !== false);

interface PerformanceMetrics {
  cacheStats: {
    totalEntries: number;
    hitRate: number;
    totalHits: number;
    totalMisses: number;
    cacheSize: number;
    preloadCount: number;
    evictionCount: number;
  };
  loadingMetrics: {
    averageLoadTime: number;
    fastestLoad: number;
    slowestLoad: number;
    totalLoads: number;
  };
  uxMetrics: {
    userSatisfaction: string;
    cacheEfficiency: string;
    performanceGrade: string;
    recommendations: string[];
  };
  recommendations: string[];
  lastPreloadResults?: {
    loaded: number;
    failed: number;
    cached: number;
    duration: number;
  };
}

interface PerformanceSample {
  timestamp: number;
  hitRate: number;
  loadTime: number;
  cacheSize: number;
}

export const AvatarPerformanceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [performanceHistory, setPerformanceHistory] = useState<PerformanceSample[]>([]);
  const [testResults, setTestResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // 🎛️ Early return if analytics disabled
  if (!ENABLE_AVATAR_ANALYTICS) {
    return null;
  }

  // Fetch comprehensive performance metrics
  const fetchMetrics = useCallback(async () => {
    try {
      const stats = AvatarCacheService.getStats();
      
      // Get loading performance from window performance API with safety checks
      const navigationEntries = window.performance?.getEntriesByType?.('navigation') as PerformanceNavigationTiming[] || [];
      const loadingMetrics = {
        averageLoadTime: navigationEntries.length > 0 ? Math.round(navigationEntries[0].loadEventEnd - navigationEntries[0].loadEventStart) : 150,
        fastestLoad: 120, // Simulated for demo
        slowestLoad: 800, // Simulated for demo  
        totalLoads: stats.totalHits + stats.totalMisses
      };

      // Get user experience metrics with safety checks
      const uxMetrics = {
        userSatisfaction: stats.hitRate > 0.8 ? 'Excellent' : stats.hitRate > 0.5 ? 'Good' : stats.hitRate > 0.3 ? 'Fair' : 'Poor',
        cacheEfficiency: `${(stats.hitRate * 100).toFixed(1)}%`,
        performanceGrade: getPerformanceGrade(stats, loadingMetrics),
        recommendations: AvatarCacheService.generateRecommendations()
      };

      setMetrics({
        cacheStats: stats,
        loadingMetrics,
        uxMetrics,
        recommendations: uxMetrics.recommendations
      });

      // Expose AvatarCacheService globally for testing
      if (typeof window !== 'undefined') {
        (window as any).AvatarCacheService = AvatarCacheService;
      }

    } catch (error) {
      log.error('Component', '❌ [AvatarDashboard] Failed to fetch metrics:', error);
      setError(`Failed to load metrics: ${error.message}`);
      // Set fallback metrics with complete structure
      setMetrics({
        cacheStats: { 
          totalEntries: 0, 
          hitRate: 0, 
          totalHits: 0, 
          totalMisses: 0, 
          cacheSize: 0, 
          preloadCount: 0, 
          evictionCount: 0 
        },
        loadingMetrics: { 
          averageLoadTime: 0, 
          fastestLoad: 0, 
          slowestLoad: 0, 
          totalLoads: 0 
        },
        uxMetrics: { 
          userSatisfaction: 'Unknown', 
          cacheEfficiency: '0%', 
          performanceGrade: 'F', 
          recommendations: [] 
        },
        recommendations: ['Unable to load performance data']
      });
    }
  }, []);

  // Auto-refresh metrics
  useEffect(() => {
    fetchMetrics();
    
    if (autoRefresh && isVisible) {
      const interval = setInterval(fetchMetrics, 3000); // Every 3 seconds when visible
      return () => clearInterval(interval);
    }
  }, [fetchMetrics, autoRefresh, isVisible]);

  // Manual refresh with loading state
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchMetrics();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Test avatar preloading performance
  const handleTestPreloading = useCallback(async () => {
    try {
      log.debug('Component', '🧪 [Dashboard] Testing avatar preloading...');
      
      // Use the hardcoded space ID for nocode-architects for testing
      const testSpaceId = '235e68d1-89df-4d2d-8945-e7756d60de20'; // nocode-architects
      
      const result = await AvatarCacheService.preloadSpaceAvatars(testSpaceId);
      log.debug('Component', '✅ [Dashboard] Preload test completed:', result);
      setTestResults(result);
    } catch (error) {
      log.error('Component', '❌ [Dashboard] Preload test failed:', error);
    }
  }, []);

  // Calculate performance grade with proper error handling
  const getPerformanceGrade = (cacheStats: any, loadingMetrics: any): string => {
    try {
      // Safety checks for all required properties
      if (!cacheStats || !loadingMetrics) return 'F';
      
      const { hitRate = 0 } = cacheStats;
      const { averageLoadTime = 1000 } = loadingMetrics;
      
      // Grade calculation
      let score = 0;
      
      // Cache hit rate scoring (40 points max)
      if (hitRate >= 0.9) score += 40;
      else if (hitRate >= 0.8) score += 35;
      else if (hitRate >= 0.7) score += 30;
      else if (hitRate >= 0.5) score += 20;
      else if (hitRate >= 0.3) score += 10;
      
      // Load time scoring (30 points max)
      if (averageLoadTime <= 100) score += 30;
      else if (averageLoadTime <= 200) score += 25;
      else if (averageLoadTime <= 400) score += 20;
      else if (averageLoadTime <= 600) score += 15;
      else if (averageLoadTime <= 800) score += 10;
      
      // Cache size utilization (30 points max)
      const cacheUtilization = (cacheStats.totalEntries || 0) / 1000; // 1000 is max cache size
      if (cacheUtilization >= 0.5) score += 30;
      else if (cacheUtilization >= 0.3) score += 25;
      else if (cacheUtilization >= 0.1) score += 20;
      else score += 10;
      
      // Convert to letter grade
      if (score >= 90) return 'A+';
      if (score >= 85) return 'A';
      if (score >= 80) return 'A-';
      if (score >= 75) return 'B+';
      if (score >= 70) return 'B';
      if (score >= 65) return 'B-';
      if (score >= 60) return 'C+';
      if (score >= 55) return 'C';
      if (score >= 50) return 'C-';
      if (score >= 45) return 'D';
      return 'F';
    } catch (error) {
      log.warn('Component', '⚠️ [AvatarDashboard] Grade calculation failed:', error);
      return 'F';
    }
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsVisible(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
          size="sm"
        >
          <Gauge className="w-4 h-4 mr-2" />
          Avatar Analytics
        </Button>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="fixed bottom-4 right-4 w-80 bg-white shadow-2xl rounded-lg border z-50">
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4" />
          <p>Loading avatar performance metrics...</p>
        </CardContent>
      </div>
    );
  }

  const { cacheStats = {}, loadingMetrics = {}, recommendations = [] } = metrics || {};
  
  // Add fallback values to prevent undefined errors
  const safeCacheStats = {
    totalEntries: 0,
    hitRate: 0,
    totalHits: 0,
    totalMisses: 0,
    cacheSize: 0,
    preloadCount: 0,
    evictionCount: 0,
    ...cacheStats
  };
  
  const safeLoadingMetrics = {
    averageLoadTime: 0,
    fastestLoad: 0,
    slowestLoad: 0,
    totalLoads: 0,
    ...loadingMetrics
  };

  const performance = getPerformanceGrade(safeCacheStats, safeLoadingMetrics);

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-[80vh] overflow-y-auto bg-white shadow-2xl rounded-lg border z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Avatar Performance</h3>
          <Badge variant="outline" className="text-xs">Live</Badge>
        </div>
        <div className="flex gap-1">
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="ghost"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            onClick={() => setIsVisible(false)}
            variant="ghost"
            size="sm"
          >
            <Eye className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Performance Grade */}
      <div className="p-4 text-center border-b">
        <div className={`text-3xl font-bold ${performance === 'A+' ? 'text-green-600' : performance === 'A' ? 'text-green-500' : performance === 'A-' ? 'text-green-400' : performance === 'B+' ? 'text-blue-500' : performance === 'B' ? 'text-blue-400' : performance === 'B-' ? 'text-blue-300' : performance === 'C+' ? 'text-yellow-500' : performance === 'C' ? 'text-yellow-400' : performance === 'C-' ? 'text-yellow-300' : 'text-red-500'} mb-1`}>
          {performance}
        </div>
        <p className="text-sm text-gray-600">
          {performance === 'A+' ? 'Outstanding' : performance === 'A' ? 'Excellent' : performance === 'A-' ? 'Very Good' : performance === 'B+' ? 'Very Good' : performance === 'B' ? 'Good' : performance === 'B-' ? 'Fair' : performance === 'C+' ? 'Fair' : performance === 'C' ? 'Needs Improvement' : performance === 'C-' ? 'Poor' : 'Poor'}
        </p>
        <div className="mt-2 flex justify-center gap-4 text-xs text-gray-500">
          <span>Hit Rate: {(safeCacheStats.hitRate * 100).toFixed(1)}%</span>
          <span>Avg Load: {safeLoadingMetrics.averageLoadTime.toFixed(0)}ms</span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="p-4 space-y-4">
        {/* Cache Performance */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Cache Hit Rate</span>
            <span className="text-sm font-bold text-green-600">
              {(safeCacheStats.hitRate * 100).toFixed(1)}%
            </span>
          </div>
          <Progress value={safeCacheStats.hitRate * 100} className="h-2" />
          <div className="text-xs text-gray-500">
            {safeCacheStats.totalHits} hits • {safeCacheStats.totalMisses} misses
          </div>
        </div>

        {/* Cache Size */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Cache Utilization</span>
            <span className="text-sm font-bold text-blue-600">
              {safeCacheStats.totalEntries}/1000
            </span>
          </div>
          <Progress value={(safeCacheStats.totalEntries / 1000) * 100} className="h-2" />
          <div className="text-xs text-gray-500">
            {safeCacheStats.preloadCount} preloaded • {Math.round(safeCacheStats.cacheSize / 1024)} KB
          </div>
        </div>

        {/* Loading Performance */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-sm font-medium text-gray-700 mb-2">Loading Performance</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-500">Average:</span>
              <span className="ml-1 font-medium">{safeLoadingMetrics.averageLoadTime.toFixed(0)}ms</span>
            </div>
            <div>
              <span className="text-gray-500">Total Loads:</span>
              <span className="ml-1 font-medium">{safeLoadingMetrics.totalLoads}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t space-y-2">
        <Button 
          onClick={handleTestPreloading} 
          variant="outline" 
          size="sm" 
          className="w-full"
        >
          <Target className="w-4 h-4 mr-2" />
          Test Preloading
        </Button>
        
        <Button
          onClick={() => setAutoRefresh(!autoRefresh)}
          variant={autoRefresh ? 'default' : 'outline'}
          size="sm"
          className="w-full"
        >
          <Activity className="w-4 h-4 mr-2" />
          {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
        </Button>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="p-4 border-t">
          <div className="text-sm font-medium text-gray-700 mb-2">Insights</div>
          <div className="space-y-2">
            {recommendations.slice(0, 2).map((rec, index) => (
              <div key={index} className="text-xs bg-blue-50 text-blue-800 p-2 rounded">
                {rec}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test Results */}
      {testResults && (
        <div className="p-4 border-t bg-green-50">
          <div className="text-sm font-medium text-green-800 mb-2">Last Test Results</div>
          <div className="grid grid-cols-2 gap-2 text-xs text-green-700">
            <div>Loaded: {testResults.loaded}</div>
            <div>Cached: {testResults.cached}</div>
            <div>Failed: {testResults.failed}</div>
            <div>Time: {testResults.duration}ms</div>
          </div>
        </div>
      )}
    </div>
  );
} 