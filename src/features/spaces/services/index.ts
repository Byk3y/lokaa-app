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

// User-facing recovery services
export {
  recoverSpaceAccess,
  checkSpaceAccessWithRecovery,
  getAccessErrorMessage,
  getRecoveryAction,
  type SpaceRecoveryResult
} from './space-recovery';

/**
 * Space Services Architecture
 * 
 * This module provides feature-specific space operations built on top of
 * the shared database services. The architecture follows these principles:
 * 
 * 1. **Layered Design**: Feature services build on shared database services
 * 2. **User-Centric**: Focus on user-facing functionality and UX
 * 3. **Caching**: Intelligent caching for performance
 * 4. **Recovery**: Robust error handling and recovery mechanisms
 * 5. **Validation**: Enhanced validation with suggestions and feedback
 * 
 * Service Categories:
 * - **Core Services**: Basic space operations (cache, access, navigation)
 * - **User Services**: User-specific operations (spaces, membership)
 * - **Enhanced Services**: Advanced features (validation, recovery)
 * 
 * Usage Examples:
 * 
 * ```typescript
 * // Basic space access
 * import { verifySpaceAccess } from '@/features/spaces/services';
 * 
 * // Enhanced subdomain validation
 * import { validateAndSuggestSubdomain } from '@/features/spaces/services';
 * 
 * // User-friendly recovery
 * import { recoverSpaceAccess } from '@/features/spaces/services';
 * ```
 */

// Space media operations (localStorage)
export * from './space-media';

// Space media database operations
export * from './space-media-db'; 