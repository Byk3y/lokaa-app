/**
 * Legacy Space Debug Utils - Deprecated
 * 
 * These functions have been migrated to the centralized debug services.
 * This file serves as a backward-compatibility layer.
 * 
 * @deprecated Use @/shared/services/debug for new code
 */

import { env } from '@/core/config/env';
import { spaceAccessDebugger } from '@/shared/services/debug/space-access-debug';

/**
 * @deprecated Use spaceAccessDebugger.debugSpacePermissions() from @/shared/services/debug instead
 */
export async function debugSpacePermissions(userId: string, spaceId: string) {
  console.warn('debugSpacePermissions is deprecated. Use spaceAccessDebugger.debugSpacePermissions() from @/shared/services/debug instead.');
  
  if (!env.isDevelopment) {
    console.warn('Debug functions are only available in development mode');
    return {
      userId,
      spaceId,
      isOwner: false,
      isAdmin: false,
      isMember: false,
      canCreateContent: false,
      canEditSpace: false,
      canManageMembers: false,
      canAccessSettings: false,
      databaseChecks: {
        spaceExists: false,
        ownerCheck: null,
        membershipCheck: null,
        accessRecord: null,
        rls: { postsTable: null }
      },
      errors: ['Debug functions are only available in development mode']
    };
  }
  
  return await spaceAccessDebugger.debugSpacePermissions(userId, spaceId);
}

// Export for compatibility, but mark as deprecated
export default {
  debugSpacePermissions
}; 