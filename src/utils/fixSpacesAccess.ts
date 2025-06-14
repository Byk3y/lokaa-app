/**
 * Legacy Space Access Utilities - Compatibility Layer
 * 
 * This file has been migrated to the shared database services.
 * This serves as a backward-compatibility layer for existing imports.
 * 
 * @deprecated Use @/shared/services/database for new code
 */

import { env } from "@/core/config/env";
import {
  createSpaceAccess,
  diagnoseSpaceAccess,
  checkCurrentSpaceAccess as dbCheckCurrentSpaceAccess,
  directSpaceAccessCheck as dbDirectSpaceAccessCheck,
  type CheckAccessResult,
  type DirectCheckResult
} from '@/shared/services/database';

// Extend Window interface for debugging tools
declare global {
  interface Window {
    fixSpacesAccess?: {
      fixSpaceAccess: typeof fixSpaceAccess;
      fixSpaceAccessBySubdomain: typeof fixSpaceAccessBySubdomain;
      diagnoseSpaceAccess: typeof diagnoseSpaceAccess;
      checkCurrentSpaceAccess: typeof checkCurrentSpaceAccess;
      directSpaceAccessCheck: typeof directSpaceAccessCheck;
    };
  }
}

// Re-export types for backward compatibility
export type { CheckAccessResult, DirectCheckResult };

// Re-export functions with original signatures
export const checkCurrentSpaceAccess = dbCheckCurrentSpaceAccess;
export const directSpaceAccessCheck = dbDirectSpaceAccessCheck;

/**
 * @deprecated Use createSpaceAccess from @/shared/services/database instead
 */
export async function fixSpaceAccess(spaceId: string): Promise<boolean> {
  console.warn('fixSpaceAccess is deprecated. Use createSpaceAccess from @/shared/services/database instead.');
  const result = await createSpaceAccess(spaceId);
  return result.success;
}

/**
 * @deprecated Use diagnoseSpaceAccess from @/shared/services/database instead
 */
export async function fixSpaceAccessBySubdomain(subdomain: string): Promise<boolean> {
  console.warn('fixSpaceAccessBySubdomain is deprecated. Use diagnoseSpaceAccess from @/shared/services/database instead.');
  const result = await diagnoseSpaceAccess(subdomain);
  return result.success;
}

// Environment-gated debug window exposure (development mode only)
if (env.isDevelopment && typeof window !== 'undefined') {
  window.fixSpacesAccess = {
    fixSpaceAccess,
    fixSpaceAccessBySubdomain,
    diagnoseSpaceAccess,
    checkCurrentSpaceAccess,
    directSpaceAccessCheck
  };
} 