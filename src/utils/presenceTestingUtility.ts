import { log } from '@/utils/logger';
/**
 * 🔧 Presence System Testing & Debugging Utility
 * 
 * Comprehensive testing tools for the unified database-centric presence system
 * Use these commands in browser console to debug online count issues
 */

import { getSupabaseClient } from '@/integrations/supabase/client';

interface PresenceTestResult {
  success: boolean;
  spaceId: string;
  databaseOnlineCount: number;
  onlineUsers: Array<{
    user_id: string;
    is_online: boolean;
    last_active_at: string;
    full_name?: string;
  }>;
  frontendDisplay: number;
  discrepancy: boolean;
  timestamp: string;
}

interface PresenceTestingSuite {
  testSpacePresence: (spaceId: string) => Promise<PresenceTestResult>;
  testKnownSpace: () => Promise<PresenceTestResult>;
  refreshUserOnlineStatus: (userId: string) => Promise<boolean>;
  markUserOnline: (userId: string, spaceId: string) => Promise<boolean>;
  markUserOffline: (userId: string) => Promise<boolean>;
  getPresenceSystemStatus: () => object;
  runComprehensiveTest: () => Promise<PresenceTestResult[]>;
}

class PresenceTestingUtility implements PresenceTestingSuite {
  private readonly KNOWN_SPACE_ID = '235e68d1-89df-4d2d-8945-e7756d60de20';
  
  /**
   * Test presence for a specific space
   */
  async testSpacePresence(spaceId: string): Promise<PresenceTestResult> {
    const timestamp = new Date().toISOString();
    
    try {
      log.debug('Utils', `🔍 [PresenceTest] Testing space: ${spaceId}`);
      
      // Query database for online users
      const { data, error } = await getSupabaseClient()
        .from('space_members')
        .select(`
          user_id,
          is_online,
          last_active_at
        `)
        .eq('space_id', spaceId)
        .eq('status', 'active')
        .order('is_online', { ascending: false })
        .order('last_active_at', { ascending: false });
        
      if (error) throw error;
      
      const onlineUsers = data?.filter(member => member.is_online) || [];
      const databaseOnlineCount = onlineUsers.length;
      
      // Get frontend display count (if available)
      const frontendElement = document.querySelector('[data-testid="online-count"]');
      const frontendDisplay = frontendElement 
        ? parseInt(frontendElement.textContent || '0') 
        : -1; // -1 means couldn't find frontend element
      
      const discrepancy = frontendDisplay >= 0 && frontendDisplay !== databaseOnlineCount;
      
      const result: PresenceTestResult = {
        success: true,
        spaceId,
        databaseOnlineCount,
        onlineUsers: onlineUsers.map(user => ({
          user_id: user.user_id,
          is_online: user.is_online,
          last_active_at: user.last_active_at,
          full_name: 'N/A' // Simplified for testing without foreign key complexity
        })),
        frontendDisplay,
        discrepancy,
        timestamp
      };
      
      log.debug('Utils', `✅ [PresenceTest] Space ${spaceId}: Database=${databaseOnlineCount}, Frontend=${frontendDisplay}`, result);
      
      if (discrepancy) {
        log.warn('Utils', `⚠️ [PresenceTest] DISCREPANCY DETECTED! Database shows ${databaseOnlineCount} but frontend shows ${frontendDisplay}`);
      }
      
      return result;
    } catch (error) {
      log.error('Utils', `❌ [PresenceTest] Error testing space ${spaceId}:`, error);
      
      return {
        success: false,
        spaceId,
        databaseOnlineCount: -1,
        onlineUsers: [],
        frontendDisplay: -1,
        discrepancy: false,
        timestamp
      };
    }
  }
  
  /**
   * Test the known space (nocode-architects)
   */
  async testKnownSpace(): Promise<PresenceTestResult> {
    log.debug('Utils', '🎯 [PresenceTest] Testing known space (nocode-architects)...');
    return this.testSpacePresence(this.KNOWN_SPACE_ID);
  }
  
  /**
   * Refresh a user's online status
   */
  async refreshUserOnlineStatus(userId: string): Promise<boolean> {
    try {
      const { error } = await getSupabaseClient()
        .from('space_members')
        .update({
          is_online: true,
          last_active_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('status', 'active');
        
      if (error) throw error;
      
      log.debug('Utils', `✅ [PresenceTest] Refreshed online status for user: ${userId}`);
      return true;
    } catch (error) {
      log.error('Utils', `❌ [PresenceTest] Failed to refresh user ${userId}:`, error);
      return false;
    }
  }
  
  /**
   * Mark user online in a specific space
   */
  async markUserOnline(userId: string, spaceId: string): Promise<boolean> {
    try {
      const { error } = await getSupabaseClient()
        .from('space_members')
        .update({
          is_online: true,
          last_active_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('space_id', spaceId)
        .eq('status', 'active');
        
      if (error) throw error;
      
      log.debug('Utils', `✅ [PresenceTest] Marked user ${userId} online in space ${spaceId}`);
      return true;
    } catch (error) {
      log.error('Utils', `❌ [PresenceTest] Failed to mark user ${userId} online:`, error);
      return false;
    }
  }
  
  /**
   * Mark user offline globally
   */
  async markUserOffline(userId: string): Promise<boolean> {
    try {
      const { error } = await getSupabaseClient()
        .from('space_members')
        .update({
          is_online: false,
          last_active_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('status', 'active');
        
      if (error) throw error;
      
      log.debug('Utils', `✅ [PresenceTest] Marked user ${userId} offline globally`);
      return true;
    } catch (error) {
      log.error('Utils', `❌ [PresenceTest] Failed to mark user ${userId} offline:`, error);
      return false;
    }
  }
  
  /**
   * Get presence system status
   */
  getPresenceSystemStatus(): object {
    const status = {
      unifiedPresenceAvailable: typeof (window as any).getUnifiedPresenceState === 'function',
      presenceCacheAvailable: typeof (window as any).getPresenceCache === 'function',
      refreshFunctionAvailable: typeof (window as any).refreshSpacePresence === 'function',
    };
    
    if (status.unifiedPresenceAvailable) {
      try {
        const presenceState = (window as any).getUnifiedPresenceState();
        (status as any).activeSpaces = presenceState.length;
        (status as any).presenceState = presenceState;
      } catch (error) {
        (status as any).presenceStateError = error.message;
      }
    }
    
    if (status.presenceCacheAvailable) {
      try {
        const cache = (window as any).getPresenceCache();
        (status as any).cacheEntries = Object.keys(cache).length;
        (status as any).cache = cache;
      } catch (error) {
        (status as any).cacheError = error.message;
      }
    }
    
    log.debug('Utils', '🔍 [PresenceTest] Presence system status:', status);
    return status;
  }
  
  /**
   * Run comprehensive tests
   */
  async runComprehensiveTest(): Promise<PresenceTestResult[]> {
    log.debug('Utils', '🚀 [PresenceTest] Running comprehensive presence test suite...');
    
    const results: PresenceTestResult[] = [];
    
    // Test known space
    const knownSpaceResult = await this.testKnownSpace();
    results.push(knownSpaceResult);
    
    // Get presence system status
    this.getPresenceSystemStatus();
    
    // Test refresh function if available
    if (typeof (window as any).refreshSpacePresence === 'function') {
      try {
        log.debug('Utils', '🔄 [PresenceTest] Testing refresh function...');
        await (window as any).refreshSpacePresence(this.KNOWN_SPACE_ID);
        
        // Re-test after refresh
        const refreshedResult = await this.testKnownSpace();
        results.push(refreshedResult);
      } catch (error) {
        log.error('Utils', '❌ [PresenceTest] Refresh function failed:', error);
      }
    }
    
    log.debug('Utils', '📊 [PresenceTest] Comprehensive test complete:', results);
    return results;
  }
}

// Create global instance
const presenceTestingUtility = new PresenceTestingUtility();

// Expose to window for browser console access
if (typeof window !== 'undefined') {
  (window as any).presenceTest = {
    test: (spaceId: string) => presenceTestingUtility.testSpacePresence(spaceId),
    testKnownSpace: () => presenceTestingUtility.testKnownSpace(),
    refreshUser: (userId: string) => presenceTestingUtility.refreshUserOnlineStatus(userId),
    markOnline: (userId: string, spaceId: string) => presenceTestingUtility.markUserOnline(userId, spaceId),
    markOffline: (userId: string) => presenceTestingUtility.markUserOffline(userId),
    status: () => presenceTestingUtility.getPresenceSystemStatus(),
    runAll: () => presenceTestingUtility.runComprehensiveTest()
  };
  
  log.debug('Utils', '🔧 [PresenceTest] Testing utility loaded. Available commands:');
  log.debug('Utils', '  - window.presenceTest.testKnownSpace() - Test nocode-architects space');
  log.debug('Utils', '  - window.presenceTest.test(spaceId) - Test specific space');
  log.debug('Utils', '  - window.presenceTest.status() - Get presence system status');
  log.debug('Utils', '  - window.presenceTest.runAll() - Run comprehensive tests');
  log.debug('Utils', '  - window.presenceTest.refreshUser(userId) - Refresh user online status');
  log.debug('Utils', '  - window.presenceTest.markOnline(userId, spaceId) - Mark user online');
  log.debug('Utils', '  - window.presenceTest.markOffline(userId) - Mark user offline');
}

export default presenceTestingUtility; 