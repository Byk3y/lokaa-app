import { useEffect, useRef, useState } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { createManagedInterval } from '@/utils/pageVisibilityManager';

// Global state for unified presence management
interface PresenceState {
  [spaceId: string]: {
    onlineUsers: Set<string>;
    subscription: any;
    lastUpdate: number;
    listeners: Set<(count: number, users: string[]) => void>;
  };
}

const globalPresenceState: PresenceState = {};
let globalHeartbeatInterval: (() => void) | null = null;
let currentUser: any = null;

// Debugging tools
(window as any).getUnifiedPresenceState = () => {
  const state = Object.entries(globalPresenceState).map(([spaceId, data]) => ({
    spaceId,
    onlineCount: data.onlineUsers.size,
    onlineUsers: Array.from(data.onlineUsers),
    lastUpdate: new Date(data.lastUpdate).toLocaleTimeString(),
    hasSubscription: !!data.subscription,
    listenerCount: data.listeners.size
  }));
  console.table(state);
  return state;
};

// Global heartbeat to keep user online across all spaces
const startGlobalHeartbeat = (user: any) => {
  if (globalHeartbeatInterval || !user?.id) return;
  
  currentUser = user;
  
  const updateGlobalPresence = async () => {
    if (!currentUser?.id) return;
    
    try {
      // Update user's online status in all their spaces
      const { error } = await getSupabaseClient()
        .from('space_members')
        .update({
          is_online: true,
          last_active_at: new Date().toISOString()
        })
        .eq('user_id', currentUser.id)
        .eq('status', 'active');
        
      if (error) {
        console.warn('🌐 [UnifiedPresence] Global heartbeat error:', error.message);
      } else {
        console.log('🌐 [UnifiedPresence] Global heartbeat successful');
      }
    } catch (error) {
      console.warn('🌐 [UnifiedPresence] Global heartbeat exception:', error);
    }
  };
  
  // Initial update
  updateGlobalPresence();
  
  // Set up managed interval
  globalHeartbeatInterval = createManagedInterval(
    'unified-presence-heartbeat',
    updateGlobalPresence,
    30000, // 30 seconds
    'heartbeat'
  );
  
  console.log('🌐 [UnifiedPresence] Global heartbeat started');
};

const stopGlobalHeartbeat = async () => {
  if (globalHeartbeatInterval) {
    globalHeartbeatInterval();
    globalHeartbeatInterval = null;
  }
  
  if (currentUser?.id) {
    try {
      // Mark user offline in all spaces
      await getSupabaseClient()
        .from('space_members')
        .update({
          is_online: false,
          last_active_at: new Date().toISOString()
        })
        .eq('user_id', currentUser.id)
        .eq('status', 'active');
        
      console.log('🌐 [UnifiedPresence] User marked offline globally');
    } catch (error) {
      console.warn('🌐 [UnifiedPresence] Error marking user offline:', error);
    }
  }
  
  currentUser = null;
  console.log('🌐 [UnifiedPresence] Global heartbeat stopped');
};

// Create or get presence subscription for a space
const getOrCreateSpacePresence = (spaceId: string) => {
  if (globalPresenceState[spaceId]) {
    return globalPresenceState[spaceId];
  }
  
  const supabase = getSupabaseClient();
  const channel = supabase.channel(`unified-presence:${spaceId}`);
  
  const presenceData = {
    onlineUsers: new Set<string>(),
    subscription: channel,
    lastUpdate: Date.now(),
    listeners: new Set<(count: number, users: string[]) => void>()
  };
  
  const notifyListeners = () => {
    const count = presenceData.onlineUsers.size;
    const users = Array.from(presenceData.onlineUsers);
    presenceData.listeners.forEach(callback => {
      try {
        callback(count, users);
      } catch (error) {
        console.error('🌐 [UnifiedPresence] Listener error:', error);
      }
    });
  };
  
  const handlePresenceChange = () => {
    const presenceState = channel.presenceState<{user_id: string, is_online: boolean}>();
    const newOnlineUsers = new Set<string>();
    
    Object.values(presenceState).flat().forEach(p => {
      if (p.is_online && p.user_id) {
        newOnlineUsers.add(p.user_id);
      }
    });
    
    presenceData.onlineUsers = newOnlineUsers;
    presenceData.lastUpdate = Date.now();
    
    console.log(`🌐 [UnifiedPresence] Space ${spaceId}: ${newOnlineUsers.size} users online`);
    notifyListeners();
  };
  
  channel
    .on('presence', { event: 'sync' }, handlePresenceChange)
    .on('presence', { event: 'join' }, handlePresenceChange)
    .on('presence', { event: 'leave' }, handlePresenceChange)
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED' && currentUser?.id) {
        await channel.track({ user_id: currentUser.id, is_online: true });
        console.log(`🌐 [UnifiedPresence] Subscribed to space ${spaceId}`);
      }
    });
  
  globalPresenceState[spaceId] = presenceData;
  return presenceData;
};

// Clean up space presence when no longer needed
const cleanupSpacePresence = (spaceId: string) => {
  const presenceData = globalPresenceState[spaceId];
  if (!presenceData) return;
  
  if (presenceData.listeners.size === 0) {
    const supabase = getSupabaseClient();
    supabase.removeChannel(presenceData.subscription);
    delete globalPresenceState[spaceId];
    console.log(`🌐 [UnifiedPresence] Cleaned up presence for space ${spaceId}`);
  }
};

/**
 * Hook to subscribe to presence updates for a specific space
 * This is the single source of truth for online member counts
 */
export const useSpacePresence = (spaceId: string) => {
  const [onlineCount, setOnlineCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const { user } = useOptimizedAuth();
  
  useEffect(() => {
    if (!spaceId || !user?.id) {
      setOnlineCount(0);
      setOnlineUsers([]);
      return;
    }
    
    // Start global heartbeat if not already running
    startGlobalHeartbeat(user);
    
    // Get or create space presence
    const presenceData = getOrCreateSpacePresence(spaceId);
    
    // Create listener
    const listener = (count: number, users: string[]) => {
      setOnlineCount(count);
      setOnlineUsers(users);
    };
    
    // Add listener
    presenceData.listeners.add(listener);
    
    // Immediately call with current state
    listener(presenceData.onlineUsers.size, Array.from(presenceData.onlineUsers));
    
    // Cleanup function
    return () => {
      presenceData.listeners.delete(listener);
      cleanupSpacePresence(spaceId);
    };
  }, [spaceId, user?.id]);
  
  return { onlineCount, onlineUsers };
};

/**
 * Hook for global presence management
 * This should be used once at the app level
 */
export const useUnifiedPresence = () => {
  const { user } = useOptimizedAuth();
  const hasInitialized = useRef(false);
  
  useEffect(() => {
    if (!user?.id || hasInitialized.current) return;
    
    hasInitialized.current = true;
    
    // Start global heartbeat
    startGlobalHeartbeat(user);
    
    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopGlobalHeartbeat();
      } else {
        startGlobalHeartbeat(user);
      }
    };
    
    // Handle page unload
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable offline notification
      if (navigator.sendBeacon && typeof window !== 'undefined') {
        const formData = new FormData();
        formData.append('user_id', user.id);
        navigator.sendBeacon('https://nmddvthcsyppyjncqfsk.supabase.co/functions/v1/global-user-offline', formData);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      hasInitialized.current = false;
      stopGlobalHeartbeat();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Clean up all space subscriptions
      Object.keys(globalPresenceState).forEach(spaceId => {
        const presenceData = globalPresenceState[spaceId];
        if (presenceData.subscription) {
          getSupabaseClient().removeChannel(presenceData.subscription);
        }
        delete globalPresenceState[spaceId];
      });
    };
  }, [user?.id]);
  
  return { isInitialized: hasInitialized.current };
}; 