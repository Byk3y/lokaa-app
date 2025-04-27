import { supabase } from "@/integrations/supabase/client";

/**
 * Checks if a user has any spaces (either owned or joined)
 * @param userId - The ID of the user to check
 * @returns A promise that resolves to true if the user has any spaces, false otherwise
 */
export async function userHasSpaces(userId: string): Promise<boolean> {
  if (!userId) return false;
  
  try {
    // Check owned spaces first (most efficient query)
    const { data: ownedSpaces, error: ownedError } = await supabase
      .from('spaces')
      .select('id')
      .eq('owner_id', userId)
      .limit(1);
      
    if (ownedError) throw ownedError;
    
    // If user has at least one owned space, no need to check further
    if (ownedSpaces?.length > 0) return true;
    
    // Otherwise, check joined spaces through space_access table
    const { data: accessRecords, error: accessError } = await supabase
      .from('space_access')
      .select('space_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1);
      
    if (accessError) throw accessError;
    
    // Return true if user has at least one joined space
    return (accessRecords?.length || 0) > 0;
  } catch (error) {
    console.error("Error checking if user has spaces:", error);
    return false;
  }
}

/**
 * Gets count of user's spaces (both owned and joined)
 * @param userId - The ID of the user to check
 * @returns A promise that resolves to an object with counts of owned and joined spaces
 */
export async function getUserSpaceCounts(userId: string): Promise<{ 
  ownedCount: number, 
  joinedCount: number, 
  totalCount: number 
}> {
  if (!userId) return { ownedCount: 0, joinedCount: 0, totalCount: 0 };
  
  try {
    // Get count of owned spaces
    const { data: ownedSpaces, error: ownedError } = await supabase
      .from('spaces')
      .select('id', { count: 'exact' })
      .eq('owner_id', userId);
      
    // Get count of joined spaces (not owned)
    const { data: accessRecords, error: accessError } = await supabase
      .from('space_access')
      .select('space_id')
      .eq('user_id', userId)
      .eq('is_active', true);
      
    if (ownedError) throw ownedError;
    if (accessError) throw accessError;
    
    const ownedCount = ownedSpaces?.length || 0;
    const joinedCount = accessRecords?.length || 0;
    
    return {
      ownedCount,
      joinedCount,
      totalCount: ownedCount + joinedCount
    };
  } catch (error) {
    console.error("Error getting user space counts:", error);
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
    const { data: ownedSpaces, error: ownedError } = await supabase
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
    const { data: accessRecords, error: accessError } = await supabase
      .from('space_access')
      .select('space_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1);
      
    if (accessError) throw accessError;
    
    // If found a joined space, return its ID
    if (accessRecords?.length > 0) {
      return accessRecords[0].space_id;
    }
    
    // No spaces found
    return null;
  } catch (error) {
    console.error("Error getting user's first space ID:", error);
    return null;
  }
}

/**
 * Gets the first space for a user including the subdomain for navigation
 * @param userId - The ID of the user
 * @returns A promise that resolves to the space with ID and subdomain, or null if none found
 */
export async function getFirstUserSpace(userId: string): Promise<{ id: string, subdomain: string } | null> {
  if (!userId) {
    console.warn("getFirstUserSpace: Called with empty userId");
    return null;
  }
  
  try {
    console.log("getFirstUserSpace: Checking spaces for user", userId);

    // First check for spaces owned by the user
    const { data: ownedSpaces, error: ownedError } = await supabase
      .from('spaces')
      .select('id, subdomain, name')
      .eq('owner_id', userId)
      .limit(1);
      
    if (ownedError) {
      console.error("getFirstUserSpace: Error fetching owned spaces:", ownedError);
      throw ownedError;
    }
    
    console.log("getFirstUserSpace: Owned spaces result:", ownedSpaces);
    
    // If user has an owned space, prioritize it
    if (ownedSpaces && ownedSpaces.length > 0) {
      console.log("getFirstUserSpace: Found owned space:", ownedSpaces[0]);
      return {
        id: ownedSpaces[0].id,
        subdomain: ownedSpaces[0].subdomain
      };
    }
    
    // Otherwise check joined spaces
    console.log("getFirstUserSpace: No owned spaces, checking joined spaces");
    const { data: accessRecords, error: accessError } = await supabase
      .from('space_access')
      .select(`
        space_id,
        spaces:space_id(id, subdomain, name)
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1);
      
    if (accessError) {
      console.error("getFirstUserSpace: Error fetching joined spaces:", accessError);
      throw accessError;
    }
    
    console.log("getFirstUserSpace: Joined spaces result:", accessRecords);
    
    // If found an accessed space, return its details
    if (accessRecords && accessRecords.length > 0 && accessRecords[0].spaces) {
      const spaceDetails = accessRecords[0].spaces as any;
      console.log("getFirstUserSpace: Found joined space:", spaceDetails);
      return {
        id: spaceDetails.id,
        subdomain: spaceDetails.subdomain
      };
    }
    
    // Try direct query as a fallback (in case nested queries have issues)
    console.log("getFirstUserSpace: No spaces found via relations, trying direct query");
    const { data: directSpaces, error: directError } = await supabase
      .from('spaces')
      .select('id, subdomain, name')
      .or(`owner_id.eq.${userId},id.in.(${
        supabase.from('space_access')
          .select('space_id')
          .eq('user_id', userId)
          .eq('is_active', true)
      })`)
      .limit(1);
      
    if (directError) {
      console.error("getFirstUserSpace: Error in direct query:", directError);
      throw directError;
    }
    
    console.log("getFirstUserSpace: Direct query result:", directSpaces);
    
    if (directSpaces && directSpaces.length > 0) {
      console.log("getFirstUserSpace: Found space via direct query:", directSpaces[0]);
      return {
        id: directSpaces[0].id,
        subdomain: directSpaces[0].subdomain
      };
    }
    
    console.log("getFirstUserSpace: No spaces found for user");
    return null;
  } catch (error) {
    console.error("getFirstUserSpace: Unexpected error:", error);
    return null;
  }
} 