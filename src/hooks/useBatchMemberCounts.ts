import { log } from '@/utils/logger';
import { useState, useEffect, useCallback, useRef } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';

interface SpaceMemberCounts {
  [spaceId: string]: {
    totalMembers: number;
    onlineMembers: number;
    adminMembers: number;
  }
}

interface UseBatchMemberCountsResult {
  counts: SpaceMemberCounts;
  loading: boolean;
  refreshCounts: () => Promise<void>;
}

/**
 * A hook to efficiently fetch member counts for multiple spaces at once
 * Useful for list views like Discover, Spaces pages, etc.
 */
export function useBatchMemberCounts(spaceIds: string[]): UseBatchMemberCountsResult {
  const [counts, setCounts] = useState<SpaceMemberCounts>({});
  const [loading, setLoading] = useState(true);
  
  // Track if component is mounted
  const isMounted = useRef(true);
  
  // Create a stable fetch function
  const fetchCounts = useCallback(async () => {
    if (!spaceIds.length) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    
    try {
      // Fetch all member counts at once with a single query for better performance
      const { data, error } = await getSupabaseClient()
        .from('space_members')
        .select('space_id, status, is_online, role')
        .in('space_id', spaceIds)
        .in('status', ['active']);
        
      if (error) throw error;
      
      // Process the results to get counts for each space
      const result: SpaceMemberCounts = {};
      
      // Initialize result with zeros for all spaces
      spaceIds.forEach(id => {
        result[id] = {
          totalMembers: 0,
          onlineMembers: 0,
          adminMembers: 0
        };
      });
      
      // Count members for each space
      data?.forEach(member => {
        const spaceId = member.space_id;
        
        // Increment total members (all active members are already filtered)
        result[spaceId].totalMembers++;
        
        // Count online members
        if (member.is_online) {
          result[spaceId].onlineMembers++;
        }
        
        // Count admin members
        if (member.role === 'admin') {
          result[spaceId].adminMembers++;
        }
      });
      
      if (isMounted.current) {
        setCounts(result);
        setLoading(false);
      }
    } catch (error) {
      log.error('Hook', 'Error fetching batch member counts:', error);
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [spaceIds]);
  
  // Fetch counts when spaceIds change
  useEffect(() => {
    isMounted.current = true;
    fetchCounts();
    
    return () => {
      isMounted.current = false;
    };
  }, [spaceIds, fetchCounts]);
  
  return {
    counts,
    loading,
    refreshCounts: fetchCounts
  };
} 