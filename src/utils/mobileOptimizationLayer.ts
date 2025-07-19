import { log } from '@/utils/logger';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { devLogger } from './developmentLogger';

/**
 * 🚀 Mobile Optimization Layer (Phase 6)
 * 
 * Consolidates 14+ mobile utilities into a single, efficient system:
 * - Intelligent device detection
 * - Unified optimization strategies
 * - Memory-efficient tracking
 * - Lazy loading of mobile-specific features
 */

interface MobileCapabilities {
  isMobile: boolean;
  isSafari: boolean;
  isLowEndDevice: boolean;
  connectionType: string;
  deviceMemory: number;
  hardwareConcurrency: number;
}

interface OptimizationStrategy {
  enableSupabaseKeepAlive: boolean;
  enableConnectionSerialization: boolean;
  enableAggressiveCaching: boolean;
  enableBackgroundPausing: boolean;
  enableReducedAnimations: boolean;
}

interface MobileMetrics {
  loadTimes: number[];
  backgroundTransitions: number;
  connectionFailures: number;
  memoryPressureEvents: number;
  optimizationsApplied: string[];
}

class MobileOptimizationLayer {
  private static instance: MobileOptimizationLayer;
  private capabilities: MobileCapabilities;
  private strategy: OptimizationStrategy;
  private metrics: MobileMetrics;
  private isInitialized = false;
  private backgroundTimestamp = 0;
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private visibilityHandler: (() => void) | null = null;
  private focusHandler: (() => void) | null = null;

  private constructor() {
    this.capabilities = this.detectCapabilities();
    this.strategy = this.determineStrategy();
    this.metrics = {
      loadTimes: [],
      backgroundTransitions: 0,
      connectionFailures: 0,
      memoryPressureEvents: 0,
      optimizationsApplied: []
    };
  }

  public static getInstance(): MobileOptimizationLayer {
    if (!MobileOptimizationLayer.instance) {
      MobileOptimizationLayer.instance = new MobileOptimizationLayer();
    }
    return MobileOptimizationLayer.instance;
  }

  /**
   * Lazy initialization for mobile optimizations
   */
  public initialize(): void {
    if (this.isInitialized || !this.capabilities.isMobile) return;

    log.debug('Utils', '📱 [MobileOptimizer] Initializing optimizations...');
    log.debug('Utils', '📱 [MobileOptimizer] Capabilities:', this.capabilities);
    log.debug('Utils', '📱 [MobileOptimizer] Strategy:', this.strategy);

    this.applyOptimizations();
    this.setupMonitoring();
    
    this.isInitialized = true;
    log.debug('Utils', '✅ [MobileOptimizer] Initialization complete');
  }

  /**
   * Detect device capabilities
   */
  private detectCapabilities(): MobileCapabilities {
    const userAgent = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) || 
                     window.innerWidth <= 768;
    const isSafari = /Safari|WebKit/i.test(userAgent) && !/Chrome|Chromium/i.test(userAgent);
    
    // Device performance indicators
    const connection = (navigator as any).connection;
    const deviceMemory = (navigator as any).deviceMemory || 4;
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;
    const isLowEndDevice = deviceMemory < 4 || hardwareConcurrency < 4 || 
                          connection?.effectiveType === 'slow-2g' || 
                          connection?.effectiveType === '2g';

    return {
      isMobile,
      isSafari,
      isLowEndDevice,
      connectionType: connection?.effectiveType || 'unknown',
      deviceMemory,
      hardwareConcurrency
    };
  }

  /**
   * Determine optimization strategy based on capabilities
   */
  private determineStrategy(): OptimizationStrategy {
    const { isMobile, isSafari, isLowEndDevice, connectionType } = this.capabilities;

    return {
      enableSupabaseKeepAlive: isMobile && isSafari,
      enableConnectionSerialization: isMobile && (isLowEndDevice || ['slow-2g', '2g'].includes(connectionType)),
      enableAggressiveCaching: isMobile || isLowEndDevice,
      enableBackgroundPausing: isMobile,
      enableReducedAnimations: isLowEndDevice
    };
  }

  /**
   * Apply mobile optimizations
   */
  private applyOptimizations(): void {
    const { strategy } = this;

    // Supabase keep-alive for Safari
    if (strategy.enableSupabaseKeepAlive) {
      this.setupSupabaseKeepAlive();
      this.metrics.optimizationsApplied.push('supabase-keepalive');
    }

    // Background activity pausing
    if (strategy.enableBackgroundPausing) {
      this.setupBackgroundDetection();
      this.metrics.optimizationsApplied.push('background-pausing');
    }

    // Reduced animations for low-end devices
    if (strategy.enableReducedAnimations) {
      this.applyReducedAnimations();
      this.metrics.optimizationsApplied.push('reduced-animations');
    }

    log.debug('Utils', '📱 [MobileOptimizer] Applied optimizations:', this.metrics.optimizationsApplied);
  }

  /**
   * Setup Supabase keep-alive for Safari HTTP/3 issues
   */
  private setupSupabaseKeepAlive(): void {
    this.keepAliveInterval = setInterval(async () => {
      try {
        await getSupabaseClient().from('posts').select('id', { count: 'exact', head: true }).limit(1);
        
        if (import.meta.env.DEV) {
          log.debug('Utils', '📱 [MobileOptimizer] Keep-alive successful');
        }
      } catch (error) {
        this.metrics.connectionFailures++;
        if (import.meta.env.DEV) {
          log.warn('Utils', '📱 [MobileOptimizer] Keep-alive failed:', error);
        }
      }
    }, 90000); // 90 seconds - safely under Safari's timeout
  }

  /**
   * Setup background/foreground detection
   */
  private setupBackgroundDetection(): void {
    const handleVisibilityChange = () => {
      const now = Date.now();
      
      if (document.hidden) {
        this.backgroundTimestamp = now;
        this.onAppBackgrounded();
      } else {
        const timeInBackground = now - this.backgroundTimestamp;
        this.onAppForegrounded(timeInBackground);
      }
    };

    const handleFocus = () => this.onAppForegrounded(0);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Store handlers for cleanup
    this.visibilityHandler = handleVisibilityChange;
    this.focusHandler = handleFocus;
  }

  /**
   * Apply reduced animations for low-end devices
   */
  private applyReducedAnimations(): void {
    // Add CSS class for reduced animations
    document.documentElement.classList.add('reduce-animations');
    
    // Inject CSS for reduced animations
    const style = document.createElement('style');
    style.textContent = `
      .reduce-animations *,
      .reduce-animations *::before,
      .reduce-animations *::after {
        animation-duration: 0.1s !important;
        animation-delay: 0s !important;
        transition-duration: 0.1s !important;
        transition-delay: 0s !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Setup performance monitoring
   */
  private setupMonitoring(): void {
    // Memory pressure monitoring
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        
        if (usagePercent > 80) {
          this.onMemoryPressure(usagePercent);
        }
      }, 30000);
    }

    // Load time tracking
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming;
          const loadTime = navEntry.loadEventEnd - navEntry.loadEventStart;
          this.recordLoadTime(loadTime);
        }
      });
    });

    try {
      observer.observe({ entryTypes: ['navigation'] });
    } catch (error) {
      log.warn('Utils', '📱 [MobileOptimizer] Performance observer not supported:', error);
    }
  }

  /**
   * Event handlers
   */
  private onAppBackgrounded(): void {
    this.metrics.backgroundTransitions++;
    
    if (import.meta.env.DEV) {
      log.debug('Utils', '📱 [MobileOptimizer] App backgrounded');
    }
    
    // Pause non-critical operations
    this.pauseNonCriticalOperations();
  }

  private onAppForegrounded(timeInBackground: number): void {
    if (import.meta.env.DEV) {
      log.debug('Utils', `📱 [MobileOptimizer] App foregrounded after ${Math.round(timeInBackground / 1000)}s`);
    }
    
    // Resume operations and refresh stale data if needed
    if (timeInBackground > 60000) { // 1 minute
      this.refreshStaleData();
    }
  }

  private onMemoryPressure(usagePercent: number): void {
    this.metrics.memoryPressureEvents++;
    
    if (import.meta.env.DEV) {
      log.warn('Utils', `📱 [MobileOptimizer] Memory pressure: ${usagePercent.toFixed(1)}%`);
    }
    
    // Perform emergency cleanup
    if (usagePercent > 90) {
      this.performEmergencyCleanup();
    }
  }

  /**
   * Optimization actions
   */
  private pauseNonCriticalOperations(): void {
    // Signal to pause realtime subscriptions
    if (typeof window !== 'undefined') {
      (window as any).mobileBackgroundState = true;
    }
  }

  private refreshStaleData(): void {
    // Signal to refresh stale data
    if (typeof window !== 'undefined') {
      (window as any).mobileBackgroundState = false;
      (window as any).triggerStaleDataRefresh?.();
    }
  }

  private performEmergencyCleanup(): void {
    // Clear non-essential data
    this.metrics.loadTimes = this.metrics.loadTimes.slice(-10);
    
    // Signal emergency cleanup to other systems
    if (typeof window !== 'undefined') {
      (window as any).triggerEmergencyCleanup?.();
    }
  }

  /**
   * Public API
   */
  public recordLoadTime(duration: number): void {
    this.metrics.loadTimes.push(duration);
    
    // Keep only recent load times
    if (this.metrics.loadTimes.length > 50) {
      this.metrics.loadTimes.shift();
    }

    if (import.meta.env.DEV && duration > 5000) {
      log.warn('Utils', `📱 [MobileOptimizer] Slow load: ${duration.toFixed(0)}ms`);
    }
  }

  public shouldUseOptimization(optimization: keyof OptimizationStrategy): boolean {
    return this.strategy[optimization];
  }

  public getCapabilities(): MobileCapabilities {
    return { ...this.capabilities };
  }

  public getOptimizationSummary(): Record<string, any> {
    const avgLoadTime = this.metrics.loadTimes.length > 0 
      ? this.metrics.loadTimes.reduce((a, b) => a + b, 0) / this.metrics.loadTimes.length 
      : 0;

    return {
      capabilities: this.capabilities,
      strategy: this.strategy,
      performance: {
        avgLoadTime: Math.round(avgLoadTime),
        loadSamples: this.metrics.loadTimes.length,
        backgroundTransitions: this.metrics.backgroundTransitions,
        connectionFailures: this.metrics.connectionFailures,
        memoryPressureEvents: this.metrics.memoryPressureEvents
      },
      optimizationsApplied: this.metrics.optimizationsApplied,
      isInitialized: this.isInitialized
    };
  }

  /**
   * Cleanup
   */
  public cleanup(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }

    // Remove event listeners
    if (typeof document !== 'undefined' && this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }

    if (typeof window !== 'undefined' && this.focusHandler) {
      window.removeEventListener('focus', this.focusHandler);
      this.focusHandler = null;
    }

    this.isInitialized = false;
    log.debug('Utils', '🧹 [MobileOptimizer] Cleaned up');
  }
}

// Export singleton instance
export const mobileOptimizationLayer = MobileOptimizationLayer.getInstance();

// Auto-initialize on mobile devices
if (typeof window !== 'undefined') {
  const layer = mobileOptimizationLayer;
  
  if (layer.getCapabilities().isMobile) {
    // Delay initialization slightly to avoid blocking initial render
    setTimeout(() => layer.initialize(), 100);
  }

  // Expose for debugging
  if (import.meta.env.DEV) {
    (window as any).mobileOptimizationLayer = layer;
    (window as any).getMobileOptimizationSummary = () => layer.getOptimizationSummary();
    devLogger.startup('MobileOptimization', 'Mobile Optimization Layer loaded');
    (window as any).phase6MobileConsolidated = true;
  }

  // Cleanup on unload
  window.addEventListener('beforeunload', () => layer.cleanup());
}

export default mobileOptimizationLayer; 