/**
 * 🚀 Enhanced Performance Monitor (Phase 6 Unified)
 * 
 * Now consolidates functionality from:
 * - performanceMonitor.ts (this file)
 * - realtimePerformanceMonitor.ts  
 * - hmrMonitor.ts
 * 
 * Features:
 * - Unified monitoring with lazy loading
 * - Reduced memory footprint
 * - Intelligent metric collection
 * - Development-only overhead reduction
 */

import { devLogger } from './developmentLogger';

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

interface ComponentTiming {
  startTime: number;
  name: string;
}

// Enhanced thresholds for better reporting
const THRESHOLDS = {
  longTask: process.env.NODE_ENV === 'development' ? 200 : 100, // ms - Higher threshold for dev to reduce false positives
  memory: 200, // MB - Increased from 150MB to prevent normal usage alerts  
  paint: 3000, // ms - Increased threshold
  navigation: 5000, // ms - Increased threshold
  networkRequest: 3000, // ms - Increased threshold
  componentRender: 200, // ms - Increased threshold
  realtimeLatency: 2000, // ms - Increased threshold
  hmrUpdate: 2000 // ms - Increased threshold
};

class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private componentTimings: Map<string, ComponentTiming> = new Map();
  private observers: Map<string, PerformanceObserver> = new Map();
  private intervals: Set<NodeJS.Timeout> = new Set();
  private isDevelopment: boolean;
  private isInitialized = false;
  private maxMetricsPerType = 100; // Prevent memory bloat

  constructor() {
    this.isDevelopment = import.meta.env.DEV;
    
    // Reduced metrics collection in production
    this.maxMetricsPerType = this.isDevelopment ? 100 : 20;
    
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

  /**
   * 🚀 PHASE 6: Lazy initialization - only initialize when first used
   */
  private initialize(): void {
    if (this.isInitialized) return;
    
    console.log('📊 [UnifiedPerformance] Lazy initialization starting...');
    
    this.setupLongTaskMonitoring();
    this.setupPaintMonitoring();
    this.setupMemoryMonitoring();
    
    // Phase 6: HMR monitoring integration
    if (this.isDevelopment) {
      this.setupHMRMonitoring();
    }
    
    this.isInitialized = true;
    console.log('✅ [UnifiedPerformance] Initialization complete');
  }

  /**
   * 🚀 PHASE 6: Enhanced metric recording with automatic initialization
   */
  recordMetric(name: keyof PerformanceMetrics, value: number): void {
    if (!this.isInitialized) {
      this.initialize();
    }

    const metrics = this.metrics[name];
    metrics.push(value);
    
    // Keep metrics array size manageable
    if (metrics.length > this.maxMetricsPerType) {
      metrics.shift();
    }

    // Enhanced logging with thresholds
    if (this.isDevelopment && this.shouldLogMetric(name, value)) {
      const unit = name === 'memory' ? 'MB' : 'ms';
      console.log(`📊 [Performance] ${name}: ${value.toFixed(2)}${unit}`);
    }
  }

  /**
   * 🚀 PHASE 6: Enhanced component timing with better tracking
   */
  startComponentTiming(componentName: string): string {
    const timingId = `${componentName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.componentTimings.set(timingId, {
      startTime: performance.now(),
      name: componentName
    });
    return timingId;
  }

  endComponentTiming(timingId: string): number | null {
    const timing = this.componentTimings.get(timingId);
    if (!timing) return null;

    const duration = performance.now() - timing.startTime;
    this.componentTimings.delete(timingId);
    
    // Record component render metric
    this.recordMetric('componentRenders', duration);

    // Enhanced component performance logging
    if (this.isDevelopment && duration > THRESHOLDS.componentRender) {
      console.warn(`🐌 [Performance] Slow component: ${timing.name} (${duration.toFixed(0)}ms)`);
    }

    return duration;
  }

  /**
   * 🚀 PHASE 6: New - Realtime event tracking
   */
  recordRealtimeEvent(eventType: string, latency: number = 0): void {
    this.recordMetric('realtimeEvents', latency);
    
    if (this.isDevelopment && latency > THRESHOLDS.realtimeLatency) {
      console.warn(`🐌 [Performance] Slow realtime event: ${eventType} (${latency.toFixed(0)}ms)`);
    }
  }

  /**
   * 🚀 PHASE 6: New - Network request tracking
   */
  recordNetworkRequest(url: string, duration: number): void {
    this.recordMetric('networkRequests', duration);
    
    if (this.isDevelopment && duration > THRESHOLDS.networkRequest) {
      console.warn(`🐌 [Performance] Slow network request: ${url} (${duration.toFixed(0)}ms)`);
    }
  }

  /**
   * 🚀 PHASE 6: Enhanced setup methods
   */
  private setupLongTaskMonitoring(): void {
    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.recordMetric('longTasks', entry.duration);
          
          if (this.isDevelopment && entry.duration > THRESHOLDS.longTask) {
            console.warn(`⏰ [Performance] Long task: ${entry.duration.toFixed(0)}ms`);
          }
        });
      });

      longTaskObserver.observe({ entryTypes: ['longtask'] });
      this.observers.set('longtask', longTaskObserver);
    } catch (error) {
      if (this.isDevelopment) {
        console.warn('[Performance] Long task observer not supported:', error);
      }
    }
  }

  private setupPaintMonitoring(): void {
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
      if (this.isDevelopment) {
        console.warn('[Performance] Paint observer not supported:', error);
      }
    }
  }

  private setupMemoryMonitoring(): void {
    if (!('memory' in performance)) return;
    
    // Reduced frequency in production
    const interval = this.isDevelopment ? 30000 : 120000;
    
    const memoryInterval = setInterval(() => {
      const memory = (performance as any).memory;
      const usedJSHeapSize = memory.usedJSHeapSize || 0;
      const totalJSHeapSize = memory.totalJSHeapSize || 0;
      
      // Convert to MB and validate measurements  
      const usedMB = Math.round(usedJSHeapSize / 1024 / 1024);
      const totalMB = Math.round(totalJSHeapSize / 1024 / 1024);
      
      // Validate measurements to prevent false alarms
      if (usedMB > 0 && usedMB < 2000 && totalMB > 0 && totalMB < 4000) {
        this.recordMetric('memory', usedMB);
        
        if (usedMB > THRESHOLDS.memory) {
          this.reportCriticalMetric('memory', usedMB);
        }
      } else {
        // Log invalid measurements but don't report as errors
        if (this.isDevelopment) {
          console.warn(`📊 [Performance] Invalid memory measurement detected: ${usedMB}MB used, ${totalMB}MB total`);
        }
      }
    }, interval);
    
    this.intervals.add(memoryInterval);
  }

  /**
   * 🚀 PHASE 6: New - HMR monitoring integration
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
        
        if (duration > THRESHOLDS.hmrUpdate) {
          console.warn(`🔥 [Performance] Slow HMR update: ${duration.toFixed(0)}ms`);
        }
        
        hmrStartTime = 0;
      }
    });

    import.meta.hot.on('vite:error', (error) => {
      console.warn('🚨 [Performance] HMR Error:', error);
    });
  }

  /**
   * Enhanced utility methods
   */
  private shouldLogMetric(name: keyof PerformanceMetrics, value: number): boolean {
    const thresholds = {
      memory: THRESHOLDS.memory,
      paint: THRESHOLDS.paint,
      navigation: THRESHOLDS.navigation,
      longTasks: THRESHOLDS.longTask,
      networkRequests: THRESHOLDS.networkRequest,
      componentRenders: THRESHOLDS.componentRender,
      realtimeEvents: THRESHOLDS.realtimeLatency,
      hmrUpdates: THRESHOLDS.hmrUpdate
    };

    return value > thresholds[name];
  }

  private reportCriticalMetric(name: string, value: number): void {
    if (this.isDevelopment) {
      const unit = name === 'memory' ? 'MB' : 'ms';
      console.warn(`🚨 [Performance] Critical ${name}: ${value.toFixed(1)}${unit}`);
    }
  }

  /**
   * 🚀 PHASE 6: Enhanced performance summary
   */
  getPerformanceSummary(): Record<string, any> {
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
        recent: values.slice(-5),
        threshold: this.getThresholdForMetric(type as keyof PerformanceMetrics)
      };
    });

    return summary;
  }

  private getThresholdForMetric(type: keyof PerformanceMetrics): number {
    const thresholdMap = {
      memory: THRESHOLDS.memory,
      paint: THRESHOLDS.paint,
      navigation: THRESHOLDS.navigation,
      longTasks: THRESHOLDS.longTask,
      networkRequests: THRESHOLDS.networkRequest,
      componentRenders: THRESHOLDS.componentRender,
      realtimeEvents: THRESHOLDS.realtimeLatency,
      hmrUpdates: THRESHOLDS.hmrUpdate
    };
    
    return thresholdMap[type];
  }

  /**
   * 🚀 PHASE 6: System health assessment
   */
  getSystemHealth(): 'excellent' | 'good' | 'fair' | 'poor' {
    const summary = this.getPerformanceSummary();
    let issues = 0;

    // Check for performance issues
    Object.entries(summary).forEach(([type, data]: [string, any]) => {
      if (data.avg > data.threshold) issues++;
      if (data.max > data.threshold * 2) issues++;
    });

    if (issues === 0) return 'excellent';
    if (issues <= 2) return 'good';
    if (issues <= 4) return 'fair';
    return 'poor';
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.observers.forEach(observer => {
      try {
        observer.disconnect();
      } catch (error) {
        console.warn('[Performance] Error disconnecting observer:', error);
      }
    });
    
    this.intervals.forEach(interval => clearInterval(interval));
    
    this.observers.clear();
    this.intervals.clear();
    this.componentTimings.clear();
    this.isInitialized = false;
    
    console.log('🧹 [Performance] Monitor cleaned up');
  }

  /**
   * 🚀 PHASE 6: Enhanced debug information
   */
  getDebugInfo(): Record<string, any> {
    return {
      isInitialized: this.isInitialized,
      isDevelopment: this.isDevelopment,
      maxMetricsPerType: this.maxMetricsPerType,
      activeObservers: this.observers.size,
      activeIntervals: this.intervals.size,
      activeTimings: this.componentTimings.size,
      systemHealth: this.getSystemHealth(),
      thresholds: THRESHOLDS,
      metricsCount: Object.entries(this.metrics).map(([type, values]) => ({
        type,
        count: values.length
      }))
    };
  }
}

// Export singleton instance
const performanceMonitor = new PerformanceMonitor();

// 🚀 PHASE 6: Enhanced window exposure for debugging
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).performanceMonitor = performanceMonitor;
  (window as any).getPerformanceSummary = () => performanceMonitor.getPerformanceSummary();
  (window as any).getSystemHealth = () => performanceMonitor.getSystemHealth();
  (window as any).getPerformanceDebugInfo = () => performanceMonitor.getDebugInfo();
  
  // Phase 6: Consolidation indicators - use development logger
  devLogger.startup('PerformanceMonitor', 'Unified Performance Monitor loaded');
  (window as any).phase6PerformanceConsolidated = true;
}

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    performanceMonitor.cleanup();
  });
}

export { performanceMonitor };
export default performanceMonitor; 