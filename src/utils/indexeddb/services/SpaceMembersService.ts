/**
 * Space Members Service
 * 
 * Handles space member data operations with IndexedDB caching
 * and mobile browser protection
 */

import { getSupabaseClient } from '@/integrations/supabase/client';
import { CacheEntry, SupabaseBridgeResult, CacheOptions } from '../types';
import { spaceMembersCacheService } from '../core/CacheService';
import { mobileBrowserService } from '../core/MobileBrowserService';
import { supabase } from '@/integrations/supabase/client';

export interface SpaceMember {
  id: string;
  user_id: string;
  space_id: string;
  role: 'owner' | 'admin' | 'member';
  status: 'active' | 'inactive';
  is_online: boolean;
  last_active_at: string;
  joined_at: string;
}

export interface SpaceMemberOptions {
  userId?: string;
  status?: string;
  role?: string;
  forceNetwork?: boolean;
  includeUser?: boolean;
}

/**
 * Space Members Service
 * 
 * Handles all space member operations with mobile-safe caching
 */
export class SpaceMembersService {
  private metrics = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    networkRequests: 0,
    mobileBlocking: 0,
    errors: 0
  };

  /**
   * Get space members with caching and mobile browser protection
   */
  async getSpaceMembers(
    spaceId: string, 
    options: SpaceMemberOptions = {}
  ): Promise<SupabaseBridgeResult<SpaceMember[]>> {
    this.metrics.totalRequests++;
    
    const { userId, status = 'active', forceNetwork = false, includeUser = false } = options;
    const cacheKey = this.generateCacheKey(spaceId, options);

    try {
      // ✅ Phase 2: Use simplified mobile manager for cache-first logic
      // const shouldUseCacheFirst = simpleMobileManager.shouldUseCacheFirst();
      
      // If mobile browser is likely blocking requests, try cache first
      // if (shouldUseCacheFirst) {
      //   console.log('[SpaceMembersService] Mobile browser detected, trying cache first');
      //   
      //   try {
      //     const cachedData = await this.getCachedMembers(spaceId);
      //     if (cachedData.length > 0) {
      //       console.log(`[SpaceMembersService] Using cached data: ${cachedData.length} members`);
      //       return { success: true, data: cachedData, source: 'cache' };
      //     }
      //   } catch (cacheError) {
      //     console.log('[SpaceMembersService] Cache read failed, proceeding to network');
      //   }
      // }

      // Try network request with mobile browser blocking detection
      try {
        const networkResult = await this.executeSpaceMembersQuery(spaceId, options);
        this.metrics.networkRequests++;
        
        if (networkResult.error) {
          throw networkResult.error;
        }

        // Cache successful network response
        if (networkResult.data) {
          const cacheOptions: CacheOptions = {
            metadata: {
              query: 'space_members',
              params: { spaceId, userId, status },
              spaceId,
              userId
            }
          };
          
          await spaceMembersCacheService.set(cacheKey, networkResult.data, cacheOptions);
          console.log('[SpaceMembersService] Cached fresh space members data');
        }

        this.metrics.cacheMisses++;
        return {
          data: networkResult.data,
          error: null,
          fromCache: false
        };

      } catch (error) {
        this.metrics.errors++;
        
        // Check if this is mobile browser blocking
        if (mobileBrowserService.isMobileBrowserBlocking(error)) {
          this.metrics.mobileBlocking++;
          console.log('[SpaceMembersService] Mobile browser blocking detected, using cache fallback');
          
          // Return cached data if available (even if expired)
          const cachedData = await spaceMembersCacheService.get(cacheKey, { skipCache: true });
          if (cachedData) {
            return {
              data: cachedData as SpaceMember[],
              error: null,
              fromCache: true,
              reason: 'mobile_browser_blocking'
            };
          }
        }

        // No cache available or not mobile blocking, return error
        return {
          data: null,
          error: error instanceof Error ? error : new Error(String(error)),
          fromCache: false
        };
      }

    } catch (error) {
      this.metrics.errors++;
      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
        fromCache: false
      };
    }
  }

  /**
   * Get specific user's membership in a space
   */
  async getUserSpaceMembership(
    spaceId: string, 
    userId: string,
    options: { forceNetwork?: boolean } = {}
  ): Promise<SupabaseBridgeResult<SpaceMember | null>> {
    const result = await this.getSpaceMembers(spaceId, {
      userId,
      forceNetwork: options.forceNetwork
    });

    if (result.error) {
      return {
        data: null,
        error: result.error,
        fromCache: result.fromCache,
        reason: result.reason
      };
    }

    const member = result.data && result.data.length > 0 ? result.data[0] : null;
    
    return {
      data: member,
      error: null,
      fromCache: result.fromCache,
      reason: result.reason
    };
  }

  /**
   * Get online members for a space
   */
  async getOnlineMembers(
    spaceId: string,
    options: { forceNetwork?: boolean } = {}
  ): Promise<SupabaseBridgeResult<SpaceMember[]>> {
    const result = await this.getSpaceMembers(spaceId, {
      forceNetwork: options.forceNetwork
    });

    if (result.error) {
      return result;
    }

    const onlineMembers = result.data ? result.data.filter(member => member.is_online) : [];
    
    return {
      data: onlineMembers,
      error: null,
      fromCache: result.fromCache,
      reason: result.reason
    };
  }

  /**
   * Get member count statistics
   */
  async getMemberCounts(
    spaceId: string,
    options: { forceNetwork?: boolean } = {}
  ): Promise<SupabaseBridgeResult<{
    total: number;
    online: number;
    admins: number;
    owners: number;
  }>> {
    const result = await this.getSpaceMembers(spaceId, {
      forceNetwork: options.forceNetwork
    });

    if (result.error) {
      return {
        data: null,
        error: result.error,
        fromCache: result.fromCache,
        reason: result.reason
      };
    }

    const members = result.data || [];
    
    const counts = {
      total: members.length,
      online: members.filter(m => m.is_online).length,
      admins: members.filter(m => m.role === 'admin').length,
      owners: members.filter(m => m.role === 'owner').length
    };

    return {
      data: counts,
      error: null,
      fromCache: result.fromCache,
      reason: result.reason
    };
  }

  /**
   * Invalidate cache for a specific space
   */
  async invalidateSpaceCache(spaceId: string): Promise<void> {
    try {
      // Get all cache entries for this space and remove them
      const entries = await spaceMembersCacheService.getByMetadata('spaceId', spaceId);
      
      for (const entry of entries) {
        await spaceMembersCacheService.invalidate(entry.key);
      }

      console.log(`[SpaceMembersService] Invalidated cache for space: ${spaceId}`);
    } catch (error) {
      console.error('[SpaceMembersService] Error invalidating space cache:', error);
    }
  }

  /**
   * Get service metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    return await spaceMembersCacheService.getStats();
  }

  /**
   * Clear all cached space members data
   */
  async clearCache(): Promise<void> {
    await spaceMembersCacheService.clear();
    console.log('[SpaceMembersService] Cleared all space members cache');
  }

  // Private helper methods

  /**
   * Execute the actual Supabase space_members query
   */
  private async executeSpaceMembersQuery(
    spaceId: string, 
    options: SpaceMemberOptions
  ): Promise<{ data: SpaceMember[] | null; error: any }> {
    const { userId, status, includeUser } = options;

    try {
      // Base select fields
      const baseFields = 'id, user_id, space_id, role, status, is_online, last_active_at, joined_at';
      const selectFields = includeUser 
        ? `${baseFields}, users!inner(id, full_name, profile_url)`
        : baseFields;

      let query = getSupabaseClient()
        .from('space_members')
        .select(selectFields)
        .eq('space_id', spaceId);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      if (status) {
        query = query.eq('status', status);
      }

      // Add ordering for consistent results
      query = query.order('joined_at', { ascending: false });

      const result = await query;
      
      // Ensure proper type conversion
      const typedData = result.data ? (result.data as unknown as SpaceMember[]) : null;
      
      return {
        data: typedData,
        error: result.error
      };

    } catch (error) {
      return {
        data: null,
        error: error
      };
    }
  }

  /**
   * Generate cache key for space members query
   */
  private generateCacheKey(spaceId: string, options: SpaceMemberOptions): string {
    const { userId, status, includeUser } = options;
    
    const keyParts = ['space_members', spaceId];
    
    if (userId) keyParts.push(`user_${userId}`);
    if (status) keyParts.push(`status_${status}`);
    if (includeUser) keyParts.push('with_user');
    
    return keyParts.join('_');
  }
}

// Export singleton instance
export const spaceMembersService = new SpaceMembersService(); 