import { useQuery, QueryKey, UseQueryOptions } from '@tanstack/react-query';
import { fetchWithCache, optimizedFetcher } from '../utils/optimizedDataFetching';
import { useCleanupTracker } from './useCleanupTracker';
import { performanceMonitor } from '../utils/performanceMonitor';

interface OptimizedQueryOptions<T> extends Omit<UseQueryOptions<T>, 'queryFn'> {
  priority?: 'low' | 'normal' | 'high';
  cacheTags?: string[];
  staleWhileRevalidate?: boolean;
}

/**
 * 🚀 Phase 5B: Optimized data fetching hook
 * Combines React Query with our advanced caching and performance monitoring
 */
export function useOptimizedQuery<T = any>(
  queryKey: QueryKey,
  url: string,
  options: OptimizedQueryOptions<T> = {}
) {
  const cleanup = useCleanupTracker('useOptimizedQuery');
  const {
    priority = 'normal',
    cacheTags = [],
    staleWhileRevalidate = true,
    ...queryOptions
  } = options;

  return useQuery({
    queryKey,
    queryFn: async () => {
      const timingId = performanceMonitor.startComponentTiming(`query:${String(queryKey)}`);
      
      try {
        const data = await optimizedFetcher.fetch<T>(url, {
          priority,
          tags: cacheTags,
          staleWhileRevalidate
        });
        
        return data;
      } finally {
        if (timingId) {
          performanceMonitor.endComponentTiming(timingId);
        }
      }
    },
    ...queryOptions
  });
}

/**
 * Optimized hook for space data
 */
export function useOptimizedSpaceData<T = any>(
  spaceId: string,
  endpoint: string,
  options: OptimizedQueryOptions<T> = {}
) {
  return useOptimizedQuery<T>(
    ['space', spaceId, endpoint],
    `/api/spaces/${spaceId}/${endpoint}`,
    {
      cacheTags: ['spaces', `space-${spaceId}`],
      staleTime: 300000, // 5 minutes
      ...options
    }
  );
}

/**
 * Optimized hook for user data
 */
export function useOptimizedUserData<T = any>(
  userId: string,
  endpoint: string,
  options: OptimizedQueryOptions<T> = {}
) {
  return useOptimizedQuery<T>(
    ['user', userId, endpoint],
    `/api/users/${userId}/${endpoint}`,
    {
      cacheTags: ['users', `user-${userId}`],
      staleTime: 180000, // 3 minutes
      ...options
    }
  );
}

/**
 * Optimized hook for posts data
 */
export function useOptimizedPostsData<T = any>(
  filters: Record<string, any> = {},
  options: OptimizedQueryOptions<T> = {}
) {
  const queryParams = new URLSearchParams(filters).toString();
  const url = `/api/posts${queryParams ? `?${queryParams}` : ''}`;
  
  return useOptimizedQuery<T>(
    ['posts', filters],
    url,
    {
      cacheTags: ['posts'],
      staleTime: 120000, // 2 minutes
      ...options
    }
  );
}

/**
 * Hook for critical data that should bypass cache
 */
export function useCriticalData<T = any>(
  queryKey: QueryKey,
  url: string,
  options: OptimizedQueryOptions<T> = {}
) {
  return useOptimizedQuery<T>(
    queryKey,
    url,
    {
      priority: 'high',
      staleWhileRevalidate: false,
      staleTime: 0, // Always fresh
      ...options
    }
  );
}

/**
 * Hook for batch data fetching
 */
export function useBatchData<T = any>(
  requests: Array<{ queryKey: QueryKey; url: string }>,
  options: OptimizedQueryOptions<T[]> = {}
) {
  const queryKey = ['batch', ...requests.map(r => r.queryKey)];
  
  return useOptimizedQuery<T[]>(
    queryKey,
    '', // URL not used for batch
    {
      queryFn: async () => {
        const timingId = performanceMonitor.startComponentTiming('batch-fetch');
        
        try {
          const results = await optimizedFetcher.batchFetch<T>(
            requests.map(({ url }) => ({ url }))
          );
          
          return results;
        } finally {
          if (timingId) {
            performanceMonitor.endComponentTiming(timingId);
          }
        }
      },
      ...options
    } as any
  );
}

// Export convenience methods
export { fetchWithCache, optimizedFetcher }; 