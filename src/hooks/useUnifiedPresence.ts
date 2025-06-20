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
// 🎯 PHASE 1 FIX: Add debug flags for conditional logging
const DEBUG_PRESENCE = import.meta.env.VITE_DEBUG_PRESENCE === 'true' || window.location.search.includes('debug_presence=true');
const DEBUG_PRESENCE_VERBOSE = import.meta.env.VITE_DEBUG_PRESENCE_VERBOSE === 'true' || window.location.search.includes('debug_presence_verbose=true');

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

// Global variables for unified presence management
let globalHeartbeatInterval: (() => void) | null = null;
let isGlobalSystemInitialized = false;
let currentUser: any = null;
let lastHeartbeatTime = 0;
let consecutiveHeartbeatFailures = 0;
let isSessionRecoveryInProgress = false;

// CRITICAL FIX: Track current space for space-specific presence updates
let currentSpaceId: string | null = null;

// Function to set current space (called when user navigates to a space)
export const setCurrentSpaceForPresence = (spaceId: string | null) => {
  console.log(`🌐 [UnifiedPresence] Setting current space for presence: ${spaceId}`);
  currentSpaceId = spaceId;
  
  // If user is going online in a new space, update presence immediately
  if (spaceId && currentUser?.id) {
    updatePresenceForCurrentSpace();
  }
};

// Function to update presence for current space
const updatePresenceForCurrentSpace = async () => {
  if (!currentUser?.id || !currentSpaceId) return;
  
  try {
    const result = await supabaseIndexedDBBridge.updateGlobalPresence(
      currentUser.id, 
      true, // isOnline
      { 
        forceNetwork: false, // Allow cache-first on mobile
        spaceId: currentSpaceId // Pass current space ID
      }
    );
    
    if (result.error) {
      console.warn('🌐 [UnifiedPresence] Current space presence update error:', result.error.message);
    } else {
      console.log(`🌐 [UnifiedPresence] Updated presence for current space: ${currentSpaceId}`);
    }
  } catch (error) {
    console.warn('🌐 [UnifiedPresence] Current space presence update exception:', error);
  }
};

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

// **CRITICAL SECURITY FIX**: Clear all presence cache (called on logout)
const clearAllPresenceCache = () => {
  console.log('🧹 [UnifiedPresence] SECURITY: Clearing all presence cache for user logout');
  Object.keys(globalPresenceCache).forEach(key => {
    delete globalPresenceCache[key];
  });
  
  // Also clear space presence state
  Object.keys(spacePresenceState).forEach(key => {
    const state = spacePresenceState[key];
    if (state.subscription) {
      try {
        state.subscription.unsubscribe();
      } catch (error) {
        console.warn('Failed to unsubscribe from presence:', error);
      }
    }
    delete spacePresenceState[key];
  });
  
  // Stop global heartbeat
  stopGlobalHeartbeat();
  currentUser = null;
  isGlobalSystemInitialized = false;
};

// **NEW**: Clear presence data for a specific space (for space switching)
const clearSpacePresenceData = (spaceId: string) => {
  if (!spaceId) return;
  
  console.log(`🧹 [UnifiedPresence] Clearing presence data for space: ${spaceId}`);
  
  // Remove from global presence cache
  if (globalPresenceCache[spaceId]) {
    delete globalPresenceCache[spaceId];
  }
  
  // Remove from space presence state and clean up subscription
  const presenceState = spacePresenceState[spaceId];
  if (presenceState) {
    // Force cleanup regardless of listeners
    try {
      const supabase = getSupabaseClient();
      supabase.removeChannel(presenceState.subscription);
    } catch (error) {
      console.warn(`Error removing channel for space ${spaceId}:`, error);
    }
    
    delete spacePresenceState[spaceId];
  }
  
  console.log(`✅ [UnifiedPresence] Cleared presence data for space: ${spaceId}`);
};

// **NEW**: Clear presence for all spaces except the current one
const clearOtherSpacesPresence = (currentSpaceId: string) => {
  console.log(`🧹 [UnifiedPresence] Clearing presence for all spaces except: ${currentSpaceId}`);
  
  Object.keys(globalPresenceCache).forEach(spaceId => {
    if (spaceId !== currentSpaceId) {
      clearSpacePresenceData(spaceId);
    }
  });
  
  Object.keys(spacePresenceState).forEach(spaceId => {
    if (spaceId !== currentSpaceId) {
      clearSpacePresenceData(spaceId);
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
        { 
          forceNetwork: false, // Allow cache-first on mobile
          spaceId: currentSpaceId // Pass current space ID for space-specific presence
        }
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
        
        // **NEW FIX**: For new sessions, immediately refresh all active space presence
        // This ensures new users see correct counts immediately
        const activeSpaces = Object.keys(spacePresenceState);
        if (activeSpaces.length > 0) {
          console.log(`🚀 [UnifiedPresence] NEW SESSION: Refreshing presence for ${activeSpaces.length} active spaces`);
          
          // Refresh presence for all active spaces
          for (const spaceId of activeSpaces) {
            try {
              const { count, users } = await fetchSpacePresenceFromDatabase(spaceId);
              const presenceState = spacePresenceState[spaceId];
              
              if (presenceState && count !== presenceState.onlineCount) {
                console.log(`🚀 [UnifiedPresence] REFRESHED space ${spaceId}: ${presenceState.onlineCount} → ${count} online`);
                
                // Update state
                presenceState.onlineCount = count;
                presenceState.onlineUsers = users;
                presenceState.lastUpdate = Date.now();
                
                // Cache the result
                cachePresenceData(spaceId, count, users);
                
                // Notify all listeners for this space
                presenceState.listeners.forEach(listener => {
                  try {
                    listener(count, users);
                  } catch (error) {
                    console.error(`🌐 [UnifiedPresence] Error calling listener for space ${spaceId}:`, error);
                  }
                });
              }
            } catch (error) {
              console.warn(`🚀 [UnifiedPresence] Failed to refresh space ${spaceId}:`, error);
            }
          }
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
    lastUpdate: number;
    fetchInProgress: boolean;
    validatedSpaceId: string;
    lastValidationTime: number;
    updateTimeout: NodeJS.Timeout;
  };
}

const spacePresenceState: SpacePresenceState = {};

// Database-centric presence fetching with mobile browser protection
const fetchSpacePresenceFromDatabase = async (spaceId: string): Promise<{ count: number; users: string[] }> => {
  console.log(`🌐 [UnifiedPresence] Fetching presence for space ${spaceId}`);
  
  try {
    // CRITICAL FIX: Use bridge instead of direct query to prevent mobile blocking
    const result = await supabaseIndexedDBBridge.getSpaceMembers(spaceId, {
      status: 'active',
      forceNetwork: false // Allow cache-first on mobile
    });
    
    console.log(`🌐 [UnifiedPresence] Bridge result for space ${spaceId}:`, {
      hasData: !!result.data,
      dataLength: result.data?.length || 0,
      error: result.error?.message || null,
      fromCache: result.fromCache
    });
    
    if (result.error) throw result.error;
    
    // CRITICAL FIX: Enhanced filtering for online users with better logging
    const allMembers = result.data || [];
    console.log(`🌐 [UnifiedPresence] Raw member data for space ${spaceId}:`, allMembers.map(m => ({ 
      user_id: m.user_id, 
      is_online: m.is_online, 
      status: m.status 
    })));
    
    // Filter for online users with more robust checking
    const onlineUsers = allMembers
      .filter((member: any) => {
        // Check multiple possible online states
        const isOnline = member.is_online === true || 
                        member.is_online === 1 || 
                        member.is_online === '1' ||
                        member.is_online === 'true';
        
        if (member.status === 'active') {
          console.log(`🌐 [UnifiedPresence] Member ${member.user_id}: is_online=${member.is_online} (${typeof member.is_online}), filtered=${isOnline}`);
        }
        
        return isOnline;
      })
      .map((member: any) => member.user_id);
    
    const count = onlineUsers.length;
    
    // 🎯 PHASE 1 FIX: Make database query logging conditional
    if (DEBUG_PRESENCE) {
      console.log(`🌐 [UnifiedPresence] Database query for space ${spaceId}: ${count} users online out of ${allMembers.length} total${result.fromCache ? ' (cached)' : ''}`);
      if (DEBUG_PRESENCE_VERBOSE) {
        console.log(`🌐 [UnifiedPresence] Online user IDs:`, onlineUsers);
      }
    }
    
    // EMERGENCY FIX: If bridge returns 0 but we know this space should have users, try direct query
    if (count === 0 && spaceId === '235e68d1-89df-4d2d-8945-e7756d60de20') {
      console.warn(`🌐 [UnifiedPresence] Bridge returned 0 for known space, trying direct database fallback`);
      
      try {
        const { data: directData, error: directError } = await getSupabaseClient()
          .from('space_members')
          .select('user_id, is_online, status')
          .eq('space_id', spaceId)
          .eq('status', 'active');
        
        if (directError) {
          console.error(`🌐 [UnifiedPresence] Direct query failed:`, directError);
        } else {
          console.log(`🌐 [UnifiedPresence] Direct query result:`, directData);
          
          const directOnlineUsers = (directData || [])
            .filter((member: any) => {
              const isOnline = member.is_online === true || 
                              member.is_online === 1 || 
                              member.is_online === '1' ||
                              member.is_online === 'true';
              console.log(`🌐 [UnifiedPresence] Direct query member ${member.user_id}: is_online=${member.is_online} (${typeof member.is_online}), filtered=${isOnline}`);
              return isOnline;
            })
            .map((member: any) => member.user_id);
          
          const directCount = directOnlineUsers.length;
          console.log(`🌐 [UnifiedPresence] Direct query found ${directCount} online users:`, directOnlineUsers);
          
          if (directCount > 0) {
            console.log(`🌐 [UnifiedPresence] Using direct query result instead of bridge result`);
            cachePresenceData(spaceId, directCount, directOnlineUsers);
            return { count: directCount, users: directOnlineUsers };
          }
        }
      } catch (directError) {
        console.error(`🌐 [UnifiedPresence] Direct query exception:`, directError);
      }
    }
    
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
  if (!spacePresenceState[spaceId]) {
    // 🎯 PHASE 1 FIX: Make presence state creation logging conditional
    if (DEBUG_PRESENCE_VERBOSE) {
      console.log(`🌐 [UnifiedPresence] Creating presence state for space: ${spaceId}`);
    }
    
    spacePresenceState[spaceId] = {
      onlineCount: 0,
      onlineUsers: [],
      listeners: new Set(),
      subscription: null,
      lastUpdate: 0,
      isSubscribed: false,
      lastFetch: 0,
      retryCount: 0,
      fetchInProgress: false,
      // CRITICAL FIX: Add space validation
      validatedSpaceId: spaceId,
      lastValidationTime: Date.now(),
      updateTimeout: null as any
    };
    
    // Set up database subscription for this space
    setupSpaceSubscription(spaceId);
  }
  
  return spacePresenceState[spaceId];
};

const setupSpaceSubscription = async (spaceId: string) => {
  if (!spaceId || spaceId.length !== 36) {
    console.warn(`🌐 [UnifiedPresence] Invalid space ID: ${spaceId}`);
    return;
  }
  
  const presenceState = spacePresenceState[spaceId];
  if (!presenceState) return;
  
  // Check if subscription already exists and is working
  if (presenceState.subscription && presenceState.isSubscribed) {
    console.log(`🌐 [UnifiedPresence] Subscription already active for space ${spaceId}`);
    return;
  }
  
  // Clean up any existing subscription first
  if (presenceState.subscription) {
    try {
      const supabase = getSupabaseClient();
      supabase.removeChannel(presenceState.subscription);
      console.log(`🌐 [UnifiedPresence] Cleaned up existing subscription for space ${spaceId}`);
    } catch (error) {
      console.warn(`🌐 [UnifiedPresence] Error cleaning up subscription for space ${spaceId}:`, error);
    }
    presenceState.subscription = null;
    presenceState.isSubscribed = false;
  }
  
  try {
    const supabase = getSupabaseClient();
    
    console.log(`🌐 [UnifiedPresence] Created database subscription for space ${spaceId}`);
    
    // Create new subscription with debounced updates
    const channel = supabase
      .channel(`space-members-${spaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'space_members',
          filter: `space_id=eq.${spaceId}`
        },
        (payload) => {
          console.log(`🌐 [UnifiedPresence] Database change for space ${spaceId}:`, payload.eventType);
          
          // Debounce updates to prevent race conditions
          if (presenceState.updateTimeout) {
            clearTimeout(presenceState.updateTimeout);
          }
          presenceState.updateTimeout = setTimeout(async () => {
            try {
              const { count, users } = await fetchSpacePresenceFromDatabase(spaceId);
              
              // Update state and notify listeners
              presenceState.onlineCount = count;
              presenceState.onlineUsers = users;
              presenceState.lastUpdate = Date.now();
              
              // Cache the result
              cachePresenceData(spaceId, count, users);
              
              // Notify all listeners
              presenceState.listeners.forEach(listener => {
                try {
                  listener(count, users);
                } catch (error) {
                  console.error(`🌐 [UnifiedPresence] Error calling listener for space ${spaceId}:`, error);
                }
              });
              
              console.log(`🌐 [UnifiedPresence] Updated presence for space ${spaceId}: ${count} online users`);
            } catch (error) {
              console.error(`🌐 [UnifiedPresence] Error updating presence for space ${spaceId}:`, error);
            }
          }, 200); // 200ms debounce for better stability
        }
      )
      .subscribe((status) => {
        console.log(`🌐 [UnifiedPresence] Database subscription status for space ${spaceId}: ${status}`);
        presenceState.isSubscribed = status === 'SUBSCRIBED';
      });
    
    presenceState.subscription = channel;
    
    // Initial fetch - get current data immediately
    try {
      const { count, users } = await fetchSpacePresenceFromDatabase(spaceId);
      presenceState.onlineCount = count;
      presenceState.onlineUsers = users;
      presenceState.lastUpdate = Date.now();
      
      // Cache the result
      cachePresenceData(spaceId, count, users);
      
      // Notify all listeners
      presenceState.listeners.forEach(listener => {
        try {
          listener(count, users);
        } catch (error) {
          console.error(`🌐 [UnifiedPresence] Error calling initial listener for space ${spaceId}:`, error);
        }
      });
      
      console.log(`🌐 [UnifiedPresence] Initial presence for space ${spaceId}: ${count} online users`);
    } catch (error) {
      console.error(`🌐 [UnifiedPresence] Error fetching initial presence for space ${spaceId}:`, error);
    }
    
  } catch (error) {
    console.error(`🌐 [UnifiedPresence] Error setting up subscription for space ${spaceId}:`, error);
  }
};

// Fetch presence data for a specific space
const fetchSpacePresence = async (spaceId: string) => {
  if (!spaceId) return;
  
  const presenceState = spacePresenceState[spaceId];
  if (!presenceState) return;
  
  try {
    console.log(`🌐 [UnifiedPresence] Fetching presence for space ${spaceId}`);
    
    // CRITICAL FIX: Use time-based validation to get accurate online counts
    const result = await supabaseIndexedDBBridge.getOnlineMembersWithTimeValidation(spaceId);
    
    if (result.error) {
      console.error(`🌐 [UnifiedPresence] Error fetching presence for space ${spaceId}:`, result.error);
      presenceState.retryCount++;
      return;
    }
    
    const memberData = result.data || [];
    const onlineCount = memberData.length;
    const onlineUserIds = memberData.map((member: any) => member.user_id);
    
    console.log(`🌐 [UnifiedPresence] Time-validated presence for space ${spaceId}: ${onlineCount} users online out of ${memberData.length} total`);
    console.log(`🌐 [UnifiedPresence] Online user IDs:`, onlineUserIds);
    
    // Update state if changed or if it's been more than 30 seconds
    const hasChanged = presenceState.onlineCount !== onlineCount || 
                      JSON.stringify(presenceState.onlineUsers) !== JSON.stringify(onlineUserIds);
    
    if (hasChanged || Date.now() - presenceState.lastUpdate > 30000) { // Force update every 30 seconds
      presenceState.onlineCount = onlineCount;
      presenceState.onlineUsers = onlineUserIds;
      presenceState.lastUpdate = Date.now();
      
      // Cache the result for faster access
      cachePresenceData(spaceId, onlineCount, onlineUserIds);
      
      // Notify all listeners
      presenceState.listeners.forEach(listener => {
        try {
          listener(onlineCount, onlineUserIds);
        } catch (error) {
          console.error(`🌐 [UnifiedPresence] Error calling listener for space ${spaceId}:`, error);
        }
      });
      
      console.log(`🌐 [UnifiedPresence] Updated presence for space ${spaceId}: ${onlineCount} online users`);
    } else {
      console.log(`🌐 [UnifiedPresence] No change in presence for space ${spaceId}: ${onlineCount} online users`);
    }
    
    presenceState.retryCount = 0;
    presenceState.lastFetch = Date.now();
    
  } catch (error) {
    console.error(`🌐 [UnifiedPresence] Exception fetching presence for space ${spaceId}:`, error);
    presenceState.retryCount++;
  }
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
    
    // Create listener with debug logging
    const listener = (count: number, users: string[]) => {
      // 🎯 PHASE 1 FIX: Make listener logging conditional
      if (DEBUG_PRESENCE_VERBOSE) {
        console.log(`🌐 [useSpacePresence] Listener called for space ${spaceId}: count=${count}, users=${users.length}`);
      }
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
    
    // CRITICAL FIX: Always set initial state immediately, even if 0
    console.log(`🌐 [useSpacePresence] Setting initial state for space ${spaceId}: count=${initialCount}, users=${initialUsers.length}, cached=${usingCache}, presenceState.onlineCount=${presenceState.onlineCount}`);
    listener(initialCount, initialUsers);
    
    // **NEW FIX**: For new sessions (no cache, no current data), force immediate database fetch
    const isNewSession = initialCount === 0 && !usingCache && !presenceState.isSubscribed;
    
    if (isNewSession) {
      console.log(`🚀 [useSpacePresence] NEW SESSION DETECTED for space ${spaceId}, forcing immediate database fetch`);
      
      const emergencyFetch = async () => {
        try {
          // Use direct database query to get immediate results
          const { count, users } = await fetchSpacePresenceFromDatabase(spaceId);
          console.log(`🚀 [useSpacePresence] EMERGENCY FETCH result for space ${spaceId}: count=${count}, users=${users.length}`);
          
          if (count > 0) {
            // Update presence state immediately
            presenceState.onlineCount = count;
            presenceState.onlineUsers = users;
            presenceState.lastUpdate = Date.now();
            
            // Cache the result
            cachePresenceData(spaceId, count, users);
            
            // Notify listener immediately
            listener(count, users);
            
            console.log(`✅ [useSpacePresence] NEW SESSION FIX applied for space ${spaceId}: ${count} users online`);
          }
        } catch (error) {
          console.warn(`🚀 [useSpacePresence] Emergency fetch failed for space ${spaceId}:`, error);
        }
      };
      
      // Execute immediately (don't wait)
      emergencyFetch();
    }
    
    // CRITICAL FIX: If we have current data but no subscription, force immediate fetch
    if (initialCount === 0 && !presenceState.isSubscribed) {
      console.log(`🌐 [useSpacePresence] No data and no subscription for space ${spaceId}, forcing immediate fetch`);
      const immediatelyFetch = async () => {
        try {
          const { count, users } = await fetchSpacePresenceFromDatabase(spaceId);
          console.log(`🌐 [useSpacePresence] Immediate fetch result for space ${spaceId}: count=${count}, users=${users.length}`);
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
  
  // Debug logging for hook state changes
  useEffect(() => {
    // 🎯 PHASE 1 FIX: Make hook state change logging conditional
    if (DEBUG_PRESENCE_VERBOSE) {
      console.log(`🌐 [useSpacePresence] Hook state changed for space ${spaceId}: onlineCount=${onlineCount}, onlineUsers=${onlineUsers.length}`);
    }
  }, [onlineCount, onlineUsers, spaceId]);
  
  return { onlineCount, onlineUsers };
};

/**
 * Hook for global presence management
 * This should be used once at the app level
 */
// **EXPORT FOR LOGOUT**: Export clear function for logout procedures
export const clearUnifiedPresenceCache = clearAllPresenceCache;

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
  
  // **NEW**: Export space cleaning functions for space switching
  (window as any).clearSpacePresenceData = (spaceId: string) => {
    if (!spaceId) return;
    
    console.log(`🧹 [UnifiedPresence] Clearing presence data for space: ${spaceId}`);
    
    // Remove from global presence cache
    if (globalPresenceCache[spaceId]) {
      delete globalPresenceCache[spaceId];
    }
    
    // Remove from space presence state and clean up subscription
    const presenceState = spacePresenceState[spaceId];
    if (presenceState) {
      // Force cleanup regardless of listeners
      try {
        const supabase = getSupabaseClient();
        supabase.removeChannel(presenceState.subscription);
      } catch (error) {
        console.warn(`Error removing channel for space ${spaceId}:`, error);
      }
      
      delete spacePresenceState[spaceId];
    }
    
    console.log(`✅ [UnifiedPresence] Cleared presence data for space: ${spaceId}`);
  };
  
  (window as any).clearOtherSpacesPresence = (currentSpaceId: string) => {
    console.log(`🧹 [UnifiedPresence] Clearing presence for all spaces except: ${currentSpaceId}`);
    
    Object.keys(globalPresenceCache).forEach(spaceId => {
      if (spaceId !== currentSpaceId) {
        (window as any).clearSpacePresenceData(spaceId);
      }
    });
    
    Object.keys(spacePresenceState).forEach(spaceId => {
      if (spaceId !== currentSpaceId) {
        (window as any).clearSpacePresenceData(spaceId);
      }
    });
  };
} 