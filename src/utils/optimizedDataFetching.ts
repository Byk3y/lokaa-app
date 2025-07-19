import { log } from '@/utils/logger';
import { performanceMonitor } from './performanceMonitor';
import { persistentCache, cacheInstances } from './persistentCache';

interface RequestConfig {
  cache?: boolean;
  cacheTTL?: number;
  retries?: number;
  timeout?: number;
  priority?: 'low' | 'normal' | 'high';
  staleWhileRevalidate?: boolean;
  tags?: string[];
}

interface RequestMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  cacheHit: boolean;
  retryCount: number;
  size?: number;
  error?: string;
}

/**
 * 🚀 Phase 5B: Advanced Data Fetching Optimization System
 * 
 * Features:
 * - Intelligent caching with stale-while-revalidate
 * - Request deduplication and batching
 * - Performance monitoring and metrics
 * - Automatic retry with exponential backoff
 * - Network-aware optimization
 * - Priority-based request queuing
 */
class OptimizedDataFetcher {
  private requestQueue: Map<string, Promise<any>> = new Map();
  private batchQueue: Map<string, Array<{
    resolve: (value: any) => void;
    reject: (error: any) => void;
    config: RequestConfig;
  }>> = new Map();
  private metrics: Map<string, RequestMetrics> = new Map();
  private batchTimer: NodeJS.Timeout | null = null;
  
  // Network awareness
  private isOnline = navigator.onLine;
  private connectionType = 'unknown';
  private isSlowConnection = false;
  
  constructor() {
    this.setupNetworkMonitoring();
    // DISABLED: This global fetch override was interfering with Supabase authentication
    // this.setupPerformanceTracking();
  }
  
  /**
   * Main fetch method with comprehensive optimization
   */
  async fetch<T = any>(
    url: string, 
    options: RequestInit & RequestConfig = {}
  ): Promise<T> {
    const {
      cache = true,
      cacheTTL = 300000, // 5 minutes default
      retries = 3,
      timeout = 10000,
      priority = 'normal',
      staleWhileRevalidate = true,
      tags = [],
      ...fetchOptions
    } = options;
    
    const requestKey = this.generateRequestKey(url, fetchOptions);
    const startTime = performance.now();
    
    // Initialize metrics
    this.metrics.set(requestKey, {
      startTime,
      cacheHit: false,
      retryCount: 0
    });
    
    try {
      // Check for cache first
      if (cache) {
        const cached = await this.getCachedResponse<T>(requestKey);
        if (cached) {
          this.updateMetrics(requestKey, { cacheHit: true });
          
          // Stale-while-revalidate: return cached data immediately
          // and update in background if stale
          if (staleWhileRevalidate) {
            this.revalidateInBackground(url, fetchOptions, requestKey, cacheTTL, tags);
          }
          
          return cached;
        }
      }
      
      // Request deduplication
      if (this.requestQueue.has(requestKey)) {
        log.debug('Utils', `[OptimizedFetcher] Deduplicating request: ${url}`);
        return this.requestQueue.get(requestKey)!;
      }
      
      // Create the request promise
      const requestPromise = this.executeRequest<T>(
        url, 
        fetchOptions, 
        { retries, timeout, priority, cache, cacheTTL, tags }
      );
      
      this.requestQueue.set(requestKey, requestPromise);
      
      try {
        const result = await requestPromise;
        
        // Cache successful responses
        if (cache && result) {
          await this.cacheResponse(requestKey, result, cacheTTL, tags);
        }
        
        this.updateMetrics(requestKey, { 
          endTime: performance.now(),
          size: this.estimateResponseSize(result)
        });
        
        return result;
      } finally {
        this.requestQueue.delete(requestKey);
      }
      
    } catch (error) {
      this.updateMetrics(requestKey, { 
        endTime: performance.now(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      log.error('Utils', `[OptimizedFetcher] Request failed: ${url}`, error);
      throw error;
    }
  }
  
  /**
   * Batch multiple requests for efficiency
   */
  async batchFetch<T = any>(
    requests: Array<{ url: string; options?: RequestInit & RequestConfig }>,
    batchConfig: { delay?: number; maxBatchSize?: number } = {}
  ): Promise<T[]> {
    const { delay = 50, maxBatchSize = 10 } = batchConfig;
    
    // Split into batches if too large
    if (requests.length > maxBatchSize) {
      const batches: Array<Promise<T[]>> = [];
      
      for (let i = 0; i < requests.length; i += maxBatchSize) {
        const batch = requests.slice(i, i + maxBatchSize);
        batches.push(this.batchFetch(batch, batchConfig));
      }
      
      const results = await Promise.all(batches);
      return results.flat();
    }
    
    // Execute batch
    return Promise.all(
      requests.map(({ url, options = {} }) => this.fetch<T>(url, options))
    );
  }
  
  /**
   * Execute request with retry logic and timeout
   */
  private async executeRequest<T>(
    url: string,
    options: RequestInit,
    config: { retries: number; timeout: number; priority: string; cache: boolean; cacheTTL: number; tags: string[] }
  ): Promise<T> {
    const { retries, timeout, priority } = config;
    let lastError: Error;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Adjust request based on network conditions
        const optimizedOptions = this.optimizeForNetwork(options);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const response = await fetch(url, {
          ...optimizedOptions,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Track response performance
        const responseSize = parseInt(response.headers.get('content-length') || '0');
        if (responseSize > 100000) { // 100KB+
          log.warn('Utils', `[OptimizedFetcher] Large response: ${(responseSize / 1024).toFixed(1)}KB for ${url}`);
        }
        
        const data = await response.json();
        return data;
        
      } catch (error) {
        lastError = error as Error;
        
        this.updateMetrics(this.generateRequestKey(url, options), {
          retryCount: attempt + 1
        });
        
        if (attempt < retries) {
          // Exponential backoff with jitter
          const backoffTime = Math.min(1000 * Math.pow(2, attempt), 10000) + Math.random() * 1000;
          log.warn('Utils', `[OptimizedFetcher] Retry ${attempt + 1}/${retries} for ${url} in ${backoffTime.toFixed(0)}ms`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        }
      }
    }
    
    throw lastError!;
  }
  
  /**
   * Background revalidation for stale-while-revalidate
   */
  private async revalidateInBackground(
    url: string,
    options: RequestInit,
    requestKey: string,
    ttl: number,
    tags: string[]
  ): Promise<void> {
    try {
      log.debug('Utils', `[OptimizedFetcher] Background revalidation: ${url}`);
      
      const freshData = await this.executeRequest(url, options, {
        retries: 1, // Fewer retries for background requests
        timeout: 5000, // Shorter timeout
        priority: 'low',
        cache: false,
        cacheTTL: ttl,
        tags
      });
      
      // Update cache with fresh data
      await this.cacheResponse(requestKey, freshData, ttl, tags);
      
      log.debug('Utils', `[OptimizedFetcher] Background revalidation complete: ${url}`);
    } catch (error) {
      log.warn('Utils', `[OptimizedFetcher] Background revalidation failed: ${url}`, error);
    }
  }
  
  /**
   * Optimize request based on network conditions
   */
  private optimizeForNetwork(options: RequestInit): RequestInit {
    const optimized = { ...options };
    
    // Add compression headers
    optimized.headers = {
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'application/json',
      ...optimized.headers
    };
    
    return optimized;
  }
  
  /**
   * Setup network condition monitoring
   */
  private setupNetworkMonitoring(): void {
    // Online/offline detection
    window.addEventListener('online', () => {
      this.isOnline = true;
      log.debug('Utils', '[OptimizedFetcher] Network back online');
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      log.warn('Utils', '[OptimizedFetcher] Network offline');
    });
    
    // Connection type detection
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      const updateConnection = () => {
        this.connectionType = connection.effectiveType || 'unknown';
        this.isSlowConnection = ['slow-2g', '2g'].includes(this.connectionType);
        
        log.debug('Utils', `[OptimizedFetcher] Connection: ${this.connectionType}, slow: ${this.isSlowConnection}`);
      };
      
      connection.addEventListener('change', updateConnection);
      updateConnection();
    }
  }
  
  /**
   * Setup performance tracking integration
   * DISABLED: This global fetch override was interfering with Supabase authentication
   */
  private setupPerformanceTracking(): void {
    // DISABLED: Global fetch override was preventing Supabase JWT authentication
    /*
    // Track network requests in performance monitor
    const originalFetch = window.fetch;
    let requestCount = 0;
    
    window.fetch = async (...args) => {
      requestCount++;
      performanceMonitor.recordMetric('networkRequests', requestCount);
      
      const startTime = performance.now();
      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - startTime;
        
        if (duration > 2000) { // Log slow requests
          log.warn('Utils', `[OptimizedFetcher] Slow request: ${duration.toFixed(0)}ms for ${args[0]}`);
        }
        
        requestCount--;
        return response;
      } catch (error) {
        requestCount--;
        throw error;
      }
    };
    */
  }
  
  /**
   * Cache response using persistent cache
   */
  private async cacheResponse(
    key: string, 
    data: any, 
    ttl: number, 
    tags: string[]
  ): Promise<void> {
    try {
      await persistentCache.set(key, data, { ttl, tags, compress: true });
    } catch (error) {
      log.warn('Utils', '[OptimizedFetcher] Failed to cache response:', error);
    }
  }
  
  /**
   * Get cached response
   */
  private async getCachedResponse<T>(key: string): Promise<T | null> {
    try {
      return await persistentCache.get<T>(key);
    } catch (error) {
      log.warn('Utils', '[OptimizedFetcher] Failed to get cached response:', error);
      return null;
    }
  }
  
  /**
   * Generate unique request key for caching/deduplication
   */
  private generateRequestKey(url: string, options: RequestInit): string {
    const method = options.method || 'GET';
    const body = options.body ? JSON.stringify(options.body) : '';
    const headers = JSON.stringify(options.headers || {});
    
    return `${method}:${url}:${btoa(body + headers)}`;
  }
  
  /**
   * Update request metrics
   */
  private updateMetrics(key: string, updates: Partial<RequestMetrics>): void {
    const existing = this.metrics.get(key);
    if (existing) {
      const updated = { ...existing, ...updates };
      
      if (updated.startTime && updated.endTime) {
        updated.duration = updated.endTime - updated.startTime;
      }
      
      this.metrics.set(key, updated);
      
      // Record in performance monitor
      if (updated.duration) {
        performanceMonitor.recordMetric('networkRequests', updated.duration);
      }
    }
  }
  
  /**
   * Estimate response size for metrics
   */
  private estimateResponseSize(data: any): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      return 0;
    }
  }
  
  /**
   * Get performance metrics for debugging
   */
  getMetrics(): Map<string, RequestMetrics> {
    return new Map(this.metrics);
  }
  
  /**
   * Clear old metrics to prevent memory leaks
   */
  cleanup(): void {
    // Keep only recent metrics (last 100)
    if (this.metrics.size > 100) {
      const entries = Array.from(this.metrics.entries());
      const recent = entries.slice(-100);
      this.metrics.clear();
      recent.forEach(([key, value]) => this.metrics.set(key, value));
    }
  }
}

// Global instance
export const optimizedFetcher = new OptimizedDataFetcher();

// Convenience methods with pre-configured cache instances
export const fetchWithCache = {
  spaces: <T = any>(url: string, options: RequestInit & RequestConfig = {}) => 
    optimizedFetcher.fetch<T>(url, { ...options, tags: ['spaces'], cacheTTL: 300000 }),
    
  users: <T = any>(url: string, options: RequestInit & RequestConfig = {}) => 
    optimizedFetcher.fetch<T>(url, { ...options, tags: ['users'], cacheTTL: 180000 }),
    
  posts: <T = any>(url: string, options: RequestInit & RequestConfig = {}) => 
    optimizedFetcher.fetch<T>(url, { ...options, tags: ['posts'], cacheTTL: 120000 }),
    
  critical: <T = any>(url: string, options: RequestInit & RequestConfig = {}) => 
    optimizedFetcher.fetch<T>(url, { ...options, priority: 'high', cache: false }),
};

// Expose debugging tools
if (process.env.NODE_ENV === 'development') {
  (window as any).optimizedFetcher = optimizedFetcher;
  (window as any).fetchMetrics = () => {
    const metrics = optimizedFetcher.getMetrics();
    log.table('Utils',(Array.from(metrics.entries()));
    return metrics;
  };
  
  log.debug('Utils', '🔧 Data fetching debugging tools available:');
  log.debug('Utils', '- window.optimizedFetcher');
  log.debug('Utils', '- window.fetchMetrics()');
}

// Auto-cleanup every 5 minutes
setInterval(() => {
  optimizedFetcher.cleanup();
}, 300000); 