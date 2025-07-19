import { log } from '@/utils/logger';
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
        .eq('status', 'active')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw new Error(error.message);
      }

      if (!data) {
        return null;
      }

      return data as { role: MemberRole; status: MemberStatus };
    } catch (error) {
      log.error('App', 'Error checking membership status:', error);
      throw error;
    }
  },

  /**
   * Join a space
   */
  async joinSpace(spaceId: string): Promise<JoinSpaceResponse> {
    log.debug('App', `[MembershipAPI] Attempting to join space: ${spaceId}`);
    
    try {
      // First try the RPC function
      log.debug('App', `[MembershipAPI] Calling public_join_space RPC...`);
      const { data, error } = await getSupabaseClient().rpc(
        'public_join_space',
        { p_space_id: spaceId }
      );

      if (error) {
        log.error('App', `[MembershipAPI] RPC error:`, error);
        
        // If RPC fails, try direct database approach as fallback
        log.debug('App', `[MembershipAPI] RPC failed, trying direct database approach...`);
        return await this.joinSpaceDirectly(spaceId);
      }

      log.debug('App', `[MembershipAPI] RPC success:`, data);
      return data as JoinSpaceResponse;
    } catch (error) {
      log.error('App', 'Error with RPC call:', error);
      
      // If RPC call throws an exception, try direct database approach
      log.debug('App', `[MembershipAPI] RPC threw exception, trying direct database approach...`);
      return await this.joinSpaceDirectly(spaceId);
    }
  },

  /**
   * Join a space using direct database operations (fallback method)
   */
  async joinSpaceDirectly(spaceId: string): Promise<JoinSpaceResponse> {
    try {
      log.debug('App', `[MembershipAPI] Direct join for space: ${spaceId}`);
      
      // Get current user
      const { data: { user }, error: authError } = await getSupabaseClient().auth.getUser();
      if (authError || !user) {
        throw new Error('Authentication required');
      }

      // Check if space exists
      const { data: space, error: spaceError } = await getSupabaseClient()
        .from('spaces')
        .select('id, name, owner_id')
        .eq('id', spaceId)
        .single();

      if (spaceError || !space) {
        throw new Error('Space not found');
      }

      // Check if user is already a member
      const { data: existingMember } = await getSupabaseClient()
        .from('space_members')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('space_id', spaceId)
        .maybeSingle();

      if (existingMember?.status === 'active') {
        return {
          success: true,
          message: 'You are already a member of this space'
        };
      }

      // If there's an inactive record, reactivate it
      if (existingMember && existingMember.status !== 'active') {
        const { error: updateError } = await getSupabaseClient()
          .from('space_members')
          .update({ 
            status: 'active', 
            joined_at: new Date().toISOString() 
          })
          .eq('id', existingMember.id);

        if (updateError) {
          throw new Error(`Failed to reactivate membership: ${updateError.message}`);
        }

        log.debug('App', `[MembershipAPI] Reactivated membership for user ${user.id} in space ${spaceId}`);
        return {
          success: true,
          message: 'Membership reactivated successfully'
        };
      }

      // Create new membership record
      const { error: insertError } = await getSupabaseClient()
        .from('space_members')
        .insert({
          user_id: user.id,
          space_id: spaceId,
          status: 'active',
          role: 'member',
          is_online: false,
          joined_at: new Date().toISOString()
        });

      if (insertError) {
        throw new Error(`Failed to create membership: ${insertError.message}`);
      }

      log.debug('App', `[MembershipAPI] Created new membership for user ${user.id} in space ${spaceId}`);
      return {
        success: true,
        message: 'Successfully joined space'
      };

    } catch (error) {
      log.error('App', 'Error in direct join:', error);
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
      log.error('App', 'Error leaving space:', error);
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
      log.error('App', 'Error changing member role:', error);
      throw error;
    }
  },

  /**
   * Remove a member from a space (delete the record)
   */
  async removeMember(spaceId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await getSupabaseClient()
        .from('space_members')
        .delete()
        .eq('user_id', userId)
        .eq('space_id', spaceId);

      if (error) {
        throw new Error(error.message);
      }

      return true;
    } catch (error) {
      log.error('App', 'Error removing member:', error);
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

      let query = getSupabaseClient()
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

      const members = (data || []).map((sm: any) => {
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
      log.error('App', 'Error fetching members:', error);
      throw error;
    }
  },
}; 