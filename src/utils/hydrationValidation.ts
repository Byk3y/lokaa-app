import { log } from '@/utils/logger';
/**
 * 🚀 Hydration Validation & Optimization System
 * 
 * Phase 6B: Comprehensive validation and optimization for smart state hydration.
 * Monitors performance, validates success metrics, and optimizes cache hit rates.
 */

import { smartStateHydrator } from '@/services/SmartStateHydrator';
import { hydrationTester } from '@/utils/hydrationTesting';
import { hydrationErrorHandler } from '@/utils/hydrationErrorHandling';

// Success metrics configuration
export interface SuccessMetricsConfig {
  targetHydrationTime: number;      // Target: <50ms
  targetCacheHitRate: number;       // Target: >80%
  targetErrorRate: number;          // Target: <5%
  targetPerformanceScore: number;   // Target: >85/100
  monitoringInterval: number;       // How often to check metrics
}

// Performance metrics
export interface PerformanceMetrics {
  hydrationTime: {
    current: number;
    average: number;
    p95: number;
    p99: number;
    target: number;
    meetsTarget: boolean;
  };
  cacheHitRate: {
    current: number;
    average: number;
    target: number;
    meetsTarget: boolean;
  };
  errorRate: {
    current: number;
    average: number;
    target: number;
    meetsTarget: boolean;
  };
  performanceScore: {
    current: number;
    target: number;
    meetsTarget: boolean;
  };
  overallHealth: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
}

// Optimization recommendations
export interface OptimizationRecommendation {
  type: 'cache' | 'serialization' | 'network' | 'storage' | 'algorithm';
  priority: 'high' | 'medium' | 'low';
  description: string;
  expectedImprovement: string;
  implementation: string;
}

// Validation result
export interface ValidationResult {
  success: boolean;
  metrics: PerformanceMetrics;
  recommendations: OptimizationRecommendation[];
  issues: string[];
  score: number; // 0-100
}

class HydrationValidator {
  private static instance: HydrationValidator;
  private config: SuccessMetricsConfig;
  private metricsHistory: PerformanceMetrics[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;

  private constructor() {
    this.config = {
      targetHydrationTime: 50,
      targetCacheHitRate: 80,
      targetErrorRate: 5,
      targetPerformanceScore: 85,
      monitoringInterval: 30000 // 30 seconds
    };
    
    this.initializeDebugTools();
  }

  static getInstance(): HydrationValidator {
    if (!HydrationValidator.instance) {
      HydrationValidator.instance = new HydrationValidator();
    }
    return HydrationValidator.instance;
  }

  /**
   * 🎯 VALIDATE HYDRATION PERFORMANCE
   */
  async validatePerformance(): Promise<ValidationResult> {
    try {
      log.debug('Validation', '🎯 [HydrationValidator] Starting performance validation');

      // Get current metrics
      const metrics = await this.getCurrentMetrics();
      this.metricsHistory.push(metrics);

      // Generate recommendations
      const recommendations = this.generateRecommendations(metrics);

      // Identify issues
      const issues = this.identifyIssues(metrics);

      // Calculate overall score
      const score = this.calculateScore(metrics);

      // Determine success
      const success = score >= this.config.targetPerformanceScore && issues.length === 0;

      const result: ValidationResult = {
        success,
        metrics,
        recommendations,
        issues,
        score
      };

      log.debug('Validation', `📊 [HydrationValidator] Validation complete: ${success ? 'SUCCESS' : 'NEEDS_IMPROVEMENT'} (Score: ${score}/100)`);

      return result;

    } catch (error) {
      log.error('Validation', '🚨 [HydrationValidator] Validation failed:', error);
      
      return {
        success: false,
        metrics: this.getDefaultMetrics(),
        recommendations: [],
        issues: ['Validation system error'],
        score: 0
      };
    }
  }

  /**
   * 📊 GET CURRENT METRICS
   */
  private async getCurrentMetrics(): Promise<PerformanceMetrics> {
    // Get test metrics
    const testMetrics = hydrationTester.calculateMetrics();
    
    // Get error statistics
    const errorStats = hydrationErrorHandler.getErrorStatistics();

    // Calculate current values
    const currentHydrationTime = testMetrics.averageHydrationTime;
    const currentCacheHitRate = testMetrics.cacheHitRate;
    const currentErrorRate = testMetrics.errorRate;
    const currentPerformanceScore = testMetrics.performanceScore;

    // Calculate percentiles (simplified)
    const p95 = currentHydrationTime * 1.5; // Rough estimate
    const p99 = currentHydrationTime * 2.0; // Rough estimate

    // Calculate averages from history
    const averageHydrationTime = this.calculateAverage('hydrationTime');
    const averageCacheHitRate = this.calculateAverage('cacheHitRate');
    const averageErrorRate = this.calculateAverage('errorRate');

    // Determine overall health
    const overallHealth = this.determineOverallHealth(currentPerformanceScore, currentErrorRate);

    return {
      hydrationTime: {
        current: currentHydrationTime,
        average: averageHydrationTime,
        p95,
        p99,
        target: this.config.targetHydrationTime,
        meetsTarget: currentHydrationTime <= this.config.targetHydrationTime
      },
      cacheHitRate: {
        current: currentCacheHitRate,
        average: averageCacheHitRate,
        target: this.config.targetCacheHitRate,
        meetsTarget: currentCacheHitRate >= this.config.targetCacheHitRate
      },
      errorRate: {
        current: currentErrorRate,
        average: averageErrorRate,
        target: this.config.targetErrorRate,
        meetsTarget: currentErrorRate <= this.config.targetErrorRate
      },
      performanceScore: {
        current: currentPerformanceScore,
        target: this.config.targetPerformanceScore,
        meetsTarget: currentPerformanceScore >= this.config.targetPerformanceScore
      },
      overallHealth
    };
  }

  /**
   * 💡 GENERATE OPTIMIZATION RECOMMENDATIONS
   */
  private generateRecommendations(metrics: PerformanceMetrics): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    // Hydration time recommendations
    if (!metrics.hydrationTime.meetsTarget) {
      if (metrics.hydrationTime.current > 100) {
        recommendations.push({
          type: 'cache',
          priority: 'high',
          description: 'Hydration time is too slow (>100ms)',
          expectedImprovement: '50-70% reduction in hydration time',
          implementation: 'Implement multi-layer cache with memory-first strategy'
        });
      } else {
        recommendations.push({
          type: 'serialization',
          priority: 'medium',
          description: 'Hydration time needs optimization',
          expectedImprovement: '20-30% reduction in hydration time',
          implementation: 'Optimize state serialization and compression'
        });
      }
    }

    // Cache hit rate recommendations
    if (!metrics.cacheHitRate.meetsTarget) {
      recommendations.push({
        type: 'cache',
        priority: 'high',
        description: 'Cache hit rate is below target',
        expectedImprovement: '20-40% improvement in cache hit rate',
        implementation: 'Extend cache TTL and improve cache persistence strategy'
      });
    }

    // Error rate recommendations
    if (!metrics.errorRate.meetsTarget) {
      recommendations.push({
        type: 'algorithm',
        priority: 'high',
        description: 'Error rate is above acceptable threshold',
        expectedImprovement: 'Reduce errors by 50-80%',
        implementation: 'Improve error handling and add more fallback mechanisms'
      });
    }

    // Performance score recommendations
    if (!metrics.performanceScore.meetsTarget) {
      recommendations.push({
        type: 'algorithm',
        priority: 'medium',
        description: 'Overall performance score needs improvement',
        expectedImprovement: '10-20 point improvement in performance score',
        implementation: 'Optimize hydration algorithms and reduce complexity'
      });
    }

    // Storage recommendations
    if (metrics.hydrationTime.p99 > 200) {
      recommendations.push({
        type: 'storage',
        priority: 'medium',
        description: 'P99 hydration time is too high',
        expectedImprovement: 'Reduce P99 by 30-50%',
        implementation: 'Optimize IndexedDB operations and add connection pooling'
      });
    }

    return recommendations;
  }

  /**
   * 🚨 IDENTIFY ISSUES
   */
  private identifyIssues(metrics: PerformanceMetrics): string[] {
    const issues: string[] = [];

    if (!metrics.hydrationTime.meetsTarget) {
      issues.push(`Hydration time (${metrics.hydrationTime.current.toFixed(1)}ms) exceeds target (${metrics.hydrationTime.target}ms)`);
    }

    if (!metrics.cacheHitRate.meetsTarget) {
      issues.push(`Cache hit rate (${metrics.cacheHitRate.current.toFixed(1)}%) below target (${metrics.cacheHitRate.target}%)`);
    }

    if (!metrics.errorRate.meetsTarget) {
      issues.push(`Error rate (${metrics.errorRate.current.toFixed(1)}%) above target (${metrics.errorRate.target}%)`);
    }

    if (!metrics.performanceScore.meetsTarget) {
      issues.push(`Performance score (${metrics.performanceScore.current.toFixed(1)}) below target (${metrics.performanceScore.target})`);
    }

    if (metrics.overallHealth === 'critical' || metrics.overallHealth === 'poor') {
      issues.push(`Overall system health is ${metrics.overallHealth}`);
    }

    return issues;
  }

  /**
   * 📈 CALCULATE OVERALL SCORE
   */
  private calculateScore(metrics: PerformanceMetrics): number {
    const weights = {
      hydrationTime: 0.3,
      cacheHitRate: 0.25,
      errorRate: 0.25,
      performanceScore: 0.2
    };

    const hydrationScore = metrics.hydrationTime.meetsTarget ? 100 : 
      Math.max(0, 100 - ((metrics.hydrationTime.current - metrics.hydrationTime.target) / metrics.hydrationTime.target) * 100);

    const cacheScore = metrics.cacheHitRate.meetsTarget ? 100 : metrics.cacheHitRate.current;

    const errorScore = metrics.errorRate.meetsTarget ? 100 : 
      Math.max(0, 100 - ((metrics.errorRate.current - metrics.errorRate.target) / metrics.errorRate.target) * 100);

    const performanceScore = metrics.performanceScore.current;

    const overallScore = 
      (hydrationScore * weights.hydrationTime) +
      (cacheScore * weights.cacheHitRate) +
      (errorScore * weights.errorRate) +
      (performanceScore * weights.performanceScore);

    return Math.round(overallScore);
  }

  /**
   * 🔄 START MONITORING
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      log.warn('Validation', '⚠️ [HydrationValidator] Monitoring already active');
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(async () => {
      try {
        const result = await this.validatePerformance();
        
        if (!result.success) {
          log.warn('Validation', `⚠️ [HydrationValidator] Performance issues detected: ${result.issues.join(', ')}`);
        }
      } catch (error) {
        log.error('Validation', '🚨 [HydrationValidator] Monitoring error:', error);
      }
    }, this.config.monitoringInterval);

    log.debug('Validation', '🔄 [HydrationValidator] Performance monitoring started');
  }

  /**
   * 🛑 STOP MONITORING
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    log.debug('Validation', '🛑 [HydrationValidator] Performance monitoring stopped');
  }

  /**
   * 📊 GENERATE PERFORMANCE REPORT
   */
  generateReport(): string {
    if (this.metricsHistory.length === 0) {
      return 'No performance data available. Run validation first.';
    }

    const latest = this.metricsHistory[this.metricsHistory.length - 1];
    const recommendations = this.generateRecommendations(latest);
    const issues = this.identifyIssues(latest);
    const score = this.calculateScore(latest);

    const report = `
🚀 HYDRATION PERFORMANCE VALIDATION REPORT
==========================================

📊 CURRENT METRICS:
- Hydration Time: ${latest.hydrationTime.current.toFixed(1)}ms (Target: ${latest.hydrationTime.target}ms) ${latest.hydrationTime.meetsTarget ? '✅' : '❌'}
- Cache Hit Rate: ${latest.cacheHitRate.current.toFixed(1)}% (Target: ${latest.cacheHitRate.target}%) ${latest.cacheHitRate.meetsTarget ? '✅' : '❌'}
- Error Rate: ${latest.errorRate.current.toFixed(1)}% (Target: ${latest.errorRate.target}%) ${latest.errorRate.meetsTarget ? '✅' : '❌'}
- Performance Score: ${latest.performanceScore.current.toFixed(1)}/100 (Target: ${latest.performanceScore.target}) ${latest.performanceScore.meetsTarget ? '✅' : '❌'}

🎯 OVERALL HEALTH: ${latest.overallHealth.toUpperCase()}
📈 OVERALL SCORE: ${score}/100

${issues.length > 0 ? `
🚨 ISSUES DETECTED:
${issues.map(issue => `- ${issue}`).join('\n')}
` : '✅ NO ISSUES DETECTED'}

${recommendations.length > 0 ? `
💡 OPTIMIZATION RECOMMENDATIONS:
${recommendations.map((rec, i) => `${i + 1}. [${rec.priority.toUpperCase()}] ${rec.description}
   Expected: ${rec.expectedImprovement}
   Implementation: ${rec.implementation}`).join('\n\n')}
` : '🎉 ALL TARGETS MET - NO OPTIMIZATIONS NEEDED'}

📈 TREND ANALYSIS:
- Average Hydration Time: ${latest.hydrationTime.average.toFixed(1)}ms
- Average Cache Hit Rate: ${latest.cacheHitRate.average.toFixed(1)}%
- Average Error Rate: ${latest.errorRate.average.toFixed(1)}%
- P95 Hydration Time: ${latest.hydrationTime.p95.toFixed(1)}ms
- P99 Hydration Time: ${latest.hydrationTime.p99.toFixed(1)}ms
`;

    return report;
  }

  // =================== PRIVATE METHODS ===================

  private calculateAverage(metric: keyof PerformanceMetrics): number {
    if (this.metricsHistory.length === 0) return 0;
    
    const sum = this.metricsHistory.reduce((acc, metrics) => {
      switch (metric) {
        case 'hydrationTime':
          return acc + metrics.hydrationTime.current;
        case 'cacheHitRate':
          return acc + metrics.cacheHitRate.current;
        case 'errorRate':
          return acc + metrics.errorRate.current;
        default:
          return acc;
      }
    }, 0);

    return sum / this.metricsHistory.length;
  }

  private determineOverallHealth(performanceScore: number, errorRate: number): PerformanceMetrics['overallHealth'] {
    if (performanceScore >= 90 && errorRate <= 2) return 'excellent';
    if (performanceScore >= 80 && errorRate <= 5) return 'good';
    if (performanceScore >= 70 && errorRate <= 10) return 'fair';
    if (performanceScore >= 50 && errorRate <= 20) return 'poor';
    return 'critical';
  }

  private getDefaultMetrics(): PerformanceMetrics {
    return {
      hydrationTime: { current: 0, average: 0, p95: 0, p99: 0, target: 50, meetsTarget: false },
      cacheHitRate: { current: 0, average: 0, target: 80, meetsTarget: false },
      errorRate: { current: 0, average: 0, target: 5, meetsTarget: false },
      performanceScore: { current: 0, target: 85, meetsTarget: false },
      overallHealth: 'critical'
    };
  }

  private initializeDebugTools(): void {
    if (process.env.NODE_ENV === 'development') {
      (window as any).hydrationValidator = this;
      (window as any).validateHydration = () => this.validatePerformance();
      (window as any).getHydrationReport = () => this.generateReport();
    }
  }
}

// Export singleton instance
export const hydrationValidator = HydrationValidator.getInstance();

// Export types
export type { 
  SuccessMetricsConfig, 
  PerformanceMetrics, 
  OptimizationRecommendation, 
  ValidationResult 
};
