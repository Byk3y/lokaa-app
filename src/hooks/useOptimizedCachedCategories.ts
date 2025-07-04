import { useState, useEffect, useRef, useCallback } from 'react';
import { globalCache, cacheQueries } from '@/utils/globalCacheCoordinator';
import { devLogger } from '@/utils/developmentLogger';

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
export function useOptimizedCachedCategories(spaceId: string | undefined): UseOptimizedCachedCategoriesReturn {
  const [categories, setCategories] = useState<SpaceCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Generate unique subscriber ID for this hook instance
  const subscriberId = useRef(`categories-${Math.random().toString(36).substr(2, 9)}`).current;
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (spaceId) {
        globalCache.unsubscribe(`categories:${spaceId}`, subscriberId);
      }
    };
  }, [spaceId, subscriberId]);

  // Fetch categories using global cache coordinator
  const fetchCategories = useCallback(async (forceRefresh = false) => {
    if (!spaceId) {
      setCategories([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      devLogger.log('CacheDebug', `Fetching categories for space ${spaceId}`, { subscriberId });

      // If force refresh, invalidate cache first
      if (forceRefresh) {
        globalCache.invalidate(`categories:${spaceId}`);
      }

      // Use global cache coordinator for categories
      const categoriesData = await cacheQueries.categories(spaceId, subscriberId);
      
      // Filter and sort categories
      const filteredData = categoriesData.filter((cat: any) => 
        cat && cat.name && 
        !cat.name.includes("Non-Member") && 
        !cat.name.includes("Attempt")
      );
      
      // Sort categories with "General Discussion" first, then by creation order
      const sortedData = filteredData.sort((a: any, b: any) => {
        const aIsGeneral = a.name.toLowerCase() === 'general discussion';
        const bIsGeneral = b.name.toLowerCase() === 'general discussion';
        
        if (aIsGeneral && !bIsGeneral) return -1;
        if (bIsGeneral && !aIsGeneral) return 1;
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      });

      setCategories(sortedData);
      setIsLoading(false);
      
      devLogger.log('CacheDebug', `Categories loaded successfully`, { 
        count: sortedData.length,
        subscriberId 
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch categories';
      setError(errorMessage);
      setIsLoading(false);
      
      devLogger.warn('CacheDebug', `Categories fetch failed`, { error: errorMessage, subscriberId });
    }
  }, [spaceId, subscriberId]);

  // Auto-fetch categories when spaceId changes (but only once per spaceId)
  const hasAutoFetched = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (spaceId && !hasAutoFetched.current.has(spaceId)) {
      hasAutoFetched.current.add(spaceId);
      devLogger.log('CacheDebug', `Auto-fetching categories for space ${spaceId}`, { subscriberId });
      fetchCategories(false);
    }
  }, [spaceId, fetchCategories]);

  // Listen for space switching events to force refetch
  useEffect(() => {
    if (!spaceId) return;

    const handleSpaceSwitch = (event: CustomEvent) => {
      const { action } = event.detail || {};
      if (action === 'clearStates') {
        devLogger.log('CacheDebug', `Space switch detected for ${spaceId}, forcing categories refetch`);
        
        // Clear auto-fetch tracking to allow refetch
        hasAutoFetched.current.delete(spaceId);
        
        // Force immediate refetch
        fetchCategories(true);
      }
    };

    // Listen for spaceSwitch events
    window.addEventListener('spaceSwitch', handleSpaceSwitch as EventListener);

    return () => {
      window.removeEventListener('spaceSwitch', handleSpaceSwitch as EventListener);
    };
  }, [spaceId, fetchCategories]);

  // Refresh categories function
  const refreshCategories = useCallback(async () => {
    await fetchCategories(true);
  }, [fetchCategories]);

  return {
    categories,
    isLoading,
    error,
    refreshCategories,
  };
} 