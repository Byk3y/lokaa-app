// BACKWARD COMPATIBILITY LAYER
// This file maintains the original API while delegating to the new focused database services
// Located at: src/shared/services/database/

import type { MemberRole } from '@/contexts/MembershipContext';

// Import from new focused services
import {
  diagnoseSpacesTable,
  createMinimalSpace,
  addUserToSpace,
  isSubdomainAvailable,
  type SchemaValidationResult,
  type SpaceCreationResult,
  type MembershipResult,
  type SpaceValidationResult
} from '@/shared/services/database';

// Import slug utilities from shared utils
import { generateSlug } from '@/shared/utils/slug-generator';

// Re-export the original functions for backward compatibility
export {
  diagnoseSpacesTable,
  createMinimalSpace,
  addUserToSpace,
  isSubdomainAvailable,
  generateSlug
};

// Re-export types for backward compatibility
export type {
  SchemaValidationResult,
  SpaceCreationResult,
  MembershipResult,
  SpaceValidationResult
};

/**
 * MIGRATION NOTICE
 * 
 * This file has been reorganized as part of Phase 4C.
 * The original functions have been moved to focused services:
 * 
 * - diagnoseSpacesTable → src/shared/services/database/schema-validation.ts
 * - createMinimalSpace → src/shared/services/database/space-creation.ts  
 * - addUserToSpace → src/shared/services/database/membership-management.ts
 * - isSubdomainAvailable → src/shared/services/database/space-validation.ts
 * - generateSlug → src/shared/utils/slug-generator.ts
 * 
 * This file now serves as a backward compatibility layer.
 * New code should import directly from the focused services.
 * 
 * Example:
 * // Old way (still works)
 * import { diagnoseSpacesTable } from '@/utils/databaseUtils';
 * 
 * // New way (recommended)
 * import { diagnoseSpacesTable } from '@/shared/services/database';
 */ 