/**
 * 🚀 Phase 2A: Advanced Query Hook
 * 
 * React hook that integrates with the Advanced Query Engine to provide:
 * - Intelligent query batching and deduplication
 * - Automatic caching and cache invalidation
 * - Priority-based query execution
 * - Real-time performance monitoring
 * - Seamless integration with existing components
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { advancedQueryEngine, createQueryRequest, QueryResult } from '@/utils/advancedQueryEngine';
import { devLogger } from '@/utils/developmentLogger';

export interface UseAdvancedQueryOptions {
  priority?: 'high' | 'normal' | 'low';
  timeout?: number;
  enabled?: boolean;
  refetchOnMount?: boolean;
  refetchInterval?: number;
  staleTime?: number;
  cacheKey?: string;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  order?: { column: string; ascending: boolean }[];
  limit?: number;
  offset?: number;
  single?: boolean;
  count?: 'exact' | 'planned' | 'estimated';
}

export interface UseAdvancedQueryResult<T = any> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  isStale: boolean;
  fromCache: boolean;
  executionTime: number;
  batchSize?: number;
}

/**
 * Advanced query hook with intelligent batching and caching
 */
export function useAdvancedQuery<T = any>(
  table: string,
  select: string,
  filters: Record<string, any> = {},
  options: UseAdvancedQueryOptions = {}
): UseAdvancedQueryResult<T> {
  const {
    priority = 'normal',
    timeout = 10000,
    enabled = true,
    refetchOnMount = true,
    refetchInterval,
    staleTime = 5 * 60 * 1000, // 5 minutes
    cacheKey,
    onSuccess,
    onError,
    ...queryOptions
  } = options;

  // State
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [executionTime, setExecutionTime] = useState(0);
  const [batchSize, setBatchSize] = useState<number | undefined>();

  // Refs
  const lastFetchTime = useRef<number>(0);
  const refetchIntervalRef = useRef<NodeJS.Timeout>();
  const subscriberId = useRef(`useAdvancedQuery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const isMounted = useRef(true);

  // Generate stable cache key
  const stableCacheKey = cacheKey || 
    `${table}:${select}:${JSON.stringify(filters)}:${JSON.stringify(queryOptions)}`;

  /**
   * Execute the query
   */
  const executeQuery = useCallback(async (isRefetch = false) => {
    if (!enabled) return;

    // Don't refetch if data is still fresh (unless explicitly refetching)
    if (!isRefetch && data && (Date.now() - lastFetchTime.current) < staleTime) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const queryRequest = createQueryRequest(
        table,
        select,
        filters,
        subscriberId.current,
        {
          priority,
          timeout,
          cacheKey: stableCacheKey,
          ...queryOptions
        }
      );

      devLogger.log('AdvancedQuery', `Executing query for ${table}`, {
        subscriberId: subscriberId.current,
        priority,
        filters,
        isRefetch
      });

      const result: QueryResult<T> = await advancedQueryEngine.query<T>(queryRequest);

      if (!isMounted.current) return;

      if (result.error) {
        setError(result.error);
        onError?.(result.error);
      } else {
        setData(result.data);
        setFromCache(result.fromCache);
        setExecutionTime(result.executionTime);
        setBatchSize(result.batchSize);
        lastFetchTime.current = Date.now();
        setIsStale(false);
        onSuccess?.(result.data);

        devLogger.log('AdvancedQuery', `Query successful for ${table}`, {
          subscriberId: subscriberId.current,
          fromCache: result.fromCache,
          executionTime: result.executionTime,
          batchSize: result.batchSize,
          resultCount: Array.isArray(result.data) ? result.data.length : result.data ? 1 : 0
        });
      }
    } catch (err) {
      if (!isMounted.current) return;
      
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      onError?.(errorMessage);
      
      devLogger.warn('AdvancedQuery', `Query failed for ${table}`, {
        subscriberId: subscriberId.current,
        error: errorMessage
      });
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [
    enabled, table, select, filters, priority, timeout, stableCacheKey, 
    queryOptions, data, staleTime, onSuccess, onError
  ]);

  /**
   * Refetch function for manual refetching
   */
  const refetch = useCallback(async () => {
    await executeQuery(true);
  }, [executeQuery]);

  /**
   * Check if data is stale
   */
  const checkStaleStatus = useCallback(() => {
    if (data && lastFetchTime.current > 0) {
      const age = Date.now() - lastFetchTime.current;
      setIsStale(age > staleTime);
    }
  }, [data, staleTime]);

  // Initial fetch on mount
  useEffect(() => {
    if (refetchOnMount) {
      executeQuery();
    }
  }, [executeQuery, refetchOnMount]);

  // Set up refetch interval
  useEffect(() => {
    if (refetchInterval && refetchInterval > 0) {
      refetchIntervalRef.current = setInterval(() => {
        executeQuery(true);
      }, refetchInterval);

      return () => {
        if (refetchIntervalRef.current) {
          clearInterval(refetchIntervalRef.current);
        }
      };
    }
  }, [refetchInterval, executeQuery]);

  // Check stale status periodically
  useEffect(() => {
    const staleCheckInterval = setInterval(checkStaleStatus, 30000); // Check every 30 seconds
    
    return () => clearInterval(staleCheckInterval);
  }, [checkStaleStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (refetchIntervalRef.current) {
        clearInterval(refetchIntervalRef.current);
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    refetch,
    isStale,
    fromCache,
    executionTime,
    batchSize
  };
}

/**
 * Hook for batch queries - executes multiple queries efficiently
 */
export function useAdvancedBatchQuery<T = any>(
  queries: Array<{
    table: string;
    select: string;
    filters?: Record<string, any>;
    options?: UseAdvancedQueryOptions;
  }>,
  globalOptions: UseAdvancedQueryOptions = {}
): {
  results: Array<UseAdvancedQueryResult<T>>;
  loading: boolean;
  errors: string[];
  refetchAll: () => Promise<void>;
} {
  const results = queries.map(query => 
    useAdvancedQuery<T>(
      query.table,
      query.select,
      query.filters || {},
      { ...globalOptions, ...query.options }
    )
  );

  const loading = results.some(result => result.loading);
  const errors = results
    .map(result => result.error)
    .filter((error): error is string => error !== null);

  const refetchAll = useCallback(async () => {
    await Promise.all(results.map(result => result.refetch()));
  }, [results]);

  return {
    results,
    loading,
    errors,
    refetchAll
  };
}

/**
 * Hook for monitoring query performance
 */
export function useQueryMetrics() {
  const [metrics, setMetrics] = useState(advancedQueryEngine.getMetrics());
  const [batchStatus, setBatchStatus] = useState(advancedQueryEngine.getBatchStatus());

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(advancedQueryEngine.getMetrics());
      setBatchStatus(advancedQueryEngine.getBatchStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const resetMetrics = useCallback(() => {
    advancedQueryEngine.resetMetrics();
    setMetrics(advancedQueryEngine.getMetrics());
  }, []);

  return {
    metrics,
    batchStatus,
    resetMetrics
  };
} 