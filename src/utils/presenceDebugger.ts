import { log } from '@/utils/logger';
/**
 * Presence System Debugger
 * Utility functions to test and debug the unified presence system
 */

import { getSupabaseClient } from '@/integrations/supabase/client';

export class PresenceDebugger {
  private static instance: PresenceDebugger;
  
  private constructor() {}
  
  public static getInstance(): PresenceDebugger {
    if (!PresenceDebugger.instance) {
      PresenceDebugger.instance = new PresenceDebugger();
    }
    return PresenceDebugger.instance;
  }
  
  /**
   * Test basic presence functionality
   */
  public async testPresenceBasics(spaceId: string, userId: string): Promise<void> {
    log.debug('Utils', '🧪 [PresenceDebugger] Testing basic presence functionality...');
    
    try {
      const supabase = getSupabaseClient();
      
      // Test 1: Update presence
      log.debug('Utils', '📝 Test 1: Updating presence...');
      const { error: updateError } = await supabase
        .from('user_presence')
        .upsert({
          user_id: userId,
          space_id: spaceId,
          is_online: true,
          last_seen: new Date().toISOString()
        });
      
      if (updateError) {
        log.error('Utils', '❌ Test 1 failed:', updateError);
      } else {
        log.debug('Utils', '✅ Test 1 passed: Presence updated successfully');
      }
      
      // Test 2: Query presence
      log.debug('Utils', '📝 Test 2: Querying presence...');
      const { data: presenceData, error: queryError } = await supabase
        .from('user_presence')
        .select('*')
        .eq('space_id', spaceId)
        .eq('is_online', true);
      
      if (queryError) {
        log.error('Utils', '❌ Test 2 failed:', queryError);
      } else {
        log.debug('Utils', '✅ Test 2 passed:', presenceData?.length, 'online users found');
        log.debug('Utils', '📊 Online users:', presenceData);
      }
      
      // Test 3: Test realtime subscription
      log.debug('Utils', '📝 Test 3: Testing realtime subscription...');
      const channel = supabase
        .channel(`presence-test-${spaceId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'user_presence',
          filter: `space_id=eq.${spaceId}`
        }, (payload) => {
          log.debug('Utils', '🔄 Realtime presence change:', payload);
        })
        .subscribe((status) => {
          log.debug('Utils', '📡 Subscription status:', status);
          if (status === 'SUBSCRIBED') {
            log.debug('Utils', '✅ Test 3 passed: Realtime subscription active');
            
            // Clean up after 5 seconds
            setTimeout(() => {
              channel.unsubscribe();
              log.debug('Utils', '🧹 Test subscription cleaned up');
            }, 5000);
          }
        });
      
    } catch (error) {
      log.error('Utils', '❌ Presence test failed:', error);
    }
  }
  
  /**
   * Get current presence state for debugging
   */
  public async getPresenceState(spaceId: string): Promise<any> {
    try {
      const supabase = getSupabaseClient();
      
      const { data, error } = await supabase
        .from('user_presence')
        .select(`
          user_id,
          is_online,
          last_seen,
          users:user_id (
            full_name,
            avatar_url
          )
        `)
        .eq('space_id', spaceId)
        .order('last_seen', { ascending: false });
      
      if (error) {
        log.error('Utils', '❌ Failed to get presence state:', error);
        return null;
      }
      
      const onlineUsers = data?.filter(p => p.is_online) || [];
      const offlineUsers = data?.filter(p => !p.is_online) || [];
      
      const state = {
        total: data?.length || 0,
        online: onlineUsers.length,
        offline: offlineUsers.length,
        onlineUsers: onlineUsers.map(u => ({
          userId: u.user_id,
          name: u.users?.full_name || 'Unknown',
          lastSeen: u.last_seen
        })),
        offlineUsers: offlineUsers.map(u => ({
          userId: u.user_id,
          name: u.users?.full_name || 'Unknown',
          lastSeen: u.last_seen
        }))
      };
      
      log.debug('Utils', '📊 Current presence state:', state);
      return state;
      
    } catch (error) {
      log.error('Utils', '❌ Error getting presence state:', error);
      return null;
    }
  }
}

// Export singleton instance
export const presenceDebugger = PresenceDebugger.getInstance();

// Expose to window for debugging
if (typeof window !== 'undefined') {
  (window as any).presenceDebugger = presenceDebugger;
  
  // Convenience functions
  (window as any).testPresence = (spaceId: string, userId: string) => {
    return presenceDebugger.testPresenceBasics(spaceId, userId);
  };
  
  (window as any).getPresenceState = (spaceId: string) => {
    return presenceDebugger.getPresenceState(spaceId);
  };
  
  log.debug('Utils', '🧪 Presence debugger loaded. Available functions:');
  log.debug('Utils', '  - testPresence(spaceId, userId)');
  log.debug('Utils', '  - getPresenceState(spaceId)');
  log.debug('Utils', '  - getUnifiedPresenceState() (from unified system)');
} 