/**
 * URL Utilities for Space Navigation
 */

/**
 * Generate a URL for a space page
 * @param subdomain The space subdomain
 * @param section Optional section name (about, members, etc.)
 * @returns The formatted URL string
 */
export function getSpaceUrl(subdomain: string, section?: string): string {
  // Normalize section names to ensure consistency
  // This helps prevent discrepancies between tab names and URL paths
  if (section) {
    // Handle any plural/singular inconsistencies
    if (section === 'leaderboards') section = 'leaderboard';
    if (section === 'members') section = 'members';
    if (section === 'settings') section = 'settings';
    if (section === 'classroom') section = 'classroom';
  }
  
  if (!section || section === 'community' || section === 'feed') {
    return `/${subdomain}`;
  }
  return `/${subdomain}/${section}`;
}

/**
 * Create a slug from text
 * @param text The text to convert to a slug
 * @returns A URL-friendly slug
 */
export function createSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Cache the currently viewed space for future reference
 * @param spaceData Space data to cache
 */
export function cacheSpaceData(spaceData: {
  id: string;
  subdomain: string;
  name: string;
}): void {
  try {
    localStorage.setItem('lastViewedSpace', JSON.stringify({
      subdomain: spaceData.subdomain,
      id: spaceData.id,
      name: spaceData.name,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.warn('Failed to cache space selection:', error);
  }
}

/**
 * Get the cached space data
 * @param maxAgeMs Maximum age of the cache in milliseconds
 * @returns The cached space data or null if not found or expired
 */
export function getCachedSpaceData(maxAgeMs = 5 * 60 * 1000): {
  subdomain: string;
  id: string;
  name: string;
  timestamp: number;
} | null {
  try {
    const data = localStorage.getItem('lastViewedSpace');
    if (!data) return null;
    
    const parsed = JSON.parse(data);
    const age = Date.now() - parsed.timestamp;
    
    if (age > maxAgeMs) return null;
    
    return parsed;
  } catch (error) {
    console.warn('Failed to retrieve cached space data:', error);
    return null;
  }
} 