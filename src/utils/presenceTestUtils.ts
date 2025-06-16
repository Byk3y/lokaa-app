/**
 * Presence Testing Utilities
 * Helper functions to debug and test the unified presence system
 */

import { getSupabaseClient } from '@/integrations/supabase/client';

export class PresenceTestUtils {
  /**
   * Check if a user is online according to different systems
   */
  static async checkUserPresenceStatus(userId: string, spaceId: string) {
    console.log('🧪 [PresenceTest] Checking user presence status...');
    console.log(`User ID: ${userId}`);
    console.log(`Space ID: ${spaceId}`);
    
    try {
      const supabase = getSupabaseClient();
      
      // 1. Check database presence
      const { data: dbPresence, error: dbError } = await supabase
        .from('space_members')
        .select('is_online, last_active_at, user_id, users(full_name)')
        .eq('space_id', spaceId)
        .eq('user_id', userId)
        .single();
        
      console.log('📊 Database presence:', dbPresence);
      if (dbError) console.error('❌ Database error:', dbError);
      
      // 2. Check real-time presence
      const channel = supabase.channel(`presence-test:${spaceId}`);
      
      await new Promise((resolve) => {
        channel
          .on('presence', { event: 'sync' }, () => {
            const presenceState = channel.presenceState();
            console.log('🔴 Real-time presence state:', presenceState);
            
            const userPresent = Object.values(presenceState)
              .flat()
              .some((p: any) => p.user_id === userId && p.is_online);
              
            console.log(`🔴 User ${userId} present in real-time:`, userPresent);
            resolve(true);
          })
          .subscribe();
          
        // Timeout after 3 seconds
        setTimeout(resolve, 3000);
      });
      
      // Cleanup
      supabase.removeChannel(channel);
      
      // 3. Check unified presence state
      if (typeof window !== 'undefined' && (window as any).getUnifiedPresenceState) {
        const unifiedState = (window as any).getUnifiedPresenceState();
        console.log('🌐 Unified presence state:', unifiedState);
        
        const spaceState = unifiedState[spaceId];
        if (spaceState) {
          const userOnline = spaceState.onlineUsers.has(userId);
          console.log(`🌐 User ${userId} online in unified system:`, userOnline);
        }
      }
      
    } catch (error) {
      console.error('❌ Error checking presence:', error);
    }
  }
  
  /**
   * Force update user presence in database
   */
  static async forceUpdateUserPresence(userId: string, isOnline: boolean) {
    console.log(`🔧 [PresenceTest] Force updating user ${userId} to ${isOnline ? 'online' : 'offline'}`);
    
    try {
      const supabase = getSupabaseClient();
      
      const { error } = await supabase
        .from('space_members')
        .update({
          is_online: isOnline,
          last_active_at: new Date().toISOString()
        })
        .eq('user_id', userId);
        
      if (error) {
        console.error('❌ Error updating presence:', error);
      } else {
        console.log('✅ Presence updated successfully');
      }
    } catch (error) {
      console.error('❌ Exception updating presence:', error);
    }
  }
  
  /**
   * Compare all presence systems for a space
   */
  static async comparePresenceSystems(spaceId: string) {
    console.log('🔍 [PresenceTest] Comparing all presence systems...');
    
    try {
      const supabase = getSupabaseClient();
      
      // Get all members from database
      const { data: dbMembers, error } = await supabase
        .from('space_members')
        .select('user_id, is_online, last_active_at, users(full_name)')
        .eq('space_id', spaceId)
        .eq('status', 'active');
        
      if (error) {
        console.error('❌ Database error:', error);
        return;
      }
      
      console.log('📊 Database members:', dbMembers);
      
      // Get unified presence state
      if (typeof window !== 'undefined' && (window as any).getUnifiedPresenceState) {
        const unifiedState = (window as any).getUnifiedPresenceState();
        const spaceState = unifiedState[spaceId];
        
        if (spaceState) {
          console.log('🌐 Unified presence online users:', Array.from(spaceState.onlineUsers));
          
          // Compare systems
          const dbOnlineUsers = dbMembers?.filter(m => m.is_online).map(m => m.user_id) || [];
          const unifiedOnlineUsers = Array.from(spaceState.onlineUsers);
          
          console.log('📊 Database online users:', dbOnlineUsers);
          console.log('🌐 Unified online users:', unifiedOnlineUsers);
          
          // Find discrepancies
          const onlyInDb = dbOnlineUsers.filter(id => !unifiedOnlineUsers.includes(id));
          const onlyInUnified = unifiedOnlineUsers.filter(id => !dbOnlineUsers.includes(id));
          
          if (onlyInDb.length > 0) {
            console.warn('⚠️ Users online in DB but not in unified system:', onlyInDb);
          }
          
          if (onlyInUnified.length > 0) {
            console.warn('⚠️ Users online in unified system but not in DB:', onlyInUnified);
          }
          
          if (onlyInDb.length === 0 && onlyInUnified.length === 0) {
            console.log('✅ All systems in sync!');
          }
        }
      }
      
    } catch (error) {
      console.error('❌ Error comparing systems:', error);
    }
  }

  /**
   * Test specific user presence issue
   */
  static async testUserPresenceIssue(userId: string, spaceId: string) {
    console.log('🔍 [PresenceTest] Testing specific user presence issue...');
    console.log(`User: ${userId}`);
    console.log(`Space: ${spaceId}`);
    
    try {
      const supabase = getSupabaseClient();
      
      // 1. Check database presence
      const { data: dbPresence, error: dbError } = await supabase
        .from('space_members')
        .select('is_online, last_active_at, user_id, users(full_name)')
        .eq('space_id', spaceId)
        .eq('user_id', userId)
        .single();
        
      console.log('📊 Database presence:', dbPresence);
      if (dbError) console.error('❌ Database error:', dbError);
      
      // 2. Check unified presence state
      const unifiedState = (window as any).getUnifiedPresenceState?.();
      const spacePresence = unifiedState?.spaces?.[spaceId];
      const isOnlineInUnified = spacePresence?.onlineUsers?.includes(userId);
      
      console.log('🌐 Unified presence state for space:', spacePresence);
      console.log('🌐 User online in unified system:', isOnlineInUnified);
      
      // 3. Check real-time presence channel
      const channel = supabase.channel(`space_presence_${spaceId}`);
      const presenceState = channel.presenceState();
      const isOnlineInChannel = Object.values(presenceState).some((users: any) => 
        users.some((user: any) => user.user_id === userId)
      );
      
      console.log('📡 Real-time channel presence:', presenceState);
      console.log('📡 User online in channel:', isOnlineInChannel);
      
      // 4. Summary
      console.log('📋 PRESENCE SUMMARY:');
      console.log(`   Database: ${dbPresence?.is_online ? '✅ Online' : '❌ Offline'}`);
      console.log(`   Unified System: ${isOnlineInUnified ? '✅ Online' : '❌ Offline'}`);
      console.log(`   Real-time Channel: ${isOnlineInChannel ? '✅ Online' : '❌ Offline'}`);
      
      return {
        database: dbPresence?.is_online || false,
        unified: isOnlineInUnified || false,
        channel: isOnlineInChannel || false,
        dbData: dbPresence,
        unifiedData: spacePresence,
        channelData: presenceState
      };
      
    } catch (error) {
      console.error('❌ Error testing user presence:', error);
      return null;
    }
  }
}

// Make testing utilities available globally
(window as any).PresenceTestUtils = PresenceTestUtils;
(window as any).testUserPresence = PresenceTestUtils.testUserPresenceIssue;

console.log('🧪 [PresenceTestUtils] Testing utilities loaded');
console.log('🧪 Available functions:');
console.log('   - window.testUserPresence(userId, spaceId)');
console.log('   - window.PresenceTestUtils.checkUserPresenceStatus(userId, spaceId)');
console.log('   - window.PresenceTestUtils.testUserPresenceIssue(userId, spaceId)');

export default PresenceTestUtils; 