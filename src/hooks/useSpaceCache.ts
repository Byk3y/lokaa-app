import { log } from '@/utils/logger';
import { useState, useCallback } from 'react';
import type { SpaceData } from '@/contexts/SpaceContext'; // Import SpaceData type

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Hook for enhanced space data caching
 * Helps optimize space component performance by adding robust caching
 * FIXED: Converted to const export for React Fast Refresh compatibility
 */
export const useSpaceCache = (subdomain: string | undefined) => {
  const [quickRecoveryAttempted, setQuickRecoveryAttempted] = useState(false);
  
  /**
   * Get data from sessionStorage cache
   */
  const getFromCache = useCallback(() => {
    if (!subdomain) return null;
    
    try {
      const cacheKey = `space_data_${subdomain}`;
      const cachedData = sessionStorage.getItem(cacheKey);
      
      if (!cachedData) return null;
      
      const parsed = JSON.parse(cachedData);
      const age = Date.now() - parsed.timestamp;
      
      if (age > CACHE_TTL) return null;
      
      log.debug('Hook', '[useSpaceCache] Using cached data for', subdomain);
      return parsed.space;
    } catch (err) {
      log.warn('Hook', '[useSpaceCache] Failed to get cache:', err);
      return null;
    }
  }, [subdomain]);
  
  /**
   * Updates sessionStorage cache with new space data
   */
  const updateCache = useCallback((spaceData: SpaceData | null) => {
    if (!subdomain || !spaceData) return;
    
    try {
      const cacheKey = `space_data_${subdomain}`;
      sessionStorage.setItem(cacheKey, JSON.stringify({
        space: spaceData,
        timestamp: Date.now()
      }));
      
      log.debug('Hook', '[useSpaceCache] Updated cache for', subdomain);
    } catch (err) {
      log.warn('Hook', '[useSpaceCache] Failed to update cache:', err);
    }
  }, [subdomain]);
  
  /**
   * Attempts to quickly recover space data from cache
   * Returns the cached data if available
   */
  const attemptQuickRecovery = useCallback(() => {
    if (quickRecoveryAttempted) return null;
    
    setQuickRecoveryAttempted(true);
    return getFromCache();
  }, [quickRecoveryAttempted, getFromCache]);
  
  /**
   * Clears the cache for this subdomain
   */
  const clearCache = useCallback(() => {
    if (!subdomain) return;
    
    try {
      const cacheKey = `space_data_${subdomain}`;
      sessionStorage.removeItem(cacheKey);
      log.debug('Hook', '[useSpaceCache] Cleared cache for', subdomain);
    } catch (err) {
      log.warn('Hook', '[useSpaceCache] Failed to clear cache:', err);
    }
  }, [subdomain]);
  
  return {
    getFromCache,
    updateCache,
    attemptQuickRecovery,
    clearCache,
    quickRecoveryAttempted
  };
} 