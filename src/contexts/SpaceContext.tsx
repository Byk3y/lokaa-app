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
  
  // ENHANCED: Add debouncing for navigation-triggered fetches
  const fetchDebounceTimer = useRef<NodeJS.Timeout | null>(null)
  const lastFetchSubdomain = useRef<string | null>(null)

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
      console.log(`🔒 [SpaceContext] Query already in progress for ${subdomain}, skipping duplicate`);
      
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
        
        // OPTIMIZED: Realistic timeout for database operations
        const QUERY_TIMEOUT = 15000; // Increased to 15 seconds for reliable database operations
        
        console.log('🔍 [SpaceContext] Query timeout:', {
          timeout: QUERY_TIMEOUT,
          subdomain,
          timestamp: new Date().toISOString()
        });
        
        console.log('[Space] Starting space fetch query at:', new Date().toISOString());
        
        // POSTS PATTERN: Direct query with timeout and fallback cache
        let fetchedData = null;
        
        try {
          // ENHANCED: Better query structure with more resilient timeout handling
          const queryPromise = getSupabaseClient()
            .from('spaces')
            .select('*')
            .eq('subdomain', subdomain)
            .single();
            
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
              console.error(`❌ [Space] Fetch timeout for ${subdomain} after ${QUERY_TIMEOUT}ms, falling back to cache`);
              reject(new Error('Database query timeout'));
            }, QUERY_TIMEOUT);
          });
          
          const { data, error } = await Promise.race([queryPromise, timeoutPromise]);
          
          if (error) {
            console.warn(`[Space] Database error for ${subdomain}:`, error.message);
            throw error;
          }
          
          fetchedData = data;
          console.log(`✅ [Space] Successfully fetched ${subdomain} from database`);
          
        } catch (error) {
          console.error(`[Space] Direct query failed for ${subdomain}, attempting fallback recovery...`, error);
          
          // ENHANCED: Try multiple fallback strategies
          const fallbackStrategies = [
            // Strategy 1: Persistent localStorage cache
            async () => {
              const persistentCacheKey = `space_fallback_${subdomain}`;
              const cachedData = localStorage.getItem(persistentCacheKey);
              if (cachedData) {
                const parsed = JSON.parse(cachedData);
                const cacheAge = Date.now() - parsed.timestamp;
                const maxFallbackAge = 24 * 60 * 60 * 1000; // 24 hours
                
                if (cacheAge < maxFallbackAge) {
                  console.log(`✅ [Space] Using persistent cache fallback (${Math.round(cacheAge / 60000)} minutes old)`);
                  return parsed.data;
                }
              }
              return null;
            },
            
            // Strategy 2: Memory cache
            async () => {
              const memoryCache = spaceCache.current.get(subdomain);
              if (memoryCache) {
                console.log(`✅ [Space] Using memory cache fallback for ${subdomain}`);
                return memoryCache;
              }
              return null;
            },
            
            // Strategy 3: lastActiveSpace cache
            async () => {
              try {
                const lastActiveData = localStorage.getItem('lastActiveSpace');
                if (lastActiveData) {
                  const parsed = JSON.parse(lastActiveData);
                  if (parsed.subdomain === subdomain) {
                    console.log(`✅ [Space] Using lastActiveSpace fallback for ${subdomain}`);
                    return parsed;
                  }
                }
              } catch (e) {
                console.warn('[Space] Failed to read lastActiveSpace:', e);
              }
              return null;
            },
            
            // Strategy 4: Hardcoded fallback system
            async () => {
              console.log(`[Space] Attempting hardcoded fallback for ${subdomain}`);
              return await fetchSpaceWithFallback(subdomain, async () => {
                throw error; // This will trigger the fallback system
              });
            }
          ];
          
          // Try each strategy until one succeeds
          for (const strategy of fallbackStrategies) {
            try {
              const result = await strategy();
              if (result) {
                fetchedData = result;
                break;
              }
            } catch (strategyError) {
              console.warn(`[Space] Fallback strategy failed:`, strategyError);
            }
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
      // ENHANCED: More sophisticated check to prevent unnecessary fetches during navigation
      const needsNewData = !spaceData || spaceData.subdomain !== currentSubdomain;
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
              console.log(`⚡ [SpaceContext] Using persistent cache to avoid fetch (${Math.round(cacheAge / 60000)} minutes old)`);
            }
          }
        } catch (e) {
          console.warn('[SpaceContext] Failed to read persistent cache:', e);
        }
        
        // Strategy 2: Check lastActiveSpace cache
        if (!foundCachedData) {
          try {
            const lastActiveData = localStorage.getItem('lastActiveSpace');
            if (lastActiveData) {
              const parsed = JSON.parse(lastActiveData);
              if (parsed.subdomain === currentSubdomain) {
                foundCachedData = parsed;
                console.log(`⚡ [SpaceContext] Using lastActiveSpace cache to avoid fetch`);
              }
            }
          } catch (e) {
            console.warn('[SpaceContext] Failed to read lastActiveSpace:', e);
          }
        }
        
        // If we found cached data, use it immediately and skip database fetch
        if (foundCachedData) {
          console.log(`🚀 [SpaceContext] LOGIN OPTIMIZATION: Using cached data instead of database fetch for ${currentSubdomain}`);
          setSpaceData(foundCachedData);
          setError(null);
          // Update memory cache for future use
          spaceCache.current.set(currentSubdomain, foundCachedData);
          return; // Skip database fetch entirely
        }
        
        // Only proceed with database fetch if no cached data was found
        console.log(`⚠️ [SpaceContext] No cached data found for ${currentSubdomain}, proceeding with database fetch`);
      }
      
      // IMPROVED: Only fetch if we actually need new data and don't have it cached
      if (needsNewData && !hasActiveRequest) {
        // If we have cached data, use it immediately to prevent loading states
        if (hasCachedData) {
          const cached = spaceCache.current.get(currentSubdomain)!;
          console.log(`⚡ [SpaceContext] Using immediate cache for navigation to ${currentSubdomain}`);
          setSpaceData(cached);
          setError(null);
          return; // Don't fetch again if we have valid cache
        }
        
        // ENHANCED: Debounce rapid navigation changes
        if (fetchDebounceTimer.current) {
          clearTimeout(fetchDebounceTimer.current);
        }
        
        if (lastFetchSubdomain.current === currentSubdomain) {
          console.log(`🔄 [SpaceContext] Debouncing duplicate fetch for ${currentSubdomain}`);
          return;
        }
        
        fetchDebounceTimer.current = setTimeout(() => {
          console.log(`[SpaceContext] Auto-fetching space data for URL subdomain: ${currentSubdomain}`);
          
          console.log(`[SpaceContext] Auto-fetch debug for ${currentSubdomain}:`, {
            hasExistingData: !!spaceData,
            existingSubdomain: spaceData?.subdomain,
            authUser: !!authUser,
            authLoading,
            activeFetches: activeFetches.current.size,
            cacheSize: spaceCache.current.size,
            needsNewData,
            hasActiveRequest,
            hasCachedData
          });
          
          lastFetchSubdomain.current = currentSubdomain;
          fetchSpaceData(currentSubdomain, false);
        }, 100); // 100ms debounce for navigation
        
      } else if (needsNewData && hasActiveRequest) {
        console.log(`⏳ [SpaceContext] Fetch already in progress for ${currentSubdomain}, waiting...`);
      } else if (!needsNewData) {
        console.log(`✅ [SpaceContext] Current space data already matches ${currentSubdomain}, no fetch needed`);
      }
    }
    
    // Cleanup function
    return () => {
      if (fetchDebounceTimer.current) {
        clearTimeout(fetchDebounceTimer.current);
        fetchDebounceTimer.current = null;
      }
    };
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
 * FIXED: Named function for Fast Refresh compatibility
 */
export function useSpace() {
  const context = useContext(SpaceContext)
  if (context === undefined) {
    throw new Error('useSpace must be used within a SpaceProvider')
  }
  return context
}