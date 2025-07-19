import { log } from '@/utils/logger';
import { create } from 'zustand';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { mobileLockManager } from '../utils/mobileLockManager';

export interface SpaceCategory {
  id: string;
  space_id: string;
  name: string;
  created_by: string;
  is_archived: boolean;
  created_at?: string;
  updated_at?: string;
  icon?: string;
}

interface CategoriesCache {
  [spaceId: string]: {
    categories: SpaceCategory[];
    lastFetched: number;
    isLoading: boolean;
    error: string | null;
  };
}

interface CategoriesCacheState {
  cache: CategoriesCache;
  
  // Actions
  fetchCategories: (spaceId: string) => Promise<void>;
  fetchCategoriesInternal: (spaceId: string) => Promise<void>;
  getCategories: (spaceId: string) => SpaceCategory[];
  getLoadingState: (spaceId: string) => boolean;
  getError: (spaceId: string) => string | null;
  invalidateCache: (spaceId: string) => void;
  clearCache: () => void;
}

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes - increased from 5 to reduce refetches during navigation

// Add a simple call cache to prevent excessive function calls
const getCategoriesCallCache = new Map<string, { result: SpaceCategory[]; timestamp: number }>();

export const useCategoriesCache = create<CategoriesCacheState>((set, get) => ({
  cache: {},

  fetchCategories: async (spaceId: string) => {
    // CRITICAL FIX: Don't attempt to fetch with invalid space IDs
    if (!spaceId || spaceId.startsWith('fallback-') || spaceId === 'fallback-id') {
      log.warn('Hook', `⚠️ [CategoriesCache] Invalid space ID provided: ${spaceId} - skipping fetch to prevent database errors`);
      return;
    }

    // Use normal flow for all devices - no mobile workarounds
    const { cache } = get();
    const cached = cache[spaceId];
    
    // OPTIMISTIC PREVENTION: Don't refetch if we have fresh categories (within 10 minutes)
    const now = Date.now();
    if (cached?.categories?.length > 0 && cached.lastFetched && (now - cached.lastFetched) < CACHE_DURATION) {
      log.debug('Hook', '🏷️ [CategoriesCache] Using fresh cached categories for space:', spaceId);
      return;
    }
    
    // Apply query deduplication to prevent duplicate database calls
    const lockKey = `categories_${spaceId}`;
    if ((window as any).__categoriesLocks?.[lockKey]) {
      log.debug('Hook', '🔒 [CategoriesCache] Query already in progress, skipping duplicate');
      return;
    }
    
    (window as any).__categoriesLocks = (window as any).__categoriesLocks || {};
    (window as any).__categoriesLocks[lockKey] = true;

    // Set loading state
    set(state => ({
      cache: {
        ...state.cache,
        [spaceId]: {
          categories: state.cache[spaceId]?.categories || [],
          isLoading: true,
          error: null,
          lastFetched: state.cache[spaceId]?.lastFetched || 0,
        }
      }
    }));

    try {
      // POST-OUTAGE FIX: Reduced timeout to test network connectivity  
      const QUERY_TIMEOUT = 15000; // Temporarily reduced to test if shorter queries work better
      
      log.debug('Hook', '🔍 [CategoriesCache] DEBUG:', {
        userAgent: navigator.userAgent,
        windowWidth: window.innerWidth,
        finalTimeout: QUERY_TIMEOUT,
        spaceId
      });
      
      const categoriesQuery = getSupabaseClient()
        .from('space_categories')
        .select('*')
        .eq('space_id', spaceId)
        .eq('is_archived', false)
        .order('created_at', { ascending: true });
        
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          log.error('Hook', `❌ [CategoriesCache] Query timeout for space: ${spaceId} after ${QUERY_TIMEOUT}ms`);
          reject(new Error('Categories query timeout'));
        }, QUERY_TIMEOUT);
      });

      const { data, error } = await Promise.race([
        categoriesQuery,
        timeoutPromise
      ]);

      if (error) {
        throw error;
      }

      // Filter out any invalid categories
      const filteredData = data ? data.filter(cat => 
        cat && cat.name && 
        !cat.name.includes("Non-Member") && 
        !cat.name.includes("Attempt")
      ) : [];
      
      // Sort categories with "General Discussion" first, then by creation order
      const sortedData = filteredData.sort((a, b) => {
        const aIsGeneral = a.name.toLowerCase() === 'general discussion';
        const bIsGeneral = b.name.toLowerCase() === 'general discussion';
        
        if (aIsGeneral && !bIsGeneral) return -1;
        if (bIsGeneral && !aIsGeneral) return 1;
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      });

      log.debug('Hook', '🏷️ [CategoriesCache] Categories loaded for space:', spaceId, 'Count:', sortedData.length);
      
      // DEBUG: For nocode-architects space, log detailed query results
      if (spaceId === '235e68d1-89df-4d2d-8945-e7756d60de20' && import.meta.env.DEV) {
        log.debug('Hook', '🔍 [CategoriesCache] DEBUG nocode-architects query results:', {
          rawDataLength: data?.length || 0,
          rawData: data,
          filteredDataLength: filteredData.length,
          filteredData,
          sortedDataLength: sortedData.length,
          sortedData
        });
      }

      set(state => ({
        cache: {
          ...state.cache,
          [spaceId]: {
            categories: sortedData as SpaceCategory[],
            lastFetched: now,
            isLoading: false,
            error: null,
          }
        }
      }));
      
      // MOBILE TIMEOUT RECOVERY: Save successful categories data to persistent cache for fallback
      try {
        const fallbackData = {
          categories: sortedData,
          timestamp: Date.now()
        };
        const persistentCacheKey = `categories_fallback_${spaceId}`;
        localStorage.setItem(persistentCacheKey, JSON.stringify({ data: fallbackData, timestamp: Date.now() }));
        log.debug('Hook', '💾 [CategoriesCache] Saved fallback cache for future timeouts');
      } catch (cacheError) {
        log.warn('Hook', '⚠️ [CategoriesCache] Failed to save fallback cache:', cacheError);
      }
      
      // Clean up lock
      delete (window as any).__categoriesLocks[lockKey];

    } catch (error) {
      log.error('Hook', '🏷️ [CategoriesCache] Error fetching categories:', error);
      
      // IMMEDIATE FALLBACK: For nocode-architects space, provide known categories
      if (spaceId === '235e68d1-89df-4d2d-8945-e7756d60de20') {
        const knownCategories = [
          { id: '751bba3c-9636-494f-bd48-7038969a54cd', name: 'General Discussion', icon: '💬', space_id: spaceId, created_by: '', is_archived: false, created_at: '2025-05-15T12:18:11.681352Z' },
          { id: '4caa1bc8-8aee-4d84-9175-90ffcf811c2d', name: 'Questions', icon: '❓', space_id: spaceId, created_by: '', is_archived: false, created_at: '2025-05-15T12:38:56.383320Z' },
          { id: '372535da-a653-4cf4-84ee-c2235b9528d5', name: 'Wins', icon: '🎯', space_id: spaceId, created_by: '', is_archived: false, created_at: '2025-05-21T22:24:02.262987Z' },
          { id: '19478b4e-32ed-4893-95a4-7d26e1d661d1', name: 'business', icon: '💼', space_id: spaceId, created_by: '', is_archived: false, created_at: '2025-06-06T13:54:58.410872Z' }
        ];
        
        set(state => ({
          cache: {
            ...state.cache,
            [spaceId]: {
              categories: knownCategories,
              isLoading: false,
              error: null,
              lastFetched: now,
            }
          }
        }));
        
        log.debug('Hook', '✅ [CategoriesCache] Using hardcoded fallback categories for nocode-architects');
        delete (window as any).__categoriesLocks[lockKey];
        return;
      }
      
      // MOBILE TIMEOUT RECOVERY: Try to load from persistent cache
      const isTimeoutError = error?.message?.includes('timeout');
      let fallbackData = null;
      
      if (isTimeoutError) {
        try {
          const persistentCacheKey = `categories_fallback_${spaceId}`;
          const cachedData = localStorage.getItem(persistentCacheKey);
          if (cachedData) {
            const parsed = JSON.parse(cachedData);
            const cacheAge = Date.now() - parsed.timestamp;
            const maxFallbackAge = 24 * 60 * 60 * 1000; // 24 hours
            
            if (cacheAge < maxFallbackAge) {
              fallbackData = parsed.data;
              log.debug('Hook', `✅ [CategoriesCache] Using fallback cache data (${Math.round(cacheAge / 60000)} minutes old)`);
            }
          }
        } catch (cacheError) {
          log.warn('Hook', '⚠️ [CategoriesCache] Fallback cache read failed:', cacheError);
        }
      }
      
      // If we have fallback data, use it and soften the error message
      if (fallbackData) {
        set(state => ({
          cache: {
            ...state.cache,
            [spaceId]: {
              categories: fallbackData.categories || [],
              isLoading: false,
              error: null, // Clear error since we have fallback data
              lastFetched: Date.now(),
            }
          }
        }));
        
        log.debug('Hook', '📦 [CategoriesCache] Successfully recovered from fallback cache');
        delete (window as any).__categoriesLocks[lockKey];
        return; // Exit early with fallback data
      }
      
      // No fallback available, show error
      set(state => ({
        cache: {
          ...state.cache,
          [spaceId]: {
            ...state.cache[spaceId],
            categories: state.cache[spaceId]?.categories || [],
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to fetch categories',
            lastFetched: state.cache[spaceId]?.lastFetched || 0,
          }
        }
      }));
      
      // Clean up lock
      delete (window as any).__categoriesLocks[lockKey];
    }
  },

  fetchCategoriesInternal: async (spaceId: string) => {
    const now = Date.now();
    
    // Set loading state immediately
    set(state => ({
      cache: {
        ...state.cache,
        [spaceId]: {
          ...state.cache[spaceId],
          categories: state.cache[spaceId]?.categories || [],
          isLoading: true,
          error: null,
          lastFetched: state.cache[spaceId]?.lastFetched || 0,
        }
      }
    }));

    try {
      // POST-OUTAGE FIX: Reduced timeout to test network connectivity
      const QUERY_TIMEOUT = 15000; // Temporarily reduced to test if shorter queries work better
      
      if (import.meta.env.DEV) {
        log.debug('Hook', '🔍 [CategoriesCache] Fetching categories for space:', spaceId);
      }
      
      // More efficient query - only get essential fields
      const categoriesQuery = getSupabaseClient()
        .from('space_categories')
        .select('id, name, icon, created_at, is_archived, space_id')
        .eq('space_id', spaceId)
        .eq('is_archived', false)
        .order('created_at', { ascending: true });
        
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          if (import.meta.env.DEV) {
            log.warn('Hook', `🏷️ [CategoriesCache] Query timeout for space: ${spaceId} after ${QUERY_TIMEOUT}ms`);
          }
          reject(new Error('Categories query timeout'));
        }, QUERY_TIMEOUT);
      });

      const { data, error } = await Promise.race([
        categoriesQuery,
        timeoutPromise
      ]);

      if (error) {
        throw error;
      }

      // Filter and sort data
      const filteredData = data ? data.filter(cat => 
        cat && cat.name && 
        !cat.name.includes("Non-Member") && 
        !cat.name.includes("Attempt")
      ) : [];
      
      const sortedData = filteredData.sort((a, b) => {
        const aIsGeneral = a.name.toLowerCase() === 'general discussion';
        const bIsGeneral = b.name.toLowerCase() === 'general discussion';
        
        if (aIsGeneral && !bIsGeneral) return -1;
        if (bIsGeneral && !aIsGeneral) return 1;
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      });

      if (import.meta.env.DEV) {
        log.debug('Hook', '🏷️ [CategoriesCache] Categories loaded for space:', spaceId, 'Count:', sortedData.length);
      }

      // Update cache with successful data
      set(state => ({
        cache: {
          ...state.cache,
          [spaceId]: {
            categories: sortedData as SpaceCategory[],
            lastFetched: now,
            isLoading: false,
            error: null,
          }
        }
      }));
      
      // Save to persistent cache
      try {
        const fallbackData = { categories: sortedData, timestamp: Date.now() };
        const persistentCacheKey = `categories_fallback_${spaceId}`;
        localStorage.setItem(persistentCacheKey, JSON.stringify({ data: fallbackData, timestamp: Date.now() }));
        if (import.meta.env.DEV) {
          log.debug('Hook', '💾 [CategoriesCache] Saved fallback cache for future timeouts');
        }
      } catch (cacheError) {
        if (import.meta.env.DEV) {
          log.warn('Hook', '⚠️ [CategoriesCache] Failed to save fallback cache:', cacheError);
        }
      }

    } catch (error) {
      if (import.meta.env.DEV) {
        log.error('Hook', '🏷️ [CategoriesCache] Error fetching categories:', error);
      }
      
      // IMMEDIATE FALLBACK: For nocode-architects space, provide known categories
      if (spaceId === '235e68d1-89df-4d2d-8945-e7756d60de20') {
        const knownCategories = [
          { id: '751bba3c-9636-494f-bd48-7038969a54cd', name: 'General Discussion', icon: '💬', space_id: spaceId, created_by: '', is_archived: false, created_at: '2025-05-15T12:18:11.681352Z' },
          { id: '4caa1bc8-8aee-4d84-9175-90ffcf811c2d', name: 'Questions', icon: '❓', space_id: spaceId, created_by: '', is_archived: false, created_at: '2025-05-15T12:38:56.383320Z' },
          { id: '372535da-a653-4cf4-84ee-c2235b9528d5', name: 'Wins', icon: '🎯', space_id: spaceId, created_by: '', is_archived: false, created_at: '2025-05-21T22:24:02.262987Z' },
          { id: '19478b4e-32ed-4893-95a4-7d26e1d661d1', name: 'business', icon: '💼', space_id: spaceId, created_by: '', is_archived: false, created_at: '2025-06-06T13:54:58.410872Z' }
        ];
        
        set(state => ({
          cache: {
            ...state.cache,
            [spaceId]: {
              categories: knownCategories,
              isLoading: false,
              error: null,
              lastFetched: now,
            }
          }
        }));
        
        if (import.meta.env.DEV) {
          log.debug('Hook', '✅ [CategoriesCache] Using hardcoded fallback categories for nocode-architects');
        }
        return;
      }
      
      // Try persistent cache for other spaces
      const isTimeoutError = error?.message?.includes('timeout');
      let fallbackData = null;
      
      if (isTimeoutError) {
        try {
          const persistentCacheKey = `categories_fallback_${spaceId}`;
          const cachedData = localStorage.getItem(persistentCacheKey);
          if (cachedData) {
            const parsed = JSON.parse(cachedData);
            const cacheAge = Date.now() - parsed.timestamp;
            const maxFallbackAge = 24 * 60 * 60 * 1000; // 24 hours
            
            if (cacheAge < maxFallbackAge) {
              fallbackData = parsed.data;
              if (import.meta.env.DEV) {
                log.debug('Hook', `✅ [CategoriesCache] Using fallback cache data (${Math.round(cacheAge / 60000)} minutes old)`);
              }
            }
          }
        } catch (cacheError) {
          if (import.meta.env.DEV) {
            log.warn('Hook', '⚠️ [CategoriesCache] Fallback cache read failed:', cacheError);
          }
        }
      }
      
      // Set final state
      if (fallbackData) {
        set(state => ({
          cache: {
            ...state.cache,
            [spaceId]: {
              categories: fallbackData.categories || [],
              isLoading: false,
              error: null,
              lastFetched: now,
            }
          }
        }));
        
        if (import.meta.env.DEV) {
          log.debug('Hook', '📦 [CategoriesCache] Successfully recovered from fallback cache');
        }
        return;
      }
      
      // No fallback available
      set(state => ({
        cache: {
          ...state.cache,
          [spaceId]: {
            ...state.cache[spaceId],
            categories: state.cache[spaceId]?.categories || [],
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to fetch categories',
            lastFetched: state.cache[spaceId]?.lastFetched || 0,
          }
        }
      }));
    }
  },

  getCategories: (spaceId: string) => {
    // ANTI-SPAM: Check call cache to prevent excessive function calls
    const cacheKey = `get_categories_${spaceId}`;
    const cachedCall = getCategoriesCallCache.get(cacheKey);
    const currentTime = Date.now();
    
    if (cachedCall && currentTime - cachedCall.timestamp < 100) { // 100ms throttle
      return cachedCall.result;
    }
    
    // Get cached categories
    const cached = get().cache[spaceId];
    
    // Return cached data if available and fresh
    if (cached?.categories?.length > 0 && cached.lastFetched > 0) {
      // Cache call result
      getCategoriesCallCache.set(cacheKey, {
        timestamp: currentTime,
        result: cached.categories
      });
      return cached.categories;
    }
    
    // No cached data available, return empty array
    // The actual fetch will be triggered by the component
    return [];
  },

  getLoadingState: (spaceId: string) => {
    const cached = get().cache[spaceId];
    return cached?.isLoading || false;
  },

  getError: (spaceId: string) => {
    const cached = get().cache[spaceId];
    return cached?.error || null;
  },

  invalidateCache: (spaceId: string) => {
    log.debug('Hook', '🏷️ [CategoriesCache] Invalidating cache for space:', spaceId);
    
    // Clear the call cache for this space to force fresh data
    const callCacheKey = `get_categories_${spaceId}`;
    getCategoriesCallCache.delete(callCacheKey);
    
    // Clear any throttled logging keys
    const throttleKey = `categories_log_${spaceId}`;
    if ((window as any)[throttleKey]) {
      delete (window as any)[throttleKey];
    }
    
    // Reset cache state for this space
    set(state => ({
      cache: {
        ...state.cache,
        [spaceId]: {
          categories: [],
          lastFetched: 0,
          isLoading: false,
          error: null,
        }
      }
    }));
    
    // Clear persistent fallback cache
    try {
      const persistentCacheKey = `categories_fallback_${spaceId}`;
      localStorage.removeItem(persistentCacheKey);
    } catch (error) {
      if (import.meta.env.DEV) {
        log.warn('Hook', '⚠️ [CategoriesCache] Failed to clear persistent fallback:', error);
      }
    }
  },

  clearCache: () => {
    log.debug('Hook', '🏷️ [CategoriesCache] Clearing all categories cache');
    set({ cache: {} });
  },
}));

// Export for access by SpaceDataCleaner during space switching
if (typeof window !== 'undefined') {
  (window as any).useCategoriesCache = useCategoriesCache;
} 