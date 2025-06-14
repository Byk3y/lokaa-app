/**
 * Space navigation service
 * Handles space redirection logic with cache-first approach
 */

import { getSupabaseClient } from '@/integrations/supabase/client';
import { NavigateFunction } from 'react-router-dom';
import type { SpaceRedirectData } from '@/shared/types/spaces';
import {
  getLastJoinedSpace,
  getLastCreatedSpace,
  getLastVisitedSpace,
  cacheSpaceForRedirection,
  clearCacheEntry,
} from './space-cache';
import {
  verifySpaceAccess,
  verifySpaceOwnership,
  getUserOwnedSpaces,
  getUserAccessibleSpaces,
} from './space-access';

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
    const { data: sessionData, error: sessionError } = await getSupabaseClient().auth.getSession();
    
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
    const lastJoinedSpace = getLastJoinedSpace();
    if (lastJoinedSpace) {
      console.log('✅ Found lastJoinedSpace in cache:', lastJoinedSpace.subdomain);
      
      // Verify user has access to this space
      const hasAccess = await verifySpaceAccess(userId, lastJoinedSpace.id);
      
      if (hasAccess) {
        console.log('✅ Verified user has access to last joined space');
        return lastJoinedSpace;
      } else {
        console.log('❌ User no longer has access to last joined space');
        clearCacheEntry('LAST_JOINED');
      }
    }
  } catch (error) {
    console.warn('❌ Error accessing lastJoinedSpace:', error);
  }

  // 2. Try lastCreatedSpace next
  try {
    const lastCreatedSpace = getLastCreatedSpace();
    if (lastCreatedSpace && lastCreatedSpace.owner_id === userId) {
      console.log('✅ Found lastCreatedSpace in cache for current user:', lastCreatedSpace.subdomain);
      
      // Verify the space exists and user owns it
      const isOwner = await verifySpaceOwnership(userId, lastCreatedSpace.subdomain);
      
      if (isOwner) {
        console.log('✅ Verified space exists and is owned by current user');
        return lastCreatedSpace;
      } else {
        console.log('❌ Cached space not found or not owned by user');
        clearCacheEntry('LAST_CREATED');
      }
    }
  } catch (error) {
    console.warn('❌ Error accessing lastCreatedSpace:', error);
  }
  
  // 3. Try lastVisitedSpace - but verify it belongs to current user
  try {
    const lastVisitedSpace = getLastVisitedSpace();
    if (lastVisitedSpace) {
      console.log('🔍 Found lastVisitedSpace in cache:', lastVisitedSpace.subdomain);
      
      // Verify user owns the space
      const isOwner = await verifySpaceOwnership(userId, lastVisitedSpace.subdomain);
      
      if (isOwner) {
        console.log('✅ User owns the cached visited space');
        return lastVisitedSpace;
      }
      
      // Check if user has member access
      if (lastVisitedSpace.id) {
        const hasAccess = await verifySpaceAccess(userId, lastVisitedSpace.id);
        
        if (hasAccess) {
          console.log('✅ User has member access to the cached visited space');
          return lastVisitedSpace;
        }
      }
      
      console.log('❌ User does not have access to lastVisitedSpace, clearing cache');
      clearCacheEntry('LAST_VISITED');
    }
  } catch (error) {
    console.warn('❌ Error accessing lastVisitedSpace:', error);
  }
  
  // 4. Query owned spaces directly from database
  console.log('🔍 Querying database for owned spaces');
  try {
    const ownedSpaces = await getUserOwnedSpaces(userId);
    
    if (ownedSpaces.length > 0) {
      const space = ownedSpaces[0];
      console.log('✅ Found user owned space in database:', space.name, space.subdomain);
      
      // Cache the space for future redirections
      cacheSpaceForRedirection(space, userId);
      
      return space;
    }
  } catch (error) {
    console.error('❌ Error fetching owned spaces:', error);
  }

  // 5. Query accessible spaces as a last resort
  console.log('🔍 Querying space_access table as a last resort');
  try {
    const accessibleSpaces = await getUserAccessibleSpaces(userId);
    
    if (accessibleSpaces.length > 0) {
      const space = accessibleSpaces[0];
      console.log('✅ Found accessible space in database:', space.name, space.subdomain);
      
      // Cache the space for future redirections (without owner_id since user doesn't own it)
      cacheSpaceForRedirection(space);
      
      return space;
    }
  } catch (error) {
    console.error('❌ Exception fetching accessible spaces:', error);
  }

  console.log('❌ No suitable space found for user after all checks');
  return null;
} 