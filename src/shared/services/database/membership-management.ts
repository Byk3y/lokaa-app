import { log } from '@/utils/logger';
import { getSupabaseClient } from "@/integrations/supabase/client";
import type { MemberRole } from '@/contexts/MembershipContext';

/**
 * Membership management result interface
 */
export interface MembershipResult {
  success: boolean;
  error?: any;
  message?: string;
}

/**
 * Space member data interface
 */
export interface SpaceMemberData {
  user_id: string;
  space_id: string;
  role: 'admin' | 'member';
  status: 'active' | 'inactive' | 'pending';
  joined_at?: string;
}

/**
 * Space access data interface
 */
export interface SpaceAccessData {
  space_id: string;
  user_id: string;
  is_active: boolean;
  role: string; // Can be 'owner', 'admin', or 'member'
}

/**
 * Adds a user to a space using only the space_members table
 * Single source of truth approach
 */
export async function addUserToSpace(
  spaceId: string, 
  userId: string, 
  roleParam: MemberRole = 'admin'
): Promise<MembershipResult> {
  log.debug('Service', "[membership-management addUserToSpace] Adding user to space:", { spaceId, userId, roleParam });
  
  // Convert role to space_members format
  const roleForSpaceMembers: 'admin' | 'member' = (roleParam === 'owner' || roleParam === 'admin') ? 'admin' : 'member';

  try {
    // Add to space_members table only
    const { error: memberInsertError } = await getSupabaseClient()
      .from('space_members')
      .insert({
        user_id: userId,
        space_id: spaceId,
        role: roleForSpaceMembers,
        status: 'active',
        joined_at: new Date().toISOString()
      });

    if (memberInsertError) {
      log.error('Service', "[membership-management addUserToSpace] Error inserting into space_members:", memberInsertError);
      return { 
        success: false, 
        error: memberInsertError, 
        message: "Failed to add user to space_members."
      };
    }
    
    // Create default points record for the new member
    const pointsResult = await createDefaultPointsRecord(spaceId, userId);
    if (!pointsResult.success) {
      log.warn('Service', "[membership-management addUserToSpace] Failed to create default points record:", pointsResult.error);
      // Don't fail the entire operation if points record creation fails
    }
    
    log.debug('Service', "[membership-management addUserToSpace] Successfully inserted into space_members.");
    return { success: true };

  } catch (err) {
    log.error('Service', "Unexpected error in addUserToSpace:", err);
    return { 
      success: false, 
      error: err instanceof Error ? err : new Error(String(err)),
      message: "Unexpected error occurred during user addition."
    };
  }
}

/**
 * Removes a user from a space using only space_members table
 */
export async function removeUserFromSpace(spaceId: string, userId: string): Promise<MembershipResult> {
  log.debug('Service', "[membership-management removeUserFromSpace] Removing user from space:", { spaceId, userId });
  
  try {
    // Remove from space_members only
    const { error: memberError } = await getSupabaseClient()
      .from('space_members')
      .delete()
      .eq('space_id', spaceId)
      .eq('user_id', userId);
    
    if (memberError) {
      log.error('Service', "Error removing user from space_members:", memberError);
      return { success: false, error: memberError };
    }
    
    log.debug('Service', "[membership-management removeUserFromSpace] Successfully removed user from space_members.");
    return { success: true };
    
  } catch (err) {
    log.error('Service', "Unexpected error removing user from space:", err);
    return { 
      success: false, 
      error: err instanceof Error ? err : new Error(String(err))
    };
  }
}

/**
 * Updates a user's role in a space using only space_members table
 */
export async function updateUserRole(
  spaceId: string, 
  userId: string, 
  newRole: MemberRole
): Promise<MembershipResult> {
  log.debug('Service', "[membership-management updateUserRole] Updating user role:", { spaceId, userId, newRole });
  
  const roleForSpaceMembers: 'admin' | 'member' = (newRole === 'owner' || newRole === 'admin') ? 'admin' : 'member';
  
  try {
    // Update space_members table only
    const { error: memberError } = await getSupabaseClient()
      .from('space_members')
      .update({ role: roleForSpaceMembers })
      .eq('space_id', spaceId)
      .eq('user_id', userId);
    
    if (memberError) {
      log.error('Service', "Error updating role in space_members:", memberError);
      return { 
        success: false, 
        error: memberError,
        message: "Failed to update role in space_members."
      };
    }
    
    log.debug('Service', "[membership-management updateUserRole] Successfully updated user role in space_members.");
    return { success: true };
    
  } catch (err) {
    log.error('Service', "Unexpected error updating user role:", err);
    return { 
      success: false, 
      error: err instanceof Error ? err : new Error(String(err))
    };
  }
}

/**
 * Gets all members of a space
 */
export async function getSpaceMembers(spaceId: string): Promise<{ success: boolean; members?: any[]; error?: any }> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('space_members')
      .select(`
        user_id,
        role,
        status,
        joined_at,
        users:user_id (
          email,
          raw_user_meta_data
        )
      `)
      .eq('space_id', spaceId)
      .eq('status', 'active');
    
    if (error) {
      log.error('Service', "Error fetching space members:", error);
      return { success: false, error };
    }
    
    return { success: true, members: data };
  } catch (err) {
    log.error('Service', "Unexpected error fetching space members:", err);
    return { 
      success: false, 
      error: err instanceof Error ? err : new Error(String(err))
    };
  }
}

/**
 * Creates a default points record for a user in a space
 * This ensures all space members have a points record for leaderboard functionality
 */
export async function createDefaultPointsRecord(
  spaceId: string, 
  userId: string
): Promise<MembershipResult> {
  log.debug('Service', "[membership-management createDefaultPointsRecord] Creating default points record:", { spaceId, userId });
  
  try {
    // Check if points record already exists
    const { data: existingRecord, error: checkError } = await getSupabaseClient()
      .from('space_user_points')
      .select('user_id')
      .eq('space_id', spaceId)
      .eq('user_id', userId)
      .limit(1);

    if (checkError) {
      log.error('Service', "[membership-management createDefaultPointsRecord] Error checking existing record:", checkError);
      return { 
        success: false, 
        error: checkError, 
        message: "Failed to check existing points record."
      };
    }

    // If record already exists, no need to create
    if (existingRecord && existingRecord.length > 0) {
      log.debug('Service', "[membership-management createDefaultPointsRecord] Points record already exists");
      return { success: true, message: "Points record already exists" };
    }

    // Create default points record
    const { error: insertError } = await getSupabaseClient()
      .from('space_user_points')
      .insert({
        user_id: userId,
        space_id: spaceId,
        points: 0
      });

    if (insertError) {
      log.error('Service', "[membership-management createDefaultPointsRecord] Error creating points record:", insertError);
      return { 
        success: false, 
        error: insertError, 
        message: "Failed to create default points record."
      };
    }
    
    log.debug('Service', "[membership-management createDefaultPointsRecord] Successfully created default points record.");
    return { success: true, message: "Default points record created" };

  } catch (err) {
    log.error('Service', "Unexpected error in createDefaultPointsRecord:", err);
    return { 
      success: false, 
      error: err instanceof Error ? err : new Error(String(err)),
      message: "Unexpected error occurred during points record creation."
    };
  }
} 