/**
 * @deprecated This store has been moved to the users feature module.
 * Import from '@/features/users' instead.
 */

import { useOptimizedAuthStore as FeatureStore } from '@/features/users';

/**
 * Re-export the auth store from the users feature module.
 * This is provided for backward compatibility during the migration period.
 * 
 * @deprecated Use useOptimizedAuthStore from '@/features/users' instead
 */
export const useOptimizedAuthStore = FeatureStore; 