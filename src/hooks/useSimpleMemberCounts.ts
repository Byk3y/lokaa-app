/**
 * 🚀 SIMPLE MEMBER COUNTS SYSTEM
 * 
 * Replaces the complex 407-line useOptimizedMemberCounts.ts singleton system
 * with a clean, straightforward approach that leverages the new simple presence system.
 * 
 * Key simplifications:
 * - No singleton pattern complexity
 * - No race condition workarounds  
 * - No custom event system
 * - Uses simple presence hook for online counts
 * - Direct database queries with React Query caching
 * 
 * INCOGNITO MODE FIX: Enhanced initialization and error handling
 * UNAUTHENTICATED FIX: Uses public function for space preview modals
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useSimpleSpacePresence } from './useSimpleSpacePresence';
import { useTabVisibility } from '@/contexts/TabVisibilityContext';
import { debounce } from '@/utils/debounce';

interface MemberCounts {
  totalMembers: number;
  adminMembers: number;
  onlineMembers: number;
  loading: boolean;
}

// Member counts cache to preserve state on tab returns
const memberCountsCache = new Map<string, { data: Omit<MemberCounts, 'onlineMembers'>, timestamp: number }>();

// Singleton pattern to prevent multiple hook instances for the same spaceId
const activeMemberCountInstances = new Map<string, boolean>();

const debugMemberCounts = (message: string, data: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔢 [SimpleMemberCounts] ${message}:`, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 🚀 Simple hook for getting member counts with automatic fallback for unauthenticated users
 */
export const useSimpleMemberCounts = (spaceId: string): MemberCounts => {
  const [counts, setCounts] = useState<MemberCounts>({
    totalMembers: 0,
    adminMembers: 0,
    onlineMembers: 0,
    loading: true
  });

  const lastFetchRef = useRef<number>(0);
  const fetchTimeoutRef = useRef<any>(null);
  const mountedRef = useRef(true);
  
  // Safe tab visibility hook usage
  let tabVisibility: ReturnType<typeof useTabVisibility> | null = null;
  try {
    tabVisibility = useTabVisibility();
  } catch (error) {
    // TabVisibilityProvider not available, use null checks
    tabVisibility = null;
  }

  // Get online count and loading from presence system
  const { onlineCount, loading: presenceLoading } = useSimpleSpacePresence(spaceId);

  const fetchCounts = useCallback(async () => {
    if (!spaceId || !mountedRef.current) return;

    try {
      debugMemberCounts('Fetching member counts', { spaceId });
      
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('space_members')
        .select('role')
        .eq('space_id', spaceId)
        .eq('status', 'active');

      if (error) {
        console.error('Error fetching member counts:', error);
        if (mountedRef.current) {
          setCounts(prev => ({ ...prev, loading: false }));
        }
        return;
      }

      const totalCount = data?.length || 0;
      const adminCount = data?.filter(member => member.role === 'admin')?.length || 0;

      debugMemberCounts('Successfully fetched counts', {
        spaceId,
        totalCount,
        adminCount,
        onlineCount,
        presenceLoading
      });

      lastFetchRef.current = Date.now();

      // FIXED: Only update total/admin counts, preserve current online count from presence
      if (mountedRef.current) {
        setCounts(prev => ({
          totalMembers: totalCount,
          adminMembers: adminCount,
          onlineMembers: prev.onlineMembers, // Preserve current online count from presence
          loading: false
        }));
        
        // Cache the non-online counts for future tab returns
        memberCountsCache.set(spaceId, {
          data: { totalMembers: totalCount, adminMembers: adminCount, loading: false },
          timestamp: Date.now()
        });
        
        // Update centralized fetch time
        if (tabVisibility) {
          tabVisibility.updateLastFetchTime('feed', spaceId);
        }
      }
    } catch (error) {
      console.error('Error in fetchCounts:', error);
      if (mountedRef.current) {
        setCounts(prev => ({ ...prev, loading: false }));
      }
    }
  }, [spaceId]);
  
  // Debounced version for frequent updates
  const debouncedFetchCounts = useCallback(
    debounce(fetchCounts, 200),
    [fetchCounts]
  );

  // Fetch initial counts
  useEffect(() => {
    if (!spaceId) {
      setCounts(prev => ({ ...prev, loading: false }));
      return;
    }

    mountedRef.current = true;
    
    // 🔧 HOOK DEDUPLICATION: Prevent multiple instances for same spaceId
    const hookKey = `memberCounts_${spaceId}`;
    const currentlyActive = activeMemberCountInstances.get(hookKey);
    
    // 🚀 SMART DEDUPLICATION: Only block if there's an active instance AND we have cached data
    if (currentlyActive && memberCountsCache.has(spaceId)) {
      debugMemberCounts('Hook instance already active, using cached data only', { spaceId, hookKey });
      
      // Restore cached data and exit - don't run any effects
      const cached = memberCountsCache.get(spaceId);
      if (cached && cached.data) {
        setCounts(prev => ({
          ...cached.data,
          onlineMembers: prev.onlineMembers // Keep current online count
        }));
      }
      return;
    }
    
    // Mark this hook instance as active (allows first instance or cache-miss scenarios)
    activeMemberCountInstances.set(hookKey, true);
    
    // 🚀 TAB VISIBILITY FIX: Check if this is a cached tab return
    const isTabCached = tabVisibility?.isTabCached('feed', spaceId) || false;
    const isTabInitialized = tabVisibility?.isTabInitialized('feed', spaceId) || false;
    
    if (tabVisibility && isTabCached && isTabInitialized) {
      const lastFetchTime = tabVisibility.getLastFetchTime('feed', spaceId);
      const timeSinceLastFetch = lastFetchTime ? Date.now() - lastFetchTime : 0;
      
      debugMemberCounts('Cached tab return detected - skipping initial fetch', { 
        spaceId, 
        isTabCached, 
        isTabInitialized,
        lastFetch: lastFetchTime,
        timeSinceLastFetch: timeSinceLastFetch > 0 ? timeSinceLastFetch : 'never'
      });
      
      // 🔧 FIX: Initialize state with cached data instead of defaults
      const cached = memberCountsCache.get(spaceId);
      if (cached && cached.data) {
        debugMemberCounts('Restoring cached member counts data', { spaceId, cachedData: cached.data });
        // Use React.startTransition for non-urgent state updates to reduce flashing
        React.startTransition(() => {
          setCounts(prev => ({
            ...cached.data,
            onlineMembers: prev.onlineMembers // Keep current online count from presence
          }));
        });
      }
      
      // Use cached data with minimal refresh
      if (lastFetchTime && timeSinceLastFetch > 60000) { // Only if more than 1 minute old
        debugMemberCounts('Cache too old, performing background refresh', { spaceId });
        setTimeout(fetchCounts, 100);
      } else {
        debugMemberCounts('Cache still fresh, skipping background refresh', { spaceId });
      }
      return;
    }
    
    debugMemberCounts('Initial fetch triggered', { spaceId, isTabCached, isTabInitialized });
    fetchCounts();
    
    // Mark as initialized after first fetch
    if (tabVisibility && !isTabInitialized) {
      tabVisibility.markTabAsInitialized('feed', spaceId);
      tabVisibility.updateLastFetchTime('feed', spaceId);
    }

    return () => {
      mountedRef.current = false;
      
      // Clean up hook instance tracking
      const hookKey = `memberCounts_${spaceId}`;
      activeMemberCountInstances.delete(hookKey);
      
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [spaceId]);

  // Update online count whenever it changes from presence system
  useEffect(() => {
    if (!mountedRef.current) return;

    // 🔧 PREVENT DUPLICATE FETCHES: Check if this hook instance should run effects
    const hookKey = `memberCounts_${spaceId}`;
    const isActiveInstance = activeMemberCountInstances.get(hookKey);
    
    // Skip effects if we're not the active instance for this space
    if (!isActiveInstance) {
      debugMemberCounts('Skipping presence effect - not active instance', { spaceId, hookKey });
      return;
    }

    debugMemberCounts('Presence update received', {
      spaceId,
      onlineCount,
      presenceLoading,
      lastFetch: lastFetchRef.current ? Date.now() - lastFetchRef.current : 'never'
    });

    // Always update online count immediately
    if (typeof onlineCount === 'number') {
      setCounts(prev => ({
        ...prev,
        onlineMembers: onlineCount,
        loading: false
      }));
    }

    // If it's been more than 30 seconds since last fetch, refresh all counts
    if (Date.now() - lastFetchRef.current > 30000) {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      fetchTimeoutRef.current = setTimeout(debouncedFetchCounts, 100);
    }
  }, [onlineCount, spaceId, presenceLoading]);

  return counts;
};

export default useSimpleMemberCounts;

/**
 * Hook for just total member count (lightweight)
 */
export const useTotalMemberCount = (spaceId: string): number => {
  const { totalMembers } = useSimpleMemberCounts(spaceId);
  return totalMembers;
};

/**
 * Hook for just admin/owner count
 */
export const useAdminCount = (spaceId: string): number => {
  const { adminMembers } = useSimpleMemberCounts(spaceId);
  return adminMembers;
};

/**
 * Hook for just online count
 */
export const useOnlineCount = (spaceId: string): number => {
  const { onlineCount } = useSimpleSpacePresence(spaceId);
  return onlineCount;
}; 