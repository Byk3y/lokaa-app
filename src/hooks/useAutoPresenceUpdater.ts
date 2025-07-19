import { log } from '@/utils/logger';
/**
 * 🎯 AUTO PRESENCE UPDATER HOOK
 * 
 * Automatically updates user presence when they:
 * 1. Return from minimizing the browser
 * 2. Become active in a space
 * 3. Load a space page
 * 
 * This fixes the issue where users return from minimizing and stay at 0 online
 * because their presence isn't automatically updated back to online.
 */

import { useEffect, useRef } from 'react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

/**
 * Hook to automatically update user presence in a space
 */
export const useAutoPresenceUpdater = (spaceId: string | undefined) => {
  const { user } = useOptimizedAuth();
  const lastUpdateRef = useRef<number>(0);
  const isInitializedRef = useRef(false);
  
  // Throttle updates to prevent spam (minimum 30 seconds between updates)
  const THROTTLE_DELAY = 30 * 1000;
  
  const updatePresence = async (reason: string) => {
    if (!user?.id || !spaceId) return;
    
    const now = Date.now();
    if (now - lastUpdateRef.current < THROTTLE_DELAY) {
      log.debug('Hook', `🔄 [AutoPresence] Throttled presence update (${reason})`);
      return;
    }
    
    try {
      log.debug('Hook', `🔄 [AutoPresence] Updating presence for space ${spaceId} (${reason})`);
      
      // Try to use Bridge V2 first
      if ((window as any).indexedDBBridgeV2?.updateGlobalPresence) {
        await (window as any).indexedDBBridgeV2.updateGlobalPresence(user.id, true, {
          spaceId: spaceId,
          forceNetwork: true
        });
        log.debug('Hook', `✅ [AutoPresence] Successfully updated via Bridge V2`);
      } else {
        // Fallback to direct Supabase call
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          'https://nmddvthcsyppyjncqfsk.supabase.co',
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tZGR2dGhjc3lwcHlqbmNxZnNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMwMDgzNTksImV4cCI6MjA0ODU4NDM1OX0.rjR8EJ_Ue0WjUGUIwktd1-KHRq4BKSJ3WNAzN7EJGdQ'
        );
        
        // Update current space to online, all others to offline
        await supabase
          .from('space_members')
          .update({ is_online: false, last_active_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('status', 'active')
          .neq('space_id', spaceId);
          
        await supabase
          .from('space_members')
          .update({ is_online: true, last_active_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('space_id', spaceId)
          .eq('status', 'active');
        
        log.debug('Hook', `✅ [AutoPresence] Successfully updated via fallback`);
      }
      
      lastUpdateRef.current = now;
      
      // Dispatch event to refresh UI
      window.dispatchEvent(new CustomEvent('presence-updated', {
        detail: { spaceId, userId: user.id, isOnline: true, reason }
      }));
      
    } catch (error) {
      log.warn('Hook', `⚠️ [AutoPresence] Failed to update presence (${reason}):`, error);
    }
  };
  
  // Update presence on space load (initial)
  useEffect(() => {
    if (!isInitializedRef.current && spaceId && user?.id) {
      isInitializedRef.current = true;
      updatePresence('space_load');
    }
  }, [spaceId, user?.id]);
  
  // Update presence on visibility change (return from minimize)
  useEffect(() => {
    if (!spaceId || !user?.id) return;
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // User returned from background/minimize
        log.debug('Hook', '👁️ [AutoPresence] User returned from background, updating presence');
        updatePresence('visibility_return');
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [spaceId, user?.id]);
  
  // Update presence on user activity (optional - for very active monitoring)
  useEffect(() => {
    if (!spaceId || !user?.id) return;
    
    let activityTimeout: NodeJS.Timeout;
    
    const handleActivity = () => {
      // Clear previous timeout
      if (activityTimeout) {
        clearTimeout(activityTimeout);
      }
      
      // Set new timeout for presence update (debounced)
      activityTimeout = setTimeout(() => {
        updatePresence('user_activity');
      }, 5 * 60 * 1000); // Update after 5 minutes of activity
    };
    
    // Listen for user interactions
    const events = ['click', 'keydown', 'scroll', 'mousemove'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });
    
    return () => {
      if (activityTimeout) {
        clearTimeout(activityTimeout);
      }
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [spaceId, user?.id]);
  
  // Manual update function for external use
  const manualUpdate = () => updatePresence('manual');
  
  return { updatePresence: manualUpdate };
}; 