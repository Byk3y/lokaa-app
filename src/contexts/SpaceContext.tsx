import React, { createContext, useContext, useState, useCallback, ReactNode, useRef, useEffect } from 'react'
import { getSupabaseClient } from '@/integrations/supabase/client'
import { useOptimizedAuth } from './AuthContext'
import { useLocation } from 'react-router-dom'
import { fetchSpaceWithFallback, type SpaceFallbackData } from '@/utils/spaceDataFallback'

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
interface SpaceContextValue {
  spaceData: SpaceData | null;
  loading: boolean;
  error: Error | null;
  fetchSpaceData: (subdomain: string, force?: boolean) => Promise<SpaceData | null>;
  clearCache: () => void;
}

const SpaceContext = createContext<SpaceContextValue | undefined>(undefined)

/**
 * SpaceProvider component
 */
export function SpaceProvider({ children }: { children: ReactNode }) {
  const { user: authUser, loading: authLoading } = useOptimizedAuth()
  const location = useLocation()
  
  // FIXED: Simplified state management
  const [spaceData, setSpaceData] = useState<SpaceData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  // Simple cache for basic performance
  const spaceCache = useRef<Map<string, SpaceData>>(new Map())
  const activeFetches = useRef<Map<string, Promise<SpaceData | null>>>(new Map())

  /**
   * FIXED: Simple fetch space data without complex caching logic
   */
  const fetchSpaceData = useCallback(async (subdomain: string, force: boolean = false): Promise<SpaceData | null> => {
    if (!subdomain) {
      console.error('[Space] No subdomain provided to fetchSpaceData');
      return null;
    }

    // Wait for auth to complete if it's still loading
    if (authLoading) {
      console.log(`[Space] Auth loading, waiting for completion before fetching ${subdomain}`);
      return null;
    }

    // CRITICAL FIX: Check if we're already fetching this space with timeout protection
    const existingFetch = activeFetches.current.get(subdomain);
    if (existingFetch && !force) {
      console.log(`[Space] Already fetching ${subdomain}, returning existing promise with timeout protection`);
      
      // MOBILE FIX: Add timeout protection to prevent hanging promises
      const timeoutPromise = new Promise<SpaceData | null>((_, reject) => {
        setTimeout(() => {
          console.error(`[Space] Fetch timeout for ${subdomain}, cleaning up hanging promise`);
          activeFetches.current.delete(subdomain);
          reject(new Error(`Fetch timeout for ${subdomain}`));
        }, 8000); // 8 second timeout for mobile
      });
      
      try {
        return await Promise.race([existingFetch, timeoutPromise]);
      } catch (error) {
        console.error(`[Space] Promise race failed for ${subdomain}:`, error);
        // Clean up and retry
        activeFetches.current.delete(subdomain);
        if (!force) {
          console.log(`[Space] Retrying fetch for ${subdomain} after timeout`);
          return fetchSpaceData(subdomain, true);
        }
        return null;
      }
    }

    // Check simple cache if not forcing refresh
    if (!force) {
      const cached = spaceCache.current.get(subdomain);
      if (cached) {
        console.log(`[Space] Using cached data for ${subdomain}`);
        setSpaceData(cached);
        setError(null);
        return cached;
      }
    }

    setLoading(true);
    setError(null);

    const fetchPromise = (async () => {
      try {
        console.log(`[Space] Fetching space data for ${subdomain}`);
        
        // OPTIMIZED: Reduced timeout for better performance
        const QUERY_TIMEOUT = 4000; // Reduced to 4 seconds for better UX
        
        console.log('🔍 [SpaceContext] Query timeout:', {
          timeout: QUERY_TIMEOUT,
          subdomain
        });
        
        console.log('[Space] Starting space fetch query at:', new Date().toISOString());
        
        // POSTS PATTERN: Direct query with timeout and fallback cache
        let fetchedData = null;
        
        try {
          const { data, error } = await Promise.race([
            getSupabaseClient()
              .from('spaces')
              .select('*')
              .eq('subdomain', subdomain)
              .single(),
            new Promise<never>((_, reject) => {
              setTimeout(() => {
                console.error('[Space] Database query timeout for:', subdomain, 'after', QUERY_TIMEOUT + 'ms at:', new Date().toISOString());
                reject(new Error('Database query timeout'));
              }, QUERY_TIMEOUT);
            })
          ]);
          
          if (error) throw error;
          fetchedData = data;
          
        } catch (error) {
          console.error('[Space] Direct query failed, attempting fallback cache recovery...');
          
          // POSTS PATTERN: Try persistent cache fallback
          try {
            const persistentCacheKey = `space_fallback_${subdomain}`;
            const cachedData = localStorage.getItem(persistentCacheKey);
            if (cachedData) {
              const parsed = JSON.parse(cachedData);
              const cacheAge = Date.now() - parsed.timestamp;
              const maxFallbackAge = 24 * 60 * 60 * 1000; // 24 hours
              
              if (cacheAge < maxFallbackAge) {
                fetchedData = parsed.data;
                console.log(`✅ [Space] Using fallback cache data (${Math.round(cacheAge / 60000)} minutes old)`);
              }
            }
          } catch (cacheError) {
            console.warn('⚠️ [Space] Fallback cache read failed:', cacheError);
          }
          
          // If no fallback available, use hardcoded fallback
          if (!fetchedData) {
            fetchedData = await fetchSpaceWithFallback(subdomain, async () => {
              throw error; // This will trigger the fallback system
            });
          }
        }
          
        if (!fetchedData) {
          throw new Error(`Space not found: ${subdomain}`);
        }
        
        const spaceResult = fetchedData as unknown as SpaceData;
        
        // FIXED: Always update state and cache with fresh data
        setSpaceData(spaceResult);
        setError(null);
        
        // Update simple cache
        spaceCache.current.set(subdomain, spaceResult);
        
        // POSTS PATTERN: Save to persistent cache for future fallback
        try {
          const persistentCacheKey = `space_fallback_${subdomain}`;
          localStorage.setItem(persistentCacheKey, JSON.stringify({
            data: spaceResult,
            timestamp: Date.now()
          }));
          console.log(`💾 [Space] Saved fallback cache for future timeouts`);
        } catch (cacheError) {
          console.warn('⚠️ [Space] Failed to save fallback cache:', cacheError);
        }
        
        // ENHANCED: Update lastActiveSpace cache with complete space data for better fallbacks
        try {
          localStorage.setItem('lastActiveSpace', JSON.stringify({
            id: spaceResult.id,
            name: spaceResult.name,
            subdomain: spaceResult.subdomain,
            description: spaceResult.description,
            icon_image: spaceResult.icon_image,
            cover_image: spaceResult.cover_image,
            is_private: spaceResult.is_private,
            timestamp: Date.now()
          }));
          console.log(`[Space] Updated enhanced lastActiveSpace cache for ${subdomain}`);
        } catch (e) {
          console.warn('[Space] Failed to update lastActiveSpace cache:', e);
        }
        
        console.log(`[Space] Successfully fetched and cached ${subdomain}`);
        return spaceResult;
        
      } catch (err: unknown) {
        const errorInstance = err instanceof Error ? err : new Error(String(err));
        console.error(`[Space] Error fetching ${subdomain}: ${errorInstance.message}`);
        setError(errorInstance);
        
        // MOBILE FIX: Don't clear existing space data if it matches what we're trying to fetch
        if (spaceData?.subdomain !== subdomain) {
          setSpaceData(null);
        } else {
          console.log(`🔒 [Phase1] [SpaceContext] Keeping existing space data for ${subdomain} despite fetch error`);
        }
        
        return null;
      }
    })();

    // CRITICAL FIX: Store promise with automatic cleanup
    activeFetches.current.set(subdomain, fetchPromise);
    
    fetchPromise.finally(() => {
      setLoading(false);
      // MOBILE FIX: Always clean up the promise to prevent hanging
      activeFetches.current.delete(subdomain);
      console.log(`[Space] Cleaned up fetch promise for ${subdomain}`);
    });

    return fetchPromise;
  }, [authUser, authLoading, spaceData]);

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
      // Check if we need to fetch this space
      const needsNewData = !spaceData || spaceData.subdomain !== currentSubdomain;
      
      if (needsNewData) {
        console.log(`[SpaceContext] Auto-fetching space data for URL subdomain: ${currentSubdomain}`);
        
        console.log(`[SpaceContext] Auto-fetch debug for ${currentSubdomain}:`, {
          hasExistingData: !!spaceData,
          existingSubdomain: spaceData?.subdomain,
          authUser: !!authUser,
          authLoading,
          activeFetches: activeFetches.current.size,
          cacheSize: spaceCache.current.size
        });
        
        fetchSpaceData(currentSubdomain, false);
      }
    }
  }, [location.pathname, authUser, authLoading, spaceData, fetchSpaceData]);

  /**
   * FIXED: Simple cache clear
   */
  const clearCache = useCallback(() => {
    spaceCache.current.clear();
    setSpaceData(null);
    setError(null);
    console.log('[Space] Cleared all space cache');
  }, []);

  const value: SpaceContextValue = {
    spaceData,
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
 * Fixed: Made this a const export to be compatible with React Fast Refresh
 */
export const useSpace = () => {
  const context = useContext(SpaceContext)
  if (context === undefined) {
    throw new Error('useSpace must be used within a SpaceProvider')
  }
  return context
} 