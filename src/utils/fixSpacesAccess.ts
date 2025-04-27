import { supabase } from '@/integrations/supabase/client';

// Define types for our RPC function
interface AdminGetSpaceResult {
  success: boolean;
  space?: any;
  error?: string;
}

/**
 * Get space ID by subdomain, attempting to bypass RLS
 * Falls back to direct query if RPC fails
 */
export async function getSpaceBySubdomain(subdomain: string): Promise<any> {
  try {
    // Try to use the RPC function first
    try {
      // Use any type to avoid TypeScript errors with dynamic RPC names
      const { data, error } = await (supabase as any)
        .rpc('admin_get_space_by_subdomain', { target_subdomain: subdomain });
          
      if (!error && data && data.success) {
        return data.space;
      }
    } catch (rpcError) {
      console.warn("RPC function not available:", rpcError);
      // Continue to fallback
    }
    
    // Fall back to direct query if RPC fails
    console.log("Falling back to direct query for space:", subdomain);
    const { data: spaceData, error: spaceError } = await supabase
      .from('spaces')
      .select('*')
      .eq('subdomain', subdomain)
      .single();
      
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
export async function checkCurrentSpaceAccess(subdomain: string): Promise<{
  space: any | null;
  isOwner: boolean;
  hasAccess: boolean;
  accessRecords: any[];
  user: any | null;
}> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { space: null, isOwner: false, hasAccess: false, accessRecords: [], user: null };
    }
    
    // Get space using bypass function
    const space = await getSpaceBySubdomain(subdomain);
    if (!space) {
      return { space: null, isOwner: false, hasAccess: false, accessRecords: [], user };
    }
    
    // Check if user is owner
    const isOwner = space.owner_id === user.id;
    
    // Check space_access records
    const { data: accessRecords, error: accessError } = await supabase
      .from('space_access')
      .select('*')
      .eq('space_id', space.id)
      .eq('user_id', user.id);
      
    if (accessError) {
      console.error("Error fetching access records:", accessError);
      return { space, isOwner, hasAccess: isOwner, accessRecords: [], user };
    }
    
    // User has access if they're owner or have an active access record
    const hasActiveAccessRecord = accessRecords?.some(record => record.is_active) || false;
    const hasAccess = isOwner || hasActiveAccessRecord;
    
    return {
      space,
      isOwner,
      hasAccess,
      accessRecords: accessRecords || [],
      user
    };
  } catch (error) {
    console.error("Error checking space access:", error);
    return { space: null, isOwner: false, hasAccess: false, accessRecords: [], user: null };
  }
}

/**
 * Direct client-side access check that doesn't require SQL functions
 * This is a more reliable way to check access when RLS policies might be causing issues
 */
export async function directSpaceAccessCheck(subdomain: string): Promise<{
  success: boolean;
  hasAccess?: boolean;
  isOwner?: boolean;
  space?: any;
  accessRecords?: any[];
  errorDetails?: any;
}> {
  try {
    // Step 1: Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { 
        success: false, 
        errorDetails: { phase: 'auth', message: 'Not authenticated' } 
      };
    }
    
    console.log("Checking access for user:", user.id);
    
    // Step 2: Get space data through direct query
    let space;
    
    try {
      // First try with our helper
      space = await getSpaceBySubdomain(subdomain);
      
      // If that fails, try different approach
      if (!space) {
        console.log("Trying alternate space lookup method");
        
        // Try to get all public spaces
        const { data: publicSpaces, error: publicError } = await supabase
          .from('spaces')
          .select('*')
          .eq('is_private', false);
          
        if (!publicError && publicSpaces) {
          space = publicSpaces.find(s => s.subdomain === subdomain);
        }
        
        // If space still not found, try getting owned spaces
        if (!space) {
          const { data: ownedSpaces, error: ownedError } = await supabase
            .from('spaces')
            .select('*')
            .eq('owner_id', user.id);
            
          if (!ownedError && ownedSpaces) {
            space = ownedSpaces.find(s => s.subdomain === subdomain);
          }
        }
      }
    } catch (spaceError) {
      console.error("All space lookup methods failed:", spaceError);
    }
    
    if (!space) {
      return { 
        success: false, 
        errorDetails: { phase: 'space_lookup', message: 'Space not found' } 
      };
    }
    
    console.log("Found space:", space);
    
    // Step 3: Check if user is owner
    const isOwner = space.owner_id === user.id;
    
    // Step 4: Check space_access records
    let accessRecords = [];
    try {
      const { data: records, error: accessError } = await supabase
        .from('space_access')
        .select('*')
        .eq('space_id', space.id)
        .eq('user_id', user.id);
        
      if (!accessError && records) {
        accessRecords = records;
      }
    } catch (accessError) {
      console.warn("Error checking access records:", accessError);
    }
    
    const hasActiveAccessRecord = accessRecords.some(r => r.is_active);
    const hasAccess = isOwner || hasActiveAccessRecord;
    
    return {
      success: true,
      space,
      isOwner,
      hasAccess,
      accessRecords
    };
  } catch (error) {
    console.error("Unexpected error during direct access check:", error);
    return { 
      success: false, 
      errorDetails: { phase: 'unexpected', message: String(error) } 
    };
  }
}

/**
 * Safely prepare a URL for a space, with caching for future navigation
 * Use this when linking to space or about pages to ensure consistent experience
 */
export function prepareSpaceNavigation(space: any, pageType: 'space' | 'about' = 'space'): string {
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
  (window as any).fixSpacesAccess = {
    getSpaceBySubdomain,
    fixSpaceAccess,
    fixSpaceAccessBySubdomain,
    checkCurrentSpaceAccess,
    directSpaceAccessCheck,
    prepareSpaceNavigation
  };
} 