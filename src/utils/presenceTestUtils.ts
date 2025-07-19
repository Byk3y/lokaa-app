import { log } from '@/utils/logger';
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
    log.debug('Utils', '🧪 [PresenceTest] Checking user presence status...');
    log.debug('Utils', `User ID: ${userId}`);
    log.debug('Utils', `Space ID: ${spaceId}`);
    
    try {
      const supabase = getSupabaseClient();
      
      // 1. Check database presence
      const { data: dbPresence, error: dbError } = await supabase
        .from('space_members')
        .select('is_online, last_active_at, user_id, users(full_name)')
        .eq('space_id', spaceId)
        .eq('user_id', userId)
        .single();
        
      log.debug('Utils', '📊 Database presence:', dbPresence);
      if (dbError) log.error('Utils', '❌ Database error:', dbError);
      
      // 2. Check real-time presence
      const channel = supabase.channel(`presence-test:${spaceId}`);
      
      await new Promise((resolve) => {
        channel
          .on('presence', { event: 'sync' }, () => {
            const presenceState = channel.presenceState();
            log.debug('Utils', '🔴 Real-time presence state:', presenceState);
            
            const userPresent = Object.values(presenceState)
              .flat()
              .some((p: any) => p.user_id === userId && p.is_online);
              
            log.debug('Utils', `🔴 User ${userId} present in real-time:`, userPresent);
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
        log.debug('Utils', '🌐 Unified presence state:', unifiedState);
        
        const spaceState = unifiedState[spaceId];
        if (spaceState) {
          const userOnline = spaceState.onlineUsers.has(userId);
          log.debug('Utils', `🌐 User ${userId} online in unified system:`, userOnline);
        }
      }
      
    } catch (error) {
      log.error('Utils', '❌ Error checking presence:', error);
    }
  }
  
  /**
   * Force update user presence in database
   */
  static async forceUpdateUserPresence(userId: string, isOnline: boolean) {
    log.debug('Utils', `🔧 [PresenceTest] Force updating user ${userId} to ${isOnline ? 'online' : 'offline'}`);
    
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
        log.error('Utils', '❌ Error updating presence:', error);
      } else {
        log.debug('Utils', '✅ Presence updated successfully');
      }
    } catch (error) {
      log.error('Utils', '❌ Exception updating presence:', error);
    }
  }
  
  /**
   * Compare all presence systems for a space
   */
  static async comparePresenceSystems(spaceId: string) {
    log.debug('Utils', '🔍 [PresenceTest] Comparing all presence systems...');
    
    try {
      const supabase = getSupabaseClient();
      
      // Get all members from database
      const { data: dbMembers, error } = await supabase
        .from('space_members')
        .select('user_id, is_online, last_active_at, users(full_name)')
        .eq('space_id', spaceId)
        .eq('status', 'active');
        
      if (error) {
        log.error('Utils', '❌ Database error:', error);
        return;
      }
      
      log.debug('Utils', '📊 Database members:', dbMembers);
      
      // Get unified presence state
      if (typeof window !== 'undefined' && (window as any).getUnifiedPresenceState) {
        const unifiedState = (window as any).getUnifiedPresenceState();
        const spaceState = unifiedState[spaceId];
        
        if (spaceState) {
          log.debug('Utils', '🌐 Unified presence online users:', Array.from(spaceState.onlineUsers));
          
          // Compare systems
          const dbOnlineUsers = dbMembers?.filter(m => m.is_online).map(m => m.user_id) || [];
          const unifiedOnlineUsers = Array.from(spaceState.onlineUsers);
          
          log.debug('Utils', '📊 Database online users:', dbOnlineUsers);
          log.debug('Utils', '🌐 Unified online users:', unifiedOnlineUsers);
          
          // Find discrepancies
          const onlyInDb = dbOnlineUsers.filter(id => !unifiedOnlineUsers.includes(id));
          const onlyInUnified = unifiedOnlineUsers.filter(id => !dbOnlineUsers.includes(id));
          
          if (onlyInDb.length > 0) {
            log.warn('Utils', '⚠️ Users online in DB but not in unified system:', onlyInDb);
          }
          
          if (onlyInUnified.length > 0) {
            log.warn('Utils', '⚠️ Users online in unified system but not in DB:', onlyInUnified);
          }
          
          if (onlyInDb.length === 0 && onlyInUnified.length === 0) {
            log.debug('Utils', '✅ All systems in sync!');
          }
        }
      }
      
    } catch (error) {
      log.error('Utils', '❌ Error comparing systems:', error);
    }
  }

  /**
   * Test specific user presence issue
   */
  static async testUserPresenceIssue(userId: string, spaceId: string) {
    log.debug('Utils', '🔍 [PresenceTest] Testing specific user presence issue...');
    log.debug('Utils', `User: ${userId}`);
    log.debug('Utils', `Space: ${spaceId}`);
    
    try {
      const supabase = getSupabaseClient();
      
      // 1. Check database presence
      const { data: dbPresence, error: dbError } = await supabase
        .from('space_members')
        .select('is_online, last_active_at, user_id, users(full_name)')
        .eq('space_id', spaceId)
        .eq('user_id', userId)
        .single();
        
      log.debug('Utils', '📊 Database presence:', dbPresence);
      if (dbError) log.error('Utils', '❌ Database error:', dbError);
      
      // 2. Check unified presence state
      const unifiedState = (window as any).getUnifiedPresenceState?.();
      const spacePresence = unifiedState?.spaces?.[spaceId];
      const isOnlineInUnified = spacePresence?.onlineUsers?.includes(userId);
      
      log.debug('Utils', '🌐 Unified presence state for space:', spacePresence);
      log.debug('Utils', '🌐 User online in unified system:', isOnlineInUnified);
      
      // 3. Check real-time presence channel
      const channel = supabase.channel(`space_presence_${spaceId}`);
      const presenceState = channel.presenceState();
      const isOnlineInChannel = Object.values(presenceState).some((users: any) => 
        users.some((user: any) => user.user_id === userId)
      );
      
      log.debug('Utils', '📡 Real-time channel presence:', presenceState);
      log.debug('Utils', '📡 User online in channel:', isOnlineInChannel);
      
      // 4. Summary
      log.debug('Utils', '📋 PRESENCE SUMMARY:');
      log.debug('Utils', `   Database: ${dbPresence?.is_online ? '✅ Online' : '❌ Offline'}`);
      log.debug('Utils', `   Unified System: ${isOnlineInUnified ? '✅ Online' : '❌ Offline'}`);
      log.debug('Utils', `   Real-time Channel: ${isOnlineInChannel ? '✅ Online' : '❌ Offline'}`);
      
      return {
        database: dbPresence?.is_online || false,
        unified: isOnlineInUnified || false,
        channel: isOnlineInChannel || false,
        dbData: dbPresence,
        unifiedData: spacePresence,
        channelData: presenceState
      };
      
    } catch (error) {
      log.error('Utils', '❌ Error testing user presence:', error);
      return null;
    }
  }
}

// Make testing utilities available globally
(window as any).PresenceTestUtils = PresenceTestUtils;
(window as any).testUserPresence = PresenceTestUtils.testUserPresenceIssue;

log.debug('Utils', '🧪 [PresenceTestUtils] Testing utilities loaded');
log.debug('Utils', '🧪 Available functions:');
log.debug('Utils', '   - window.testUserPresence(userId, spaceId)');
log.debug('Utils', '   - window.PresenceTestUtils.checkUserPresenceStatus(userId, spaceId)');
log.debug('Utils', '   - window.PresenceTestUtils.testUserPresenceIssue(userId, spaceId)');

export default PresenceTestUtils; 