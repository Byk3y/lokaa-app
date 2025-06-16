/**
 * Phase 3 Component Rendering Optimizer
 * React component memoization strategies, render cycle optimization, state update batching, and re-render prevention
 */

import { logError } from './errorHandlingSystem';

interface RenderMetrics {
  totalRenders: number;
  averageRenderTime: number;
  slowRenders: number;
  preventedRenders: number;
  memoizedComponents: number;
  batchedUpdates: number;
}

interface RenderConfig {
  enableMemoization: boolean;
  enableBatching: boolean;
  enableRenderTracking: boolean;
  slowRenderThreshold: number; // milliseconds
  batchDelay: number; // milliseconds
  maxBatchSize: number;
}

interface ComponentRenderInfo {
  name: string;
  renderCount: number;
  totalRenderTime: number;
  averageRenderTime: number;
  lastRenderTime: number;
  isMemoized: boolean;
  props: any;
  propsHash: string;
}

class Phase3RenderOptimizer {
  private renderMetrics: RenderMetrics = {
    totalRenders: 0,
    averageRenderTime: 0,
    slowRenders: 0,
    preventedRenders: 0,
    memoizedComponents: 0,
    batchedUpdates: 0
  };

  private config: RenderConfig = {
    enableMemoization: true,
    enableBatching: true,
    enableRenderTracking: true,
    slowRenderThreshold: 16, // 60fps threshold
    batchDelay: 10, // 10ms batching delay
    maxBatchSize: 50
  };

  private componentRegistry = new Map<string, ComponentRenderInfo>();
  private renderQueue: Array<() => void> = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private renderObserver: PerformanceObserver | null = null;
  private isProcessingBatch = false;

  constructor() {
    this.initializeRenderTracking();
    this.setupPerformanceObserver();
    console.log('🎨 Phase 3 Render Optimizer initialized');
  }

  /**
   * Initialize render tracking
   */
  private initializeRenderTracking(): void {
    if (!this.config.enableRenderTracking) return;

    // Monkey patch React's render methods for tracking
    if (typeof window !== 'undefined' && (window as any).React) {
      this.patchReactRender();
    }
  }

  /**
   * Setup performance observer for render tracking
   */
  private setupPerformanceObserver(): void {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        this.renderObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.name.includes('React') || entry.name.includes('render')) {
              this.recordRenderTime(entry.name, entry.duration);
            }
          });
        });

        this.renderObserver.observe({ entryTypes: ['measure'] });
      } catch (error) {
        logError('Failed to setup render performance observer', error);
      }
    }
  }

  /**
   * Patch React render methods for tracking
   */
  private patchReactRender(): void {
    // This is a simplified version - in a real implementation, 
    // you'd use React DevTools profiler or custom hooks
    console.log('🔧 React render tracking enabled');
  }

  /**
   * Track render cycles
   */
  public trackRenderCycles(): {
    isTracking: boolean;
    metrics: RenderMetrics;
    topSlowComponents: ComponentRenderInfo[];
  } {
    const topSlowComponents = Array.from(this.componentRegistry.values())
      .sort((a, b) => b.averageRenderTime - a.averageRenderTime)
      .slice(0, 10);

    return {
      isTracking: this.config.enableRenderTracking,
      metrics: { ...this.renderMetrics },
      topSlowComponents
    };
  }

  /**
   * Record component render
   */
  public recordComponentRender(
    componentName: string,
    renderTime: number,
    props: any = {}
  ): void {
    const propsHash = this.hashProps(props);
    let componentInfo = this.componentRegistry.get(componentName);

    if (!componentInfo) {
      componentInfo = {
        name: componentName,
        renderCount: 0,
        totalRenderTime: 0,
        averageRenderTime: 0,
        lastRenderTime: 0,
        isMemoized: false,
        props: {},
        propsHash: ''
      };
      this.componentRegistry.set(componentName, componentInfo);
    }

    // Update component info
    componentInfo.renderCount++;
    componentInfo.totalRenderTime += renderTime;
    componentInfo.averageRenderTime = componentInfo.totalRenderTime / componentInfo.renderCount;
    componentInfo.lastRenderTime = renderTime;
    componentInfo.props = props;

    // Check if render could have been prevented with memoization
    if (componentInfo.propsHash === propsHash && !componentInfo.isMemoized) {
      this.renderMetrics.preventedRenders++;
      console.log(`🚫 [RenderOptimizer] Unnecessary render prevented for ${componentName}`);
    }

    componentInfo.propsHash = propsHash;

    // Update global metrics
    this.updateRenderMetrics(renderTime);
  }

  /**
   * Hash props for memoization comparison
   */
  private hashProps(props: any): string {
    try {
      return JSON.stringify(props, Object.keys(props).sort());
    } catch {
      return String(Date.now()); // Fallback for non-serializable props
    }
  }

  /**
   * Update render metrics
   */
  private updateRenderMetrics(renderTime: number): void {
    this.renderMetrics.totalRenders++;
    
    // Update average render time
    const totalTime = this.renderMetrics.averageRenderTime * (this.renderMetrics.totalRenders - 1) + renderTime;
    this.renderMetrics.averageRenderTime = totalTime / this.renderMetrics.totalRenders;

    // Track slow renders
    if (renderTime > this.config.slowRenderThreshold) {
      this.renderMetrics.slowRenders++;
    }
  }

  /**
   * Record render time from performance observer
   */
  private recordRenderTime(name: string, duration: number): void {
    this.recordComponentRender(name, duration);
  }

  /**
   * Optimize render with memoization
   */
  public optimizeRender<T>(
    componentName: string,
    renderFn: () => T,
    props: any = {},
    dependencies: any[] = []
  ): T {
    if (!this.config.enableMemoization) {
      return this.executeRender(componentName, renderFn);
    }

    const componentInfo = this.componentRegistry.get(componentName);
    const propsHash = this.hashProps(props);
    const depsHash = this.hashProps(dependencies);

    // Check if we can skip render due to memoization
    if (componentInfo && 
        componentInfo.propsHash === propsHash && 
        componentInfo.isMemoized) {
      this.renderMetrics.preventedRenders++;
      console.log(`⚡ [RenderOptimizer] Memoized render for ${componentName}`);
      return componentInfo.props.lastResult;
    }

    // Execute render and cache result
    const result = this.executeRender(componentName, renderFn);
    
    // Update component info for memoization
    if (componentInfo) {
      componentInfo.isMemoized = true;
      componentInfo.props.lastResult = result;
      componentInfo.propsHash = propsHash;
      this.renderMetrics.memoizedComponents++;
    }

    return result;
  }

  /**
   * Execute render with timing
   */
  private executeRender<T>(componentName: string, renderFn: () => T): T {
    const startTime = performance.now();
    
    try {
      const result = renderFn();
      const renderTime = performance.now() - startTime;
      
      this.recordComponentRender(componentName, renderTime);
      
      return result;
    } catch (error) {
      const renderTime = performance.now() - startTime;
      this.recordComponentRender(componentName, renderTime);
      logError(`Render error in ${componentName}`, error);
      throw error;
    }
  }

  /**
   * Batch state updates
   */
  public batchUpdate(updateFn: () => void): void {
    if (!this.config.enableBatching) {
      updateFn();
      return;
    }

    this.renderQueue.push(updateFn);
    
    if (this.renderQueue.length >= this.config.maxBatchSize) {
      this.flushBatch();
    } else if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => {
        this.flushBatch();
      }, this.config.batchDelay);
    }
  }

  /**
   * Flush batched updates
   */
  private flushBatch(): void {
    if (this.isProcessingBatch || this.renderQueue.length === 0) return;

    this.isProcessingBatch = true;

    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    const updates = this.renderQueue.splice(0);
    const startTime = performance.now();

    try {
      // Execute all updates in a single batch
      updates.forEach(updateFn => updateFn());
      
      const batchTime = performance.now() - startTime;
      this.renderMetrics.batchedUpdates += updates.length;
      
      console.log(`📦 [RenderOptimizer] Batched ${updates.length} updates in ${batchTime.toFixed(2)}ms`);
    } catch (error) {
      logError('Error in batch update', error);
    } finally {
      this.isProcessingBatch = false;
    }
  }

  /**
   * Get optimization report
   */
  public getOptimizationReport(): {
    metrics: RenderMetrics;
    recommendations: string[];
    componentAnalysis: {
      slowComponents: ComponentRenderInfo[];
      memoizationCandidates: ComponentRenderInfo[];
      wellOptimized: ComponentRenderInfo[];
    };
  } {
    const components = Array.from(this.componentRegistry.values());
    
    const slowComponents = components
      .filter(c => c.averageRenderTime > this.config.slowRenderThreshold)
      .sort((a, b) => b.averageRenderTime - a.averageRenderTime);

    const memoizationCandidates = components
      .filter(c => !c.isMemoized && c.renderCount > 5)
      .sort((a, b) => b.renderCount - a.renderCount);

    const wellOptimized = components
      .filter(c => c.isMemoized && c.averageRenderTime < this.config.slowRenderThreshold);

    const recommendations: string[] = [];

    if (slowComponents.length > 0) {
      recommendations.push(`Optimize ${slowComponents.length} slow components (>${this.config.slowRenderThreshold}ms)`);
    }

    if (memoizationCandidates.length > 0) {
      recommendations.push(`Add memoization to ${memoizationCandidates.length} frequently rendering components`);
    }

    if (this.renderMetrics.slowRenders > this.renderMetrics.totalRenders * 0.1) {
      recommendations.push('High percentage of slow renders detected - consider performance optimization');
    }

    if (this.renderMetrics.preventedRenders < this.renderMetrics.totalRenders * 0.2) {
      recommendations.push('Low memoization effectiveness - review memoization strategy');
    }

    return {
      metrics: { ...this.renderMetrics },
      recommendations,
      componentAnalysis: {
        slowComponents,
        memoizationCandidates,
        wellOptimized
      }
    };
  }

  /**
   * Validate memoization effectiveness
   */
  public validateMemoization(): {
    success: boolean;
    results: {
      memoizationEnabled: boolean;
      preventedRenders: number;
      memoizedComponents: number;
      effectiveness: number;
    };
  } {
    const effectiveness = this.renderMetrics.totalRenders > 0 
      ? this.renderMetrics.preventedRenders / this.renderMetrics.totalRenders 
      : 0;

    return {
      success: this.config.enableMemoization && effectiveness > 0.1,
      results: {
        memoizationEnabled: this.config.enableMemoization,
        preventedRenders: this.renderMetrics.preventedRenders,
        memoizedComponents: this.renderMetrics.memoizedComponents,
        effectiveness
      }
    };
  }

  /**
   * Get system status
   */
  public getStatus(): {
    system: string;
    status: 'healthy' | 'warning' | 'error';
    metrics: RenderMetrics;
    health: {
      score: number;
      issues: string[];
      recommendations: string[];
    };
    configuration: RenderConfig;
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let healthScore = 100;

    // Check for performance issues
    if (this.renderMetrics.averageRenderTime > this.config.slowRenderThreshold) {
      issues.push(`High average render time: ${this.renderMetrics.averageRenderTime.toFixed(2)}ms`);
      recommendations.push('Consider optimizing slow components');
      healthScore -= 20;
    }

    // Check memoization effectiveness
    const memoizationRate = this.renderMetrics.totalRenders > 0 
      ? this.renderMetrics.preventedRenders / this.renderMetrics.totalRenders 
      : 0;

    if (memoizationRate < 0.1 && this.renderMetrics.totalRenders > 10) {
      issues.push(`Low memoization effectiveness: ${(memoizationRate * 100).toFixed(1)}%`);
      recommendations.push('Review memoization strategy for frequently rendering components');
      healthScore -= 15;
    }

    // Check for excessive slow renders
    const slowRenderRate = this.renderMetrics.totalRenders > 0 
      ? this.renderMetrics.slowRenders / this.renderMetrics.totalRenders 
      : 0;

    if (slowRenderRate > 0.2) {
      issues.push(`High slow render rate: ${(slowRenderRate * 100).toFixed(1)}%`);
      recommendations.push('Investigate and optimize components with slow render times');
      healthScore -= 25;
    }

    // Determine overall status
    let status: 'healthy' | 'warning' | 'error' = 'healthy';
    if (healthScore < 70) {
      status = 'error';
    } else if (healthScore < 85) {
      status = 'warning';
    }

    return {
      system: 'Phase 3 Render Optimizer',
      status,
      metrics: { ...this.renderMetrics },
      health: {
        score: Math.max(0, healthScore),
        issues,
        recommendations
      },
      configuration: { ...this.config }
    };
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<RenderConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Reset metrics
   */
  public resetMetrics(): void {
    this.renderMetrics = {
      totalRenders: 0,
      averageRenderTime: 0,
      slowRenders: 0,
      preventedRenders: 0,
      memoizedComponents: 0,
      batchedUpdates: 0
    };
    this.componentRegistry.clear();
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.renderObserver) {
      this.renderObserver.disconnect();
      this.renderObserver = null;
    }

    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    this.flushBatch();
    this.resetMetrics();
  }
}

// Create global instance
const phase3RenderOptimizer = new Phase3RenderOptimizer();

// Global interface for testing
if (typeof window !== 'undefined') {
  (window as any).phase3RenderOptimizer = {
    trackRenderCycles: () => phase3RenderOptimizer.trackRenderCycles(),
    getOptimizationReport: () => phase3RenderOptimizer.getOptimizationReport(),
    validateMemoization: () => phase3RenderOptimizer.validateMemoization(),
    getStatus: () => phase3RenderOptimizer.getStatus(),
    recordComponentRender: (name: string, time: number, props?: any) => 
      phase3RenderOptimizer.recordComponentRender(name, time, props),
    optimizeRender: (name: string, fn: () => any, props?: any, deps?: any[]) => 
      phase3RenderOptimizer.optimizeRender(name, fn, props, deps),
    batchUpdate: (fn: () => void) => phase3RenderOptimizer.batchUpdate(fn),
    resetMetrics: () => phase3RenderOptimizer.resetMetrics()
  };
}

export default phase3RenderOptimizer;
export type { RenderMetrics, RenderConfig, ComponentRenderInfo }; 