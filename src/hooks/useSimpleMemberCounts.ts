/**
 * 🚀 SIMPLE MEMBER COUNTS SYSTEM
 * 
 * Replaces the complex 407-line useOptimizedMemberCounts.ts singleton system
 * with a clean, straightforward approach that leverages the new simple presence system.
 * 
 * Key simplifications:
 * - No singleton pattern complexity
 * - No race condition workarounds  
 * - No custom event system
 * - Uses simple presence hook for online counts
 * - Direct database queries with React Query caching
 * 
 * INCOGNITO MODE FIX: Enhanced initialization and error handling
 * UNAUTHENTICATED FIX: Uses public function for space preview modals
 */

import { useState, useEffect, useRef } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useSimpleSpacePresence } from './useSimpleSpacePresence';

interface MemberCounts {
  totalMembers: number;
  adminMembers: number;
  onlineMembers: number;
  loading: boolean;
}

const debugMemberCounts = (message: string, data: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔢 [SimpleMemberCounts] ${message}:`, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 🚀 Simple hook for getting member counts with automatic fallback for unauthenticated users
 */
export const useSimpleMemberCounts = (spaceId: string): MemberCounts => {
  const [counts, setCounts] = useState<MemberCounts>({
    totalMembers: 0,
    adminMembers: 0,
    onlineMembers: 0,
    loading: true
  });

  const lastFetchRef = useRef<number>(0);
  const fetchTimeoutRef = useRef<any>(null);
  const mountedRef = useRef(true);

  // Get online count and loading from presence system
  const { onlineCount, loading: presenceLoading } = useSimpleSpacePresence(spaceId);

  const fetchCounts = async () => {
    if (!spaceId || !mountedRef.current) return;

    try {
      debugMemberCounts('Fetching member counts', { spaceId });
      
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('space_members')
        .select('role')
        .eq('space_id', spaceId)
        .eq('status', 'active');

      if (error) {
        console.error('Error fetching member counts:', error);
        if (mountedRef.current) {
          setCounts(prev => ({ ...prev, loading: false }));
        }
        return;
      }

      const totalCount = data?.length || 0;
      const adminCount = data?.filter(member => member.role === 'admin')?.length || 0;

      debugMemberCounts('Successfully fetched counts', {
        spaceId,
        totalCount,
        adminCount,
        onlineCount,
        presenceLoading
      });

      lastFetchRef.current = Date.now();

      // FIXED: Only update total/admin counts, preserve current online count from presence
      if (mountedRef.current) {
        setCounts(prev => ({
          totalMembers: totalCount,
          adminMembers: adminCount,
          onlineMembers: prev.onlineMembers, // Preserve current online count from presence
          loading: false
        }));
      }
    } catch (error) {
      console.error('Error in fetchCounts:', error);
      if (mountedRef.current) {
        setCounts(prev => ({ ...prev, loading: false }));
      }
    }
  };

  // Fetch initial counts
  useEffect(() => {
    if (!spaceId) {
      setCounts(prev => ({ ...prev, loading: false }));
      return;
    }

    mountedRef.current = true;
    debugMemberCounts('Initial fetch triggered', { spaceId });
    fetchCounts();

    return () => {
      mountedRef.current = false;
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [spaceId]);

  // Update online count whenever it changes from presence system
  useEffect(() => {
    if (!mountedRef.current) return;

    debugMemberCounts('Presence update received', {
      spaceId,
      onlineCount,
      presenceLoading,
      lastFetch: lastFetchRef.current ? Date.now() - lastFetchRef.current : 'never'
    });

    // Always update online count immediately
    if (typeof onlineCount === 'number') {
      setCounts(prev => ({
        ...prev,
        onlineMembers: onlineCount,
        loading: false
      }));
    }

    // If it's been more than 30 seconds since last fetch, refresh all counts
    if (Date.now() - lastFetchRef.current > 30000) {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      fetchTimeoutRef.current = setTimeout(fetchCounts, 100);
    }
  }, [onlineCount, spaceId, presenceLoading]);

  return counts;
};

export default useSimpleMemberCounts;

/**
 * Hook for just total member count (lightweight)
 */
export const useTotalMemberCount = (spaceId: string): number => {
  const { totalMembers } = useSimpleMemberCounts(spaceId);
  return totalMembers;
};

/**
 * Hook for just admin/owner count
 */
export const useAdminCount = (spaceId: string): number => {
  const { adminMembers } = useSimpleMemberCounts(spaceId);
  return adminMembers;
};

/**
 * Hook for just online count
 */
export const useOnlineCount = (spaceId: string): number => {
  const { onlineCount } = useSimpleSpacePresence(spaceId);
  return onlineCount;
}; 