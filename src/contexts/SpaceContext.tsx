import { log } from '@/utils/logger';
import React, { createContext, useContext, useState, useCallback, ReactNode, useRef, useEffect } from 'react'
import { getSupabaseClient } from '@/integrations/supabase/client'
import { useOptimizedAuth } from './AuthContext'
import { useLocation } from 'react-router-dom'
import { fetchSpaceWithFallback, type SpaceFallbackData } from '@/utils/spaceDataFallback'
import { Database } from '@/types/database.types'

export type Space = Database['public']['Tables']['spaces']['Row'] & {
  // Add the correct field names that actually exist in the database
  icon_image?: string | null;
  cover_image?: string | null;
}

/**
 * Space data interface 
 */
export interface SpaceData {
  id: string;
  name: string;
  description: string | null;
  about_description?: string | null;
  subdomain: string;
  owner_id: string;
  is_private: boolean;
  primary_color?: string;
  cover_image?: string | null;
  icon_image?: string | null;
  pricing_type?: 'free' | 'paid' | string;
  price_per_month?: number;
  member_count?: number;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown; // Changed from any to unknown for better type safety
}

/**
 * Context value interface
 */
export interface SpaceContextValue {
  space: Space | null;
  setSpace: (space: Space | null) => void;
  loading: boolean;
  error: Error | null;
  fetchSpaceData: (subdomain: string) => Promise<Space | null>;
  clearCache: () => void;
}

const SpaceContext = createContext<SpaceContextValue>({
  space: null,
  setSpace: () => {},
  loading: false,
  error: null,
  fetchSpaceData: async () => null,
  clearCache: () => {}
})

/**
 * SpaceProvider component
 */
export function SpaceProvider({ children }: { children: ReactNode }) {
  const { user: authUser, loading: authLoading } = useOptimizedAuth()
  const location = useLocation()
  
  // FIXED: Simplified state management
  const [space, setSpace] = useState<Space | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  // Simple cache for basic performance
  const spaceCache = useRef<Map<string, SpaceData>>(new Map())
  const activeFetches = useRef<Map<string, Promise<SpaceData | null>>>(new Map())
  
  // ENHANCED: Add debouncing for navigation-triggered fetches
  const fetchDebounceTimer = useRef<NodeJS.Timeout | null>(null)
  const lastFetchSubdomain = useRef<string | null>(null)

  /**
   * FIXED: Simple fetch space data without complex caching logic
   */
  const fetchSpaceData = useCallback(async (subdomain: string): Promise<Space | null> => {
    try {
      setLoading(true);
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('spaces')
        .select('*')
        .eq('subdomain', subdomain)
        .single();

      if (error) throw error;
      
      setSpace(data);
      setError(null);
      return data;
    } catch (err) {
      log.error('Context', 'Error fetching space:', err);
      setError(err as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ENHANCED: Auto-fetch space data when URL subdomain changes
  useEffect(() => {
    if (authLoading || !authUser) {
      return; // Wait for auth to complete
    }

    // Extract subdomain from current path (e.g., /music-business/space -> music-business)
    const pathParts = location.pathname.split('/').filter(Boolean);
    const currentSubdomain = pathParts[0];
    
    // Only auto-fetch if:
    // 1. We have a valid subdomain from URL
    // 2. It's not the special :subdomain placeholder
    // 3. It looks like a space route pattern
    // 4. We don't already have this space data loaded
    const isSpaceRoute = pathParts.length >= 2 && pathParts[1] === 'space';
    const isValidSubdomain = currentSubdomain && 
                            currentSubdomain !== ':subdomain' && 
                            currentSubdomain !== 'app' && 
                            currentSubdomain !== 'discover' &&
                            currentSubdomain !== 'create-space' &&
                            currentSubdomain !== 'profile';
    
    if (isSpaceRoute && isValidSubdomain) {
      // ENHANCED: More sophisticated check to prevent unnecessary fetches during navigation
      const needsNewData = !space || space.subdomain !== currentSubdomain;
      const hasActiveRequest = activeFetches.current.has(currentSubdomain);
      const hasCachedData = spaceCache.current.has(currentSubdomain);
      
      // CRITICAL FIX: Check for space data from fast path or localStorage before fetching
      if (needsNewData && !hasActiveRequest && !hasCachedData) {
        // Check multiple cache sources first to prevent unnecessary database calls
        let foundCachedData = null;
        
        // Strategy 1: Check persistent localStorage cache
        try {
          const persistentCacheKey = `space_fallback_${currentSubdomain}`;
          const cachedData = localStorage.getItem(persistentCacheKey);
          if (cachedData) {
            const parsed = JSON.parse(cachedData);
            const cacheAge = Date.now() - parsed.timestamp;
            const maxFallbackAge = 24 * 60 * 60 * 1000; // 24 hours
            
            if (cacheAge < maxFallbackAge && parsed.data) {
              foundCachedData = parsed.data;
              log.debug('Context', `⚡ [SpaceContext] Using persistent cache to avoid fetch (${Math.round(cacheAge / 60000)} minutes old)`);
            }
          }
        } catch (e) {
          log.warn('Context', '[SpaceContext] Failed to read persistent cache:', e);
        }
        
        // Strategy 2: Check lastActiveSpace cache
        if (!foundCachedData) {
          try {
            const lastActiveData = localStorage.getItem('lastActiveSpace');
            if (lastActiveData) {
              const parsed = JSON.parse(lastActiveData);
              if (parsed.subdomain === currentSubdomain) {
                foundCachedData = parsed;
                log.debug('Context', `⚡ [SpaceContext] Using lastActiveSpace cache to avoid fetch`);
              }
            }
          } catch (e) {
            log.warn('Context', '[SpaceContext] Failed to read lastActiveSpace:', e);
          }
        }
        
        // If we found cached data, use it immediately and skip database fetch
        if (foundCachedData) {
          log.debug('Context', `🚀 [SpaceContext] LOGIN OPTIMIZATION: Using cached data instead of database fetch for ${currentSubdomain}`);
          setSpace(foundCachedData as Space);
          setError(null);
          // Update memory cache for future use
          spaceCache.current.set(currentSubdomain, foundCachedData as SpaceData);
          return; // Skip database fetch entirely
        }
        
        // Only proceed with database fetch if no cached data was found
        log.debug('Context', `⚠️ [SpaceContext] No cached data found for ${currentSubdomain}, proceeding with database fetch`);
      }
      
      // IMPROVED: Only fetch if we actually need new data and don't have it cached
      if (needsNewData && !hasActiveRequest) {
        // If we have cached data, use it immediately to prevent loading states
        if (hasCachedData) {
          const cached = spaceCache.current.get(currentSubdomain)!;
          log.debug('Context', `⚡ [SpaceContext] Using immediate cache for navigation to ${currentSubdomain}`);
          setSpace(cached as Space);
          setError(null);
          return; // Don't fetch again if we have valid cache
        }
        
        // ENHANCED: Debounce rapid navigation changes
        if (fetchDebounceTimer.current) {
          clearTimeout(fetchDebounceTimer.current);
        }
        
        if (lastFetchSubdomain.current === currentSubdomain) {
          log.debug('Context', `🔄 [SpaceContext] Debouncing duplicate fetch for ${currentSubdomain}`);
          return;
        }
        
        fetchDebounceTimer.current = setTimeout(() => {
          log.debug('Context', `[SpaceContext] Auto-fetching space data for URL subdomain: ${currentSubdomain}`);
          
          log.debug('Context', `[SpaceContext] Auto-fetch debug for ${currentSubdomain}:`, {
            hasExistingData: !!space,
            existingSubdomain: space?.subdomain,
            authUser: !!authUser,
            authLoading,
            activeFetches: activeFetches.current.size,
            cacheSize: spaceCache.current.size,
            needsNewData,
            hasActiveRequest,
            hasCachedData
          });
          
          lastFetchSubdomain.current = currentSubdomain;
          fetchSpaceData(currentSubdomain);
        }, 100); // 100ms debounce for navigation
        
      } else if (needsNewData && hasActiveRequest) {
        log.debug('Context', `⏳ [SpaceContext] Fetch already in progress for ${currentSubdomain}, waiting...`);
      } else if (!needsNewData) {
        log.debug('Context', `✅ [SpaceContext] Current space data already matches ${currentSubdomain}, no fetch needed`);
      }
    }
    
    // Cleanup function
    return () => {
      if (fetchDebounceTimer.current) {
        clearTimeout(fetchDebounceTimer.current);
        fetchDebounceTimer.current = null;
      }
    };
  }, [location.pathname, authUser, authLoading, space, fetchSpaceData]);

  /**
   * FIXED: Simple cache clear
   */
  const clearCache = useCallback(() => {
    spaceCache.current.clear();
    setSpace(null);
    setError(null);
    log.debug('Context', '[Space] Cleared all space cache');
  }, []);

  const value: SpaceContextValue = {
    space,
    setSpace,
    loading,
    error,
    fetchSpaceData,
    clearCache
  };

  return (
    <SpaceContext.Provider value={value}>
      {children}
    </SpaceContext.Provider>
  )
}

/**
 * Custom hook to use the space context
 * FIXED: Named function for Fast Refresh compatibility
 */
export function useSpace() {
  const context = useContext(SpaceContext)
  if (context === undefined) {
    throw new Error('useSpace must be used within a SpaceProvider')
  }
  return context
}