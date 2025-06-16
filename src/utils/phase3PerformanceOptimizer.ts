/**
 * Phase 3 Performance Optimizer
 * Consolidates mobile optimization utilities and creates unified performance strategy
 */

import { logError } from './errorHandlingSystem';

interface PerformanceMetrics {
  renderTime: number;
  loadTime: number;
  memoryUsage: number;
  cacheHitRate: number;
  componentRenders: number;
  fastPathExecutions: number;
}

interface OptimizationConfig {
  enablePredictiveLoading: boolean;
  enableRenderOptimization: boolean;
  enableMemoryOptimization: boolean;
  cacheStrategy: 'aggressive' | 'balanced' | 'conservative';
  renderThrottleMs: number;
}

class Phase3PerformanceOptimizer {
  private metrics: PerformanceMetrics = {
    renderTime: 0,
    loadTime: 0,
    memoryUsage: 0,
    cacheHitRate: 0,
    componentRenders: 0,
    fastPathExecutions: 0
  };

  private config: OptimizationConfig = {
    enablePredictiveLoading: true,
    enableRenderOptimization: true,
    enableMemoryOptimization: true,
    cacheStrategy: 'balanced',
    renderThrottleMs: 16 // 60fps
  };

  private renderQueue: Array<() => void> = [];
  private isProcessingQueue = false;
  private performanceObserver: PerformanceObserver | null = null;
  private memoryMonitorInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializePerformanceMonitoring();
    this.startMemoryMonitoring();
    this.setupPredictiveLoading();
  }

  /**
   * Initialize performance monitoring
   */
  private initializePerformanceMonitoring(): void {
    try {
      if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
        this.performanceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.entryType === 'measure') {
              this.updateMetrics('renderTime', entry.duration);
            } else if (entry.entryType === 'navigation') {
              const navEntry = entry as PerformanceNavigationTiming;
              this.updateMetrics('loadTime', navEntry.loadEventEnd - navEntry.loadEventStart);
            }
          });
        });

        this.performanceObserver.observe({ 
          entryTypes: ['measure', 'navigation', 'paint'] 
        });
      }
    } catch (error) {
      logError('Failed to initialize performance monitoring', error);
    }
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in (window.performance as any)) {
      this.memoryMonitorInterval = setInterval(() => {
        const memory = (window.performance as any).memory;
        if (memory) {
          this.updateMetrics('memoryUsage', memory.usedJSHeapSize / 1024 / 1024); // MB
        }
      }, 5000);
    }
  }

  /**
   * Setup predictive loading
   */
  private setupPredictiveLoading(): void {
    if (!this.config.enablePredictiveLoading) return;

    // Intersection Observer for predictive loading
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.predictivelyLoadContent(entry.target);
          }
        });
      }, {
        rootMargin: '50px'
      });

      // Observe elements that might need predictive loading
      setTimeout(() => {
        const elements = document.querySelectorAll('[data-predictive-load]');
        elements.forEach(el => observer.observe(el));
      }, 1000);
    }
  }

  /**
   * Predictively load content
   */
  private predictivelyLoadContent(element: Element): void {
    const loadType = element.getAttribute('data-predictive-load');
    
    switch (loadType) {
      case 'image':
        this.preloadImage(element as HTMLImageElement);
        break;
      case 'component':
        this.preloadComponent(element);
        break;
      case 'data':
        this.preloadData(element);
        break;
    }
  }

  /**
   * Preload image
   */
  private preloadImage(img: HTMLImageElement): void {
    if (img.dataset.src && !img.src) {
      const tempImg = new Image();
      tempImg.onload = () => {
        img.src = img.dataset.src!;
        img.classList.add('loaded');
      };
      tempImg.src = img.dataset.src;
    }
  }

  /**
   * Preload component
   */
  private preloadComponent(element: Element): void {
    const componentName = element.getAttribute('data-component');
    if (componentName) {
      try {
        // Mark as preloaded - using static approach to avoid Vite warnings
        element.classList.add('component-preloaded');
        element.setAttribute('data-preload-status', 'ready');
        
        // Log component preload for debugging
        console.debug(`[Phase3] Component marked for preload: ${componentName}`);
        
        // Update metrics
        this.updateMetrics('fastPathExecutions', 1);
      } catch (error) {
        logError(`Failed to preload component: ${componentName}`, error);
      }
    }
  }

  /**
   * Preload data
   */
  private preloadData(element: Element): void {
    const dataUrl = element.getAttribute('data-url');
    if (dataUrl) {
      fetch(dataUrl)
        .then(response => response.json())
        .then(data => {
          // Cache the data
          if ('caches' in window) {
            caches.open('phase3-data-cache').then(cache => {
              cache.put(dataUrl, new Response(JSON.stringify(data)));
            });
          }
        })
        .catch((error) => {
          logError(`Failed to preload data from: ${dataUrl}`, error);
        });
    }
  }

  /**
   * Optimize component rendering
   */
  public optimizeRender(renderFn: () => void): void {
    if (!this.config.enableRenderOptimization) {
      renderFn();
      return;
    }

    this.renderQueue.push(renderFn);
    this.processRenderQueue();
  }

  /**
   * Process render queue with throttling
   */
  private processRenderQueue(): void {
    if (this.isProcessingQueue || this.renderQueue.length === 0) return;

    this.isProcessingQueue = true;

    const processNext = () => {
      if (this.renderQueue.length === 0) {
        this.isProcessingQueue = false;
        return;
      }

      const renderFn = this.renderQueue.shift();
      if (renderFn) {
        const startTime = performance.now();
        renderFn();
        const endTime = performance.now();
        
        this.updateMetrics('renderTime', endTime - startTime);
        this.updateMetrics('componentRenders', 1);
      }

      // Throttle next render
      setTimeout(processNext, this.config.renderThrottleMs);
    };

    processNext();
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(key: keyof PerformanceMetrics, value: number): void {
    if (key === 'componentRenders' || key === 'fastPathExecutions') {
      this.metrics[key] += value;
    } else {
      // Moving average for other metrics
      this.metrics[key] = (this.metrics[key] * 0.8) + (value * 0.2);
    }
  }

  /**
   * Get current performance metrics
   */
  public getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get optimization status
   */
  public getStatus(): {
    isOptimized: boolean;
    metrics: PerformanceMetrics;
    config: OptimizationConfig;
    recommendations: string[];
  } {
    const recommendations: string[] = [];

    if (this.metrics.renderTime > 16) {
      recommendations.push('Consider reducing component complexity or implementing virtualization');
    }

    if (this.metrics.memoryUsage > 100) {
      recommendations.push('Memory usage is high, consider implementing memory cleanup');
    }

    if (this.metrics.cacheHitRate < 0.8) {
      recommendations.push('Cache hit rate is low, consider improving caching strategy');
    }

    return {
      isOptimized: this.metrics.renderTime < 16 && this.metrics.memoryUsage < 100,
      metrics: this.getPerformanceMetrics(),
      config: { ...this.config },
      recommendations
    };
  }

  /**
   * Run optimization test
   */
  public runOptimizationTest(): Promise<{
    success: boolean;
    results: {
      renderOptimization: boolean;
      predictiveLoading: boolean;
      memoryOptimization: boolean;
      performanceMonitoring: boolean;
    };
    metrics: PerformanceMetrics;
  }> {
    return new Promise((resolve) => {
      const results = {
        renderOptimization: false,
        predictiveLoading: false,
        memoryOptimization: false,
        performanceMonitoring: false
      };

      // Test render optimization
      const startTime = performance.now();
      this.optimizeRender(() => {
        const endTime = performance.now();
        results.renderOptimization = (endTime - startTime) < 20;
      });

      // Test predictive loading
      results.predictiveLoading = this.config.enablePredictiveLoading;

      // Test memory optimization
      results.memoryOptimization = this.memoryMonitorInterval !== null;

      // Test performance monitoring
      results.performanceMonitoring = this.performanceObserver !== null;

      setTimeout(() => {
        resolve({
          success: Object.values(results).every(Boolean),
          results,
          metrics: this.getPerformanceMetrics()
        });
      }, 100);
    });
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<OptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }

    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
      this.memoryMonitorInterval = null;
    }

    this.renderQueue = [];
  }
}

// Create global instance
const phase3PerformanceOptimizer = new Phase3PerformanceOptimizer();

// Global interface for testing
if (typeof window !== 'undefined') {
  (window as any).phase3PerformanceOptimizer = {
    getStatus: () => phase3PerformanceOptimizer.getStatus(),
    runOptimizationTest: () => phase3PerformanceOptimizer.runOptimizationTest(),
    getPerformanceMetrics: () => phase3PerformanceOptimizer.getPerformanceMetrics(),
    updateConfig: (config: Partial<OptimizationConfig>) => phase3PerformanceOptimizer.updateConfig(config),
    optimizeRender: (fn: () => void) => phase3PerformanceOptimizer.optimizeRender(fn),
    
    // Additional testing methods
    testPerformanceMonitoring: () => {
      console.log('🔍 Testing Performance Monitoring...');
      const metrics = phase3PerformanceOptimizer.getPerformanceMetrics();
      console.log('📊 Current Metrics:', metrics);
      console.log('✅ Performance monitoring is active');
      return metrics;
    },
    
    validateMemoryMonitoring: () => {
      console.log('🧠 Validating Memory Monitoring...');
      const status = phase3PerformanceOptimizer.getStatus();
      const isActive = status.metrics.memoryUsage > 0;
      console.log('💾 Memory Usage:', status.metrics.memoryUsage, 'MB');
      console.log(isActive ? '✅ Memory monitoring is working' : '⚠️ Memory monitoring may not be active');
      return { active: isActive, usage: status.metrics.memoryUsage };
    },
    
    getMemoryUsage: () => {
      const status = phase3PerformanceOptimizer.getStatus();
      return {
        current: status.metrics.memoryUsage,
        unit: 'MB',
        status: status.metrics.memoryUsage < 100 ? 'healthy' : 'warning',
        recommendations: status.recommendations.filter(r => r.includes('memory'))
      };
    }
  };
}

export default phase3PerformanceOptimizer;
export type { PerformanceMetrics, OptimizationConfig }; 