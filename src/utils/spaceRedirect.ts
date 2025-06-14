/**
 * Legacy space redirect utilities - Backward compatibility layer
 * This file maintains existing import compatibility while using the new service architecture
 * 
 * @deprecated Consider importing directly from @/features/spaces/services for better organization
 */

// Re-export navigation functions with their original names
export {
  redirectToSpace,
  getUserSpace,
} from '@/features/spaces/services/space-navigation';

// Re-export types for backward compatibility
export type {
  SpaceRedirectData,
} from '@/shared/types/spaces';

// Note: This file previously contained 321 lines of complex redirection logic
// This functionality has been reorganized into focused services:
// - @/features/spaces/services/space-navigation (primary redirection logic)
// - @/features/spaces/services/space-cache (localStorage management)
// - @/features/spaces/services/space-access (database validation)
// - @/shared/types/spaces (TypeScript interfaces)

/*
 * Original function signatures maintained for backward compatibility:
 * 
 * redirectToSpace(navigate?: NavigateFunction, replace?: boolean): Promise<boolean>
 * getUserSpace(userId: string): Promise<SpaceRedirectData | null>
 * 
 * These functions now use the new service architecture but maintain
 * the same external interface for zero-breaking-change migration.
 */ 