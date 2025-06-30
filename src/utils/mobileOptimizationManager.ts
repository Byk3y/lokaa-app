/**
 * 🚀 Mobile Optimization Manager
 * 
 * Consolidates 14+ mobile utilities into a single, efficient system:
 * - mobilePerformanceTest.ts + mobileConnectionManager.ts + mobileSupabaseWorkaround.ts
 * - mobileSessionManager.ts + mobileLoadingTest.ts + mobileDataTracker.ts + others
 * 
 * Features:
 * - Intelligent feature detection
 * - Lazy loading of mobile-specific optimizations
 * - Unified debugging interface
 * - Memory-efficient event tracking
 */

interface MobileCapabilities {
  isMobile: boolean;
  isSafari: boolean;
  isLowEndDevice: boolean;
  connectionType: string;
  supportsServiceWorker: boolean;
  supportsWebP: boolean;
  deviceMemory: number;
  hardwareConcurrency: number;
}

interface MobileOptimizations {
  supabaseKeepAlive: boolean;
  connectionSerialization: boolean;
  aggressiveCaching: boolean;
  backgroundActivityPausing: boolean;
  imageLazyLoading: boolean;
  reducedAnimations: boolean;
}

interface MobileMetrics {
  loadTimes: number[];
  connectionFailures: number;
  backgroundTransitions: number;
  cacheHits: number;
  memoryPressureEvents: number;
}

class MobileOptimizationManager {
  private static instance: MobileOptimizationManager;
  private capabilities: MobileCapabilities;
  private optimizations: MobileOptimizations;
  private metrics: MobileMetrics;
  private isInitialized = false;
  private sessionId: string;
  private backgroundTimestamp = 0;
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private visibilityHandler: (() => void) | null = null;
  private focusHandler: (() => void) | null = null;

  private constructor() {
    this.sessionId = Date.now().toString(36) + Math.random().toString(36).substring(2);
    this.capabilities = this.detectCapabilities();
    this.optimizations = this.determineOptimizations();
    this.metrics = {
      loadTimes: [],
      connectionFailures: 0,
      backgroundTransitions: 0,
      cacheHits: 0,
      memoryPressureEvents: 0
    };
  }

  public static getInstance(): MobileOptimizationManager {
    if (!MobileOptimizationManager.instance) {
      MobileOptimizationManager.instance = new MobileOptimizationManager();
    }
    return MobileOptimizationManager.instance;
  }

  /**
   * Initialize mobile optimizations (lazy loading)
   */
  public initialize(): void {
    if (this.isInitialized || !this.capabilities.isMobile) return;

    console.log('📱 [MobileOptimizer] Initializing mobile optimizations...');
    console.log('📱 [MobileOptimizer] Capabilities:', this.capabilities);
    console.log('📱 [MobileOptimizer] Optimizations:', this.optimizations);

    // Setup background/foreground detection
    if (this.optimizations.backgroundActivityPausing) {
      this.setupBackgroundDetection();
    }

    // Setup Supabase keep-alive for Safari
    if (this.optimizations.supabaseKeepAlive) {
      this.setupSupabaseKeepAlive();
    }

    // Setup memory pressure monitoring
    this.setupMemoryPressureMonitoring();

    // Setup performance tracking
    this.setupPerformanceTracking();

    this.isInitialized = true;
    console.log('✅ [MobileOptimizer] Initialization complete');
  }

  /**
   * Detect device capabilities
   */
  private detectCapabilities(): MobileCapabilities {
    const userAgent = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) || 
                     window.innerWidth <= 768;
    const isSafari = /Safari|WebKit/i.test(userAgent) && !/Chrome|Chromium/i.test(userAgent);
    
    // Detect low-end device
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
      supportsServiceWorker: 'serviceWorker' in navigator,
      supportsWebP: this.detectWebPSupport(),
      deviceMemory,
      hardwareConcurrency
    };
  }

  /**
   * Determine which optimizations to enable
   */
  private determineOptimizations(): MobileOptimizations {
    const { isMobile, isSafari, isLowEndDevice, connectionType } = this.capabilities;

    return {
      supabaseKeepAlive: isMobile && isSafari,
      connectionSerialization: isMobile && (isLowEndDevice || ['slow-2g', '2g'].includes(connectionType)),
      aggressiveCaching: isMobile || isLowEndDevice,
      backgroundActivityPausing: isMobile,
      imageLazyLoading: isMobile || isLowEndDevice,
      reducedAnimations: isLowEndDevice
    };
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
   * Setup Supabase keep-alive for Safari
   */
  private setupSupabaseKeepAlive(): void {
    // Keep connection alive with lightweight requests every 90 seconds
    this.keepAliveInterval = setInterval(async () => {
      try {
        const { getSupabaseClient } = await import('@/integrations/supabase/client');
        await getSupabaseClient().from('posts').select('id', { count: 'exact', head: true }).limit(1);
        console.log('📱 [MobileOptimizer] Keep-alive successful');
      } catch (error) {
        console.warn('📱 [MobileOptimizer] Keep-alive failed:', error);
        this.metrics.connectionFailures++;
      }
    }, 90000);
  }

  /**
   * Setup memory pressure monitoring
   */
  private setupMemoryPressureMonitoring(): void {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        
        if (usagePercent > 80) {
          this.onMemoryPressure(usagePercent);
        }
      }, 30000);
    }
  }

  /**
   * Setup performance tracking
   */
  private setupPerformanceTracking(): void {
    // Track navigation performance
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
      console.warn('📱 [MobileOptimizer] Performance observer not supported:', error);
    }
  }

  /**
   * Event handlers
   */
  private onAppBackgrounded(): void {
    console.log('📱 [MobileOptimizer] App backgrounded');
    this.metrics.backgroundTransitions++;
    
    // Pause non-critical operations
    if (this.optimizations.backgroundActivityPausing) {
      this.pauseNonCriticalOperations();
    }
  }

  private onAppForegrounded(timeInBackground: number): void {
    console.log(`📱 [MobileOptimizer] App foregrounded after ${Math.round(timeInBackground / 1000)}s`);
    
    // Resume operations and check for stale data
    if (timeInBackground > 60000) { // 1 minute
      this.refreshStaleData();
    }
  }

  private onMemoryPressure(usagePercent: number): void {
    console.warn(`📱 [MobileOptimizer] Memory pressure: ${usagePercent.toFixed(1)}%`);
    this.metrics.memoryPressureEvents++;
    
    // Aggressive cache cleanup
    if (usagePercent > 90) {
      this.performEmergencyCleanup();
    }
  }

  /**
   * Optimization methods
   */
  private pauseNonCriticalOperations(): void {
    // Pause realtime subscriptions
    try {
      (window as any).pauseRealtimeSubscriptions?.();
    } catch (error) {
      console.warn('📱 [MobileOptimizer] Failed to pause realtime:', error);
    }
  }

  private refreshStaleData(): void {
    // Trigger data refresh for critical components
    try {
      (window as any).refreshStaleData?.();
    } catch (error) {
      console.warn('📱 [MobileOptimizer] Failed to refresh stale data:', error);
    }
  }

  private performEmergencyCleanup(): void {
    // Clear non-essential caches
    try {
      (window as any).performEmergencyCleanup?.();
      
      // Clear metrics to free memory
      this.metrics.loadTimes = this.metrics.loadTimes.slice(-10);
    } catch (error) {
      console.warn('📱 [MobileOptimizer] Emergency cleanup failed:', error);
    }
  }

  /**
   * Public API methods
   */
  public recordLoadTime(duration: number): void {
    this.metrics.loadTimes.push(duration);
    
    // Keep only recent load times
    if (this.metrics.loadTimes.length > 50) {
      this.metrics.loadTimes.shift();
    }

    if (duration > 5000) {
      console.warn(`📱 [MobileOptimizer] Slow load detected: ${duration.toFixed(0)}ms`);
    }
  }

  public recordCacheHit(): void {
    this.metrics.cacheHits++;
  }

  public shouldUseOptimization(optimization: keyof MobileOptimizations): boolean {
    return this.optimizations[optimization];
  }

  public getCapabilities(): MobileCapabilities {
    return { ...this.capabilities };
  }

  public getMetrics(): MobileMetrics & { sessionId: string } {
    return {
      ...this.metrics,
      sessionId: this.sessionId
    };
  }

  public getOptimizationSummary(): Record<string, any> {
    const avgLoadTime = this.metrics.loadTimes.length > 0 
      ? this.metrics.loadTimes.reduce((a, b) => a + b, 0) / this.metrics.loadTimes.length 
      : 0;

    return {
      capabilities: this.capabilities,
      optimizations: this.optimizations,
      performance: {
        avgLoadTime: Math.round(avgLoadTime),
        loadSamples: this.metrics.loadTimes.length,
        connectionFailures: this.metrics.connectionFailures,
        backgroundTransitions: this.metrics.backgroundTransitions,
        cacheHits: this.metrics.cacheHits,
        memoryPressureEvents: this.metrics.memoryPressureEvents
      },
      recommendations: this.generateRecommendations()
    };
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const { loadTimes, connectionFailures, memoryPressureEvents } = this.metrics;

    if (loadTimes.length > 0) {
      const avgLoadTime = loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length;
      if (avgLoadTime > 3000) {
        recommendations.push('Consider enabling more aggressive caching');
      }
    }

    if (connectionFailures > 5) {
      recommendations.push('High connection failure rate - check network stability');
    }

    if (memoryPressureEvents > 3) {
      recommendations.push('Frequent memory pressure - consider reducing cache size');
    }

    if (this.capabilities.isLowEndDevice && !this.optimizations.reducedAnimations) {
      recommendations.push('Enable reduced animations for low-end device');
    }

    return recommendations;
  }

  /**
   * Utility methods
   */
  private detectWebPSupport(): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').startsWith('data:image/webp');
  }

  /**
   * Cleanup
   */
  public cleanup(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }

    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }

    if (this.focusHandler) {
      window.removeEventListener('focus', this.focusHandler);
      this.focusHandler = null;
    }

    this.isInitialized = false;
  }

  /**
   * Testing utilities for development
   */
  public runMobileTest(): Record<string, any> {
    if (!import.meta.env.DEV) return { error: 'Testing only available in development' };

    console.log('📱 [MobileOptimizer] Running mobile optimization test...');
    
    const testResults = {
      capabilities: this.capabilities,
      optimizations: this.optimizations,
      currentMetrics: this.metrics,
      testTimestamp: new Date().toISOString()
    };

    console.log('📱 [MobileOptimizer] Test results:', testResults);
    return testResults;
  }
}

// Export singleton instance
export const mobileOptimizationManager = MobileOptimizationManager.getInstance();

// Auto-initialize on mobile devices
if (typeof window !== 'undefined') {
  const manager = mobileOptimizationManager;
  
  if (manager.getCapabilities().isMobile) {
    // Delay initialization slightly to avoid blocking initial render
    setTimeout(() => manager.initialize(), 100);
  }

  // Expose to window for debugging
  if (import.meta.env.DEV) {
    (window as any).mobileOptimizationManager = manager;
    (window as any).getMobileOptimizationSummary = () => manager.getOptimizationSummary();
    (window as any).runMobileTest = () => manager.runMobileTest();
  }

  // Cleanup on unload
  window.addEventListener('beforeunload', () => manager.cleanup());
}

export default mobileOptimizationManager; 