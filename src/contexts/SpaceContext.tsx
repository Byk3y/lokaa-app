import { log } from '@/utils/logger';
import { createContext, useContext, useState, useCallback, ReactNode, useRef, useEffect } from 'react'
import { getSupabaseClient } from '@/integrations/supabase/client'
import { useOptimizedAuth } from './AuthContext'
import { useLocation } from 'react-router-dom'
import { Database } from '@/types/database.types'
import { isSpaceRelatedUrl, extractSpaceFromUrl, getContentTypeFromUrl } from '@/utils/spaceContextUtils'

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
      if (!supabase) {
        throw new Error('Supabase client not available');
      }
      
      const { data, error } = await supabase
        .from('spaces')
        .select('*')
        .eq('subdomain', subdomain)
        .single();

      if (error) throw error;
      
      setSpace(data);
      setError(null);
      if (process.env.NODE_ENV === 'development') {
        console.log(`🧪 [Phase 3.2] SpaceContext: Space data loaded successfully for: ${data.subdomain}`);
      }
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      log.error('Context', 'Error fetching space:', error);
      setError(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ENHANCED: Expose space context to global window for development/testing
  useEffect(() => {
    // Only expose in development mode for testing
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      (window as any).spaceContext = {
        space,
        setSpace,
        loading,
        error,
        fetchSpaceData,
        clearCache: () => {
          spaceCache.current.clear();
          activeFetches.current.clear();
        }
      };
    }
  }, [space, setSpace, loading, error, fetchSpaceData]);

  // ENHANCED: Auto-fetch space data when URL subdomain changes
  useEffect(() => {
    if (authLoading || !authUser) {
      return; // Wait for auth to complete
    }

    // Extract subdomain from current path using utility function
    const currentSubdomain = extractSpaceFromUrl(location.pathname);
    
    // Check if this is any space-related content URL using utility function
    const isSpaceRelatedUrlCheck = isSpaceRelatedUrl(location.pathname);
    
    // Only auto-fetch if:
    // 1. We have a valid subdomain from URL
    // 2. It's not the special :subdomain placeholder
    // 3. It looks like a space-related route pattern (space, post, profile, course)
    // 4. We don't already have this space data loaded
    const isValidSubdomain = currentSubdomain && 
                            currentSubdomain !== ':subdomain' && 
                            currentSubdomain !== 'app' && 
                            currentSubdomain !== 'discover' &&
                            currentSubdomain !== 'create-space' &&
                            currentSubdomain !== 'profile';
    
    if (isSpaceRelatedUrlCheck && isValidSubdomain) {
      // ENHANCED: Log the type of content URL detected
      const urlType = getContentTypeFromUrl(location.pathname) || 'unknown';
      
      log.debug('SpaceManagement', `[SpaceContext] Detected ${urlType} URL: ${location.pathname} → space: ${currentSubdomain}`);
      if (process.env.NODE_ENV === 'development') {
        console.log(`🧪 [Phase 3.2] SpaceContext: Detected content URL: ${urlType} at ${location.pathname}`);
      }
      
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
          log.debug('SpaceManagement', `🚀 [SpaceContext] LOGIN OPTIMIZATION: Using cached data instead of database fetch for ${currentSubdomain}`);
          if (process.env.NODE_ENV === 'development') {
            console.log(`🧪 [Phase 3.2] SpaceContext: Using cached space data for: ${currentSubdomain}`);
          }
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
          log.debug('SpaceManagement', `⚡ [SpaceContext] Using immediate cache for navigation to ${currentSubdomain}`);
          if (process.env.NODE_ENV === 'development') {
            console.log(`🧪 [Phase 3.2] SpaceContext: Using cached space data for navigation: ${currentSubdomain}`);
          }
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