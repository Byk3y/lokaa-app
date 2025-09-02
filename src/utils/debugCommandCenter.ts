/**
 * 🔍 Debug Command Center - Browser Integration
 * 
 * This module provides browser-side debugging utilities that integrate
 * with the existing performance monitoring infrastructure.
 */

import { log } from './logger';
import { performanceMonitor } from './performanceMonitor';

interface DebugMetrics {
  componentRenders: ComponentRenderMetric[];
  bundleInfo: BundleInfo;
  performanceBaseline: PerformanceBaseline;
  memoryUsage: MemoryUsage;
}

interface ComponentRenderMetric {
  name: string;
  renderCount: number;
  averageRenderTime: number;
  lastRenderTime: number;
  rerenderCauses: string[];
}

interface BundleInfo {
  totalSize: number;
  chunkCount: number;
  largestChunk: string;
  duplicateModules: string[];
}

interface PerformanceBaseline {
  timestamp: string;
  initialLoadTime: number;
  timeToInteractive: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
}

interface MemoryUsage {
  used: number;
  total: number;
  limit: number;
  percentage: number;
}

/**
 * Enhanced Debug Command Center for Browser
 */
class DebugCommandCenter {
  private static instance: DebugCommandCenter;
  private metrics: DebugMetrics;
  private isMonitoring: boolean = false;
  private observers: Map<string, any> = new Map();

  private constructor() {
    this.metrics = {
      componentRenders: [],
      bundleInfo: { totalSize: 0, chunkCount: 0, largestChunk: '', duplicateModules: [] },
      performanceBaseline: { timestamp: '', initialLoadTime: 0, timeToInteractive: 0, firstContentfulPaint: 0, largestContentfulPaint: 0 },
      memoryUsage: { used: 0, total: 0, limit: 0, percentage: 0 }
    };
  }

  public static getInstance(): DebugCommandCenter {
    if (!DebugCommandCenter.instance) {
      DebugCommandCenter.instance = new DebugCommandCenter();
    }
    return DebugCommandCenter.instance;
  }

  /**
   * Initialize debug monitoring
   */
  public initialize(): void {
    if (this.isMonitoring) return;

    log.debug('Debug', '🔍 [DebugCommandCenter] Initializing debug monitoring...');
    
    this.setupPerformanceObservers();
    this.setupComponentTracking();
    this.setupMemoryMonitoring();
    this.establishPerformanceBaseline();
    
    this.isMonitoring = true;
    
    // Expose to window for console access
    if (typeof window !== 'undefined') {
      (window as any).debugUtilities = {
        showDashboard: () => this.showDashboard(),
        getMetrics: () => this.getMetrics(),
        analyzeComponents: () => this.analyzeComponentPerformance(),
        checkMemory: () => this.checkMemoryUsage(),
        generateReport: () => this.generateDebugReport(),
        startProfiling: () => this.startProfiling(),
        stopProfiling: () => this.stopProfiling()
      };
    }

    log.debug('Debug', '✅ [DebugCommandCenter] Debug monitoring initialized');
  }

  /**
   * Setup performance observers
   */
  private setupPerformanceObservers(): void {
    if (typeof window === 'undefined' || !window.PerformanceObserver) return;

    // Long Task Observer
    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.duration > 50) { // Tasks longer than 50ms
            log.warn('Debug', `🐌 [LongTask] ${entry.name}: ${entry.duration.toFixed(2)}ms`);
          }
        });
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });
      this.observers.set('longtask', longTaskObserver);
    } catch (error) {
      log.debug('Debug', '⚠️ [DebugCommandCenter] Long task observer not supported');
    }

    // Layout Shift Observer
    try {
      const layoutShiftObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: any) => {
          if (entry.value > 0.1) { // CLS threshold
            log.warn('Debug', `📐 [LayoutShift] Value: ${entry.value.toFixed(3)}`);
          }
        });
      });
      layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.set('layout-shift', layoutShiftObserver);
    } catch (error) {
      log.debug('Debug', '⚠️ [DebugCommandCenter] Layout shift observer not supported');
    }

    // Largest Contentful Paint Observer
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          this.metrics.performanceBaseline.largestContentfulPaint = lastEntry.startTime;
          log.debug('Debug', `🎨 [LCP] ${lastEntry.startTime.toFixed(2)}ms`);
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.set('lcp', lcpObserver);
    } catch (error) {
      log.debug('Debug', '⚠️ [DebugCommandCenter] LCP observer not supported');
    }
  }

  /**
   * Setup component render tracking
   */
  private setupComponentTracking(): void {
    // Integrate with existing performance monitor
    if (performanceMonitor && typeof performanceMonitor.onComponentRender === 'function') {
      performanceMonitor.onComponentRender = (componentName: string, renderTime: number) => {
        this.trackComponentRender(componentName, renderTime);
      };
    }

    // Track React DevTools profiler data if available
    if (typeof window !== 'undefined' && (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      const devTools = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
      
      devTools.onCommitFiberRoot = (id: any, root: any, priorityLevel: any) => {
        // Track React commits for render analysis
        this.trackReactCommit(root);
      };
    }
  }

  /**
   * Setup memory monitoring
   */
  private setupMemoryMonitoring(): void {
    if (typeof window === 'undefined' || !(performance as any).memory) return;

    const updateMemoryMetrics = () => {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024), // MB
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024), // MB
        percentage: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100)
      };

      // Warn if memory usage is high
      if (this.metrics.memoryUsage.percentage > 80) {
        log.warn('Debug', `🧠 [Memory] High usage: ${this.metrics.memoryUsage.percentage}% (${this.metrics.memoryUsage.used}MB)`);
      }
    };

    // Update memory metrics every 30 seconds
    setInterval(updateMemoryMetrics, 30000);
    updateMemoryMetrics(); // Initial update
  }

  /**
   * Establish performance baseline
   */
  private establishPerformanceBaseline(): void {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (navigation) {
      this.metrics.performanceBaseline = {
        timestamp: new Date().toISOString(),
        initialLoadTime: navigation.loadEventEnd - navigation.navigationStart,
        timeToInteractive: navigation.domInteractive - navigation.navigationStart,
        firstContentfulPaint: 0, // Will be updated by observer
        largestContentfulPaint: 0 // Will be updated by observer
      };
    }

    // Get First Contentful Paint
    const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
    if (fcpEntry) {
      this.metrics.performanceBaseline.firstContentfulPaint = fcpEntry.startTime;
    }
  }

  /**
   * Track component render
   */
  private trackComponentRender(componentName: string, renderTime: number): void {
    let metric = this.metrics.componentRenders.find(m => m.name === componentName);
    
    if (!metric) {
      metric = {
        name: componentName,
        renderCount: 0,
        averageRenderTime: 0,
        lastRenderTime: 0,
        rerenderCauses: []
      };
      this.metrics.componentRenders.push(metric);
    }

    metric.renderCount++;
    metric.lastRenderTime = renderTime;
    metric.averageRenderTime = ((metric.averageRenderTime * (metric.renderCount - 1)) + renderTime) / metric.renderCount;

    // Log slow renders
    if (renderTime > 16) { // 60fps threshold
      log.warn('Debug', `🐌 [SlowRender] ${componentName}: ${renderTime.toFixed(2)}ms`);
    }
  }

  /**
   * Track React commit
   */
  private trackReactCommit(root: any): void {
    // Analyze React fiber tree for render insights
    try {
      const commitTime = performance.now();
      log.debug('Debug', `⚛️ [ReactCommit] ${commitTime.toFixed(2)}ms`);
    } catch (error) {
      // Ignore errors in React DevTools integration
    }
  }

  /**
   * Show debug dashboard
   */
  public showDashboard(): void {
    console.clear();
    console.log(`
🔍 Lokaa Debug Dashboard
========================

📊 Performance Metrics:
├── Initial Load: ${this.metrics.performanceBaseline.initialLoadTime.toFixed(2)}ms
├── Time to Interactive: ${this.metrics.performanceBaseline.timeToInteractive.toFixed(2)}ms
├── First Contentful Paint: ${this.metrics.performanceBaseline.firstContentfulPaint.toFixed(2)}ms
└── Largest Contentful Paint: ${this.metrics.performanceBaseline.largestContentfulPaint.toFixed(2)}ms

🧠 Memory Usage:
├── Used: ${this.metrics.memoryUsage.used}MB
├── Total: ${this.metrics.memoryUsage.total}MB
├── Limit: ${this.metrics.memoryUsage.limit}MB
└── Usage: ${this.metrics.memoryUsage.percentage}%

⚛️ Component Renders:
${this.metrics.componentRenders.slice(0, 5).map(comp => 
  `├── ${comp.name}: ${comp.renderCount} renders (avg: ${comp.averageRenderTime.toFixed(2)}ms)`
).join('\n')}

🛠️ Available Commands:
├── debugUtilities.getMetrics() - Get all metrics
├── debugUtilities.analyzeComponents() - Component analysis
├── debugUtilities.checkMemory() - Memory analysis
├── debugUtilities.generateReport() - Full debug report
├── debugUtilities.startProfiling() - Start profiling
└── debugUtilities.stopProfiling() - Stop profiling
    `);
  }

  /**
   * Get current metrics
   */
  public getMetrics(): DebugMetrics {
    return { ...this.metrics };
  }

  /**
   * Analyze component performance
   */
  public analyzeComponentPerformance(): any {
    const analysis = {
      totalComponents: this.metrics.componentRenders.length,
      slowComponents: this.metrics.componentRenders.filter(c => c.averageRenderTime > 16),
      excessiveRerenders: this.metrics.componentRenders.filter(c => c.renderCount > 50),
      recommendations: []
    };

    // Generate recommendations
    if (analysis.slowComponents.length > 0) {
      analysis.recommendations.push('Consider memoization for slow components');
    }
    if (analysis.excessiveRerenders.length > 0) {
      analysis.recommendations.push('Optimize props to reduce re-renders');
    }

    console.table(analysis.slowComponents);
    return analysis;
  }

  /**
   * Check memory usage
   */
  public checkMemoryUsage(): any {
    const memoryAnalysis = {
      current: this.metrics.memoryUsage,
      status: this.metrics.memoryUsage.percentage > 80 ? 'critical' : 
              this.metrics.memoryUsage.percentage > 60 ? 'warning' : 'good',
      recommendations: []
    };

    if (memoryAnalysis.status === 'critical') {
      memoryAnalysis.recommendations.push('Consider clearing caches or reducing memory usage');
    }

    console.log('Memory Analysis:', memoryAnalysis);
    return memoryAnalysis;
  }

  /**
   * Generate comprehensive debug report
   */
  public generateDebugReport(): any {
    const report = {
      timestamp: new Date().toISOString(),
      performance: this.metrics.performanceBaseline,
      memory: this.metrics.memoryUsage,
      components: this.analyzeComponentPerformance(),
      bundle: this.metrics.bundleInfo,
      recommendations: this.generateRecommendations()
    };

    console.log('Debug Report Generated:', report);
    return report;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(): string[] {
    const recommendations = [];

    if (this.metrics.performanceBaseline.initialLoadTime > 3000) {
      recommendations.push('Consider code splitting to reduce initial load time');
    }

    if (this.metrics.memoryUsage.percentage > 70) {
      recommendations.push('Monitor memory usage and consider cleanup strategies');
    }

    const slowComponents = this.metrics.componentRenders.filter(c => c.averageRenderTime > 16);
    if (slowComponents.length > 0) {
      recommendations.push(`Optimize ${slowComponents.length} slow components`);
    }

    return recommendations;
  }

  /**
   * Start profiling session
   */
  public startProfiling(): void {
    log.info('Debug', '🔍 [DebugCommandCenter] Starting profiling session...');
    
    // Clear previous metrics
    this.metrics.componentRenders = [];
    
    // Start performance mark
    performance.mark('debug-profiling-start');
    
    console.log('Profiling started. Use debugUtilities.stopProfiling() to end session.');
  }

  /**
   * Stop profiling session
   */
  public stopProfiling(): any {
    performance.mark('debug-profiling-end');
    performance.measure('debug-profiling-session', 'debug-profiling-start', 'debug-profiling-end');
    
    const profilingResults = {
      duration: performance.getEntriesByName('debug-profiling-session')[0]?.duration || 0,
      componentRenders: this.metrics.componentRenders.length,
      slowRenders: this.metrics.componentRenders.filter(c => c.lastRenderTime > 16).length,
      analysis: this.analyzeComponentPerformance()
    };

    log.info('Debug', '📊 [DebugCommandCenter] Profiling session complete');
    console.log('Profiling Results:', profilingResults);
    
    return profilingResults;
  }

  /**
   * Cleanup observers
   */
  public cleanup(): void {
    this.observers.forEach(observer => {
      try {
        observer.disconnect();
      } catch (error) {
        // Ignore cleanup errors
      }
    });
    this.observers.clear();
    this.isMonitoring = false;
  }
}

// Initialize debug command center in development
if (import.meta.env.DEV) {
  const debugCenter = DebugCommandCenter.getInstance();
  debugCenter.initialize();
}

export { DebugCommandCenter };
export default DebugCommandCenter;
