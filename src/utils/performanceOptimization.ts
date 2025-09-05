import { log } from '@/utils/logger';
/**
 * Performance Optimization Utilities
 * 
 * Collection of utilities to help reduce long tasks and improve React performance
 */

import React from 'react';

/**
 * Break up long synchronous operations into smaller chunks
 */
export const scheduleWork = (callback: () => void, priority: 'low' | 'normal' | 'high' = 'normal') => {
  const delay = priority === 'high' ? 0 : priority === 'normal' ? 1 : 5;
  
  setTimeout(callback, delay);
};

/**
 * Process large arrays in chunks to prevent long tasks
 */
export const processInChunks = async <T, R>(
  items: T[], 
  processor: (item: T, index: number) => R,
  chunkSize = 100
): Promise<R[]> => {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const chunkResults = chunk.map((item, index) => processor(item, i + index));
    results.push(...chunkResults);
    
    // Yield control back to the browser after each chunk
    if (i + chunkSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  
  return results;
};

/**
 * Debounce function to prevent excessive function calls
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T, 
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttle function to limit function execution frequency
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T, 
  limit: number
): ((...args: Parameters<T>) => void) => {
  let lastFunc: NodeJS.Timeout;
  let lastRan: number;
  
  return (...args: Parameters<T>) => {
    if (!lastRan) {
      func(...args);
      lastRan = Date.now();
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(() => {
        if (Date.now() - lastRan >= limit) {
          func(...args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
};

/**
 * React-specific performance helpers
 */
export const ReactPerformanceHelpers = {
  /**
   * Create a memoized component factory to reduce re-renders
   */
  createMemoizedComponent: <P extends object>(
    Component: React.ComponentType<P>,
    areEqual?: (prevProps: P, nextProps: P) => boolean
  ) => {
    return React.memo(Component, areEqual);
  },

  /**
   * Optimized dependency array for useEffect/useMemo that ignores functions
   */
  createStableDeps: (deps: any[]): any[] => {
    return deps.filter(dep => typeof dep !== 'function');
  },

  /**
   * Component timing wrapper for performance monitoring
   */
  withPerformanceMonitoring: <P extends object>(
    Component: React.ComponentType<P>,
    componentName: string
  ) => {
    return (props: P) => {
      const renderStartTime = performance.now();
      
      React.useEffect(() => {
        const renderEndTime = performance.now();
        const renderDuration = renderEndTime - renderStartTime;
        
        if (renderDuration > 16) { // More than one frame (16ms at 60fps)
          log.warn('Utils', `[Performance] Slow render: ${componentName} took ${renderDuration.toFixed(2)}ms`);
        }
      });
      
      return React.createElement(Component, props);
    };
  }
};

/**
 * Image lazy loading optimization
 */
export const optimizeImages = {
  /**
   * Create an optimized image loader that prevents layout shift
   */
  createLazyImageLoader: (src: string, placeholder?: string) => {
    const [loaded, setLoaded] = React.useState(false);
    const [error, setError] = React.useState(false);
    
    React.useEffect(() => {
      const img = new Image();
      img.onload = () => setLoaded(true);
      img.onerror = () => setError(true);
      img.src = src;
    }, [src]);
    
    return { loaded, error, src: loaded ? src : placeholder };
  }
};

/**
 * Bundle size optimization helpers
 */
export const BundleOptimization = {
  /**
   * Dynamic import wrapper with error handling
   */
  lazyImport: (importFunc: () => Promise<{ default: React.ComponentType<any> }>) => {
    return React.lazy(() => 
      importFunc().catch(err => {
        log.error('Utils', 'Lazy import failed:', err);
        // Return a fallback component
        return { 
          default: () => React.createElement('div', { className: 'error-fallback' }, 'Failed to load component') 
        };
      })
    );
  },

  /**
   * Preload critical resources
   */
  preloadCriticalResources: (resources: string[]) => {
    resources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource;
      link.as = resource.endsWith('.css') ? 'style' : 'script';
      document.head.appendChild(link);
    });
  }
};

/**
 * React Concurrent Features for Performance
 */
export const ConcurrentHelpers = {
  /**
   * Use React 18's startTransition to mark non-urgent updates
   */
  deferNonUrgentUpdate: (callback: () => void) => {
    if ('startTransition' in React) {
      (React as any).startTransition(callback);
    } else {
      // Fallback for React < 18
      setTimeout(callback, 0);
    }
  },

  /**
   * Break up large list rendering into smaller chunks
   */
  useChunkedList: <T>(items: T[], chunkSize = 50) => {
    const [visibleItems, setVisibleItems] = React.useState<T[]>([]);
    const [currentIndex, setCurrentIndex] = React.useState(0);

    React.useEffect(() => {
      if (items.length === 0) {
        setVisibleItems([]);
        setCurrentIndex(0);
        return;
      }

      // Reset if items changed
      setCurrentIndex(0);
      setVisibleItems(items.slice(0, chunkSize));

      // Load remaining items progressively
      const loadMore = () => {
        const nextIndex = currentIndex + chunkSize;
        if (nextIndex < items.length) {
          setCurrentIndex(nextIndex);
          setVisibleItems(prev => [...prev, ...items.slice(nextIndex, nextIndex + chunkSize)]);
          
          // Schedule next chunk
          setTimeout(loadMore, 0);
        }
      };

      if (items.length > chunkSize) {
        setTimeout(loadMore, 0);
      }
    }, [items, chunkSize]);

    return visibleItems;
  },

  /**
   * Virtualized rendering for large lists
   */
  useVirtualizedList: <T>(
    items: T[], 
    containerHeight: number, 
    itemHeight: number
  ) => {
    const [scrollTop, setScrollTop] = React.useState(0);
    
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 2,
      items.length
    );
    
    const visibleItems = items.slice(startIndex, endIndex);
    const offsetY = startIndex * itemHeight;
    
    return {
      visibleItems,
      startIndex,
      offsetY,
      totalHeight: items.length * itemHeight,
      onScroll: (e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
      }
    };
  }
};

/**
 * App Performance Monitoring and Optimization
 */
export const AppPerformanceMonitor = {
  /**
   * Monitor and optimize component mount times
   */
  monitorComponentMount: (componentName: string) => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const mountTime = endTime - startTime;
      
      if (mountTime > 100) { // More than 100ms
        log.warn('Utils', `[Performance] Slow component mount: ${componentName} took ${mountTime.toFixed(2)}ms`);
      } else if (mountTime > 16) {
        log.debug('Utils', `[Performance] Component mount: ${componentName} took ${mountTime.toFixed(2)}ms`);
      }
      
      return mountTime;
    };
  },

  /**
   * Optimize resource loading priorities
   */
  optimizeResourceLoading: () => {
    // Set loading priorities for critical resources
    const criticalResources = [
      '/src/main.tsx',
      '/src/App.tsx',
      '/src/index.css'
    ];
    
    criticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource;
      link.as = resource.endsWith('.css') ? 'style' : 'script';
      link.setAttribute('importance', 'high');
      document.head.appendChild(link);
    });
  },

  /**
   * Monitor and report overall app performance
   */
  generatePerformanceReport: () => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');
    
    const report = {
      // Page load metrics
      domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart,
      pageLoad: navigation?.loadEventEnd - navigation?.loadEventStart,
      
      // Paint metrics
      firstPaint: paint.find(p => p.name === 'first-paint')?.startTime,
      firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime,
      
      // Memory usage (if available)
      memoryUsage: (performance as any).memory ? {
        used: Math.round((performance as any).memory.usedJSHeapSize / 1048576), // MB
        total: Math.round((performance as any).memory.totalJSHeapSize / 1048576), // MB
        limit: Math.round((performance as any).memory.jsHeapSizeLimit / 1048576), // MB
      } : null,
      
      // Network timing
      networkLatency: navigation?.responseEnd - navigation?.requestStart,
      
      timestamp: Date.now()
    };
    
    log.debug('Utils', '📊 [Performance Report]', report);
    return report;
  }
}; 