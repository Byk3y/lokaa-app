/**
 * @deprecated This store has been moved to the spaces feature module.
 * Import from '@/features/spaces' instead.
 */

import { useSpacePreviewStore as FeatureStore } from '@/features/spaces';

/**
 * Re-export the space preview store from the spaces feature module.
 * This is provided for backward compatibility during the migration period.
 * 
 * @deprecated Use useSpacePreviewStore from '@/features/spaces' instead
 */
export const useSpacePreviewStore = FeatureStore; 