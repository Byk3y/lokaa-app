import { log } from '@/utils/logger';

/**
 * 🚀 Query Batcher - Prevents duplicate database requests and batches similar queries
 * 
 * Features:
 * - Request deduplication to prevent duplicate API calls
 * - Query batching for similar requests
 * - Intelligent caching with TTL
 * - Performance monitoring and metrics
 * - Error handling and retry logic
 */

export interface BatchedQuery<T = any> {
  id: string;
  query: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timestamp: number;
  retryCount: number;
  priority: 'high' | 'normal' | 'low';
}

export interface QueryBatchOptions {
  maxBatchSize?: number;
  batchTimeout?: number;
  maxRetries?: number;
  enableMetrics?: boolean;
  cacheTTL?: number;
}

export interface QueryMetrics {
  totalQueries: number;
  batchedQueries: number;
  deduplicatedQueries: number;
  cacheHits: number;
  cacheMisses: number;
  averageBatchSize: number;
  averageResponseTime: number;
}

class QueryBatcher {
  private static instance: QueryBatcher;
  private pendingQueries = new Map<string, BatchedQuery[]>();
  private queryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private metrics: QueryMetrics = {
    totalQueries: 0,
    batchedQueries: 0,
    deduplicatedQueries: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageBatchSize: 0,
    averageResponseTime: 0
  };
  private options: Required<QueryBatchOptions>;
  private batchTimeouts = new Map<string, NodeJS.Timeout>();

  constructor(options: QueryBatchOptions = {}) {
    this.options = {
      maxBatchSize: 10,
      batchTimeout: 100, // 100ms batching window
      maxRetries: 3,
      enableMetrics: true,
      cacheTTL: 30000, // 30 seconds default
      ...options
    };
  }

  static getInstance(options?: QueryBatchOptions): QueryBatcher {
    if (!QueryBatcher.instance) {
      QueryBatcher.instance = new QueryBatcher(options);
    }
    return QueryBatcher.instance;
  }

  /**
   * 🎯 MAIN BATCHING METHOD
   * Deduplicates and batches similar queries for optimal performance
   */
  async batchQuery<T>(
    queryKey: string,
    queryFn: () => Promise<T>,
    options: {
      priority?: 'high' | 'normal' | 'low';
      cacheKey?: string;
      ttl?: number;
      forceRefresh?: boolean;
    } = {}
  ): Promise<T> {
    const {
      priority = 'normal',
      cacheKey = queryKey,
      ttl = this.options.cacheTTL,
      forceRefresh = false
    } = options;

    this.metrics.totalQueries++;

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = this.getFromCache<T>(cacheKey);
      if (cached) {
        this.metrics.cacheHits++;
        // Cache hit
        return cached;
      }
    }

    this.metrics.cacheMisses++;

    // Check if query is already pending (deduplication)
    const existingBatch = this.pendingQueries.get(queryKey);
    if (existingBatch && existingBatch.length > 0) {
      this.metrics.deduplicatedQueries++;
      // Query deduplicated
      
      return new Promise<T>((resolve, reject) => {
        existingBatch.push({
          id: `${queryKey}_${Date.now()}_${Math.random()}`,
          query: queryFn,
          resolve,
          reject,
          timestamp: Date.now(),
          retryCount: 0,
          priority
        });
      });
    }

    // Create new batch
    const batchId = `${queryKey}_${Date.now()}`;
    const batch: BatchedQuery[] = [{
      id: batchId,
      query: queryFn,
      resolve: () => {}, // Will be set by the promise
      reject: () => {}, // Will be set by the promise
      timestamp: Date.now(),
      retryCount: 0,
      priority
    }];

    this.pendingQueries.set(queryKey, batch);

    // Set up batch timeout
    this.scheduleBatchExecution(queryKey);

    return new Promise<T>((resolve, reject) => {
      batch[0].resolve = resolve;
      batch[0].reject = reject;
    });
  }

  /**
   * 🕐 SCHEDULE BATCH EXECUTION
   * Executes batches after timeout or when batch is full
   */
  private scheduleBatchExecution(queryKey: string): void {
    const batch = this.pendingQueries.get(queryKey);
    if (!batch) return;

    // Clear existing timeout
    const existingTimeout = this.batchTimeouts.get(queryKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Execute immediately if batch is full
    if (batch.length >= this.options.maxBatchSize) {
      this.executeBatch(queryKey);
      return;
    }

    // Schedule execution after timeout
    const timeout = setTimeout(() => {
      this.executeBatch(queryKey);
    }, this.options.batchTimeout);

    this.batchTimeouts.set(queryKey, timeout);
  }

  /**
   * ⚡ EXECUTE BATCH
   * Executes all queries in a batch and resolves/rejects promises
   */
  private async executeBatch(queryKey: string): Promise<void> {
    const batch = this.pendingQueries.get(queryKey);
    if (!batch || batch.length === 0) return;

    // Clear timeout
    const timeout = this.batchTimeouts.get(queryKey);
    if (timeout) {
      clearTimeout(timeout);
      this.batchTimeouts.delete(queryKey);
    }

    // Remove from pending
    this.pendingQueries.delete(queryKey);

    this.metrics.batchedQueries += batch.length;
    this.metrics.averageBatchSize = 
      (this.metrics.averageBatchSize + batch.length) / 2;

    const startTime = Date.now();

    try {
      // Sort by priority (high first)
      batch.sort((a, b) => {
        const priorityOrder = { high: 3, normal: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      // Execute the first query (others are deduplicated)
      const primaryQuery = batch[0];
      const result = await this.executeWithRetry(primaryQuery);

      // Cache the result
      this.setCache(queryKey, result, this.options.cacheTTL);

      // Resolve all promises in the batch
      batch.forEach(query => {
        query.resolve(result);
      });

      const duration = Date.now() - startTime;
      this.metrics.averageResponseTime = 
        (this.metrics.averageResponseTime + duration) / 2;

      // Batch executed successfully

    } catch (error) {
      // Reject all promises in the batch
      const errorObj = error instanceof Error ? error : new Error(String(error));
      batch.forEach(query => {
        query.reject(errorObj);
      });

      log.error('Utils', `❌ [QueryBatcher] Batch failed: ${queryKey}`, errorObj);
    }
  }

  /**
   * 🔄 EXECUTE WITH RETRY
   * Executes query with retry logic and exponential backoff
   */
  private async executeWithRetry<T>(query: BatchedQuery<T>): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
      try {
        return await query.query();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < this.options.maxRetries) {
          const delay = Math.pow(2, attempt) * 100; // Exponential backoff
          // Retry scheduled
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  /**
   * 💾 CACHE MANAGEMENT
   */
  private getFromCache<T>(key: string): T | null {
    const cached = this.queryCache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.queryCache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  private setCache<T>(key: string, data: T, ttl: number): void {
    this.queryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });

    // Cleanup old cache entries periodically
    if (this.queryCache.size > 1000) {
      this.cleanupCache();
    }
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.queryCache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        this.queryCache.delete(key);
      }
    }
  }

  /**
   * 📊 METRICS AND MONITORING
   */
  getMetrics(): QueryMetrics {
    return { ...this.metrics };
  }

  clearMetrics(): void {
    this.metrics = {
      totalQueries: 0,
      batchedQueries: 0,
      deduplicatedQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageBatchSize: 0,
      averageResponseTime: 0
    };
  }

  /**
   * 🧹 CLEANUP
   */
  clearCache(): void {
    this.queryCache.clear();
  }

  clearPendingQueries(): void {
    // Reject all pending queries
    for (const [key, batch] of this.pendingQueries.entries()) {
      batch.forEach(query => {
        query.reject(new Error('QueryBatcher cleared'));
      });
    }
    this.pendingQueries.clear();

    // Clear timeouts
    for (const timeout of this.batchTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.batchTimeouts.clear();
  }

  /**
   * 🔍 DEBUG INFO
   */
  getDebugInfo(): {
    pendingQueries: number;
    cacheSize: number;
    activeTimeouts: number;
    metrics: QueryMetrics;
  } {
    return {
      pendingQueries: this.pendingQueries.size,
      cacheSize: this.queryCache.size,
      activeTimeouts: this.batchTimeouts.size,
      metrics: this.getMetrics()
    };
  }
}

// Export singleton instance
export const queryBatcher = QueryBatcher.getInstance();

// Export class for testing
export { QueryBatcher };

// Export types
export type { BatchedQuery, QueryBatchOptions, QueryMetrics };
