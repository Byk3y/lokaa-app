import { useState, useEffect, useCallback, useRef } from 'react';
import { searchAPI } from '@/features/search/api/search-api';
import { searchPerformanceMonitor } from '../utils/searchPerformance';
import { devLogger } from '@/utils/developmentLogger';
import type { SearchResult, SearchFilters } from '../types';

interface UsePostSearchOptions {
  spaceId: string | null;
  initialQuery?: string;
  initialFilters?: SearchFilters;
  autoSearch?: boolean;
  debounceMs?: number;
}

interface UsePostSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  results: SearchResult[];
  isLoading: boolean;
  hasMore: boolean;
  error: string | null;
  filters: SearchFilters;
  setFilters: (filters: SearchFilters) => void;
  loadMore: () => void;
  clearResults: () => void;
  refresh: () => void;
  searchStats: {
    totalSearches: number;
    avgResultsPerSearch: number;
    cacheHitRate: number;
  };
}

export function usePostSearch({
  spaceId,
  initialQuery = '',
  initialFilters = {},
  autoSearch = true,
  debounceMs = 200
}: UsePostSearchOptions): UsePostSearchReturn {
  const [query, setQueryState] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<SearchFilters>(initialFilters);
  const [searchStats, setSearchStats] = useState({
    totalSearches: 0,
    avgResultsPerSearch: 0,
    cacheHitRate: 0
  });

  const debouncedQuery = useDebounce(query, debounceMs);
  const isSearchingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Update search stats periodically
  useEffect(() => {
    const updateStats = () => {
      const metrics = searchAPI.getPerformanceMetrics();
      setSearchStats({
        totalSearches: metrics.totalRequests,
        avgResultsPerSearch: metrics.averageResponseTime,
        cacheHitRate: metrics.cacheHitRate
      });
    };

    const interval = setInterval(updateStats, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const performSearch = useCallback(async (
    searchQuery: string,
    searchFilters: SearchFilters,
    isLoadMore: boolean = false
  ) => {
    if (!spaceId || !searchQuery.trim()) {
      devLogger.log('usePostSearch', 'Clearing results - invalid query or spaceId:', { 
        spaceId, 
        query: searchQuery,
        isLoadMore 
      });
      setResults([]);
      setHasMore(false);
      return;
    }

    if (isSearchingRef.current) {
      devLogger.log('usePostSearch', 'Search already in progress, skipping');
      return;
    }

    isSearchingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      devLogger.log('usePostSearch', 'Calling performSearch with:', { 
        spaceId, 
        query: searchQuery, 
        filters: searchFilters,
        isLoadMore 
      });

      const searchResults = await searchAPI.searchPostsInSpace(
        spaceId,
        searchQuery,
        {
          ...searchFilters,
          limit: searchFilters.limit || 20,
          offset: isLoadMore ? results.length : 0
        }
      );

      devLogger.log('usePostSearch', 'Search API returned results:', searchResults.length);

      if (isLoadMore) {
        setResults(prev => [...prev, ...searchResults]);
      } else {
        setResults(searchResults);
      }

      setHasMore(searchResults.length === (searchFilters.limit || 20));
      
      // Update search stats
      const metrics = searchAPI.getPerformanceMetrics();
      setSearchStats({
        totalSearches: metrics.totalRequests,
        avgResultsPerSearch: metrics.averageResponseTime,
        cacheHitRate: metrics.cacheHitRate
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
      
      devLogger.warn('usePostSearch', 'Search error:', err);
    } finally {
      setIsLoading(false);
      isSearchingRef.current = false;
    }
  }, [spaceId, results.length]);

  // Effect to trigger search when debounced query changes
  useEffect(() => {
    if (autoSearch && debouncedQuery !== undefined) {
      devLogger.log('usePostSearch', 'Debounced query changed:', { 
        query: debouncedQuery, 
        spaceId 
      });
      performSearch(debouncedQuery, filters);
    }
  }, [debouncedQuery, filters, autoSearch, performSearch]);

  // Effect to trigger search when spaceId becomes available
  useEffect(() => {
    if (spaceId && query && autoSearch) {
      devLogger.log('usePostSearch', 'SpaceId became available, triggering search:', { 
        spaceId, 
        query 
      });
      performSearch(query, filters);
    }
  }, [spaceId, query, autoSearch, performSearch, filters]);

  const setQuery = useCallback((newQuery: string) => {
    devLogger.log('usePostSearch', 'setQuery called:', { 
      from: query, 
      to: newQuery 
    });
    setQueryState(newQuery);
    
    // Clear results immediately for empty queries
    if (!newQuery.trim()) {
      setResults([]);
      setHasMore(false);
      setError(null);
    }
  }, [query]);

  const setFilters = useCallback((newFilters: SearchFilters) => {
    setFiltersState(newFilters);
    
    // Trigger new search with updated filters if we have a query
    if (query && spaceId && autoSearch) {
      performSearch(query, newFilters);
    }
  }, [query, spaceId, autoSearch, performSearch]);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore && query && spaceId) {
      performSearch(query, filters, true);
    }
  }, [isLoading, hasMore, query, spaceId, filters, performSearch]);

  const clearResults = useCallback(() => {
    setResults([]);
    setHasMore(false);
    setError(null);
    setIsLoading(false);
  }, []);

  const refresh = useCallback(() => {
    if (query && spaceId) {
      performSearch(query, filters);
    }
  }, [query, spaceId, filters, performSearch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      devLogger.log('usePostSearch', 'Hook unmounting for spaceId:', spaceId);
      isSearchingRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [spaceId]);

  return {
    query,
    setQuery,
    results,
    isLoading,
    hasMore,
    error,
    filters,
    setFilters,
    loadMore,
    clearResults,
    refresh,
    searchStats
  };
}

// Custom debounce hook with progressive delays
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    devLogger.log('useDebounce:postSearch:', 'Value changed:', { 
      value, 
      delay 
    });

    const handler = setTimeout(() => {
      devLogger.log('useDebounce:postSearch:', 'Timeout fired - checking values:', { 
        current: value, 
        debounced: debouncedValue 
      });
      
      if (value !== debouncedValue) {
        devLogger.log('useDebounce:postSearch:', 'Setting debounced value:', value);
        setDebouncedValue(value);
      }
    }, delay);

    return () => {
      devLogger.log('useDebounce:postSearch:', 'Cleanup - clearing timeout');
      clearTimeout(handler);
    };
  }, [value, delay, debouncedValue]);

  return debouncedValue;
}