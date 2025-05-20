import { supabase } from '@/integrations/supabase/client';
import { NavigateFunction } from 'react-router-dom';
import { PostgrestError } from '@supabase/supabase-js';

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
 * 1. Last joined space from localStorage
 * 2. Last created space from localStorage
 * 3. Last visited space from localStorage 
 * 4. Spaces owned by the user from database
 * 5. Spaces the user has access to from database
 * 
 * @param userId The user's ID
 * @returns Space data or null if no space is found
 */
export async function getUserSpace(userId: string): Promise<SpaceRedirectData | null> {
  if (!userId) {
    console.log('❌ No user ID provided for getUserSpace');
    return null;
  }

  // 1. Try lastJoinedSpace first (highest priority)
  try {
    const lastJoinedSpace = localStorage.getItem('lastJoinedSpace');
    if (lastJoinedSpace) {
      try {
        const parsed = JSON.parse(lastJoinedSpace);
        
        if (parsed && parsed.subdomain) {
          console.log('✅ Found lastJoinedSpace in cache:', parsed.subdomain);
          
          // Verify user has access to this space
          try {
            const { data: accessCheck } = await supabase
              .from('space_access')
              .select('id')
              .eq('user_id', userId)
              .eq('space_id', parsed.id)
              .eq('is_active', true)
              .maybeSingle();
              
            if (accessCheck) {
              console.log('✅ Verified user has access to last joined space');
              return parsed;
            } else {
              console.log('❌ User no longer has access to last joined space');
            }
          } catch (error) {
            console.warn('⚠️ Error verifying access to last joined space:', error);
          }
        }
      } catch (parseError) {
        console.warn('⚠️ Error parsing lastJoinedSpace:', parseError);
        localStorage.removeItem('lastJoinedSpace');
      }
    }
  } catch (error) {
    console.warn('❌ Error accessing lastJoinedSpace:', error);
  }

  // 2. Try lastCreatedSpace next
  try {
    const lastCreatedSpace = localStorage.getItem('lastCreatedSpace');
    if (lastCreatedSpace) {
      try {
        const parsed = JSON.parse(lastCreatedSpace);
        
        // Important: Only use this space if it belongs to the current user
        if (parsed && parsed.subdomain && parsed.owner_id === userId) {
          console.log('✅ Found lastCreatedSpace in cache for current user:', parsed.subdomain);
          
          // Verify the space exists in the database and user has access
          try {
            const { data: spaceExists } = await supabase
              .from('spaces')
              .select('id, owner_id')
              .eq('subdomain', parsed.subdomain)
              .maybeSingle();
              
            if (spaceExists) {
              // Double-check owner matches current user
              if (spaceExists.owner_id === userId) {
                console.log('✅ Verified space exists and is owned by current user');
                return parsed;
              } else {
                console.log('❌ Cached space exists but belongs to different user');
                // Don't remove from cache, it might belong to another user account
              }
            } else {
              console.warn('⚠️ Cached space not found in database, removing from cache');
              localStorage.removeItem('lastCreatedSpace');
            }
          } catch (verifyError) {
            console.warn('⚠️ Error verifying space:', verifyError);
            // Continue with cached data only if it belongs to current user
            return parsed;
          }
        } else {
          console.log('❌ lastCreatedSpace found but invalid or not owned by current user, ignoring');
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
  
  // 3. Then try lastVisitedSpace - but verify it belongs to current user
  try {
    const lastVisitedSpace = localStorage.getItem('lastVisitedSpace');
    if (lastVisitedSpace) {
      try {
        const parsed = JSON.parse(lastVisitedSpace);
        if (parsed && parsed.subdomain) {
          console.log('🔍 Found lastVisitedSpace in cache:', parsed.subdomain);
          
          // Verify user has access to this space
          const { data: hasAccess } = await supabase
            .from('spaces')
            .select('id')
            .eq('subdomain', parsed.subdomain)
            .eq('owner_id', userId)
            .maybeSingle();
          
          if (hasAccess) {
            console.log('✅ User owns the cached visited space');
            return parsed;
          }
          
          // Check if user has member access
          const { data: memberAccess } = await supabase
            .from('space_access')
            .select('id')
            .eq('user_id', userId)
            .eq('space_id', parsed.id)
            .eq('is_active', true)
            .maybeSingle();
            
          if (memberAccess) {
            console.log('✅ User has member access to the cached visited space');
            return parsed;
          }
          
          console.log('❌ User does not have access to lastVisitedSpace, ignoring');
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
  
  // 4. Query spaces directly from database
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
  
  // Define interfaces for section 5 query
  interface UserAccessSpaceData {
    id: string;
    name: string | null;
    subdomain: string;
  }

  interface UserAccessRecordWithSpace {
    id: string;
    space_id: string;
    spaces: UserAccessSpaceData | null;
  }

  // 5. Query space_access table as a last resort
  console.log('Nitrous: Querying space_access table as a last resort');
  try {
    const { data: accessRecords, error } = await supabase
      .from('space_access')
      .select('id, space_id, spaces:space_id(id, name, subdomain)')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .returns<UserAccessRecordWithSpace[]>(); // Use .returns<Type>() for better type safety
      
    if (error) {
      console.error('❌ Error fetching access records:', error); // error is now PostgrestError | null
    } else if (accessRecords && accessRecords.length > 0) {
      // Ensure spaces is not null before accessing its properties
      const recordWithSpace = accessRecords.find(r => r.spaces && r.spaces.subdomain);
      if (recordWithSpace && recordWithSpace.spaces) {
        const space = recordWithSpace.spaces;
        console.log('✅ Found accessible space in database:', space.name, space.subdomain);
        return space; // Return the SpaceRedirectData compatible object
      }
    }
  } catch (accessError) {
    console.error('❌ Exception fetching access records:', accessError);
  }

  console.log('❌ No suitable space found for user after all checks');
  return null;
} 