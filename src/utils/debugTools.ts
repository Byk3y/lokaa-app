import { log } from '@/utils/logger';
/**
 * Legacy Debug Tools - Deprecated
 * 
 * These functions have been migrated to the centralized debug services.
 * This file serves as a backward-compatibility layer.
 * 
 * @deprecated Use @/shared/services/debug for new code
 */

import { env } from '@/core/config/env';
import { spaceAccessDebugger } from '@/shared/services/debug/space-access-debug';

/**
 * @deprecated Use spaceAccessDebugger.debugUserSpaceAccess() from @/shared/services/debug instead
 */
export async function debugUserSpaceAccess(userId: string) {
  log.warn('Utils', 'debugUserSpaceAccess is deprecated. Use spaceAccessDebugger.debugUserSpaceAccess() from @/shared/services/debug instead.');
  
  if (!env.isDevelopment) {
    log.warn('Utils', 'Debug functions are only available in development mode');
    return null;
  }
  
  return await spaceAccessDebugger.debugUserSpaceAccess(userId);
}

/**
 * @deprecated Use spaceAccessDebugger.checkSpaceAccessForUser() from @/shared/services/debug instead
 */
export async function checkSpaceAccessForUser(userId: string, spaceSubdomain: string) {
  log.warn('Utils', 'checkSpaceAccessForUser is deprecated. Use spaceAccessDebugger.checkSpaceAccessForUser() from @/shared/services/debug instead.');
  
  if (!env.isDevelopment) {
    log.warn('Utils', 'Debug functions are only available in development mode');
    return { success: false, error: 'Not available in production' };
  }
  
  return await spaceAccessDebugger.checkSpaceAccessForUser(userId, spaceSubdomain);
}

// Export for compatibility, but mark as deprecated
export default {
  debugUserSpaceAccess,
  checkSpaceAccessForUser
}; 