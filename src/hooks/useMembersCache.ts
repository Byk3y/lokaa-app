import { log } from '@/utils/logger';
import { create } from 'zustand';
import { getSupabaseClient } from '@/integrations/supabase/client';
import type { MemberRole } from '@/contexts/MembershipContext';

// Types for cached members
export interface CachedMemberType {
  id: string;
  user_id: string;
  space_id: string;
  role: MemberRole;
  joined_at: string;
  status: string;
  is_online?: boolean;
  last_active_at: string | null;
  full_name: string | null;
  avatar_url: string | null;
  profile_url: string | null;
  activity_score: number;
  bio: string | null;
}

interface CacheEntry {
  members: CachedMemberType[];
  lastFetched: number;
  loading: boolean;
  error: string | null;
}

interface MembersCacheState {
  cache: Map<string, CacheEntry>;
  
  // Actions
  fetchMembers: (spaceId: string, forceRefresh?: boolean) => Promise<void>;
  subscribeToPresence: (spaceId: string) => () => void;
  updateMember: (spaceId: string, memberId: string, updates: Partial<CachedMemberType>) => void;
  removeMember: (spaceId: string, memberId: string) => void;
  addMember: (spaceId: string, member: CachedMemberType) => void;
  updateMemberRole: (spaceId: string, userId: string, newRole: MemberRole) => void;
  clearCache: (spaceId?: string) => void;
  
  // Getters
  getMembers: (spaceId: string) => CachedMemberType[];
  isLoading: (spaceId: string) => boolean;
  getError: (spaceId: string) => string | null;
  isStale: (spaceId: string, maxAgeMs?: number) => boolean;
}

const CACHE_MAX_AGE = 2 * 60 * 1000; // 2 minutes (shorter than posts since member data changes less frequently)
const MAX_CACHE_ENTRIES = 10; // Limit cache size

// Function to clear cache for debugging - can be called from browser console
(window as any).clearMembersCache = () => {
  // Clear localStorage fallback cache
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('members_list_fallback_') || key.startsWith('members_fallback_')) {
      localStorage.removeItem(key);
    }
  });
  log.debug('Hook', 'Members cache cleared from localStorage');
};

// POSTS PATTERN: Fallback recovery helper
const tryFallbackRecovery = async (spaceId: string): Promise<CachedMemberType[] | null> => {
  // PRIORITY 1: Try the real members cache first (from our console script)
  try {
    const realMembersCacheKey = `members_cache_${spaceId}`;
    const realMembersData = localStorage.getItem(realMembersCacheKey);
    if (realMembersData) {
      const realMembers = JSON.parse(realMembersData);
      if (Array.isArray(realMembers) && realMembers.length > 0) {
        log.debug('Hook', `✅ [MembersCache] Using REAL members from localStorage (${realMembers.length} members)`);
        return realMembers.map((member: any) => ({
          id: member.id,
          user_id: member.userId || member.user_id, // Handle both formats
          space_id: spaceId,
          role: member.role,
          joined_at: member.joinedAt || member.joined_at,
          status: member.status,
          is_online: member.isOnline || member.is_online || false,
          last_active_at: member.lastActiveAt || member.last_active_at,
          full_name: member.fullName || member.full_name || null,
          avatar_url: member.avatarUrl || member.avatar_url || null,
          profile_url: member.profile_url || null,
          activity_score: member.activityScore || member.activity_score || 0,
          bio: member.bio || null,
        }));
      }
    }
  } catch (error) {
    log.warn('Hook', 'Real members cache recovery failed:', error);
  }

  // PRIORITY 2: Try persistent cache fallback
  try {
    const persistentCacheKey = `PERSISTENT_members_cache_${spaceId}`;
    const cachedData = localStorage.getItem(persistentCacheKey);
    if (cachedData) {
      const realMembers = JSON.parse(cachedData);
      if (Array.isArray(realMembers) && realMembers.length > 0) {
        log.debug('Hook', `✅ [MembersCache] Using PERSISTENT real members from localStorage (${realMembers.length} members)`);
        return realMembers.map((member: any) => ({
          id: member.id,
          user_id: member.userId || member.user_id, // Handle both formats
          space_id: spaceId,
          role: member.role,
          joined_at: member.joinedAt || member.joined_at,
          status: member.status,
          is_online: member.isOnline || member.is_online || false,
          last_active_at: member.lastActiveAt || member.last_active_at,
          full_name: member.fullName || member.full_name || null,
          avatar_url: member.avatarUrl || member.avatar_url || null,
          profile_url: member.profile_url || null,
          activity_score: member.activityScore || member.activity_score || 0,
          bio: member.bio || null,
        }));
      }
    }
  } catch (error) {
    log.warn('Hook', 'Persistent real members cache recovery failed:', error);
  }
  
  // PRIORITY 3: Try regular fallback cache
  try {
    const persistentCacheKey = `members_list_fallback_${spaceId}`;
    const cachedData = localStorage.getItem(persistentCacheKey);
    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      const cacheAge = Date.now() - parsed.timestamp;
      const maxFallbackAge = 24 * 60 * 60 * 1000; // 24 hours
      
      if (cacheAge < maxFallbackAge && parsed.data) {
        return parsed.data.map((member: any) => ({
          id: member.id,
          user_id: member.user_id,
          space_id: spaceId,
          role: member.role,
          joined_at: member.joined_at,
          status: member.status,
          is_online: member.is_online || false,
          last_active_at: member.last_active_at,
          full_name: member.full_name || null,
          avatar_url: member.avatar_url || null,
          profile_url: member.profile_url || null,
          activity_score: member.activity_score || 0,
          bio: member.bio || null,
        }));
      }
    }
  } catch (error) {
    log.warn('Hook', 'Fallback cache recovery failed:', error);
  }
  
  return null;
};

export const useMembersCache = create<MembersCacheState>((set, get) => ({
  cache: new Map(),

  subscribeToPresence: (spaceId: string) => {
    // DEPRECATED: This function is now handled by the unified presence system in useMemberCounts
    // Return a no-op cleanup function for backward compatibility
    log.debug('Hook', '🌐 [MembersCache] Presence subscription delegated to unified system');
    return () => {};
  },

  fetchMembers: async (spaceId: string, forceRefresh = false) => {
    // CRITICAL FIX: Don't attempt to fetch with invalid space IDs
    if (!spaceId || spaceId.startsWith('fallback-') || spaceId === 'fallback-id') {
      log.warn('Hook', `⚠️ [MembersCache] Invalid space ID provided: ${spaceId} - skipping fetch to prevent database errors`);
      return;
    }
    
    const { cache } = get();
    const entry = cache.get(spaceId);
    
    // Check if we should use cached data
    if (!forceRefresh && entry && !get().isStale(spaceId)) {
      log.debug('Hook', '👥 Using cached members for space:', spaceId);
      return; // Use cached data
    }

    // POSTS PATTERN: Check real members cache FIRST before setting loading state
    if (!forceRefresh) {
      try {
        // PRIORITY 1: Try the persistent cache first (survives auth events)
        const persistentCacheKey = `PERSISTENT_members_cache_${spaceId}`;
        let realMembersData = localStorage.getItem(persistentCacheKey);
        
        // PRIORITY 2: Try the regular cache as backup
        if (!realMembersData) {
          const realMembersCacheKey = `members_cache_${spaceId}`;
          realMembersData = localStorage.getItem(realMembersCacheKey);
        }
        
        if (realMembersData) {
          const realMembers = JSON.parse(realMembersData);
          if (Array.isArray(realMembers) && realMembers.length > 0) {
            log.debug('Hook', `✅ [MembersCache] Loading REAL members from localStorage (${realMembers.length} members)`);
            const convertedMembers = realMembers.map((member: any) => ({
              id: member.id,
              user_id: member.userId || member.user_id, // Handle both formats
              space_id: spaceId,
              role: member.role,
              joined_at: member.joinedAt || member.joined_at,
              status: member.status,
              is_online: member.isOnline || member.is_online || false,
              last_active_at: member.lastActiveAt || member.last_active_at,
              full_name: member.fullName || member.full_name || null,
              avatar_url: member.avatarUrl || member.avatar_url || null,
              profile_url: member.profile_url || null,
              activity_score: member.activityScore || member.activity_score || 0,
              bio: member.bio || null,
            }));
            
            const realMembersCache = new Map(cache);
            realMembersCache.set(spaceId, {
              members: convertedMembers,
              loading: false,
              error: null,
              lastFetched: Date.now(),
            });
            set({ cache: realMembersCache });
            
            // PERSISTENT CACHE: Also save to PERSISTENT prefix for auth-safe storage
            try {
              localStorage.setItem(`PERSISTENT_members_cache_${spaceId}`, JSON.stringify(realMembers));
            } catch (e) {
              log.warn('Hook', 'Failed to save persistent members cache:', e);
            }
            
            return; // Use real members data, skip database query
          }
        }
      } catch (error) {
        log.warn('Hook', 'Failed to load real members from localStorage:', error);
      }
    }

    // Set loading state only if we need to fetch from database
    const newCache = new Map(cache);
    newCache.set(spaceId, {
      ...entry,
      loading: true,
      error: null,
      members: entry?.members || [],
      lastFetched: entry?.lastFetched || 0,
    });
    set({ cache: newCache });

    // Apply query deduplication to prevent duplicate database calls
    const lockKey = `members_${spaceId}`;
    if ((window as any).__membersLocks?.[lockKey]) {
      log.debug('Hook', '🔒 [MembersCache] Query already in progress, skipping duplicate');
      return;
    }
    
    (window as any).__membersLocks = (window as any).__membersLocks || {};
    (window as any).__membersLocks[lockKey] = true;

    try {
      log.debug('Hook', '🔄 Fetching members from Supabase for space:', spaceId);
      
      const supabase = getSupabaseClient(); // GET SINGLETON CLIENT
      
      // POSTS PATTERN: Optimized timeout for member queries with profile joins
      const TIMEOUT_MS = 8000; // Reduced from 12s to 8s for better UX
      
      let memberData: any[] | null = null;
      let memberError: any = null;
      
      try {
        const { data, error } = await Promise.race([
          supabase
            .from('space_members')
            .select('id, user_id, space_id, role, joined_at, status, last_active_at')
            .eq('space_id', spaceId)
            .eq('status', 'active')
            .order('joined_at', { ascending: true }),
          new Promise<never>((_, reject) => {
            setTimeout(() => {
              log.warn('Hook', '[MembersCache] Query timeout for:', spaceId);
              reject(new Error('Members query timeout'));
            }, TIMEOUT_MS);
          })
        ]);
        
        memberData = data;
        memberError = error;
        
      } catch (timeoutError) {
        log.error('Hook', '[MembersCache] Query failed, attempting fallback cache recovery...');
        
        const fallback = await tryFallbackRecovery(spaceId);
        if (fallback) {
          memberData = fallback;
          memberError = null;
          log.debug('Hook', `✅ [MembersCache] Using fallback cache data`);
        } else {
           if (timeoutError instanceof Error) {
             memberError = timeoutError;
           }
        }
      }
      
      if (memberError) {
        log.error('Hook', '[MembersCache] Query error:', memberError);
        throw memberError;
      }
      
      if (!memberData || !Array.isArray(memberData) || memberData.length === 0) {
        log.warn('Hook', '[MembersCache] No member data returned, clearing cache for this space.');
        
        const updatedCache = new Map(get().cache);
        updatedCache.set(spaceId, {
          members: [],
          loading: false,
          error: null,
          lastFetched: Date.now(),
        });
        set({ cache: updatedCache });
        delete (window as any).__membersLocks[lockKey];
        return;
      }
      
      let combinedMembers: CachedMemberType[] = memberData.map((member: any) => ({
        id: member.id,
        user_id: member.user_id,
        space_id: spaceId,
        role: member.role,
        joined_at: member.joined_at,
        status: member.status,
        is_online: false,
        last_active_at: member.last_active_at,
        full_name: member.full_name || null,
        avatar_url: member.avatar_url || null,
        profile_url: member.profile_url || null,
        activity_score: member.activity_score || 0,
        bio: member.bio || null,
      }));

      try {
        const userIds = memberData.map((member: any) => member.user_id).filter(Boolean);
        if (userIds.length > 0) {
          const client = getSupabaseClient();
          const { data: profiles, error: profileError } = await client
            .from('users')
            .select('id, full_name, avatar_url, bio')
            .in('id', userIds);
          
          if (profileError) throw profileError;
            
          if (profiles) {
            const profileMap = new Map(profiles.map((p: any) => [p.id, p]));
            combinedMembers = combinedMembers.map(member => {
              const profile = profileMap.get(member.user_id);
              if (profile) {
              return {
                ...member,
                  full_name: (profile as any).full_name, 
                  avatar_url: (profile as any).avatar_url, 
                  bio: (profile as any).bio 
              };
              }
              return member;
            });
          }
        }
      } catch (profileError) {
        log.warn('Hook', '⚠️ [MembersCache] Failed to fetch profiles, using basic member data:', profileError);
      }

      const finalCache = new Map(get().cache);
      finalCache.set(spaceId, {
        members: combinedMembers,
        loading: false,
        error: null,
        lastFetched: Date.now(),
      });

      if (finalCache.size > MAX_CACHE_ENTRIES) {
        const entries = Array.from(finalCache.entries());
        entries.sort((a, b) => a[1].lastFetched - b[1].lastFetched);
        const toRemove = entries.slice(0, finalCache.size - MAX_CACHE_ENTRIES);
        toRemove.forEach(([key]) => finalCache.delete(key));
      }

      set({ cache: finalCache });
      
      // NOTE: Presence subscription is now handled by the unified presence system in useMemberCounts

      try {
        const persistentCacheKey = `members_list_fallback_${spaceId}`;
        localStorage.setItem(persistentCacheKey, JSON.stringify({
          data: combinedMembers,
          timestamp: Date.now()
        }));
      } catch (cacheError) {
        log.warn('Hook', '⚠️ [MembersCache] Failed to save fallback cache:', cacheError);
      }
      
      // Clean up lock
      delete (window as any).__membersLocks[lockKey];
      
    } catch (error) {
      log.error('Hook', '[MembersCache] fetchMembers error:', error);
      
      const fallbackMembers = await tryFallbackRecovery(spaceId);
      if (fallbackMembers && fallbackMembers.length > 0) {
        const finalCache = new Map(get().cache);
        finalCache.set(spaceId, { members: fallbackMembers, loading: false, error: null, lastFetched: Date.now() });
        set({ cache: finalCache });
        delete (window as any).__membersLocks[lockKey];
        return;
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      const errorCache = new Map(get().cache);
      errorCache.set(spaceId, {
        ...(errorCache.get(spaceId) || { members: [], error: null, lastFetched: 0 }),
        loading: false,
        error: errorMessage,
      });
      set({ cache: errorCache });
      delete (window as any).__membersLocks[lockKey];
    }
  },

  updateMember: (spaceId: string, memberId: string, updates: Partial<CachedMemberType>) => {
    const { cache } = get();
    const entry = cache.get(spaceId);
    if (!entry) return;

    const updatedMembers = entry.members.map(member => 
      member.id === memberId ? { ...member, ...updates } : member
    );

    const newCache = new Map(cache);
    newCache.set(spaceId, {
      ...entry,
      members: updatedMembers,
    });
    set({ cache: newCache });
    log.debug('Hook', '✏️ Updated member in cache:', memberId);
  },

  removeMember: (spaceId: string, memberId: string) => {
    const { cache } = get();
    const entry = cache.get(spaceId);
    if (!entry) return;

    const filteredMembers = entry.members.filter(member => member.id !== memberId);

    const newCache = new Map(cache);
    newCache.set(spaceId, {
      ...entry,
      members: filteredMembers,
    });
    set({ cache: newCache });
    log.debug('Hook', '🗑️ Removed member from cache:', memberId);
  },

  addMember: (spaceId: string, member: CachedMemberType) => {
    const { cache } = get();
    const entry = cache.get(spaceId);
    if (!entry) return;

    const newCache = new Map(cache);
    newCache.set(spaceId, {
      ...entry,
      members: [...entry.members, member],
    });
    set({ cache: newCache });
    log.debug('Hook', '➕ Added member to cache:', member.id);
  },

  updateMemberRole: (spaceId: string, userId: string, newRole: MemberRole) => {
    const { cache } = get();
    const entry = cache.get(spaceId);
    if (!entry) return;

    const updatedMembers = entry.members.map(member => 
      member.user_id === userId ? { ...member, role: newRole } : member
    );

    const newCache = new Map(cache);
    newCache.set(spaceId, {
      ...entry,
      members: updatedMembers,
    });
    set({ cache: newCache });
    log.debug('Hook', '👑 Updated member role in cache:', userId, 'to', newRole);
  },

  clearCache: (spaceId?: string) => {
    const { cache } = get();
    if (spaceId) {
      const newCache = new Map(cache);
      newCache.delete(spaceId);
      set({ cache: newCache });
      log.debug('Hook', '🧹 Cleared cache for space:', spaceId);
    } else {
      set({ cache: new Map() });
      log.debug('Hook', '🧹 Cleared all members cache');
    }
  },

  // Getters
  getMembers: (spaceId: string) => {
    const entry = get().cache.get(spaceId);
    return entry?.members || [];
  },

  isLoading: (spaceId: string) => {
    const entry = get().cache.get(spaceId);
    return entry?.loading || false;
  },

  getError: (spaceId: string) => {
    const entry = get().cache.get(spaceId);
    return entry?.error || null;
  },

  isStale: (spaceId: string, maxAgeMs = CACHE_MAX_AGE) => {
    const entry = get().cache.get(spaceId);
    if (!entry) return true;
    return Date.now() - entry.lastFetched > maxAgeMs;
  },
})); 