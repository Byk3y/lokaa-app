import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { log } from '@/utils/logger';
import { toast } from '@/hooks/use-toast';

export interface NotificationPreferences {
  id?: string;
  user_id: string;
  push_enabled: boolean;
  email_enabled: boolean;
  new_posts: boolean;
  comments: boolean;
  likes: boolean;
  mentions: boolean;
  space_joins: boolean;
  affiliate_updates: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  timezone: string;
  created_at?: string;
  updated_at?: string;
}

export interface UseNotificationPreferencesReturn {
  preferences: NotificationPreferences | null;
  isLoading: boolean;
  error: string | null;
  updatePreference: (key: keyof NotificationPreferences, value: any) => Promise<boolean>;
  updateMultiplePreferences: (updates: Partial<NotificationPreferences>) => Promise<boolean>;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing user notification preferences
 * Connects to the notification_preferences table in the database
 */
export function useNotificationPreferences(): UseNotificationPreferencesReturn {
  const { user } = useOptimizedAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = getSupabaseClient();

  /**
   * Fetch user notification preferences from database
   */
  const fetchPreferences = useCallback(async () => {
    if (!user?.id) {
      setPreferences(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "no rows returned" - this is expected for new users
        throw error;
      }

      if (data) {
        setPreferences(data);
        log.debug('Hook', '✅ [useNotificationPreferences] Preferences loaded:', data);
      } else {
        // No preferences found, create default preferences
        await createDefaultPreferences();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch notification preferences';
      setError(errorMessage);
      log.error('Hook', '❌ [useNotificationPreferences] Fetch failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, supabase]);

  /**
   * Create default notification preferences for new users
   */
  const createDefaultPreferences = useCallback(async () => {
    if (!user?.id) return;

    try {
      const defaultPreferences: Omit<NotificationPreferences, 'id' | 'created_at' | 'updated_at'> = {
        user_id: user.id,
        push_enabled: true,
        email_enabled: false,
        new_posts: true,
        comments: true,
        likes: true,
        mentions: true,
        space_joins: true,
        affiliate_updates: true,
        quiet_hours_enabled: false,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
      };

      const { data, error } = await supabase
        .from('notification_preferences')
        .insert(defaultPreferences)
        .select()
        .single();

      if (error) {
        throw error;
      }

      setPreferences(data);
      log.debug('Hook', '✅ [useNotificationPreferences] Default preferences created:', data);
    } catch (err) {
      log.error('Hook', '❌ [useNotificationPreferences] Failed to create defaults:', err);
      throw err;
    }
  }, [user?.id, supabase]);

  /**
   * Update a single notification preference
   */
  const updatePreference = useCallback(async (
    key: keyof NotificationPreferences, 
    value: any
  ): Promise<boolean> => {
    if (!user?.id || !preferences) {
      log.warn('Hook', '⚠️ [useNotificationPreferences] Cannot update - user or preferences not loaded');
      return false;
    }

    try {
      // Optimistic update
      setPreferences(prev => prev ? { ...prev, [key]: value } : null);

      const { error } = await supabase
        .from('notification_preferences')
        .update({ [key]: value })
        .eq('user_id', user.id);

      if (error) {
        // Revert optimistic update
        setPreferences(prev => prev ? { ...prev, [key]: preferences[key] } : null);
        throw error;
      }

      log.debug('Hook', `✅ [useNotificationPreferences] Updated ${key}:`, value);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update preference';
      setError(errorMessage);
      log.error('Hook', `❌ [useNotificationPreferences] Update ${key} failed:`, err);
      
      toast({
        title: "Update Failed",
        description: `Could not update ${key} preference. Please try again.`,
        variant: "destructive",
        duration: 3000
      });
      
      return false;
    }
  }, [user?.id, preferences, supabase]);

  /**
   * Update multiple notification preferences at once
   */
  const updateMultiplePreferences = useCallback(async (
    updates: Partial<NotificationPreferences>
  ): Promise<boolean> => {
    if (!user?.id || !preferences) {
      log.warn('Hook', '⚠️ [useNotificationPreferences] Cannot update - user or preferences not loaded');
      return false;
    }

    try {
      // Optimistic update
      setPreferences(prev => prev ? { ...prev, ...updates } : null);

      const { error } = await supabase
        .from('notification_preferences')
        .update(updates)
        .eq('user_id', user.id);

      if (error) {
        // Revert optimistic update
        setPreferences(preferences);
        throw error;
      }

      log.debug('Hook', '✅ [useNotificationPreferences] Updated multiple preferences:', updates);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update preferences';
      setError(errorMessage);
      log.error('Hook', '❌ [useNotificationPreferences] Multiple update failed:', err);
      
      toast({
        title: "Update Failed",
        description: "Could not update notification preferences. Please try again.",
        variant: "destructive",
        duration: 3000
      });
      
      return false;
    }
  }, [user?.id, preferences, supabase]);

  /**
   * Refresh preferences from database
   */
  const refresh = useCallback(async () => {
    await fetchPreferences();
  }, [fetchPreferences]);

  // Initial fetch
  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return {
    preferences,
    isLoading,
    error,
    updatePreference,
    updateMultiplePreferences,
    refresh
  };
}

/**
 * Simplified hook for just getting preference values
 */
export function useNotificationPreferenceValue<K extends keyof NotificationPreferences>(
  key: K
): NotificationPreferences[K] | undefined {
  const { preferences } = useNotificationPreferences();
  return preferences?.[key];
}

/**
 * Hook for managing push notification preferences specifically
 */
export function usePushNotificationPreference() {
  const { preferences, updatePreference, isLoading } = useNotificationPreferences();
  
  const setPushEnabled = useCallback(async (enabled: boolean) => {
    return await updatePreference('push_enabled', enabled);
  }, [updatePreference]);

  return {
    isPushEnabled: preferences?.push_enabled ?? true,
    setPushEnabled,
    isLoading
  };
}