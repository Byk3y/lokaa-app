/**
 * 🚀 SIMPLE SPACE PRESENCE SYSTEM
 * 
 * Replaces the complex 1,045-line useUnifiedPresence.ts with a clean, simple approach
 * that leverages the solid database foundation from Phase 1.
 * 
 * Key simplifications:
 * - No complex heartbeat system (database handles cleanup automatically)
 * - No mobile browser workarounds (database is authoritative)
 * - No caching layers (Supabase handles this efficiently)
 * - Direct Realtime subscription for live updates
 * - Single source of truth: space_members table
 * 
 * INCOGNITO MODE FIX: Enhanced initialization with retry logic
 */

import { useState, useEffect, useRef } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';

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

/**
 * Simple space presence hook with Realtime subscription
 * Enhanced for incognito mode with retry logic
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
  
  const isInitialized = useRef(false);
  const retryCount = useRef(0);
  const maxRetries = 3;
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (!spaceId) {
      setPresence({ onlineCount: 0, onlineUsers: [], loading: false, error: null });
      return;
    }

    // Check cache first (5-second freshness for better UX)
    const cached = presenceCache.get(spaceId);
    if (cached && (Date.now() - cached.timestamp) < 5000) {
      setPresence(cached.data);
      isInitialized.current = true;
      return;
    }

    // Initial fetch from database with retry logic
    const fetchPresence = async (attempt = 0) => {
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log(`🌐 [SimplePresence] Fetching presence for space ${spaceId} (attempt ${attempt + 1})`);
        }
        
        setPresence(prev => ({ ...prev, loading: true, error: null }));

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
        retryCount.current = 0; // Reset retry count on success
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`🌐 [SimplePresence] Successfully fetched ${onlineUsers.length} online users for space ${spaceId}`);
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

    // Set up Realtime subscription for live updates
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
            console.log(`🌐 [SimplePresence] Real-time update received for space ${spaceId}:`, payload.eventType);
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
  }, [spaceId, supabase]);

  return presence;
};

/**
 * Hook for just the online count (most common use case)
 * Enhanced with fallback logic for better reliability
 */
export const useOnlineCount = (spaceId: string): number => {
  const { onlineCount, loading, error } = useSimpleSpacePresence(spaceId);
  
  // Return 0 if still loading or there's an error, otherwise return the count
  if (loading || error) {
    return 0;
  }
  
  return onlineCount;
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
    // Clear cache for specific space
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