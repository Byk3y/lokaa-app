import { log } from '@/utils/logger';
/**
 * Space caching service for localStorage operations
 * Manages user space preferences and navigation hints
 */

import type { SpaceRedirectData, SpaceCacheEntry } from '@/shared/types/spaces';

// Cache keys for different space preferences
export const CACHE_KEYS = {
  LAST_JOINED: 'lastJoinedSpace',
  LAST_CREATED: 'lastCreatedSpace',
  LAST_VISITED: 'lastVisitedSpace',
  SELECTED_SPACE_ID: 'selectedSpaceId',
} as const;

/**
 * Get last joined space from cache
 */
export const getLastJoinedSpace = (): SpaceCacheEntry | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEYS.LAST_JOINED);
    if (!cached) return null;
    
    const parsed = JSON.parse(cached);
    return parsed && parsed.subdomain ? parsed : null;
  } catch (error) {
    log.warn('Service', 'Error reading lastJoinedSpace:', error);
    return null;
  }
};

/**
 * Get last created space from cache
 */
export const getLastCreatedSpace = (): SpaceCacheEntry | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEYS.LAST_CREATED);
    if (!cached) return null;
    
    const parsed = JSON.parse(cached);
    return parsed && parsed.subdomain ? parsed : null;
  } catch (error) {
    log.warn('Service', 'Error reading lastCreatedSpace:', error);
    return null;
  }
};

/**
 * Get last visited space from cache
 */
export const getLastVisitedSpace = (): SpaceCacheEntry | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEYS.LAST_VISITED);
    if (!cached) return null;
    
    const parsed = JSON.parse(cached);
    return parsed && parsed.subdomain ? parsed : null;
  } catch (error) {
    log.warn('Service', 'Error reading lastVisitedSpace:', error);
    return null;
  }
};

/**
 * Set last joined space in cache
 */
export const setLastJoinedSpace = (space: SpaceCacheEntry): void => {
  try {
    const cacheEntry = {
      ...space,
      joinedAt: new Date().toISOString(),
    };
    localStorage.setItem(CACHE_KEYS.LAST_JOINED, JSON.stringify(cacheEntry));
    log.debug('Service', 'Updated last joined space:', cacheEntry);
  } catch (error) {
    log.error('Service', 'Error setting lastJoinedSpace:', error);
  }
};

/**
 * Set last created space in cache
 */
export const setLastCreatedSpace = (space: SpaceCacheEntry, userId?: string): void => {
  try {
    const cacheEntry = {
      ...space,
      owner_id: userId,
      created_at: new Date().toISOString(),
    };
    localStorage.setItem(CACHE_KEYS.LAST_CREATED, JSON.stringify(cacheEntry));
    log.debug('Service', 'Updated last created space:', cacheEntry);
  } catch (error) {
    log.error('Service', 'Error setting lastCreatedSpace:', error);
  }
};

/**
 * Set last visited space in cache
 */
export const setLastVisitedSpace = (space: SpaceCacheEntry): void => {
  try {
    const cacheEntry = {
      ...space,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(CACHE_KEYS.LAST_VISITED, JSON.stringify(cacheEntry));
    localStorage.setItem(CACHE_KEYS.SELECTED_SPACE_ID, space.id);
    log.debug('Service', 'Updated last visited space:', cacheEntry);
  } catch (error) {
    log.error('Service', 'Error setting lastVisitedSpace:', error);
  }
};

/**
 * Cache space data for future redirections with comprehensive format
 */
export const cacheSpaceForRedirection = (space: SpaceRedirectData, userId?: string): void => {
  try {
    // Standard visited space format
    setLastVisitedSpace({
      id: space.id,
      name: space.name,
      subdomain: space.subdomain,
    });
    
    // Extended format for created spaces if owner ID provided
    if (userId) {
      setLastCreatedSpace({
        id: space.id,
        name: space.name,
        subdomain: space.subdomain,
      }, userId);
    }
    
    log.debug('Service', 'Successfully cached space for future redirections');
  } catch (error) {
    log.warn('Service', 'Error caching space for redirection:', error);
  }
};

/**
 * Clear invalid cache entry by key
 */
export const clearCacheEntry = (key: keyof typeof CACHE_KEYS): void => {
  try {
    const cacheKey = CACHE_KEYS[key];
    localStorage.removeItem(cacheKey);
    log.debug('Service', `Cleared cache entry: ${cacheKey}`);
  } catch (error) {
    log.error('Service', `Error clearing cache entry ${key}:`, error);
  }
};

/**
 * Clear all space cache entries
 */
export const clearAllSpaceCache = (): void => {
  try {
    Object.values(CACHE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    log.debug('Service', 'Cleared all space cache entries');
  } catch (error) {
    log.error('Service', 'Error clearing all space cache:', error);
  }
};

/**
 * Get all cached space preferences for debugging
 */
export const getAllCachedSpaces = (): Record<string, SpaceCacheEntry | null> => {
  return {
    lastJoined: getLastJoinedSpace(),
    lastCreated: getLastCreatedSpace(),
    lastVisited: getLastVisitedSpace(),
  };
}; 