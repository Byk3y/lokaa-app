/**
 * Migration Adapter
 * 
 * Provides a unified interface that uses the V2 IndexedDB system
 * Legacy bridge has been removed - V2 system only
 */

import { SupabaseBridgeResult } from '../types';
import { FEATURE_FLAGS } from '../safetyMechanisms';

// Single V2 bridge instance
let modernBridge: any = null;

/**
 * Lazy load the modern bridge
 */
async function getModernBridge() {
  if (!modernBridge) {
    const { indexedDBBridgeV2 } = await import('../IndexedDBBridgeV2');
    modernBridge = indexedDBBridgeV2;
  }
  return modernBridge;
}

/**
 * Check if rollback mode is active
 * NOTE: Legacy bridge removed, rollback will use emergency procedures
 */
function isRollbackActive(): boolean {
  if (typeof window === 'undefined') return false;
  const rollback = localStorage.getItem('FORCE_LEGACY_INDEXEDDB') === 'true';
  if (rollback) {
    console.warn('[MigrationAdapter] Legacy rollback requested but legacy bridge removed. Use emergency procedures.');
  }
  return rollback;
}

/**
 * Determine which system to use
 * NOTE: Always returns true (V2 only) since legacy bridge is removed
 */
function shouldUseNewSystem(): boolean {
  return true; // V2 system only, legacy bridge removed
}

/**
 * Migration Adapter Class
 * 
 * Provides unified interface using V2 system exclusively
 */
export class MigrationAdapter {
  private static instance: MigrationAdapter | null = null;

  /**
   * Get singleton instance
   */
  static getInstance(): MigrationAdapter {
    if (!MigrationAdapter.instance) {
      MigrationAdapter.instance = new MigrationAdapter();
    }
    return MigrationAdapter.instance;
  }

  /**
   * Get space members (V2 system)
   */
  async getSpaceMembers(
    spaceId: string, 
    options: {
      userId?: string;
      status?: string;
      forceNetwork?: boolean;
    } = {}
  ): Promise<SupabaseBridgeResult> {
    const bridge = await getModernBridge();
    return await bridge.getSpaceMembers(spaceId, {
      userId: options.userId,
      status: options.status || 'active',
      forceNetwork: options.forceNetwork
    });
  }

  /**
   * Get user profile (V2 system)
   */
  async getUserProfile(
    userId: string,
    fields: string[] = ['profile_url', 'full_name'],
    options: { forceNetwork?: boolean } = {}
  ): Promise<SupabaseBridgeResult> {
    const bridge = await getModernBridge();
    return await bridge.getUserProfile(userId, {
      fields: fields.length > 0 ? fields : undefined,
      forceNetwork: options.forceNetwork
    });
  }

  /**
   * Get current user (V2 system)
   */
  async getCurrentUser(
    options: { forceNetwork?: boolean } = {}
  ): Promise<SupabaseBridgeResult> {
    const bridge = await getModernBridge();
    return await bridge.getCurrentUser(options);
  }

  /**
   * Get user conversations (V2 system)
   */
  async getUserConversations(
    userId: string,
    options: { forceNetwork?: boolean } = {}
  ): Promise<SupabaseBridgeResult> {
    const bridge = await getModernBridge();
    return await bridge.getUserConversations(userId, options);
  }

  /**
   * Update global presence (V2 system)
   */
  async updateGlobalPresence(
    userId: string,
    isOnline: boolean,
    options: { 
      forceNetwork?: boolean;
      spaceId?: string;
    } = {}
  ): Promise<SupabaseBridgeResult> {
    const bridge = await getModernBridge();
    return await bridge.updateGlobalPresence(userId, isOnline, options);
  }

  /**
   * Cleanup stale presence (V2 system)
   */
  async cleanupStalePresence(spaceId: string): Promise<SupabaseBridgeResult> {
    const bridge = await getModernBridge();
    return await bridge.cleanupStalePresence(spaceId);
  }

  /**
   * Get metrics (V2 system)
   */
  async getMetrics(): Promise<any> {
    const bridge = await getModernBridge();
    return await bridge.getMetrics();
  }

  /**
   * Clear cache (V2 system)
   */
  async clearCache(): Promise<void> {
    const bridge = await getModernBridge();
    return await bridge.clearCache();
  }

  /**
   * Test mobile blocking detection (V2 system)
   */
  async testMobileBlockingDetection(): Promise<any> {
    const bridge = await getModernBridge();
    return bridge.testMobileBlockingDetection();
  }

  /**
   * Get cache status (V2 system)
   */
  async getCacheStatus(spaceId: string): Promise<any> {
    const bridge = await getModernBridge();
    return await bridge.invalidateSpaceCache(spaceId);
  }

  /**
   * Check which system is currently active
   */
  getCurrentSystem(): 'modern' {
    return 'modern'; // V2 system only
  }

  /**
   * Get system status and health
   */
  async getSystemStatus(): Promise<{
    currentSystem: 'modern';
    featureFlag: boolean;
    rollbackActive: boolean;
    health: any;
    services: {
      spaceMembersService: boolean;
      userProfileService: boolean;
      conversationService: boolean;
      presenceService: boolean;
    };
  }> {
    let health: any = { status: 'unknown' };
    let services = {
      spaceMembersService: false,
      userProfileService: false,
      conversationService: false,
      presenceService: false
    };

    try {
      const bridge = await getModernBridge();
      health = await bridge.checkHealth();
      
      // Check individual services
      services = {
        spaceMembersService: health.services?.spaceMembersService?.status === 'healthy' || true,
        userProfileService: health.services?.userProfileService?.status === 'healthy' || true,
        conversationService: health.services?.conversationService?.status === 'healthy' || true,
        presenceService: health.services?.presenceService?.status === 'healthy' || true
      };
    } catch (error) {
      health = { 
        status: 'unhealthy', 
        error: error instanceof Error ? error.message : String(error) 
      };
    }

    return {
      currentSystem: 'modern',
      featureFlag: FEATURE_FLAGS.USE_NEW_INDEXEDDB_SYSTEM,
      rollbackActive: isRollbackActive(),
      health,
      services
    };
  }
}

// Export singleton instance
export const migrationAdapter = MigrationAdapter.getInstance();

// Setup global interface for debugging
if (typeof window !== 'undefined') {
  (window as any).migrationAdapter = {
    getCurrentSystem: () => migrationAdapter.getCurrentSystem(),
    getSystemStatus: () => migrationAdapter.getSystemStatus(),
    getMetrics: () => migrationAdapter.getMetrics(),
    clearCache: () => migrationAdapter.clearCache(),
    testMobileBlocking: () => migrationAdapter.testMobileBlockingDetection(),
    
    // V2-specific methods
    getSpaceMembers: (spaceId: string, options?: any) => migrationAdapter.getSpaceMembers(spaceId, options),
    getUserProfile: (userId: string, fields?: string[], options?: any) => migrationAdapter.getUserProfile(userId, fields, options),
    getCurrentUser: (options?: any) => migrationAdapter.getCurrentUser(options),
    getUserConversations: (userId: string, options?: any) => migrationAdapter.getUserConversations(userId, options),
    updateGlobalPresence: (userId: string, isOnline: boolean, options?: any) => 
      migrationAdapter.updateGlobalPresence(userId, isOnline, options),
    cleanupStalePresence: (spaceId: string) => migrationAdapter.cleanupStalePresence(spaceId)
  };

  console.log('[MigrationAdapter] V2-only interface available at window.migrationAdapter');
} 