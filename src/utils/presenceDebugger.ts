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
    console.log('🧪 [PresenceDebugger] Testing basic presence functionality...');
    
    try {
      const supabase = getSupabaseClient();
      
      // Test 1: Update presence
      console.log('📝 Test 1: Updating presence...');
      const { error: updateError } = await supabase
        .from('user_presence')
        .upsert({
          user_id: userId,
          space_id: spaceId,
          is_online: true,
          last_seen: new Date().toISOString()
        });
      
      if (updateError) {
        console.error('❌ Test 1 failed:', updateError);
      } else {
        console.log('✅ Test 1 passed: Presence updated successfully');
      }
      
      // Test 2: Query presence
      console.log('📝 Test 2: Querying presence...');
      const { data: presenceData, error: queryError } = await supabase
        .from('user_presence')
        .select('*')
        .eq('space_id', spaceId)
        .eq('is_online', true);
      
      if (queryError) {
        console.error('❌ Test 2 failed:', queryError);
      } else {
        console.log('✅ Test 2 passed:', presenceData?.length, 'online users found');
        console.log('📊 Online users:', presenceData);
      }
      
      // Test 3: Test realtime subscription
      console.log('📝 Test 3: Testing realtime subscription...');
      const channel = supabase
        .channel(`presence-test-${spaceId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'user_presence',
          filter: `space_id=eq.${spaceId}`
        }, (payload) => {
          console.log('🔄 Realtime presence change:', payload);
        })
        .subscribe((status) => {
          console.log('📡 Subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Test 3 passed: Realtime subscription active');
            
            // Clean up after 5 seconds
            setTimeout(() => {
              channel.unsubscribe();
              console.log('🧹 Test subscription cleaned up');
            }, 5000);
          }
        });
      
    } catch (error) {
      console.error('❌ Presence test failed:', error);
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
        console.error('❌ Failed to get presence state:', error);
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
      
      console.log('📊 Current presence state:', state);
      return state;
      
    } catch (error) {
      console.error('❌ Error getting presence state:', error);
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
  
  console.log('🧪 Presence debugger loaded. Available functions:');
  console.log('  - testPresence(spaceId, userId)');
  console.log('  - getPresenceState(spaceId)');
  console.log('  - getUnifiedPresenceState() (from unified system)');
} 