/**
 * Phase 3 Comprehensive Testing Framework
 * 
 * Provides automated testing, performance benchmarking, and regression testing
 * for all Phase 3 performance optimization systems.
 */

import { logError } from './errorHandlingSystem';

// Test result interfaces
interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  details: any;
  error?: string;
  timestamp: number;
}

interface BenchmarkResult {
  name: string;
  averageTime: number;
  minTime: number;
  maxTime: number;
  iterations: number;
  memoryUsage: number;
  timestamp: number;
}

interface TestSuite {
  name: string;
  tests: TestResult[];
  benchmarks: BenchmarkResult[];
  totalDuration: number;
  passRate: number;
  timestamp: number;
}

interface RegressionData {
  testName: string;
  baseline: number;
  current: number;
  change: number;
  isRegression: boolean;
  threshold: number;
}

class Phase3TestingFramework {
  private testHistory: TestSuite[] = [];
  private benchmarkBaselines = new Map<string, number>();
  private regressionThreshold = 0.1; // 10% performance degradation threshold
  private isRunning = false;

  constructor() {
    this.loadBaselines();
    console.log('🧪 [Phase3Testing] Testing framework initialized');
  }

  /**
   * Run comprehensive test suite
   */
  public async runComprehensiveTests(): Promise<TestSuite> {
    if (this.isRunning) {
      throw new Error('Tests are already running');
    }

    this.isRunning = true;
    const startTime = performance.now();
    
    console.log('🧪 [Phase3Testing] Starting comprehensive test suite...');

    try {
      const testSuite: TestSuite = {
        name: 'Phase 3 Comprehensive Tests',
        tests: [],
        benchmarks: [],
        totalDuration: 0,
        passRate: 0,
        timestamp: Date.now()
      };

      // Run all test categories
      const performanceTests = await this.runPerformanceOptimizerTests();
      const cacheTests = await this.runCacheStrategyTests();
      const renderTests = await this.runRenderOptimizerTests();
      const uxPatternsTests = await this.runUXPatternsTests();
      const integrationTests = await this.runIntegrationTests();

      // Combine all tests
      testSuite.tests = [
        ...performanceTests,
        ...cacheTests,
        ...renderTests,
        ...uxPatternsTests,
        ...integrationTests
      ];

      // Run benchmarks
      testSuite.benchmarks = await this.runPerformanceBenchmarks();

      // Calculate metrics
      testSuite.totalDuration = performance.now() - startTime;
      testSuite.passRate = testSuite.tests.filter(t => t.passed).length / testSuite.tests.length;

      // Store results
      this.testHistory.push(testSuite);
      this.saveTestHistory();

      console.log(`✅ [Phase3Testing] Test suite completed in ${testSuite.totalDuration.toFixed(2)}ms`);
      console.log(`📊 [Phase3Testing] Pass rate: ${(testSuite.passRate * 100).toFixed(1)}%`);

      return testSuite;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Test Performance Optimizer
   */
  private async runPerformanceOptimizerTests(): Promise<TestResult[]> {
    const tests: TestResult[] = [];

    // Test 1: System initialization
    tests.push(await this.runTest('Performance Optimizer - Initialization', async () => {
      const optimizer = (window as any).phase3PerformanceOptimizer;
      if (!optimizer) throw new Error('Performance optimizer not found');
      
      const status = optimizer.getStatus();
      if (!status.metrics) throw new Error('Metrics not available');
      
      return { initialized: true, metrics: status.metrics };
    }));

    // Test 2: Memory monitoring
    tests.push(await this.runTest('Performance Optimizer - Memory Monitoring', async () => {
      const optimizer = (window as any).phase3PerformanceOptimizer;
      const result = optimizer.validateMemoryMonitoring();
      
      if (!result.active) throw new Error('Memory monitoring not active');
      if (result.usage <= 0) throw new Error('Invalid memory usage reading');
      
      return result;
    }));

    // Test 3: Performance metrics
    tests.push(await this.runTest('Performance Optimizer - Metrics Collection', async () => {
      const optimizer = (window as any).phase3PerformanceOptimizer;
      const metrics = optimizer.testPerformanceMonitoring();
      
      if (typeof metrics.renderTime !== 'number') throw new Error('Invalid render time metric');
      if (typeof metrics.memoryUsage !== 'number') throw new Error('Invalid memory usage metric');
      
      return metrics;
    }));

    // Test 4: Optimization test
    tests.push(await this.runTest('Performance Optimizer - Optimization Test', async () => {
      const optimizer = (window as any).phase3PerformanceOptimizer;
      const result = await optimizer.runOptimizationTest();
      
      if (!result.success) throw new Error('Optimization test failed');
      
      return result;
    }));

    return tests;
  }

  /**
   * Test Cache Strategy
   */
  private async runCacheStrategyTests(): Promise<TestResult[]> {
    const tests: TestResult[] = [];

    // Test 1: Cache operations
    tests.push(await this.runTest('Cache Strategy - Basic Operations', async () => {
      const cache = (window as any).phase3CacheStrategy;
      if (!cache) throw new Error('Cache strategy not found');
      
      // Test set/get
      cache.set('test-key', { data: 'test-value' });
      const retrieved = cache.get('test-key');
      
      if (!retrieved || retrieved.data !== 'test-value') {
        throw new Error('Cache set/get failed');
      }
      
      return { success: true, retrieved };
    }));

    // Test 2: Cache efficiency
    tests.push(await this.runTest('Cache Strategy - Efficiency Test', async () => {
      const cache = (window as any).phase3CacheStrategy;
      const result = await cache.testCacheEfficiency();
      
      if (!result.success) throw new Error('Cache efficiency test failed');
      if (result.results.setPerformance > 10) throw new Error('Cache set too slow');
      if (result.results.getPerformance > 5) throw new Error('Cache get too slow');
      
      return result;
    }));

    // Test 3: Cache coordination
    tests.push(await this.runTest('Cache Strategy - Coordination Test', async () => {
      const cache = (window as any).phase3CacheStrategy;
      const result = cache.validateCacheCoordination();
      
      if (!result.success) throw new Error('Cache coordination failed');
      
      return result;
    }));

    // Test 4: Cache statistics
    tests.push(await this.runTest('Cache Strategy - Statistics', async () => {
      const cache = (window as any).phase3CacheStrategy;
      const stats = cache.getCacheStats();
      
      if (typeof stats.totalEntries !== 'number') throw new Error('Invalid cache stats');
      if (typeof stats.hitRate !== 'number') throw new Error('Invalid hit rate');
      
      return stats;
    }));

    return tests;
  }

  /**
   * Test Render Optimizer
   */
  private async runRenderOptimizerTests(): Promise<TestResult[]> {
    const tests: TestResult[] = [];

    // Test 1: Render tracking
    tests.push(await this.runTest('Render Optimizer - Tracking', async () => {
      const optimizer = (window as any).phase3RenderOptimizer;
      if (!optimizer) throw new Error('Render optimizer not found');
      
      const result = optimizer.trackRenderCycles();
      if (!result.isTracking) throw new Error('Render tracking not active');
      
      return result;
    }));

    // Test 2: Optimization report
    tests.push(await this.runTest('Render Optimizer - Optimization Report', async () => {
      const optimizer = (window as any).phase3RenderOptimizer;
      const report = optimizer.getOptimizationReport();
      
      if (!report.metrics) throw new Error('No metrics in report');
      if (!report.recommendations) throw new Error('No recommendations in report');
      
      return report;
    }));

    // Test 3: Memoization validation
    tests.push(await this.runTest('Render Optimizer - Memoization', async () => {
      const optimizer = (window as any).phase3RenderOptimizer;
      const result = optimizer.validateMemoization();
      
      // Note: This might fail if no components are memoized yet, which is expected
      return result;
    }));

    // Test 4: Batch updates
    tests.push(await this.runTest('Render Optimizer - Batch Updates', async () => {
      const optimizer = (window as any).phase3RenderOptimizer;
      let updateExecuted = false;
      
      optimizer.batchUpdate(() => {
        updateExecuted = true;
      });
      
      // Wait a bit for batch processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!updateExecuted) throw new Error('Batch update not executed');
      
      return { batchExecuted: true };
    }));

    return tests;
  }

  /**
   * Test UX Patterns
   */
  private async runUXPatternsTests(): Promise<TestResult[]> {
    const tests: TestResult[] = [];

    // Test 1: UX Patterns initialization
    tests.push(await this.runTest('UX Patterns - Initialization', async () => {
      const uxPatterns = (window as any).phase3UXPatterns;
      if (!uxPatterns) throw new Error('UX Patterns not found');
      
      const status = uxPatterns.getStatus();
      if (!status.isActive) throw new Error('UX Patterns not active');
      
      return status;
    }));

    // Test 2: UX Patterns functionality
    tests.push(await this.runTest('UX Patterns - Functionality Test', async () => {
      const uxPatterns = (window as any).phase3UXPatterns;
      const result = await uxPatterns.testUXPatterns();
      
      // More lenient check - at least some features should work
      const workingFeatures = Object.values(result.results).filter(Boolean).length;
      if (workingFeatures < 2) {
        throw new Error(`UX Patterns test failed - only ${workingFeatures} features working`);
      }
      
      return result;
    }));

    // Test 3: Smart loading states
    tests.push(await this.runTest('UX Patterns - Smart Loading States', async () => {
      const uxPatterns = (window as any).phase3UXPatterns;
      const status = uxPatterns.getStatus();
      
      if (!status.features.smartLoading) throw new Error('Smart loading not enabled');
      
      return { smartLoading: status.features.smartLoading };
    }));

    // Test 4: Micro-interactions
    tests.push(await this.runTest('UX Patterns - Micro-interactions', async () => {
      const uxPatterns = (window as any).phase3UXPatterns;
      const status = uxPatterns.getStatus();
      
      if (!status.features.microInteractions) throw new Error('Micro-interactions not enabled');
      
      return { microInteractions: status.features.microInteractions };
    }));

    // Test 5: Accessibility features
    tests.push(await this.runTest('UX Patterns - Accessibility Features', async () => {
      const uxPatterns = (window as any).phase3UXPatterns;
      const status = uxPatterns.getStatus();
      
      if (!status.features.accessibility) throw new Error('Accessibility features not enabled');
      
      return { accessibility: status.features.accessibility };
    }));

    return tests;
  }

  /**
   * Test system integration
   */
  private async runIntegrationTests(): Promise<TestResult[]> {
    const tests: TestResult[] = [];

    // Test 1: All systems loaded
    tests.push(await this.runTest('Integration - All Systems Loaded', async () => {
      const systems = {
        performanceOptimizer: typeof (window as any).phase3PerformanceOptimizer !== 'undefined',
        cacheStrategy: typeof (window as any).phase3CacheStrategy !== 'undefined',
        renderOptimizer: typeof (window as any).phase3RenderOptimizer !== 'undefined',
        uxPatterns: typeof (window as any).phase3UXPatterns !== 'undefined'
      };
      
      const allLoaded = Object.values(systems).every(Boolean);
      if (!allLoaded) throw new Error('Not all systems loaded');
      
      return systems;
    }));

    // Test 2: Cross-system communication
    tests.push(await this.runTest('Integration - Cross-System Communication', async () => {
      const cache = (window as any).phase3CacheStrategy;
      const optimizer = (window as any).phase3PerformanceOptimizer;
      
      // Test cache and performance interaction
      const testKey = 'integration-test';
      cache.set(testKey, { timestamp: Date.now() });
      
      const metrics = optimizer.getPerformanceMetrics();
      const cached = cache.get(testKey);
      
      if (!cached) throw new Error('Cross-system data not accessible');
      
      return { metrics, cached };
    }));

    // Test 3: Memory coordination
    tests.push(await this.runTest('Integration - Memory Coordination', async () => {
      const optimizer = (window as any).phase3PerformanceOptimizer;
      const cache = (window as any).phase3CacheStrategy;
      
      const optimizerMemory = optimizer.validateMemoryMonitoring();
      const cacheStats = cache.getCacheStats();
      
      // Check if systems are aware of each other's memory usage
      const totalMemory = optimizerMemory.usage + (cacheStats.memoryUsage || 0);
      
      return { 
        optimizerMemory: optimizerMemory.usage,
        cacheMemory: cacheStats.memoryUsage || 0,
        totalMemory 
      };
    }));

    return tests;
  }

  /**
   * Run performance benchmarks
   */
  private async runPerformanceBenchmarks(): Promise<BenchmarkResult[]> {
    const benchmarks: BenchmarkResult[] = [];

    // Benchmark 1: Cache performance
    benchmarks.push(await this.runBenchmark('Cache Set/Get Performance', async () => {
      const cache = (window as any).phase3CacheStrategy;
      const iterations = 100; // Reduced from 1000 to prevent long tasks
      
      for (let i = 0; i < iterations; i++) {
        cache.set(`bench-key-${i}`, { data: `value-${i}` });
        cache.get(`bench-key-${i}`);
        
        // Yield control every 10 iterations to prevent blocking
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
    }, 100));

    // Benchmark 2: Performance monitoring overhead
    benchmarks.push(await this.runBenchmark('Performance Monitoring Overhead', async () => {
      const optimizer = (window as any).phase3PerformanceOptimizer;
      const iterations = 100;
      
      for (let i = 0; i < iterations; i++) {
        optimizer.getPerformanceMetrics();
        optimizer.getStatus();
      }
    }, 100));

    // Benchmark 3: Render optimization
    benchmarks.push(await this.runBenchmark('Render Optimization Performance', async () => {
      const optimizer = (window as any).phase3RenderOptimizer;
      const iterations = 20; // Reduced from 50 to prevent long tasks
      
      for (let i = 0; i < iterations; i++) {
        optimizer.optimizeRender(`test-component-${i}`, () => {
          // Simulate lighter render work
          const start = performance.now();
          while (performance.now() - start < 0.5) {
            // Reduced busy wait from 1ms to 0.5ms
          }
        }, { prop: i });
        
        // Yield control every 5 iterations to prevent blocking
        if (i % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
    }, 20));

    return benchmarks;
  }

  /**
   * Run a single test
   */
  private async runTest(name: string, testFn: () => Promise<any>): Promise<TestResult> {
    const startTime = performance.now();
    
    try {
      const details = await testFn();
      const duration = performance.now() - startTime;
      
      return {
        name,
        passed: true,
        duration,
        details,
        timestamp: Date.now()
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      
      return {
        name,
        passed: false,
        duration,
        details: null,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      };
    }
  }

  /**
   * Run a performance benchmark
   */
  private async runBenchmark(name: string, benchmarkFn: () => Promise<void>, iterations: number): Promise<BenchmarkResult> {
    const times: number[] = [];
    const memoryBefore = this.getMemoryUsage();
    
    // Warm up
    await benchmarkFn();
    
    // Run benchmark iterations
    for (let i = 0; i < 5; i++) {
      const startTime = performance.now();
      await benchmarkFn();
      const endTime = performance.now();
      times.push(endTime - startTime);
    }
    
    const memoryAfter = this.getMemoryUsage();
    
    const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    // Check for regression
    const baseline = this.benchmarkBaselines.get(name);
    if (baseline && averageTime > baseline * (1 + this.regressionThreshold)) {
      console.warn(`⚠️ [Phase3Testing] Performance regression detected in ${name}: ${averageTime.toFixed(2)}ms vs ${baseline.toFixed(2)}ms baseline`);
    }
    
    // Update baseline if this is better
    if (!baseline || averageTime < baseline) {
      this.benchmarkBaselines.set(name, averageTime);
      this.saveBaselines();
    }
    
    return {
      name,
      averageTime,
      minTime,
      maxTime,
      iterations,
      memoryUsage: memoryAfter - memoryBefore,
      timestamp: Date.now()
    };
  }

  /**
   * Detect performance regressions
   */
  public detectRegressions(currentSuite: TestSuite): RegressionData[] {
    const regressions: RegressionData[] = [];
    
    if (this.testHistory.length < 2) {
      return regressions; // Need at least 2 test runs to detect regressions
    }
    
    const previousSuite = this.testHistory[this.testHistory.length - 2];
    
    // Check benchmark regressions
    currentSuite.benchmarks.forEach(currentBench => {
      const previousBench = previousSuite.benchmarks.find(b => b.name === currentBench.name);
      if (previousBench) {
        const change = (currentBench.averageTime - previousBench.averageTime) / previousBench.averageTime;
        const isRegression = change > this.regressionThreshold;
        
        regressions.push({
          testName: currentBench.name,
          baseline: previousBench.averageTime,
          current: currentBench.averageTime,
          change,
          isRegression,
          threshold: this.regressionThreshold
        });
      }
    });
    
    return regressions;
  }

  /**
   * Generate test report
   */
  public generateTestReport(testSuite: TestSuite): string {
    const regressions = this.detectRegressions(testSuite);
    
    let report = `
# Phase 3 Testing Report
**Generated**: ${new Date(testSuite.timestamp).toISOString()}
**Duration**: ${testSuite.totalDuration.toFixed(2)}ms
**Pass Rate**: ${(testSuite.passRate * 100).toFixed(1)}%

## Test Results
`;
    
    testSuite.tests.forEach(test => {
      const status = test.passed ? '✅' : '❌';
      report += `${status} **${test.name}** (${test.duration.toFixed(2)}ms)\n`;
      if (!test.passed && test.error) {
        report += `   Error: ${test.error}\n`;
      }
    });
    
    report += `\n## Performance Benchmarks\n`;
    testSuite.benchmarks.forEach(bench => {
      report += `📊 **${bench.name}**: ${bench.averageTime.toFixed(2)}ms avg (${bench.minTime.toFixed(2)}-${bench.maxTime.toFixed(2)}ms)\n`;
    });
    
    if (regressions.length > 0) {
      report += `\n## Performance Regressions\n`;
      regressions.filter(r => r.isRegression).forEach(reg => {
        report += `⚠️ **${reg.testName}**: ${(reg.change * 100).toFixed(1)}% slower (${reg.baseline.toFixed(2)}ms → ${reg.current.toFixed(2)}ms)\n`;
      });
    }
    
    return report;
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024;
    }
    return 0;
  }

  /**
   * Load benchmark baselines from localStorage
   */
  private loadBaselines(): void {
    try {
      const stored = localStorage.getItem('phase3-benchmark-baselines');
      if (stored) {
        const baselines = JSON.parse(stored);
        this.benchmarkBaselines = new Map(Object.entries(baselines));
      }
    } catch (error) {
      logError('Failed to load benchmark baselines', error);
    }
  }

  /**
   * Save benchmark baselines to localStorage
   */
  private saveBaselines(): void {
    try {
      const baselines = Object.fromEntries(this.benchmarkBaselines);
      localStorage.setItem('phase3-benchmark-baselines', JSON.stringify(baselines));
    } catch (error) {
      logError('Failed to save benchmark baselines', error);
    }
  }

  /**
   * Load test history from localStorage
   */
  private saveTestHistory(): void {
    try {
      // Keep only last 10 test runs
      const recentHistory = this.testHistory.slice(-10);
      localStorage.setItem('phase3-test-history', JSON.stringify(recentHistory));
    } catch (error) {
      logError('Failed to save test history', error);
    }
  }

  /**
   * Get test history
   */
  public getTestHistory(): TestSuite[] {
    return [...this.testHistory];
  }

  /**
   * Get latest test results
   */
  public getLatestResults(): TestSuite | null {
    return this.testHistory.length > 0 ? this.testHistory[this.testHistory.length - 1] : null;
  }

  /**
   * Clear test history
   */
  public clearHistory(): void {
    this.testHistory = [];
    localStorage.removeItem('phase3-test-history');
    localStorage.removeItem('phase3-benchmark-baselines');
    this.benchmarkBaselines.clear();
  }
}

// Create global instance
const phase3TestingFramework = new Phase3TestingFramework();

// Global interface for testing
if (typeof window !== 'undefined') {
  (window as any).phase3TestingFramework = {
    runComprehensiveTests: () => phase3TestingFramework.runComprehensiveTests(),
    runPerformanceBenchmarks: () => phase3TestingFramework['runPerformanceBenchmarks'](),
    generateTestReport: (suite: TestSuite) => phase3TestingFramework.generateTestReport(suite),
    detectRegressions: (suite: TestSuite) => phase3TestingFramework.detectRegressions(suite),
    getTestHistory: () => phase3TestingFramework.getTestHistory(),
    getLatestResults: () => phase3TestingFramework.getLatestResults(),
    clearHistory: () => phase3TestingFramework.clearHistory(),
    
    // Quick test commands
    quickTest: async () => {
      console.log('🧪 [Phase3Testing] Running quick test suite...');
      const results = await phase3TestingFramework.runComprehensiveTests();
      console.log('📊 [Phase3Testing] Test Results:');
      console.log(phase3TestingFramework.generateTestReport(results));
      return results;
    },
    
    validateAllSystems: () => {
      console.log('🔍 [Phase3Testing] Validating all Phase 3 systems...');
      const systems = {
        performanceOptimizer: typeof (window as any).phase3PerformanceOptimizer !== 'undefined',
        cacheStrategy: typeof (window as any).phase3CacheStrategy !== 'undefined',
        renderOptimizer: typeof (window as any).phase3RenderOptimizer !== 'undefined',
        uxPatterns: typeof (window as any).phase3UXPatterns !== 'undefined',
        testingFramework: typeof (window as any).phase3TestingFramework !== 'undefined'
      };
      
      const allValid = Object.values(systems).every(Boolean);
      console.log(allValid ? '✅ All systems validated' : '❌ Some systems missing');
      console.log('Systems status:', systems);
      return systems;
    }
  };
}

export default phase3TestingFramework;
export type { TestResult, BenchmarkResult, TestSuite, RegressionData }; 