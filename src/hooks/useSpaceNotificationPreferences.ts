import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { log } from '@/utils/logger';
import { toast } from '@/hooks/use-toast';
import { 
  SpaceNotificationPreferences, 
  EffectiveNotificationPreferences,
  UseSpaceNotificationPreferencesReturn,
  UseUserSpacesNotificationPreferencesReturn,
  SpaceWithNotificationPreferences,
  DigestEmailFrequency,
  NotificationsEmailFrequency
} from '@/types/notification';

/**
 * Hook for managing notification preferences for a specific space
 * Matches Skool's per-space notification preference system
 */
export function useSpaceNotificationPreferences(spaceId: string): UseSpaceNotificationPreferencesReturn {
  const { user } = useOptimizedAuth();
  const [preferences, setPreferences] = useState<SpaceNotificationPreferences | null>(null);
  const [effectivePreferences, setEffectivePreferences] = useState<EffectiveNotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = getSupabaseClient();

  /**
   * Fetch space notification preferences and effective preferences
   */
  const fetchPreferences = useCallback(async () => {
    if (!user?.id || !spaceId) {
      setPreferences(null);
      setEffectivePreferences(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch space-specific preferences (may not exist)
      const { data: spacePrefs, error: spaceError } = await supabase
        .from('space_notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .eq('space_id', spaceId)
        .maybeSingle(); // Use maybeSingle instead of single to handle null case

      if (spaceError) {
        throw spaceError;
      }

      // Fetch effective preferences using database function
      const { data: effectivePrefs, error: effectiveError } = await supabase
        .rpc('get_effective_notification_preferences', {
          p_user_id: user.id,
          p_space_id: spaceId
        })
        .single();

      if (effectiveError) {
        throw effectiveError;
      }

      setPreferences(spacePrefs);
      setEffectivePreferences(effectivePrefs as EffectiveNotificationPreferences);
      
      log.debug('Hook', '✅ [useSpaceNotificationPreferences] Preferences loaded:', {
        spaceId,
        hasSpacePrefs: !!spacePrefs,
        effectivePrefs
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch space notification preferences';
      setError(errorMessage);
      log.error('Hook', '❌ [useSpaceNotificationPreferences] Fetch failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, spaceId, supabase]);

  /**
   * Create default space preferences if they don't exist
   */
  const createDefaultPreferences = useCallback(async (): Promise<SpaceNotificationPreferences> => {
    if (!user?.id || !spaceId) {
      throw new Error('User ID and Space ID required');
    }

    const defaultPreferences: Omit<SpaceNotificationPreferences, 'id' | 'created_at' | 'updated_at'> = {
      user_id: user.id,
      space_id: spaceId,
      digest_email_frequency: 'weekly',
      notifications_email_frequency: 'hourly',
      admin_announcements: true,
      event_reminders: true,
      // Other fields default to null (inherit from global)
    };

    const { data, error } = await supabase
      .from('space_notification_preferences')
      .insert(defaultPreferences)
      .select()
      .single();

    if (error) {
      throw error;
    }

    log.debug('Hook', '✅ [useSpaceNotificationPreferences] Default preferences created:', data);
    return data;
  }, [user?.id, spaceId, supabase]);

  /**
   * Update a single notification preference
   */
  const updatePreference = useCallback(async (
    key: keyof SpaceNotificationPreferences, 
    value: any
  ): Promise<boolean> => {
    if (!user?.id || !spaceId) {
      log.warn('Hook', '⚠️ [useSpaceNotificationPreferences] Cannot update - user or space not provided');
      return false;
    }

    try {
      // Create preferences if they don't exist
      if (!preferences) {
        const newPrefs = await createDefaultPreferences();
        setPreferences(newPrefs);
      }

      // Optimistic update
      setPreferences(prev => prev ? { ...prev, [key]: value } : null);

      const { error } = await supabase
        .from('space_notification_preferences')
        .upsert({ 
          user_id: user.id,
          space_id: spaceId,
          [key]: value 
        }, {
          onConflict: 'user_id,space_id'
        });

      if (error) {
        // Revert optimistic update
        setPreferences(prev => prev ? { ...prev, [key]: preferences?.[key as keyof SpaceNotificationPreferences] } : null);
        throw error;
      }

      // Refresh effective preferences
      await fetchPreferences();

      log.debug('Hook', `✅ [useSpaceNotificationPreferences] Updated ${key}:`, value);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update preference';
      setError(errorMessage);
      log.error('Hook', `❌ [useSpaceNotificationPreferences] Update ${key} failed:`, err);
      
      toast({
        title: "Update Failed",
        description: `Could not update ${key} preference. Please try again.`,
        variant: "destructive",
        duration: 3000
      });
      
      return false;
    }
  }, [user?.id, spaceId, preferences, supabase, createDefaultPreferences, fetchPreferences]);

  /**
   * Update multiple notification preferences at once
   */
  const updateMultiplePreferences = useCallback(async (
    updates: Partial<SpaceNotificationPreferences>
  ): Promise<boolean> => {
    if (!user?.id || !spaceId) {
      log.warn('Hook', '⚠️ [useSpaceNotificationPreferences] Cannot update - user or space not provided');
      return false;
    }

    try {
      // Create preferences if they don't exist
      if (!preferences) {
        await createDefaultPreferences();
      }

      // Optimistic update
      setPreferences(prev => prev ? { ...prev, ...updates } : null);

      const { error } = await supabase
        .from('space_notification_preferences')
        .upsert({ 
          user_id: user.id,
          space_id: spaceId,
          ...updates 
        }, {
          onConflict: 'user_id,space_id'
        });

      if (error) {
        // Revert optimistic update
        if (preferences) {
          setPreferences(preferences);
        }
        throw error;
      }

      // Refresh effective preferences
      await fetchPreferences();

      log.debug('Hook', '✅ [useSpaceNotificationPreferences] Updated multiple preferences:', updates);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update preferences';
      setError(errorMessage);
      log.error('Hook', '❌ [useSpaceNotificationPreferences] Multiple update failed:', err);
      
      toast({
        title: "Update Failed",
        description: "Could not update notification preferences. Please try again.",
        variant: "destructive",
        duration: 3000
      });
      
      return false;
    }
  }, [user?.id, spaceId, preferences, supabase, createDefaultPreferences, fetchPreferences]);

  /**
   * Reset space preferences to defaults (removes space-specific overrides)
   */
  const resetToDefaults = useCallback(async (): Promise<boolean> => {
    if (!user?.id || !spaceId) {
      log.warn('Hook', '⚠️ [useSpaceNotificationPreferences] Cannot reset - user or space not provided');
      return false;
    }

    try {
      const { error } = await supabase
        .from('space_notification_preferences')
        .delete()
        .eq('user_id', user.id)
        .eq('space_id', spaceId);

      if (error) {
        throw error;
      }

      setPreferences(null);
      
      // Refresh effective preferences (will now use global defaults)
      await fetchPreferences();

      log.debug('Hook', '✅ [useSpaceNotificationPreferences] Reset to defaults');
      
      toast({
        title: "Preferences Reset",
        description: "Space notification preferences reset to global defaults.",
        duration: 3000
      });
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset preferences';
      setError(errorMessage);
      log.error('Hook', '❌ [useSpaceNotificationPreferences] Reset failed:', err);
      
      toast({
        title: "Reset Failed",
        description: "Could not reset notification preferences. Please try again.",
        variant: "destructive",
        duration: 3000
      });
      
      return false;
    }
  }, [user?.id, spaceId, supabase, fetchPreferences]);

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
    effectivePreferences,
    isLoading,
    error,
    updatePreference,
    updateMultiplePreferences,
    resetToDefaults,
    refresh
  };
}

/**
 * Hook for managing notification preferences across all user's spaces
 * Useful for displaying a comprehensive view of all space preferences
 */
export function useUserSpacesNotificationPreferences(): UseUserSpacesNotificationPreferencesReturn {
  const { user } = useOptimizedAuth();
  const [spacesWithPreferences, setSpacesWithPreferences] = useState<SpaceWithNotificationPreferences[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = getSupabaseClient();

  /**
   * Fetch all spaces with their notification preferences
   */
  const fetchAllSpacePreferences = useCallback(async () => {
    if (!user?.id) {
      setSpacesWithPreferences([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // First fetch user's spaces with membership info using direct SQL
      log.debug('Hook', '🔍 [useUserSpacesNotificationPreferences] Fetching spaces for user:', user.id);
      const { data: spaceMemberships, error: spacesError } = await supabase
        .rpc('get_user_spaces_with_memberships', {
          p_user_id: user.id
        });

      if (spacesError) {
        log.error('Hook', '❌ [useUserSpacesNotificationPreferences] Spaces fetch error:', spacesError);
        throw spacesError;
      }

      if (!spaceMemberships || spaceMemberships.length === 0) {
        setSpacesWithPreferences([]);
        log.debug('Hook', '✅ [useUserSpacesNotificationPreferences] No spaces found for user');
        return;
      }

      log.debug('Hook', '✅ [useUserSpacesNotificationPreferences] Found spaces:', spaceMemberships.length);

      // Get effective preferences for each space
      const spacesWithPrefs: SpaceWithNotificationPreferences[] = [];
      
      for (const membership of spaceMemberships) {
        try {
          // Get effective preferences for this space
          const { data: effectivePrefs, error: prefsError } = await supabase
            .rpc('get_effective_notification_preferences', {
              p_user_id: user.id,
              p_space_id: membership.space_id
            })
            .single();

          if (prefsError) {
            log.warn('Hook', `Failed to get preferences for space ${membership.space_id}:`, prefsError);
            // Continue with defaults if preferences can't be fetched
          }

          // Use effective preferences or defaults
          const preferences = (effectivePrefs as EffectiveNotificationPreferences) || {
            user_id: user.id,
            space_id: membership.space_id,
            digest_email_frequency: 'weekly' as DigestEmailFrequency,
            notifications_email_frequency: 'hourly' as NotificationsEmailFrequency,
            new_posts: true,
            comments: true,
            likes: true,
            mentions: true,
            space_joins: true,
            admin_announcements: true,
            event_reminders: true,
            new_customers: membership.role === 'owner' || membership.role === 'admin',
            push_enabled: true,
            email_enabled: false,
            quiet_hours_enabled: false,
            quiet_hours_start: null,
            quiet_hours_end: null,
          };

          spacesWithPrefs.push({
            id: membership.space_id,
            name: membership.space_name,
            subdomain: membership.space_subdomain,
            icon_image: membership.space_icon_image,
            user_role: membership.role as 'owner' | 'admin' | 'member',
            preferences: {
              user_id: user.id,
              space_id: membership.space_id,
              digest_email_frequency: preferences.digest_email_frequency,
              notifications_email_frequency: preferences.notifications_email_frequency,
              new_posts: preferences.new_posts,
              comments: preferences.comments,
              likes: preferences.likes,
              mentions: preferences.mentions,
              space_joins: preferences.space_joins,
              admin_announcements: preferences.admin_announcements,
              event_reminders: preferences.event_reminders,
              new_customers: preferences.new_customers,
              push_enabled: preferences.push_enabled,
              email_enabled: preferences.email_enabled,
              quiet_hours_enabled: preferences.quiet_hours_enabled,
              quiet_hours_start: preferences.quiet_hours_start,
              quiet_hours_end: preferences.quiet_hours_end,
            },
            effective_preferences: preferences
          });
        } catch (spaceError) {
          log.error('Hook', `Error processing space ${membership.space_id}:`, spaceError);
          // Continue with other spaces
        }
      }

      setSpacesWithPreferences(spacesWithPrefs);
      log.debug('Hook', '✅ [useUserSpacesNotificationPreferences] Loaded spaces with preferences:', spacesWithPrefs.length);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch space notification preferences';
      setError(errorMessage);
      log.error('Hook', '❌ [useUserSpacesNotificationPreferences] Fetch failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, supabase]);

  /**
   * Get preferences for a specific space
   */
  const getSpacePreferences = useCallback((spaceId: string): SpaceNotificationPreferences | null => {
    const space = spacesWithPreferences.find(s => s.id === spaceId);
    return space?.preferences || null;
  }, [spacesWithPreferences]);

  /**
   * Update preferences for a specific space
   */
  const updateSpacePreferences = useCallback(async (
    spaceId: string, 
    updates: Partial<SpaceNotificationPreferences>
  ): Promise<boolean> => {
    if (!user?.id) {
      return false;
    }

    try {
      const { error } = await supabase
        .from('space_notification_preferences')
        .upsert({ 
          user_id: user.id,
          space_id: spaceId,
          ...updates 
        }, {
          onConflict: 'user_id,space_id'
        });

      if (error) {
        throw error;
      }

      // Refresh all preferences
      await fetchAllSpacePreferences();
      return true;
    } catch (err) {
      log.error('Hook', '❌ [useUserSpacesNotificationPreferences] Update failed:', err);
      return false;
    }
  }, [user?.id, supabase, fetchAllSpacePreferences]);

  /**
   * Refresh all space preferences
   */
  const refresh = useCallback(async () => {
    await fetchAllSpacePreferences();
  }, [fetchAllSpacePreferences]);

  // Initial fetch
  useEffect(() => {
    fetchAllSpacePreferences();
  }, [fetchAllSpacePreferences]);

  return {
    spacesWithPreferences,
    isLoading,
    error,
    getSpacePreferences,
    updateSpacePreferences,
    refresh
  };
}

/**
 * Simplified hook for getting effective preferences for a specific space
 */
export function useEffectiveNotificationPreferences(spaceId?: string) {
  const { user } = useOptimizedAuth();
  const [effectivePreferences, setEffectivePreferences] = useState<EffectiveNotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = getSupabaseClient();

  const fetchEffectivePreferences = useCallback(async () => {
    if (!user?.id) {
      setEffectivePreferences(null);
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .rpc('get_effective_notification_preferences', {
          p_user_id: user.id,
          p_space_id: spaceId || null
        })
        .single();

      if (error) {
        throw error;
      }

      setEffectivePreferences(data as EffectiveNotificationPreferences);
    } catch (err) {
      log.error('Hook', '❌ [useEffectiveNotificationPreferences] Fetch failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, spaceId, supabase]);

  useEffect(() => {
    fetchEffectivePreferences();
  }, [fetchEffectivePreferences]);

  return {
    effectivePreferences,
    isLoading,
    refresh: fetchEffectivePreferences
  };
}