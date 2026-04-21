// Database Services - focused, single-responsibility space operations.

export {
  diagnoseSpacesTable,
  validateSpaceTableColumns,
  type SchemaValidationResult,
} from './schema-validation';

export {
  createMinimalSpace,
  createSpace,
  validateSpaceCreationParams,
  type SpaceCreationResult,
} from './space-creation';

export {
  addUserToSpace,
  removeUserFromSpace,
  updateUserRole,
  getSpaceMembers,
  type MembershipResult,
  type SpaceMemberData,
  type SpaceAccessData,
} from './membership-management';

export {
  isSubdomainAvailable,
  validateSubdomain,
  checkSpaceAccess,
  validateSpaceOwnership,
  validateSpaceMembership,
  validateSpaceAccessComprehensive,
  type SpaceValidationResult,
  type SpaceAccessResult,
} from './space-validation';
