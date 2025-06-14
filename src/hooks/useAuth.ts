/**
 * @deprecated This hook has been moved to the users feature module.
 * Import from '@/features/users' instead.
 */

import { useOptimizedAuth as FeatureHook } from '@/features/users';

/**
 * Re-export the auth hook from the users feature module.
 * This is provided for backward compatibility during the migration period.
 * 
 * @deprecated Use useOptimizedAuth from '@/features/users' instead
 */
export const useOptimizedAuth = FeatureHook; 