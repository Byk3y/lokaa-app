import { log } from '@/utils/logger';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { MemberStats, MemberStatus, SpaceMember, UseMembersParams } from '@/types/members';
import { formatJoinedDate } from '@/utils/dateUtils';
import { useRealtime } from '@/hooks/useRealtime';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to fetch and manage space members
 * 
 * Currently using mock data with the structure matching our desired SpaceMember interface
 * Once the database schema is fully implemented, the mock data can be replaced with real queries
 */
export const useSpaceMembers = ({
  spaceId,
  status = 'active',
  searchQuery = '',
  limit = 50,
  page = 1
}: UseMembersParams) => {
  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [stats, setStats] = useState<MemberStats>({
    totalMembers: 0,
    onlineMembers: 0,
    adminCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const { user } = useAuth();

  const fetchMembers = useCallback(async () => {
    if (!spaceId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();

      // 1. Fetch member details with user profiles
      const { data, error: membersError } = await supabase
        .from('space_members')
        .select(`
          id,
          user_id, 
          space_id,
          role,
          joined_at,
          status,
          is_online,
          last_active_at,
          users:user_id (
            full_name,
            profile_url,
            avatar_url,
            bio,
            country
          )
        `)
        .eq('space_id', spaceId)
        .eq('status', 'active')
        .order('joined_at', { ascending: false });

      if (membersError) throw membersError;

      // Transform the nested data to match our interface
      let formattedMembers: SpaceMember[] = (data || []).map((member: any) => ({
        id: member.id,
        user_id: member.user_id,
        space_id: member.space_id,
        role: member.role,
        joined_at: member.joined_at,
        status: member.status,
        is_online: member.is_online,
        last_active_at: member.last_active_at,
        full_name: member.users?.full_name || null,
        username: member.users?.profile_url || null,
        avatar_url: member.users?.avatar_url || null,
        bio: member.users?.bio || null,
        location: member.users?.country || null,
        formattedJoinDate: formatJoinedDate(member.joined_at)
      }));

      // Apply search query filtering client-side if needed, or refine query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        formattedMembers = formattedMembers.filter(m =>
          m.full_name?.toLowerCase().includes(query) ||
          m.username?.toLowerCase().includes(query)
        );
      }

      setMembers(formattedMembers.slice((page - 1) * limit, page * limit));

      // 2. Calculate Stats from the full set (more efficient than 3 separate count queries)
      const allActiveMembers = data || [];
      setStats({
        totalMembers: allActiveMembers.length,
        onlineMembers: allActiveMembers.filter(m => m.is_online).length,
        adminCount: allActiveMembers.filter(m => m.role === 'admin' || m.role === 'owner').length
      });

    } catch (err) {
      log.error('Hook', 'Error fetching space members:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch members'));
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [spaceId, status, searchQuery, limit, page]);

  // Set up real-time subscription for space members
  useRealtime(
    spaceId,
    'space_members',
    (payload) => {
      log.debug('Hook', '[useSpaceMembers] Real-time event received:', payload.eventType);
      fetchMembers(); // Refresh on any member change
    },
    {
      event: '*',
      filter: spaceId ? `space_id=eq.${spaceId}` : undefined
    }
  );

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers, refreshTrigger]);

  // Update member's online status
  const updateMemberActivity = useCallback(async (userId: string): Promise<boolean> => {
    if (!spaceId || !userId) return false;

    try {
      const { error: updateError } = await getSupabaseClient()
        .from('space_members')
        .update({
          last_active_at: new Date().toISOString(),
          is_online: true
        })
        .eq('user_id', userId)
        .eq('space_id', spaceId);

      if (updateError) throw updateError;

      return true;
    } catch (err) {
      log.error('Hook', 'Error updating member activity:', err);
      return false;
    }
  }, [spaceId]);

  // Update member status
  const updateMemberStatus = useCallback(async (memberId: string, newStatus: MemberStatus): Promise<boolean> => {
    if (!memberId) return false;

    try {
      const { error: updateError } = await getSupabaseClient()
        .from('space_members')
        .update({ status: newStatus })
        .eq('id', memberId);

      if (updateError) throw updateError;

      return true;
    } catch (err) {
      log.error('Hook', 'Error updating member status:', err);
      return false;
    }
  }, []);

  // Manually refresh the data
  const refresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  return {
    members,
    stats,
    loading,
    error,
    refresh,
    updateMemberActivity,
    updateMemberStatus
  };
}
