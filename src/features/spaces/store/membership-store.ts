import { log } from '@/utils/logger';
/**
 * Membership Store
 * 
 * This store manages membership state using Zustand.
 * It will replace the React Context-based membership management system.
 * 
 * Enhanced membership state management with caching.
 */

import { create } from 'zustand';
import { toast } from '@/hooks/use-toast';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { membershipApi } from '@/features/spaces';
import { 
  MemberRole, 
  MemberStatus, 
  MembershipState, 
  SpaceMember, 
  FetchMembersOptions,
  MembershipCache
} from '../types/membership';
import { debounce } from '@/utils/performanceOptimization';
import { useUserSpacesStore } from '@/hooks/useUserSpacesStore';


// FIXED: Increased cache TTL to 5 minutes for better performance
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// FIXED: Extended localStorage cache TTL to 10 minutes for member access
const LOCALSTORAGE_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// FIXED: Enhanced cache utilities for instant member access (moved to top)
const getCacheKey = (userId: string, spaceId: string) => `${userId}_${spaceId}`;

const getLocalStorageCacheKey = (userId: string, spaceSubdomain: string) => `membership_${userId}_${spaceSubdomain}`;

// FIXED: Store membership in localStorage for instant access on next visit
const storeMembershipInLocalStorage = (userId: string, spaceSubdomain: string, membershipData: MembershipState) => {
  try {
    const cacheData = {
      ...membershipData,
      timestamp: Date.now()
    };
    localStorage.setItem(getLocalStorageCacheKey(userId, spaceSubdomain), JSON.stringify(cacheData));
  } catch (error) {
    log.warn('App', 'Failed to cache membership in localStorage:', error);
  }
};

// FIXED: Retrieve membership from localStorage for instant access
const getMembershipFromLocalStorage = (userId: string, spaceSubdomain: string): MembershipState | null => {
  try {
    const cached = localStorage.getItem(getLocalStorageCacheKey(userId, spaceSubdomain));
    if (!cached) return null;
    
    const cacheData = JSON.parse(cached);
    const isValid = cacheData.timestamp && (Date.now() - cacheData.timestamp) < LOCALSTORAGE_CACHE_TTL;
    
    if (isValid) {
      log.debug('App', '🚀 [MembershipStore] Using localStorage cache for instant access');
      return {
        isMember: cacheData.isMember,
        isOwner: cacheData.isOwner,
        isAdmin: cacheData.isAdmin,
        role: cacheData.role,
        status: cacheData.status,
        loading: false,
        error: null
      };
    } else {
      // Clean up expired cache
      localStorage.removeItem(getLocalStorageCacheKey(userId, spaceSubdomain));
    }
  } catch (error) {
    log.warn('App', 'Failed to retrieve membership from localStorage:', error);
  }
  return null;
};

// Global cache to persist across store re-initialization
const globalMembershipCache: MembershipCache = {};

/**
 * Cached membership data interface
 */
interface CachedMembershipData {
  state: MembershipState;
  timestamp: number;
  userId: string;
  spaceId: string;
}

/**
 * Membership store state
 */
interface MembershipStoreState extends MembershipState {
  currentSpaceId: string | null;
  cache: Record<string, CachedMembershipData>;
  ongoingRequests: Map<string, Promise<void>>;
  refreshSpacesTrigger: number;
}

/**
 * Membership store actions
 */
interface MembershipStoreActions {
  /**
   * Initialize the membership state for a specific space
   */
  initializeSpace: (spaceId: string, ownerId?: string) => Promise<void>;
  
  /**
   * Check membership status for a specific space
   */
  checkMembershipStatus: (spaceId: string, ownerId?: string) => Promise<void>;
  
  /**
   * Debounced version of checkMembershipStatus to prevent excessive calls
   */
  debouncedCheckMembership: (userId: string, spaceId: string) => void;
  
  /**
   * Join a space
   */
  joinSpace: (spaceId: string) => Promise<boolean>;
  
  /**
   * Leave a space
   */
  leaveSpace: (spaceId: string) => Promise<boolean>;
  
  /**
   * Change a member's role
   */
  changeMemberRole: (spaceId: string, userId: string, role: MemberRole) => Promise<boolean>;
  
  /**
   * Remove a member from a space
   */
  removeMember: (spaceId: string, userIdOfMemberToRemove: string) => Promise<boolean>;
  
  /**
   * Fetch members of a space
   */
  fetchMembers: (spaceId: string, options?: FetchMembersOptions) => Promise<SpaceMember[]>;
  
  /**
   * Refresh membership status
   */
  refreshMembership: () => void;
  
  /**
   * Clear cache
   */
  clearCache: () => void;
  
  /**
   * Set current space
   */
  setCurrentSpaceId: (spaceId: string | null) => void;
  
  /**
   * Set error
   */
  setError: (error: string | null) => void;
  
  /**
   * Trigger spaces refresh (for components that need to refresh space lists)
   */
  triggerSpacesRefresh: () => Promise<void>;
  
  /**
   * Reset store to initial state (called on sign out)
   */
  reset: () => void;
}

/**
 * Combined store type
 */
type MembershipStore = MembershipStoreState & MembershipStoreActions;

/**
 * Initial state
 */
const initialState: MembershipStoreState = {
  isMember: false,
  isOwner: false,
  isAdmin: false,
  role: null,
  status: null,
  loading: false,
  error: null,
  currentSpaceId: null,
  cache: {},
  ongoingRequests: new Map(),
  refreshSpacesTrigger: 0,
};

/**
 * Store for managing membership state
 */
export const useMembershipStore = create<MembershipStore>((set, get) => ({
  // Initial state
  ...initialState,
  
  // Initialize membership for a space
  initializeSpace: async (spaceId, ownerId) => {
    set({ currentSpaceId: spaceId });
    await get().checkMembershipStatus(spaceId, ownerId);
  },
  
  // FIXED: Optimized membership check with enhanced caching
  checkMembershipStatus: async (spaceId, ownerId) => {
    const { data: { user } } = await getSupabaseClient().auth.getUser();
    if (!user || !spaceId) {
      set({
        isMember: false,
        isOwner: false,
        isAdmin: false,
        role: null,
        status: null,
        loading: false,
        error: null,
      });
      return;
    }
    
    const requestKey = `check_${spaceId}_${user.id}`;
    const { ongoingRequests } = get();
    
    if (ongoingRequests.has(requestKey)) {
      return;
    }
    
    // FIXED: Check localStorage cache first for instant access
    const spaceData = await getSupabaseClient().from('spaces').select('subdomain').eq('id', spaceId).single();
    if (spaceData.data?.subdomain) {
      const cachedMembership = getMembershipFromLocalStorage(user.id, spaceData.data.subdomain);
      if (cachedMembership) {
        set(cachedMembership);
        return;
      }
    }
    
    set({ loading: true, error: null });
    
    const requestPromise = (async () => {
      try {
        log.debug('App', `[MembershipStore] Checking membership for user ${user.id} in space ${spaceId}`);
        
        const now = Date.now();
        const { cache } = get();
        const cacheKey = getCacheKey(user.id, spaceId);
        const cachedData = cache[cacheKey];
        
        // FIXED: Use memory cache if available and fresh
        if (cachedData && now - cachedData.timestamp < CACHE_TTL) {
          log.debug('App', `[MembershipStore] Using memory cache for space ${spaceId}`);
          set(cachedData.state);
          return;
        }
        
        // FIXED: Fast owner check first (no database query needed)
        if (ownerId && user.id === ownerId) {
          log.debug('App', `[MembershipStore] User ${user.id} is owner of space ${spaceId}`);
          const newState: MembershipState = {
            isMember: true,
            isOwner: true,
            isAdmin: true,
            role: 'owner',
            status: 'active',
            loading: false,
            error: null,
          };
          
          set(newState);
          
          // FIXED: Cache ownership for future instant access
          const cacheData: CachedMembershipData = { 
            state: newState, 
            timestamp: now, 
            userId: user.id, 
            spaceId 
          };
          
          const updatedCache = { ...get().cache };
          updatedCache[cacheKey] = cacheData;
          set({ cache: updatedCache });
          
          // Store in localStorage for next visit
          if (spaceData.data?.subdomain) {
            storeMembershipInLocalStorage(user.id, spaceData.data.subdomain, newState);
          }
          
          return;
        }
        
        // Check membership status via database
        log.debug('App', `[MembershipStore] Checking membership status for user ${user.id} in space ${spaceId}`);
        const memberData = await membershipApi.checkMembershipStatus(user.id, spaceId);
        log.debug('App', `[MembershipStore] Membership data:`, memberData);
        
        let newState: MembershipState;
        if (memberData) {
          newState = {
            isMember: memberData.status === 'active',
            isOwner: false,
            isAdmin: memberData.role === 'admin',
            role: memberData.role,
            status: memberData.status,
            loading: false,
            error: null,
          };
          log.debug('App', `[MembershipStore] User is member with status: ${memberData.status}, role: ${memberData.role}`);
        } else {
          newState = {
            isMember: false,
            isOwner: false,
            isAdmin: false,
            role: null,
            status: null,
            loading: false,
            error: null,
          };
          log.debug('App', `[MembershipStore] User is not a member of space ${spaceId}`);
        }
        
        set(newState);
        
        // FIXED: Enhanced caching for both memory and localStorage
        const cacheData: CachedMembershipData = { 
          state: newState, 
          timestamp: now, 
          userId: user.id, 
          spaceId 
        };
        
        const updatedCache = { ...get().cache };
        updatedCache[cacheKey] = cacheData;
        set({ cache: updatedCache });
        
        // Store in localStorage for next visit
        if (spaceData.data?.subdomain) {
          storeMembershipInLocalStorage(user.id, spaceData.data.subdomain, newState);
        }
        
      } catch (err) {
        log.error('App', '[MembershipStore] Error checking membership:', err);
        const errorMessage = err instanceof Error ? err.message : "Failed to check membership";
        set({ loading: false, error: errorMessage });
      } finally {
        const { ongoingRequests } = get();
        ongoingRequests.delete(requestKey);
        set({ ongoingRequests });
      }
    })();
    
    ongoingRequests.set(requestKey, requestPromise);
    set({ ongoingRequests });
  },
  
  // Join a space
  joinSpace: async (spaceId) => {
    const { data: { user } } = await getSupabaseClient().auth.getUser();
    if (!user) {
      toast({
        title: "Login required",
        description: "You need to be logged in to join a space.",
      });
      return false;
    }
    
    set({ loading: true, error: null });
    
    try {
      const response = await membershipApi.joinSpace(spaceId);
      
      if (response && response.success) {
        toast({
          title: response.message.includes("reactivated") ? "Membership Reactivated" : "Joined Space",
          description: response.message,
        });
        
        // Update membership status
        await get().checkMembershipStatus(spaceId);
        
        // Trigger spaces refresh to update the drawer
        await get().triggerSpacesRefresh();
        
        return true;
      } else {
        toast({
          title: "Could Not Join Space",
          description: response?.message || "Join failed.",
          variant: "destructive",
        });
        
        set({ loading: false, error: response?.message || "Join failed" });
        
        return false;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      
      toast({
        title: "Error Joining Space",
        description: message,
        variant: "destructive",
      });
      
      set({ loading: false, error: message });
      
      return false;
    }
  },
  
  // Leave a space
  leaveSpace: async (spaceId) => {
    const { data: { user } } = await getSupabaseClient().auth.getUser();
    const { isOwner, cache } = get();
    
    if (!user) {
      toast({
        title: "Login Required",
        description: "You must be logged in to leave a space.",
        variant: "destructive",
      });
      return false;
    }
    
    if (isOwner) {
      toast({
        title: "Cannot Leave Space",
        description: "As the owner, you cannot leave. Transfer ownership first.",
        variant: "destructive",
      });
      return false;
    }
    
    try {
      await membershipApi.leaveSpace(user.id, spaceId);
      
      // Update state
      set({
        isMember: false,
        isAdmin: false,
        role: null,
        status: null,
      });
      
      // Clear cache for this space
      const updatedCache = { ...cache };
      if (updatedCache[spaceId]) {
        delete updatedCache[spaceId];
        delete globalMembershipCache[spaceId];
        set({ cache: updatedCache });
      }
      
      toast({
        title: "Left Space",
        description: "You have successfully left this space.",
      });
      
      // Trigger spaces refresh to update the drawer
      get().triggerSpacesRefresh();
      
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      
      toast({
        title: "Error Leaving Space",
        description: message,
        variant: "destructive",
      });
      
      return false;
    }
  },
  
  // Change a member's role
  changeMemberRole: async (spaceId, userId, role) => {
    const { data: { user } } = await getSupabaseClient().auth.getUser();
    const { isOwner, isAdmin, cache } = get();
    
    if (!user) return false;
    
    try {
      if (!isOwner && !isAdmin) {
        toast({
          title: "Permission denied",
          description: "Not allowed to change roles.",
          variant: "destructive",
        });
        return false;
      }
      
      // Additional checks for admins changing other admins
      if (isAdmin && !isOwner) {
        // This check would require additional API calls and would be implemented in a full migration
        // For now, we'll handle it in the API or server-side rules
      }
      
      await membershipApi.changeMemberRole(spaceId, userId, role);
      
      toast({
        title: "Role Changed",
        description: `User role updated to ${role}.`,
      });
      
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      
      toast({
        title: "Error Changing Role",
        description: message,
        variant: "destructive",
      });
      
      return false;
    }
  },
  
  // Remove a member
  removeMember: async (spaceId, userIdOfMemberToRemove) => {
    const { data: { user } } = await getSupabaseClient().auth.getUser();
    const { isOwner, isAdmin } = get();
    
    if (!user) return false;
    
    try {
      if (!isOwner && !isAdmin) {
        toast({
          title: "Permission denied",
          description: "Not allowed to remove members.",
          variant: "destructive",
        });
        return false;
      }
      
      await membershipApi.removeMember(spaceId, userIdOfMemberToRemove);
      
      // CRITICAL FIX: Clear all member-related caches to ensure UI updates immediately
      try {
        // Clear global cache coordinator member counts
        const { globalCache } = await import('@/utils/globalCacheCoordinator');
        if (globalCache?.unsubscribe) {
          globalCache.unsubscribe(`memberCounts:${spaceId}`, 'member-removal-cleanup');
          log.debug('App', `🧹 [MembershipStore] Unsubscribed from memberCounts cache for space ${spaceId}`);
        }
        
        // Clear supabase bridge cache (using V2 system)
        const { migrationAdapter } = await import('@/utils/indexeddb/migration/MigrationAdapter');
        if (migrationAdapter?.clearCache) {
          await migrationAdapter.clearCache();
          log.debug('App', `🧹 [MembershipStore] Cleared V2 bridge cache`);
        }
        
        // Clear space data cleaner caches
        const { clearSpaceMemberCounts } = await import('@/utils/spaceDataCleaner');
        await clearSpaceMemberCounts(spaceId);
        log.debug('App', `🧹 [MembershipStore] Cleared space member counts cache for space ${spaceId}`);
        
        // Clear localStorage member-related caches
        const memberCacheKeys = [
          `memberCounts_${spaceId}`,
          `space_members_cache_${spaceId}`,
          `optimized_member_counts_${spaceId}`,
          `members_list_fallback_${spaceId}`,
          `members_${spaceId}_all_active`
        ];
        
        memberCacheKeys.forEach(key => {
          try {
            localStorage.removeItem(key);
          } catch (e) {
            log.warn('App', `Failed to clear localStorage key: ${key}`, e);
          }
        });
        
        log.debug('App', `🧹 [MembershipStore] Cleared localStorage member caches for space ${spaceId}`);
        
      } catch (cacheError) {
        log.warn('App', 'Failed to clear some caches after member removal:', cacheError);
      }
      
      toast({
        title: "Member Removed",
        description: "Member has been removed from the space.",
      });
      
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      
      toast({
        title: "Error Removing Member",
        description: message,
        variant: "destructive",
      });
      
      return false;
    }
  },
  
  // Fetch members
  fetchMembers: async (spaceId, options = {}) => {
    const { data: { user } } = await getSupabaseClient().auth.getUser();
    
    if (!user) return [];
    
    try {
      return await membershipApi.fetchMembers(spaceId, options);
    } catch (error) {
      log.error('App', 'Error fetching members:', error);
      
      toast({
        title: "Error Fetching Members",
        description: error instanceof Error ? error.message : "Could not retrieve list.",
        variant: "destructive",
      });
      
      return [];
    }
  },
  
  // Refresh membership
  refreshMembership: () => {
    const { currentSpaceId } = get();
    if (currentSpaceId) {
      get().checkMembershipStatus(currentSpaceId);
    }
  },
  
  // Clear cache
  clearCache: () => {
    set({ cache: {} });
    // Clear global cache
    Object.keys(globalMembershipCache).forEach(key => {
      delete globalMembershipCache[key];
    });
    
    // Clear localStorage membership cache
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('membership_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      log.warn('App', 'Failed to clear localStorage membership cache:', error);
    }
  },
  
  // Set current space ID
  setCurrentSpaceId: (spaceId) => {
    set({ currentSpaceId: spaceId });
  },
  
  // Set error
  setError: (error) => {
    set({ error });
  },
  
  // Trigger spaces refresh (for components that need to refresh space lists)
  triggerSpacesRefresh: async () => {
    const { refreshSpacesTrigger } = get();
    set({ refreshSpacesTrigger: refreshSpacesTrigger + 1 });
    
    // Invalidate the shared user-spaces cache so the switcher, settings tab and
    // mobile drawer all refetch updated spaces on their next refreshSpacesTrigger.
    const userSpacesStore = useUserSpacesStore.getState();
    userSpacesStore.invalidateCache();

    log.debug('App', '🔄 [MembershipStore] Triggered spaces refresh and invalidated user spaces cache');
  },
  
  // Reset store to initial state (called on sign out)
  reset: () => {
    set(() => ({
      ...initialState,
      hasInitialized: false,
    }));
  },
  
  // OPTIMIZATION: Debounced membership check to prevent excessive API calls
  debouncedCheckMembership: debounce((userId: string, spaceId: string) => {
    get().checkMembershipStatus(spaceId);
  }, 300), // 300ms debounce
})); 