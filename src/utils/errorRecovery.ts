import { log } from '@/utils/logger';
/**
 * Error recovery utilities for database and space access issues
 */
import { getSupabaseClient } from '@/integrations/supabase/client';
import { AuthError, PostgrestError } from '@supabase/supabase-js';

// Define a more specific type for the diagnosis details, matching ErrorRecovery.tsx
type DiagnosisDetails =
  | PostgrestError
  | AuthError
  | { authenticated: false }
  | { authenticated: true; userId?: string }
  | { error: unknown }; // error is 'unknown' because it comes from a catch block

/**
 * Diagnose and report database connectivity issues
 */
export async function diagnoseDbConnection(): Promise<{
  success: boolean;
  message: string;
  details?: DiagnosisDetails;
}> {
  try {
    log.debug('Utils', 'Diagnosing database connection...');
    
    // 1. Try a simple query to check if the database is accessible
    const { data: pingData, error: pingError } = await getSupabaseClient()
      .from('spaces')
      .select('count(*)', { count: 'exact', head: true });
      
    if (pingError) {
      log.error('Utils', 'Database ping failed:', pingError);
      return {
        success: false,
        message: 'Failed to connect to database',
        details: pingError
      };
    }
    
    // 2. Check authentication status
    const { data: { session }, error: authError } = await getSupabaseClient().auth.getSession();
    
    if (authError) {
      log.error('Utils', 'Auth session check failed:', authError);
      return {
        success: false,
        message: 'Failed to verify authentication',
        details: authError
      };
    }
    
    if (!session) {
      return {
        success: false,
        message: 'Not authenticated',
        details: { authenticated: false }
      };
    }
    
    return {
      success: true,
      message: 'Database connection successful',
      details: { authenticated: true, userId: session.user?.id }
    };
  } catch (error: unknown) {
    log.error('Utils', 'Unexpected error during diagnosis:', error);
    return {
      success: false,
      message: 'Unexpected error during diagnosis',
      details: { error }
    };
  }
}

/**
 * Reset client-side state to overcome stale data issues
 */
export function resetClientState(): void {
  try {
    // Clear space-related localStorage items
    const spaceKeys = [
      'lastVisitedSpace',
      'lastCreatedSpace',
      'selectedSpace',
      'spaceMetadata'
    ];
    
    spaceKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        log.warn('Utils', `Failed to remove ${key} from localStorage:`, e);
      }
    });
    
    log.debug('Utils', 'Client state reset completed');
  } catch (error) {
    log.error('Utils', 'Error resetting client state:', error);
  }
}

/**
 * Perform a full client reset - use as last resort
 */
export function performEmergencyReset(): void {
  try {
    // 1. Sign out the user
    getSupabaseClient().auth.signOut();
    
    // 2. Clear localStorage
    localStorage.clear();
    
    // 3. Clear sessionStorage
    sessionStorage.clear();
    
    // 4. Display completion message
    log.debug('Utils', 'Emergency reset completed. Refreshing page in 2 seconds...');
    
    // 5. Refresh the page after a short delay
    setTimeout(() => {
      window.location.href = '/';
    }, 2000);
  } catch (error) {
    log.error('Utils', 'Failed to perform emergency reset:', error);
    
    // Force a hard redirect as last resort
    window.location.href = `/?reset=true&t=${Date.now()}`;
  }
}

// Define the shape of the errorRecovery object
interface ErrorRecoveryTools {
  diagnoseDbConnection: typeof diagnoseDbConnection;
  resetClientState: typeof resetClientState;
  performEmergencyReset: typeof performEmergencyReset;
}

// Extend the global Window interface
declare global {
  interface Window {
    errorRecovery?: ErrorRecoveryTools;
  }
}

/**
 * Add the utility to the window for console debugging
 */
if (typeof window !== 'undefined') {
  window.errorRecovery = {
    diagnoseDbConnection,
    resetClientState,
    performEmergencyReset
  };
} 