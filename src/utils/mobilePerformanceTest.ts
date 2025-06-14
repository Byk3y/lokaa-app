/**
 * Mobile Performance Testing Utility
 * Tracks data loading times and mobile-specific performance metrics
 */

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

interface DataSourceMetric {
  timestamp: number;
  type: 'access' | 'update' | 'clear';
  source: 'storeSpace' | 'spaceData' | 'currentSpaceData';
  component: string;
  hasData: boolean;
  spaceId?: string | null;
}

class MobilePerformanceTracker {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private dataMetrics: DataSourceMetric[] = [];
  private isEnabled: boolean;
  private instanceId: string;

  constructor() {
    this.isEnabled = process.env.NODE_ENV === 'development' || 
                     localStorage.getItem('mobile_perf_debug') === 'true';
    this.instanceId = Math.random().toString(36).substring(2, 8);
    
    // Clear data metrics every 5 minutes to prevent memory leaks
    setInterval(() => {
      if (this.dataMetrics.length > 100) {
        this.dataMetrics = this.dataMetrics.slice(-50);
      }
    }, 5 * 60 * 1000);
  }

  startTracking(name: string, metadata?: Record<string, any>) {
    if (!this.isEnabled) return;
    
    this.metrics.set(name, {
      name,
      startTime: performance.now(),
      metadata
    });
    
    console.log(`📱 [Mobile Perf] Starting: ${name}`, metadata || '');
  }

  endTracking(name: string, additionalMetadata?: Record<string, any>) {
    if (!this.isEnabled) return;
    
    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`📱 [Mobile Perf] No metric found for: ${name}`);
      return;
    }
    
    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;
    
    if (additionalMetadata) {
      metric.metadata = {...(metric.metadata || {}), ...additionalMetadata};
    }
    
    console.log(`📱 [Mobile Perf] Completed: ${name} in ${metric.duration.toFixed(2)}ms`, metric.metadata || '');
  }
  
  trackDataSource(component: string, source: 'storeSpace' | 'spaceData' | 'currentSpaceData', type: 'access' | 'update' | 'clear', data: any) {
    if (!this.isEnabled) return;
    
    this.dataMetrics.push({
      timestamp: Date.now(),
      type,
      source,
      component,
      hasData: !!data,
      spaceId: data?.id || null
    });
    
    console.log(`📱 [Mobile Data] ${component} ${type} ${source}: ${data?.id || 'null'}`);
  }
  
  getDataSourceMetrics() {
    return [...this.dataMetrics];
  }
  
  logMobileNavigation(from: string, to: string, metadata?: Record<string, any>) {
    if (!this.isEnabled) return;
    console.log(`📱 [Mobile Nav] ${from} → ${to}`, metadata || '');
  }
  
  detectPageReload() {
    if (!this.isEnabled) return false;
    
    const lastInstanceId = sessionStorage.getItem('mobileTrackerInstanceId');
    sessionStorage.setItem('mobileTrackerInstanceId', this.instanceId);
    
    const isReload = !!lastInstanceId && lastInstanceId !== this.instanceId;
    if (isReload) {
      console.log(`📱 [Mobile Perf] Page reload detected`);
    }
    
    return isReload;
  }
  
  getMetricSummary() {
    if (!this.isEnabled || this.metrics.size === 0) return null;
    
    const summary = {
      totalMetrics: this.metrics.size,
      totalDataEvents: this.dataMetrics.length,
      avgDuration: 0,
      slowestOperation: '',
      slowestTime: 0,
      dataAccesses: 0,
      dataUpdates: 0,
      dataClears: 0,
    };
    
    let totalDuration = 0;
    let completedMetrics = 0;
    
    this.metrics.forEach(metric => {
      if (metric.duration) {
        totalDuration += metric.duration;
        completedMetrics++;
        
        if (metric.duration > summary.slowestTime) {
          summary.slowestTime = metric.duration;
          summary.slowestOperation = metric.name;
        }
      }
    });
    
    summary.avgDuration = completedMetrics > 0 ? totalDuration / completedMetrics : 0;
    
    this.dataMetrics.forEach(event => {
      if (event.type === 'access') summary.dataAccesses++;
      if (event.type === 'update') summary.dataUpdates++;
      if (event.type === 'clear') summary.dataClears++;
    });
    
    return summary;
  }
}

// Create singleton instance
export const mobilePerformance = new MobilePerformanceTracker();

// Expose to window for debugging
if (typeof window !== 'undefined') {
  (window as any).mobilePerformance = mobilePerformance;
}

export default mobilePerformance;

// Helper hooks for React components
export const useMobilePerformanceTracking = () => {
  return {
    trackSpaceLoad: (subdomain: string, source: 'cache' | 'network' | 'mixed') => {
      mobilePerf.trackSpaceDataLoad(subdomain, source);
    },
    endSpaceLoad: () => {
      mobilePerf.endTracking('space-data-load');
    },
    trackTabRender: (tab: string, hasInstantAccess: boolean) => {
      mobilePerf.trackTabRender(tab, hasInstantAccess);
    },
    endTabRender: () => {
      mobilePerf.endTracking('tab-render');
    }
  };
};

// Mobile-specific detection utilities
export const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const isMobileViewport = () => {
  return window.innerWidth <= 768;
};

export const getMobileConnectionType = (): string => {
  // @ts-ignore - navigator.connection is experimental
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  
  if (connection) {
    return connection.effectiveType || connection.type || 'unknown';
  }
  
  return 'unknown';
};

// Enable debug mode
if (typeof window !== 'undefined') {
  (window as any).enableMobilePerfDebug = () => {
    localStorage.setItem('mobile_perf_debug', 'true');
    console.log('📱 Mobile performance debugging enabled');
  };
  
  (window as any).disableMobilePerfDebug = () => {
    localStorage.removeItem('mobile_perf_debug');
    console.log('📱 Mobile performance debugging disabled');
  };
  
  (window as any).getMobilePerfSummary = () => {
    return mobilePerf.getSummary();
  };
} 