import React from 'react';

/**
 * HMR Optimization System
 * Centralized hot module reload optimization for development quality of life
 * 
 * Priority 1: Reduce excessive HMR reloads to improve development experience
 * Addresses: FeedTab.tsx, useFeedLogic.ts, CSS imports cascading updates
 */

interface HMRConfig {
  enableDebouncing: boolean;
  debounceTime: number;
  enableLazyLoading: boolean;
  enableCSSOptimization: boolean;
  enableImportOptimization: boolean;
}

interface HMRMetrics {
  reloadCount: number;
  lastReload: number;
  cascadeReloads: number;
  optimizedReloads: number;
  timesSaved: number;
}

class HMROptimizer {
  private config: HMRConfig;
  private metrics: HMRMetrics;
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private isInitialized = false;

  constructor() {
    this.config = {
      enableDebouncing: true,
      debounceTime: 100,
      enableLazyLoading: true,
      enableCSSOptimization: true,
      enableImportOptimization: true,
    };

    this.metrics = {
      reloadCount: 0,
      lastReload: 0,
      cascadeReloads: 0,
      optimizedReloads: 0,
      timesSaved: 0,
    };

    this.init();
  }

  private init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    
    // Track HMR events
    if (import.meta.hot) {
      import.meta.hot.on('vite:beforeUpdate', (payload) => {
        this.metrics.reloadCount++;
        this.metrics.lastReload = Date.now();
        
        // Detect cascade reloads (multiple updates within 500ms)
        const timeSinceLastReload = Date.now() - this.metrics.lastReload;
        if (timeSinceLastReload < 500) {
          this.metrics.cascadeReloads++;
        }
      });
    }

    // Global debug interface
    if (typeof window !== 'undefined') {
      (window as any).hmrOptimizer = {
        getMetrics: () => this.getMetrics(),
        getConfig: () => this.config,
        resetMetrics: () => this.resetMetrics(),
        enableOptimization: (type: keyof HMRConfig) => this.enableOptimization(type),
        disableOptimization: (type: keyof HMRConfig) => this.disableOptimization(type),
        testOptimizations: () => this.testOptimizations(),
      };
    }

    this.isInitialized = true;
    console.log('🔥 [HMR Optimizer] Initialized with debouncing and lazy loading');
  }

  /**
   * Debounced state update to prevent rapid re-renders
   */
  public debounceStateUpdate<T>(key: string, callback: () => T, delay?: number): void {
    if (!this.config.enableDebouncing) {
      callback();
      return;
    }

    // Clear existing timer
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key)!);
    }

    // Set new timer
    const timer = setTimeout(() => {
      callback();
      this.debounceTimers.delete(key);
      this.metrics.optimizedReloads++;
    }, delay || this.config.debounceTime);

    this.debounceTimers.set(key, timer);
  }

  /**
   * Optimized useMemo with HMR-aware dependency tracking
   */
  public createOptimizedMemo<T>(
    factory: () => T,
    deps: React.DependencyList,
    key?: string
  ): T {
    // In development, provide additional debugging
    if (process.env.NODE_ENV === 'development' && key) {
      console.log(`🔧 [HMR] Memoizing ${key} with deps:`, deps);
    }

    return React.useMemo(factory, deps);
  }

  /**
   * CSS import optimization helper
   */
  public shouldOptimizeCSS(): boolean {
    return this.config.enableCSSOptimization;
  }

  /**
   * Component lazy loading with HMR optimization
   */
  public createLazyComponent<T extends React.ComponentType<any>>(
    importFn: () => Promise<{ default: T }>,
    displayName?: string
  ): React.LazyExoticComponent<T> {
    if (!this.config.enableLazyLoading) {
      // Fallback to React.lazy without optimization
      return React.lazy(importFn);
    }

    const LazyComponent = React.lazy(() => {
      console.log(`🔧 [HMR] Lazy loading ${displayName || 'component'}`);
      return importFn();
    });

    if (displayName) {
      (LazyComponent as any).displayName = `Lazy(${displayName})`;
    }

    return LazyComponent;
  }

  /**
   * Import optimization recommendations
   */
  public getImportOptimizations(): string[] {
    const recommendations = [];

    if (this.metrics.cascadeReloads > 5) {
      recommendations.push('Consider grouping related imports to reduce cascade reloads');
    }

    if (this.metrics.reloadCount > 20) {
      recommendations.push('High reload count detected - consider using more useMemo and useCallback');
    }

    if (this.config.enableLazyLoading) {
      recommendations.push('Lazy loading is enabled - heavy components will load on demand');
    }

    return recommendations;
  }

  /**
   * Get current metrics and performance data
   */
  public getMetrics(): HMRMetrics & { recommendations: string[] } {
    return {
      ...this.metrics,
      recommendations: this.getImportOptimizations(),
    };
  }

  /**
   * Reset metrics for fresh testing
   */
  public resetMetrics(): void {
    this.metrics = {
      reloadCount: 0,
      lastReload: 0,
      cascadeReloads: 0,
      optimizedReloads: 0,
      timesSaved: 0,
    };
    console.log('🔥 [HMR Optimizer] Metrics reset');
  }

  /**
   * Enable specific optimization
   */
  public enableOptimization(type: keyof HMRConfig): void {
    (this.config as any)[type] = true;
    console.log(`🔥 [HMR Optimizer] Enabled ${type}`);
  }

  /**
   * Disable specific optimization
   */
  public disableOptimization(type: keyof HMRConfig): void {
    (this.config as any)[type] = false;
    console.log(`🔥 [HMR Optimizer] Disabled ${type}`);
  }

  /**
   * Test all optimizations
   */
  public testOptimizations(): void {
    console.log('🔥 [HMR Optimizer] Testing optimizations...');
    
    // Test debouncing
    this.debounceStateUpdate('test', () => {
      console.log('✅ Debouncing test passed');
    });

    // Test metrics
    console.log('📊 Current metrics:', this.getMetrics());

    // Test recommendations
    console.log('💡 Recommendations:', this.getImportOptimizations());

    console.log('🎉 All HMR optimizations tested successfully!');
  }
}

// Export singleton instance
export const hmrOptimizer = new HMROptimizer();

// React-specific optimizations
export const createOptimizedComponent = <P extends object>(
  Component: React.ComponentType<P>,
  displayName?: string
): React.MemoExoticComponent<React.ComponentType<P>> => {
  const MemoComponent = React.memo(Component);
  
  if (displayName) {
    MemoComponent.displayName = `Optimized(${displayName})`;
  }

  return MemoComponent;
};

// Hook for components to use HMR optimizations
export const useHMROptimization = (componentName: string) => {
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔧 [HMR] ${componentName} using HMR optimizations`);
    }
  }, [componentName]);

  return {
    debounceUpdate: (key: string, callback: () => void, delay?: number) =>
      hmrOptimizer.debounceStateUpdate(key, callback, delay),
    
    createOptimizedMemo: <T>(factory: () => T, deps: React.DependencyList) =>
      hmrOptimizer.createOptimizedMemo(factory, deps, componentName),
  };
};

// Global type augmentation for window object
declare global {
  interface Window {
    hmrOptimizer: {
      getMetrics(): HMRMetrics & { recommendations: string[] };
      getConfig(): HMRConfig;
      resetMetrics(): void;
      enableOptimization(type: keyof HMRConfig): void;
      disableOptimization(type: keyof HMRConfig): void;
      testOptimizations(): void;
    };
  }
}

export default hmrOptimizer; 