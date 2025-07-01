/**
 * 🚀 SIMPLE SPACE PRESENCE SYSTEM
 * 
 * Uses the database presence table for persistent presence tracking.
 * This connects to the PresenceService that was updated to work with the new schema.
 * 
 * Features:
 * - Database-backed presence data
 * - Real-time updates via database subscriptions
 * - Session-aware initialization
 * - Automatic cleanup of stale presence
 */

import { useState, useEffect, useRef } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

interface SpacePresenceResult {
  onlineCount: number;
  onlineUsers: string[];
  loading: boolean;
  error: string | null;
}



// Simple cache to prevent duplicate subscriptions
const activeSubscriptions = new Map<string, any>();

// Cache for presence data to prevent duplicate fetches
const presenceCache = new Map<string, { data: SpacePresenceResult, timestamp: number }>();

// Debug helper
const debugPresence = (message: string, data: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`🌐 [SimplePresence] ${message}:`, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Simple space presence hook using database presence table
 * @param spaceId - The space ID to monitor
 * @returns Object with onlineCount, onlineUsers, loading, and error
 */
export const useSimpleSpacePresence = (spaceId: string): SpacePresenceResult => {
  const [presence, setPresence] = useState<SpacePresenceResult>({
    onlineCount: 0,
    onlineUsers: [],
    loading: true,
    error: null
  });
  
  const { user } = useOptimizedAuth();
  const supabase = getSupabaseClient();
  const mountedRef = useRef(true);
  const currentChannel = useRef<any>(null);

  // Fetch presence data from database
  const fetchPresenceData = async () => {
    if (!spaceId || !mountedRef.current) return;

    try {
      debugPresence('Fetching presence data from database', { spaceId });

      // Clean up stale presence (older than 5 minutes)
      await supabase
        .from('presence')
        .delete()
        .eq('space_id', spaceId)
        .lte('online_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

      // Get current online users
      const { data, error } = await supabase
        .from('presence')
        .select('user_id, online_at')
        .eq('space_id', spaceId)
        .gte('online_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

      if (error) {
        console.error('Error fetching presence data:', error);
        if (mountedRef.current) {
          setPresence(prev => ({ ...prev, loading: false, error: error.message }));
        }
        return;
      }

      const onlineUsers = data?.map(p => p.user_id) || [];
      const uniqueUsers = [...new Set(onlineUsers)];

      debugPresence('Successfully fetched presence data', {
        spaceId,
        onlineCount: uniqueUsers.length,
        users: uniqueUsers,
        rawData: data
      });

      const newData = {
        onlineCount: uniqueUsers.length,
        onlineUsers: uniqueUsers,
        loading: false,
        error: null
      };

      if (mountedRef.current) {
        setPresence(newData);
        presenceCache.set(spaceId, { data: newData, timestamp: Date.now() });
      }

    } catch (error: any) {
      console.error('Exception fetching presence data:', error);
      if (mountedRef.current) {
        setPresence(prev => ({ ...prev, loading: false, error: error.message }));
      }
    }
  };

  // Update current user's presence in database
  const updateUserPresence = async () => {
    if (!spaceId || !user?.id || !mountedRef.current) return;

    try {
      // Use PresenceService via the bridge if available
      if ((window as any).indexedDBBridgeV2?.updateGlobalPresence) {
        await (window as any).indexedDBBridgeV2.updateGlobalPresence(
          user.id, 
          true, 
          { spaceId, forceNetwork: true }
        );
      } else {
        // Fallback to direct database update
        await supabase
          .from('presence')
          .upsert({
            user_id: user.id,
            space_id: spaceId,
            online_at: new Date().toISOString(),
            metadata: { timestamp: new Date().toISOString() }
          }, {
            onConflict: 'user_id,space_id'
          });
      }

      debugPresence('Updated user presence', { userId: user.id, spaceId });
    } catch (error) {
      console.error('Failed to update user presence:', error);
    }
  };

  useEffect(() => {
    mountedRef.current = true;

    if (!spaceId) {
      setPresence(prev => ({ ...prev, loading: false }));
      return;
    }

    // Initial fetch
    fetchPresenceData();

    // Update user presence if authenticated
    if (user?.id) {
      updateUserPresence();
    }

    // Set up real-time subscription to presence table
    const channel = supabase
      .channel(`presence_changes:${spaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'presence',
          filter: `space_id=eq.${spaceId}`
        },
        (payload) => {
          debugPresence('Real-time presence change detected', { 
            spaceId, 
            event: payload.eventType,
            data: payload.new || payload.old
          });
          
          // Refetch data after a short delay to debounce rapid changes
          setTimeout(fetchPresenceData, 500);
        }
      )
      .subscribe();

    currentChannel.current = channel;
    activeSubscriptions.set(spaceId, channel);

    // Periodic refresh every 2 minutes
    const refreshInterval = setInterval(() => {
      if (mountedRef.current) {
        fetchPresenceData();
        if (user?.id) {
          updateUserPresence();
        }
      }
    }, 2 * 60 * 1000);

    // Cleanup
    return () => {
      mountedRef.current = false;
      if (activeSubscriptions.get(spaceId) === channel) {
        debugPresence('Cleaning up presence subscription', { spaceId });
        channel.unsubscribe();
        activeSubscriptions.delete(spaceId);
      }
      clearInterval(refreshInterval);
      currentChannel.current = null;
    };
  }, [spaceId, user?.id, supabase]);

  return presence;
};

/**
 * Hook for just the online count (most common use case)
 */
export const useOnlineCount = (spaceId: string): number => {
  const { onlineCount, loading, error } = useSimpleSpacePresence(spaceId);
  return loading || error ? 0 : onlineCount;
};

/**
 * Cleanup function for space switching
 */
export const clearSpacePresenceCache = (spaceId?: string) => {
  if (spaceId) {
    const subscription = activeSubscriptions.get(spaceId);
    if (subscription) {
      subscription.unsubscribe();
      activeSubscriptions.delete(spaceId);
    }
    presenceCache.delete(spaceId);
  } else {
    // Clear all
    activeSubscriptions.forEach(subscription => {
      subscription.unsubscribe();
    });
    activeSubscriptions.clear();
    presenceCache.clear();
  }
}; 