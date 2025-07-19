import { log } from '@/utils/logger';
/**
 * Space Access Recovery Service
 * 
 * This service helps diagnose and fix space access issues when users
 * are unable to access spaces they should have access to.
 * 
 * Common scenarios:
 * - User shows as member but gets "access denied"
 * - Space owner can't access their own space
 * - Member list doesn't show properly
 * - RLS policies blocking legitimate access
 */

import { getSupabaseClient } from '@/integrations/supabase/client';
import type { Database } from '@/types/database.types';
import { PostgrestError } from '@supabase/supabase-js';
import { User as AuthUser } from "@/contexts/AuthContext";

// Type definitions for space membership data
type SpaceRow = Database['public']['Tables']['spaces']['Row'];
type SpaceMemberRow = Database['public']['Tables']['space_members']['Row'];

/**
 * Diagnostic result interface
 */
export interface DiagnosticResult {
  success: boolean;
  space: SpaceRow | null;
  isOwner: boolean;
  hasAccess: boolean;
  memberRecord: SpaceMemberRow | null;
  membershipRole: string | null;
  membershipStatus: string | null;
  user: AuthUser | null;
  issues: string[];
  recommendations: string[];
}

/**
 * Access recovery result interface
 */
export interface AccessRecoveryResult {
  success: boolean;
  message?: string;
  error?: any;
}

/**
 * Space validation result
 */
export interface SpaceValidationResult {
  exists: boolean;
  accessible: boolean;
  isOwner: boolean;
  isMember: boolean;
  issues: string[];
}

/**
 * Check access result interface
 */
export interface CheckAccessResult {
  space: SpaceRow | null;
  isOwner: boolean;
  hasAccess: boolean;
  memberRecord: SpaceMemberRow | null;
  membershipRole: string | null;
  membershipStatus: string | null;
  user: AuthUser | null;
}

/**
 * Direct check result interface
 */
export interface DirectCheckResult {
  success: boolean;
  space?: SpaceRow;
  isOwner?: boolean;
  hasAccess?: boolean;
  memberRecord?: SpaceMemberRow | null;
  membershipRole?: string | null;
  membershipStatus?: string | null;
  user?: AuthUser;
  errorDetails?: {
    phase: string;
    message: string;
    originalError?: any;
  };
}

/**
 * Gets space by subdomain using fallback methods
 */
async function getSpaceBySubdomain(subdomain: string): Promise<SpaceRow | null> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('spaces')
      .select('*')
      .eq('subdomain', subdomain)
      .maybeSingle<SpaceRow>();
    
    if (error && error.code !== 'PGRST116') {
      log.error('Service', "Error fetching space:", error);
      return null;
    }
    
    return data;
  } catch (error) {
    log.error('Service', "Exception fetching space:", error);
    return null;
  }
}

/**
 * Alternative space lookup for when main method fails
 */
async function alternativeSpaceLookup(subdomain: string): Promise<SpaceRow | null> {
  try {
    log.debug('Service', "Attempting alternative space lookup for:", subdomain);
    
    // Try using the RPC function if available
    const { data: rpcData, error: rpcError } = await getSupabaseClient()
      .rpc('get_space_by_subdomain', { target_subdomain: subdomain });
    
    if (!rpcError && rpcData && rpcData.length > 0) {
      return rpcData[0] as SpaceRow;
    }
    
    return null;
  } catch (error) {
    log.error('Service', "Alternative lookup failed:", error);
    return null;
  }
}

/**
 * Creates direct membership to the specified space for the current user
 * FIXED: Now uses space_members table instead of space_access
 */
export async function createSpaceMembership(spaceId: string, role: string = 'member'): Promise<AccessRecoveryResult> {
  try {
    // Get current user
    const { data: { user } } = await getSupabaseClient().auth.getUser();
    if (!user) {
      log.error('Service', "Not authenticated");
      return { success: false, error: new Error("Not authenticated") };
    }
    
    // Create a membership record directly using space_members table
    const { error } = await getSupabaseClient()
      .from('space_members')
      .insert({
        space_id: spaceId,
        user_id: user.id,
        status: 'active',
        role: role as 'admin' | 'member'
      });
      
    if (error && error.code !== '23505') { // Ignore duplicate key errors
      log.error('Service', "Error creating membership record:", error);
      return { success: false, error };
    }
    
    log.debug('Service', "Space membership created for user", user.id, "to space", spaceId);
    return { success: true, message: "Space membership granted successfully" };
  } catch (error) {
    log.error('Service', "Error creating space membership:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error(String(error)) 
    };
  }
}

/**
 * Removes membership for the current user from the specified space
 * FIXED: Now uses space_members table
 */
export async function removeSpaceMembership(spaceId: string): Promise<AccessRecoveryResult> {
  try {
    // Get current user
    const { data: { user } } = await getSupabaseClient().auth.getUser();
    if (!user) {
      return { success: false, error: new Error("Not authenticated") };
    }
    
    // Remove membership record
    const { error } = await getSupabaseClient()
      .from('space_members')
      .delete()
      .eq('space_id', spaceId)
      .eq('user_id', user.id);
      
    if (error) {
      log.error('Service', "Error removing membership:", error);
      return { success: false, error };
    }
    
    log.debug('Service', "Space membership removed for user", user.id, "from space", spaceId);
    return { success: true, message: "Space membership removed successfully" };
  } catch (error) {
    log.error('Service', "Error removing space membership:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error(String(error)) 
    };
  }
}

/**
 * Updates membership status for the current user
 */
export async function updateMembershipStatus(spaceId: string, status: 'active' | 'cancelling' | 'churned' | 'banned'): Promise<AccessRecoveryResult> {
  try {
    const { data: { user } } = await getSupabaseClient().auth.getUser();
    if (!user) {
      return { success: false, error: new Error("Not authenticated") };
    }
    
    const { error } = await getSupabaseClient()
      .from('space_members')
      .update({ status })
      .eq('space_id', spaceId)
      .eq('user_id', user.id);
      
    if (error) {
      log.error('Service', "Error updating membership status:", error);
      return { success: false, error };
    }
    
    log.debug('Service', "Membership status updated for user", user.id, "in space", spaceId, "to", status);
    return { success: true, message: `Membership status updated to ${status}` };
  } catch (error) {
    log.error('Service', "Error updating membership status:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error(String(error)) 
    };
  }
}

/**
 * Validates space existence and accessibility
 */
export async function validateSpace(subdomain: string): Promise<SpaceValidationResult> {
  try {
    const space = await getSpaceBySubdomain(subdomain);
    const issues: string[] = [];
    
    if (!space) {
      issues.push("Space not found with subdomain: " + subdomain);
      return {
        exists: false,
        accessible: false,
        isOwner: false,
        isMember: false,
        issues
      };
    }
    
    // Get current user
    const { data: { user } } = await getSupabaseClient().auth.getUser();
    if (!user) {
      return {
        exists: true,
        accessible: false,
        isOwner: false,
        isMember: false,
        issues: ["User not authenticated"]
      };
    }
    
    const isOwner = space.owner_id === user.id;
    
    // Check membership
    const { data: memberData, error: memberError } = await getSupabaseClient()
      .from('space_members')
      .select('role, status')
      .eq('space_id', space.id)
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (memberError && memberError.code !== 'PGRST116') {
      issues.push("Error checking membership: " + memberError.message);
    }
    
    const isMember = !!memberData && memberData.status === 'active';
    const accessible = isOwner || isMember;
    
    if (!accessible) {
      issues.push("User has no access to this space");
    }
    
    return {
      exists: true,
      accessible,
      isOwner,
      isMember,
      issues
    };
  } catch (error) {
    return {
      exists: false,
      accessible: false,
      isOwner: false,
      isMember: false,
      issues: ["Error validating space: " + (error instanceof Error ? error.message : String(error))]
    };
  }
}

/**
 * Checks current access state for a space using space_members table
 */
export async function checkCurrentSpaceAccess(subdomain: string): Promise<CheckAccessResult> {
  try {
    // Get current user
    const { data: { user: authUserData }, error: userError } = await getSupabaseClient().auth.getUser();
    const currentUser = authUserData as AuthUser | null;

    if (userError || !currentUser) {
      return { space: null, isOwner: false, hasAccess: false, memberRecord: null, membershipRole: null, membershipStatus: null, user: null };
    }
    
    const space = await getSpaceBySubdomain(subdomain);
    if (!space) {
      return { space: null, isOwner: false, hasAccess: false, memberRecord: null, membershipRole: null, membershipStatus: null, user: currentUser };
    }
    
    const isOwner = space.owner_id === currentUser.id;
    
    // Check space_members records
    let memberRecord = null;
    let membershipRole = null;
    let membershipStatus = null;
    let hasActiveMemberRecord = false;

    const { data: smData, error: smError } = await getSupabaseClient()
      .from('space_members')
      .select('id, role, status')
      .eq('space_id', space.id)
      .eq('user_id', currentUser.id)
      .maybeSingle<SpaceMemberRow>();
      
    if (smError && smError.code !== 'PGRST116') {
      log.error('Service', "Error fetching space_members record:", smError);
      return { space, isOwner, hasAccess: isOwner, memberRecord: null, membershipRole: (isOwner ? 'owner' : null), membershipStatus: (isOwner ? 'active' : null), user: currentUser };
    }
    
    if (smData) {
      memberRecord = smData;
      membershipRole = smData.role;
      membershipStatus = smData.status;
      if (smData.status === 'active') {
        hasActiveMemberRecord = true;
      }
    }
    
    const hasAccess = isOwner || hasActiveMemberRecord;

    // If owner and no specific member record, infer role/status
    if (isOwner && !membershipRole) {
      membershipRole = 'admin'; // Or 'owner' for display
      membershipStatus = 'active';
    }

    return { space, isOwner, hasAccess, memberRecord, membershipRole, membershipStatus, user: currentUser };
  } catch (err) {
    log.error('Service', "Error checking current space access:", err);
    return { space: null, isOwner: false, hasAccess: false, memberRecord: null, membershipRole: null, membershipStatus: null, user: null };
  }
}

/**
 * Direct client-side access check that doesn't require SQL functions
 * This is a more reliable way to check access when RLS policies might be causing issues
 */
export async function directSpaceAccessCheck(subdomain: string): Promise<DirectCheckResult> {
  try {
    const { data: { user: authUserData }, error: userError } = await getSupabaseClient().auth.getUser();
    const currentUser = authUserData as AuthUser | null;

    if (userError || !currentUser) {
      return { success: false, errorDetails: { phase: 'auth', message: 'Not authenticated', originalError: userError } };
    }
    
    let space: SpaceRow | null = await getSpaceBySubdomain(subdomain);
    if (!space) {
      // Fallback logic for space lookup
      log.debug('Service', "Trying alternate space lookup method for directSpaceAccessCheck");
      space = await alternativeSpaceLookup(subdomain);
      
      if (!space) {
        return { success: false, errorDetails: { phase: 'space_lookup', message: 'Space not found' } };
      }
    }
    
    const isOwner = space.owner_id === currentUser.id;
    
    let memberRecord: SpaceMemberRow | null = null;
    let membershipRole = null;
    let membershipStatus = null;
    let hasActiveMemberRecord = false;

    const { data: smData, error: smError } = await getSupabaseClient()
      .from('space_members')
      .select('id, role, status')
      .eq('space_id', space.id)
      .eq('user_id', currentUser.id)
      .maybeSingle<SpaceMemberRow>();
        
    if (smError && smError.code !== 'PGRST116') {
      log.warn('Service', "Error checking space_members records:", smError);
    }
    
    if (smData) {
      memberRecord = smData;
      membershipRole = smData.role;
      membershipStatus = smData.status;
      if (smData.status === 'active') {
        hasActiveMemberRecord = true;
      }
    }
    
    const hasAccess = isOwner || hasActiveMemberRecord;

    if (isOwner && !membershipRole) {
      membershipRole = 'admin';
      membershipStatus = 'active';
    }

    return {
      success: true,
      space,
      isOwner,
      hasAccess,
      memberRecord,
      membershipRole,
      membershipStatus,
      user: currentUser
    };
  } catch (err) {
    return {
      success: false,
      errorDetails: {
        phase: 'exception',
        message: err instanceof Error ? err.message : 'Unknown error',
        originalError: err
      }
    };
  }
}

/**
 * Comprehensive diagnostic function that checks all aspects of space access
 */
export async function diagnoseSpaceAccess(subdomain: string): Promise<DiagnosticResult> {
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  try {
    // Get current user
    const { data: { user: authUserData }, error: userError } = await getSupabaseClient().auth.getUser();
    const currentUser = authUserData as AuthUser | null;

    if (userError || !currentUser) {
      issues.push("User authentication failed");
      recommendations.push("Please log in again");
      return {
        success: false,
        space: null,
        isOwner: false,
        hasAccess: false,
        memberRecord: null,
        membershipRole: null,
        membershipStatus: null,
        user: null,
        issues,
        recommendations
      };
    }
    
    // Check if space exists
    const space = await getSpaceBySubdomain(subdomain);
    if (!space) {
      issues.push("Space not found with subdomain: " + subdomain);
      recommendations.push("Verify the space subdomain is correct");
      return {
        success: false,
        space: null,
        isOwner: false,
        hasAccess: false,
        memberRecord: null,
        membershipRole: null,
        membershipStatus: null,
        user: currentUser,
        issues,
        recommendations
      };
    }
    
    const isOwner = space.owner_id === currentUser.id;
    
    // Check membership records
    let memberRecord = null;
    let membershipRole = null;
    let membershipStatus = null;
    let hasActiveMemberRecord = false;

    const { data: smData, error: smError } = await getSupabaseClient()
      .from('space_members')
      .select('*')
      .eq('space_id', space.id)
      .eq('user_id', currentUser.id)
      .maybeSingle<SpaceMemberRow>();
        
    if (smError && smError.code !== 'PGRST116') {
      issues.push("Error checking membership: " + smError.message);
      recommendations.push("Try refreshing the page or contact support");
    }
    
    if (smData) {
      memberRecord = smData;
      membershipRole = smData.role;
      membershipStatus = smData.status;
      if (smData.status === 'active') {
        hasActiveMemberRecord = true;
      } else {
        issues.push("Membership exists but status is: " + smData.status);
        if (smData.status === 'cancelling') {
          recommendations.push("Your membership is being cancelled");
        } else if (smData.status === 'churned') {
          recommendations.push("Your membership has expired - consider rejoining");
        } else if (smData.status === 'banned') {
          recommendations.push("Your access has been restricted");
        }
      }
    } else if (!isOwner) {
      issues.push("No membership record found for this space");
      recommendations.push("Try joining the space or contact the space owner");
    }
    
    const hasAccess = isOwner || hasActiveMemberRecord;
    
    if (!hasAccess && !isOwner) {
      issues.push("User has no active access to this space");
      recommendations.push("Request access from the space owner or join the space");
    }
    
    // If owner but no membership record, that's normal
    if (isOwner && !membershipRole) {
      membershipRole = 'admin';
      membershipStatus = 'active';
    }
    
    return {
      success: true,
      space,
      isOwner,
      hasAccess,
      memberRecord,
      membershipRole,
      membershipStatus,
      user: currentUser,
      issues,
      recommendations
    };
  } catch (error) {
    issues.push("Unexpected error: " + (error instanceof Error ? error.message : String(error)));
    recommendations.push("Try refreshing the page or contact support");
    
    return {
      success: false,
      space: null,
      isOwner: false,
      hasAccess: false,
      memberRecord: null,
      membershipRole: null,
      membershipStatus: null,
      user: null,
      issues,
      recommendations
    };
  }
}

// Legacy function names for backward compatibility
export const createSpaceAccess = createSpaceMembership;
export const removeSpaceAccess = removeSpaceMembership;

/**
 * Safely prepare a URL for a space, with caching for future navigation
 * Use this when linking to space or about pages to ensure consistent experience
 */
export function prepareSpaceNavigation(space: SpaceRow, pageType: 'space' | 'about' = 'space'): string {
  if (!space || !space.subdomain) {
    log.error('Service', "Invalid space data for navigation:", space);
    return '/discover';
  }
  
  try {
    // Cache the selected space information
    localStorage.setItem('lastViewedSpace', JSON.stringify({
      subdomain: space.subdomain,
      id: space.id,
      name: space.name
    }));
    
    // Return the correct URL based on page type
    if (pageType === 'about') {
      return `/${space.subdomain}/about`;
    } else {
      return `/${space.subdomain}`;
    }
  } catch (error) {
    log.warn('Service', 'Failed to cache space selection:', error);
    // Still return the URL even if caching fails
    return pageType === 'about' ? `/${space.subdomain}/about` : `/${space.subdomain}`;
  }
} 