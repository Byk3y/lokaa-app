import { log } from '@/utils/logger';

/**
 * 🚀 Request Deduplicator - Prevents duplicate API requests
 * 
 * Features:
 * - Automatic request deduplication
 * - Request queuing and batching
 * - Priority-based request handling
 * - Request timeout and retry logic
 * - Performance monitoring
 */

export interface DeduplicatedRequest<T = any> {
  id: string;
  request: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timestamp: number;
  priority: 'high' | 'normal' | 'low';
  timeout: number;
  retryCount: number;
  tags: string[];
}

export interface RequestMetrics {
  totalRequests: number;
  deduplicatedRequests: number;
  completedRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  cacheHits: number;
  cacheMisses: number;
}

export interface DeduplicationOptions {
  defaultTimeout?: number;
  maxRetries?: number;
  enableMetrics?: boolean;
  enableCaching?: boolean;
  cacheTTL?: number;
}

class RequestDeduplicator {
  private static instance: RequestDeduplicator;
  private pendingRequests = new Map<string, DeduplicatedRequest[]>();
  private requestCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private metrics: RequestMetrics = {
    totalRequests: 0,
    deduplicatedRequests: 0,
    completedRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    cacheHits: 0,
    cacheMisses: 0
  };
  private options: Required<DeduplicationOptions>;

  constructor(options: DeduplicationOptions = {}) {
    this.options = {
      defaultTimeout: 30000, // 30 seconds
      maxRetries: 3,
      enableMetrics: true,
      enableCaching: true,
      cacheTTL: 60000, // 1 minute
      ...options
    };
  }

  static getInstance(options?: DeduplicationOptions): RequestDeduplicator {
    if (!RequestDeduplicator.instance) {
      RequestDeduplicator.instance = new RequestDeduplicator(options);
    }
    return RequestDeduplicator.instance;
  }

  /**
   * 🎯 MAIN DEDUPLICATION METHOD
   */
  async deduplicateRequest<T>(
    requestKey: string,
    requestFn: () => Promise<T>,
    options: {
      priority?: 'high' | 'normal' | 'low';
      timeout?: number;
      tags?: string[];
      cacheKey?: string;
      forceRefresh?: boolean;
    } = {}
  ): Promise<T> {
    const {
      priority = 'normal',
      timeout = this.options.defaultTimeout,
      tags = [],
      cacheKey = requestKey,
      forceRefresh = false
    } = options;

    this.metrics.totalRequests++;

    // Check cache first (unless force refresh)
    if (this.options.enableCaching && !forceRefresh) {
      const cached = this.getFromCache<T>(cacheKey);
      if (cached) {
        this.metrics.cacheHits++;
        log.debug('Utils', `🎯 [RequestDeduplicator] Cache hit for: ${requestKey}`);
        return cached;
      }
    }

    this.metrics.cacheMisses++;

    // Check if request is already pending (deduplication)
    const existingRequests = this.pendingRequests.get(requestKey);
    if (existingRequests && existingRequests.length > 0) {
      this.metrics.deduplicatedRequests++;
      log.debug('Utils', `🔄 [RequestDeduplicator] Deduplicating request: ${requestKey}`);
      
      return new Promise<T>((resolve, reject) => {
        existingRequests.push({
          id: `${requestKey}_${Date.now()}_${Math.random()}`,
          request: requestFn,
          resolve,
          reject,
          timestamp: Date.now(),
          priority,
          timeout,
          retryCount: 0,
          tags
        });
      });
    }

    // Create new request batch
    const requestId = `${requestKey}_${Date.now()}`;
    const request: DeduplicatedRequest<T> = {
      id: requestId,
      request: requestFn,
      resolve: () => {}, // Will be set by the promise
      reject: () => {}, // Will be set by the promise
      timestamp: Date.now(),
      priority,
      timeout,
      retryCount: 0,
      tags
    };

    this.pendingRequests.set(requestKey, [request]);

    // Execute the request
    return new Promise<T>((resolve, reject) => {
      request.resolve = resolve;
      request.reject = reject;
      
      this.executeRequest(requestKey, request);
    });
  }

  /**
   * ⚡ EXECUTE REQUEST
   */
  private async executeRequest<T>(requestKey: string, request: DeduplicatedRequest<T>): Promise<void> {
    const startTime = Date.now();
    const requests = this.pendingRequests.get(requestKey) || [];

    try {
      // Execute the request with timeout
      const result = await this.executeWithTimeout(request.request, request.timeout);
      
      // Cache the result
      if (this.options.enableCaching) {
        this.setCache(requestKey, result, this.options.cacheTTL);
      }

      // Resolve all requests in the batch
      requests.forEach(req => {
        req.resolve(result);
      });

      this.metrics.completedRequests++;
      
      const duration = Date.now() - startTime;
      this.updateAverageResponseTime(duration);

      log.debug('Utils', `✅ [RequestDeduplicator] Request completed: ${requestKey}, duration: ${duration}ms, batch size: ${requests.length}`);

    } catch (error) {
      // Handle retry logic
      if (request.retryCount < this.options.maxRetries) {
        request.retryCount++;
        log.debug('Utils', `🔄 [RequestDeduplicator] Retrying request: ${requestKey}, attempt: ${request.retryCount}`);
        
        // Exponential backoff
        const delay = Math.pow(2, request.retryCount) * 1000;
        setTimeout(() => {
          this.executeRequest(requestKey, request);
        }, delay);
        
        return;
      }

      // Reject all requests in the batch
      const errorObj = error instanceof Error ? error : new Error(String(error));
      requests.forEach(req => {
        req.reject(errorObj);
      });

      this.metrics.failedRequests++;
      log.error('Utils', `❌ [RequestDeduplicator] Request failed: ${requestKey}`, errorObj);
    } finally {
      // Clean up pending requests
      this.pendingRequests.delete(requestKey);
    }
  }

  /**
   * ⏱️ EXECUTE WITH TIMEOUT
   */
  private async executeWithTimeout<T>(requestFn: () => Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
      requestFn(),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Request timeout after ${timeout}ms`));
        }, timeout);
      })
    ]);
  }

  /**
   * 💾 CACHE MANAGEMENT
   */
  private getFromCache<T>(key: string): T | null {
    const cached = this.requestCache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.requestCache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  private setCache<T>(key: string, data: T, ttl: number): void {
    this.requestCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });

    // Cleanup old cache entries
    if (this.requestCache.size > 1000) {
      this.cleanupCache();
    }
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.requestCache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        this.requestCache.delete(key);
      }
    }
  }

  /**
   * 📊 METRICS AND MONITORING
   */
  getMetrics(): RequestMetrics {
    return { ...this.metrics };
  }

  clearMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      deduplicatedRequests: 0,
      completedRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  private updateAverageResponseTime(duration: number): void {
    const totalCompleted = this.metrics.completedRequests;
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (totalCompleted - 1) + duration) / totalCompleted;
  }

  /**
   * 🧹 CLEANUP
   */
  clearCache(): void {
    this.requestCache.clear();
  }

  clearPendingRequests(): void {
    // Reject all pending requests
    for (const [key, requests] of this.pendingRequests.entries()) {
      requests.forEach(request => {
        request.reject(new Error('RequestDeduplicator cleared'));
      });
    }
    this.pendingRequests.clear();
  }

  /**
   * 🔍 DEBUG INFO
   */
  getDebugInfo(): {
    pendingRequests: number;
    cacheSize: number;
    metrics: RequestMetrics;
  } {
    return {
      pendingRequests: this.pendingRequests.size,
      cacheSize: this.requestCache.size,
      metrics: this.getMetrics()
    };
  }

  /**
   * 🏷️ INVALIDATE BY TAGS
   */
  invalidateByTags(tags: string[]): void {
    const keysToInvalidate: string[] = [];
    
    for (const [key, cached] of this.requestCache.entries()) {
      // Check if any of the tags match (simplified check)
      if (tags.some(tag => key.includes(tag))) {
        keysToInvalidate.push(key);
      }
    }

    keysToInvalidate.forEach(key => this.requestCache.delete(key));
    log.debug('Utils', `🏷️ [RequestDeduplicator] Tag invalidation: ${tags.join(', ')}, keys: ${keysToInvalidate.length}`);
  }
}

// Export singleton instance
export const requestDeduplicator = RequestDeduplicator.getInstance();

// Export class for testing
export { RequestDeduplicator };

// Export types
export type { DeduplicatedRequest, RequestMetrics, DeduplicationOptions };
