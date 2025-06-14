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
  clearCache: () => void;
  invalidateCache: () => void;
  isStale: () => boolean;
}

// Cache TTL: 10 minutes for user spaces (they don't change as frequently)
const CACHE_TTL = 10 * 60 * 1000;

// Stale threshold: Start background refresh after 5 minutes
const STALE_THRESHOLD = 5 * 60 * 1000;

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
    
    // If we have recent data for the same user and not forcing refresh, return early
    if (!forceRefresh && 
        state.userId === userId && 
        state.spaces.length > 0 && 
        now - state.lastFetchTime < CACHE_TTL) {
      console.log('🚀 [UserSpacesStore] Using cached spaces data');
      return;
    }

    // If this is a different user, reset state
    if (state.userId !== userId) {
      set({ ...initialState, userId, loading: true });
    } else if (state.spaces.length === 0) {
      // First load for this user
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

  clearCache: () => {
    console.log('🗑️ [UserSpacesStore] Clearing spaces cache');
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