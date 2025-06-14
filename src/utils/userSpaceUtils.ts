/**
 * Legacy user space utilities - Backward compatibility layer
 * This file maintains existing import compatibility while using the new service architecture
 * 
 * @deprecated Consider importing directly from @/features/spaces/services for better organization
 */

// Re-export user space functions
export {
  userHasSpaces,
  getUserSpaceCounts,
  getFirstUserSpace,
  getAllUserSpaces,
} from '@/features/spaces/services/user-spaces';

// Re-export space membership functions
export {
  updateLastJoinedSpace,
  joinSpace,
  leaveSpace,
  isSpaceMember,
  getSpaceMembers,
} from '@/features/spaces/services/space-membership';

// Re-export types for backward compatibility
export type {
  UserSpaceCounts,
  UserSpaceInfo,
} from '@/shared/types/spaces';

// Note: This file previously contained 291 lines of user space logic
// This functionality has been reorganized into focused services:
// - @/features/spaces/services/user-spaces (user space queries and counts)
// - @/features/spaces/services/space-membership (join/leave operations)
// - @/features/spaces/services/space-cache (localStorage management)
// - @/shared/types/spaces (TypeScript interfaces)

/*
 * Original function signatures maintained for backward compatibility:
 * 
 * userHasSpaces(userId: string): Promise<boolean>
 * getUserSpaceCounts(userId: string): Promise<UserSpaceCounts>
 * getFirstUserSpace(userId: string): Promise<UserSpaceInfo | null>
 * updateLastJoinedSpace(spaceId: string, userId: string): Promise<void>
 * 
 * These functions now use the new service architecture but maintain
 * the same external interface for zero-breaking-change migration.
 */ 