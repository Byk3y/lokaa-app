import { useState, useEffect, useRef, useCallback } from 'react';
import { globalCache, cacheQueries } from '@/utils/globalCacheCoordinator';
import { devLogger } from '@/utils/developmentLogger';
import { log } from '@/utils/logger';

export interface SpaceCategory {
  id: string;
  name: string;
  icon?: string | null;
  created_at?: string;
  is_archived?: boolean;
  space_id?: string;
  created_by?: string;
}

interface UseOptimizedCachedCategoriesReturn {
  categories: SpaceCategory[];
  isLoading: boolean;
  error: string | null;
  refreshCategories: () => Promise<void>;
}

/**
 * Optimized cached categories hook using global cache coordinator
 * Eliminates duplicate queries and provides intelligent caching
 */
export function useOptimizedCachedCategories(spaceId: string): UseOptimizedCachedCategoriesReturn {
  const [categories, setCategories] = useState<SpaceCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const previousSpaceIdRef = useRef<string | null>(null);

  const cacheKey = `categories:${spaceId}`;
  const subscriberId = `categories-hook-${spaceId}`;

  const fetchCategories = useCallback(async () => {
    if (!spaceId) {
      setCategories([]);
      setIsLoading(false);
      return;
    }

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    setError(null);
    
    // CRITICAL FIX: Clear categories immediately when spaceId changes to prevent cross-space contamination
    setCategories([]);

    try {
      log.debug('Hook', `[useOptimizedCachedCategories] Fetching categories for space ${spaceId}`);

      const categoriesData = await cacheQueries.categories(spaceId, subscriberId);

      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      setCategories(categoriesData);
      log.debug('Hook', `[useOptimizedCachedCategories] Set ${categoriesData.length} categories for space ${spaceId}`);

    } catch (err) {
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch categories';
      setError(errorMessage);
      log.error('Hook', `[useOptimizedCachedCategories] Error fetching categories:`, err);

      // Fallback to old category cache system if available
      if (typeof window !== 'undefined' && (window as any).useCategoriesCache) {
        try {
          log.debug('Hook', `[useOptimizedCachedCategories] Attempting fallback to old cache system`);
          const oldCache = (window as any).useCategoriesCache.getState();
          const fallbackCategories = oldCache.cache[spaceId]?.categories || [];
          if (fallbackCategories.length > 0) {
            setCategories(fallbackCategories);
            log.debug('Hook', `[useOptimizedCachedCategories] Fallback successful: ${fallbackCategories.length} categories`);
          }
        } catch (fallbackError) {
          log.error('Hook', `[useOptimizedCachedCategories] Fallback failed:`, fallbackError);
        }
      }
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [spaceId, subscriberId]);

  const refreshCategories = useCallback(async () => {
    // Invalidate cache first, then fetch
    globalCache.invalidate(cacheKey);
    await fetchCategories();
  }, [fetchCategories, cacheKey]);

  // CRITICAL FIX: Detect space switches and clear categories immediately
  useEffect(() => {
    const isSpaceSwitch = previousSpaceIdRef.current !== null && previousSpaceIdRef.current !== spaceId;
    
    if (isSpaceSwitch) {
      log.debug('Hook', `[useOptimizedCachedCategories] Space switch detected: ${previousSpaceIdRef.current} → ${spaceId}`);
      // Clear categories immediately to prevent showing old space's categories
      setCategories([]);
      setError(null);
    }
    
    previousSpaceIdRef.current = spaceId;
  }, [spaceId]);

  // Initial fetch
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Force re-render when categories change
  useEffect(() => {
    if (categories.length > 0) {
      log.debug('Hook', `[useOptimizedCachedCategories] Categories updated: ${categories.length} categories for space ${spaceId}`);
      // Force a small delay to ensure React has time to process the update
      const timer = setTimeout(() => {
        setCategories(prev => [...prev]);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [categories.length, spaceId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      globalCache.unsubscribe(cacheKey, subscriberId);
    };
  }, [cacheKey, subscriberId]);

  return {
    categories,
    isLoading,
    error,
    refreshCategories
  };
} 