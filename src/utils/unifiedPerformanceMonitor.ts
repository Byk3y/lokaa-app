import { log } from '@/utils/logger';
/**
 * 🚀 Unified Performance Monitor
 * 
 * Consolidates performanceMonitor.ts + realtimePerformanceMonitor.ts + hmrMonitor.ts
 * into a single, optimized monitoring system with:
 * - Lazy loading for minimal initial overhead
 * - Intelligent monitoring based on environment
 * - Unified debugging interface
 * - Memory-efficient metric collection
 */

interface PerformanceMetrics {
  memory: number[];
  paint: number[];
  navigation: number[];
  longTasks: number[];
  networkRequests: number[];
  componentRenders: number[];
  realtimeEvents: number[];
  hmrUpdates: number[];
}

interface MonitoringConfig {
  enableMemoryTracking: boolean;
  enablePaintTracking: boolean;
  enableNetworkTracking: boolean;
  enableComponentTracking: boolean;
  enableRealtimeTracking: boolean;
  enableHMRTracking: boolean;
  maxMetricsPerType: number;
  reportingInterval: number;
}

class UnifiedPerformanceMonitor {
  private static instance: UnifiedPerformanceMonitor;
  private metrics: PerformanceMetrics;
  private config: MonitoringConfig;
  private timingIds: Map<string, number> = new Map();
  private observers: Map<string, any> = new Map();
  private intervals: Set<NodeJS.Timeout> = new Set();
  private isInitialized = false;
  private isDevelopment: boolean;

  private constructor() {
    this.isDevelopment = import.meta.env.DEV;
    
    // Optimized config based on environment
    this.config = {
      enableMemoryTracking: this.isDevelopment,
      enablePaintTracking: true,
      enableNetworkTracking: this.isDevelopment,
      enableComponentTracking: this.isDevelopment,
      enableRealtimeTracking: this.isDevelopment,
      enableHMRTracking: this.isDevelopment,
      maxMetricsPerType: this.isDevelopment ? 100 : 20,
      reportingInterval: this.isDevelopment ? 30000 : 60000
    };

    this.metrics = {
      memory: [],
      paint: [],
      navigation: [],
      longTasks: [],
      networkRequests: [],
      componentRenders: [],
      realtimeEvents: [],
      hmrUpdates: []
    };
  }

  public static getInstance(): UnifiedPerformanceMonitor {
    if (!UnifiedPerformanceMonitor.instance) {
      UnifiedPerformanceMonitor.instance = new UnifiedPerformanceMonitor();
    }
    return UnifiedPerformanceMonitor.instance;
  }

  /**
   * Lazy initialization - only initialize when first metric is recorded
   */
  private initialize(): void {
    if (this.isInitialized) return;
    
    log.debug('Utils', '🔍 [UnifiedPerformance] Lazy initialization starting...');
    
    // Setup paint observer
    if (this.config.enablePaintTracking) {
      this.setupPaintObserver();
    }

    // Setup memory monitoring
    if (this.config.enableMemoryTracking) {
      this.setupMemoryMonitoring();
    }

    // Setup long task observer
    this.setupLongTaskObserver();

    // Setup HMR monitoring if in development
    if (this.config.enableHMRTracking && import.meta.hot) {
      this.setupHMRMonitoring();
    }

    // Setup periodic reporting
    this.setupPeriodicReporting();

    this.isInitialized = true;
    log.debug('Utils', '✅ [UnifiedPerformance] Initialization complete');
  }

  /**
   * Record a metric value
   */
  public recordMetric(type: keyof PerformanceMetrics, value: number): void {
    if (!this.isInitialized) {
      this.initialize();
    }

    const metrics = this.metrics[type];
    metrics.push(value);

    // Keep metrics array size manageable
    if (metrics.length > this.config.maxMetricsPerType) {
      metrics.shift();
    }

    // Log significant metrics in development
    if (this.isDevelopment && this.shouldLogMetric(type, value)) {
      log.debug('Utils', `📊 [Performance] ${type}: ${value.toFixed(2)}${this.getMetricUnit(type)}`);
    }
  }

  /**
   * Start component timing
   */
  public startComponentTiming(componentName: string): string {
    const timingId = `${componentName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.timingIds.set(timingId, performance.now());
    return timingId;
  }

  /**
   * End component timing
   */
  public endComponentTiming(timingId: string): number | null {
    const startTime = this.timingIds.get(timingId);
    if (!startTime) return null;

    const duration = performance.now() - startTime;
    this.timingIds.delete(timingId);
    
    if (this.config.enableComponentTracking) {
      this.recordMetric('componentRenders', duration);
    }

    return duration;
  }

  /**
   * Record realtime event
   */
  public recordRealtimeEvent(eventType: string, latency: number = 0): void {
    if (!this.config.enableRealtimeTracking) return;
    
    this.recordMetric('realtimeEvents', latency);
    
    if (this.isDevelopment && latency > 2000) {
      log.warn('Utils', `🐌 [Performance] Slow realtime event: ${eventType} (${latency.toFixed(0)}ms)`);
    }
  }

  /**
   * Record network request
   */
  public recordNetworkRequest(url: string, duration: number): void {
    if (!this.config.enableNetworkTracking) return;
    
    this.recordMetric('networkRequests', duration);
    
    if (this.isDevelopment && duration > 3000) {
      log.warn('Utils', `🐌 [Performance] Slow network request: ${url} (${duration.toFixed(0)}ms)`);
    }
  }

  /**
   * Get performance summary
   */
  public getPerformanceSummary(): Record<string, any> {
    const summary: Record<string, any> = {};

    Object.entries(this.metrics).forEach(([type, values]) => {
      if (values.length === 0) {
        summary[type] = { count: 0 };
        return;
      }

      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const max = Math.max(...values);
      const min = Math.min(...values);

      summary[type] = {
        count: values.length,
        avg: Math.round(avg * 100) / 100,
        max: Math.round(max * 100) / 100,
        min: Math.round(min * 100) / 100,
        recent: values.slice(-5)
      };
    });

    return summary;
  }

  /**
   * Setup paint observer
   */
  private setupPaintObserver(): void {
    try {
      const paintObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'paint') {
            this.recordMetric('paint', entry.startTime);
          } else if (entry.entryType === 'navigation') {
            this.recordMetric('navigation', entry.duration || 0);
          }
        });
      });

      paintObserver.observe({ entryTypes: ['paint', 'navigation'] });
      this.observers.set('paint', paintObserver);
    } catch (error) {
      log.warn('Utils', '[UnifiedPerformance] Paint observer not supported:', error);
    }
  }

  /**
   * Setup memory monitoring
   */
  private setupMemoryMonitoring(): void {
    if (!('memory' in performance)) return;

    const memoryInterval = setInterval(() => {
      const memory = (performance as any).memory;
      const usedMB = memory.usedJSHeapSize / 1024 / 1024;
      this.recordMetric('memory', usedMB);
    }, this.config.reportingInterval);

    this.intervals.add(memoryInterval);
  }

  /**
   * Setup long task observer
   */
  private setupLongTaskObserver(): void {
    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.recordMetric('longTasks', entry.duration);
          
          if (this.isDevelopment && entry.duration > 50) {
            log.warn('Utils', `⏰ [Performance] Long task detected: ${entry.duration.toFixed(0)}ms`);
          }
        });
      });

      longTaskObserver.observe({ entryTypes: ['longtask'] });
      this.observers.set('longtask', longTaskObserver);
    } catch (error) {
      log.warn('Utils', '[UnifiedPerformance] Long task observer not supported:', error);
    }
  }

  /**
   * Setup HMR monitoring
   */
  private setupHMRMonitoring(): void {
    if (!import.meta.hot) return;

    let hmrStartTime = 0;

    import.meta.hot.on('vite:beforeUpdate', () => {
      hmrStartTime = performance.now();
    });

    import.meta.hot.on('vite:afterUpdate', () => {
      if (hmrStartTime > 0) {
        const duration = performance.now() - hmrStartTime;
        this.recordMetric('hmrUpdates', duration);
        hmrStartTime = 0;
      }
    });

    import.meta.hot.on('vite:error', (error) => {
      log.warn('Utils', '🚨 [Performance] HMR Error detected:', error);
    });
  }

  /**
   * Setup periodic reporting
   */
  private setupPeriodicReporting(): void {
    if (!this.isDevelopment) return;

    const reportingInterval = setInterval(() => {
      const summary = this.getPerformanceSummary();
      const hasSignificantData = Object.values(summary).some((s: any) => s.count > 0);
      
      if (hasSignificantData) {
        log.debug('Utils', '📊 [Performance] Periodic Report:', summary);
      }
    }, this.config.reportingInterval);

    this.intervals.add(reportingInterval);
  }

  /**
   * Helper methods
   */
  private shouldLogMetric(type: keyof PerformanceMetrics, value: number): boolean {
    const thresholds = {
      memory: 50, // MB
      paint: 2000, // ms
      navigation: 3000, // ms
      longTasks: 50, // ms
      networkRequests: 2000, // ms
      componentRenders: 100, // ms
      realtimeEvents: 1000, // ms
      hmrUpdates: 1000 // ms
    };

    return value > thresholds[type];
  }

  private getMetricUnit(type: keyof PerformanceMetrics): string {
    return type === 'memory' ? 'MB' : 'ms';
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.intervals.forEach(interval => clearInterval(interval));
    this.observers.clear();
    this.intervals.clear();
    this.timingIds.clear();
    this.isInitialized = false;
  }

  /**
   * Debug utilities
   */
  public getDebugInfo(): Record<string, any> {
    return {
      config: this.config,
      metricsCount: Object.entries(this.metrics).map(([type, values]) => ({
        type,
        count: values.length
      })),
      activeTimings: this.timingIds.size,
      activeObservers: this.observers.size,
      activeIntervals: this.intervals.size,
      isInitialized: this.isInitialized
    };
  }
}

// Export singleton instance
export const unifiedPerformanceMonitor = UnifiedPerformanceMonitor.getInstance();

// Expose to window for debugging in development
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).unifiedPerformanceMonitor = unifiedPerformanceMonitor;
  (window as any).getPerformanceSummary = () => unifiedPerformanceMonitor.getPerformanceSummary();
  (window as any).getPerformanceDebugInfo = () => unifiedPerformanceMonitor.getDebugInfo();
}

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    unifiedPerformanceMonitor.cleanup();
  });
}

export default unifiedPerformanceMonitor; 