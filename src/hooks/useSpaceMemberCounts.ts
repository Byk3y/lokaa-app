/**
 * 🚀 UNIFIED MEMBER COUNTS HOOK
 * 
 * A clean, efficient hook for getting member counts with proper real-time
 * updates and presence integration.
 */

import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useSpacePresence } from './useSpacePresence';

interface MemberCounts {
  totalMembers: number;
  onlineMembers: number;
  adminMembers: number;
  loading: boolean;
  error: string | null;
}

export function useSpaceMemberCounts(spaceId: string | undefined): MemberCounts {
  const { onlineCount, loading: presenceLoading } = useSpacePresence(spaceId);
  const [counts, setCounts] = useState<MemberCounts>({
    totalMembers: 0,
    onlineMembers: 0,
    adminMembers: 0,
    loading: true,
    error: null
  });

  useEffect(() => {
    if (!spaceId) {
      setCounts(prev => ({ ...prev, loading: false }));
      return;
    }

    const fetchCounts = async () => {
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔢 [MemberCounts] Fetching counts for space', spaceId);
        }
        
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .rpc('get_member_counts', { p_space_id: spaceId });

        if (error) throw error;

        if (process.env.NODE_ENV === 'development') {
          console.log('🔢 [MemberCounts] Successfully fetched counts:', data);
        }
        
        setCounts({
          totalMembers: data[0].total_members,
          adminMembers: data[0].admin_members,
          onlineMembers: onlineCount,
          loading: false,
          error: null
        });
      } catch (err) {
        console.error('Failed to fetch member counts:', err);
        setCounts(prev => ({ 
          ...prev, 
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to fetch counts'
        }));
      }
    };

    fetchCounts();

    // Subscribe to space_members changes
    const supabase = getSupabaseClient();
    const channel = supabase.channel(`space_members_changes:${spaceId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'space_members',
        filter: `space_id=eq.${spaceId}`
      }, () => {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔢 [MemberCounts] Members updated, refreshing counts');
        }
        fetchCounts();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [spaceId, onlineCount]);

  // Update online count when presence changes
  useEffect(() => {
    setCounts(prev => ({
      ...prev,
      onlineMembers: onlineCount,
      loading: presenceLoading
    }));
  }, [onlineCount, presenceLoading]);

  return counts;
} 