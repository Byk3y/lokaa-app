// Database Services - Centralized database operations
// Extracted from monolithic utils for better organization and maintainability

// Schema validation services
export {
  diagnoseSpacesTable,
  validateSpaceTableColumns,
  type SchemaValidationResult
} from './schema-validation';

// Space creation services  
export {
  createMinimalSpace,
  createSpace,
  validateSpaceCreationParams,
  type SpaceCreationResult
} from './space-creation';

// Membership management services
export {
  addUserToSpace,
  removeUserFromSpace,
  updateUserRole,
  getSpaceMembers,
  type MembershipResult,
  type SpaceMemberData,
  type SpaceAccessData
} from './membership-management';

// Space access recovery services
export {
  createSpaceAccess,
  createSpaceMembership,
  removeSpaceAccess,
  removeSpaceMembership,
  updateMembershipStatus,
  validateSpace,
  checkCurrentSpaceAccess,
  directSpaceAccessCheck,
  diagnoseSpaceAccess,
  type AccessRecoveryResult,
  type CheckAccessResult,
  type DirectCheckResult,
  type DiagnosticResult,
  type SpaceValidationResult as SpaceAccessValidationResult
} from './space-access-recovery';

// Space validation services
export {
  isSubdomainAvailable,
  validateSubdomain,
  checkSpaceAccess,
  validateSpaceOwnership,
  validateSpaceMembership,
  validateSpaceAccessComprehensive,
  type SpaceValidationResult,
  type SpaceAccessResult
} from './space-validation';

/**
 * Database Services README
 * 
 * This module provides focused, single-responsibility database services
 * extracted from the monolithic databaseUtils.ts and fixSpacesAccess.ts files.
 * 
 * Services are organized by domain:
 * - schema-validation: Database schema checking and validation
 * - space-creation: Space creation and setup operations
 * - membership-management: User space membership operations
 * - space-access-recovery: RLS bypass and access recovery utilities
 * - space-validation: Space and access validation utilities
 * 
 * Each service follows consistent patterns:
 * - Clear input/output interfaces
 * - Comprehensive error handling
 * - Detailed logging for debugging
 * - TypeScript type safety
 */ 