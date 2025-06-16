/**
 * 🔧 UNIFIED DATABASE-CENTRIC PRESENCE SYSTEM - Phase 1 Enhanced
 * 
 * ARCHITECTURAL DECISION: Use database as single source of truth for online counts
 * - Real-time presence channels are unreliable and create race conditions
 * - Database `space_members.is_online` is authoritative and persistent
 * - Real-time subscriptions only listen for database changes
 * - Single heartbeat system prevents conflicts
 * - PHASE 1: Enhanced with mobile session recovery integration
 * 
 * This fixes the core issue where desktop shows 0 but mobile/database shows 2 users online.
 */

import { useState, useEffect, useRef } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { createManagedInterval } from '@/utils/pageVisibilityManager';
import { shouldEnableMobileFeatures } from '@/utils/mobileDetection';
import { supabaseIndexedDBBridge } from '@/utils/supabaseIndexedDBBridge';

// Cache for presence data to prevent excessive database queries
interface PresenceCache {
  [spaceId: string]: {
    count: number;
    users: string[];
    timestamp: number;
    preserved?: boolean;
  };
}

const globalPresenceCache: PresenceCache = {};
const CACHE_DURATION = 15000; // 15 seconds
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const MAX_CACHE_AGE = 300000; // 5 minutes

// PHASE 1: Enhanced global heartbeat state with session recovery
let globalHeartbeatInterval: (() => void) | null = null;
let currentUser: any = null;
let isGlobalSystemInitialized = false;
let lastHeartbeatTime = 0;
let consecutiveHeartbeatFailures = 0;
let isSessionRecoveryInProgress = false;

// Cache management functions
const cachePresenceData = (spaceId: string, count: number, users: string[]) => {
  globalPresenceCache[spaceId] = {
    count,
    users: [...users],
    timestamp: Date.now(),
    preserved: false
  };
};

const preservePresenceCache = (spaceId: string) => {
  if (globalPresenceCache[spaceId]) {
    globalPresenceCache[spaceId].preserved = true;
    globalPresenceCache[spaceId].timestamp = Date.now();
  }
};

const getCachedPresenceData = (spaceId: string) => {
  const cached = globalPresenceCache[spaceId];
  if (cached) {
    const age = Date.now() - cached.timestamp;
    const maxAge = cached.preserved ? 30000 : CACHE_DURATION;
    
    if (age < maxAge) {
      return { count: cached.count, users: [...cached.users] };
    }
  }
  return null;
};

// Clean up old cache entries
const cleanupOldCache = () => {
  const now = Date.now();
  Object.keys(globalPresenceCache).forEach(spaceId => {
    if (now - globalPresenceCache[spaceId].timestamp > MAX_CACHE_AGE) {
      delete globalPresenceCache[spaceId];
    }
  });
};

// PHASE 1: Enhanced global heartbeat with session recovery integration
const startGlobalHeartbeat = (user: any) => {
  if (globalHeartbeatInterval || !user?.id) {
    return;
  }
  
  currentUser = user;
  consecutiveHeartbeatFailures = 0;
  
  const updateGlobalPresence = async () => {
    if (!currentUser?.id) {
      stopGlobalHeartbeat();
      return;
    }
    
    try {
      // PHASE 1: Check if we're returning from mobile background
      const isMobileDevice = shouldEnableMobileFeatures();
      const timeSinceLastHeartbeat = Date.now() - lastHeartbeatTime;
      const isLongGap = timeSinceLastHeartbeat > 120000; // 2 minutes
      
      if (isMobileDevice && isLongGap && lastHeartbeatTime > 0) {
        console.log('🌐 [UnifiedPresence] Long heartbeat gap detected, checking session validity');
        
        // Quick session validation before heartbeat
        try {
          const { data: sessionData, error: sessionError } = await getSupabaseClient().auth.getSession();
          
          if (sessionError || !sessionData.session) {
            console.warn('🌐 [UnifiedPresence] Session invalid during heartbeat, triggering recovery');
            
            // Trigger mobile session recovery if available
            if (typeof window !== 'undefined' && (window as any).mobileSessionManager) {
              isSessionRecoveryInProgress = true;
              try {
                await (window as any).mobileSessionManager.validateSessionProactively();
                console.log('🌐 [UnifiedPresence] Session recovery completed, resuming heartbeat');
              } catch (recoveryError) {
                console.warn('🌐 [UnifiedPresence] Session recovery failed:', recoveryError);
                throw new Error('Session recovery failed');
              } finally {
                isSessionRecoveryInProgress = false;
              }
            } else {
              throw new Error('Session invalid and no recovery available');
            }
          }
        } catch (validationError) {
          console.warn('🌐 [UnifiedPresence] Session validation failed during heartbeat:', validationError);
          consecutiveHeartbeatFailures++;
          
          // If we've failed multiple times, stop heartbeat and let auth system handle it
          if (consecutiveHeartbeatFailures >= 3) {
            console.warn('🌐 [UnifiedPresence] Multiple heartbeat failures, stopping presence system');
            stopGlobalHeartbeat();
            return;
          }
          
          // Skip this heartbeat but continue trying
          return;
        }
      }
      
      // CRITICAL FIX: Use Supabase-IndexedDB bridge instead of direct call
      // This prevents "Fetch API cannot load" errors on mobile browsers
      const result = await supabaseIndexedDBBridge.updateGlobalPresence(
        currentUser.id, 
        true, // isOnline
        { forceNetwork: false } // Allow cache-first on mobile
      );
      
      if (result.error) {
        console.warn('🌐 [UnifiedPresence] Global heartbeat error:', result.error.message);
        consecutiveHeartbeatFailures++;
        
        // PHASE 1: Enhanced error handling with session recovery
        if (result.error.message.includes('JWT') || result.error.message.includes('auth') || result.error.message.includes('access')) {
          console.log('🌐 [UnifiedPresence] Auth-related heartbeat failure, checking session');
          
          if (isMobileDevice && typeof window !== 'undefined' && (window as any).mobileSessionManager && !isSessionRecoveryInProgress) {
            isSessionRecoveryInProgress = true;
            try {
              await (window as any).mobileSessionManager.validateSessionProactively();
              console.log('🌐 [UnifiedPresence] Session recovery triggered from presence heartbeat');
              consecutiveHeartbeatFailures = 0; // Reset on successful recovery
            } catch (recoveryError) {
              console.warn('🌐 [UnifiedPresence] Session recovery failed from presence:', recoveryError);
            } finally {
              isSessionRecoveryInProgress = false;
            }
          }
        }
      } else {
        lastHeartbeatTime = Date.now();
        consecutiveHeartbeatFailures = 0; // Reset on success
        
        console.log('🌐 [UnifiedPresence] Global heartbeat successful for user:', currentUser.id);
        
        // Clean up old cache entries periodically
        if (Math.random() < 0.1) { // 10% chance
          cleanupOldCache();
        }
      }
    } catch (error) {
      console.warn('🌐 [UnifiedPresence] Global heartbeat exception:', error);
      consecutiveHeartbeatFailures++;
      
      // PHASE 1: Enhanced exception handling
      if (consecutiveHeartbeatFailures >= 3) {
        console.warn('🌐 [UnifiedPresence] Multiple consecutive failures, stopping heartbeat for safety');
        stopGlobalHeartbeat();
      }
    }
  };
  
  // Initial update
  updateGlobalPresence();
  
  // Set up managed interval with enhanced monitoring
  globalHeartbeatInterval = createManagedInterval(
    'unified-presence-heartbeat',
    updateGlobalPresence,
    HEARTBEAT_INTERVAL,
    'heartbeat'
  );
  
  console.log('🌐 [UnifiedPresence] Database-centric heartbeat started for user:', user.id);
  lastHeartbeatTime = Date.now();
};

const stopGlobalHeartbeat = async () => {
  if (globalHeartbeatInterval) {
    globalHeartbeatInterval();
    globalHeartbeatInterval = null;
  }
  
  if (currentUser?.id) {
    try {
      // CRITICAL FIX: Use bridge instead of direct call to prevent mobile blocking
      const result = await supabaseIndexedDBBridge.updateGlobalPresence(
        currentUser.id, 
        false, // isOnline = false
        { forceNetwork: false } // Allow cache-first on mobile
      );
      
      if (result.error) {
        console.warn('🌐 [UnifiedPresence] Error marking user offline:', result.error);
      } else {
        console.log('🌐 [UnifiedPresence] User marked offline globally:', currentUser.id);
      }
    } catch (error) {
      console.warn('🌐 [UnifiedPresence] Error marking user offline:', error);
    }
  }
  
  currentUser = null;
  lastHeartbeatTime = 0;
  consecutiveHeartbeatFailures = 0;
  isSessionRecoveryInProgress = false;
  console.log('🌐 [UnifiedPresence] Global heartbeat stopped');
};

// Space-specific presence state
interface SpacePresenceState {
  [spaceId: string]: {
    onlineCount: number;
    onlineUsers: string[];
    listeners: Set<(count: number, users: string[]) => void>;
    subscription: any;
    isSubscribed: boolean;
    lastFetch: number;
    retryCount: number;
  };
}

const spacePresenceState: SpacePresenceState = {};

// Database-centric presence fetching with mobile browser protection
const fetchSpacePresenceFromDatabase = async (spaceId: string): Promise<{ count: number; users: string[] }> => {
  try {
    // CRITICAL FIX: Use bridge instead of direct query to prevent mobile blocking
    const result = await supabaseIndexedDBBridge.getSpaceMembers(spaceId, {
      status: 'active',
      forceNetwork: false // Allow cache-first on mobile
    });
    
    if (result.error) throw result.error;
    
    // Filter for online users and extract user_ids
    const onlineUsers = (result.data || [])
      .filter((member: any) => member.is_online === true)
      .map((member: any) => member.user_id);
    
    const count = onlineUsers.length;
    
    console.log(`🌐 [UnifiedPresence] Database query for space ${spaceId}: ${count} users online${result.fromCache ? ' (cached)' : ''}`);
    
    // Cache the result
    cachePresenceData(spaceId, count, onlineUsers);
    
    return { count, users: onlineUsers };
  } catch (error) {
    console.error(`🌐 [UnifiedPresence] Database query failed for space ${spaceId}:`, error);
    
    // Return cached data if available
    const cached = getCachedPresenceData(spaceId);
    if (cached) {
      console.log(`🌐 [UnifiedPresence] Using cached data for space ${spaceId}: ${cached.count} users`);
      return cached;
    }
    
    throw error;
  }
};

// Get or create space presence subscription
const getOrCreateSpacePresence = (spaceId: string) => {
  if (spacePresenceState[spaceId]) {
    return spacePresenceState[spaceId];
  }
  
  const supabase = getSupabaseClient();
  const channel = supabase.channel(`db-presence:${spaceId}`);
  
  const presenceState = {
    onlineCount: 0,
    onlineUsers: [],
    listeners: new Set<(count: number, users: string[]) => void>(),
    subscription: channel,
    isSubscribed: false,
    lastFetch: 0,
    retryCount: 0
  };
  
  const notifyListeners = (count: number, users: string[]) => {
    presenceState.onlineCount = count;
    presenceState.onlineUsers = users;
    
    presenceState.listeners.forEach(callback => {
      try {
        callback(count, users);
      } catch (error) {
        console.error('🌐 [UnifiedPresence] Listener error:', error);
      }
    });
  };
  
  const refreshPresenceData = async () => {
    try {
      const { count, users } = await fetchSpacePresenceFromDatabase(spaceId);
      notifyListeners(count, users);
    } catch (error) {
      console.error(`🌐 [UnifiedPresence] Failed to refresh presence for space ${spaceId}:`, error);
    }
  };
  
  // Listen for database changes (real-time notifications)
  channel
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'space_members',
      filter: `space_id=eq.${spaceId}`
    }, () => {
      console.log(`🌐 [UnifiedPresence] Database change detected for space ${spaceId}, refreshing...`);
      refreshPresenceData();
    })
    .subscribe(async (status) => {
      console.log(`🌐 [UnifiedPresence] Database subscription status for space ${spaceId}: ${status}`);
      
      if (status === 'SUBSCRIBED') {
        presenceState.isSubscribed = true;
        presenceState.retryCount = 0;
        
        // Initial fetch from database
        await refreshPresenceData();
        
        console.log(`🌐 [UnifiedPresence] Database subscription active for space ${spaceId}`);
      } else if (status === 'CHANNEL_ERROR') {
        presenceState.isSubscribed = false;
        presenceState.retryCount++;
        
        if (presenceState.retryCount < 3) {
          console.warn(`🌐 [UnifiedPresence] Retrying subscription for space ${spaceId} (attempt ${presenceState.retryCount})`);
          setTimeout(() => {
            delete spacePresenceState[spaceId];
          }, 1000);
        } else {
          console.error(`🌐 [UnifiedPresence] Max retries exceeded for space ${spaceId}`);
          delete spacePresenceState[spaceId];
        }
      }
    });
  
  spacePresenceState[spaceId] = presenceState;
  console.log(`🌐 [UnifiedPresence] Created database subscription for space ${spaceId}`);
  return presenceState;
};

// Cleanup space presence
const cleanupSpacePresence = (spaceId: string) => {
  const presenceState = spacePresenceState[spaceId];
  if (!presenceState || presenceState.listeners.size > 0) return;
  
  try {
    const supabase = getSupabaseClient();
    
    // Preserve cache before cleanup
    if (presenceState.onlineCount > 0) {
      preservePresenceCache(spaceId);
    }
    
    // Remove the channel
    supabase.removeChannel(presenceState.subscription);
    
    delete spacePresenceState[spaceId];
    console.log(`🌐 [UnifiedPresence] Cleaned up database subscription for space ${spaceId}`);
  } catch (error) {
    console.error(`🌐 [UnifiedPresence] Error cleaning up space ${spaceId}:`, error);
    delete spacePresenceState[spaceId];
  }
};

/**
 * Hook to subscribe to presence updates for a specific space
 * Database-centric approach with real-time updates via database subscriptions
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
    
    // Ensure global system is initialized
    if (!isGlobalSystemInitialized) {
      startGlobalHeartbeat(user);
      isGlobalSystemInitialized = true;
    }
    
    // Get or create space presence
    const presenceState = getOrCreateSpacePresence(spaceId);
    
    // Create listener
    const listener = (count: number, users: string[]) => {
      setOnlineCount(count);
      setOnlineUsers(users);
    };
    
    // Add listener
    presenceState.listeners.add(listener);
    
    // Determine initial state - prioritize cached data
    const cachedData = getCachedPresenceData(spaceId);
    const currentCount = presenceState.onlineCount;
    const currentUsers = presenceState.onlineUsers;
    
    let initialCount = currentCount;
    let initialUsers = currentUsers;
    let usingCache = false;
    
    if (cachedData && (currentCount === 0 || cachedData.count > currentCount)) {
      initialCount = cachedData.count;
      initialUsers = cachedData.users;
      usingCache = true;
      console.log(`🌐 [UnifiedPresence] Using cached data for space ${spaceId}: ${cachedData.count} users`);
    }
    
    // Set initial state
    listener(initialCount, initialUsers);
    
    // If not using cache and subscription isn't ready, fetch immediately
    if (!usingCache && !presenceState.isSubscribed) {
      const immediatelyFetch = async () => {
        try {
          const { count, users } = await fetchSpacePresenceFromDatabase(spaceId);
          listener(count, users);
        } catch (error) {
          console.warn(`🌐 [UnifiedPresence] Immediate fetch failed for space ${spaceId}:`, error);
        }
      };
      
      immediatelyFetch();
    }
    
    console.log(`🌐 [UnifiedPresence] Added listener for space ${spaceId}, initial count: ${initialCount} (cached: ${usingCache})`);
    
    // Cleanup function
    return () => {
      presenceState.listeners.delete(listener);
      console.log(`🌐 [UnifiedPresence] Removed listener for space ${spaceId}, ${presenceState.listeners.size} remaining`);
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
    if (!user?.id) {
      // User logged out, clean up everything
      if (hasInitialized.current) {
        stopGlobalHeartbeat();
        isGlobalSystemInitialized = false;
        hasInitialized.current = false;
        
        // Clean up all space subscriptions
        Object.keys(spacePresenceState).forEach(spaceId => {
          const presenceState = spacePresenceState[spaceId];
          if (presenceState.subscription) {
            try {
              getSupabaseClient().removeChannel(presenceState.subscription);
            } catch (error) {
              console.warn(`Error removing channel for space ${spaceId}:`, error);
            }
          }
          delete spacePresenceState[spaceId];
        });
        
        console.log('🌐 [UnifiedPresence] Cleaned up all subscriptions due to logout');
      }
      return;
    }
    
    if (hasInitialized.current) return;
    
    hasInitialized.current = true;
    
    // Start global heartbeat
    startGlobalHeartbeat(user);
    isGlobalSystemInitialized = true;
    
    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('🌐 [UnifiedPresence] Page hidden, stopping heartbeat');
        stopGlobalHeartbeat();
      } else {
        console.log('🌐 [UnifiedPresence] Page visible, restarting heartbeat');
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
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user?.id]);
  
  return { isInitialized: hasInitialized.current };
};

// Debugging tools
if (typeof window !== 'undefined') {
  (window as any).getUnifiedPresenceState = () => {
    const state = Object.entries(spacePresenceState).map(([spaceId, data]) => ({
      spaceId,
      onlineCount: data.onlineCount,
      onlineUsers: data.onlineUsers,
      isSubscribed: data.isSubscribed,
      listenerCount: data.listeners.size,
      retryCount: data.retryCount
    }));
    console.table(state);
    return state;
  };
  
  (window as any).getPresenceCache = () => {
    console.table(globalPresenceCache);
    return globalPresenceCache;
  };
  
  (window as any).refreshSpacePresence = async (spaceId: string) => {
    try {
      const result = await fetchSpacePresenceFromDatabase(spaceId);
      console.log(`Refreshed space ${spaceId}:`, result);
      return result;
    } catch (error) {
      console.error(`Failed to refresh space ${spaceId}:`, error);
      throw error;
    }
  };
} 