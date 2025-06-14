/**
 * User spaces service
 * Handles user space relationships, counts, and queries
 */

import { getSupabaseClient } from '@/integrations/supabase/client';
import type { UserSpaceCounts, UserSpaceInfo } from '@/shared/types/spaces';

/**
 * Checks if a user has any spaces (either owned or joined)
 * @param userId - The ID of the user to check
 * @returns A promise that resolves to true if the user has any spaces, false otherwise
 */
export async function userHasSpaces(userId: string): Promise<boolean> {
  if (!userId) return false;
  
  try {
    // Check owned spaces first (most efficient query)
    const { data: ownedSpaces, error: ownedError } = await getSupabaseClient()
      .from('spaces')
      .select('id')
      .eq('owner_id', userId)
      .limit(1);
      
    if (ownedError) throw ownedError;
    
    // If user has at least one owned space, no need to check further
    if (ownedSpaces?.length > 0) return true;
    
    // Otherwise, check joined spaces through space_members table
    const { data: memberRecords, error: memberError } = await getSupabaseClient()
      .from('space_members')
      .select('space_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1);
      
    if (memberError) throw memberError;
    
    // Return true if user has at least one joined space
    return (memberRecords?.length || 0) > 0;
  } catch (error) {
    console.error('Error checking if user has spaces:', error);
    return false;
  }
}

/**
 * Gets count of user's spaces (both owned and joined)
 * @param userId - The ID of the user to check
 * @returns A promise that resolves to an object with counts of owned and joined spaces
 */
export async function getUserSpaceCounts(userId: string): Promise<UserSpaceCounts> {
  if (!userId) return { ownedCount: 0, joinedCount: 0, totalCount: 0 };
  
  try {
    // Get count of owned spaces
    const { data: ownedSpaces, error: ownedError } = await getSupabaseClient()
      .from('spaces')
      .select('id', { count: 'exact' })
      .eq('owner_id', userId);
      
    // Get count of joined spaces (not owned)
    const { data: memberRecords, error: memberError } = await getSupabaseClient()
      .from('space_members')
      .select('space_id')
      .eq('user_id', userId)
      .eq('status', 'active');
      
    if (ownedError) throw ownedError;
    if (memberError) throw memberError;
    
    const ownedCount = ownedSpaces?.length || 0;
    const joinedCount = memberRecords?.length || 0;
    
    return {
      ownedCount,
      joinedCount,
      totalCount: ownedCount + joinedCount
    };
  } catch (error) {
    console.error('Error getting user space counts:', error);
    return { ownedCount: 0, joinedCount: 0, totalCount: 0 };
  }
}

/**
 * Gets the first space ID for a user (prioritizing owned spaces)
 * Useful for redirecting to a user's space
 * @param userId - The ID of the user
 * @returns A promise that resolves to the ID of the first space, or null if none found
 */
export async function getFirstUserSpaceId(userId: string): Promise<string | null> {
  if (!userId) return null;
  
  try {
    // First check for owned spaces
    const { data: ownedSpaces, error: ownedError } = await getSupabaseClient()
      .from('spaces')
      .select('id')
      .eq('owner_id', userId)
      .limit(1);
      
    if (ownedError) throw ownedError;
    
    // If found an owned space, return its ID
    if (ownedSpaces?.length > 0) {
      return ownedSpaces[0].id;
    }
    
    // Otherwise check joined spaces
    const { data: memberRecords, error: memberError } = await getSupabaseClient()
      .from('space_members')
      .select('space_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1);
      
    if (memberError) throw memberError;
    
    // If found a joined space, return its ID
    if (memberRecords?.length > 0) {
      return memberRecords[0].space_id;
    }
    
    // No spaces found
    return null;
  } catch (error) {
    console.error('Error getting user\'s first space ID:', error);
    return null;
  }
}

/**
 * Gets the first space for a user including the subdomain for navigation
 * @param userId - The ID of the user
 * @returns A promise that resolves to the space with ID and subdomain, or null if none found
 */
export async function getFirstUserSpace(userId: string): Promise<UserSpaceInfo | null> {
  if (!userId) {
    console.warn('getFirstUserSpace: Called with empty userId');
    return null;
  }
  
  // Use the space access service which has more comprehensive logic
  const { getFirstUserSpace: getFirstSpace } = await import('./space-access');
  const space = await getFirstSpace(userId);
  
  if (space) {
    return {
      id: space.id,
      subdomain: space.subdomain,
      name: space.name,
    };
  }
  
  return null;
}

/**
 * Get all spaces for a user (both owned and accessible)
 * @param userId - The ID of the user
 * @returns A promise that resolves to an array of user space info
 */
export async function getAllUserSpaces(userId: string): Promise<UserSpaceInfo[]> {
  if (!userId) return [];
  
  try {
    const spaces: UserSpaceInfo[] = [];
    
    // Get owned spaces
    const { data: ownedSpaces, error: ownedError } = await getSupabaseClient()
      .from('spaces')
      .select('id, subdomain, name')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });
      
    if (ownedError) {
      console.error('Error fetching owned spaces:', ownedError);
    } else if (ownedSpaces) {
      spaces.push(...ownedSpaces.map(space => ({
        id: space.id,
        subdomain: space.subdomain,
        name: space.name,
      })));
    }
    
    // Get accessible spaces (excluding already owned ones)
    const ownedSpaceIds = spaces.map(s => s.id);
    const { data: memberRecords, error: memberError } = await getSupabaseClient()
      .from('space_members')
      .select('space_id, spaces:space_id(id, subdomain, name)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .not('space_id', 'in', `(${ownedSpaceIds.join(',')})`)
      .order('created_at', { ascending: false });
      
    if (memberError) {
      console.error('Error fetching accessible spaces:', memberError);
    } else if (memberRecords) {
      memberRecords.forEach(record => {
        if (record.spaces) {
          const spaceData = record.spaces as any;
          spaces.push({
            id: spaceData.id,
            subdomain: spaceData.subdomain,
            name: spaceData.name,
          });
        }
      });
    }
    
    return spaces;
  } catch (error) {
    console.error('Error getting all user spaces:', error);
    return [];
  }
} 