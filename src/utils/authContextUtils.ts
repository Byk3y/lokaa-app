import { supabase } from '@/integrations/supabase/client'; // Ensure this path is correct
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

  console.log('Finding preferred space for user:', userId);
    
  try {
    // PRIORITY 1: Last Created Space from localStorage
    console.log('Checking lastCreatedSpace in localStorage');
    try {
      const lastCreatedSpaceJson = localStorage.getItem('lastCreatedSpace');
      
      if (lastCreatedSpaceJson) {
        try {
          const lastCreatedSpace = JSON.parse(lastCreatedSpaceJson) as LastCreatedSpaceData; // Typed JSON.parse
          
          if (lastCreatedSpace?.owner_id && lastCreatedSpace.owner_id !== userId) {
            console.log('Stale lastCreatedSpace found (owner_id mismatch): ', lastCreatedSpace.subdomain, '. Belongs to ', lastCreatedSpace.owner_id, ', current user is ', userId);
            localStorage.removeItem('lastCreatedSpace'); // Remove stale entry
            // Do not return; proceed to next priority checks
          } else if (lastCreatedSpace?.subdomain) {
            // Verify it exists in the database
            const { data, error } = await supabase
            .from('spaces')
              .select('id, subdomain')
              .eq('subdomain', lastCreatedSpace.subdomain)
            .single();
            
            if (error) {
              console.log('Error verifying lastCreatedSpace:', error.message);
            } else if (data) {
              console.log('Using lastCreatedSpace:', data.subdomain);
              return { subdomain: data.subdomain };
            } else {
              console.log('lastCreatedSpace not found in database');
              // Clean up invalid entry
              localStorage.removeItem('lastCreatedSpace');
            }
          } else {
            console.log('lastCreatedSpace missing subdomain');
          }
        } catch (parseError) {
          console.error('Error parsing lastCreatedSpace:', parseError);
          // Invalid JSON - remove it
          localStorage.removeItem('lastCreatedSpace');
        }
      } else {
        console.log('No lastCreatedSpace found in localStorage');
      }
    } catch (storageError) {
      console.error('Error accessing localStorage:', storageError);
    }
    
    // PRIORITY 2: Owned Spaces
    console.log('Checking for spaces owned by user');
    try {
      const { data: ownedSpaces, error } = await supabase
      .from('spaces')
      .select('id, subdomain, name, created_at')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });
    
      if (error) {
        console.error('Error fetching owned spaces:', error.message);
      } else if (ownedSpaces && ownedSpaces.length > 0) {
        console.log(`Found ${ownedSpaces.length} owned spaces`);
        
        // Find first space with valid subdomain
        const validSpace = ownedSpaces.find(space => !!space.subdomain);
      
        if (validSpace) {
          console.log('Using owned space:', validSpace.subdomain);
          
          // Cache this for future use
          try {
            localStorage.setItem('lastCreatedSpace', JSON.stringify({
              id: validSpace.id,
              subdomain: validSpace.subdomain,
              name: validSpace.name,
              owner_id: userId
            }));
            console.log('Cached owned space in localStorage');
          } catch (e) {
            console.warn('Failed to cache space:', e);
          }
        
          return { subdomain: validSpace.subdomain };
        } else {
          console.log('No owned spaces with valid subdomain found');
        }
      } else {
        console.log('No owned spaces found');
      }
    } catch (dbError) {
      console.error('Database error when checking owned spaces:', dbError);
    }
    
    // PRIORITY 3: Joined Spaces via space_access
    console.log('Checking spaces user has access to');
    try {
      const { data: accessRecords, error } = await supabase
      .from('space_access')
      .select(`
        id,
        space_id,
        spaces:space_id(id, subdomain, name)
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false }) as { data: SpaceAccessRecord[] | null; error: PostgrestError | null }; // MODIFIED: error: any to PostgrestError | null
    
      if (error) {
        console.error('Error fetching space access records:', error.message);
      } else if (accessRecords && accessRecords.length > 0) {
        console.log(`Found ${accessRecords.length} space access records`);
      
        // Find first access record with valid space data and subdomain
        const validRecord = accessRecords.find(record => 
          record.spaces && 
          record.spaces.subdomain // No longer 'as any'
        );
      
        if (validRecord && validRecord.spaces) { // Ensure validRecord.spaces is not null
          const space = validRecord.spaces; // No longer 'as any'
          console.log('Using space from access records:', space.subdomain);
        
          // Cache for future use
          try {
            localStorage.setItem('lastVisitedSpace', JSON.stringify({
              id: space.id,
              subdomain: space.subdomain,
              name: space.name
            }));
            console.log('Cached joined space in localStorage');
          } catch (e) {
            console.warn('Failed to cache space:', e);
          }
        
          return { subdomain: space.subdomain };
        } else {
          console.log('No valid spaces found in access records');
        }
      } else {
        console.log('No space access records found');
      }
    } catch (dbError) {
      console.error('Database error when checking joined spaces:', dbError);
    }

    // No valid space found through any method
    console.log('No spaces found for user after checking all priorities');
    return null;
  } catch (error: unknown) { // Changed from any
    console.error('Unexpected error in getUserPreferredSpace:', error instanceof Error ? error.message : String(error)); // Safe access
    return null;
  }
} 