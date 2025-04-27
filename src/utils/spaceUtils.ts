import { supabase } from '@/integrations/supabase/client';
import { Space } from '../types/space';

/**
 * Fetches a user's spaces from Supabase
 * 
 * @param userId - The ID of the user whose spaces to fetch
 * @returns A promise that resolves to an array of Space objects
 */
export const fetchUserSpaces = async (userId: string): Promise<Space[]> => {
  try {
    // First try to fetch spaces owned by the user
    const { data: ownedSpaces, error: ownedError } = await supabase
      .from('spaces')
      .select('*')
      .eq('owner_id', userId);
      
    if (ownedError) {
      console.error("Error fetching owned spaces:", ownedError);
      return [];
    }
    
    // Then fetch spaces the user has access to
    const { data: accessRecords, error: accessError } = await supabase
      .from('space_access')
      .select('space_id')
      .eq('user_id', userId)
      .eq('is_active', true);
      
    if (accessError) {
      console.error("Error fetching space access records:", accessError);
      return [];
    }
    
    // If there are access records, fetch those spaces
    let accessedSpaces: any[] = [];
    if (accessRecords && accessRecords.length > 0) {
      const spaceIds = accessRecords.map(access => access.space_id);
      
      const { data: spacesData, error: spacesError } = await supabase
        .from('spaces')
        .select('*')
        .in('id', spaceIds);
        
      if (spacesError) {
        console.error("Error fetching accessed spaces:", spacesError);
        return [];
      }
      
      accessedSpaces = spacesData || [];
    }
    
    // Combine and deduplicate spaces
    const allSpaces = [
      ...(ownedSpaces || []),
      ...accessedSpaces.filter(js => 
        !ownedSpaces?.some(os => os.id === js.id)
      )
    ];
    
    // Return the actual spaces (or empty array if none found)
    return allSpaces;
  } catch (error) {
    console.error("Error in fetchUserSpaces:", error);
    return [];
  }
}; 