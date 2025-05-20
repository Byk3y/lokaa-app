import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
  clearCache: (subdomain?: string) => void;
  cachedSubdomains: string[];
}

// Set a reasonable TTL for cached data (in milliseconds)
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes (increased from 30 seconds)

// Debounce delay for visibility change refresh (in milliseconds)
const VISIBILITY_DEBOUNCE_DELAY = 60 * 1000; // 60 seconds (increased from 2 seconds)

// Minimum time between refreshes (to prevent excessive refreshes on tab switching)
const REFRESH_COOLDOWN = 60 * 1000; // 60 seconds (increased from 10 seconds)

// Retry mechanism constants
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000; // 1 second

// Create context with default values
const SpaceContext = createContext<SpaceContextValue>({
  spaceData: null,
  loading: false,
  error: null,
  fetchSpaceData: async () => null,
  clearCache: () => {},
  cachedSubdomains: []
});

/**
 * SpaceProvider component
 */
export function SpaceProvider({ children }: { children: ReactNode }) {
  const [spaceData, setSpaceData] = useState<SpaceData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const { user: authUser, loading: authLoading } = useAuth();
  
  // In-memory cache for space data
  const spaceCache = useRef<Map<string, { data: SpaceData, timestamp: number }>>(new Map());
  const activeFetches = useRef<Map<string, Promise<SpaceData | null>>>(new Map());
  
  // Ref for tracking debounce timer and last refresh timestamp
  const visibilityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshTimeRef = useRef<Map<string, number>>(new Map());
  
  /**
   * Fetch space data with caching
   */
  const fetchSpaceData = useCallback(async (subdomain: string, force: boolean = false): Promise<SpaceData | null> => {
    if (!subdomain) {
      console.error('[Space] No subdomain provided to fetchSpaceData');
      return null;
    }

    // --- START AUTH GUARD ---
    if (authLoading) {
      console.log(`[Space] Waiting for authentication to complete before fetching ${subdomain}.`);
      // setLoading(true); // Consider if UI should show loading during auth wait
      return null; 
    }

    if (!authUser) {
      console.log(`[Space] No authenticated user. Cannot fetch private space data for ${subdomain}.`);
      setError(new Error('Authentication required to fetch space data.')); 
      if (spaceData !== null) setSpaceData(null); // Clear data if user logs out
      setLoading(false); 
      return null; 
    }
    // --- END AUTH GUARD ---
    
    if (activeFetches.current.has(subdomain)) {
      console.log(`[Space] Reusing in-flight request for ${subdomain}`);
      return activeFetches.current.get(subdomain) as Promise<SpaceData | null>;
    }
    
    try {
      setLoading(true);
      
      if (!force) {
        const cached = spaceCache.current.get(subdomain);
        const now = Date.now();
        
        if (cached && (now - cached.timestamp < CACHE_TTL)) {
          console.log(`[Space] Using memory-cached data for ${subdomain}`);
          // Smart setSpaceData: only update if different
          if (spaceData?.id !== cached.data.id || spaceData?.updated_at !== cached.data.updated_at) {
          setSpaceData(cached.data);
          }
          setError(null);
          setLoading(false);
          return cached.data;
        }
      }
      
      try {
        const cacheKey = `space_data_${subdomain}`;
        const cachedJSON = sessionStorage.getItem(cacheKey);
        
        if (cachedJSON && !force) {
          try {
            const cachedSessionData = JSON.parse(cachedJSON) as SpaceData;
            console.log(`[Space] Quick recovery from sessionStorage for ${subdomain}`);
            // Smart setSpaceData: only update if different, especially if current spaceData is null
            if (spaceData === null || spaceData?.id !== cachedSessionData.id || spaceData?.updated_at !== cachedSessionData.updated_at) {
              setSpaceData(cachedSessionData);
            }
          } catch (parseError) {
            console.warn(`[Space] Failed to parse cached data: ${parseError}`);
          }
        }
      } catch (storageError) {
        console.warn(`[Space] SessionStorage error: ${storageError}`);
      }
      
      const fetchPromise = (async () => {
        let retries = 0;
        let lastError: Error | null = null;
        let operationSuccessful = false; 
        let fetchedSpaceResult: SpaceData | null = null;

        while (retries < MAX_RETRIES && !operationSuccessful) {
        try {
            console.log(`[Space] Attempting to fetch space data for ${subdomain} (Attempt: ${retries + 1})`);
            const { data: supabaseFetchedData, error: supabaseError } = await supabase
            .from('spaces')
            .select('*')
            .eq('subdomain', subdomain)
            .single();
            
            if (supabaseError) {
              console.warn(`[Space] Supabase error for ${subdomain} (not retrying): ${supabaseError.message}`);
              lastError = new Error(`Failed to fetch space: ${supabaseError.message}`);
              break; 
          }
          
          if (!supabaseFetchedData) {
              console.warn(`[Space] Space not found: ${subdomain} (or RLS prevents access, not retrying).`);
              lastError = new Error(`Space not found: ${subdomain}`);
              break; 
          }
          
            fetchedSpaceResult = supabaseFetchedData as unknown as SpaceData;
          
            // Smart setSpaceData: only update if different
            if (spaceData?.id !== fetchedSpaceResult.id || spaceData?.updated_at !== fetchedSpaceResult.updated_at) {
              setSpaceData(fetchedSpaceResult); 
            }
          setError(null);
            spaceCache.current.set(subdomain, { data: fetchedSpaceResult, timestamp: Date.now() });
          try {
            const cacheKey = `space_data_${subdomain}`;
              sessionStorage.setItem(cacheKey, JSON.stringify(fetchedSpaceResult));
            console.log(`[Space] Cached space data to sessionStorage for ${subdomain}`);
          } catch (storageError) {
            console.warn(`[Space] Failed to cache to sessionStorage: ${storageError}`);
          }
            lastRefreshTimeRef.current.set(subdomain, Date.now());
            operationSuccessful = true; 
          
        } catch (err: unknown) {
            lastError = err instanceof Error ? err : new Error(String(err));
            console.error(`[Space] Error fetching ${subdomain} (attempt ${retries + 1}/${MAX_RETRIES}): ${lastError.message}`);

            const isRetryableError =
              lastError.message.toLowerCase().includes('failed to fetch') ||
              lastError.message.toLowerCase().includes('networkerror') ||
              lastError.message.toLowerCase().includes('err_name_not_resolved');

            if (isRetryableError && retries < MAX_RETRIES - 1) {
              retries++;
              console.log(`[Space] Retrying fetch for ${subdomain} in ${RETRY_DELAY_MS}ms...`);
              await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
            } else {
              break; 
            }
          }
        } 

        if (!operationSuccessful) {
          console.error(`[Space] Failed to fetch ${subdomain} after ${MAX_RETRIES} attempts. Last error: ${lastError?.message}`);
          setError(lastError); 
          // Only clear spaceData if the failed fetch was for the currently loaded space
          if (spaceData?.subdomain === subdomain) {
            setSpaceData(null);
          }
        }
        
        return fetchedSpaceResult; 

      })().finally(() => { 
         setLoading(false);
          activeFetches.current.delete(subdomain);
         console.log(`[Space] Fetch operation for ${subdomain} completed. Loading: ${loading}`); // Note: loading state here might be stale due to closure
      });
      
      activeFetches.current.set(subdomain, fetchPromise);
      return fetchPromise;
    } catch (err: unknown) {
      const errorInstance = err instanceof Error ? err : new Error(String(err));
      console.error(`[Space] Unexpected error in fetchSpaceData: ${errorInstance.message}`);
      setError(errorInstance);
      setLoading(false);
      activeFetches.current.delete(subdomain);
      return null;
    }
  }, [authUser, authLoading, spaceData]); // Added spaceData to useCallback dependencies for smart setSpaceData
  
  /**
   * Clear the cache for specific subdomain or all cached spaces
   */
  const clearCache = useCallback((subdomain?: string) => {
    if (subdomain) {
      spaceCache.current.delete(subdomain);
      sessionStorage.removeItem(`space_data_${subdomain}`);
      console.log(`[Space] Cleared cache for ${subdomain}`);
    } else {
      spaceCache.current.clear();
      // Consider iterating sessionStorage keys if a prefix was used for all space data
      // For now, this only clears the memory cache fully.
      console.log('[Space] Cleared all in-memory space cache');
      }
    // To reflect change in cachedSubdomains if it's part of context value
    // This is a placeholder, actual update depends on how cachedSubdomains is exposed
    // setCachedSubdomainsForContext([...spaceCache.current.keys()]); 
  }, []);
  
  // Generate cachedSubdomains for context (memoized)
  const cachedSubdomains = useMemo(() => {
    return Array.from(spaceCache.current.keys());
  }, [spaceCache.current]); // This will update when cache changes, but Array.from creates new ref.
                           // A more robust solution might involve another state for this if strict ref equality is needed by consumers.
                           // For now, this is better than recalculating on every render.

  // Memoize the context value
  const contextValue = useMemo(() => ({
    spaceData,
    loading,
    error,
    fetchSpaceData,
    clearCache,
    cachedSubdomains 
  }), [spaceData, loading, error, fetchSpaceData, clearCache, cachedSubdomains]);
  
  /**
   * Refresh stale space data with proper debouncing
   * Returns true if any refreshes were triggered
   */
  const refreshStaleSpaceData = useCallback(() => {
    const now = Date.now();
    let refreshNeeded = false;
    
    spaceCache.current.forEach((cached, subdomain) => {
      const lastRefreshTime = lastRefreshTimeRef.current.get(subdomain) || 0;
      const timeSinceLastRefresh = now - lastRefreshTime;
      
      // Only refresh if:
      // 1. The cache is significantly stale (> 10x CACHE_TTL to be more conservative)
      // 2. We haven't refreshed recently (> REFRESH_COOLDOWN)
      if (now - cached.timestamp > (CACHE_TTL * 10) && timeSinceLastRefresh > REFRESH_COOLDOWN) {
        console.log(`[Space] Refreshing very stale cache for ${subdomain} on visibility change`);
        refreshNeeded = true;
        
        // If this matches the current space data, refresh it
        if (spaceData && spaceData.subdomain === subdomain) {
          // Record this refresh time
          lastRefreshTimeRef.current.set(subdomain, now);
          
          fetchSpaceData(subdomain, true).catch(err => {
            console.error(`[Space] Error refreshing space data: ${err}`);
          });
        }
      } else if (now - cached.timestamp > CACHE_TTL) {
        console.log(`[Space] Cache is stale, but skipping refresh on visibility change (${Math.round(timeSinceLastRefresh/1000)}s < ${REFRESH_COOLDOWN/1000}s cooldown)`);
      }
    });
    
    if (!refreshNeeded) {
      console.log('[Space] No stale cache to refresh on visibility change');
    }
    
    return refreshNeeded;
  }, [spaceData, fetchSpaceData]);
  
  /**
   * Handle visibility changes to refresh data when tab is focused
   * Uses debouncing to prevent excessive refreshes on rapid tab switching
   */
  useEffect(() => {
    // Only set up the visibility listener if we have a user
    if (!authUser) return;
    
    const handleVisibilityChange = () => {
      // Track visibility change events for debugging
      if (document.visibilityState === 'visible') {
        console.log('[Space Debug] Document visibility changed: visible at ' + new Date().toLocaleString());
        console.log('[Space Debug] Window focused at ' + new Date().toLocaleString());
        console.log('[MembershipContext] Tab became visible. Clearing ongoingRequests to prevent stale checks.');
        console.log('[MembershipContext] ongoingRequests cleared. Size: 0');
        
        // Skip refresh on most visibility changes to avoid unnecessary re-renders
        // Only set up rare refresh for very stale data (handled by higher CACHE_TTL)
        if (Math.random() < 0.1) { // Only run refresh logic 10% of the time for visibility changes
        console.log('[Space] Tab became visible, setting up debounced refresh');
        
        // Clear any existing timeout to implement debouncing
        if (visibilityTimeoutRef.current) {
          clearTimeout(visibilityTimeoutRef.current);
        }
        
          // Set a new timeout for the debounced refresh, but with a longer delay
        visibilityTimeoutRef.current = setTimeout(() => {
          console.log(`[Space] Debounce period (${VISIBILITY_DEBOUNCE_DELAY}ms) elapsed, checking for stale data`);
          refreshStaleSpaceData();
          visibilityTimeoutRef.current = null;
        }, VISIBILITY_DEBOUNCE_DELAY);
        }
      } else {
        console.log('[Space Debug] Document visibility changed: hidden at ' + new Date().toLocaleString());
        
        // Tab is hidden, clear any pending timeout
        if (visibilityTimeoutRef.current) {
          console.log('[Space] Tab hidden, cancelling pending refresh');
          clearTimeout(visibilityTimeoutRef.current);
          visibilityTimeoutRef.current = null;
        }
      }
    };
    
    // Register the visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Clean up the listener and any pending timeout on unmount
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current);
        visibilityTimeoutRef.current = null;
      }
    };
  }, [authUser, refreshStaleSpaceData]);
  
  // Effect to clear space data if user logs out
  useEffect(() => {
    if (!authLoading && !authUser && spaceData !== null) {
      console.log('[Space] User logged out, clearing space data.');
      setSpaceData(null);
      setError(null); 
      // spaceCache.current.clear(); // Optionally clear full cache on logout
      // sessionStorage.clear(); // Be careful with clearing all sessionStorage
    }
  }, [authLoading, authUser, spaceData]);
  
  return <SpaceContext.Provider value={contextValue}>{children}</SpaceContext.Provider>;
}

/**
 * Custom hook to use the space context
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useSpace() {
  const context = useContext(SpaceContext);
  
  if (!context) {
    throw new Error('useSpace must be used within a SpaceProvider');
  }
  
  return context;
} 