interface PerformanceMetrics {
  memoryUsage: number;
  connectionLatency: number;
  processingTime: number;
  batchEfficiency: number;
  errorRate: number;
}

interface OptimizationSuggestion {
  type: 'memory' | 'connection' | 'batching' | 'network';
  severity: 'low' | 'medium' | 'high';
  message: string;
  action: string;
}

export class RealtimePerformanceMonitor {
  private metrics: PerformanceMetrics = {
    memoryUsage: 0,
    connectionLatency: 0,
    processingTime: 0,
    batchEfficiency: 0,
    errorRate: 0,
  };

  private samples: number[] = [];
  private maxSamples = 100;
  private observers: Map<string, PerformanceObserver> = new Map();

  constructor() {
    this.initializeMonitoring();
  }

  private initializeMonitoring() {
    // Memory monitoring
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        this.metrics.memoryUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
      }, 5000);
    }

    // Long task monitoring
    if ('PerformanceObserver' in window) {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            console.warn(`🐌 [Performance] Long task detected: ${entry.duration}ms`);
          }
        }
      });

      try {
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.set('longtask', longTaskObserver);
      } catch (e) {
        console.log('Long task monitoring not supported');
      }
    }

    // Navigation timing
    this.trackNavigationTiming();
  }

  private trackNavigationTiming() {
    if ('getEntriesByType' in performance) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
        console.log(`📊 [Performance] Page load time: ${loadTime}ms`);
      }
    }
  }

  recordConnectionLatency(latency: number) {
    this.metrics.connectionLatency = latency;
    this.addSample(latency);
  }

  recordProcessingTime(time: number) {
    this.metrics.processingTime = time;
  }

  recordBatchProcessing(batchSize: number, processingTime: number) {
    const efficiency = batchSize / processingTime;
    this.metrics.batchEfficiency = efficiency;
  }

  recordError() {
    // Simple error rate calculation based on recent samples
    const errorWindow = this.samples.slice(-20);
    this.metrics.errorRate = errorWindow.filter(s => s === -1).length / errorWindow.length;
  }

  private addSample(value: number) {
    this.samples.push(value);
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  getOptimizationSuggestions(): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Memory usage suggestions
    if (this.metrics.memoryUsage > 0.9) {
      suggestions.push({
        type: 'memory',
        severity: 'high',
        message: 'High memory usage detected',
        action: 'Consider reducing batch sizes or enabling garbage collection',
      });
    } else if (this.metrics.memoryUsage > 0.7) {
      suggestions.push({
        type: 'memory',
        severity: 'medium',
        message: 'Memory usage is elevated',
        action: 'Monitor for memory leaks in real-time subscriptions',
      });
    }

    // Connection latency suggestions
    if (this.metrics.connectionLatency > 2000) {
      suggestions.push({
        type: 'connection',
        severity: 'high',
        message: 'High connection latency detected',
        action: 'Check network connection or switch to battery save mode',
      });
    } else if (this.metrics.connectionLatency > 1000) {
      suggestions.push({
        type: 'connection',
        severity: 'medium',
        message: 'Connection latency is elevated',
        action: 'Consider optimizing heartbeat interval',
      });
    }

    // Batch efficiency suggestions
    if (this.metrics.batchEfficiency < 0.1) {
      suggestions.push({
        type: 'batching',
        severity: 'medium',
        message: 'Low batch processing efficiency',
        action: 'Increase batch sizes or reduce debounce time',
      });
    }

    // Error rate suggestions
    if (this.metrics.errorRate > 0.1) {
      suggestions.push({
        type: 'network',
        severity: 'high',
        message: 'High error rate in real-time updates',
        action: 'Check connection stability and implement retry logic',
      });
    }

    return suggestions;
  }

  getConnectionQuality(): 'excellent' | 'good' | 'fair' | 'poor' {
    const { connectionLatency, errorRate } = this.metrics;

    if (connectionLatency > 3000 || errorRate > 0.2) return 'poor';
    if (connectionLatency > 1500 || errorRate > 0.1) return 'fair';
    if (connectionLatency > 500 || errorRate > 0.05) return 'good';
    return 'excellent';
  }

  generateReport(): string {
    const metrics = this.getMetrics();
    const suggestions = this.getOptimizationSuggestions();
    const quality = this.getConnectionQuality();

    return `
📊 Real-time Performance Report
==============================
Connection Quality: ${quality}
Memory Usage: ${(metrics.memoryUsage * 100).toFixed(1)}%
Average Latency: ${metrics.connectionLatency.toFixed(0)}ms
Processing Time: ${metrics.processingTime.toFixed(2)}ms
Batch Efficiency: ${metrics.batchEfficiency.toFixed(2)}
Error Rate: ${(metrics.errorRate * 100).toFixed(1)}%

${suggestions.length > 0 ? 'Optimization Suggestions:' : 'No optimization suggestions - system performing well!'}
${suggestions.map(s => `• [${s.severity.toUpperCase()}] ${s.message}: ${s.action}`).join('\n')}
    `.trim();
  }

  // Cleanup method
  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }
}

// Singleton instance
export const performanceMonitor = new RealtimePerformanceMonitor();

// Global access for debugging
if (typeof window !== 'undefined') {
  (window as any).realtimePerformanceMonitor = performanceMonitor;
  (window as any).getRealtimeReport = () => console.log(performanceMonitor.generateReport());
} 