/**
 * React Hook for Sitemap Data
 * 
 * Provides React hooks for fetching and managing sitemap data
 * with caching and error handling
 */

import { useState, useEffect, useCallback } from 'react';
import { log } from '@/utils/logger';
import type { SitemapData, SitemapGenerationOptions } from '@/utils/sitemapTypes';

interface UseSitemapDataOptions {
  autoFetch?: boolean;
  refreshInterval?: number;
  cacheKey?: string;
}

interface UseSitemapDataReturn {
  data: SitemapData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  lastUpdated: string | null;
}

/**
 * Hook for fetching sitemap data
 */
export function useSitemapData(
  options: SitemapGenerationOptions = {},
  hookOptions: UseSitemapDataOptions = {}
): UseSitemapDataReturn {
  const {
    autoFetch = true,
    refreshInterval,
    cacheKey = 'sitemap-data'
  } = hookOptions;

  const [data, setData] = useState<SitemapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchSitemapData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      log.debug('useSitemapData', 'Fetching sitemap data with options:', options);

      // Build query parameters
      const params = new URLSearchParams();
      if (options.includeImages) params.append('images', 'true');
      if (options.includeNews) params.append('news', 'true');
      if (options.contentTypes) params.append('types', options.contentTypes.join(','));

      const response = await fetch(`/api/sitemap/data?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const sitemapData: SitemapData = await response.json();
      
      setData(sitemapData);
      setLastUpdated(new Date().toISOString());
      
      // Cache in localStorage for offline access
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          data: sitemapData,
          timestamp: Date.now(),
          ttl: 5 * 60 * 1000 // 5 minutes
        }));
      } catch (cacheError) {
        log.warn('useSitemapData', 'Failed to cache sitemap data:', cacheError);
      }

      log.debug('useSitemapData', 'Sitemap data fetched successfully:', {
        totalUrls: sitemapData.totalUrls,
        contentTypes: sitemapData.contentTypes
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      log.error('useSitemapData', 'Failed to fetch sitemap data:', err);

      // Try to load from cache on error
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const { data: cachedData, timestamp, ttl } = JSON.parse(cached);
          if (Date.now() - timestamp < ttl) {
            setData(cachedData);
            setLastUpdated(new Date(timestamp).toISOString());
            log.debug('useSitemapData', 'Loaded sitemap data from cache');
          }
        }
      } catch (cacheError) {
        log.warn('useSitemapData', 'Failed to load from cache:', cacheError);
      }
    } finally {
      setLoading(false);
    }
  }, [options, cacheKey]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchSitemapData();
    }
  }, [autoFetch, fetchSitemapData]);

  // Set up refresh interval
  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0) {
      return;
    }

    const interval = setInterval(() => {
      fetchSitemapData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, fetchSitemapData]);

  return {
    data,
    loading,
    error,
    refetch: fetchSitemapData,
    lastUpdated
  };
}

/**
 * Hook for sitemap statistics
 */
export function useSitemapStats() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/sitemap/stats');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const statsData = await response.json();
      setStats(statsData);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      log.error('useSitemapStats', 'Failed to fetch sitemap stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  };
}

/**
 * Hook for sitemap validation
 */
export function useSitemapValidation() {
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateSitemap = useCallback(async (sitemapData: SitemapData) => {
    try {
      setValidating(true);
      setError(null);

      const response = await fetch('/api/sitemap/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sitemapData })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const validationResult = await response.json();
      return validationResult;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      log.error('useSitemapValidation', 'Failed to validate sitemap:', err);
      throw err;
    } finally {
      setValidating(false);
    }
  }, []);

  return {
    validating,
    error,
    validateSitemap
  };
}

/**
 * Hook for clearing sitemap cache
 */
export function useSitemapCache() {
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearCache = useCallback(async (cacheKey?: string) => {
    try {
      setClearing(true);
      setError(null);

      const response = await fetch('/api/sitemap/clear-cache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ cacheKey })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      log.debug('useSitemapCache', 'Cache cleared:', result);
      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      log.error('useSitemapCache', 'Failed to clear cache:', err);
      throw err;
    } finally {
      setClearing(false);
    }
  }, []);

  return {
    clearing,
    error,
    clearCache
  };
}
