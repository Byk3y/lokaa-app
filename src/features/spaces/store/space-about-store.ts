import { log } from '@/utils/logger';
/**
 * Space About Store
 * 
 * This store manages space about data using Zustand.
 * It will replace the React Context-based space about data management system.
 */

import { create } from 'zustand';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useEffect } from 'react';

/**
 * Space about data interface
 */
export interface SpaceAboutData {
  id: string;
  name: string;
  subdomain: string;
  description?: string;
  icon_image?: string;
  cover_image?: string;
  intro_media_type?: string;
  intro_media_url?: string;
  intro_media_thumbnail_url?: string;
  about_description?: string;
  pricing_type: 'free' | 'paid';
  price_per_month?: number;
  is_private: boolean;
  primary_color?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  member_count: number;
  online_count?: number;
  admin_count?: number;
  owner?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  features?: {
    chat_enabled: boolean;
    forum_enabled: boolean;
    events_enabled: boolean;
    classroom_enabled: boolean;
    calendar_enabled: boolean;
    map_enabled: boolean;
    trial_enabled: boolean;
  };
}

/**
 * Space about state
 */
interface SpaceAboutState {
  spaceAboutData: SpaceAboutData | null;
  loading: boolean;
  error: string | null;
  isRefetching: boolean;
  lastFetchTime: number;
  cache: Record<string, { data: SpaceAboutData; timestamp: number }>;
}

/**
 * Space about actions
 */
interface SpaceAboutActions {
  // Data fetching
  fetchSpaceAboutData: (spaceId?: string, subdomain?: string, skipLocalMedia?: boolean) => Promise<void>;
  setInitialData: (data: SpaceAboutData | null) => void;
  
  // Member counts
  refetchMemberCounts: () => Promise<void>;
  updateMemberCounts: (memberCount: number, onlineCount?: number, adminCount?: number) => void;
  
  // Cache management
  clearCache: () => void;
  
  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // Loading states
  setLoading: (loading: boolean) => void;
  setRefetching: (refetching: boolean) => void;
  
  // Reset
  reset: () => void;
}

/**
 * Combined store interface
 */
type SpaceAboutStore = SpaceAboutState & SpaceAboutActions;

/**
 * Cache TTL in milliseconds (5 minutes)
 */
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Initial state
 */
const initialState: SpaceAboutState = {
  spaceAboutData: null,
  loading: false,
  error: null,
  isRefetching: false,
  lastFetchTime: 0,
  cache: {},
};

/**
 * Store for managing space about data
 */
export const useSpaceAboutStore = create<SpaceAboutStore>((set, get) => ({
  // Initial state
  ...initialState,
  
  // Fetch space about data
  fetchSpaceAboutData: async (spaceId?: string, subdomain?: string, skipLocalMedia = false) => {
    if (!spaceId && !subdomain) {
      set({ error: 'Either spaceId or subdomain is required' });
      return;
    }
    
    const cacheKey = spaceId || subdomain || '';
    const { cache } = get();
    const now = Date.now();
    
    // Check cache first
    if (cache[cacheKey] && now - cache[cacheKey].timestamp < CACHE_TTL) {
      log.debug('App', `[SpaceAboutStore] Using cached data for: ${cacheKey}`);
      set({ 
        spaceAboutData: cache[cacheKey].data,
        loading: false,
        error: null,
        lastFetchTime: cache[cacheKey].timestamp
      });
      return;
    }
    
    set({ loading: true, error: null });
    
    try {
      log.debug('App', `[SpaceAboutStore] Fetching space about data for: ${spaceId || subdomain}`);
      log.debug('App', `[SpaceAboutStore] Using spaceId: ${spaceId}, subdomain: ${subdomain}`);
      
      let query = getSupabaseClient()
        .from('spaces')
        .select(`
          id,
          name,
          subdomain,
          description,
          icon_image,
          cover_image,
          intro_media_type,
          intro_media_url,
          intro_media_thumbnail_url,
          about_description,
          pricing_type,
          price_per_month,
          is_private,
          primary_color,
          owner_id,
          created_at,
          updated_at,
          member_count,
          owner:owner_id(
            id,
            full_name,
            avatar_url
          )
        `);
      
      if (spaceId) {
        query = query.eq('id', spaceId);
        log.debug('App', `[SpaceAboutStore] Querying by spaceId: ${spaceId}`);
      } else if (subdomain) {
        query = query.eq('subdomain', subdomain);
        log.debug('App', `[SpaceAboutStore] Querying by subdomain: ${subdomain}`);
      }
      
      log.debug('App', `[SpaceAboutStore] Executing query...`);
      const { data, error } = await query.single();
      
      log.debug('App', `[SpaceAboutStore] Query result:`, { data, error });
      
      if (error) {
        log.error('App', `[SpaceAboutStore] Database error:`, error);
        throw error;
      }
      
      if (!data) {
        log.error('App', `[SpaceAboutStore] No data returned from query`);
        throw new Error('Space not found');
      }
      
      // Use cached member_count first, only fetch real-time if explicitly needed
      let memberCount = data?.member_count || 0;
      const onlineCount = 0;
      let adminCount = 0;
      
      // OPTIMIZATION: Skip additional queries by default to reduce resource usage
      // Only fetch real-time counts if specifically requested
      if (!skipLocalMedia && data?.id && false) { // Temporarily disabled
        try {
          // Fetch real-time member counts with timeout and error handling
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Member count query timeout')), 5000)
          );
          
          const results = await Promise.race([
            Promise.allSettled([
              getSupabaseClient()
                .from('space_members')
                .select('id', { count: 'exact', head: true })
                .eq('space_id', data.id)
                .eq('status', 'active'),
              getSupabaseClient()
                .from('space_members')
                .select('id', { count: 'exact', head: true })
                .eq('space_id', data.id)
                .eq('role', 'admin')
            ]),
            timeoutPromise
          ]) as PromiseSettledResult<any>[];
          
          const [memberCountResult, adminCountResult] = results;
          
          if (memberCountResult.status === 'fulfilled' && (memberCountResult as PromiseFulfilledResult<any>).value?.count !== null) {
            memberCount = (memberCountResult as PromiseFulfilledResult<any>).value.count;
          }
          
          if (adminCountResult.status === 'fulfilled' && (adminCountResult as PromiseFulfilledResult<any>).value?.count !== null) {
            adminCount = (adminCountResult as PromiseFulfilledResult<any>).value.count;
          }
        } catch (memberError) {
          // Log but don't fail the whole request for member count errors
          log.warn('App', '[SpaceAboutStore] Failed to fetch real-time member counts, using cached values:', memberError);
        }
      }
      
      const spaceAboutData: SpaceAboutData = {
        id: data.id,
        name: data.name,
        subdomain: data.subdomain,
        description: data.description,
        icon_image: data.icon_image,
        cover_image: data.cover_image,
        intro_media_type: data.intro_media_type,
        intro_media_url: data.intro_media_url,
        intro_media_thumbnail_url: data.intro_media_thumbnail_url,
        about_description: data.about_description,
        pricing_type: data.pricing_type,
        price_per_month: data.price_per_month,
        is_private: data.is_private,
        primary_color: data.primary_color,
        owner_id: data.owner_id,
        created_at: data.created_at,
        updated_at: data.updated_at,
        member_count: memberCount,
        online_count: onlineCount,
        admin_count: adminCount,
        owner: data.owner,
        features: {
          chat_enabled: true, // Default features
          forum_enabled: true,
          events_enabled: true,
          classroom_enabled: true,
          calendar_enabled: true,
          map_enabled: true,
          trial_enabled: true,
        }
      };
      
      // Update cache
      const updatedCache = {
        ...cache,
        [cacheKey]: { data: spaceAboutData, timestamp: now }
      };
      
      set({ 
        spaceAboutData,
        loading: false,
        error: null,
        lastFetchTime: now,
        cache: updatedCache
      });
      
      log.debug('App', `[SpaceAboutStore] Successfully fetched space about data for: ${data.name}`);
      
    } catch (error) {
      log.error('App', '[SpaceAboutStore] Error fetching space about data:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to fetch space data';
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorMessage = 'Request timed out. Please try again.';
        } else if (error.message.includes('not found')) {
          errorMessage = 'Space not found';
        } else if (error.message.includes('INSUFFICIENT_RESOURCES')) {
          errorMessage = 'Server is busy. Please try again in a moment.';
        } else {
          errorMessage = error.message;
        }
      }
      
      set({ 
        loading: false, 
        error: errorMessage
      });
    }
  },
  
  // Set initial data (useful for SSR or pre-loaded data)
  setInitialData: (data: SpaceAboutData | null) => {
    if (data) {
      const cacheKey = data.id;
      const now = Date.now();
      
      set({ 
        spaceAboutData: data,
        loading: false,
        error: null,
        lastFetchTime: now,
        cache: {
          ...get().cache,
          [cacheKey]: { data, timestamp: now }
        }
      });
    } else {
      set({ spaceAboutData: null });
    }
  },
  
  // Refetch member counts only
  refetchMemberCounts: async () => {
    const { spaceAboutData } = get();
    if (!spaceAboutData) return;
    
    set({ isRefetching: true });
    
    try {
      log.debug('App', `[SpaceAboutStore] Refetching member counts for space: ${spaceAboutData.id}`);
      
      const [memberCountResult, adminCountResult] = await Promise.allSettled([
        getSupabaseClient()
          .from('space_members')
          .select('id', { count: 'exact', head: true })
          .eq('space_id', spaceAboutData.id)
          .eq('status', 'active'),
        getSupabaseClient()
          .from('space_members')
          .select('id', { count: 'exact', head: true })
          .eq('space_id', spaceAboutData.id)
          .eq('role', 'admin')
      ]);
      
      let memberCount = spaceAboutData.member_count;
      let adminCount = spaceAboutData.admin_count || 0;
      
      if (memberCountResult.status === 'fulfilled' && memberCountResult.value.count !== null) {
        memberCount = memberCountResult.value.count;
      }
      
      if (adminCountResult.status === 'fulfilled' && adminCountResult.value.count !== null) {
        adminCount = adminCountResult.value.count;
      }
      
      const updatedData = {
        ...spaceAboutData,
        member_count: memberCount,
        admin_count: adminCount,
      };
      
      set({ 
        spaceAboutData: updatedData,
        isRefetching: false
      });
      
      // Update cache
      const cacheKey = spaceAboutData.id;
      const updatedCache = {
        ...get().cache,
        [cacheKey]: { data: updatedData, timestamp: Date.now() }
      };
      set({ cache: updatedCache });
      
    } catch (error) {
      log.error('App', '[SpaceAboutStore] Error refetching member counts:', error);
      set({ isRefetching: false });
    }
  },
  
  // Update member counts manually
  updateMemberCounts: (memberCount: number, onlineCount?: number, adminCount?: number) => {
    const { spaceAboutData } = get();
    if (!spaceAboutData) return;
    
    const updatedData = {
      ...spaceAboutData,
      member_count: memberCount,
      ...(onlineCount !== undefined && { online_count: onlineCount }),
      ...(adminCount !== undefined && { admin_count: adminCount }),
    };
    
    set({ spaceAboutData: updatedData });
    
    // Update cache
    const cacheKey = spaceAboutData.id;
    const updatedCache = {
      ...get().cache,
      [cacheKey]: { data: updatedData, timestamp: Date.now() }
    };
    set({ cache: updatedCache });
  },
  
  // Clear cache
  clearCache: () => {
    set({ cache: {} });
  },
  
  // Set error
  setError: (error: string | null) => {
    set({ error });
  },
  
  // Clear error
  clearError: () => {
    set({ error: null });
  },
  
  // Set loading
  setLoading: (loading: boolean) => {
    set({ loading });
  },
  
  // Set refetching
  setRefetching: (isRefetching: boolean) => {
    set({ isRefetching });
  },
  
  // Reset store
  reset: () => {
    set(initialState);
  },
}));

/**
 * FIXED: Converted to const export for React Fast Refresh compatibility
 */
export const useSpaceAbout = (spaceId?: string, subdomain?: string) => {
  const store = useSpaceAboutStore();
  
  // Auto-fetch when spaceId or subdomain is provided
  useEffect(() => {
    if (spaceId || subdomain) {
      store.fetchSpaceAboutData(spaceId, subdomain);
    }
  }, [spaceId, subdomain, store.fetchSpaceAboutData]);
  
  return {
    spaceAboutData: store.spaceAboutData,
    loading: store.loading,
    error: store.error,
    isRefetching: store.isRefetching,
    refetch: () => store.fetchSpaceAboutData(spaceId, subdomain),
    refetchMemberCounts: store.refetchMemberCounts,
    // Additional store methods
    fetchSpaceAboutData: store.fetchSpaceAboutData,
    updateMemberCounts: store.updateMemberCounts,
    setError: store.setError,
    clearError: store.clearError,
  };
} 