/**
 * Cache Warming Utility
 * 
 * Pre-populates the global cache with known data to prevent unnecessary database queries
 * This is especially useful for known spaces and frequently accessed data
 */

import { globalCache } from './globalCacheCoordinator';
import { devLogger } from './developmentLogger';

// Known space data that can be pre-warmed
const KNOWN_SPACES = {
  'nocode-architects': {
    id: '235e68d1-89df-4d2d-8945-e7756d60de20',
    name: 'Nocode Devils',
    subdomain: 'nocode-architects',
    description: 'A space for nocode developers and enthusiasts',
    icon_image: null,
    cover_image: null,
    is_private: false,
    member_count: 6,
    admin_count: 2,
    online_count: 2
  }
};

/**
 * Warm cache with known space data
 */
export function warmSpaceCache(subdomain: string): boolean {
  const spaceData = KNOWN_SPACES[subdomain as keyof typeof KNOWN_SPACES];
  if (!spaceData) return false;

  // Warm space data cache
  globalCache.warm(`space:${subdomain}`, spaceData);
  
  // Warm member counts cache
  globalCache.warm(`memberCounts:${spaceData.id}`, {
    totalMembers: spaceData.member_count,
    onlineMembers: spaceData.online_count,
    adminMembers: spaceData.admin_count
  });

  devLogger.log('CacheDebug', `Cache warmed for space ${subdomain}`, { spaceData });
  return true;
}

/**
 * Initialize cache warming on app startup
 */
export function initializeCacheWarming(): void {
  // Warm cache for known spaces
  Object.keys(KNOWN_SPACES).forEach(subdomain => {
    warmSpaceCache(subdomain);
  });
  
  devLogger.log('CacheDebug', 'Cache warming initialized');
}

// Make cache warming available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).cacheWarming = {
    warmSpaceCache,
    initializeCacheWarming,
    getKnownSpaces: () => KNOWN_SPACES
  };
} 