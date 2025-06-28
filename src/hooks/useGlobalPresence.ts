/**
 * Global Presence Hook - PHASE 3D Migration
 */

import { migrationAdapter } from '@/utils/indexeddb/migration/MigrationAdapter';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

/**
 * Hook for managing global user presence with mobile-safe operations
 */
export function useGlobalPresence() {
  const { user } = useOptimizedAuth();

  /**
   * Update user presence globally with space-specific tracking
   */
  const updateGlobalPresence = async (
    isOnline: boolean, 
    spaceId?: string, 
    options: { forceNetwork?: boolean } = {}
  ) => {
    if (!user?.id) return;

    try {
      // PHASE 3D: Use MigrationAdapter for seamless system switching
      await migrationAdapter.updateGlobalPresence(user.id, isOnline, {
        spaceId,
        forceNetwork: options.forceNetwork
      });
    } catch (error) {
      console.error('[useGlobalPresence] Error updating presence:', error);
    }
  };

  return {
    updateGlobalPresence
  };
} 