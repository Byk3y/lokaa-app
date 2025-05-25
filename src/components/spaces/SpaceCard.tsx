/**
 * @deprecated This component has been moved to the spaces feature module.
 * Import from '@/features/spaces' instead.
 */

import { SpaceCard as FeatureSpaceCard } from '@/features/spaces';

/**
 * Compatibility wrapper for SpaceCard
 * 
 * This component forwards to the new implementation in the spaces feature module.
 * It is provided for backward compatibility during the migration period.
 * 
 * @deprecated Use SpaceCard from '@/features/spaces' instead
 */
export function SpaceCard(props: any) {
  return <FeatureSpaceCard {...props} />;
}
