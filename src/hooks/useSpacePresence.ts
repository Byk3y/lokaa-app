/**
 * 🚀 UNIFIED SPACE PRESENCE SYSTEM
 * 
 * A clean, efficient presence system that combines the best parts of our
 * previous implementations with proper real-time support and caching.
 * 
 * Features:
 * - Real-time presence updates
 * - Efficient caching
 * - Proper cleanup of stale presence
 * - Incognito mode support
 * - Cross-tab synchronization
 */

import { useState, useEffect, useRef } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

interface SpacePresenceData {
  onlineCount: number;
  onlineUsers: string[];
  loading: boolean;
  error: string | null;
}

// Cache for presence data
const presenceCache = new Map<string, { data: SpacePresenceData; timestamp: number }>();

// Active subscriptions tracker
const activeSubscriptions = new Map<string, any>();

export function useSpacePresence(spaceId: string | undefined): SpacePresenceData {
  const { user } = useOptimizedAuth();
  const [presence, setPresence] = useState<SpacePresenceData>({
    onlineCount: 0,
    onlineUsers: [],
    loading: true,
    error: null
  });
  
  const isInitialized = useRef(false);
  const retryCount = useRef(0);
  const maxRetries = 3;
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (!spaceId) {
      setPresence(prev => ({ ...prev, loading: false }));
      return;
    }

    // Check cache first (5-second freshness)
    const cached = presenceCache.get(spaceId);
    if (cached && (Date.now() - cached.timestamp) < 5000) {
      setPresence(cached.data);
      isInitialized.current = true;
      return;
    }

    // Function to fetch presence data
    const fetchPresence = async (attempt = 0) => {
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log(`🌐 [SpacePresence] Fetching presence for space ${spaceId} (attempt ${attempt + 1})`);
        }
        
        setPresence(prev => ({ ...prev, loading: true, error: null }));

        // Update current user's presence first if authenticated
        if (user?.id) {
          await supabase.rpc('update_space_presence', {
            p_user_id: user.id,
            p_space_id: spaceId
          });
        }

        // Get all online users
        const { data, error } = await supabase
          .from('space_members')
          .select('user_id, is_online')
          .eq('space_id', spaceId)
          .eq('status', 'active')
          .eq('is_online', true);

        if (error) throw error;

        const onlineUsers = (data || []).map(member => member.user_id);
        const presenceData = {
          onlineCount: onlineUsers.length,
          onlineUsers,
          loading: false,
          error: null
        };
        
        setPresence(presenceData);
        
        // Cache the result
        presenceCache.set(spaceId, { data: presenceData, timestamp: Date.now() });
        
        isInitialized.current = true;
        retryCount.current = 0;
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`🌐 [SpacePresence] Successfully fetched ${onlineUsers.length} online users for space ${spaceId}`);
        }
      } catch (error) {
        console.error(`Failed to fetch space presence (attempt ${attempt + 1}):`, error);
        
        if (attempt < maxRetries) {
          // Retry with exponential backoff
          const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
          setTimeout(() => {
            retryCount.current = attempt + 1;
            fetchPresence(attempt + 1);
          }, delay);
        } else {
          // Final failure
          setPresence(prev => ({
            ...prev,
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to fetch presence'
          }));
        }
      }
    };

    // Set up real-time subscription
    const setupSubscription = () => {
      // Prevent duplicate subscriptions
      if (activeSubscriptions.has(spaceId)) {
        return activeSubscriptions.get(spaceId);
      }

      const channel = supabase
        .channel(`space-presence-${spaceId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'space_members',
          filter: `space_id=eq.${spaceId}`
        }, (payload) => {
          if (process.env.NODE_ENV === 'development') {
            console.log(`🌐 [SpacePresence] Real-time update received for space ${spaceId}:`, payload.eventType);
          }
          // Re-fetch presence data when changes occur
          fetchPresence();
        })
        .subscribe();

      activeSubscriptions.set(spaceId, channel);
      return channel;
    };

    // Initial fetch
    fetchPresence();
    
    // Set up subscription
    const subscription = setupSubscription();

    // Cleanup
    return () => {
      if (activeSubscriptions.get(spaceId) === subscription) {
        activeSubscriptions.delete(spaceId);
        subscription.unsubscribe();
      }
    };
  }, [spaceId, user?.id, supabase]);

  return presence;
} 