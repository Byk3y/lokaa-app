/**
 * CacheAccessService - Centralized cache access and validation
 * 
 * Extracted from SpaceTabContent.tsx Phase 3 refactoring
 * Handles all localStorage-based instant access checking
 */

export interface CacheAccessResult {
  hasInstantAccess: boolean;
  cacheStatus: 'hit' | 'miss' | 'expired' | 'invalid' | 'no-user' | 'no-subdomain';
  source?: 'lastActiveSpace' | 'ownershipFlag' | 'membershipCache';
  error?: string;
}

export class CacheAccessService {
  /**
   * Check if user has instant access to a space via various cache sources
   */
  static checkInstantAccess(
    user: { id: string } | null, 
    subdomain: string, 
    authLoading: boolean
  ): CacheAccessResult {
    // Early validation
    if (!user || authLoading || !subdomain) {
      return {
        hasInstantAccess: false,
        cacheStatus: !user ? 'no-user' : 'no-subdomain'
      };
    }

    try {
      // Method 1: Check lastActiveSpace cache
      const lastActiveResult = this.checkLastActiveSpace(subdomain);
      if (lastActiveResult.hasInstantAccess) {
        return lastActiveResult;
      }

      // Method 2: Check ownership flag
      const ownershipResult = this.checkOwnershipFlag(subdomain);
      if (ownershipResult.hasInstantAccess) {
        return ownershipResult;
      }

      // Method 3: Check membership cache
      const membershipResult = this.checkMembershipCache(subdomain, user.id);
      if (membershipResult.hasInstantAccess) {
        return membershipResult;
      }

      // No cache hit found
      return {
        hasInstantAccess: false,
        cacheStatus: 'miss'
      };

    } catch (error) {
      return {
        hasInstantAccess: false,
        cacheStatus: 'invalid',
        error: error instanceof Error ? error.message : 'Unknown cache error'
      };
    }
  }

  /**
   * Check lastActiveSpace localStorage entry
   */
  private static checkLastActiveSpace(subdomain: string): CacheAccessResult {
    try {
      const lastActiveSpace = localStorage.getItem('lastActiveSpace');
      if (!lastActiveSpace) {
        return { hasInstantAccess: false, cacheStatus: 'miss' };
      }

      const space = JSON.parse(lastActiveSpace);
      if (space?.subdomain === subdomain) {
        return {
          hasInstantAccess: true,
          cacheStatus: 'hit',
          source: 'lastActiveSpace'
        };
      }

      return { hasInstantAccess: false, cacheStatus: 'miss' };
    } catch (error) {
      return {
        hasInstantAccess: false,
        cacheStatus: 'invalid',
        error: 'Failed to parse lastActiveSpace'
      };
    }
  }

  /**
   * Check user ownership flag
   */
  private static checkOwnershipFlag(subdomain: string): CacheAccessResult {
    try {
      const ownershipFlag = localStorage.getItem(`user_owns_space_${subdomain}`);
      if (ownershipFlag === 'true') {
        return {
          hasInstantAccess: true,
          cacheStatus: 'hit',
          source: 'ownershipFlag'
        };
      }

      return { hasInstantAccess: false, cacheStatus: 'miss' };
    } catch (error) {
      return {
        hasInstantAccess: false,
        cacheStatus: 'invalid',
        error: 'Failed to check ownership flag'
      };
    }
  }

  /**
   * Check membership cache
   */
  private static checkMembershipCache(subdomain: string, userId: string): CacheAccessResult {
    try {
      const membershipCache = localStorage.getItem(`user_member_${subdomain}_${userId}`);
      if (!membershipCache) {
        return { hasInstantAccess: false, cacheStatus: 'miss' };
      }

      const memberData = JSON.parse(membershipCache);
      if (memberData?.isMember) {
        return {
          hasInstantAccess: true,
          cacheStatus: 'hit',
          source: 'membershipCache'
        };
      }

      return { hasInstantAccess: false, cacheStatus: 'miss' };
    } catch (error) {
      return {
        hasInstantAccess: false,
        cacheStatus: 'invalid',
        error: 'Failed to parse membership cache'
      };
    }
  }

  /**
   * Clear all cache entries for a specific subdomain
   */
  static clearSubdomainCache(subdomain: string, userId?: string): void {
    try {
      // Clear ownership flag
      localStorage.removeItem(`user_owns_space_${subdomain}`);
      
      // Clear membership cache if userId provided
      if (userId) {
        localStorage.removeItem(`user_member_${subdomain}_${userId}`);
      }
      
      // Check and potentially clear lastActiveSpace
      const lastActiveSpace = localStorage.getItem('lastActiveSpace');
      if (lastActiveSpace) {
        try {
          const space = JSON.parse(lastActiveSpace);
          if (space?.subdomain === subdomain) {
            localStorage.removeItem('lastActiveSpace');
          }
        } catch (e) {
          // If we can't parse it, remove it anyway
          localStorage.removeItem('lastActiveSpace');
        }
      }
    } catch (error) {
      console.warn('Failed to clear subdomain cache:', error);
    }
  }

  /**
   * Get cache statistics for debugging
   */
  static getCacheStats(subdomain: string, userId?: string) {
    const stats = {
      lastActiveSpace: !!localStorage.getItem('lastActiveSpace'),
      ownershipFlag: localStorage.getItem(`user_owns_space_${subdomain}`) === 'true',
      membershipCache: false,
      cacheKeys: [] as string[]
    };

    if (userId) {
      const membershipCache = localStorage.getItem(`user_member_${subdomain}_${userId}`);
      if (membershipCache) {
        try {
          const memberData = JSON.parse(membershipCache);
          stats.membershipCache = !!memberData?.isMember;
        } catch (e) {
          // Invalid cache
        }
      }
    }

    // Get all related cache keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.includes(subdomain) || 
        key === 'lastActiveSpace'
      )) {
        stats.cacheKeys.push(key);
      }
    }

    return stats;
  }
} 