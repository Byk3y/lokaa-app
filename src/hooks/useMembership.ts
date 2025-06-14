/**
 * @deprecated This hook has been moved to the spaces feature module.
 * Import from '@/features/spaces' instead.
 */

import { useMembership as FeatureHook } from '@/features/spaces';

/**
 * Re-export the membership hook from the spaces feature module.
 * This is provided for backward compatibility during the migration period.
 * 
 * @deprecated Use useMembership from '@/features/spaces' instead
 */
export const useMembership = FeatureHook; 