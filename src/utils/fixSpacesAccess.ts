import { supabase } from '@/integrations/supabase/client';
import { Database } from "@/types/supabase";
import { User as AuthUser } from "@/contexts/AuthContext";
import { PostgrestError } from '@supabase/supabase-js';

// Extend Window interface for debugging tools
declare global {
  interface Window {
    fixSpacesAccess?: {
      getSpaceBySubdomain: typeof getSpaceBySubdomain;
      fixSpaceAccess: typeof fixSpaceAccess;
      fixSpaceAccessBySubdomain: typeof fixSpaceAccessBySubdomain;
      checkCurrentSpaceAccess: typeof checkCurrentSpaceAccess;
      directSpaceAccessCheck: typeof directSpaceAccessCheck;
      prepareSpaceNavigation: typeof prepareSpaceNavigation;
    };
  }
}

// Define aliases for DB row types
type SpaceRow = Database['public']['Tables']['spaces']['Row'];
type SpaceMemberRow = Database['public']['Tables']['space_members']['Row'];

// Define types for our RPC function
interface AdminGetSpaceResult {
  success: boolean;
  space?: SpaceRow | null;
  error?: string;
}

interface CheckAccessResult {
  space: SpaceRow | null;
  isOwner: boolean;
  hasAccess: boolean;
  memberRecord: SpaceMemberRow | null;
  membershipRole: string | null;
  membershipStatus: string | null;
  user: AuthUser | null;
}

/**
 * Get space ID by subdomain, attempting to bypass RLS
 * Falls back to direct query if RPC fails
 */
export async function getSpaceBySubdomain(subdomain: string): Promise<SpaceRow | null> {
  try {
    // Try to use the RPC function first
    try {
      const { 
        data: rpcResponseData, 
        error: rpcError       
      } = await supabase.rpc(
        'admin_get_space_by_subdomain',
        { target_subdomain: subdomain }
      ) as unknown as { data: AdminGetSpaceResult | null; error: PostgrestError | null }; // Strong cast
          
      if (rpcError) {
        // This is an error in executing the RPC itself (network, db unavailable, etc.)
        console.warn('RPC admin_get_space_by_subdomain execution failed:', rpcError.message);
      } else if (rpcResponseData && rpcResponseData.success) {
        // RPC executed, and indicates success, space is in rpcResponseData.space
        return rpcResponseData.space as SpaceRow; // rpcResponseData.space is SpaceRow | null | undefined
      } else if (rpcResponseData && rpcResponseData.error) {
        // RPC executed, but returned a functional error message inside its payload
        console.warn('RPC admin_get_space_by_subdomain indicated application failure:', rpcResponseData.error);
      } else {
        // RPC executed, but data is null or success is false with no specific error message
        console.warn('RPC admin_get_space_by_subdomain returned no data or unexpected response.');
      }
      // If any of the above RPC issues occur, fall through to direct query

    } catch (errorInRpcAttempt) { // Catch errors from the await supabase.rpc call itself
      console.warn("RPC function not available:", errorInRpcAttempt);
      // Continue to fallback
    }
    
    // Fall back to direct query if RPC fails
    console.log("Falling back to direct query for space:", subdomain);
    const { data: spaceData, error: spaceError } = await supabase
      .from('spaces')
      .select('*')
      .eq('subdomain', subdomain)
      .single<SpaceRow>();
      
    if (spaceError) {
      console.error("Error fetching space by subdomain:", spaceError);
      return null;
    }
    
    return spaceData;
  } catch (error) {
    console.error("Error getting space by subdomain:", error);
    return null;
  }
}

/**
 * Creates direct access to the specified space for the current user
 * Works around RLS issues by direct database operations
 */
export async function fixSpaceAccess(spaceId: string): Promise<boolean> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("Not authenticated");
      return false;
    }
    
    // Create an access record directly
    const { error } = await supabase
      .from('space_access')
      .insert({
        space_id: spaceId,
        user_id: user.id,
        is_active: true,
        role: 'member'
      });
      
    if (error && error.code !== '23505') { // Ignore duplicate key errors
      console.error("Error creating access record:", error);
      return false;
    }
    
    console.log("Space access fixed for user", user.id, "to space", spaceId);
    return true;
  } catch (error) {
    console.error("Error fixing space access:", error);
    return false;
  }
}

/**
 * Fix access by subdomain - all in one function
 */
export async function fixSpaceAccessBySubdomain(subdomain: string): Promise<boolean> {
  const space = await getSpaceBySubdomain(subdomain);
  if (!space) return false;
  
  return await fixSpaceAccess(space.id);
}

/**
 * Checks current access state for a space
 */
export async function checkCurrentSpaceAccess(subdomain: string): Promise<CheckAccessResult> {
  try {
    // Get current user
    const { data: { user: authUserData }, error: userError } = await supabase.auth.getUser();
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

    const { data: smData, error: smError } = await supabase
      .from('space_members')
      .select('id, role, status')
      .eq('space_id', space.id)
      .eq('user_id', currentUser.id)
      .maybeSingle<SpaceMemberRow>();
      
    if (smError && smError.code !== 'PGRST116') {
      console.error("Error fetching space_members record:", smError);
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
    
    return {
      space,
      isOwner,
      hasAccess,
      memberRecord,
      membershipRole,
      membershipStatus,
      user: currentUser
    };
  } catch (error) {
    console.error("Error checking space access:", error);
    return { space: null, isOwner: false, hasAccess: false, memberRecord: null, membershipRole: null, membershipStatus: null, user: null };
  }
}

interface ErrorDetails {
  phase: string;
  message: string;
  originalError?: unknown;
}

interface DirectCheckResult {
  success: boolean;
  hasAccess?: boolean;
  isOwner?: boolean;
  space?: SpaceRow | null;
  memberRecord?: SpaceMemberRow | null;
  membershipRole?: string | null;
  membershipStatus?: string | null;
  errorDetails?: ErrorDetails;
}

/**
 * Direct client-side access check that doesn't require SQL functions
 * This is a more reliable way to check access when RLS policies might be causing issues
 */
export async function directSpaceAccessCheck(subdomain: string): Promise<DirectCheckResult> {
  try {
    const { data: { user: authUserData }, error: userError } = await supabase.auth.getUser();
    const currentUser = authUserData as AuthUser | null;

    if (userError || !currentUser) {
      return { success: false, errorDetails: { phase: 'auth', message: 'Not authenticated', originalError: userError } };
    }
    
    let space: SpaceRow | null = await getSpaceBySubdomain(subdomain);
    if (!space) {
      // Fallback logic for space lookup from original code
      console.log("Trying alternate space lookup method for directSpaceAccessCheck");
      try {
        const { data: publicSpaces, error: publicError } = await supabase
          .from('spaces')
          .select('*')
          .eq('is_private', false)
          .returns<SpaceRow[]>();
        if (!publicError && publicSpaces) {
          space = publicSpaces.find(s => s.subdomain === subdomain) || null;
        }
        if (!space) {
          const { data: ownedSpaces, error: ownedError } = await supabase
            .from('spaces')
            .select('*')
            .eq('owner_id', currentUser.id)
            .returns<SpaceRow[]>();
          if (!ownedError && ownedSpaces) {
            space = ownedSpaces.find(s => s.subdomain === subdomain) || null;
          }
        }
      } catch (spaceLookupError) {
        console.error("All space lookup methods failed in directSpaceAccessCheck:", spaceLookupError);
      }
      if (!space) {
        return { success: false, errorDetails: { phase: 'space_lookup', message: 'Space not found' } };
      }
    }
    
    const isOwner = space.owner_id === currentUser.id;
    
    let memberRecord: SpaceMemberRow | null = null;
    let membershipRole = null;
    let membershipStatus = null;
    let hasActiveMemberRecord = false;

    const { data: smData, error: smError } = await supabase
      .from('space_members')
      .select('id, role, status')
      .eq('space_id', space.id)
      .eq('user_id', currentUser.id)
      .maybeSingle<SpaceMemberRow>();
        
    if (smError && smError.code !== 'PGRST116') {
      console.warn("Error checking space_members records:", smError);
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
    };
  } catch (error) {
    console.error("Error checking user space access directly:", error);
    return {
      success: false,
      errorDetails: { phase: 'global_catch', message: (error instanceof Error ? error.message : 'Unknown error'), originalError: error }
    };
  }
}

/**
 * Safely prepare a URL for a space, with caching for future navigation
 * Use this when linking to space or about pages to ensure consistent experience
 */
export function prepareSpaceNavigation(space: SpaceRow, pageType: 'space' | 'about' = 'space'): string {
  if (!space || !space.subdomain) {
    console.error("Invalid space data for navigation:", space);
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
    console.warn('Failed to cache space selection:', error);
    // Still return the URL even if caching fails
    return pageType === 'about' ? `/${space.subdomain}/about` : `/${space.subdomain}`;
  }
}

/**
 * Expose the utility to the window for debugging
 */
if (typeof window !== 'undefined') {
  window.fixSpacesAccess = {
    getSpaceBySubdomain,
    fixSpaceAccess,
    fixSpaceAccessBySubdomain,
    checkCurrentSpaceAccess,
    directSpaceAccessCheck,
    prepareSpaceNavigation
  };
} 