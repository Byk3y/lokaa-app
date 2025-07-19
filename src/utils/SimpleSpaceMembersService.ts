import { log } from '@/utils/logger';
/**
 * Simple Space Members Service
 * 
 * Simplified replacement for the complex SpaceMembersService.
 * Uses the unified SimpleCache instead of complex IndexedDB operations.
 * 
 * This is part of Phase 3: Cache System Consolidation
 */

import { simpleCache, SimpleCache } from './SimpleCache';

interface SpaceMember {
  id: string;
  user_id: string;
  space_id: string;
  role: string;
  status: string;
  created_at: string;
}

interface MemberCounts {
  total: number;
  online: number;
  admin: number;
}

export class SimpleSpaceMembersService {
  /**
   * Get space members with simple caching
   */
  async getSpaceMembers(spaceId: string): Promise<SpaceMember[]> {
    const cacheKey = `space_members:${spaceId}`;
    
    // Try cache first
    const cached = simpleCache.get(cacheKey);
    if (cached) {
      log.debug('Utils', `✅ [SimpleSpaceMembers] Cache hit for space ${spaceId}`);
      return cached;
    }

    try {
      // Fetch from API (placeholder - replace with actual API call)
      log.debug('Utils', `🔄 [SimpleSpaceMembers] Fetching members for space ${spaceId}`);
      
      // This would be replaced with actual Supabase call
      const members: SpaceMember[] = [];
      
      // Cache for medium duration
      simpleCache.set(cacheKey, members, {
        ttl: SimpleCache.TTL.MEDIUM,
        persist: true
      });

      return members;
    } catch (error) {
      log.error('Utils', `❌ [SimpleSpaceMembers] Error fetching space members:`, error);
      return [];
    }
  }

  /**
   * Get member counts with simple caching
   */
  async getMemberCounts(spaceId: string): Promise<MemberCounts> {
    const cacheKey = `member_counts:${spaceId}`;
    
    // Try cache first
    const cached = simpleCache.get(cacheKey);
    if (cached) {
      log.debug('Utils', `✅ [SimpleSpaceMembers] Cache hit for counts ${spaceId}`);
      return cached;
    }

    try {
      log.debug('Utils', `🔄 [SimpleSpaceMembers] Fetching counts for space ${spaceId}`);
      
      // Placeholder counts - replace with actual API call
      const counts: MemberCounts = {
        total: 0,
        online: 0,
        admin: 0
      };
      
      // Cache for short duration (counts change frequently)
      simpleCache.set(cacheKey, counts, {
        ttl: SimpleCache.TTL.SHORT,
        persist: true
      });

      return counts;
    } catch (error) {
      log.error('Utils', `❌ [SimpleSpaceMembers] Error fetching member counts:`, error);
      return { total: 0, online: 0, admin: 0 };
    }
  }

  /**
   * Check if user is member of space
   */
  async isUserMember(userId: string, spaceId: string): Promise<boolean> {
    const cacheKey = `user_member:${userId}:${spaceId}`;
    
    // Try cache first
    const cached = simpleCache.get(cacheKey);
    if (cached !== null) {
      log.debug('Utils', `✅ [SimpleSpaceMembers] Cache hit for membership check`);
      return cached;
    }

    try {
      log.debug('Utils', `🔄 [SimpleSpaceMembers] Checking membership for user ${userId} in space ${spaceId}`);
      
      // Placeholder - replace with actual API call
      const isMember = false;
      
      // Cache for medium duration
      simpleCache.set(cacheKey, isMember, {
        ttl: SimpleCache.TTL.MEDIUM,
        persist: true
      });

      return isMember;
    } catch (error) {
      log.error('Utils', `❌ [SimpleSpaceMembers] Error checking membership:`, error);
      return false;
    }
  }

  /**
   * Invalidate cache for a space
   */
  invalidateSpaceCache(spaceId: string): void {
    log.debug('Utils', `🗑️ [SimpleSpaceMembers] Invalidating cache for space ${spaceId}`);
    
    // Clear all cache entries related to this space
    simpleCache.clear(`space_members:${spaceId}`);
    simpleCache.clear(`member_counts:${spaceId}`);
    simpleCache.clear(`:${spaceId}`); // Catch user_member entries
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    log.debug('Utils', `🧹 [SimpleSpaceMembers] Clearing all cache`);
    simpleCache.clear('space_members:');
    simpleCache.clear('member_counts:');
    simpleCache.clear('user_member:');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const stats = simpleCache.getStats();
    log.debug('Utils', `📊 [SimpleSpaceMembers] Cache stats:`, stats);
    return stats;
  }
}

// Create singleton instance
export const simpleSpaceMembersService = new SimpleSpaceMembersService();

// Expose globally for debugging
if (typeof window !== 'undefined') {
  (window as any).simpleSpaceMembersService = simpleSpaceMembersService;
  log.debug('Utils', '👥 [SimpleSpaceMembers] Service initialized with unified caching');
} 