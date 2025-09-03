import { log } from '@/utils/logger';
/**
 * 🚀 Hydration Testing & Validation Utilities
 * 
 * Phase 6B: Comprehensive testing and performance measurement for smart state hydration.
 * Provides tools to validate refresh scenarios and measure performance improvements.
 */

import { smartStateHydrator } from '@/services/SmartStateHydrator';
import { stateSerializer } from '@/utils/stateSerialization';

// Test configuration
export interface HydrationTestConfig {
  componentId: string;
  userId: string;
  testData: any;
  iterations?: number;
  timeout?: number;
  validateChecksum?: boolean;
}

// Test results
export interface HydrationTestResult {
  success: boolean;
  hydrationTime: number;
  serializationTime: number;
  deserializationTime: number;
  cacheHitRate: number;
  error?: string;
  metrics: {
    totalTime: number;
    cacheSize: number;
    compressionRatio: number;
  };
}

// Performance metrics
export interface HydrationMetrics {
  totalTests: number;
  successfulTests: number;
  averageHydrationTime: number;
  averageSerializationTime: number;
  averageDeserializationTime: number;
  cacheHitRate: number;
  errorRate: number;
  performanceScore: number; // 0-100
}

class HydrationTester {
  private static instance: HydrationTester;
  private testResults: HydrationTestResult[] = [];
  private metrics: HydrationMetrics | null = null;

  private constructor() {
    this.initializeDebugTools();
  }

  static getInstance(): HydrationTester {
    if (!HydrationTester.instance) {
      HydrationTester.instance = new HydrationTester();
    }
    return HydrationTester.instance;
  }

  /**
   * 🧪 RUN COMPREHENSIVE HYDRATION TEST
   */
  async runHydrationTest(config: HydrationTestConfig): Promise<HydrationTestResult> {
    const startTime = Date.now();
    const iterations = config.iterations || 1;
    let totalHydrationTime = 0;
    let totalSerializationTime = 0;
    let totalDeserializationTime = 0;
    let successfulTests = 0;
    let cacheHits = 0;

    try {
      log.debug('Testing', `🧪 [HydrationTester] Starting test for ${config.componentId}`);

      for (let i = 0; i < iterations; i++) {
        const iterationStart = Date.now();

        // Test serialization
        const serializationStart = Date.now();
        const serialized = stateSerializer.serialize(
          config.testData,
          config.componentId,
          config.userId
        );
        const serializationTime = Date.now() - serializationStart;
        totalSerializationTime += serializationTime;

        // Test deserialization
        const deserializationStart = Date.now();
        const deserialized = stateSerializer.deserialize(serialized);
        const deserializationTime = Date.now() - deserializationStart;
        totalDeserializationTime += deserializationTime;

        // Test hydration
        const hydrationStart = Date.now();
        const result = await smartStateHydrator.hydrateComponent(
          config.componentId,
          config.userId,
          config.testData
        );
        const hydrationTime = Date.now() - hydrationStart;
        totalHydrationTime += hydrationTime;

        if (result.success) {
          successfulTests++;
          if (result.source !== 'none') {
            cacheHits++;
          }
        }

        // Validate checksum if requested
        if (config.validateChecksum) {
          const isValid = stateSerializer.validateVersion(serialized);
          if (!isValid) {
            throw new Error('Checksum validation failed');
          }
        }

        const iterationTime = Date.now() - iterationStart;
        log.debug('Testing', `✅ [HydrationTester] Iteration ${i + 1}/${iterations} completed in ${iterationTime}ms`);
      }

      const totalTime = Date.now() - startTime;
      const cacheHitRate = (cacheHits / iterations) * 100;
      const averageHydrationTime = totalHydrationTime / iterations;
      const averageSerializationTime = totalSerializationTime / iterations;
      const averageDeserializationTime = totalDeserializationTime / iterations;

      const testResult: HydrationTestResult = {
        success: successfulTests === iterations,
        hydrationTime: averageHydrationTime,
        serializationTime: averageSerializationTime,
        deserializationTime: averageDeserializationTime,
        cacheHitRate,
        metrics: {
          totalTime,
          cacheSize: JSON.stringify(config.testData).length,
          compressionRatio: 0 // Would calculate actual compression ratio
        }
      };

      this.testResults.push(testResult);
      log.debug('Testing', `🎯 [HydrationTester] Test completed: ${testResult.success ? 'SUCCESS' : 'FAILED'}`);

      return testResult;

    } catch (error) {
      const totalTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      const testResult: HydrationTestResult = {
        success: false,
        hydrationTime: 0,
        serializationTime: 0,
        deserializationTime: 0,
        cacheHitRate: 0,
        error: errorMessage,
        metrics: {
          totalTime,
          cacheSize: 0,
          compressionRatio: 0
        }
      };

      this.testResults.push(testResult);
      log.error('Testing', `🚨 [HydrationTester] Test failed: ${errorMessage}`);
      
      return testResult;
    }
  }

  /**
   * 📊 CALCULATE PERFORMANCE METRICS
   */
  calculateMetrics(): HydrationMetrics {
    if (this.testResults.length === 0) {
      return {
        totalTests: 0,
        successfulTests: 0,
        averageHydrationTime: 0,
        averageSerializationTime: 0,
        averageDeserializationTime: 0,
        cacheHitRate: 0,
        errorRate: 0,
        performanceScore: 0
      };
    }

    const totalTests = this.testResults.length;
    const successfulTests = this.testResults.filter(r => r.success).length;
    const failedTests = totalTests - successfulTests;

    const averageHydrationTime = this.testResults.reduce((sum, r) => sum + r.hydrationTime, 0) / totalTests;
    const averageSerializationTime = this.testResults.reduce((sum, r) => sum + r.serializationTime, 0) / totalTests;
    const averageDeserializationTime = this.testResults.reduce((sum, r) => sum + r.deserializationTime, 0) / totalTests;
    const averageCacheHitRate = this.testResults.reduce((sum, r) => sum + r.cacheHitRate, 0) / totalTests;
    const errorRate = (failedTests / totalTests) * 100;

    // Calculate performance score (0-100)
    // Factors: hydration time (<50ms = 100, >500ms = 0), cache hit rate, error rate
    const hydrationScore = Math.max(0, 100 - (averageHydrationTime / 5)); // 50ms = 100, 500ms = 0
    const cacheScore = averageCacheHitRate; // Direct percentage
    const errorScore = Math.max(0, 100 - errorRate); // 0% errors = 100, 100% errors = 0
    const performanceScore = (hydrationScore + cacheScore + errorScore) / 3;

    this.metrics = {
      totalTests,
      successfulTests,
      averageHydrationTime,
      averageSerializationTime,
      averageDeserializationTime,
      cacheHitRate: averageCacheHitRate,
      errorRate,
      performanceScore
    };

    return this.metrics;
  }

  /**
   * 🔄 SIMULATE REFRESH SCENARIOS
   */
  async simulateRefreshScenarios(componentIds: string[], userId: string): Promise<{
    scenario: string;
    results: HydrationTestResult[];
    averageTime: number;
  }[]> {
    const scenarios = [
      {
        name: 'Cold Start (No Cache)',
        setup: async () => {
          // Clear all caches
          for (const componentId of componentIds) {
            smartStateHydrator.clearComponentCache(componentId, userId);
          }
        }
      },
      {
        name: 'Warm Start (Memory Cache)',
        setup: async () => {
          // Pre-populate memory cache
          for (const componentId of componentIds) {
            await smartStateHydrator.saveComponentState(componentId, userId, { test: 'data' });
          }
        }
      },
      {
        name: 'Hot Start (All Caches)',
        setup: async () => {
          // Pre-populate all cache layers
          for (const componentId of componentIds) {
            await smartStateHydrator.saveComponentState(componentId, userId, { test: 'data' });
            // Simulate multiple cache layers being populated
          }
        }
      }
    ];

    const results = [];

    for (const scenario of scenarios) {
      log.debug('Testing', `🔄 [HydrationTester] Running scenario: ${scenario.name}`);
      
      // Setup scenario
      await scenario.setup();

      // Test each component
      const scenarioResults: HydrationTestResult[] = [];
      for (const componentId of componentIds) {
        const result = await this.runHydrationTest({
          componentId,
          userId,
          testData: { test: 'data', timestamp: Date.now() },
          iterations: 3
        });
        scenarioResults.push(result);
      }

      const averageTime = scenarioResults.reduce((sum, r) => sum + r.hydrationTime, 0) / scenarioResults.length;

      results.push({
        scenario: scenario.name,
        results: scenarioResults,
        averageTime
      });

      log.debug('Testing', `✅ [HydrationTester] Scenario ${scenario.name} completed: ${averageTime.toFixed(2)}ms average`);
    }

    return results;
  }

  /**
   * 🎯 BENCHMARK AGAINST BASELINE
   */
  async benchmarkAgainstBaseline(baselineTime: number, componentId: string, userId: string): Promise<{
    improvement: number;
    percentage: number;
    meetsTarget: boolean;
  }> {
    const testResult = await this.runHydrationTest({
      componentId,
      userId,
      testData: { test: 'benchmark' },
      iterations: 5
    });

    const improvement = baselineTime - testResult.hydrationTime;
    const percentage = (improvement / baselineTime) * 100;
    const meetsTarget = testResult.hydrationTime < 50; // Target: <50ms

    log.debug('Testing', `📊 [HydrationTester] Benchmark results: ${improvement.toFixed(2)}ms improvement (${percentage.toFixed(1)}%)`);

    return {
      improvement,
      percentage,
      meetsTarget
    };
  }

  /**
   * 📈 GENERATE PERFORMANCE REPORT
   */
  generateReport(): string {
    const metrics = this.calculateMetrics();
    
    if (metrics.totalTests === 0) {
      return 'No test data available. Run tests first.';
    }

    const report = `
🚀 HYDRATION PERFORMANCE REPORT
================================

📊 OVERALL METRICS:
- Total Tests: ${metrics.totalTests}
- Successful Tests: ${metrics.successfulTests}
- Error Rate: ${metrics.errorRate.toFixed(1)}%
- Performance Score: ${metrics.performanceScore.toFixed(1)}/100

⏱️ TIMING METRICS:
- Average Hydration Time: ${metrics.averageHydrationTime.toFixed(2)}ms
- Average Serialization Time: ${metrics.averageSerializationTime.toFixed(2)}ms
- Average Deserialization Time: ${metrics.averageDeserializationTime.toFixed(2)}ms

💾 CACHE METRICS:
- Cache Hit Rate: ${metrics.cacheHitRate.toFixed(1)}%

🎯 TARGETS:
- Hydration Time Target: <50ms ${metrics.averageHydrationTime < 50 ? '✅' : '❌'}
- Cache Hit Rate Target: >80% ${metrics.cacheHitRate > 80 ? '✅' : '❌'}
- Error Rate Target: <5% ${metrics.errorRate < 5 ? '✅' : '❌'}

📋 RECOMMENDATIONS:
${this.generateRecommendations(metrics)}
`;

    return report;
  }

  /**
   * 🧹 CLEAR TEST DATA
   */
  clearTestData(): void {
    this.testResults = [];
    this.metrics = null;
    log.debug('Testing', '🧹 [HydrationTester] Test data cleared');
  }

  // =================== PRIVATE METHODS ===================

  private generateRecommendations(metrics: HydrationMetrics): string {
    const recommendations = [];

    if (metrics.averageHydrationTime > 50) {
      recommendations.push('- Optimize cache lookup performance');
    }

    if (metrics.cacheHitRate < 80) {
      recommendations.push('- Improve cache persistence strategy');
    }

    if (metrics.errorRate > 5) {
      recommendations.push('- Add better error handling and fallbacks');
    }

    if (metrics.averageSerializationTime > 10) {
      recommendations.push('- Optimize state serialization');
    }

    if (recommendations.length === 0) {
      recommendations.push('- Performance targets met! 🎉');
    }

    return recommendations.join('\n');
  }

  private initializeDebugTools(): void {
    if (process.env.NODE_ENV === 'development') {
      (window as any).hydrationTester = this;
      (window as any).runHydrationTests = () => this.runHydrationTest({
        componentId: 'test-component',
        userId: 'test-user',
        testData: { test: 'data' },
        iterations: 5
      });
    }
  }
}

// Export singleton instance
export const hydrationTester = HydrationTester.getInstance();

// Export types
export type { HydrationTestConfig, HydrationTestResult, HydrationMetrics };
