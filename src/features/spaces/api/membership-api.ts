/**
 * Membership API Client
 * 
 * This module provides a type-safe client for interacting with space membership API endpoints.
 */

import { getSupabaseClient } from '@/integrations/supabase/client';
import { 
  MemberRole, 
  MemberStatus,
  SpaceMember, 
  FetchMembersOptions,
  JoinSpaceResponse
} from '../types/membership';

// Type for raw data from space_members joined with users
interface RawFetchedSpaceMember {
  id: string;
  user_id: string;
  space_id: string;
  role: string;
  joined_at: string;
  status: string;
  is_online: boolean;
  last_active_at: string | null;
  users: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | { error: unknown; [key: string]: any } | null;
}

/**
 * Membership API client
 */
export const membershipApi = {
  /**
   * Get a user's membership status in a space
   */
  async checkMembershipStatus(userId: string, spaceId: string) {
    try {
      const { data, error } = await getSupabaseClient()
        .from('space_members')
        .select('role, status')
        .eq('user_id', userId)
        .eq('space_id', spaceId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw new Error(error.message);
      }

      if (!data) {
        return null;
      }

      return data as { role: MemberRole; status: MemberStatus };
    } catch (error) {
      console.error('Error checking membership status:', error);
      throw error;
    }
  },

  /**
   * Join a space
   */
  async joinSpace(spaceId: string): Promise<JoinSpaceResponse> {
    try {
      const { data, error } = await getSupabaseClient().rpc(
        'public_join_space',
        { p_space_id: spaceId }
      );

      if (error) {
        throw new Error(error.message);
      }

      return data as JoinSpaceResponse;
    } catch (error) {
      console.error('Error joining space:', error);
      throw error;
    }
  },

  /**
   * Leave a space
   */
  async leaveSpace(userId: string, spaceId: string): Promise<boolean> {
    try {
      const { error } = await getSupabaseClient()
        .from('space_members')
        .delete()
        .match({ user_id: userId, space_id: spaceId });

      if (error) {
        throw new Error(error.message);
      }

      return true;
    } catch (error) {
      console.error('Error leaving space:', error);
      throw error;
    }
  },

  /**
   * Change a member's role
   */
  async changeMemberRole(spaceId: string, userId: string, role: MemberRole): Promise<boolean> {
    try {
      const { error } = await getSupabaseClient()
        .from('space_members')
        .update({ role })
        .eq('user_id', userId)
        .eq('space_id', spaceId);

      if (error) {
        throw new Error(error.message);
      }

      return true;
    } catch (error) {
      console.error('Error changing member role:', error);
      throw error;
    }
  },

  /**
   * Remove a member from a space (set to banned)
   */
  async removeMember(spaceId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await getSupabaseClient()
        .from('space_members')
        .update({ status: 'banned' as MemberStatus })
        .eq('user_id', userId)
        .eq('space_id', spaceId);

      if (error) {
        throw new Error(error.message);
      }

      return true;
    } catch (error) {
      console.error('Error removing member:', error);
      throw error;
    }
  },

  /**
   * Fetch members of a space
   */
  async fetchMembers(
    spaceId: string,
    options: FetchMembersOptions = {}
  ): Promise<SpaceMember[]> {
    try {
      const { status = 'active', searchQuery = '', limit = 50, page = 1 } = options;

      let query = supabase
        .from('space_members')
        .select(`
          id, user_id, space_id, role, joined_at, status, is_online, last_active_at,
          users (id, full_name, username, avatar_url)
        `)
        .eq('space_id', spaceId);

      if (status) {
        query = query.eq('status', status);
      }

      query = query
        .order('joined_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      const members = (data || []).map((sm: RawFetchedSpaceMember) => {
        const isValidUser = sm.users && !('error' in sm.users && sm.users.error !== undefined);
        const userDetails = isValidUser ? sm.users : null;

        return {
          id: sm.id,
          user_id: sm.user_id,
          space_id: sm.space_id,
          role: sm.role as MemberRole,
          joined_at: sm.joined_at || new Date().toISOString(),
          status: sm.status as MemberStatus,
          is_online: sm.is_online || false,
          last_active_at: sm.last_active_at || null,
          full_name: userDetails && 'full_name' in userDetails ? userDetails.full_name : null,
          username: userDetails && 'username' in userDetails ? userDetails.username : null,
          avatar_url: userDetails && 'avatar_url' in userDetails ? userDetails.avatar_url : null,
        };
      });

      if (searchQuery) {
        return members.filter((member) =>
          member.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          member.username?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      return members;
    } catch (error) {
      console.error('Error fetching members:', error);
      throw error;
    }
  },
}; 