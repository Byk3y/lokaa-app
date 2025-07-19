import { log } from '@/utils/logger';
/**
 * Presence Service
 * 
 * Specialized service for handling user presence tracking with mobile-safe operations
 * Handles global presence updates and space-specific presence management
 */

import { getSupabaseClient } from '@/integrations/supabase/client';
import { SupabaseBridgeResult, CacheOptions } from '../types';
import { mobileBrowserService } from '../core/MobileBrowserService';
import { spaceMembersCacheService } from '../core/CacheService';

export interface PresenceUpdate {
  userId: string;
  isOnline: boolean;
  spaceId?: string;
  timestamp: string;
  lastActiveAt: string;
}

export interface PresenceOptions {
  forceNetwork?: boolean;
  spaceId?: string;
  skipMobileProtection?: boolean;
}

export interface SpacePresenceData {
  spaceId: string;
  onlineCount: number;
  totalMembers: number;
  onlineMembers: {
    userId: string;
    lastActiveAt: string;
    role: string;
  }[];
  lastUpdated: string;
}

/**
 * Presence Service
 * 
 * Handles all user presence operations with mobile-safe protection
 */
export class PresenceService {
  private metrics = {
    totalRequests: 0,
    successfulUpdates: 0,
    failedUpdates: 0,
    mobileSkipped: 0,
    networkRequests: 0,
    errors: 0
  };

  private pendingUpdates = new Map<string, PresenceUpdate>();

  /**
   * Update global user presence - CRITICAL METHOD for presence system
   * 
   * This handles the main presence tracking functionality
   */
  async updateGlobalPresence(
    userId: string,
    isOnline: boolean,
    options: PresenceOptions = {}
  ): Promise<SupabaseBridgeResult<null>> {
    this.metrics.totalRequests++;
    
    const { forceNetwork = false, spaceId, skipMobileProtection = false } = options;
    
    log.debug('Utils', '[PresenceService] Global presence update request', { 
      userId, 
      isOnline, 
      spaceId,
      forceNetwork 
    });

    try {
      // Only skip presence updates in extreme mobile blocking cases
      // Unlike read operations, presence updates are critical for user experience
      const shouldSkipNetwork = !forceNetwork && !skipMobileProtection && 
        mobileBrowserService.shouldUseCacheFirst() && 
        this.isRecentMobileBackgroundActivity();

      if (shouldSkipNetwork) {
        log.debug('Utils', '[PresenceService] Skipping network call due to mobile blocking, caching intent');
        this.metrics.mobileSkipped++;
        
        // Store presence intention for later sync
        await this.storePendingPresenceUpdate(userId, isOnline, spaceId);
        
        return { 
          data: null, 
          error: null, 
          fromCache: true, 
          reason: 'mobile_blocking_deferred' 
        };
      }

      // Execute presence update
      const result = await this.executePresenceUpdateQuery(userId, isOnline, spaceId);
      
      if (result.error) {
        this.metrics.failedUpdates++;
        log.warn('Utils', '[PresenceService] Presence update failed:', result.error);
        
        // Store as pending for retry
        await this.storePendingPresenceUpdate(userId, isOnline, spaceId);
        
        return result;
      }

      this.metrics.successfulUpdates++;
      log.debug('Utils', '[PresenceService] Presence update successful');
      
      // CRITICAL: Invalidate member counts cache to refresh UI
      if (spaceId) {
        await this.invalidateMemberCountsCache(spaceId);
      }
      
      return { data: null, error: null, fromCache: false };

    } catch (error: any) {
      this.metrics.errors++;
      log.error('Utils', '[PresenceService] Exception in updateGlobalPresence:', error);
      
      // Store as pending for retry
      if (spaceId) {
        await this.storePendingPresenceUpdate(userId, isOnline, spaceId);
      }
      
      return { 
        data: null, 
        error: error, 
        fromCache: false 
      };
    }
  }

  /**
   * Cleanup stale presence data - remove users who haven't been active for more than 5 minutes
   */
  async cleanupStalePresence(spaceId: string): Promise<SupabaseBridgeResult<any>> {
    this.metrics.totalRequests++;
    
    try {
      log.debug('Utils', '[PresenceService] Cleaning up stale presence for space', spaceId);
      
      // Remove users who haven't been active in last 5 minutes
      const { data, error } = await getSupabaseClient()
        .from('presence')
        .delete()
        .eq('space_id', spaceId)
        .lte('online_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

      if (error) {
        log.error('Utils', '[PresenceService] Error cleaning stale presence:', error);
        this.metrics.errors++;
        return { data: null, error };
      }

      log.debug('Utils', '[PresenceService] Stale presence cleanup completed', { spaceId, affectedRows: data });
      this.metrics.successfulUpdates++;
      
      return { data, error: null };
    } catch (error) {
      log.error('Utils', '[PresenceService] Exception in cleanupStalePresence:', error);
      this.metrics.errors++;
      return { 
        data: null, 
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * Get online members with time-based validation
   */
  async getOnlineMembersWithTimeValidation(spaceId: string): Promise<SupabaseBridgeResult<any[]>> {
    this.metrics.totalRequests++;
    
    try {
      // First cleanup stale presence
      await this.cleanupStalePresence(spaceId);
      
      // Then get current online members from presence table joined with space_members for role info
      const { data, error } = await getSupabaseClient()
        .from('presence')
        .select(`
          user_id,
          online_at,
          space_members!inner(
            role,
            users!inner(full_name, profile_url)
          )
        `)
        .eq('space_id', spaceId)
        .eq('space_members.status', 'active')
        .gte('online_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

      if (error) {
        log.error('Utils', '[PresenceService] Error fetching time-validated online members:', error);
        this.metrics.errors++;
        return { data: [], error };
      }

      // Transform data to match expected format
      const transformedData = data?.map((member: any) => ({
        user_id: member.user_id,
        last_active_at: member.online_at,
        role: member.space_members?.role,
        users: member.space_members?.users
      })) || [];

      log.debug('Utils', `[PresenceService] Time-validated online members for ${spaceId}:`, transformedData.length);
      this.metrics.networkRequests++;
      
      return { data: transformedData, error: null };
    } catch (error) {
      log.error('Utils', '[PresenceService] Exception in getOnlineMembersWithTimeValidation:', error);
      this.metrics.errors++;
      return { 
        data: [], 
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * Get space presence statistics
   */
  async getSpacePresenceStats(spaceId: string): Promise<SupabaseBridgeResult<SpacePresenceData>> {
    this.metrics.totalRequests++;
    
    try {
      // First cleanup stale presence
      await this.cleanupStalePresence(spaceId);
      
      // Get online members count and details
      const onlineResult = await this.getOnlineMembersWithTimeValidation(spaceId);
      if (onlineResult.error) {
        throw onlineResult.error;
      }

      // Get total members count
      const { data: totalData, error: totalError } = await getSupabaseClient()
        .from('space_members')
        .select('user_id', { count: 'exact' })
        .eq('space_id', spaceId)
        .eq('status', 'active');

      if (totalError) {
        throw totalError;
      }

      const onlineMembers = onlineResult.data || [];
      const totalCount = totalData?.length || 0;

      const presenceData: SpacePresenceData = {
        spaceId,
        onlineCount: onlineMembers.length,
        totalMembers: totalCount,
        onlineMembers: onlineMembers.map((member: any) => ({
          userId: member.user_id,
          lastActiveAt: member.last_active_at,
          role: member.role
        })),
        lastUpdated: new Date().toISOString()
      };

      this.metrics.networkRequests++;
      return { data: presenceData, error: null };
      
    } catch (error) {
      log.error('Utils', '[PresenceService] Error getting space presence stats:', error);
      this.metrics.errors++;
      return { 
        data: null as any, 
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * Sync pending presence updates (for when mobile blocking is resolved)
   */
  async syncPendingUpdates(): Promise<SupabaseBridgeResult<{ synced: number; failed: number }>> {
    const pendingCount = this.pendingUpdates.size;
    
    if (pendingCount === 0) {
      return { 
        data: { synced: 0, failed: 0 }, 
        error: null 
      };
    }

    log.debug('Utils', `[PresenceService] Syncing ${pendingCount} pending presence updates`);
    
    let synced = 0;
    let failed = 0;

    const updatePromises = Array.from(this.pendingUpdates.entries()).map(async ([userId, update]) => {
      try {
        const result = await this.executePresenceUpdateQuery(
          update.userId,
          update.isOnline,
          update.spaceId
        );
        
        if (result.error) {
          failed++;
          log.warn('Utils', `[PresenceService] Failed to sync presence for user ${userId}:`, result.error);
        } else {
          synced++;
          this.pendingUpdates.delete(userId);
        }
      } catch (error) {
        failed++;
        log.error('Utils', `[PresenceService] Exception syncing presence for user ${userId}:`, error);
      }
    });

    await Promise.all(updatePromises);

    log.debug('Utils', `[PresenceService] Sync completed: ${synced} synced, ${failed} failed`);
    
    return { 
      data: { synced, failed }, 
      error: null 
    };
  }

  /**
   * Get pending updates count
   */
  getPendingUpdatesCount(): number {
    return this.pendingUpdates.size;
  }

  /**
   * Clear all pending updates
   */
  clearPendingUpdates(): void {
    this.pendingUpdates.clear();
    log.debug('Utils', '[PresenceService] Cleared all pending presence updates');
  }

  /**
   * Get service metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Get cache statistics (presence doesn't use traditional caching)
   */
  async getCacheStats() {
    return {
      totalEntries: this.pendingUpdates.size,
      totalSize: JSON.stringify([...this.pendingUpdates.entries()]).length,
      hitRate: 0,
      missRate: 0,
      averageAge: 0,
      oldestEntry: 0,
      newestEntry: 0
    };
  }

  /**
   * Clear all cached presence data
   */
  async clearCache(): Promise<void> {
    this.clearPendingUpdates();
    log.debug('Utils', '[PresenceService] Cleared all presence cache');
  }

  // Private helper methods

  /**
   * Execute presence update query against Supabase using new presence table
   */
  private async executePresenceUpdateQuery(
    userId: string, 
    isOnline: boolean, 
    spaceId?: string
  ): Promise<{ data: any; error: any }> {
    try {
      if (isOnline && spaceId) {
        // When going online in a specific space:
        // 1. Remove presence from other spaces
        // 2. Upsert presence for current space
        
        // First, remove from all other spaces
        await getSupabaseClient()
          .from('presence')
          .delete()
          .eq('user_id', userId)
          .neq('space_id', spaceId);
        
        // Then upsert for current space
        const { error } = await getSupabaseClient()
          .from('presence')
          .upsert({
            user_id: userId,
            space_id: spaceId,
            online_at: new Date().toISOString(),
            metadata: { timestamp: new Date().toISOString() }
          }, {
            onConflict: 'user_id,space_id'
          });
          
        return { data: null, error };
        
      } else if (!isOnline) {
        // When going offline, remove from all spaces
        const { error } = await getSupabaseClient()
          .from('presence')
          .delete()
          .eq('user_id', userId);
          
        return { data: null, error };
        
      } else {
        // If no specific space provided but user is online, just update timestamp if exists
        const { error } = await getSupabaseClient()
          .from('presence')
          .update({
            online_at: new Date().toISOString(),
            metadata: { timestamp: new Date().toISOString() }
          })
          .eq('user_id', userId);

        return { data: null, error };
      }
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Check if there's recent mobile background activity that would indicate
   * potential blocking issues
   */
  private isRecentMobileBackgroundActivity(): boolean {
    try {
      // Check if mobile browser service indicates recent background activity
      const debugInfo = mobileBrowserService.getDebugInfo();
      
      // Only consider it "recent" if background activity happened in last 10 seconds
      if (debugInfo.lastVisibilityChange) {
        const timeSinceBackground = Date.now() - debugInfo.lastVisibilityChange;
        return timeSinceBackground < 10000; // 10 seconds
      }
      
      // Also check if mobile background state is currently active
      return debugInfo.mobileBackgroundState;
      
    } catch (error) {
      log.warn('Utils', '[PresenceService] Error checking mobile background activity:', error);
      return false;
    }
  }

  /**
   * Store pending presence update for later sync
   */
  private async storePendingPresenceUpdate(
    userId: string,
    isOnline: boolean,
    spaceId?: string
  ): Promise<void> {
    try {
      // Store in cache service for later retry
      const pendingUpdate = {
        userId,
        isOnline,
        spaceId,
        timestamp: new Date().toISOString(),
        lastActiveAt: new Date().toISOString()
      };
      
      // Store with a shorter TTL for pending updates
      const cacheKey = `pending_presence_${userId}_${spaceId || 'global'}`;
      await spaceMembersCacheService.set(cacheKey, pendingUpdate, { ttl: 300000 }); // 5 minutes
      
      log.debug('Utils', '[PresenceService] Stored pending presence update for later sync');
    } catch (error) {
      log.warn('Utils', '[PresenceService] Failed to store pending presence update:', error);
    }
  }

  /**
   * Invalidate member counts cache to refresh UI after presence update
   */
  private async invalidateMemberCountsCache(spaceId: string): Promise<void> {
    try {
      // Invalidate space-specific cache entries
      const cacheKeysToInvalidate = [
        `space_members_${spaceId}_status_active`,
        `member_counts_${spaceId}`,
        `online_members_${spaceId}`,
        `space_members_cache_${spaceId}`
      ];
      
      for (const key of cacheKeysToInvalidate) {
        try {
          await spaceMembersCacheService.invalidate(key);
        } catch (error) {
          // Continue with other keys if one fails
          log.warn('Utils', `[PresenceService] Failed to invalidate cache key ${key}:`, error);
        }
      }
      
      // Trigger a custom event to notify UI components to refresh
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('presence-updated', {
          detail: { spaceId, timestamp: Date.now() }
        }));
      }
      
      log.debug('Utils', '[PresenceService] Invalidated member counts cache for space:', spaceId);
    } catch (error) {
      log.warn('Utils', '[PresenceService] Failed to invalidate member counts cache:', error);
    }
  }
}

// Export singleton instance
export const presenceService = new PresenceService(); 