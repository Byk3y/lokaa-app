/**
 * @deprecated This component has been moved to the users feature module.
 * Import from '@/features/users' instead.
 */

import { ProfileAvatar as FeatureComponent } from '@/features/users';

/**
 * Re-export the ProfileAvatar component from the users feature module.
 * This is provided for backward compatibility during the migration period.
 * 
 * @deprecated Use ProfileAvatar from '@/features/users' instead
 */
export const ProfileAvatar = FeatureComponent; 