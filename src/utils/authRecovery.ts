import { log } from '@/utils/logger';
/**
 * Authentication Recovery Utility
 * Helps recover from authentication issues after service outages
 */

import { getSupabaseClient } from '@/integrations/supabase/client';
import { clearAllAuthTokens } from '@/utils/auth/authTokenUtils';

interface AuthRecoveryOptions {
  clearCache?: boolean;
  forceRefresh?: boolean;
  resetSession?: boolean;
}

export class AuthRecovery {
  /**
   * Attempts to recover authentication state after an outage
   */
  static async recoverAuth(options: AuthRecoveryOptions = {}): Promise<boolean> {
    const { clearCache = true, forceRefresh = true, resetSession = false } = options;
    
    try {
      log.debug('Utils', '🔄 [AuthRecovery] Starting authentication recovery...');
      
      // Step 1: Clear localStorage cache if requested
      if (clearCache) {
        log.debug('Utils', '🧹 [AuthRecovery] Clearing authentication cache...');
        // PHASE 3 FIX: Use centralized auth token cleanup instead of manual localStorage removal
        // Removed: localStorage.removeItem('getSupabaseClient().auth.token');
        clearAllAuthTokens(true); // Clear problematic keys but preserve Supabase's automatic keys
        localStorage.removeItem('lokaa-auth-cache');
        localStorage.removeItem('lokaa-space-cache');
      }
      
      // Step 2: Reset session if requested
      if (resetSession) {
        log.debug('Utils', '🔄 [AuthRecovery] Resetting session...');
        await getSupabaseClient().auth.signOut();
      }
      
      // Step 3: Force refresh session
      if (forceRefresh) {
        log.debug('Utils', '🔄 [AuthRecovery] Refreshing session...');
        const { data: { session }, error } = await getSupabaseClient().auth.getSession();
        
        if (error) {
          log.error('Utils', '❌ [AuthRecovery] Failed to refresh session:', error);
          return false;
        }
        
        log.debug('Utils', '✅ [AuthRecovery] Session refreshed successfully');
      }
      
      // Step 4: Test basic API connectivity
      log.debug('Utils', '🔍 [AuthRecovery] Testing API connectivity...');
      const { data, error } = await getSupabaseClient()
        .from('spaces')
        .select('id')
        .limit(1);
      
      if (error) {
        log.error('Utils', '❌ [AuthRecovery] API connectivity test failed:', error);
        return false;
      }
      
      log.debug('Utils', '✅ [AuthRecovery] Authentication recovery completed successfully');
      return true;
      
    } catch (error) {
      log.error('Utils', '❌ [AuthRecovery] Recovery failed:', error);
      return false;
    }
  }
  
  /**
   * Checks if the current error suggests an authentication recovery is needed
   */
  static isAuthError(error: any): boolean {
    if (!error) return false;
    
    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code || error.status;
    
    return (
      errorCode === 401 ||
      errorCode === 403 ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('invalid jwt') ||
      errorMessage.includes('session not found') ||
      errorMessage.includes('auth session missing')
    );
  }
  
  /**
   * Forces a page refresh to clear all client-side state
   */
  static forceRefresh(): void {
    log.debug('Utils', '🔄 [AuthRecovery] Forcing page refresh to clear state...');
    window.location.reload();
  }
} 