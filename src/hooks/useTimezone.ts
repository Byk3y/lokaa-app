import { log } from '@/utils/logger';
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { globalCache } from '@/utils/globalCacheCoordinator';

// Helper type for JSON data
type JsonObject = Record<string, unknown>;

// Define database schema types for proper type checking
interface User {
  id: string;
  timezone: string;
  social_links?: JsonObject | string;
  // Add other user fields as needed
}

interface ChatParticipant {
  id: string;
  user_id: string;
  conversation_id: string;
  last_active_at?: string;
  last_read_at?: string;
  // Add other chat participant fields as needed
}

// Cache for timezone data to prevent duplicate API calls
const timezoneCache = new Map<string, { timezone: string; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export function useTimezone() {
  const { user } = useOptimizedAuth();
  const [userTimezone, setUserTimezone] = useState<string>('UTC');
  const [loading, setLoading] = useState<boolean>(true);

  // Detect the user's local timezone
  const detectTimezone = (): string => {
    try {
      // Use Intl API to get the user's timezone
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
      log.error('Hook', 'Error detecting timezone:', error);
      return 'UTC'; // Default to UTC if detection fails
    }
  };

  // Save the user's timezone to their profile
  const saveTimezone = async (timezone: string) => {
    if (!user?.id) return;

    try {
      // Use cached data first to avoid duplicate query
      const cacheKey = `user-social-links:${user.id}`;
      
      const userData = await globalCache.get(
        cacheKey,
        async () => {
          const { data, error } = await getSupabaseClient()
            .from('users')
            .select('social_links')
            .eq('id', user.id)
            .single();
          
          if (error) throw error;
          return data;
        },
        'timezone-hook',
        { maxAge: 5 * 60 * 1000 } // 5 minutes cache
      );

      // Parse existing social_links or create new object
      const currentSocialLinks = userData?.social_links 
        ? (typeof userData.social_links === 'string' 
          ? JSON.parse(userData.social_links) 
          : userData.social_links as JsonObject)
        : {};
      
      // Update the timezone in social_links
      const updatedSocialLinks = {
        ...currentSocialLinks,
        timezone
      };
      
      // Save back to database
      const { error } = await getSupabaseClient()
        .from('users')
        .update({ 
          social_links: updatedSocialLinks
        })
        .eq('id', user.id);

      if (error) throw error;
      
      // Update cache
      globalCache.warm(cacheKey, { social_links: updatedSocialLinks });
      timezoneCache.set(user.id, { timezone, timestamp: Date.now() });
      
      setUserTimezone(timezone);
      
      // Refresh user's online status
      try {
        // This is a simplified approach that doesn't use explicit RPC or dedicated update
        log.debug('Hook', 'Timezone updated to:', timezone);
      } catch (activityError) {
        log.error('Hook', 'Error in timezone update:', activityError);
      }
    } catch (error) {
      log.error('Hook', 'Error saving timezone:', error);
    }
  };

  // Fetch the user's saved timezone from their profile
  const fetchUserTimezone = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Check local cache first
      const cached = timezoneCache.get(user.id);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setUserTimezone(cached.timezone);
        setLoading(false);
        return;
      }

      const cacheKey = `user-social-links:${user.id}`;
      const data = await globalCache.get(
        cacheKey,
        async () => {
          const { data, error } = await getSupabaseClient()
            .from('users')
            .select('social_links')
            .eq('id', user.id)
            .single();

          if (error) throw error;
          return data;
        },
        'timezone-hook',
        { maxAge: 5 * 60 * 1000 } // 5 minutes cache
      );

      // Parse social_links to get timezone
      let timezone: string | undefined;
      
      if (data?.social_links) {
        const socialLinks = typeof data.social_links === 'string'
          ? JSON.parse(data.social_links)
          : data.social_links as JsonObject;
          
        timezone = socialLinks.timezone as string;
      }
      
      if (timezone) {
        setUserTimezone(timezone);
        timezoneCache.set(user.id, { timezone, timestamp: Date.now() });
      } else {
        // Otherwise detect and save their timezone
        const detectedTimezone = detectTimezone();
        await saveTimezone(detectedTimezone);
      }
    } catch (error) {
      log.error('Hook', 'Error fetching user timezone:', error);
    } finally {
      setLoading(false);
    }
  };

  // Format a date based on the user's timezone
  const formatInUserTimezone = (
    date: Date | string | number,
    options: Intl.DateTimeFormatOptions = {
      dateStyle: 'medium',
      timeStyle: 'short',
    }
  ): string => {
    const dateObj = new Date(date);
    
    try {
      return new Intl.DateTimeFormat('default', {
        ...options,
        timeZone: userTimezone
      }).format(dateObj);
    } catch (error) {
      log.error('Hook', 'Error formatting date:', error);
      return new Intl.DateTimeFormat('default', options).format(dateObj);
    }
  };
  
  // Convert a date to the user's local time
  const convertToUserTimezone = (date: Date | string | number): Date => {
    const dateObj = new Date(date);
    
    // No conversion needed since Date objects in JavaScript are
    // always in the local timezone when displayed
    return dateObj;
  };
  
  // Initialize the timezone detection and fetching
  useEffect(() => {
    if (user?.id) {
      fetchUserTimezone();
    } else {
      setUserTimezone(detectTimezone());
      setLoading(false);
    }
  }, [user]);

  return {
    userTimezone,
    loading,
    saveTimezone,
    detectTimezone,
    formatInUserTimezone,
    convertToUserTimezone
  };
} 