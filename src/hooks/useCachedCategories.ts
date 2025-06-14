import { useEffect } from 'react';
import { useCategoriesCache, type SpaceCategory } from './useCategoriesCache';

interface UseCachedCategoriesReturn {
  categories: SpaceCategory[];
  isLoading: boolean;
  error: string | null;
  refreshCategories: () => Promise<void>;
}

/**
 * Hook for managing space categories with caching
 * Prevents unnecessary refetches when switching tabs
 */
export function useCachedCategories(spaceId: string | undefined): UseCachedCategoriesReturn {
  const {
    fetchCategories,
    getCategories,
    getLoadingState,
    getError,
    invalidateCache,
  } = useCategoriesCache();

  // Fetch categories when spaceId changes
  useEffect(() => {
    if (spaceId) {
      fetchCategories(spaceId);
    }
  }, [spaceId]);

  const refreshCategories = async () => {
    if (spaceId) {
      console.log('🏷️ [useCachedCategories] Refreshing categories for space:', spaceId);
      invalidateCache(spaceId);
      await fetchCategories(spaceId);
    }
  };

  return {
    categories: spaceId ? getCategories(spaceId) : [],
    isLoading: spaceId ? getLoadingState(spaceId) : false,
    error: spaceId ? getError(spaceId) : null,
    refreshCategories,
  };
} 