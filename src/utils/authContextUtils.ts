import { getSupabaseClient } from '@/integrations/supabase/client'; // Ensure this path is correct
import { PostgrestError } from '@supabase/supabase-js'; // ADDED IMPORT

/**
 * Utility function to get the user's preferred space for redirection
 * Prioritizes last created space, then owned spaces, then joined spaces, and finally any cached space
 */

// Type for the data stored in localStorage for 'lastCreatedSpace'
interface LastCreatedSpaceData {
  id: string;
  subdomain: string;
  name: string;
  owner_id: string; // Assuming owner_id is always present from context
}

// Type for the nested 'spaces' object within an access record
interface NestedSpaceData {
  id: string;
  subdomain: string;
  name: string;
}

// Type for individual space access records
interface SpaceAccessRecord {
  id: string;
  space_id: string;
  spaces: NestedSpaceData | null; // The joined space data
}

export async function getUserPreferredSpace(userId: string): Promise<{ subdomain: string } | null> {
  if (!userId) {
    console.error('❌ getUserPreferredSpace called with empty userId');
    return null;
  }

  // Priority 1: Check for last created space in localStorage
  try {
    const lastCreated = localStorage.getItem('lastCreatedSpace');
    if (lastCreated) {
      const parsed = JSON.parse(lastCreated);
      
      if (parsed && parsed.subdomain && parsed.owner_id === userId) {
        console.log(`✅ Found last created space: ${parsed.subdomain}`);
        return { subdomain: parsed.subdomain };
      } else if (parsed && parsed.subdomain && parsed.owner_id !== userId) {
        console.log(`⚠️ Found last created space but owned by different user: ${parsed.subdomain}`);
      }
    }
  } catch (e) {
    console.warn('Error parsing lastCreatedSpace:', e);
  }

  // Priority 2: Check for spaces directly owned by the user
  try {
    const { data: ownedSpaces, error: ownedSpacesError } = await getSupabaseClient()
      .from('spaces')
      .select('id, name, subdomain')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (ownedSpacesError) {
      console.error('Error fetching owned spaces:', ownedSpacesError);
    } else if (ownedSpaces && ownedSpaces.length > 0) {
      console.log(`✅ Found owned space: ${ownedSpaces[0].subdomain}`);
      
      // Cache this result for faster access next time
      try {
        localStorage.setItem('lastCreatedSpace', JSON.stringify({
          subdomain: ownedSpaces[0].subdomain,
          id: ownedSpaces[0].id,
          name: ownedSpaces[0].name,
          owner_id: userId
        }));
      } catch (e) {
        console.warn('Error caching lastCreatedSpace:', e);
      }
      
      return { subdomain: ownedSpaces[0].subdomain };
    }
  } catch (e) {
    console.error('Error in owned spaces query:', e);
  }

  // Priority 3: Check for space memberships for the user
  try {
    const { data: accessSpaces, error: accessSpacesError } = await getSupabaseClient()
      .from('space_members')
      .select(`
        space_id,
        spaces: space_id (
          id,
          name,
          subdomain
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);

    if (accessSpacesError) {
      console.error('Error fetching space memberships:', accessSpacesError);
    } else if (accessSpaces && accessSpaces.length > 0 && accessSpaces[0].spaces) {
      const spaceData = accessSpaces[0].spaces;
      console.log(`✅ Found space access: ${spaceData.subdomain}`);
      return { subdomain: spaceData.subdomain };
    }
  } catch (e) {
    console.error('Error in space access query:', e);
  }

  // No space found
  return null;
} 