import { getSupabaseClient } from "@/integrations/supabase/client";
import { Database } from "@/types/supabase";
import { User as AuthUser } from "@/contexts/AuthContext";

// Type aliases for database rows
type SpaceRow = Database['public']['Tables']['spaces']['Row'];
type SpaceMemberRow = Database['public']['Tables']['space_members']['Row'];

/**
 * Space validation result interface
 */
export interface SpaceValidationResult {
  success: boolean;
  available?: boolean;
  exists?: boolean;
  error?: any;
  message?: string;
}

/**
 * Space access check result interface
 */
export interface SpaceAccessResult {
  space: SpaceRow | null;
  isOwner: boolean;
  hasAccess: boolean;
  memberRecord: SpaceMemberRow | null;
  membershipRole: string | null;
  membershipStatus: string | null;
  user: AuthUser | null;
}

/**
 * Check if a subdomain is available (not already used)
 */
export async function isSubdomainAvailable(subdomain: string): Promise<SpaceValidationResult> {
  console.log("Checking if subdomain is available:", subdomain);
  
  try {
    const { data, error } = await getSupabaseClient()
      .from('spaces')
      .select('id')
      .eq('subdomain', subdomain)
      .maybeSingle();
    
    if (error) {
      console.error("Error checking subdomain availability:", error);
      return { success: false, error };
    }
    
    return { 
      success: true,
      available: !data, 
      exists: !!data 
    };
  } catch (err) {
    console.error("Unexpected error checking subdomain:", err);
    return { 
      success: false,
      available: false, 
      error: err instanceof Error ? err : new Error(String(err)) 
    };
  }
}

/**
 * Validates subdomain format and availability
 */
export async function validateSubdomain(subdomain: string): Promise<SpaceValidationResult> {
  // Format validation
  if (!subdomain || subdomain.trim().length === 0) {
    return {
      success: false,
      message: "Subdomain is required"
    };
  }
  
  if (!/^[a-z0-9-]+$/.test(subdomain)) {
    return {
      success: false,
      message: "Subdomain must contain only lowercase letters, numbers, and hyphens"
    };
  }
  
  if (subdomain.length < 3) {
    return {
      success: false,
      message: "Subdomain must be at least 3 characters long"
    };
  }
  
  if (subdomain.length > 63) {
    return {
      success: false,
      message: "Subdomain must be less than 64 characters long"
    };
  }
  
  if (subdomain.startsWith('-') || subdomain.endsWith('-')) {
    return {
      success: false,
      message: "Subdomain cannot start or end with a hyphen"
    };
  }
  
  // Reserved subdomains
  const reservedSubdomains = [
    'api', 'www', 'admin', 'app', 'dashboard', 'mail', 'ftp', 'support',
    'help', 'docs', 'blog', 'news', 'dev', 'test', 'staging', 'prod'
  ];
  
  if (reservedSubdomains.includes(subdomain.toLowerCase())) {
    return {
      success: false,
      message: "This subdomain is reserved and cannot be used"
    };
  }
  
  // Check availability
  return await isSubdomainAvailable(subdomain);
}

/**
 * Checks current access state for a space
 */
export async function checkSpaceAccess(subdomain: string): Promise<SpaceAccessResult> {
  try {
    // Get current user
    const { data: { user: authUserData }, error: userError } = await getSupabaseClient().auth.getUser();
    const currentUser = authUserData as AuthUser | null;

    if (userError || !currentUser) {
      return { 
        space: null, 
        isOwner: false, 
        hasAccess: false, 
        memberRecord: null, 
        membershipRole: null, 
        membershipStatus: null, 
        user: null 
      };
    }
    
    // Get space by subdomain
    const { data: space, error: spaceError } = await getSupabaseClient()
      .from('spaces')
      .select('*')
      .eq('subdomain', subdomain)
      .single<SpaceRow>();
      
    if (spaceError || !space) {
      return { 
        space: null, 
        isOwner: false, 
        hasAccess: false, 
        memberRecord: null, 
        membershipRole: null, 
        membershipStatus: null, 
        user: currentUser 
      };
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
      console.error("Error fetching space_members record:", smError);
      return { 
        space, 
        isOwner, 
        hasAccess: isOwner, 
        memberRecord: null, 
        membershipRole: (isOwner ? 'owner' : null), 
        membershipStatus: (isOwner ? 'active' : null), 
        user: currentUser 
      };
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
      membershipRole = 'admin';
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
    return { 
      space: null, 
      isOwner: false, 
      hasAccess: false, 
      memberRecord: null, 
      membershipRole: null, 
      membershipStatus: null, 
      user: null 
    };
  }
}

/**
 * Validates space ownership
 */
export async function validateSpaceOwnership(spaceId: string, userId: string): Promise<SpaceValidationResult> {
  try {
    const { data: space, error } = await getSupabaseClient()
      .from('spaces')
      .select('owner_id')
      .eq('id', spaceId)
      .single();
    
    if (error) {
      return {
        success: false,
        error,
        message: "Space not found"
      };
    }
    
    const isOwner = space.owner_id === userId;
    
    return {
      success: true,
      available: isOwner,
      message: isOwner ? "User is space owner" : "User is not space owner"
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err : new Error(String(err)),
      message: "Error validating space ownership"
    };
  }
}

/**
 * Validates space membership
 */
export async function validateSpaceMembership(spaceId: string, userId: string): Promise<SpaceValidationResult> {
  try {
    const { data: membership, error } = await getSupabaseClient()
      .from('space_members')
      .select('status, role')
      .eq('space_id', spaceId)
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error && error.code !== 'PGRST116') {
      return {
        success: false,
        error,
        message: "Error checking membership"
      };
    }
    
    const hasMembership = membership && membership.status === 'active';
    
    return {
      success: true,
      available: hasMembership,
      message: hasMembership 
        ? `User is an active ${membership.role}` 
        : "User is not an active member"
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err : new Error(String(err)),
      message: "Error validating space membership"
    };
  }
}

/**
 * Comprehensive space access validation
 */
export async function validateSpaceAccessComprehensive(spaceId: string, userId: string): Promise<SpaceValidationResult> {
  try {
    // Check ownership first
    const ownershipResult = await validateSpaceOwnership(spaceId, userId);
    if (ownershipResult.success && ownershipResult.available) {
      return {
        success: true,
        available: true,
        message: "Access granted - user is space owner"
      };
    }
    
    // Check membership
    const membershipResult = await validateSpaceMembership(spaceId, userId);
    if (membershipResult.success && membershipResult.available) {
      return {
        success: true,
        available: true,
        message: membershipResult.message
      };
    }
    
    // Check if space is public
    const { data: space, error: spaceError } = await getSupabaseClient()
      .from('spaces')
      .select('is_private')
      .eq('id', spaceId)
      .single();
    
    if (!spaceError && space && !space.is_private) {
      return {
        success: true,
        available: true,
        message: "Access granted - space is public"
      };
    }
    
    return {
      success: true,
      available: false,
      message: "Access denied - user has no access to this space"
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err : new Error(String(err)),
      message: "Error validating space access"
    };
  }
} 