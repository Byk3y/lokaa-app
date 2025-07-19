import { log } from '@/utils/logger';
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
  log.debug('Service', '🚀 Starting space redirection');
  
  try {
    // 1. Check if user is authenticated
    const { data: sessionData, error: sessionError } = await getSupabaseClient().auth.getSession();
    
    if (sessionError || !sessionData.session) {
      log.debug('Service', '❌ No authenticated user found for space redirection');
      return false;
    }
    
    const userId = sessionData.session.user.id;
    log.debug('Service', '✅ Found authenticated user:', userId);
    
    // 2. Get user's space (from cache or database)
    const spaceData = await getUserSpace(userId);
    
    if (!spaceData) {
      log.debug('Service', '❌ No spaces found for user');
      return false;
    }
    
    // 3. Perform the actual redirection
    const spaceUrl = `/${spaceData.subdomain}`;
    
    if (navigate) {
      // React Router navigation
      log.debug('Service', '➡️ Navigating to space using React Router:', spaceUrl);
      navigate(spaceUrl, { replace });
    } else {
      // Direct window location change
      log.debug('Service', '➡️ Navigating to space using window.location:', spaceUrl);
      window.location.href = spaceUrl;
    }
    
    return true;
  } catch (error) {
    log.error('Service', '❌ Error during space redirection:', error);
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
    log.debug('Service', '❌ No user ID provided for getUserSpace');
    return null;
  }

  // 1. Try lastJoinedSpace first (highest priority)
  try {
    const lastJoinedSpace = getLastJoinedSpace();
    if (lastJoinedSpace) {
      log.debug('Service', '✅ Found lastJoinedSpace in cache:', lastJoinedSpace.subdomain);
      
      // Verify user has access to this space
      const hasAccess = await verifySpaceAccess(userId, lastJoinedSpace.id);
      
      if (hasAccess) {
        log.debug('Service', '✅ Verified user has access to last joined space');
        return lastJoinedSpace;
      } else {
        log.debug('Service', '❌ User no longer has access to last joined space');
        clearCacheEntry('LAST_JOINED');
      }
    }
  } catch (error) {
    log.warn('Service', '❌ Error accessing lastJoinedSpace:', error);
  }

  // 2. Try lastCreatedSpace next
  try {
    const lastCreatedSpace = getLastCreatedSpace();
    if (lastCreatedSpace && lastCreatedSpace.owner_id === userId) {
      log.debug('Service', '✅ Found lastCreatedSpace in cache for current user:', lastCreatedSpace.subdomain);
      
      // Verify the space exists and user owns it
      const isOwner = await verifySpaceOwnership(userId, lastCreatedSpace.subdomain);
      
      if (isOwner) {
        log.debug('Service', '✅ Verified space exists and is owned by current user');
        return lastCreatedSpace;
      } else {
        log.debug('Service', '❌ Cached space not found or not owned by user');
        clearCacheEntry('LAST_CREATED');
      }
    }
  } catch (error) {
    log.warn('Service', '❌ Error accessing lastCreatedSpace:', error);
  }
  
  // 3. Try lastVisitedSpace - but verify it belongs to current user
  try {
    const lastVisitedSpace = getLastVisitedSpace();
    if (lastVisitedSpace) {
      log.debug('Service', '🔍 Found lastVisitedSpace in cache:', lastVisitedSpace.subdomain);
      
      // Verify user owns the space
      const isOwner = await verifySpaceOwnership(userId, lastVisitedSpace.subdomain);
      
      if (isOwner) {
        log.debug('Service', '✅ User owns the cached visited space');
        return lastVisitedSpace;
      }
      
      // Check if user has member access
      if (lastVisitedSpace.id) {
        const hasAccess = await verifySpaceAccess(userId, lastVisitedSpace.id);
        
        if (hasAccess) {
          log.debug('Service', '✅ User has member access to the cached visited space');
          return lastVisitedSpace;
        }
      }
      
      log.debug('Service', '❌ User does not have access to lastVisitedSpace, clearing cache');
      clearCacheEntry('LAST_VISITED');
    }
  } catch (error) {
    log.warn('Service', '❌ Error accessing lastVisitedSpace:', error);
  }
  
  // 4. Query owned spaces directly from database
  log.debug('Service', '🔍 Querying database for owned spaces');
  try {
    const ownedSpaces = await getUserOwnedSpaces(userId);
    
    if (ownedSpaces.length > 0) {
      const space = ownedSpaces[0];
      log.debug('Service', '✅ Found user owned space in database:', space.name, space.subdomain);
      
      // Cache the space for future redirections
      cacheSpaceForRedirection(space, userId);
      
      return space;
    }
  } catch (error) {
    log.error('Service', '❌ Error fetching owned spaces:', error);
  }

  // 5. Query accessible spaces as a last resort
  log.debug('Service', '🔍 Querying space_access table as a last resort');
  try {
    const accessibleSpaces = await getUserAccessibleSpaces(userId);
    
    if (accessibleSpaces.length > 0) {
      const space = accessibleSpaces[0];
      log.debug('Service', '✅ Found accessible space in database:', space.name, space.subdomain);
      
      // Cache the space for future redirections (without owner_id since user doesn't own it)
      cacheSpaceForRedirection(space);
      
      return space;
    }
  } catch (error) {
    log.error('Service', '❌ Exception fetching accessible spaces:', error);
  }

  log.debug('Service', '❌ No suitable space found for user after all checks');
  return null;
} 