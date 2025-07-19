import { log } from '@/utils/logger';
import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

interface PresenceUser {
  user_id: string;
  online_at: string;
}

interface PresenceState {
  onlineCount: number;
  onlineUsers: PresenceUser[];
  loading: boolean;
}

export function useSupabasePresence(spaceId: string | undefined): PresenceState {
  const [state, setState] = useState<PresenceState>({
    onlineCount: 0,
    onlineUsers: [],
    loading: true
  });
  const { user } = useOptimizedAuth();

  useEffect(() => {
    if (!spaceId || !user?.id) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    const supabase = getSupabaseClient();

    // Function to update presence
    const updatePresence = async () => {
      try {
        await supabase.rpc('update_presence_state', {
          p_user_id: user.id,
          p_space_id: spaceId,
          p_metadata: {}
        });
      } catch (error) {
        log.error('Hook', 'Error updating presence:', error);
      }
    };

    // Function to set user offline
    const setOffline = async () => {
      try {
        await supabase.rpc('set_user_offline', {
          p_user_id: user.id
        });
      } catch (error) {
        log.error('Hook', 'Error setting user offline:', error);
      }
    };

    // Function to fetch online users
    const fetchOnlineUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('presence_state')
          .select('user_id, last_seen_at')
          .eq('space_id', spaceId)
          .gt('last_seen_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

        if (error) throw error;

        const onlineUsers = data.map(row => ({
          user_id: row.user_id,
          online_at: row.last_seen_at
        }));

        setState({
          onlineCount: onlineUsers.length,
          onlineUsers,
          loading: false
        });
      } catch (error) {
        log.error('Hook', 'Error fetching online users:', error);
        setState(prev => ({ ...prev, loading: false }));
      }
    };

    // Initial presence update and fetch
    updatePresence();
    fetchOnlineUsers();

    // Set up real-time subscription
    const channel = supabase
      .channel(`presence_state:${spaceId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'presence_state',
        filter: `space_id=eq.${spaceId}`
      }, () => {
        fetchOnlineUsers();
      })
      .subscribe();

    // Set up periodic presence updates
    const presenceInterval = setInterval(updatePresence, 30000);
    const fetchInterval = setInterval(fetchOnlineUsers, 30000);

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setOffline();
      } else {
        updatePresence();
        fetchOnlineUsers();
      }
    };

    // Handle page unload
    const handleBeforeUnload = () => {
      setOffline();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(presenceInterval);
      clearInterval(fetchInterval);
      channel.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      setOffline();
    };
  }, [spaceId, user?.id]);

  return state;
}

export default useSupabasePresence; 