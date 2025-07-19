import { log } from '@/utils/logger';
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

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useTabVisibility } from '@/contexts/TabVisibilityContext';
import { debounce } from '@/utils/debounce';

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

// Singleton pattern to prevent multiple hook instances for the same spaceId
const activeHookInstances = new Map<string, boolean>();

// Debug helper
const debugPresence = (message: string, data: any) => {
  if (process.env.NODE_ENV === 'development') {
    log.debug('Hook', `🌐 [SimplePresence] ${message}:`, {
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
  const lastFetchRef = useRef<number>(0);
  
  // Safe tab visibility hook usage
  let tabVisibility: ReturnType<typeof useTabVisibility> | null = null;
  try {
    tabVisibility = useTabVisibility();
  } catch (error) {
    // TabVisibilityProvider not available, use null checks
    tabVisibility = null;
  }

  // Fetch presence data from database
  const fetchPresenceData = useCallback(async () => {
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
        log.error('Hook', 'Error fetching presence data:', error);
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
        lastFetchRef.current = Date.now();
        
        // Update centralized fetch time
        if (tabVisibility) {
          tabVisibility.updateLastFetchTime('feed', spaceId);
        }
      }

    } catch (error: any) {
      log.error('Hook', 'Exception fetching presence data:', error);
      if (mountedRef.current) {
        setPresence(prev => ({ ...prev, loading: false, error: error.message }));
      }
    }
  }, [spaceId]);
  
  // Debounced version for real-time updates
  const debouncedFetchPresenceData = useCallback(
    debounce(fetchPresenceData, 300),
    [fetchPresenceData]
  );

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
      log.error('Hook', 'Failed to update user presence:', error);
    }
  };

  useEffect(() => {
    mountedRef.current = true;

    if (!spaceId) {
      setPresence(prev => ({ ...prev, loading: false }));
      return;
    }

    // 🔧 HOOK DEDUPLICATION: Prevent multiple instances for same spaceId
    const hookKey = `presence_${spaceId}`;
    const currentlyActive = activeHookInstances.get(hookKey);
    
    // 🚀 SMART DEDUPLICATION: Only block if there's an active instance AND we have cached data
    if (currentlyActive && presenceCache.has(spaceId)) {
      debugPresence('Hook instance already active, using cached data only', { spaceId, hookKey });
      
      // Restore cached data and exit - don't run any effects
      const cached = presenceCache.get(spaceId);
      if (cached && cached.data) {
        setPresence(cached.data);
      }
      return;
    }
    
    // Mark this hook instance as active (allows first instance or cache-miss scenarios)
    activeHookInstances.set(hookKey, true);

    // 🚀 TAB VISIBILITY FIX: Check if this is a cached tab return
    const isTabCached = tabVisibility?.isTabCached('feed', spaceId) || false;
    const isTabInitialized = tabVisibility?.isTabInitialized('feed', spaceId) || false;
    
    if (tabVisibility && isTabCached && isTabInitialized) {
      const lastFetchTime = tabVisibility.getLastFetchTime('feed', spaceId);
      const timeSinceLastFetch = lastFetchTime ? Date.now() - lastFetchTime : 0;
      
      debugPresence('Cached tab return detected - skipping initial fetch', { 
        spaceId, 
        isTabCached, 
        isTabInitialized,
        lastFetch: lastFetchTime,
        timeSinceLastFetch: timeSinceLastFetch > 0 ? timeSinceLastFetch : 'never'
      });
      
      // 🔧 FIX: Initialize state with cached data instead of defaults
      const cached = presenceCache.get(spaceId);
      if (cached && cached.data) {
        debugPresence('Restoring cached presence data', { spaceId, cachedData: cached.data });
        // Use React.startTransition for non-urgent state updates to reduce flashing
        React.startTransition(() => {
          setPresence(cached.data);
        });
      }
      
      // Use cached data with minimal refresh
      if (lastFetchTime && timeSinceLastFetch > 60000) { // Only if more than 1 minute old
        debugPresence('Cache too old, performing background refresh', { spaceId });
        setTimeout(fetchPresenceData, 200);
      } else {
        debugPresence('Cache still fresh, skipping background refresh', { spaceId });
      }
      // Still update user presence but don't fetch all data
      if (user?.id) {
        updateUserPresence();
      }
      return;
    }

    // Initial fetch for new or non-cached tabs
    debugPresence('Initial fetch triggered', { spaceId, isTabCached, isTabInitialized });
    fetchPresenceData();

    // Update user presence if authenticated
    if (user?.id) {
      updateUserPresence();
    }
    
    // Mark as initialized after first fetch
    if (tabVisibility && !isTabInitialized) {
      tabVisibility.markTabAsInitialized('feed', spaceId);
      tabVisibility.updateLastFetchTime('feed', spaceId);
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
          
          // Use debounced fetch to prevent excessive re-renders
          debouncedFetchPresenceData();
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
    }, 10 * 60 * 1000); // EGRESS FIX: Changed from 2 minutes to 10 minutes to reduce database calls

    // Cleanup
    return () => {
      mountedRef.current = false;
      
      // Clean up hook instance tracking
      const hookKey = `presence_${spaceId}`;
      activeHookInstances.delete(hookKey);
      
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