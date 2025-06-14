/**
 * Space access service for database validation and queries
 * Handles space ownership and membership verification
 */

import { getSupabaseClient } from '@/integrations/supabase/client';
import type {
  SpaceRedirectData,
  UserAccessRecordWithSpace,
  UserAccessSpaceData,
  NestedSpaceInfo,
  SpaceAccessRecordWithDetails,
} from '@/shared/types/spaces';

/**
 * Verify if user has access to a specific space
 */
export const verifySpaceAccess = async (
  userId: string,
  spaceId: string
): Promise<boolean> => {
  try {
    const { data } = await getSupabaseClient()
      .from('space_members')
      .select('id')
      .eq('user_id', userId)
      .eq('space_id', spaceId)
      .eq('status', 'active')
      .maybeSingle();

    return !!data;
  } catch (error) {
    console.warn('Error verifying space access:', error);
    return false;
  }
};

/**
 * Verify if user owns a specific space
 */
export const verifySpaceOwnership = async (
  userId: string,
  subdomain: string
): Promise<boolean> => {
  try {
    const { data } = await getSupabaseClient()
      .from('spaces')
      .select('id, owner_id')
      .eq('subdomain', subdomain)
      .maybeSingle();

    return data ? data.owner_id === userId : false;
  } catch (error) {
    console.warn('Error verifying space ownership:', error);
    return false;
  }
};

/**
 * Get spaces owned by user
 */
export const getUserOwnedSpaces = async (userId: string): Promise<SpaceRedirectData[]> => {
  try {
    const { data, error } = await getSupabaseClient()
      .from('spaces')
      .select('id, name, subdomain')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching owned spaces:', error);
      return [];
    }

    return (data || []).map(space => ({
      id: space.id,
      name: space.name,
      subdomain: space.subdomain,
    }));
  } catch (error) {
    console.error('Exception fetching owned spaces:', error);
    return [];
  }
};

/**
 * Get spaces user has access to via space_members table
 */
export const getUserAccessibleSpaces = async (userId: string): Promise<SpaceRedirectData[]> => {
  try {
    const { data, error } = await getSupabaseClient()
      .from('space_members')
      .select(`
        id, 
        space_id,
        spaces:space_id(id, name, subdomain)
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('joined_at', { ascending: false });

    if (error) {
      console.error('Error fetching accessible spaces:', error);
      return [];
    }

    return (data || [])
      .filter((record): record is any & { spaces: UserAccessSpaceData } => 
        record.spaces !== null && record.spaces.subdomain !== null
      )
      .map(record => ({
        id: record.spaces.id,
        name: record.spaces.name,
        subdomain: record.spaces.subdomain,
      }));
  } catch (error) {
    console.error('Exception fetching accessible spaces:', error);
    return [];
  }
};

/**
 * Get first space for user (prioritizing owned spaces)
 */
export const getFirstUserSpace = async (userId: string): Promise<SpaceRedirectData | null> => {
  if (!userId) {
    console.warn('getFirstUserSpace: Called with empty userId');
    return null;
  }

  try {
    console.log('getFirstUserSpace: Checking spaces for user', userId);

    // First check for spaces owned by the user
    const ownedSpaces = await getUserOwnedSpaces(userId);
    
    if (ownedSpaces.length > 0) {
      console.log('getFirstUserSpace: Found owned space:', ownedSpaces[0]);
      return ownedSpaces[0];
    }

    // Otherwise check joined spaces
    console.log('getFirstUserSpace: No owned spaces, checking joined spaces');
    const accessibleSpaces = await getUserAccessibleSpaces(userId);
    
    if (accessibleSpaces.length > 0) {
      console.log('getFirstUserSpace: Found accessible space:', accessibleSpaces[0]);
      return accessibleSpaces[0];
    }

    // Try direct query as a fallback (in case nested queries have issues)
    console.log('getFirstUserSpace: No spaces found via relations, trying direct query');
    const { data: directSpaces, error: directError } = await getSupabaseClient()
      .from('spaces')
      .select('id, subdomain, name')
      .or(`owner_id.eq.${userId},id.in.(${
        getSupabaseClient().from('space_members')
          .select('space_id')
          .eq('user_id', userId)
          .eq('status', 'active')
      })`)
      .limit(1);

    if (directError) {
      console.error('getFirstUserSpace: Error in direct query:', directError);
      throw directError;
    }

    if (directSpaces && directSpaces.length > 0) {
      console.log('getFirstUserSpace: Found space via direct query:', directSpaces[0]);
      return {
        id: directSpaces[0].id,
        subdomain: directSpaces[0].subdomain,
        name: directSpaces[0].name,
      };
    }

    console.log('getFirstUserSpace: No spaces found for user');
    return null;
  } catch (error) {
    console.error('getFirstUserSpace: Unexpected error:', error);
    return null;
  }
};

/**
 * Get user's space membership details
 */
export const getUserSpaceMembership = async (
  userId: string, 
  spaceId: string
): Promise<{ role: string; status: string } | null> => {
  try {
    const { data, error } = await getSupabaseClient()
      .from('space_members')
      .select('role, status')
      .eq('user_id', userId)
      .eq('space_id', spaceId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching membership details:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception fetching membership details:', error);
    return null;
  }
};

/**
 * Get nested space info with access details
 */
export const getNestedSpaceInfo = async (
  subdomain: string,
  userId?: string
): Promise<NestedSpaceInfo | null> => {
  try {
    const { data: space, error } = await getSupabaseClient()
      .from('spaces')
      .select('*')
      .eq('subdomain', subdomain)
      .maybeSingle();

    if (error || !space) {
      return null;
    }

    let hasAccess = false;
    let membershipDetails = null;

    if (userId) {
      // Check ownership
      if (space.owner_id === userId) {
        hasAccess = true;
        membershipDetails = { role: 'admin', status: 'active' };
      } else {
        // Check membership
        membershipDetails = await getUserSpaceMembership(userId, space.id);
        hasAccess = membershipDetails?.status === 'active';
      }
    }

    return {
      ...space,
      hasAccess,
      membershipDetails,
    };
  } catch (error) {
    console.error('Error getting nested space info:', error);
    return null;
  }
};

/**
 * Check if space exists and is accessible by subdomain
 */
export const validateSpaceBySubdomain = async (
  subdomain: string,
  userId?: string
): Promise<SpaceRedirectData | null> => {
  try {
    const { data: space, error } = await getSupabaseClient()
      .from('spaces')
      .select('id, name, subdomain, owner_id')
      .eq('subdomain', subdomain)
      .maybeSingle();

    if (error) {
      console.error('Error validating space:', error);
      return null;
    }

    if (!space) {
      return null;
    }

    // If no user ID provided, just return space info
    if (!userId) {
      return {
        id: space.id,
        name: space.name,
        subdomain: space.subdomain,
      };
    }

    // Check if user owns the space
    if (space.owner_id === userId) {
      return {
        id: space.id,
        name: space.name,
        subdomain: space.subdomain,
        owner_id: space.owner_id,
      };
    }

    // Check if user has member access
    const hasAccess = await verifySpaceAccess(userId, space.id);
    
    if (hasAccess) {
      return {
        id: space.id,
        name: space.name,
        subdomain: space.subdomain,
      };
    }

    return null;
  } catch (error) {
    console.error('Exception validating space by subdomain:', error);
    return null;
  }
}; 