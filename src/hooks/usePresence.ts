import { useEffect, useCallback, useRef } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { createManagedInterval } from '@/utils/pageVisibilityManager';

export function usePresence(spaceId?: string) {
  const { user } = useOptimizedAuth();
  const intervalRef = useRef<(() => void) | null>(null);
  const isActiveRef = useRef(true);

  const updatePresence = useCallback(async () => {
    if (!user?.id || !spaceId || !isActiveRef.current) return;

    try {
      const { data, error } = await getSupabaseClient().rpc('ensure_user_online_safe', {
        p_space_id: spaceId,
        p_user_id: user.id
      });

      if (error) {
        console.warn('Failed to update presence:', error.message);
        return false;
      }

      return data;
    } catch (err) {
      console.warn('Presence update error:', err);
      return false;
    }
  }, [user?.id, spaceId]);

  const setOffline = useCallback(async () => {
    if (!user?.id || !spaceId) return;

    try {
      const { error } = await getSupabaseClient().rpc('set_user_offline_safe', {
        p_space_id: spaceId,
        p_user_id: user.id
      });

      if (error) {
        console.warn('Failed to set offline:', error.message);
      }
    } catch (err) {
      console.warn('Offline update error:', err);
    }
  }, [user?.id, spaceId]);

  useEffect(() => {
    if (!user?.id || !spaceId) return;

    // Mark as active
    isActiveRef.current = true;

    // Initial presence update
    updatePresence();

    // Set up managed interval for heartbeat (every 45 seconds)
    intervalRef.current = createManagedInterval(
      `presence-heartbeat-${spaceId}`, 
      updatePresence, 
      45000, 
      'heartbeat'
    );

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        isActiveRef.current = false;
        setOffline();
      } else {
        isActiveRef.current = true;
        updatePresence();
      }
    };

    // Handle page unload
    const handleBeforeUnload = () => {
      isActiveRef.current = false;
      // Use sendBeacon for reliable offline notification
      if (navigator.sendBeacon && typeof window !== 'undefined') {
        const formData = new FormData();
        formData.append('space_id', spaceId);
        formData.append('user_id', user.id);
        navigator.sendBeacon('https://nmddvthcsyppyjncqfsk.supabase.co/functions/v1/user-offline', formData);
      } else {
        setOffline();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      isActiveRef.current = false;
      
      // Clean up interval
      if (intervalRef.current) {
        intervalRef.current();
        intervalRef.current = null;
      }

      // Remove event listeners
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Set offline when unmounting
      setOffline();
    };
  }, [user?.id, spaceId, updatePresence, setOffline]);

  return { updatePresence, setOffline };
} 