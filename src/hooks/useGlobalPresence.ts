import { useEffect, useRef, useState } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useOptimizedAuth } from '@/contexts/AuthContext';
import { createManagedInterval } from '@/utils/pageVisibilityManager';

/**
 * Hook to track and update a user's online presence across all spaces
 * This is application-wide presence tracking that ensures a user is marked
 * as online in all their spaces when they're using the app
 */
export const useGlobalPresence = () => {
  const { user } = useOptimizedAuth();
  const updateInProgress = useRef(false);
  const [initialized, setInitialized] = useState(false);
  const intervalRef = useRef<(() => void) | null>(null);
  
  useEffect(() => {
    if (!user?.id) return;
    
    // Mark user as online when they load the app
    const updateGlobalPresence = async (isOnline: boolean) => {
      // Prevent concurrent updates
      if (updateInProgress.current) return;
      
      try {
        updateInProgress.current = true;
        
        if (isOnline) {
          console.log('🌐 [GlobalPresence] Updating user online status');
        }
        
        // Update all spaces where user is a member
        const { error: updateError } = await getSupabaseClient()
          .from('space_members')
          .update({
            is_online: isOnline,
            last_active_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('status', 'active');
          
        if (updateError) {
          console.error('Error updating global presence:', updateError);
        } else {
          console.log(`🌐 [GlobalPresence] User marked ${isOnline ? 'online' : 'offline'} across all spaces`);
        }
      } catch (error) {
        console.error('Error updating global presence:', error);
      } finally {
        updateInProgress.current = false;
        if (!initialized && isOnline) {
          setInitialized(true);
        }
      }
    };
    
    // Mark as online immediately on mount
    updateGlobalPresence(true);
    
    // Set up managed heartbeat interval (30 seconds)
    intervalRef.current = createManagedInterval(
      `global-presence-${user.id}`,
      () => updateGlobalPresence(true),
      30000,
      'heartbeat'
    );
    
    // Set up event listeners for browser/tab visibility
    const handleVisibilityChange = () => {
      updateGlobalPresence(!document.hidden);
    };
    
    // Handle page unload - mark user as offline
    const handleBeforeUnload = () => {
      try {
        // Use sendBeacon for reliable offline notification
        if (navigator.sendBeacon && typeof window !== 'undefined') {
          const formData = new FormData();
          formData.append('user_id', user.id);
          navigator.sendBeacon('https://nmddvthcsyppyjncqfsk.supabase.co/functions/v1/global-user-offline', formData);
        } else {
          // Fallback to synchronous update
          updateGlobalPresence(false);
        }
      } catch (error) {
        console.error('Error during unload presence update:', error);
      }
    };
    
    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Cleanup function
    return () => {
      // Clean up managed interval
      if (intervalRef.current) {
        intervalRef.current();
        intervalRef.current = null;
      }
      
      // Mark user as offline when component unmounts
      updateGlobalPresence(false);
      
      // Remove event listeners
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user]);
} 