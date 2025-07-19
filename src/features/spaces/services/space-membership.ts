import { log } from '@/utils/logger';
/**
 * Space membership service
 * Handles joining spaces and updating cache for memberships
 */

import { getSupabaseClient } from '@/integrations/supabase/client';
import type { SpaceCacheEntry } from '@/shared/types/spaces';
import { setLastJoinedSpace, cacheSpaceForRedirection } from './space-cache';

/**
 * Update the lastJoinedSpace in localStorage when a user joins a space
 * This is specifically for space_access operations where a user gets access
 * to a space but doesn't own it
 * 
 * @param spaceId - The ID of the space the user joined
 * @param userId - The ID of the user who joined the space
 */
export async function updateLastJoinedSpace(spaceId: string, userId: string): Promise<void> {
  try {
    // Fetch the space data to cache
    const { data: space, error } = await getSupabaseClient()
      .from('spaces')
      .select('id, name, subdomain')
      .eq('id', spaceId)
      .maybeSingle();

    if (error || !space) {
      log.error('Service', 'Error fetching space data for lastJoinedSpace update:', error);
      return;
    }

    // Update the cache with the joined space
    const cacheEntry: SpaceCacheEntry = {
      id: space.id,
      name: space.name,
      subdomain: space.subdomain,
    };

    setLastJoinedSpace(cacheEntry);
    
    log.debug('Service', 'Updated lastJoinedSpace cache for user joining space:', {
      userId,
      spaceId,
      spaceName: space.name,
      subdomain: space.subdomain,
    });
  } catch (error) {
    log.error('Service', 'Exception updating lastJoinedSpace:', error);
  }
}

/**
 * Handle space join workflow
 * Updates both database and cache appropriately
 * 
 * @param spaceId - The ID of the space to join
 * @param userId - The ID of the user joining
 * @returns Success status
 */
export async function joinSpace(spaceId: string, userId: string): Promise<boolean> {
  try {
    // First, get space details
    const { data: space, error: spaceError } = await getSupabaseClient()
      .from('spaces')
      .select('id, name, subdomain, owner_id')
      .eq('id', spaceId)
      .maybeSingle();

    if (spaceError || !space) {
      log.error('Service', 'Error fetching space for join operation:', spaceError);
      return false;
    }

    // Check if user is already the owner
    if (space.owner_id === userId) {
      log.debug('Service', 'User already owns this space, updating cache only');
      
      // Cache as visited space since they own it
      cacheSpaceForRedirection(space, userId);
      
      return true;
    }

    // Check if user already has membership
    const { data: existingMember } = await getSupabaseClient()
      .from('space_members')
      .select('id, status')
      .eq('user_id', userId)
      .eq('space_id', spaceId)
      .maybeSingle();

    if (existingMember?.status === 'active') {
      log.debug('Service', 'User already has active membership to this space');
      
      // Update cache since they joined
      await updateLastJoinedSpace(spaceId, userId);
      
      return true;
    }

    // If there's an inactive record, reactivate it
    if (existingMember && existingMember.status !== 'active') {
      const { error: updateError } = await getSupabaseClient()
        .from('space_members')
        .update({ status: 'active', joined_at: new Date().toISOString() })
        .eq('id', existingMember.id);

      if (updateError) {
        log.error('Service', 'Error reactivating space membership:', updateError);
        return false;
      }

      log.debug('Service', 'Reactivated existing space membership');
    } else {
      // Create new space membership record
      const { error: insertError } = await getSupabaseClient()
        .from('space_members')
        .insert({
          user_id: userId,
          space_id: spaceId,
          status: 'active',
          role: 'member',
          joined_at: new Date().toISOString()
        });

      if (insertError) {
        log.error('Service', 'Error creating space membership record:', insertError);
        return false;
      }

      log.debug('Service', 'Created new space membership record');
    }

    // Update cache for the newly joined space
    await updateLastJoinedSpace(spaceId, userId);

    return true;
  } catch (error) {
    log.error('Service', 'Exception in joinSpace:', error);
    return false;
  }
}

/**
 * Leave a space by deactivating membership
 * 
 * @param spaceId - The ID of the space to leave
 * @param userId - The ID of the user leaving
 * @returns Success status
 */
export async function leaveSpace(spaceId: string, userId: string): Promise<boolean> {
  try {
    // Check if user owns the space (owners can't leave their own spaces)
    const { data: space } = await getSupabaseClient()
      .from('spaces')
      .select('owner_id')
      .eq('id', spaceId)
      .maybeSingle();

    if (space?.owner_id === userId) {
      log.error('Service', 'Space owners cannot leave their own spaces');
      return false;
    }

    // Deactivate space membership
    const { error } = await getSupabaseClient()
      .from('space_members')
      .update({ status: 'inactive', joined_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('space_id', spaceId);

    if (error) {
      log.error('Service', 'Error leaving space:', error);
      return false;
    }

    log.debug('Service', 'Successfully left space:', spaceId);
    return true;
  } catch (error) {
    log.error('Service', 'Exception in leaveSpace:', error);
    return false;
  }
}

/**
 * Check if user is a member of a space (but not the owner)
 * 
 * @param spaceId - The ID of the space to check
 * @param userId - The ID of the user to check
 * @returns True if user is a member (has access but doesn't own)
 */
export async function isSpaceMember(spaceId: string, userId: string): Promise<boolean> {
  try {
    // First check if user owns the space
    const { data: space } = await getSupabaseClient()
      .from('spaces')
      .select('owner_id')
      .eq('id', spaceId)
      .maybeSingle();

    if (space?.owner_id === userId) {
      return false; // Owner is not considered a "member"
    }

    // Check if user has active membership
    const { data: member } = await getSupabaseClient()
      .from('space_members')
      .select('id')
      .eq('user_id', userId)
      .eq('space_id', spaceId)
      .eq('status', 'active')
      .maybeSingle();

    return !!member;
  } catch (error) {
    log.error('Service', 'Error checking space membership:', error);
    return false;
  }
}

/**
 * Get all members of a space (excluding the owner)
 * 
 * @param spaceId - The ID of the space
 * @returns Array of user IDs who are members of the space
 */
export async function getSpaceMembers(spaceId: string): Promise<string[]> {
  try {
    const { data: members, error } = await getSupabaseClient()
      .from('space_members')
      .select('user_id')
      .eq('space_id', spaceId)
      .eq('status', 'active');

    if (error) {
      log.error('Service', 'Error fetching space members:', error);
      return [];
    }

    return (members || []).map(member => member.user_id);
  } catch (error) {
    log.error('Service', 'Exception fetching space members:', error);
    return [];
  }
} 