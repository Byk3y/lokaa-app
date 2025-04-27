/**
 * Error recovery utilities for database and space access issues
 */
import { supabase } from '@/integrations/supabase/client';

/**
 * Diagnose and report database connectivity issues
 */
export async function diagnoseDbConnection(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    console.log('Diagnosing database connection...');
    
    // 1. Try a simple query to check if the database is accessible
    const { data: pingData, error: pingError } = await supabase
      .from('spaces')
      .select('count(*)', { count: 'exact', head: true });
      
    if (pingError) {
      console.error('Database ping failed:', pingError);
      return {
        success: false,
        message: 'Failed to connect to database',
        details: pingError
      };
    }
    
    // 2. Check authentication status
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.error('Auth session check failed:', authError);
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
  } catch (error) {
    console.error('Unexpected error during diagnosis:', error);
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
        console.warn(`Failed to remove ${key} from localStorage:`, e);
      }
    });
    
    console.log('Client state reset completed');
  } catch (error) {
    console.error('Error resetting client state:', error);
  }
}

/**
 * Perform a full client reset - use as last resort
 */
export function performEmergencyReset(): void {
  try {
    // 1. Sign out the user
    supabase.auth.signOut();
    
    // 2. Clear localStorage
    localStorage.clear();
    
    // 3. Clear sessionStorage
    sessionStorage.clear();
    
    // 4. Display completion message
    console.log('Emergency reset completed. Refreshing page in 2 seconds...');
    
    // 5. Refresh the page after a short delay
    setTimeout(() => {
      window.location.href = '/';
    }, 2000);
  } catch (error) {
    console.error('Failed to perform emergency reset:', error);
    
    // Force a hard redirect as last resort
    window.location.href = `/?reset=true&t=${Date.now()}`;
  }
}

/**
 * Add the utility to the window for console debugging
 */
if (typeof window !== 'undefined') {
  (window as any).errorRecovery = {
    diagnoseDbConnection,
    resetClientState,
    performEmergencyReset
  };
} 