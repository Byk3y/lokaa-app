import { create } from 'zustand';
import { getSupabaseClient } from '@/integrations/supabase/client';

interface Space {
  id: string;
  name: string;
  subdomain: string;
  owner_id: string;
  icon_image?: string | null;
}

interface SpaceMemberRecord {
  space_id: string;
  spaces: Space | null;
}

interface UserSpacesState {
  spaces: Space[];
  loading: boolean;
  error: string | null;
  lastFetchTime: number;
  userId: string | null;
}

interface UserSpacesStore extends UserSpacesState {
  fetchUserSpaces: (userId: string, forceRefresh?: boolean) => Promise<void>;
  preloadSpaces: (userId: string) => void;
  clearCache: () => void;
  invalidateCache: () => void;
  isStale: () => boolean;
}

// Cache TTL: 10 minutes for user spaces (they don't change as frequently)
const CACHE_TTL = 10 * 60 * 1000;

// Stale threshold: Start background refresh after 5 minutes
const STALE_THRESHOLD = 5 * 60 * 1000;

// MOBILE OPTIMIZATION: localStorage cache key
const STORAGE_KEY = 'user_spaces_cache';

// MOBILE OPTIMIZATION: Load cached spaces from localStorage
const loadCachedSpaces = (userId: string): UserSpacesState => {
  try {
    const cached = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
    if (cached) {
      const parsedCache = JSON.parse(cached);
      const now = Date.now();
      const cacheAge = now - parsedCache.lastFetchTime;
      
      // Use cache if it's less than 30 minutes old (more generous for mobile)
      if (cacheAge < 30 * 60 * 1000 && Array.isArray(parsedCache.spaces)) {
        console.log(`🚀 [UserSpacesStore] Loaded ${parsedCache.spaces.length} spaces from localStorage cache`);
        return {
          spaces: parsedCache.spaces,
          loading: false,
          error: null,
          lastFetchTime: parsedCache.lastFetchTime,
          userId: userId,
        };
      }
    }
  } catch (error) {
    console.warn('[UserSpacesStore] Error loading cached spaces:', error);
  }
  
  return {
    ...initialState,
    userId,
  };
};

// MOBILE OPTIMIZATION: Save spaces to localStorage
const saveCachedSpaces = (userId: string, spaces: Space[], lastFetchTime: number) => {
  try {
    const cacheData = {
      spaces,
      lastFetchTime,
      userId,
    };
    localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('[UserSpacesStore] Error saving spaces to cache:', error);
  }
};

const initialState: UserSpacesState = {
  spaces: [],
  loading: false,
  error: null,
  lastFetchTime: 0,
  userId: null,
};

export const useUserSpacesStore = create<UserSpacesStore>((set, get) => ({
  ...initialState,

  fetchUserSpaces: async (userId: string, forceRefresh = false) => {
    const state = get();
    const now = Date.now();
    
    // MOBILE OPTIMIZATION: If this is the first call for a user, try to load from cache
    if (state.userId !== userId) {
      const cachedState = loadCachedSpaces(userId);
      set(cachedState);
      
      // If we have cached data and it's not too old, don't force a refresh
      if (cachedState.spaces.length > 0 && !forceRefresh) {
        const cacheAge = now - cachedState.lastFetchTime;
        if (cacheAge < CACHE_TTL) {
          console.log('🚀 [UserSpacesStore] Using fresh cached data, skipping fetch');
          return;
        }
        // Cache is stale but exists, do background refresh
        console.log('🔄 [UserSpacesStore] Cached data is stale, background refresh');
      }
    }
    
    // If we have recent data for the same user and not forcing refresh, return early
    if (!forceRefresh && 
        state.userId === userId && 
        state.spaces.length > 0 && 
        now - state.lastFetchTime < CACHE_TTL) {
      console.log('🚀 [UserSpacesStore] Using cached spaces data');
      return;
    }

    // Determine if we should show loading state
    const currentState = get();
    const hasExistingSpaces = currentState.spaces.length > 0;
    
    if (currentState.userId !== userId) {
      // Different user, reset and show loading
      set({ ...initialState, userId, loading: true });
    } else if (!hasExistingSpaces) {
      // First load for this user, show loading
      set({ loading: true, error: null });
    } else {
      // Background refresh - don't show loading state
      console.log('🔄 [UserSpacesStore] Background refresh of spaces data');
    }

    try {
      // Fetch spaces owned by the user
      const { data: ownedSpaces, error: ownedError } = await getSupabaseClient()
        .from('spaces')
        .select('id, name, subdomain, owner_id, icon_image')
        .eq('owner_id', userId);

      if (ownedError) {
        console.error('[UserSpacesStore] Error fetching owned spaces:', ownedError);
      }

      // Fetch spaces the user has access to via space_members table
      const { data: memberRecords, error: memberError } = await getSupabaseClient()
        .from('space_members')
        .select(`
          space_id,
          spaces:space_id(id, name, subdomain, owner_id, icon_image)
        `)
        .eq('user_id', userId)
        .returns<SpaceMemberRecord[]>();

      if (memberError) {
        console.error('[UserSpacesStore] Error fetching joined spaces:', memberError);
      }

      const ownedSpacesArray = ownedSpaces || [];
      const joinedSpaces = memberRecords
        ?.filter((record: SpaceMemberRecord) => record.spaces !== null)
        .map((record: SpaceMemberRecord) => record.spaces as Space) || [];

      const allSpacesMap = new Map<string, Space>();
      ownedSpacesArray.forEach(space => allSpacesMap.set(space.id, space));
      joinedSpaces.forEach(space => allSpacesMap.set(space.id, space));

      const allSpaces = Array.from(allSpacesMap.values());
      
      console.log(`✅ [UserSpacesStore] Fetched ${allSpaces.length} spaces for user`);
      
      // MOBILE OPTIMIZATION: Save to localStorage cache
      saveCachedSpaces(userId, allSpaces, now);
      
      set({
        spaces: allSpaces,
        loading: false,
        error: null,
        lastFetchTime: now,
        userId,
      });
    } catch (error) {
      console.error('[UserSpacesStore] Error fetching user spaces:', error);
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch spaces',
      });
    }
  },

  preloadSpaces: (userId: string) => {
    // MOBILE OPTIMIZATION: Preload spaces from cache immediately when user logs in
    const state = get();
    if (state.userId !== userId) {
      const cachedState = loadCachedSpaces(userId);
      if (cachedState.spaces.length > 0) {
        console.log(`🚀 [UserSpacesStore] Preloaded ${cachedState.spaces.length} spaces from cache`);
        set(cachedState);
        
        // Start background refresh if cache is stale
        const now = Date.now();
        const cacheAge = now - cachedState.lastFetchTime;
        if (cacheAge > STALE_THRESHOLD) {
          console.log('🔄 [UserSpacesStore] Preloaded cache is stale, starting background refresh');
          // Use setTimeout to avoid blocking the login flow
          setTimeout(() => {
            get().fetchUserSpaces(userId);
          }, 100);
        }
      }
    }
  },

  clearCache: () => {
    console.log('🗑️ [UserSpacesStore] Clearing spaces cache');
    const state = get();
    if (state.userId) {
      try {
        localStorage.removeItem(`${STORAGE_KEY}_${state.userId}`);
      } catch (error) {
        console.warn('[UserSpacesStore] Error clearing localStorage cache:', error);
      }
    }
    set(initialState);
  },

  invalidateCache: () => {
    console.log('♻️ [UserSpacesStore] Invalidating spaces cache');
    set(state => ({ ...state, lastFetchTime: 0 }));
  },

  isStale: () => {
    const state = get();
    return Date.now() - state.lastFetchTime > STALE_THRESHOLD;
  },
}));

// Auto-cleanup: Clear cache every 15 minutes to prevent memory leaks
setInterval(() => {
  const state = useUserSpacesStore.getState();
  if (Date.now() - state.lastFetchTime > CACHE_TTL + (5 * 60 * 1000)) {
    console.log('🧹 [UserSpacesStore] Auto-cleanup: clearing stale cache');
    state.clearCache();
  }
}, 15 * 60 * 1000);

export default useUserSpacesStore; 