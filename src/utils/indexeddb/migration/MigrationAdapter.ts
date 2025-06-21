/**
 * Migration Adapter
 * 
 * Provides a unified interface that switches between old and new IndexedDB systems
 * based on the USE_NEW_INDEXEDDB_SYSTEM feature flag
 */

import { SupabaseBridgeResult } from '../types';
import { FEATURE_FLAGS } from '../safetyMechanisms';

// Lazy imports to avoid circular dependencies
let legacyBridge: any = null;
let modernBridge: any = null;

/**
 * Lazy load the legacy bridge
 */
async function getLegacyBridge() {
  if (!legacyBridge) {
    const { supabaseIndexedDBBridge } = await import('../../supabaseIndexedDBBridge');
    legacyBridge = supabaseIndexedDBBridge;
  }
  return legacyBridge;
}

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
 */
function isRollbackActive(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('FORCE_LEGACY_INDEXEDDB') === 'true';
}

/**
 * Determine which system to use
 */
function shouldUseNewSystem(): boolean {
  // Check for active rollback first
  if (isRollbackActive()) {
    console.warn('[MigrationAdapter] Using legacy system due to active rollback');
    return false;
  }

  // Check feature flag
  return FEATURE_FLAGS.USE_NEW_INDEXEDDB_SYSTEM;
}

/**
 * Migration Adapter Class
 * 
 * Provides unified interface with automatic system switching
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
   * Get space members (unified interface)
   */
  async getSpaceMembers(
    spaceId: string, 
    options: {
      userId?: string;
      status?: string;
      forceNetwork?: boolean;
    } = {}
  ): Promise<SupabaseBridgeResult> {
    if (shouldUseNewSystem()) {
      const bridge = await getModernBridge();
      return await bridge.getSpaceMembers(spaceId, {
        userId: options.userId,
        status: options.status || 'active',
        forceNetwork: options.forceNetwork
      });
    } else {
      const bridge = await getLegacyBridge();
      return await bridge.getSpaceMembers(spaceId, options);
    }
  }

  /**
   * Get user profile (unified interface)
   */
  async getUserProfile(
    userId: string,
    fields: string[] = ['profile_url', 'full_name'],
    options: { forceNetwork?: boolean } = {}
  ): Promise<SupabaseBridgeResult> {
    if (shouldUseNewSystem()) {
      const bridge = await getModernBridge();
      return await bridge.getUserProfile(userId, {
        fields: fields.length > 0 ? fields : undefined,
        forceNetwork: options.forceNetwork
      });
    } else {
      const bridge = await getLegacyBridge();
      return await bridge.getUserProfile(userId, fields, options);
    }
  }

  /**
   * Get current user (unified interface)
   */
  async getCurrentUser(
    options: { forceNetwork?: boolean } = {}
  ): Promise<SupabaseBridgeResult> {
    if (shouldUseNewSystem()) {
      const bridge = await getModernBridge();
      return await bridge.getCurrentUser(options);
    } else {
      const bridge = await getLegacyBridge();
      return await bridge.getCurrentUser(options);
    }
  }

  /**
   * Get user conversations (unified interface)
   */
  async getUserConversations(
    userId: string,
    options: { forceNetwork?: boolean } = {}
  ): Promise<SupabaseBridgeResult> {
    if (shouldUseNewSystem()) {
      const bridge = await getModernBridge();
      return await bridge.getUserConversations(userId, options);
    } else {
      const bridge = await getLegacyBridge();
      return await bridge.getUserConversations(userId, options);
    }
  }

  /**
   * Update global presence (unified interface)
   */
  async updateGlobalPresence(
    userId: string,
    isOnline: boolean,
    options: { 
      forceNetwork?: boolean;
      spaceId?: string;
    } = {}
  ): Promise<SupabaseBridgeResult> {
    if (shouldUseNewSystem()) {
      const bridge = await getModernBridge();
      return await bridge.updateGlobalPresence(userId, isOnline, options);
    } else {
      const bridge = await getLegacyBridge();
      return await bridge.updateGlobalPresence(userId, isOnline, options);
    }
  }

  /**
   * Cleanup stale presence (unified interface)
   */
  async cleanupStalePresence(spaceId: string): Promise<SupabaseBridgeResult> {
    if (shouldUseNewSystem()) {
      const bridge = await getModernBridge();
      return await bridge.cleanupStalePresence(spaceId);
    } else {
      const bridge = await getLegacyBridge();
      return await bridge.cleanupStalePresence(spaceId);
    }
  }

  /**
   * Get metrics (unified interface)
   */
  async getMetrics(): Promise<any> {
    if (shouldUseNewSystem()) {
      const bridge = await getModernBridge();
      return await bridge.getMetrics();
    } else {
      const bridge = await getLegacyBridge();
      return bridge.getMetrics();
    }
  }

  /**
   * Clear cache (unified interface)
   */
  async clearCache(): Promise<void> {
    if (shouldUseNewSystem()) {
      const bridge = await getModernBridge();
      return await bridge.clearCache();
    } else {
      const bridge = await getLegacyBridge();
      return await bridge.clearCache();
    }
  }

  /**
   * Test mobile blocking detection (unified interface)
   */
  async testMobileBlockingDetection(): Promise<any> {
    if (shouldUseNewSystem()) {
      const bridge = await getModernBridge();
      return bridge.testMobileBlockingDetection();
    } else {
      const bridge = await getLegacyBridge();
      return bridge.testMobileBlockingDetection();
    }
  }

  /**
   * Get cache status (unified interface)
   */
  async getCacheStatus(spaceId: string): Promise<any> {
    if (shouldUseNewSystem()) {
      const bridge = await getModernBridge();
      return await bridge.invalidateSpaceCache(spaceId);
    } else {
      const bridge = await getLegacyBridge();
      return await bridge.getCacheStatus(spaceId);
    }
  }

  /**
   * Check which system is currently active
   */
  getCurrentSystem(): 'legacy' | 'modern' {
    return shouldUseNewSystem() ? 'modern' : 'legacy';
  }

  /**
   * Get system status and health
   */
  async getSystemStatus(): Promise<{
    currentSystem: 'legacy' | 'modern';
    featureFlag: boolean;
    rollbackActive: boolean;
    health: any;
  }> {
    const currentSystem = this.getCurrentSystem();
    
    let health: any = { status: 'unknown' };
    try {
      if (currentSystem === 'modern') {
        const bridge = await getModernBridge();
        health = await bridge.checkHealth();
      } else {
        const bridge = await getLegacyBridge();
        health = await bridge.testChatSystemHealth();
      }
    } catch (error) {
      health = { 
        status: 'unhealthy', 
        error: error instanceof Error ? error.message : String(error) 
      };
    }

    return {
      currentSystem,
      featureFlag: FEATURE_FLAGS.USE_NEW_INDEXEDDB_SYSTEM,
      rollbackActive: isRollbackActive(),
      health
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
    testMobileBlocking: () => migrationAdapter.testMobileBlockingDetection()
  };

  console.log('[MigrationAdapter] Global interface available at window.migrationAdapter');
} 