import { log } from '@/utils/logger';
import { useEffect, useRef } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

// Update the user's presence in the current space on mount, on return from
// background, and after sustained activity. All writes go through the
// update_space_presence RPC, which is SECURITY DEFINER, validates active
// membership, and flips is_online off in every other space for this user.

export const useAutoPresenceUpdater = (spaceId: string | undefined) => {
  const { user } = useOptimizedAuth();
  const lastUpdateRef = useRef<number>(0);
  const isInitializedRef = useRef(false);

  const THROTTLE_MS = 30_000;

  const updatePresence = async (reason: string) => {
    if (!user?.id || !spaceId) return;

    const now = Date.now();
    if (now - lastUpdateRef.current < THROTTLE_MS) return;

    try {
      const { error } = await getSupabaseClient()
        .rpc('update_space_presence', { p_user_id: user.id, p_space_id: spaceId });

      if (error) throw error;
      lastUpdateRef.current = now;
    } catch (error) {
      log.warn('Hook', `[AutoPresence] Failed to update presence (${reason}):`, error);
    }
  };

  useEffect(() => {
    if (!isInitializedRef.current && spaceId && user?.id) {
      isInitializedRef.current = true;
      updatePresence('space_load');
    }
  }, [spaceId, user?.id]);

  useEffect(() => {
    if (!spaceId || !user?.id) return;
    const handleVisibilityChange = () => {
      if (!document.hidden) updatePresence('visibility_return');
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [spaceId, user?.id]);

  useEffect(() => {
    if (!spaceId || !user?.id) return;
    let activityTimeout: ReturnType<typeof setTimeout> | undefined;

    const handleActivity = () => {
      if (activityTimeout) clearTimeout(activityTimeout);
      activityTimeout = setTimeout(() => updatePresence('user_activity'), 5 * 60 * 1000);
    };

    const events = ['click', 'keydown', 'scroll', 'mousemove'] as const;
    events.forEach((event) => document.addEventListener(event, handleActivity, { passive: true }));

    return () => {
      if (activityTimeout) clearTimeout(activityTimeout);
      events.forEach((event) => document.removeEventListener(event, handleActivity));
    };
  }, [spaceId, user?.id]);

  return { updatePresence: () => updatePresence('manual') };
};
