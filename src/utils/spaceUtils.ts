import { supabase } from '@/integrations/supabase/client';
import { Space } from '../types/space';

/**
 * Fetches a user's spaces from Supabase (owned or as an active member)
 * 
 * @param userId - The ID of the user whose spaces to fetch
 * @returns A promise that resolves to an array of Space objects
 */
export const fetchUserSpaces = async (userId: string): Promise<Space[]> => {
  if (!userId) {
    console.warn('fetchUserSpaces called without userId');
    return [];
  }
  try {
    // 1. Fetch spaces owned by the user
    const { data: ownedSpacesData, error: ownedError } = await supabase
      .from('spaces')
      .select('*') // Assuming Space type matches all columns from spaces table
      .eq('owner_id', userId);
      
    if (ownedError) {
      console.error("Error fetching owned spaces:", ownedError);
      // Depending on desired behavior, might return [] or throw error
    }
    const ownedSpaces: Space[] = ownedSpacesData || [];

    // 2. Fetch spaces where the user is an active member (excluding already fetched owned spaces)
    const { data: memberRecords, error: memberError } = await supabase
      .from('space_members')
      .select('space_id, spaces:space_id (*)') // Fetches all columns from the related 'spaces' table
      .eq('user_id', userId)
      .eq('status', 'active');

    if (memberError) {
      console.error("Error fetching member spaces:", memberError);
      // Depending on desired behavior
    }

    let memberSpaces: Space[] = [];
    if (memberRecords) {
      memberSpaces = memberRecords
        .map(record => record.spaces) // Extract the nested space object
        .filter(space => space !== null) as Space[]; // Filter out nulls and assert type
    }
    
    // Combine and deduplicate spaces
    // Owned spaces take precedence if there are any overlaps, though direct ownership already covers it.
    // The main goal of deduplication is if a user is owner AND member (which is typical).
    const allSpacesMap = new Map<string, Space>();

    ownedSpaces.forEach(space => allSpacesMap.set(space.id, space));
    memberSpaces.forEach(space => {
      if (!allSpacesMap.has(space.id)) {
        allSpacesMap.set(space.id, space);
      }
    });
    
    return Array.from(allSpacesMap.values());

  } catch (error) {
    console.error("Error in fetchUserSpaces:", error);
    return [];
  }
}; 