/**
 * Legacy Profile Fix Utility - Re-export Layer
 * 
 * This file has been migrated to TypeScript and moved to the shared debug services.
 * This file now serves as a backward-compatibility layer.
 * 
 * @deprecated Use @/shared/services/debug/profile-redirect instead
 */

import { env } from '@/core/config/env';
import { 
  shouldAllowProfileRedirect as shouldAllowProfileRedirectNew,
  resetProfileRedirectCounter as resetProfileRedirectCounterNew,
  getProfileRedirectCount as getProfileRedirectCountNew,
  profileRedirectDebugger
} from '@/shared/services/debug/profile-redirect';

// Log to make it easier to debug
console.log('📋 Profile redirect fix utility loaded (legacy layer)');

/**
 * Check if we should allow another redirect to prevent infinite loops
 * @param {string} slug - The profile slug we're redirecting to
 * @returns {boolean} - True if redirect should be allowed, false otherwise
 */
export function shouldAllowProfileRedirect(slug) {
  return shouldAllowProfileRedirectNew(slug);
}

/**
 * Reset the redirect counter (useful when navigation is triggered by user)
 */
export function resetProfileRedirectCounter() {
  return resetProfileRedirectCounterNew();
}

/**
 * Get the current redirect count
 * @returns {number} - Current redirect count
 */
export function getProfileRedirectCount() {
  return getProfileRedirectCountNew();
}

// Only expose to window in development mode
if (env.isDevelopment && typeof window !== 'undefined') {
  window.profileRedirectFix = {
    shouldAllowProfileRedirect,
    resetProfileRedirectCounter,
    getProfileRedirectCount,
    _debug: {
      get counter() { 
        return profileRedirectDebugger.getProfileRedirectCount(); 
      },
      get lastSlug() { 
        return profileRedirectDebugger.getDebugInfo().lastSlug; 
      },
      get hasWarned() { 
        return profileRedirectDebugger.getDebugInfo().hasWarned; 
      }
    }
  };
}

export default {
  shouldAllowProfileRedirect,
  resetProfileRedirectCounter,
  getProfileRedirectCount
};
