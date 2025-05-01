import { supabase } from '@/integrations/supabase/client';
import { NavigateFunction } from 'react-router-dom';

/**
 * Space data structure to be used for redirection and caching
 */
export interface SpaceRedirectData {
  id: string;
  subdomain: string;
  name?: string;
  owner_id?: string;
  created_at?: string;
}

/**
 * A streamlined, reliable utility for redirecting users to their spaces
 * This can be called from anywhere in the app and will work with or without React Router
 * 
 * @param navigate Optional React Router navigate function. If provided, uses it instead of window.location
 * @param replace Whether to replace the current history entry (defaults to true)
 * @returns Promise resolving to boolean indicating if redirection was successful
 */
export async function redirectToSpace(
  navigate?: NavigateFunction,
  replace: boolean = true
): Promise<boolean> {
  console.log('🚀 Starting space redirection');
  
  try {
    // 1. Check if user is authenticated
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !sessionData.session) {
      console.log('❌ No authenticated user found for space redirection');
      return false;
    }
    
    const userId = sessionData.session.user.id;
    console.log('✅ Found authenticated user:', userId);
    
    // 2. Get user's space (from cache or database)
    const spaceData = await getUserSpace(userId);
    
    if (!spaceData) {
      console.log('❌ No spaces found for user');
      return false;
    }
    
    // 3. Perform the actual redirection
    const spaceUrl = `/${spaceData.subdomain}`;
    
    if (navigate) {
      // React Router navigation
      console.log('➡️ Navigating to space using React Router:', spaceUrl);
      navigate(spaceUrl, { replace });
    } else {
      // Direct window location change
      console.log('➡️ Navigating to space using window.location:', spaceUrl);
      window.location.href = spaceUrl;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error during space redirection:', error);
    return false;
  }
}

/**
 * Gets the user's space information with the following priority:
 * 1. Last created space from localStorage
 * 2. Last visited space from localStorage 
 * 3. Spaces owned by the user from database
 * 4. Spaces the user has access to from database
 * 
 * @param userId The user's ID
 * @returns Space data or null if no space is found
 */
export async function getUserSpace(userId: string): Promise<SpaceRedirectData | null> {
  // 1. Try lastCreatedSpace first (highest priority)
  try {
    const lastCreatedSpace = localStorage.getItem('lastCreatedSpace');
    if (lastCreatedSpace) {
      try {
        const parsed = JSON.parse(lastCreatedSpace);
        if (parsed && parsed.subdomain && parsed.owner_id === userId) {
          console.log('✅ Found lastCreatedSpace in cache:', parsed.subdomain);
          
          // Verify the space exists in the database quickly
          try {
            const { data: spaceExists } = await supabase
              .from('spaces')
              .select('id')
              .eq('subdomain', parsed.subdomain)
              .maybeSingle();
              
            if (spaceExists) {
              console.log('✅ Verified space exists in database');
              return parsed;
            } else {
              console.warn('⚠️ Cached space not found in database, removing from cache');
              localStorage.removeItem('lastCreatedSpace');
            }
          } catch (verifyError) {
            console.warn('⚠️ Error verifying space, proceeding anyway:', verifyError);
            return parsed;
          }
        } else {
          console.log('❌ lastCreatedSpace found but invalid or not owned by current user');
        }
      } catch (parseError) {
        console.warn('⚠️ Error parsing lastCreatedSpace:', parseError);
        try {
          localStorage.removeItem('lastCreatedSpace');
        } catch (clearError) {
          console.error('❌ Error clearing invalid lastCreatedSpace:', clearError);
        }
      }
    }
  } catch (createdSpaceError) {
    console.warn('❌ Error accessing lastCreatedSpace:', createdSpaceError);
  }
  
  // 2. Then try lastVisitedSpace
  try {
    const lastVisitedSpace = localStorage.getItem('lastVisitedSpace');
    if (lastVisitedSpace) {
      try {
        const parsed = JSON.parse(lastVisitedSpace);
        if (parsed && parsed.subdomain) {
          console.log('✅ Found lastVisitedSpace in cache:', parsed.subdomain);
          return parsed;
        }
      } catch (parseError) {
        console.warn('⚠️ Error parsing lastVisitedSpace:', parseError);
        try {
          localStorage.removeItem('lastVisitedSpace');
        } catch (clearError) {
          console.error('❌ Error clearing invalid lastVisitedSpace:', clearError);
        }
      }
    }
  } catch (visitedSpaceError) {
    console.warn('❌ Error accessing lastVisitedSpace:', visitedSpaceError);
  }
  
  // 3. Query spaces directly from database
  console.log('🔍 Querying database for user spaces');
  try {
    const { data: spaces, error: spacesError } = await supabase
      .from('spaces')
      .select('id, name, subdomain')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (spacesError) {
      console.error('❌ Error fetching spaces:', spacesError);
    } else if (spaces && spaces.length > 0) {
      const space = spaces[0];
      console.log('✅ Found user space in database:', space.name, space.subdomain);
      
      // Cache the space for future redirections
      try {
        // Standard visited space format
        const spaceData: SpaceRedirectData = {
          id: space.id,
          name: space.name,
          subdomain: space.subdomain
        };
        
        localStorage.setItem('lastVisitedSpace', JSON.stringify(spaceData));
        localStorage.setItem('selectedSpaceId', space.id);
        
        // Extended format for created spaces
        const createdSpaceData: SpaceRedirectData = {
          ...spaceData,
          created_at: new Date().toISOString(),
          owner_id: userId
        };
        
        localStorage.setItem('lastCreatedSpace', JSON.stringify(createdSpaceData));
        console.log('✅ Successfully cached space for future redirections');
      } catch (error) {
        console.warn('⚠️ Error caching space:', error);
      }
      
      return {
        id: space.id,
        name: space.name,
        subdomain: space.subdomain
      };
    }
  } catch (dbQueryError) {
    console.error('❌ Error during database query for spaces:', dbQueryError);
  }
  
  // 4. If no spaces found, check spaces the user has access to
  console.log('🔍 No owned spaces, checking spaces with access');
  try {
    const { data: accessSpaces, error: accessError } = await supabase
      .from('space_access')
      .select(`
        space_id,
        spaces:space_id (id, name, subdomain)
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (accessError) {
      console.error('❌ Error fetching space access:', accessError);
    } else if (accessSpaces && accessSpaces.length > 0 && accessSpaces[0].spaces) {
      const space = accessSpaces[0].spaces as any;
      console.log('✅ Found space with access:', space.name, space.subdomain);
      
      // Cache the space for future redirections
      try {
        localStorage.setItem('lastVisitedSpace', JSON.stringify({
          id: space.id,
          name: space.name,
          subdomain: space.subdomain
        }));
        
        localStorage.setItem('selectedSpaceId', space.id);
        console.log('✅ Successfully cached space with access for future redirections');
      } catch (error) {
        console.warn('⚠️ Error caching space:', error);
      }
      
      return {
        id: space.id,
        name: space.name,
        subdomain: space.subdomain
      };
    }
  } catch (accessQueryError) {
    console.error('❌ Error during database query for space access:', accessQueryError);
  }
  
  return null;
} 