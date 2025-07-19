import { log } from '@/utils/logger';
/**
 * Legacy Space Access Fix Utility - Re-export Layer
 * 
 * This file has been migrated to TypeScript and moved to the shared debug services.
 * This file now serves as a backward-compatibility layer.
 * 
 * @deprecated Use @/shared/services/debug/space-access-debug instead
 */

import { env } from '@/core/config/env';
import { spaceAccessDebugger } from '@/shared/services/debug/space-access-debug';

// Only provide debug utilities in development mode
const spaceAccessFix = {
  supabase: null,
  
  init: function(supabaseClient) {
    if (!env.isDevelopment) {
      log.warn('Utils', 'Space access fix utility is only available in development mode');
      return this;
    }
    
    // Initialize the new TypeScript debugger
    spaceAccessDebugger.init(supabaseClient);
    this.supabase = supabaseClient;
    return this;
  },
  
  // Legacy method - redirects to new service
  checkAccess: async function(spaceSubdomain) {
    if (!env.isDevelopment) {
      log.warn('Utils', 'Debug functions are only available in development mode');
      return { success: false, error: 'Not available in production' };
    }
    
    log.warn('Utils', 'checkAccess is deprecated. Use spaceAccessDebugger.clientSideCheck() instead.');
    return await spaceAccessDebugger.clientSideCheck(spaceSubdomain);
  },
  
  // Legacy method - redirects to new service
  checkUserAccess: async function(userId, spaceSubdomain) {
    if (!env.isDevelopment) {
      log.warn('Utils', 'Debug functions are only available in development mode');
      return { success: false, error: 'Not available in production' };
    }
    
    log.warn('Utils', 'checkUserAccess is deprecated. Use spaceAccessDebugger.clientSideCheck() instead.');
    return await spaceAccessDebugger.clientSideCheck(spaceSubdomain);
  },
  
  // Legacy method - redirects to new service
  clientSideCheck: async function(spaceSubdomain) {
    if (!env.isDevelopment) {
      log.warn('Utils', 'Debug functions are only available in development mode');
      return { success: false, error: 'Not available in production' };
    }
    
    return await spaceAccessDebugger.clientSideCheck(spaceSubdomain);
  },
  
  // Legacy method - redirects to new service
  fixAccess: async function(spaceSubdomain) {
    if (!env.isDevelopment) {
      log.warn('Utils', 'Debug functions are only available in development mode');
      return { success: false, error: 'Not available in production' };
    }
    
    return await spaceAccessDebugger.fixAccess(spaceSubdomain);
  },
  
  // Deprecated method
  createAccessRecord: async function(userId, spaceId) {
    log.warn('Utils', 'createAccessRecord is disabled due to space_members migration.');
    return { success: false, error: 'Function disabled due to space_members migration.' };
  }
};

// Only expose to window in development mode
if (env.isDevelopment && typeof window !== 'undefined') {
  window.spaceAccessFix = spaceAccessFix;
}

export default spaceAccessFix; 