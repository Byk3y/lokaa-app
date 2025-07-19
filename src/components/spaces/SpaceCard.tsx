/**
 * @deprecated This component has been moved to the spaces feature module.
 * Import from '@/features/spaces' instead.
 */

import { SpaceCard as FeatureSpaceCard } from '@/features/spaces';
import { Space } from '@/features/spaces/types';

/**
 * Props for the SpaceCard component
 */
interface SpaceCardProps {
  /** The space to display */
  space: Space;
  
  /**
   * Controls the behavior when the card is clicked:
   * - When true: Opens a modal preview using useSpacePreviewStore (used on homepage for quick browsing)
   * - When false: Navigates directly to the space's about page (used on discover page and for shareable links)
   * 
   * @default true
   */
  openInModal?: boolean;
}

/**
 * Compatibility wrapper for SpaceCard
 * 
 * This component forwards to the new implementation in the spaces feature module.
 * It is provided for backward compatibility during the migration period.
 * 
 * @deprecated Use SpaceCard from '@/features/spaces' instead
 */
export function SpaceCard(props: SpaceCardProps) {
  return <FeatureSpaceCard {...props} />;
}
