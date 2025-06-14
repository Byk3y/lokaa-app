import { useEffect, useState, useCallback } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { MemberStats, MemberStatus, SpaceMember, UseMembersParams } from '@/types/members';
import { formatJoinedDate } from '@/utils/dateUtils';

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

  // Fetch data based on parameters
  useEffect(() => {
    if (!spaceId) {
      setLoading(false);
      return;
    }
    
    // Note: This is a temporary implementation using mock data
    // This will be replaced with actual Supabase queries once the schema is updated
    async function fetchMembers() {
      setLoading(true);
      setError(null);
      
      try {
        // Mock data for development
        const mockMembers: SpaceMember[] = [
          { 
            id: '1', 
            user_id: '1',
            space_id: spaceId,
            full_name: 'You (Owner)', 
            username: 'owner',
            avatar_url: null,
            role: 'owner', 
            bio: 'Building something great,', 
            joined_at: '2023-04-12T10:30:00Z',
            last_active_at: new Date().toISOString(),
            is_online: true,
            location: 'Belgium',
            status: 'active'
          },
          { 
            id: '2', 
            user_id: '2',
            space_id: spaceId,
            full_name: 'Jane Smith', 
            username: 'jane-smith',
            avatar_url: null,
            role: 'admin', 
            bio: 'Sharing knowledge and ideas.',
            joined_at: '2023-10-15T14:20:00Z',
            last_active_at: new Date().toISOString(),
            is_online: true,
            location: 'United States',
            status: 'active'
          },
          { 
            id: '3', 
            user_id: '3',
            space_id: spaceId,
            full_name: 'John Doe', 
            username: 'john-doe',
            avatar_url: null,
            role: 'member', 
            bio: 'Lifelong learner.',
            joined_at: '2024-06-27T09:15:00Z',
            last_active_at: null,
            is_online: false,
            location: 'Germany',
            status: 'active'
          },
          {
            id: '4',
            user_id: '4',
            space_id: spaceId,
            full_name: 'Alice Johnson',
            username: 'alice',
            avatar_url: null,
            role: 'member',
            bio: 'UX Designer with a passion for intuitive interfaces',
            joined_at: '2024-01-10T08:45:00Z',
            last_active_at: null,
            is_online: false,
            location: 'Canada',
            status: 'active'
          },
          {
            id: '5',
            user_id: '5',
            space_id: spaceId,
            full_name: 'Bob Wilson',
            username: 'bob',
            avatar_url: null,
            role: 'member',
            bio: 'Full-stack developer focused on React and Node.js',
            joined_at: '2023-12-05T14:20:00Z',
            last_active_at: new Date().toISOString(),
            is_online: true,
            location: 'UK',
            status: 'active'
          }
        ];

        // Filter by status and search
        const filteredMembers = mockMembers.filter((member) => 
          member.status === status &&
          (searchQuery === '' || 
            (member.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
             member.username?.toLowerCase().includes(searchQuery.toLowerCase()) || 
             member.bio?.toLowerCase().includes(searchQuery.toLowerCase())))
        );
        
        // Apply pagination
        const paginatedMembers = filteredMembers.slice((page - 1) * limit, page * limit);
        
        // Add formatted dates
        const formattedMembers = paginatedMembers.map(member => ({
          ...member,
          formattedJoinDate: formatJoinedDate(member.joined_at)
        }));
        
        setMembers(formattedMembers);
        
        // Set stats
        setStats({
          totalMembers: mockMembers.filter(m => m.status === 'active').length,
          onlineMembers: mockMembers.filter(m => m.is_online && m.status === 'active').length,
          adminCount: mockMembers.filter(m => 
            (m.role === 'admin' || m.role === 'owner') && 
            m.status === 'active'
          ).length
        });

        // PROD IMPLEMENTATION (commented until DB schema is ready)
        // To replace the mock implementation, uncomment this code:
        /*
        // Get members with join to users
        const { data, error: membersError } = await getSupabaseClient()
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
            users (
              full_name,
              profile_url,
              avatar_url,
              bio,
              country
            )
          `)
          .eq('space_id', spaceId)
          .eq('status', status)
          .order('joined_at', { ascending: false })
          .range((page - 1) * limit, page * limit - 1);

        if (membersError) throw membersError;

        // Transform the nested data to match our interface
        const formattedMembers = (data || []).map(member => ({
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

        setMembers(formattedMembers);

        // Get counts for stats
        const [totalCountResult, onlineCountResult, adminCountResult] = await Promise.all([
          supabase
            .from('space_members')
            .select('id', { count: 'exact', head: true })
            .eq('space_id', spaceId)
            .eq('status', 'active'),

          supabase
            .from('space_members')
            .select('id', { count: 'exact', head: true })
            .eq('space_id', spaceId)
            .eq('is_online', true)
            .eq('status', 'active'),

          supabase
            .from('space_members')
            .select('id', { count: 'exact', head: true })
            .eq('space_id', spaceId)
            .eq('status', 'active')
            .in('role', ['owner', 'admin'])
        ]);

        setStats({
          totalMembers: totalCountResult.count || 0,
          onlineMembers: onlineCountResult.count || 0,
          adminCount: adminCountResult.count || 0
        });
        */
      } catch (err) {
        console.error('Error fetching space members:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch members'));
        
        // Set fallback empty state
        setMembers([]);
        setStats({
          totalMembers: 0,
          onlineMembers: 0,
          adminCount: 0
        });
      } finally {
        setLoading(false);
      }
    }

    fetchMembers();
  }, [spaceId, status, searchQuery, limit, page, refreshTrigger]);

  // Update member's online status
  const updateMemberActivity = useCallback(async (userId: string): Promise<boolean> => {
    if (!spaceId || !userId) return false;
    
    try {
      // MOCK: Update the member's online status in local state
      setMembers(prevMembers => 
        prevMembers.map(member => 
          member.user_id === userId 
            ? { 
                ...member, 
                is_online: true,
                last_active_at: new Date().toISOString()
              } 
            : member
        )
      );
      
      // PROD IMPLEMENTATION (uncomment when DB schema is ready)
      /*
      const { error } = await getSupabaseClient()
        .from('space_members')
        .update({ 
          last_active_at: new Date().toISOString(),
          is_online: true
        })
        .eq('user_id', userId)
        .eq('space_id', spaceId);
      
      if (error) throw error;
      */
      
      return true;
    } catch (err) {
      console.error('Error updating member activity:', err);
      return false;
    }
  }, [spaceId]);

  // Update member status
  const updateMemberStatus = useCallback(async (memberId: string, newStatus: MemberStatus): Promise<boolean> => {
    if (!memberId) return false;
    
    try {
      // MOCK: Update the member's status in local state
      setMembers(prevMembers => 
        prevMembers.map(member => 
          member.id === memberId 
            ? { ...member, status: newStatus } 
            : member
        )
      );
      
      // PROD IMPLEMENTATION (uncomment when DB schema is ready)
      /*
      const { error } = await getSupabaseClient()
        .from('space_members')
        .update({ status: newStatus })
        .eq('id', memberId);
      
      if (error) throw error;
      */
      
      return true;
    } catch (err) {
      console.error('Error updating member status:', err);
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
