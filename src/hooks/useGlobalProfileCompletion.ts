import { useState, useEffect } from 'react';
import { useOptimizedAuth } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { log } from '@/utils/logger';

export const useGlobalProfileCompletion = () => {
  const { user } = useOptimizedAuth();
  const [needsCompletion, setNeedsCompletion] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkProfileCompletion = async () => {
      log.debug('ProfileCompletion', `[GlobalProfileCompletion] Starting profile completion check for user: ${user?.email || 'no user'}`);
      
      if (!user) {
        log.debug('ProfileCompletion', `[GlobalProfileCompletion] No user, setting needsCompletion to false`);
        setNeedsCompletion(false);
        setIsLoading(false);
        return;
      }

      log.debug('ProfileCompletion', `[GlobalProfileCompletion] User found, adding delay for data loading...`);
      // Add a small delay to ensure user data is properly loaded
      await new Promise(resolve => setTimeout(resolve, 500));

      try {
        // Fetch current user's profile directly from database with retry
        let profile = null;
        let error = null;
        
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const result = await getSupabaseClient()
              .from('users')
              .select('bio, avatar_url')
              .eq('id', user.id)
              .single();
            
            profile = result.data;
            error = result.error;
            
            if (!error) {
              break; // Success, exit retry loop
            }
            
            log.warn('ProfileCompletion', `[GlobalProfileCompletion] Attempt ${attempt} failed: ${error.message}`);
            
            if (attempt < 3) {
              // Wait before retry
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
          } catch (retryError) {
            log.warn('ProfileCompletion', `[GlobalProfileCompletion] Attempt ${attempt} exception:`, retryError);
            if (attempt < 3) {
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
          }
        }

        if (error) {
          log.error('ProfileCompletion', `[GlobalProfileCompletion] All attempts failed: ${error.message}`);
          setNeedsCompletion(false);
          setIsLoading(false);
          return;
        }

        // Check if user has bio
        const hasBio = profile?.bio && profile.bio.trim().length > 0;
        const hasAvatar = profile?.avatar_url && profile.avatar_url.trim().length > 0;
        
        // Debug logging
        log.debug('ProfileCompletion', `[GlobalProfileCompletion] User: ${user.email}, Bio: "${profile?.bio}", HasBio: ${hasBio}, HasAvatar: ${hasAvatar}`);
        
        // User needs completion if they don't have a bio
        const needsCompletion = !hasBio;
        log.debug('ProfileCompletion', `[GlobalProfileCompletion] Setting needsCompletion to: ${needsCompletion}`);
        setNeedsCompletion(needsCompletion);
        setIsLoading(false);
      } catch (error) {
        log.error('ProfileCompletion', `[GlobalProfileCompletion] Exception fetching profile:`, error);
        setNeedsCompletion(false);
        setIsLoading(false);
      }
    };

    checkProfileCompletion();
  }, [user]);

  return { 
    needsCompletion, 
    isLoading,
    hasUser: !!user 
  };
};
