import { useEffect, useCallback, useMemo } from 'react';
import { usePostSearch } from './usePostSearch';
import { useSearchURLSync } from './useSearchURLSync';
import { searchAPI } from '../api/search-api';
import { searchPerformanceMonitor } from '../utils/searchPerformance';
import { devLogger } from '@/utils/developmentLogger';
import type { SearchResult, SearchFilters } from '../types';
import { useState } from 'react';

interface UseSearchIntegrationOptions {
  spaceId: string | null;
  initialQuery?: string;
  initialFilters?: SearchFilters;
  autoSearch?: boolean;
  debounceMs?: number;
  enableURLSync?: boolean;
  enableSuggestions?: boolean;
}

interface UseSearchIntegrationReturn {
  // Search state
  query: string;
  setQuery: (query: string) => void;
  results: SearchResult[];
  isLoading: boolean;
  hasMore: boolean;
  error: string | null;
  
  // Filters
  filters: SearchFilters;
  setFilters: (filters: SearchFilters) => void;
  
  // Actions
  loadMore: () => void;
  clearResults: () => void;
  refresh: () => void;
  
  // Advanced features
  suggestions: Array<{ suggestion: string; type: string; count: number }>;
  searchStats: {
    totalSearches: number;
    avgResultsPerSearch: number;
    cacheHitRate: number;
  };
  
  // Performance monitoring
  performanceMetrics: {
    totalRequests: number;
    cacheHits: number;
    cacheMisses: number;
    averageResponseTime: number;
    cacheHitRate: number;
  };
  
  // URL sync
  urlQuery: string;
  setURLQuery: (query: string) => void;
}

export function useSearchIntegration({
  spaceId,
  initialQuery = '',
  initialFilters = {},
  autoSearch = true,
  debounceMs = 200,
  enableURLSync = true,
  enableSuggestions = true
}: UseSearchIntegrationOptions): UseSearchIntegrationReturn {
  
  devLogger.log('useSearchIntegration', 'Hook called with spaceId:', { spaceId });

  // URL synchronization
  const {
    query: urlQuery,
    setQuery: setURLQuery,
    syncToURL
  } = useSearchURLSync(spaceId, enableURLSync);

  // Post search functionality
  const {
    query,
    setQuery: setPostQuery,
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
  } = usePostSearch({
    spaceId,
    initialQuery: initialQuery || urlQuery,
    initialFilters,
    autoSearch,
    debounceMs
  });

  // Suggestions state
  const [suggestions, setSuggestions] = useState<Array<{ suggestion: string; type: string; count: number }>>([]);

  // Performance metrics
  const performanceMetrics = useMemo(() => {
    return searchAPI.getPerformanceMetrics();
  }, [searchStats]); // Update when search stats change

  // Unified query setter that handles both local state and URL sync
  const setQuery = useCallback((newQuery: string) => {
    devLogger.log('useSearchIntegration', 'setQuery called:', { 
      from: query, 
      to: newQuery,
      enableURLSync 
    });
    
    setPostQuery(newQuery);
    
    // Sync to URL if enabled
    if (enableURLSync) {
      syncToURL(newQuery);
    }
  }, [query, setPostQuery, enableURLSync, syncToURL]);

  // Load search suggestions
  const loadSuggestions = useCallback(async (partialQuery: string) => {
    if (!spaceId || !enableSuggestions || partialQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const suggestionsData = await searchAPI.getSearchSuggestions(
        spaceId,
        partialQuery,
        10
      );
      setSuggestions(suggestionsData);
    } catch (error) {
      devLogger.warn('useSearchIntegration', 'Failed to load suggestions:', error);
      setSuggestions([]);
    }
  }, [spaceId, enableSuggestions]);

  // Load suggestions when query changes
  useEffect(() => {
    if (enableSuggestions && query.length >= 2) {
      const timeoutId = setTimeout(() => {
        loadSuggestions(query);
      }, 300); // Debounce suggestions

      return () => clearTimeout(timeoutId);
    } else {
      setSuggestions([]);
    }
  }, [query, enableSuggestions, loadSuggestions]);

  // Sync URL query to local state when URL changes
  useEffect(() => {
    if (enableURLSync && urlQuery !== query) {
      devLogger.log('useSearchIntegration', 'URL query changed, syncing to local state:', { 
        urlQuery, 
        currentQuery: query 
      });
      setPostQuery(urlQuery);
    }
  }, [urlQuery, query, enableURLSync, setPostQuery]);

  // Enhanced clear results that also clears URL
  const clearResultsEnhanced = useCallback(() => {
    clearResults();
    if (enableURLSync) {
      syncToURL('');
    }
    setSuggestions([]);
  }, [clearResults, enableURLSync, syncToURL]);

  // Enhanced refresh that maintains URL sync
  const refreshEnhanced = useCallback(() => {
    refresh();
    if (enableURLSync && query) {
      syncToURL(query);
    }
  }, [refresh, enableURLSync, query, syncToURL]);

  // Log integration initialization
  useEffect(() => {
    devLogger.log('SearchContext', 'Search integration initialized:', {
      spaceId,
      initialQuery,
      enableURLSync,
      enableSuggestions,
      autoSearch
    });
  }, [spaceId, initialQuery, enableURLSync, enableSuggestions, autoSearch]);

  return {
    // Search state
    query,
    setQuery,
    results,
    isLoading,
    hasMore,
    error,
    
    // Filters
    filters,
    setFilters,
    
    // Actions
    loadMore,
    clearResults: clearResultsEnhanced,
    refresh: refreshEnhanced,
    
    // Advanced features
    suggestions,
    searchStats,
    
    // Performance monitoring
    performanceMetrics,
    
    // URL sync
    urlQuery,
    setURLQuery
  };
}