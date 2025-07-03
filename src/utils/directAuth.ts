import { getSupabaseClient } from '@/integrations/supabase/client';

/**
 * Direct login function that bypasses React context
 * For use in critical login flows that need to work without React context
 */
export async function directLogin(email: string, password: string) {
  try {
    console.log("Direct login attempt for:", email);
    
    // Clear any existing auth state to prevent conflicts
    await getSupabaseClient().auth.signOut();
    
    // Attempt login with provided credentials
    const { data, error } = await getSupabaseClient().auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.error("Direct login error:", error.message);
      return { success: false, error: error.message };
    }
    
    console.log("Direct login successful, user:", data.user?.email);
    
    // PHASE 3 FIX: Let Supabase handle session storage automatically
    // Removed: localStorage.setItem('getSupabaseClient().auth.token', JSON.stringify(data.session));
    // Supabase automatically stores the session using the correct key pattern: sb-nmddvthcsyppyjncqfsk-auth-token
    
    // Give a moment for the auth state to be processed
    return new Promise((resolve) => {
      setTimeout(() => {
        // Determine redirect path - but don't automatically redirect
        const redirectPath = sessionStorage.getItem('redirect_after_login') || '/discover';
        
        // Clear the saved redirect
        sessionStorage.removeItem('redirect_after_login');
        
        console.log(`Login successful, would redirect to: ${redirectPath}`);
        
        // Return success with redirect path instead of forcing navigation
        resolve({ success: true, data, redirectPath });
      }, 300);
    });
  } catch (error: unknown) {
    console.error("Direct login exception:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

/**
 * Force redirect to login page
 * @param redirectPath Path to redirect to after login
 */
export function redirectToLogin(redirectPath?: string): void {
  // Store current location for potential redirect back
  if (redirectPath) {
    sessionStorage.setItem('redirect_after_login', redirectPath);
  }
  
  // Force redirect
  window.location.href = "/login";
}

/**
 * Checks if there is an active session without using React context
 * @returns {Promise<boolean>} True if there is an active session, false otherwise
 */
export const checkActiveSession = async (): Promise<boolean> => {
  try {
    // Add a timeout to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Session check timed out')), 7000);
    });
    
    // Run the actual session check
    const sessionPromise = getSupabaseClient().auth.getSession();
    
    // Race between the session check and timeout
    const { data, error } = await Promise.race([sessionPromise, timeoutPromise]);
    
    if (error) {
      console.error("Error checking session:", error.message);
      return false;
    }
    
    // Additionally check localStorage for token as fallback
    if (!data.session) {
      console.log("No session in Supabase response, checking localStorage...");
      const hasToken = Object.keys(localStorage).some(key => 
        key.startsWith('sb-') && key.includes('auth.token')
      );
      
      if (hasToken) {
        console.log("Found token in localStorage, considering user logged in");
        return true;
      }
    }
    
    return !!data.session;
  } catch (error) {
    console.error("Exception checking session:", error instanceof Error ? error.message : 'unknown error');
    
    // Last resort: check localStorage directly
    try {
      const hasToken = Object.keys(localStorage).some(key => 
        key.startsWith('sb-') && key.includes('auth.token')
      );
      
      if (hasToken) {
        console.log("Error recovery: Found token in localStorage despite session check error");
        return true;
      }
    } catch (storageError) {
      console.error("Failed to check localStorage:", storageError);
    }
    
    return false;
  }
};

/**
 * Gets the currently authenticated user
 * @returns User ID if authenticated, null otherwise
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data, error } = await getSupabaseClient().auth.getSession();
    if (error || !data.session) {
      return null;
    }
    
    return data.session.user.id;
  } catch (err) {
    console.error('Exception getting current user:', err);
    return null;
  }
}

interface DirectSpaceData {
  id: string;
  name: string;
  subdomain: string;
  created_at: string;
}

/**
 * Get owned spaces for a user directly
 * This bypasses React state and hooks for more reliable data fetching
 */
export async function getDirectUserSpaces(userId: string): Promise<DirectSpaceData[]> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('spaces')
      .select('id, name, subdomain, created_at')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching spaces:', error);
      return [];
    }
    
    return data || [];
  } catch (err) {
    console.error('Exception fetching spaces:', err);
    return [];
  }
}

// NOTE: The checkAndRedirectToUserSpace function is now removed since we're using 
// redirectToSpace() from spaceRedirect.ts which is more comprehensive 