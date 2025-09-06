/**
 * 🚀 Phase 3.2: Performance Monitoring Utility
 * 
 * This utility monitors Core Web Vitals and other performance metrics
 * to ensure the optimizations are working effectively.
 */

export interface PerformanceMetrics {
  /** Largest Contentful Paint (LCP) */
  lcp: number | null;
  /** First Input Delay (FID) */
  fid: number | null;
  /** Cumulative Layout Shift (CLS) */
  cls: number | null;
  /** First Contentful Paint (FCP) */
  fcp: number | null;
  /** Time to Interactive (TTI) */
  tti: number | null;
  /** Total Blocking Time (TBT) */
  tbt: number | null;
  /** Speed Index */
  si: number | null;
  /** Bundle size metrics */
  bundleSize: {
    totalSize: number;
    gzippedSize: number;
    chunkCount: number;
    largestChunk: number;
  };
  /** Font loading metrics */
  fontMetrics: {
    fontsLoaded: number;
    totalFonts: number;
    loadTime: number;
    fallbackUsed: boolean;
  };
  /** Critical CSS metrics */
  criticalCSS: {
    size: number;
    totalSize: number;
    ratio: number;
  };
}

export interface PerformanceThresholds {
  lcp: number; // Good: < 2.5s, Needs Improvement: 2.5s - 4s, Poor: > 4s
  fid: number; // Good: < 100ms, Needs Improvement: 100ms - 300ms, Poor: > 300ms
  cls: number; // Good: < 0.1, Needs Improvement: 0.1 - 0.25, Poor: > 0.25
  fcp: number; // Good: < 1.8s, Needs Improvement: 1.8s - 3s, Poor: > 3s
  tti: number; // Good: < 3.8s, Needs Improvement: 3.8s - 7.3s, Poor: > 7.3s
  tbt: number; // Good: < 200ms, Needs Improvement: 200ms - 600ms, Poor: > 600ms
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  lcp: 2500, // 2.5 seconds
  fid: 100,  // 100 milliseconds
  cls: 0.1,  // 0.1
  fcp: 1800, // 1.8 seconds
  tti: 3800, // 3.8 seconds
  tbt: 200   // 200 milliseconds
};

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    lcp: null,
    fid: null,
    cls: null,
    fcp: null,
    tti: null,
    tbt: null,
    si: null,
    bundleSize: {
      totalSize: 0,
      gzippedSize: 0,
      chunkCount: 0,
      largestChunk: 0
    },
    fontMetrics: {
      fontsLoaded: 0,
      totalFonts: 0,
      loadTime: 0,
      fallbackUsed: false
    },
    criticalCSS: {
      size: 0,
      totalSize: 0,
      ratio: 0
    }
  };

  private thresholds: PerformanceThresholds = DEFAULT_THRESHOLDS;
  private observers: PerformanceObserver[] = [];
  private isInitialized = false;

  constructor(thresholds?: Partial<PerformanceThresholds>) {
    if (thresholds) {
      this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
    }
  }

  /**
   * Initialize performance monitoring
   */
  public init(): void {
    if (this.isInitialized || typeof window === 'undefined') {
      return;
    }

    this.setupCoreWebVitals();
    this.setupBundleSizeMonitoring();
    this.setupFontMonitoring();
    this.setupCriticalCSSMonitoring();
    
    this.isInitialized = true;
  }

  /**
   * Setup Core Web Vitals monitoring
   */
  private setupCoreWebVitals(): void {
    // LCP (Largest Contentful Paint)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          this.metrics.lcp = lastEntry.startTime;
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);
      } catch (error) {
        console.warn('LCP monitoring not supported:', error);
      }

      // FID (First Input Delay)
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            this.metrics.fid = entry.processingStart - entry.startTime;
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.push(fidObserver);
      } catch (error) {
        console.warn('FID monitoring not supported:', error);
      }

      // CLS (Cumulative Layout Shift)
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          this.metrics.cls = clsValue;
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(clsObserver);
      } catch (error) {
        console.warn('CLS monitoring not supported:', error);
      }

      // FCP (First Contentful Paint)
      try {
        const fcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (entry.name === 'first-contentful-paint') {
              this.metrics.fcp = entry.startTime;
            }
          });
        });
        fcpObserver.observe({ entryTypes: ['paint'] });
        this.observers.push(fcpObserver);
      } catch (error) {
        console.warn('FCP monitoring not supported:', error);
      }
    }
  }

  /**
   * Setup bundle size monitoring
   */
  private setupBundleSizeMonitoring(): void {
    if (typeof window === 'undefined') {
      return;
    }

    // Calculate bundle size from loaded resources
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    let totalSize = 0;
    let gzippedSize = 0;
    let chunkCount = 0;
    let largestChunk = 0;

    resources.forEach(resource => {
      if (resource.name.includes('.js') || resource.name.includes('.css')) {
        const size = resource.transferSize || 0;
        totalSize += size;
        chunkCount++;
        largestChunk = Math.max(largestChunk, size);
        
        // Estimate gzipped size (roughly 30% of original)
        gzippedSize += size * 0.3;
      }
    });

    this.metrics.bundleSize = {
      totalSize,
      gzippedSize: Math.round(gzippedSize),
      chunkCount,
      largestChunk
    };
  }

  /**
   * Setup font monitoring
   */
  private setupFontMonitoring(): void {
    if (typeof window === 'undefined' || !('fonts' in document)) {
      return;
    }

    const startTime = performance.now();
    const fonts = Array.from(document.fonts);
    
    // Use Promise.allSettled to handle individual font load failures gracefully
    Promise.allSettled(fonts.map(font => {
      try {
        return font.load();
      } catch (error) {
        // Handle individual font load errors gracefully
        console.warn('Font load failed:', font.family, error);
        return Promise.resolve();
      }
    })).then(() => {
      const loadTime = performance.now() - startTime;
      const loadedFonts = fonts.filter(font => font.status === 'loaded');
      
      this.metrics.fontMetrics = {
        fontsLoaded: loadedFonts.length,
        totalFonts: fonts.length,
        loadTime,
        fallbackUsed: loadedFonts.length < fonts.length
      };
    }).catch(error => {
      // Handle any remaining errors gracefully
      console.warn('Font monitoring setup failed:', error);
      
      // Set fallback metrics
      this.metrics.fontMetrics = {
        fontsLoaded: 0,
        totalFonts: fonts.length,
        loadTime: 0,
        fallbackUsed: true
      };
    });
  }

  /**
   * Setup critical CSS monitoring
   */
  private setupCriticalCSSMonitoring(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const criticalStyle = document.querySelector('style[data-critical="true"]');
    const criticalSize = criticalStyle ? criticalStyle.textContent?.length || 0 : 0;
    
    const allStyles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'));
    const totalSize = allStyles.reduce((total, style) => {
      if (style.tagName === 'STYLE') {
        return total + (style.textContent?.length || 0);
      }
      return total;
    }, 0);

    this.metrics.criticalCSS = {
      size: criticalSize,
      totalSize,
      ratio: totalSize > 0 ? (criticalSize / totalSize) * 100 : 0
    };
  }

  /**
   * Get current performance metrics
   */
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get performance score (0-100)
   */
  public getPerformanceScore(): number {
    const scores = [];
    
    // LCP Score
    if (this.metrics.lcp !== null) {
      if (this.metrics.lcp < this.thresholds.lcp) {
        scores.push(100);
      } else if (this.metrics.lcp < this.thresholds.lcp * 1.6) {
        scores.push(50);
      } else {
        scores.push(0);
      }
    }

    // FID Score
    if (this.metrics.fid !== null) {
      if (this.metrics.fid < this.thresholds.fid) {
        scores.push(100);
      } else if (this.metrics.fid < this.thresholds.fid * 3) {
        scores.push(50);
      } else {
        scores.push(0);
      }
    }

    // CLS Score
    if (this.metrics.cls !== null) {
      if (this.metrics.cls < this.thresholds.cls) {
        scores.push(100);
      } else if (this.metrics.cls < this.thresholds.cls * 2.5) {
        scores.push(50);
      } else {
        scores.push(0);
      }
    }

    return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  }

  /**
   * Get performance recommendations
   */
  public getRecommendations(): string[] {
    const recommendations: string[] = [];
    const metrics = this.metrics;

    if (metrics.lcp && metrics.lcp > this.thresholds.lcp) {
      recommendations.push(`LCP is ${metrics.lcp.toFixed(0)}ms (target: <${this.thresholds.lcp}ms). Consider optimizing images and critical CSS.`);
    }

    if (metrics.fid && metrics.fid > this.thresholds.fid) {
      recommendations.push(`FID is ${metrics.fid.toFixed(0)}ms (target: <${this.thresholds.fid}ms). Consider reducing JavaScript execution time.`);
    }

    if (metrics.cls && metrics.cls > this.thresholds.cls) {
      recommendations.push(`CLS is ${metrics.cls.toFixed(3)} (target: <${this.thresholds.cls}). Consider fixing layout shifts.`);
    }

    if (metrics.bundleSize.totalSize > 2000000) { // 2MB
      recommendations.push(`Bundle size is ${(metrics.bundleSize.totalSize / 1024 / 1024).toFixed(1)}MB. Consider code splitting and tree shaking.`);
    }

    if (metrics.fontMetrics.fallbackUsed) {
      recommendations.push('Font fallbacks are being used. Consider preloading critical fonts.');
    }

    if (metrics.criticalCSS.ratio < 20) {
      recommendations.push('Critical CSS ratio is low. Consider inlining more critical styles.');
    }

    return recommendations;
  }

  /**
   * Generate performance report
   */
  public generateReport(): string {
    const metrics = this.metrics;
    const score = this.getPerformanceScore();
    const recommendations = this.getRecommendations();

    let report = `🚀 Performance Report\n`;
    report += `==================\n\n`;
    report += `Overall Score: ${score.toFixed(1)}/100\n\n`;
    
    report += `Core Web Vitals:\n`;
    report += `- LCP: ${metrics.lcp ? `${metrics.lcp.toFixed(0)}ms` : 'N/A'} (target: <${this.thresholds.lcp}ms)\n`;
    report += `- FID: ${metrics.fid ? `${metrics.fid.toFixed(0)}ms` : 'N/A'} (target: <${this.thresholds.fid}ms)\n`;
    report += `- CLS: ${metrics.cls ? metrics.cls.toFixed(3) : 'N/A'} (target: <${this.thresholds.cls})\n`;
    report += `- FCP: ${metrics.fcp ? `${metrics.fcp.toFixed(0)}ms` : 'N/A'} (target: <${this.thresholds.fcp}ms)\n\n`;
    
    report += `Bundle Metrics:\n`;
    report += `- Total Size: ${(metrics.bundleSize.totalSize / 1024 / 1024).toFixed(2)}MB\n`;
    report += `- Gzipped Size: ${(metrics.bundleSize.gzippedSize / 1024).toFixed(1)}KB\n`;
    report += `- Chunk Count: ${metrics.bundleSize.chunkCount}\n`;
    report += `- Largest Chunk: ${(metrics.bundleSize.largestChunk / 1024).toFixed(1)}KB\n\n`;
    
    report += `Font Metrics:\n`;
    report += `- Fonts Loaded: ${metrics.fontMetrics.fontsLoaded}/${metrics.fontMetrics.totalFonts}\n`;
    report += `- Load Time: ${metrics.fontMetrics.loadTime.toFixed(0)}ms\n`;
    report += `- Fallback Used: ${metrics.fontMetrics.fallbackUsed ? 'Yes' : 'No'}\n\n`;
    
    report += `Critical CSS:\n`;
    report += `- Size: ${(metrics.criticalCSS.size / 1024).toFixed(1)}KB\n`;
    report += `- Ratio: ${metrics.criticalCSS.ratio.toFixed(1)}%\n\n`;
    
    if (recommendations.length > 0) {
      report += `Recommendations:\n`;
      recommendations.forEach((rec, index) => {
        report += `${index + 1}. ${rec}\n`;
      });
    }

    return report;
  }

  /**
   * Start component timing (for compatibility with existing code)
   */
  public startComponentTiming(componentName: string): void {
    if (typeof window === 'undefined') {
      return;
    }
    
    // Simple performance mark for component timing
    performance.mark(`${componentName}-start`);
  }

  /**
   * End component timing (for compatibility with existing code)
   */
  public endComponentTiming(componentName: string): void {
    if (typeof window === 'undefined') {
      return;
    }
    
    // Simple performance mark for component timing
    performance.mark(`${componentName}-end`);
    
    // Measure the duration
    try {
      performance.measure(componentName, `${componentName}-start`, `${componentName}-end`);
    } catch (error) {
      // Ignore if marks don't exist
    }
  }

  /**
   * Get component timing (for compatibility with existing code)
   */
  public getComponentTiming(componentName: string): number | null {
    if (typeof window === 'undefined') {
      return null;
    }
    
    try {
      const measures = performance.getEntriesByName(componentName, 'measure');
      if (measures.length > 0) {
        return measures[measures.length - 1].duration;
      }
    } catch (error) {
      // Ignore if measures don't exist
    }
    
    return null;
  }

  /**
   * Clear component timing (for compatibility with existing code)
   */
  public clearComponentTiming(componentName: string): void {
    if (typeof window === 'undefined') {
      return;
    }
    
    try {
      performance.clearMarks(`${componentName}-start`);
      performance.clearMarks(`${componentName}-end`);
      performance.clearMeasures(componentName);
    } catch (error) {
      // Ignore if marks/measures don't exist
    }
  }

  /**
   * Cleanup observers
   */
  public cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.isInitialized = false;
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Auto-initialize in production
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  performanceMonitor.init();
}