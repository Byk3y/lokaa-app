import { log } from '@/utils/logger';
import { getSupabaseClient } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

/**
 * Check if a user needs to complete their profile
 * @param user The user object to check
 * @returns Promise<boolean> True if profile completion is needed
 */
export const needsProfileCompletion = async (user: User): Promise<boolean> => {
  if (!user?.id) {
    log.debug('Utils', 'No user ID provided for profile completion check');
    return false;
  }

  try {
    // Check user metadata first (from auth)
    const hasNameInMetadata = user.user_metadata?.firstName && user.user_metadata?.lastName;
    const hasAvatarInMetadata = user.user_metadata?.avatar_url;
    
    // If we have basic info in metadata, check database for bio
    if (hasNameInMetadata && hasAvatarInMetadata) {
      const { data, error } = await getSupabaseClient()
        .from('users')
        .select('bio')
        .eq('id', user.id)
        .single();
        
      if (error) {
        log.error('Utils', 'Error checking user bio:', error);
        return true; // Assume completion needed if we can't check
      }
      
      // Profile is complete if bio exists and is not empty
      const hasBio = data?.bio && data.bio.trim().length > 0;
      return !hasBio;
    }
    
    // If missing name or avatar in metadata, profile is incomplete
    return !hasNameInMetadata || !hasAvatarInMetadata;
    
  } catch (error) {
    log.error('Utils', 'Error checking profile completion:', error);
    return true; // Assume completion needed if we can't check
  }
};

/**
 * Check if a user needs profile completion (synchronous version using metadata only)
 * @param user The user object to check
 * @returns boolean True if profile completion is needed based on metadata
 */
export const needsProfileCompletionSync = (user: User): boolean => {
  if (!user) return false;
  
  const hasName = user.user_metadata?.firstName && user.user_metadata?.lastName;
  const hasAvatar = user.user_metadata?.avatar_url;
  
  // For sync check, we assume bio is missing if we don't have complete metadata
  // This is used for immediate redirect decisions
  return !hasName || !hasAvatar;
};





