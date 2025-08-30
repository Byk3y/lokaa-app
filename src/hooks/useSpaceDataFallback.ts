import { log } from '@/utils/logger';
import { useMemo } from 'react';
import type { SpaceData } from '@/contexts/SpaceContext';
import { getKnownSpaceConfig, createBasicSpaceData, createEnhancedSpaceData, isKnownSpace } from '@/config/knownSpaces';

interface UseSpaceDataFallbackReturn {
  fallbackSpaceData: SpaceData | null;
  sidebarSpaceData: SpaceData | null;
  spaceIdForCounts: string;
}

/**
 * Custom hook for handling space data fallbacks
 * Extracts complex fallback logic from FeedTab component
 * 
 * Provides:
 * 1. Primary fallback data from cache sources
 * 2. Enhanced sidebar data with emergency fallbacks
 * 3. Stable space ID for member counts
 */
export function useSpaceDataFallback(currentSpaceData: SpaceData | null): UseSpaceDataFallbackReturn {
  
  // ============================================================================
  // PRIMARY FALLBACK SPACE DATA
  // ============================================================================
  
  const fallbackSpaceData = useMemo(() => {
    if (currentSpaceData) return null; // Use real data when available
    
    // Extract subdomain from URL as fallback
    const pathname = window.location.pathname;
    const subdomainMatch = pathname.match(/\/([^\/]+)\/space/);
    const urlSubdomain = subdomainMatch?.[1] || 'space';
    
    // PHASE 1 FIX: Enhanced fallback with immediate hardcoded data to prevent flashing
    let cachedSpaceData = null;
    
    // PRIORITY 1: Hardcoded fallback for known spaces (prevents any flashing)
    if (isKnownSpace(urlSubdomain)) {
      cachedSpaceData = createBasicSpaceData(urlSubdomain);
      log.debug('Hook', `🔒 [useSpaceDataFallback] Using hardcoded fallback for ${urlSubdomain}`);
    }
    
    // PRIORITY 2: Try multiple cache sources for space data
    if (!cachedSpaceData) {
      // 1. Try lastActiveSpace cache
      try {
        const lastActiveSpace = localStorage.getItem('lastActiveSpace');
        if (lastActiveSpace) {
          const parsed = JSON.parse(lastActiveSpace);
          if (parsed.subdomain === urlSubdomain) {
            const cacheAge = Date.now() - (parsed.timestamp || 0);
            const maxCacheAge = 24 * 60 * 60 * 1000; // 24 hours
            if (cacheAge < maxCacheAge && parsed.data) {
              cachedSpaceData = {
                id: parsed.data.id as string,
                name: parsed.data.name as string,
                subdomain: parsed.data.subdomain as string,
                description: (parsed.data.description as string) || null,
                icon_image: (parsed.data.icon_image as string) || null,
                cover_image: (parsed.data.cover_image as string) || null,
                is_private: (parsed.data.is_private as boolean) || false
              };
              log.debug('Hook', `🔒 [useSpaceDataFallback] Using lastActiveSpace cache for ${urlSubdomain}`);
            }
          }
        }
      } catch (e) {
        log.warn('Hook', '[useSpaceDataFallback] Failed to read lastActiveSpace cache:', e);
      }
      
      // 2. Try space_fallback_${subdomain} cache
      if (!cachedSpaceData) {
        try {
          const persistentCache = localStorage.getItem(`space_fallback_${urlSubdomain}`);
          if (persistentCache) {
            const parsed = JSON.parse(persistentCache);
            const cacheAge = Date.now() - (parsed.timestamp || 0);
            const maxCacheAge = 24 * 60 * 60 * 1000; // 24 hours
            if (cacheAge < maxCacheAge && parsed.data) {
              cachedSpaceData = {
                id: parsed.data.id as string,
                name: parsed.data.name as string,
                subdomain: parsed.data.subdomain as string,
                description: (parsed.data.description as string) || null,
                icon_image: (parsed.data.icon_image as string) || null,
                cover_image: (parsed.data.cover_image as string) || null,
                is_private: (parsed.data.is_private as boolean) || false
              };
              log.debug('Hook', `🔒 [useSpaceDataFallback] Using persistent cache for ${urlSubdomain}`);
            }
          }
        } catch (e) {
          log.warn('Hook', '[useSpaceDataFallback] Failed to read persistent cache:', e);
        }
      }
    }

    // Return the best available fallback data - only for known spaces with real UUIDs
    if (cachedSpaceData) {
      return cachedSpaceData;
    }
    
    // CRITICAL FIX: Only provide fallback for spaces with known real UUIDs
    if (isKnownSpace(urlSubdomain)) {
      return createBasicSpaceData(urlSubdomain);
    }
    
    // For unknown spaces, return null to prevent invalid database queries
    log.warn('Hook', `⚠️ [useSpaceDataFallback] No fallback data available for ${urlSubdomain} - returning null`);
    return null;
  }, [currentSpaceData]);

  // ============================================================================
  // ENHANCED SIDEBAR SPACE DATA
  // ============================================================================
  
  const sidebarSpaceData = useMemo(() => {
    // PRIORITY 1: Use real current space data when available
    if (currentSpaceData) {
      log.debug('Hook', `🔒 [useSpaceDataFallback] Using real space data for sidebar: ${currentSpaceData.name}`);
      return currentSpaceData;
    }
    
    // PRIORITY 2: Use fallback data - but ensure it's never null
    const fallback = fallbackSpaceData;
    if (fallback) {
      log.debug('Hook', `🔒 [useSpaceDataFallback] Using fallback space data for sidebar: ${fallback.name}`);
      return fallback;
    }
    
    // PRIORITY 3: Emergency hardcoded fallback to prevent null sidebar
    const pathname = window.location.pathname;
    const subdomainMatch = pathname.match(/\/([^\/]+)\/space/);
    const urlSubdomain = subdomainMatch?.[1] || 'space';
    
    // CRITICAL FIX: Only provide emergency fallback for known spaces with real UUIDs
    if (isKnownSpace(urlSubdomain)) {
      const emergencyFallback = createEnhancedSpaceData(urlSubdomain);
      if (emergencyFallback) {
        log.debug('Hook', `🚨 [useSpaceDataFallback] Using EMERGENCY fallback for sidebar: ${emergencyFallback.name}`);
        return emergencyFallback;
      }
    }
    
    // For unknown spaces, return null to prevent invalid database queries
    log.warn('Hook', `⚠️ [useSpaceDataFallback] No emergency fallback available for ${urlSubdomain} - returning null`);
    return null;
  }, [currentSpaceData, fallbackSpaceData]);

  // ============================================================================
  // DERIVED VALUES
  // ============================================================================
  
  const spaceIdForCounts = currentSpaceData?.id || fallbackSpaceData?.id || '';

  return {
    fallbackSpaceData,
    sidebarSpaceData,
    spaceIdForCounts,
  };
}
