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
import { useOptimizedAuth } from './useOptimizedAuth';

interface MemberCounts {
  totalMembers: number;
  onlineMembers: number;
  adminMembers: number;
  loading: boolean;
}

/**
 * 🚀 Simple hook for getting member counts with automatic fallback for unauthenticated users
 */
export const useSimpleMemberCounts = (spaceId: string): MemberCounts => {
  const [counts, setCounts] = useState<MemberCounts>({
    totalMembers: 0,
    onlineMembers: 0,
    adminMembers: 0,
    loading: true,
  });

  const { user } = useOptimizedAuth();
  const { onlineCount, loading: presenceLoading } = useSimpleSpacePresence(spaceId);
  const retryCount = useRef(0);
  const maxRetries = 3;
  const hasInitialized = useRef(false);

  const fetchMemberCounts = async (attempt = 1) => {
    if (!spaceId || !spaceId.trim()) return;

    try {
      const supabase = getSupabaseClient();
      
      // For unauthenticated users, use the public function
      if (!user) {
        console.log(`🔢 [SimpleMemberCounts] Using public function for unauthenticated user (attempt ${attempt})`);
        
        const { data, error } = await supabase.rpc('get_public_space_stats', {
          space_uuid: spaceId
        });

        if (error) {
          console.error(`❌ [SimpleMemberCounts] Public function error for space ${spaceId}:`, error);
          
          if (attempt < maxRetries) {
            retryCount.current = attempt;
            console.log(`🔄 [SimpleMemberCounts] Retrying public query (${attempt}/${maxRetries})...`);
            setTimeout(() => fetchMemberCounts(attempt + 1), 1000 * attempt);
            return;
          }
          
          // Set to 0 on final failure
          setCounts({
            totalMembers: 0,
            onlineMembers: 0,
            adminMembers: 0,
            loading: false,
          });
          return;
        }

        const result = data?.[0] || { total_members: 0, online_members: 0, admin_members: 0 };
        
        console.log(`🔢 [SimpleMemberCounts] Public function success for space ${spaceId}:`, result);
        
        setCounts({
          totalMembers: Number(result.total_members) || 0,
          onlineMembers: Number(result.online_members) || 0,
          adminMembers: Number(result.admin_members) || 0,
          loading: false,
        });
        
        retryCount.current = 0;
        return;
      }

      // For authenticated users, use the regular query
      console.log(`🔢 [SimpleMemberCounts] Fetching member counts for space ${spaceId} (attempt ${attempt})`);

      const { data, error } = await supabase
        .from('space_members')
        .select('user_id, role, status')
        .eq('space_id', spaceId)
        .eq('status', 'active');

      if (error) {
        console.error(`❌ [SimpleMemberCounts] Database error for space ${spaceId}:`, error);
        
        if (attempt < maxRetries) {
          retryCount.current = attempt;
          console.log(`🔄 [SimpleMemberCounts] Retrying query (${attempt}/${maxRetries})...`);
          setTimeout(() => fetchMemberCounts(attempt + 1), 1000 * attempt);
          return;
        }
        
        // Set to 0 on final failure
        setCounts({
          totalMembers: 0,
          onlineMembers: onlineCount, // Use presence count if available
          adminMembers: 0,
          loading: false,
        });
        return;
      }

      const totalMembers = data?.length || 0;
      const adminMembers = data?.filter(member => member.role === 'admin').length || 0;

      console.log(`🔢 [SimpleMemberCounts] Successfully fetched counts for space ${spaceId}: {total: ${totalMembers}, online: ${onlineCount}, admin: ${adminMembers}}`);

      setCounts({
        totalMembers,
        onlineMembers: onlineCount, // Use real-time presence count
        adminMembers,
        loading: false,
      });

      retryCount.current = 0;
      
    } catch (error) {
      console.error(`❌ [SimpleMemberCounts] Fetch failed for space ${spaceId}:`, error);
      
      if (attempt < maxRetries) {
        retryCount.current = attempt;
        console.log(`🔄 [SimpleMemberCounts] Retrying after error (${attempt}/${maxRetries})...`);
        setTimeout(() => fetchMemberCounts(attempt + 1), 1000 * attempt);
        return;
      }
      
      setCounts({
        totalMembers: 0,
        onlineMembers: user ? onlineCount : 0, // Only use presence count for authenticated users
        adminMembers: 0,
        loading: false,
      });
    }
  };

  useEffect(() => {
    if (!spaceId || !spaceId.trim()) {
      setCounts({
        totalMembers: 0,
        onlineMembers: 0,
        adminMembers: 0,
        loading: false,
      });
      return;
    }

    // Set loading state immediately
    setCounts(prev => ({ ...prev, loading: true }));
    
    // Reset retry count for new space
    retryCount.current = 0;
    hasInitialized.current = false;

    // Small delay for authenticated users to wait for presence system
    const delay = user && !hasInitialized.current ? 500 : 0;
    
    const timer = setTimeout(() => {
      fetchMemberCounts(1);
      hasInitialized.current = true;
    }, delay);

    return () => clearTimeout(timer);
  }, [spaceId, user?.id]); // Also depend on user ID changes

  // For authenticated users, update online count when presence changes
  useEffect(() => {
    if (user && !counts.loading && !presenceLoading) {
      setCounts(prev => ({
        ...prev,
        onlineMembers: onlineCount,
      }));
    }
      // Listen for presence updates to refresh counts
    const handlePresenceUpdate = (event: CustomEvent) => {
      if (event.detail?.spaceId === spaceId) {
        console.log(`🔢 [SimpleMemberCounts] Presence updated for space ${spaceId}, refreshing counts`);
        // Re-fetch member counts when presence is updated
        fetchMemberCounts(1);
      }
    };

    // Add event listener for presence updates
    window.addEventListener('presence-updated', handlePresenceUpdate as EventListener);

    return () => {
      window.removeEventListener('presence-updated', handlePresenceUpdate as EventListener);
    };
  }, [onlineCount, presenceLoading, user, counts.loading, spaceId]);

  return counts;
};

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
 * Hook for just online count (uses presence system directly)
 */
export const useOnlineCount = (spaceId: string): number => {
  const { onlineCount } = useSimpleSpacePresence(spaceId);
  return onlineCount;
}; 