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
  console.log("[membership-management addUserToSpace] Adding user to space:", { spaceId, userId, roleParam });
  
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
      console.error("[membership-management addUserToSpace] Error inserting into space_members:", memberInsertError);
      return { 
        success: false, 
        error: memberInsertError, 
        message: "Failed to add user to space_members."
      };
    }
    
    console.log("[membership-management addUserToSpace] Successfully inserted into space_members.");
    return { success: true };

  } catch (err) {
    console.error("Unexpected error in addUserToSpace:", err);
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
  console.log("[membership-management removeUserFromSpace] Removing user from space:", { spaceId, userId });
  
  try {
    // Remove from space_members only
    const { error: memberError } = await getSupabaseClient()
      .from('space_members')
      .delete()
      .eq('space_id', spaceId)
      .eq('user_id', userId);
    
    if (memberError) {
      console.error("Error removing user from space_members:", memberError);
      return { success: false, error: memberError };
    }
    
    console.log("[membership-management removeUserFromSpace] Successfully removed user from space_members.");
    return { success: true };
    
  } catch (err) {
    console.error("Unexpected error removing user from space:", err);
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
  console.log("[membership-management updateUserRole] Updating user role:", { spaceId, userId, newRole });
  
  const roleForSpaceMembers: 'admin' | 'member' = (newRole === 'owner' || newRole === 'admin') ? 'admin' : 'member';
  
  try {
    // Update space_members table only
    const { error: memberError } = await getSupabaseClient()
      .from('space_members')
      .update({ role: roleForSpaceMembers })
      .eq('space_id', spaceId)
      .eq('user_id', userId);
    
    if (memberError) {
      console.error("Error updating role in space_members:", memberError);
      return { 
        success: false, 
        error: memberError,
        message: "Failed to update role in space_members."
      };
    }
    
    console.log("[membership-management updateUserRole] Successfully updated user role in space_members.");
    return { success: true };
    
  } catch (err) {
    console.error("Unexpected error updating user role:", err);
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
      console.error("Error fetching space members:", error);
      return { success: false, error };
    }
    
    return { success: true, members: data };
  } catch (err) {
    console.error("Unexpected error fetching space members:", err);
    return { 
      success: false, 
      error: err instanceof Error ? err : new Error(String(err))
    };
  }
} 