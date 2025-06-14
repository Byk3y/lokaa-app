/**
 * @deprecated This hook has been moved to SpaceContext.
 * Import from '@/contexts/SpaceContext' instead.
 */

import { useSpace as ContextHook, SpaceData } from '@/contexts/SpaceContext';

/**
 * Re-export the space hook from the SpaceContext.
 * This is provided for backward compatibility during the migration period.
 * 
 * @deprecated Use useSpace from '@/contexts/SpaceContext' instead
 */
export const useSpace = ContextHook;

/**
 * Re-export the SpaceData type from the SpaceContext.
 * This is provided for backward compatibility during the migration period.
 * 
 * @deprecated Use SpaceData from '@/contexts/SpaceContext' instead
 */
export type { SpaceData }; 