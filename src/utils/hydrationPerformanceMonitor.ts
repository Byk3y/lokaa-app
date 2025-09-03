import { log } from '@/utils/logger';
/**
 * 📊 Hydration Performance Monitor
 * 
 * Phase 6B: Comprehensive performance monitoring and metrics collection
 * for state hydration system.
 */

export interface HydrationMetrics {
  componentId: string;
  userId: string;
  hydrationTime: number;
  saveCount: number;
  errorCount: number;
  lastSaveTime: number | null;
  cacheHitRate: number;
  averageSaveTime: number;
  totalErrors: number;
  performanceScore: number;
}

export interface PerformanceThresholds {
  maxHydrationTime: number;
  maxSaveTime: number;
  minCacheHitRate: number;
  maxErrorRate: number;
  targetPerformanceScore: number;
}

class HydrationPerformanceMonitor {
  private static instance: HydrationPerformanceMonitor;
  private metrics: Map<string, HydrationMetrics> = new Map();
  private thresholds: PerformanceThresholds = {
    maxHydrationTime: 100, // ms
    maxSaveTime: 50, // ms
    minCacheHitRate: 80, // %
    maxErrorRate: 5, // %
    targetPerformanceScore: 90 // out of 100
  };

  private constructor() {
    this.initializeMonitoring();
  }

  static getInstance(): HydrationPerformanceMonitor {
    if (!HydrationPerformanceMonitor.instance) {
      HydrationPerformanceMonitor.instance = new HydrationPerformanceMonitor();
    }
    return HydrationPerformanceMonitor.instance;
  }

  /**
   * 📈 RECORD HYDRATION METRICS
   */
  recordHydration(
    componentId: string,
    userId: string,
    hydrationTime: number,
    success: boolean
  ): void {
    const key = `${componentId}-${userId}`;
    const existing = this.metrics.get(key);
    
    const metrics: HydrationMetrics = {
      componentId,
      userId,
      hydrationTime,
      saveCount: existing?.saveCount || 0,
      errorCount: existing?.errorCount || (success ? 0 : 1),
      lastSaveTime: existing?.lastSaveTime || null,
      cacheHitRate: existing?.cacheHitRate || (success ? 100 : 0),
      averageSaveTime: existing?.averageSaveTime || 0,
      totalErrors: existing?.totalErrors || (success ? 0 : 1),
      performanceScore: this.calculatePerformanceScore(hydrationTime, success)
    };

    this.metrics.set(key, metrics);
    
    if (process.env.NODE_ENV === 'development') {
      log.debug('Performance', `📊 [HydrationMonitor] Recorded hydration for ${componentId}: ${hydrationTime}ms (${success ? 'success' : 'failed'})`);
    }
  }

  /**
   * 💾 RECORD SAVE METRICS
   */
  recordSave(
    componentId: string,
    userId: string,
    saveTime: number,
    success: boolean
  ): void {
    const key = `${componentId}-${userId}`;
    const existing = this.metrics.get(key);
    
    if (!existing) return;

    const newSaveCount = existing.saveCount + 1;
    const newErrorCount = existing.errorCount + (success ? 0 : 1);
    const newAverageSaveTime = (existing.averageSaveTime * existing.saveCount + saveTime) / newSaveCount;

    const updatedMetrics: HydrationMetrics = {
      ...existing,
      saveCount: newSaveCount,
      errorCount: newErrorCount,
      lastSaveTime: Date.now(),
      averageSaveTime: newAverageSaveTime,
      totalErrors: existing.totalErrors + (success ? 0 : 1),
      performanceScore: this.calculatePerformanceScore(existing.hydrationTime, true, newAverageSaveTime, newErrorCount)
    };

    this.metrics.set(key, updatedMetrics);
    
    if (process.env.NODE_ENV === 'development') {
      log.debug('Performance', `💾 [HydrationMonitor] Recorded save for ${componentId}: ${saveTime}ms (${success ? 'success' : 'failed'})`);
    }
  }

  /**
   * 📊 GET PERFORMANCE REPORT
   */
  getPerformanceReport(): {
    overall: {
      averageHydrationTime: number;
      averageSaveTime: number;
      overallCacheHitRate: number;
      overallErrorRate: number;
      overallPerformanceScore: number;
    };
    components: HydrationMetrics[];
    recommendations: string[];
  } {
    const components = Array.from(this.metrics.values());
    
    if (components.length === 0) {
      return {
        overall: {
          averageHydrationTime: 0,
          averageSaveTime: 0,
          overallCacheHitRate: 0,
          overallErrorRate: 0,
          overallPerformanceScore: 0
        },
        components: [],
        recommendations: ['No hydration data available yet']
      };
    }

    const totalHydrationTime = components.reduce((sum, c) => sum + c.hydrationTime, 0);
    const totalSaveTime = components.reduce((sum, c) => sum + c.averageSaveTime, 0);
    const totalSaves = components.reduce((sum, c) => sum + c.saveCount, 0);
    const totalErrors = components.reduce((sum, c) => sum + c.totalErrors, 0);
    const totalOperations = totalSaves + components.length;

    const overall = {
      averageHydrationTime: totalHydrationTime / components.length,
      averageSaveTime: totalSaveTime / components.length,
      overallCacheHitRate: (components.reduce((sum, c) => sum + c.cacheHitRate, 0) / components.length),
      overallErrorRate: (totalErrors / totalOperations) * 100,
      overallPerformanceScore: components.reduce((sum, c) => sum + c.performanceScore, 0) / components.length
    };

    const recommendations = this.generateRecommendations(overall, components);

    return {
      overall,
      components,
      recommendations
    };
  }

  /**
   * 🎯 CALCULATE PERFORMANCE SCORE
   */
  private calculatePerformanceScore(
    hydrationTime: number,
    success: boolean,
    saveTime: number = 0,
    errorCount: number = 0
  ): number {
    let score = 100;

    // Hydration time penalty
    if (hydrationTime > this.thresholds.maxHydrationTime) {
      score -= Math.min(30, (hydrationTime - this.thresholds.maxHydrationTime) / 10);
    }

    // Save time penalty
    if (saveTime > this.thresholds.maxSaveTime) {
      score -= Math.min(20, (saveTime - this.thresholds.maxSaveTime) / 5);
    }

    // Error penalty
    if (errorCount > 0) {
      score -= Math.min(40, errorCount * 10);
    }

    // Success bonus
    if (success) {
      score += 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 💡 GENERATE RECOMMENDATIONS
   */
  private generateRecommendations(
    overall: any,
    components: HydrationMetrics[]
  ): string[] {
    const recommendations: string[] = [];

    if (overall.averageHydrationTime > this.thresholds.maxHydrationTime) {
      recommendations.push('Consider optimizing hydration performance - average time exceeds threshold');
    }

    if (overall.averageSaveTime > this.thresholds.maxSaveTime) {
      recommendations.push('Consider optimizing save operations - average time exceeds threshold');
    }

    if (overall.overallCacheHitRate < this.thresholds.minCacheHitRate) {
      recommendations.push('Cache hit rate is below target - consider improving cache strategy');
    }

    if (overall.overallErrorRate > this.thresholds.maxErrorRate) {
      recommendations.push('Error rate is above threshold - investigate and fix issues');
    }

    if (overall.overallPerformanceScore < this.thresholds.targetPerformanceScore) {
      recommendations.push('Overall performance score is below target - review and optimize');
    }

    // Component-specific recommendations
    const slowComponents = components.filter(c => c.hydrationTime > this.thresholds.maxHydrationTime);
    if (slowComponents.length > 0) {
      recommendations.push(`Slow components detected: ${slowComponents.map(c => c.componentId).join(', ')}`);
    }

    const errorProneComponents = components.filter(c => c.totalErrors > 0);
    if (errorProneComponents.length > 0) {
      recommendations.push(`Error-prone components: ${errorProneComponents.map(c => c.componentId).join(', ')}`);
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance is within acceptable thresholds');
    }

    return recommendations;
  }

  /**
   * 🔧 UPDATE THRESHOLDS
   */
  updateThresholds(newThresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    
    if (process.env.NODE_ENV === 'development') {
      log.debug('Performance', '📊 [HydrationMonitor] Updated performance thresholds:', newThresholds);
    }
  }

  /**
   * 🧹 CLEAR METRICS
   */
  clearMetrics(): void {
    this.metrics.clear();
    
    if (process.env.NODE_ENV === 'development') {
      log.debug('Performance', '🧹 [HydrationMonitor] Cleared all metrics');
    }
  }

  /**
   * 📱 INITIALIZE MONITORING
   */
  private initializeMonitoring(): void {
    if (process.env.NODE_ENV === 'development') {
      // Log performance report every 30 seconds in development
      setInterval(() => {
        const report = this.getPerformanceReport();
        if (report.components.length > 0) {
          log.debug('Performance', '📊 [HydrationMonitor] Performance Report:', report);
        }
      }, 30000);
    }
  }
}

// Export singleton instance
export const hydrationPerformanceMonitor = HydrationPerformanceMonitor.getInstance();

// Export types
export type { HydrationMetrics, PerformanceThresholds };
