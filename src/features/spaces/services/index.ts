/**
 * Space services exports
 * Clean, focused service layer for space operations
 */

// Space Services - Feature-specific space operations
// Built on top of shared database services for enhanced functionality

// Core space services
export {
  getLastJoinedSpace,
  getLastCreatedSpace,
  getLastVisitedSpace,
  setLastJoinedSpace,
  setLastCreatedSpace,
  setLastVisitedSpace,
  cacheSpaceForRedirection,
  clearCacheEntry,
  clearAllSpaceCache,
  getAllCachedSpaces,
  CACHE_KEYS
} from './space-cache';

export {
  verifySpaceAccess,
  verifySpaceOwnership,
  getUserOwnedSpaces,
  getUserAccessibleSpaces,
  getFirstUserSpace,
  validateSpaceBySubdomain
} from './space-access';

export {
  redirectToSpace,
  getUserSpace
} from './space-navigation';

export {
  userHasSpaces,
  getUserSpaceCounts,
  getFirstUserSpaceId,
  getAllUserSpaces
} from './user-spaces';

export {
  updateLastJoinedSpace,
  joinSpace,
  leaveSpace,
  isSpaceMember,
  getSpaceMembers
} from './space-membership';

// Enhanced validation services
export {
  generateSubdomainSuggestions,
  validateAndSuggestSubdomain,
  getNextAvailableSubdomain,
  validateMultipleSubdomains,
  validateSubdomain,
  isSubdomainAvailable,
  type SubdomainSuggestion
} from './subdomain-validation';

// Space media operations (localStorage)
export * from './space-media';

// Space media database operations
export * from './space-media-db'; 