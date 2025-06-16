/**
 * 🚀 Phase 2A: Advanced Query Engine
 * 
 * This system provides intelligent query batching, deduplication, and priority management
 * to dramatically reduce database load and improve performance.
 * 
 * Features:
 * - Smart query batching with configurable delays
 * - Advanced deduplication across components
 * - Priority-based query scheduling
 * - Adaptive timeout management
 * - Query result sharing and caching
 * - Performance metrics and monitoring
 */

import { getSupabaseClient } from '@/integrations/supabase/client';
import { devLogger } from './developmentLogger';
import { globalCache } from './globalCacheCoordinator';

// Types for query management
export interface QueryRequest {
  id: string;
  table: string;
  select: string;
  filters: Record<string, any>;
  options?: {
    order?: { column: string; ascending: boolean }[];
    limit?: number;
    offset?: number;
    single?: boolean;
    count?: 'exact' | 'planned' | 'estimated';
  };
  priority: 'high' | 'normal' | 'low';
  timeout: number;
  cacheKey: string;
  subscriberId: string;
}

export interface BatchedQuery {
  table: string;
  requests: QueryRequest[];
  scheduledAt: number;
  timeout: NodeJS.Timeout;
}

export interface QueryResult<T = any> {
  data: T;
  error: string | null;
  count?: number;
  executionTime: number;
  fromCache: boolean;
  batchSize?: number;
}

export interface QueryMetrics {
  totalQueries: number;
  batchedQueries: number;
  cacheHits: number;
  averageExecutionTime: number;
  duplicatesAvoided: number;
  bytesTransferred: number;
}

class AdvancedQueryEngine {
  private batchQueue = new Map<string, BatchedQuery>();
  private activeQueries = new Map<string, Promise<QueryResult>>();
  private queryMetrics: QueryMetrics = {
    totalQueries: 0,
    batchedQueries: 0,
    cacheHits: 0,
    averageExecutionTime: 0,
    duplicatesAvoided: 0,
    bytesTransferred: 0
  };

  // Configuration
  private readonly BATCH_DELAY = {
    high: 10,    // 10ms for high priority
    normal: 50,  // 50ms for normal priority
    low: 200     // 200ms for low priority
  };
  
  private readonly MAX_BATCH_SIZE = {
    high: 5,     // Smaller batches for high priority
    normal: 10,  // Standard batch size
    low: 20      // Larger batches for low priority
  };

  /**
   * Execute a query with intelligent batching and caching
   */
  async query<T = any>(request: QueryRequest): Promise<QueryResult<T>> {
    const startTime = performance.now();
    this.queryMetrics.totalQueries++;

    // Check cache first
    const cacheResult = await this.checkCache<T>(request);
    if (cacheResult) {
      this.queryMetrics.cacheHits++;
      devLogger.log('QueryEngine', `Cache HIT for ${request.cacheKey}`, {
        subscriberId: request.subscriberId,
        executionTime: performance.now() - startTime
      });
      return cacheResult;
    }

    // Check for duplicate active queries
    const activeQuery = this.activeQueries.get(request.cacheKey);
    if (activeQuery) {
      this.queryMetrics.duplicatesAvoided++;
      devLogger.log('QueryEngine', `Duplicate query avoided for ${request.cacheKey}`, {
        subscriberId: request.subscriberId
      });
      return await activeQuery as QueryResult<T>;
    }

    // Add to batch queue or execute immediately based on priority
    if (request.priority === 'high') {
      return await this.executeImmediately<T>(request, startTime);
    } else {
      return await this.addToBatch<T>(request, startTime);
    }
  }

  /**
   * Check cache for existing data
   */
  private async checkCache<T>(request: QueryRequest): Promise<QueryResult<T> | null> {
    try {
      const cachedData = await globalCache.get(
        request.cacheKey,
        () => Promise.resolve(null), // Dummy function, won't be called if cache exists
        request.subscriberId,
        { maxAge: 0 } // Force cache check only
      );

      if (cachedData !== null) {
        return {
          data: cachedData,
          error: null,
          executionTime: 0,
          fromCache: true
        };
      }
    } catch {
      // Cache miss or error, continue with query
    }
    
    return null;
  }

  /**
   * Execute query immediately (for high priority)
   */
  private async executeImmediately<T>(
    request: QueryRequest, 
    startTime: number
  ): Promise<QueryResult<T>> {
    const queryPromise = this.executeSingleQuery<T>(request, startTime);
    this.activeQueries.set(request.cacheKey, queryPromise);

    try {
      const result = await queryPromise;
      
      // Cache the result
      if (!result.error) {
        globalCache.warm(request.cacheKey, result.data);
      }
      
      return result;
    } finally {
      this.activeQueries.delete(request.cacheKey);
    }
  }

  /**
   * Add query to batch queue
   */
  private async addToBatch<T>(
    request: QueryRequest, 
    startTime: number
  ): Promise<QueryResult<T>> {
    const batchKey = `${request.table}_${request.priority}`;
    
    return new Promise((resolve, reject) => {
      // Get or create batch
      let batch = this.batchQueue.get(batchKey);
      
      if (!batch) {
        batch = {
          table: request.table,
          requests: [],
          scheduledAt: Date.now(),
          timeout: setTimeout(() => {
            this.executeBatch(batchKey);
          }, this.BATCH_DELAY[request.priority])
        };
        this.batchQueue.set(batchKey, batch);
      }

      // Add request to batch with promise handlers
      const requestWithHandlers = {
        ...request,
        resolve: resolve as (value: QueryResult<T>) => void,
        reject,
        startTime
      };
      
      batch.requests.push(requestWithHandlers as any);

      // Execute batch immediately if it's full
      if (batch.requests.length >= this.MAX_BATCH_SIZE[request.priority]) {
        clearTimeout(batch.timeout);
        this.executeBatch(batchKey);
      }
    });
  }

  /**
   * Execute a batch of queries
   */
  private async executeBatch(batchKey: string): Promise<void> {
    const batch = this.batchQueue.get(batchKey);
    if (!batch || batch.requests.length === 0) return;

    this.batchQueue.delete(batchKey);
    this.queryMetrics.batchedQueries += batch.requests.length;

    devLogger.log('QueryEngine', `Executing batch for ${batch.table}`, {
      batchSize: batch.requests.length,
      priority: batch.requests[0]?.priority
    });

    // Group requests by similar query patterns for optimization
    const groupedRequests = this.groupSimilarQueries(batch.requests);

    // Execute each group
    for (const group of groupedRequests) {
      if (group.length === 1) {
        // Single query
        const request = group[0];
        try {
          const result = await this.executeSingleQuery(request, request.startTime);
          
          // Cache result
          if (!result.error) {
            globalCache.warm(request.cacheKey, result.data);
          }
          
          request.resolve(result);
        } catch (error) {
          request.reject(error);
        }
      } else {
        // Batch similar queries
        await this.executeSimilarQueries(group);
      }
    }
  }

  /**
   * Group similar queries that can be optimized together
   */
  private groupSimilarQueries(requests: any[]): any[][] {
    const groups = new Map<string, any[]>();
    
    for (const request of requests) {
      // Create a signature for similar queries
      const signature = `${request.table}_${request.select}_${JSON.stringify(request.options?.order || [])}`;
      
      if (!groups.has(signature)) {
        groups.set(signature, []);
      }
      groups.get(signature)!.push(request);
    }
    
    return Array.from(groups.values());
  }

  /**
   * Execute similar queries with optimization
   */
  private async executeSimilarQueries(requests: any[]): Promise<void> {
    const firstRequest = requests[0];
    
    // For queries on the same table with different filters, we can optimize
    if (this.canOptimizeAsUnion(requests)) {
      await this.executeUnionQuery(requests);
    } else {
      // Execute individually but in parallel
      const promises = requests.map(request => 
        this.executeSingleQuery(request, request.startTime)
          .then(result => {
            if (!result.error) {
              globalCache.warm(request.cacheKey, result.data);
            }
            request.resolve(result);
          })
          .catch(error => request.reject(error))
      );
      
      await Promise.allSettled(promises);
    }
  }

  /**
   * Check if queries can be optimized as a union
   */
  private canOptimizeAsUnion(requests: any[]): boolean {
    if (requests.length < 2) return false;
    
    const first = requests[0];
    return requests.every(req => 
      req.table === first.table &&
      req.select === first.select &&
      JSON.stringify(req.options) === JSON.stringify(first.options) &&
      Object.keys(req.filters).length === 1 // Simple single-filter queries only
    );
  }

  /**
   * Execute optimized union query
   */
  private async executeUnionQuery(requests: any[]): Promise<void> {
    const firstRequest = requests[0];
    const filterKey = Object.keys(firstRequest.filters)[0];
    const filterValues = requests.map(req => req.filters[filterKey]);
    
    try {
      const startTime = performance.now();
      
      // Build optimized query using 'in' operator
      let query = getSupabaseClient()
        .from(firstRequest.table)
        .select(firstRequest.select);
      
      // Apply 'in' filter
      query = query.in(filterKey, filterValues);
      
      // Apply options
      if (firstRequest.options?.order) {
        for (const orderBy of firstRequest.options.order) {
          query = query.order(orderBy.column, { ascending: orderBy.ascending });
        }
      }
      
      if (firstRequest.options?.limit) {
        query = query.limit(firstRequest.options.limit * requests.length);
      }
      
      const { data, error, count } = await query;
      const executionTime = performance.now() - startTime;
      
      if (error) {
        // If union query fails, fall back to individual queries
        await this.executeSimilarQueries(requests);
        return;
      }
      
      // Distribute results to individual requests
      const resultsByFilter = new Map();
      
      if (data) {
        for (const row of data) {
          const filterValue = row[filterKey];
          if (!resultsByFilter.has(filterValue)) {
            resultsByFilter.set(filterValue, []);
          }
          resultsByFilter.get(filterValue).push(row);
        }
      }
      
      // Resolve each request with its portion of the data
      for (const request of requests) {
        const filterValue = request.filters[filterKey];
        const requestData = resultsByFilter.get(filterValue) || [];
        
        const result: QueryResult = {
          data: firstRequest.options?.single ? requestData[0] || null : requestData,
          error: null,
          count: requestData.length,
          executionTime,
          fromCache: false,
          batchSize: requests.length
        };
        
        // Cache individual results
        globalCache.warm(request.cacheKey, result.data);
        request.resolve(result);
      }
      
      devLogger.log('QueryEngine', `Union query optimization successful`, {
        originalQueries: requests.length,
        executionTime,
        totalResults: data?.length || 0
      });
      
    } catch (error) {
      // Fall back to individual queries
      devLogger.warn('QueryEngine', `Union query failed, falling back to individual queries`, { error });
      await this.executeSimilarQueries(requests);
    }
  }

  /**
   * Execute a single query
   */
  private async executeSingleQuery<T>(
    request: QueryRequest, 
    startTime: number
  ): Promise<QueryResult<T>> {
    try {
      let query = getSupabaseClient()
        .from(request.table)
        .select(request.select, { 
          count: request.options?.count,
          head: request.options?.count ? true : false 
        });

      // Apply filters
      for (const [key, value] of Object.entries(request.filters)) {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else if (typeof value === 'object' && value !== null) {
          // Handle complex filters like { gte: 10 }, { lt: 100 }, etc.
          for (const [operator, operatorValue] of Object.entries(value)) {
            query = (query as any)[operator](key, operatorValue);
          }
        } else {
          query = query.eq(key, value);
        }
      }

      // Apply options
      if (request.options?.order) {
        for (const orderBy of request.options.order) {
          query = query.order(orderBy.column, { ascending: orderBy.ascending });
        }
      }

      if (request.options?.limit) {
        query = query.limit(request.options.limit);
      }

      if (request.options?.offset) {
        query = query.range(
          request.options.offset, 
          request.options.offset + (request.options.limit || 1000) - 1
        );
      }

      if (request.options?.single) {
        query = query.single();
      }

      // Execute with timeout
      const queryPromise = query;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Query timeout after ${request.timeout}ms`)), request.timeout);
      });

      const { data, error, count } = await Promise.race([queryPromise, timeoutPromise]);
      const executionTime = performance.now() - startTime;

      // Update metrics
      this.updateMetrics(executionTime, data);

      const result: QueryResult<T> = {
        data: data as T,
        error: error?.message || null,
        count,
        executionTime,
        fromCache: false
      };

      devLogger.log('QueryEngine', `Query executed for ${request.table}`, {
        subscriberId: request.subscriberId,
        executionTime,
        resultCount: Array.isArray(data) ? data.length : data ? 1 : 0,
        fromCache: false
      });

      return result;

    } catch (error) {
      const executionTime = performance.now() - startTime;
      
      return {
        data: null as T,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime,
        fromCache: false
      };
    }
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(executionTime: number, data: any): void {
    // Update average execution time
    this.queryMetrics.averageExecutionTime = 
      (this.queryMetrics.averageExecutionTime + executionTime) / 2;

    // Estimate bytes transferred
    if (data) {
      const estimatedBytes = JSON.stringify(data).length;
      this.queryMetrics.bytesTransferred += estimatedBytes;
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics(): QueryMetrics {
    return { ...this.queryMetrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.queryMetrics = {
      totalQueries: 0,
      batchedQueries: 0,
      cacheHits: 0,
      averageExecutionTime: 0,
      duplicatesAvoided: 0,
      bytesTransferred: 0
    };
  }

  /**
   * Get current batch queue status
   */
  getBatchStatus(): { 
    queuedBatches: number; 
    totalQueuedQueries: number;
    activeQueries: number;
  } {
    const totalQueuedQueries = Array.from(this.batchQueue.values())
      .reduce((sum, batch) => sum + batch.requests.length, 0);

    return {
      queuedBatches: this.batchQueue.size,
      totalQueuedQueries,
      activeQueries: this.activeQueries.size
    };
  }
}

// Create global instance
export const advancedQueryEngine = new AdvancedQueryEngine();

// Make it available for debugging
if (typeof window !== 'undefined') {
  (window as any).advancedQueryEngine = advancedQueryEngine;
}

/**
 * Convenience function to create optimized query requests
 */
export function createQueryRequest(
  table: string,
  select: string,
  filters: Record<string, any> = {},
  subscriberId: string,
  options: {
    priority?: 'high' | 'normal' | 'low';
    timeout?: number;
    order?: { column: string; ascending: boolean }[];
    limit?: number;
    offset?: number;
    single?: boolean;
    count?: 'exact' | 'planned' | 'estimated';
    cacheKey?: string;
  } = {}
): QueryRequest {
  const {
    priority = 'normal',
    timeout = 10000,
    cacheKey,
    ...queryOptions
  } = options;

  // Generate cache key if not provided
  const generatedCacheKey = cacheKey || 
    `${table}:${select}:${JSON.stringify(filters)}:${JSON.stringify(queryOptions)}`;

  return {
    id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    table,
    select,
    filters,
    options: queryOptions,
    priority,
    timeout,
    cacheKey: generatedCacheKey,
    subscriberId
  };
} 