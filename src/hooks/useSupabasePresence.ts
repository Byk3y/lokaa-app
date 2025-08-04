import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { log } from '@/utils/logger';

interface PresenceState {
  onlineCount: number;
  onlineUsers: Array<{ user_id: string; online_at: string }>;
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
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 3;

    // Function to update presence with error handling
    const updatePresence = async () => {
      try {
        await supabase.rpc('update_presence_state', {
          p_user_id: user.id,
          p_space_id: spaceId,
          p_metadata: {}
        });
      } catch (error) {
        log.error('Hook', 'Error updating presence:', error);
        // Don't throw - presence updates are not critical
      }
    };

    // Function to set user offline with error handling
    const setOffline = async () => {
      try {
        await supabase.rpc('set_user_offline', {
          p_user_id: user.id
        });
      } catch (error) {
        log.error('Hook', 'Error setting user offline:', error);
        // Don't throw - offline updates are not critical
      }
    };

    // Function to fetch online users with retry logic
    const fetchOnlineUsers = async (): Promise<void> => {
      try {
        const { data, error } = await supabase
          .from('presence_state')
          .select('user_id, last_seen_at')
          .eq('space_id', spaceId)
          .gt('last_seen_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

        if (error) {
          throw error;
        }

        if (!isMounted) return;

        const onlineUsers = data.map(row => ({
          user_id: row.user_id,
          online_at: row.last_seen_at
        }));

        setState({
          onlineCount: onlineUsers.length,
          onlineUsers,
          loading: false
        });

        retryCount = 0; // Reset retry count on success

      } catch (error) {
        log.error('Hook', `Error fetching online users (attempt ${retryCount + 1}):`, error);
        
        if (!isMounted) return;

        if (retryCount < maxRetries) {
          retryCount++;
          // Exponential backoff
          const delay = Math.pow(2, retryCount) * 1000;
          setTimeout(() => {
            if (isMounted) {
              fetchOnlineUsers();
            }
          }, delay);
        } else {
          // Final failure - set empty state
          setState({
            onlineCount: 0,
            onlineUsers: [],
            loading: false
          });
        }
      }
    };

    // Initial presence update and fetch
    updatePresence();
    fetchOnlineUsers();

    // Set up real-time subscription with error handling
    let channel: any = null;
    
    const setupSubscription = async () => {
      try {
        channel = supabase
          .channel(`presence_state:${spaceId}`)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'presence_state',
            filter: `space_id=eq.${spaceId}`
          }, () => {
            if (isMounted) {
              fetchOnlineUsers();
            }
          })
          .subscribe((status: string) => {
            if (status === 'CHANNEL_ERROR') {
              log.error('Hook', 'Presence subscription error - will retry');
              // Retry subscription after delay
              setTimeout(() => {
                if (isMounted) {
                  setupSubscription();
                }
              }, 5000);
            }
          });
      } catch (error) {
        log.error('Hook', 'Error setting up presence subscription:', error);
        // Don't throw - presence is not critical
      }
    };

    setupSubscription();

    // Cleanup function
    return () => {
      isMounted = false;
      
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (error) {
          log.error('Hook', 'Error removing presence channel:', error);
        }
      }
      
      // Set user offline when component unmounts
      setOffline();
    };
  }, [spaceId, user?.id]);

  return state;
}

export default useSupabasePresence; 