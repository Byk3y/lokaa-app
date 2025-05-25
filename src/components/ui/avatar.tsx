/**
 * @deprecated This component has been moved to the shared components.
 * Import from '@/shared/components' instead.
 */

import { 
  Avatar as SharedAvatar,
  AvatarImage as SharedAvatarImage,
  AvatarFallback as SharedAvatarFallback
} from '@/shared/components';

/**
 * Compatibility wrapper for Avatar components
 * 
 * These components forward to the new implementations in the shared components.
 * They are provided for backward compatibility during the migration period.
 * 
 * @deprecated Use Avatar components from '@/shared/components' instead
 */
export const Avatar = SharedAvatar;
export const AvatarImage = SharedAvatarImage;
export const AvatarFallback = SharedAvatarFallback;
