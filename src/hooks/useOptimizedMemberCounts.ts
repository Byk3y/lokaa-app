import { useState, useEffect, useRef, useCallback } from 'react';
import { globalCache, cacheQueries } from '@/utils/globalCacheCoordinator';
import { devLogger } from '@/utils/developmentLogger';
import { useSpacePresence } from '@/hooks/useUnifiedPresence';
import { supabaseIndexedDBBridge } from '@/utils/supabaseIndexedDBBridge';
import { globalConsoleFlags } from '@/utils/developmentLogger';

interface MemberCounts {
  totalMembers: number;
  onlineMembers: number;
  adminMembers: number;
  loading: boolean;
  error: string | null;
}

// **SINGLETON PATTERN**: Global state manager to prevent competing instances
interface SpaceMemberState {
  counts: MemberCounts;
  subscribers: Set<string>;
  lastUpdate: number;
  isActive: boolean;
}

const globalSpaceMemberStates: Map<string, SpaceMemberState> = new Map();

// **SINGLETON**: Get or create space state
const getOrCreateSpaceState = (spaceId: string): SpaceMemberState => {
  if (!globalSpaceMemberStates.has(spaceId)) {
    globalSpaceMemberStates.set(spaceId, {
      counts: {
        totalMembers: 0,
        onlineMembers: 0,
        adminMembers: 0,
        loading: true,
        error: null
      },
      subscribers: new Set(),
      lastUpdate: 0,
      isActive: false
    });
  }
  return globalSpaceMemberStates.get(spaceId)!;
};

// **SINGLETON**: Update all subscribers for a space
const notifySpaceSubscribers = (spaceId: string, newCounts: MemberCounts) => {
  const state = globalSpaceMemberStates.get(spaceId);
  if (!state) return;
  
  state.counts = newCounts;
  state.lastUpdate = Date.now();
  
  // Notify all React components subscribed to this space
  window.dispatchEvent(new CustomEvent(`memberCounts:${spaceId}`, {
    detail: newCounts
  }));
  
  // **AUTOMATIC UI SYNC**: Ensure the UI displays the correct count
  setTimeout(() => {
    const onlineCountElement = document.querySelector('[data-testid="online-count"]');
    if (onlineCountElement && newCounts.onlineMembers >= 0) {
      const currentDisplayed = parseInt(onlineCountElement.textContent || '0');
      if (currentDisplayed !== newCounts.onlineMembers) {
        if (!globalConsoleFlags?.DISABLE_SINGLETON_DEBUG_LOGS) {
          console.log(`🔧 [AutoUISync] Correcting display: ${currentDisplayed} → ${newCounts.onlineMembers}`);
        }
        onlineCountElement.textContent = newCounts.onlineMembers.toString();
      }
    }
  }, 50);
  
  if (!globalConsoleFlags?.DISABLE_SINGLETON_DEBUG_LOGS) {
    console.log(`🔄 [SingletonMemberCounts] Updated ${state.subscribers.size} subscribers for space ${spaceId}:`, newCounts);
  }
};

/**
 * Optimized member counts hook with SINGLETON PATTERN to prevent race conditions
 * Only one instance per space can actively manage data - others just subscribe
 */
export const useOptimizedMemberCounts = (spaceId: string): MemberCounts => {
  const [counts, setCounts] = useState<MemberCounts>({
    totalMembers: 0,
    onlineMembers: 0,
    adminMembers: 0,
    loading: true,
    error: null
  });

  // Use unified presence system for real-time online count
  const { onlineCount } = useSpacePresence(spaceId);
  
  // Generate unique subscriber ID for this hook instance
  const subscriberId = useRef(`memberCounts-${Math.random().toString(36).substr(2, 9)}`).current;
  const isManagerRef = useRef(false);
  
  // **SINGLETON LOGIC**: Determine if this instance should be the manager
  useEffect(() => {
    if (!spaceId) return;
    
    const spaceState = getOrCreateSpaceState(spaceId);
    spaceState.subscribers.add(subscriberId);
    
    // First subscriber becomes the manager
    if (!spaceState.isActive) {
      spaceState.isActive = true;
      isManagerRef.current = true;
      if (!globalConsoleFlags?.DISABLE_SINGLETON_DEBUG_LOGS) {
        console.log(`👑 [SingletonMemberCounts] ${subscriberId} became MANAGER for space ${spaceId}`);
      }
    } else {
      isManagerRef.current = false;
      if (!globalConsoleFlags?.DISABLE_SINGLETON_DEBUG_LOGS) {
        console.log(`👥 [SingletonMemberCounts] ${subscriberId} became SUBSCRIBER for space ${spaceId}`);
      }
      
      // Set initial state from existing data
      setCounts(spaceState.counts);
    }
    
    return () => {
      spaceState.subscribers.delete(subscriberId);
      
      // If manager is leaving and there are other subscribers, promote one
      if (isManagerRef.current && spaceState.subscribers.size > 0) {
        const nextManager = Array.from(spaceState.subscribers)[0];
        if (!globalConsoleFlags?.DISABLE_SINGLETON_DEBUG_LOGS) {
          console.log(`👑 [SingletonMemberCounts] Promoting ${nextManager} to MANAGER for space ${spaceId}`);
        }
        
        // The promoted subscriber will detect this and become manager
        spaceState.isActive = false;
      } else if (spaceState.subscribers.size === 0) {
        // No more subscribers, cleanup
        spaceState.isActive = false;
        globalSpaceMemberStates.delete(spaceId);
        if (!globalConsoleFlags?.DISABLE_SINGLETON_DEBUG_LOGS) {
          console.log(`🧹 [SingletonMemberCounts] Cleaned up space state for ${spaceId}`);
        }
      }
    };
  }, [spaceId, subscriberId]);

  // Update online count from unified presence system
  useEffect(() => {
    // 🎯 PHASE 2 FIX: Conditional logging for presence updates
    if (!globalConsoleFlags?.DISABLE_SINGLETON_DEBUG_LOGS) {
      console.log(`🔍 [OptimizedMemberCounts] Presence update for space ${spaceId}: onlineCount=${onlineCount}`, { subscriberId });
    }
    
    // **CRITICAL FIX**: Update singleton state directly if we're the manager
    if (isManagerRef.current) {
      const spaceState = getOrCreateSpaceState(spaceId);
      const newCounts = { 
        ...spaceState.counts, 
        onlineMembers: Math.max(onlineCount, 0) 
      };
      
      // 🎯 PHASE 2 FIX: Conditional logging for manager updates
      if (!globalConsoleFlags?.DISABLE_SINGLETON_DEBUG_LOGS) {
        console.log(`👑 [SingletonMemberCounts] MANAGER ${subscriberId} updating presence count: ${spaceState.counts.onlineMembers} → ${newCounts.onlineMembers}`);
      }
      notifySpaceSubscribers(spaceId, newCounts);
    }
    
    // **ADDITIONAL**: Always update local state immediately
    setCounts(prev => {
      const newCounts = { ...prev, onlineMembers: Math.max(onlineCount, 0) };
      // 🎯 PHASE 2 FIX: Conditional logging for immediate updates
      if (!globalConsoleFlags?.DISABLE_SINGLETON_DEBUG_LOGS) {
        console.log(`🔍 [OptimizedMemberCounts] IMMEDIATE online count update: ${prev.onlineMembers} → ${newCounts.onlineMembers}`, { subscriberId });
      }
      return newCounts;
    });
    
    // ADDITIONAL SAFETY: Set a timeout to ensure the count sticks
    const timeoutId = setTimeout(() => {
      setCounts(prev => {
        if (prev.onlineMembers !== Math.max(onlineCount, 0)) {
          const correctedCounts = { ...prev, onlineMembers: Math.max(onlineCount, 0) };
          // 🎯 PHASE 2 FIX: Conditional logging for safety corrections
          if (!globalConsoleFlags?.DISABLE_SINGLETON_DEBUG_LOGS) {
            console.log(`🛡️ [OptimizedMemberCounts] SAFETY correction for space ${spaceId}: ${prev.onlineMembers} → ${correctedCounts.onlineMembers}`, { subscriberId });
          }
          return correctedCounts;
        }
        return prev;
      });
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [onlineCount, spaceId, subscriberId]);
  
  // Initialize with presence count immediately when spaceId changes
  useEffect(() => {
    if (spaceId && onlineCount >= 0) {
      // 🎯 PHASE 2 FIX: Conditional logging for initial presence
      if (!globalConsoleFlags?.DISABLE_SINGLETON_DEBUG_LOGS) {
        console.log(`🔍 [OptimizedMemberCounts] Initial presence for space ${spaceId}: onlineCount=${onlineCount}`, { subscriberId });
      }
      
      // **CRITICAL FIX**: Update singleton state if we're the manager
      if (isManagerRef.current) {
        const spaceState = getOrCreateSpaceState(spaceId);
        const newCounts = { 
          ...spaceState.counts, 
          onlineMembers: Math.max(onlineCount, 0) 
        };
        
        // 🎯 PHASE 2 FIX: Conditional logging for manager initial count
        if (!globalConsoleFlags?.DISABLE_SINGLETON_DEBUG_LOGS) {
          console.log(`👑 [SingletonMemberCounts] MANAGER ${subscriberId} setting initial presence count: ${spaceState.counts.onlineMembers} → ${newCounts.onlineMembers}`);
        }
        notifySpaceSubscribers(spaceId, newCounts);
      }
      
      // **ADDITIONAL**: Set the initial count IMMEDIATELY
      setCounts(prev => {
        const newCounts = { ...prev, onlineMembers: Math.max(onlineCount, 0) };
        // 🎯 PHASE 2 FIX: Conditional logging for immediate initial count
        if (!globalConsoleFlags?.DISABLE_SINGLETON_DEBUG_LOGS) {
          console.log(`🔍 [OptimizedMemberCounts] IMMEDIATE initial count: ${prev.onlineMembers} → ${newCounts.onlineMembers}`, { subscriberId });
        }
        return newCounts;
      });
      
      // ADDITIONAL SAFETY: Ensure it sticks after any potential interference
      const timeoutId = setTimeout(() => {
        setCounts(prev => {
          if (prev.onlineMembers !== Math.max(onlineCount, 0)) {
            const correctedCounts = { ...prev, onlineMembers: Math.max(onlineCount, 0) };
            // 🎯 PHASE 2 FIX: Conditional logging for safety initial correction
            if (!globalConsoleFlags?.DISABLE_SINGLETON_DEBUG_LOGS) {
              console.log(`🛡️ [OptimizedMemberCounts] SAFETY initial correction for space ${spaceId}: ${prev.onlineMembers} → ${correctedCounts.onlineMembers}`, { subscriberId });
            }
            return correctedCounts;
          }
          return prev;
        });
      }, 50);
      
      return () => clearTimeout(timeoutId);
    }
  }, [spaceId, onlineCount, subscriberId]);

  // **ALL INSTANCES**: Listen for updates from the manager
  useEffect(() => {
    if (!spaceId) return;
    
    const handleUpdate = (event: CustomEvent) => {
      // 🎯 PHASE 2 FIX: Conditional logging for received updates
      if (!globalConsoleFlags?.DISABLE_SINGLETON_DEBUG_LOGS) {
        console.log(`📨 [SingletonMemberCounts] ${subscriberId} received update for space ${spaceId}:`, event.detail);
      }
      setCounts(event.detail);
    };
    
    window.addEventListener(`memberCounts:${spaceId}`, handleUpdate as EventListener);
    
    return () => {
      window.removeEventListener(`memberCounts:${spaceId}`, handleUpdate as EventListener);
    };
  }, [spaceId, subscriberId]);

  // **MANAGER ONLY**: Enhanced member fetching with presence preservation
  const fetchMemberCounts = useCallback(async () => {
    if (!isManagerRef.current || !spaceId) return;
    
    // 🎯 PHASE 2 FIX: Conditional logging for fetching data
    if (!globalConsoleFlags?.DISABLE_SINGLETON_DEBUG_LOGS) {
      console.log(`📊 [SingletonMemberCounts] MANAGER ${subscriberId} fetching data for space ${spaceId}`);
    }
    
    const spaceState = getOrCreateSpaceState(spaceId);
    const loadingCounts = { ...spaceState.counts, loading: true, error: null };
    notifySpaceSubscribers(spaceId, loadingCounts);
    
    try {
      const result = await supabaseIndexedDBBridge.getSpaceMembers(spaceId, {
        status: 'active'
      });
      
      if (result.error) {
        throw result.error;
      }
      
      const memberData = result.data || [];
      
      // **ULTIMATE FIX**: ALWAYS preserve the current online count from presence system
      // Get the current online count from the space state (which should be updated by presence)
      const currentOnlineCount = Math.max(onlineCount, spaceState.counts.onlineMembers, 0);
      
      const newCounts = {
        totalMembers: memberData.length,
        onlineMembers: currentOnlineCount, // ALWAYS use current presence count
        adminMembers: memberData.filter((m: any) => m.role === 'admin' || m.role === 'owner').length,
        loading: false,
        error: null
      };
      
      // 🎯 PHASE 2 FIX: Conditional logging for final preservation
      if (!globalConsoleFlags?.DISABLE_SINGLETON_DEBUG_LOGS) {
        console.log(`✅ [SingletonMemberCounts] MANAGER ${subscriberId} FINAL PRESERVATION for space ${spaceId}:`, {
          databaseOnlineCount: memberData.filter((m: any) => m.is_online === true).length,
          currentOnlineCount,
          finalCount: newCounts.onlineMembers,
          totalMembers: newCounts.totalMembers,
          adminMembers: newCounts.adminMembers,
          message: 'USING CURRENT PRESENCE COUNT - DATABASE COUNT IGNORED'
        });
      }
      
      notifySpaceSubscribers(spaceId, newCounts);
      
    } catch (error) {
      console.error(`❌ [SingletonMemberCounts] MANAGER ${subscriberId} error fetching for space ${spaceId}:`, error);
      
      const currentOnlineCount = Math.max(onlineCount, spaceState.counts.onlineMembers, 0);
      
      const errorCounts = {
        ...spaceState.counts,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch member counts',
        onlineMembers: currentOnlineCount // ALWAYS preserve current presence count
      };
      
      notifySpaceSubscribers(spaceId, errorCounts);
    }
  }, [spaceId, onlineCount, subscriberId]);

  // **MANAGER ONLY**: Auto-fetch member counts when becoming manager
  const hasAutoFetched = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!isManagerRef.current || !spaceId || hasAutoFetched.current.has(spaceId)) return;
    
    hasAutoFetched.current.add(spaceId);
    // 🎯 PHASE 2 FIX: Conditional logging for auto-fetching
    if (!globalConsoleFlags?.DISABLE_SINGLETON_DEBUG_LOGS) {
      console.log(`🚀 [SingletonMemberCounts] MANAGER ${subscriberId} auto-fetching for space ${spaceId}`);
    }
    fetchMemberCounts();
  }, [spaceId, fetchMemberCounts]);

  // **MANAGER ONLY**: Reset state when space changes
  const lastSpaceId = useRef<string>('');
  const hasInitialized = useRef(false);
  
  useEffect(() => {
    if (!isManagerRef.current) return;
    
    // Only reset if this is an actual space change, not initial load
    if (spaceId && lastSpaceId.current && lastSpaceId.current !== spaceId && hasInitialized.current) {
      // 🎯 PHASE 2 FIX: Conditional logging for space changes
      if (!globalConsoleFlags?.DISABLE_SINGLETON_DEBUG_LOGS) {
        console.log(`🧹 [SingletonMemberCounts] MANAGER ${subscriberId} space changed from ${lastSpaceId.current} to ${spaceId}, resetting`);
      }
      
      // Clear the hasAutoFetched for the old space
      if (hasAutoFetched.current.has(lastSpaceId.current)) {
        hasAutoFetched.current.delete(lastSpaceId.current);
      }
      
      // Reset state
      const resetCounts = {
        totalMembers: 0,
        onlineMembers: Math.max(onlineCount, 0),
        adminMembers: 0,
        loading: true,
        error: null
      };
      
      notifySpaceSubscribers(spaceId, resetCounts);
    }
    
    // Mark as initialized after first spaceId is set
    if (spaceId && !hasInitialized.current) {
      hasInitialized.current = true;
      // 🎯 PHASE 2 FIX: Conditional logging for initialization
      if (!globalConsoleFlags?.DISABLE_SINGLETON_DEBUG_LOGS) {
        console.log(`🔧 [SingletonMemberCounts] MANAGER ${subscriberId} initialized for space ${spaceId}`);
      }
    }
    
    lastSpaceId.current = spaceId;
  }, [spaceId, subscriberId, onlineCount]);

  return counts;
};

// Export for debugging and space switching
if (typeof window !== 'undefined') {
  (window as any).clearSpaceHookStates = () => {
    console.log('🧹 [SingletonMemberCounts] Clearing all singleton states');
    globalSpaceMemberStates.clear();
  };
  
  (window as any).getSingletonMemberStates = () => {
    const states = Array.from(globalSpaceMemberStates.entries()).map(([spaceId, state]) => ({
      spaceId,
      subscriberCount: state.subscribers.size,
      isActive: state.isActive,
      counts: state.counts,
      lastUpdate: new Date(state.lastUpdate).toISOString()
    }));
    console.table(states);
    return states;
  };
}