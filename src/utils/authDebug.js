/**
 * Auth debugging utilities
 * To be used in the browser console for diagnosing login and session issues
 */

// Reference to the Supabase client we'll initialize later
let supabaseClient = null;

const authDebug = {
  // Initialize with the Supabase client
  init(supabase) {
    supabaseClient = supabase;
    console.log('Auth debug utility initialized');
    return this;
  },

  // Check current session details
  async checkSession() {
    if (!supabaseClient) {
      console.error('Not initialized. Call authDebug.init(supabase) first');
      return null;
    }

    try {
      const { data, error } = await supabaseClient.auth.getSession();
      
      if (error) {
        console.error('Session check error:', error);
        return { success: false, error };
      }
      
      if (!data.session) {
        console.log('No active session found');
        return { success: false, authenticated: false };
      }
      
      // Format the session data for readability
      const { access_token, refresh_token, ...sessionDetails } = data.session;
      const { password, ...userDetails } = data.session.user;
      
      console.log('Active session found:', {
        user: userDetails,
        expires_at: new Date(data.session.expires_at * 1000).toLocaleString(),
        created_at: new Date(data.session.created_at * 1000).toLocaleString(),
        has_access_token: !!access_token,
        has_refresh_token: !!refresh_token
      });
      
      return { 
        success: true, 
        authenticated: true,
        session: {
          ...sessionDetails,
          user: userDetails,
          expires_at_formatted: new Date(data.session.expires_at * 1000).toLocaleString(),
          created_at_formatted: new Date(data.session.created_at * 1000).toLocaleString(),
        }
      };
    } catch (error) {
      console.error('Exception checking session:', error);
      return { success: false, error };
    }
  },

  // Check and clear localStorage for debugging
  checkStorage() {
    try {
      // Get all keys
      const allKeys = Object.keys(localStorage);
      
      // Filter Supabase related keys
      const supabaseKeys = allKeys.filter(key => 
        key.startsWith('sb-') || key.includes('supabase')
      );
      
      const spaceKeys = allKeys.filter(key => 
        key.includes('space') || key.includes('lastVisited') || key.includes('lastCreated')
      );
      
      const otherKeys = allKeys.filter(key => 
        !supabaseKeys.includes(key) && !spaceKeys.includes(key)
      );
      
      console.log('Local storage analysis:', {
        total: allKeys.length,
        supabaseRelated: supabaseKeys.length,
        spaceRelated: spaceKeys.length,
        other: otherKeys.length
      });
      
      console.log('Supabase keys:', supabaseKeys);
      console.log('Space keys:', spaceKeys);
      console.log('Other keys:', otherKeys);
      
      return {
        success: true,
        allKeys,
        supabaseKeys,
        spaceKeys,
        otherKeys
      };
    } catch (e) {
      console.error('Error checking localStorage:', e);
      return { success: false, error: e };
    }
  },

  // Get current user ID directly using getUser
  async getCurrentUser() {
    if (!supabaseClient) {
      console.error('Not initialized. Call authDebug.init(supabase) first');
      return null;
    }

    try {
      const { data, error } = await supabaseClient.auth.getUser();
      
      if (error) {
        console.error('Error getting user:', error);
        return { success: false, error };
      }
      
      if (!data.user) {
        console.log('No user found');
        return { success: false, message: 'No user found' };
      }
      
      const { password, ...userDetails } = data.user;
      
      console.log('Current user:', userDetails);
      return { success: true, user: userDetails };
    } catch (e) {
      console.error('Exception getting user:', e);
      return { success: false, error: e };
    }
  },

  // Clear authentication-related localStorage and reload
  clearAuthStorage() {
    try {
      const supabaseKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('sb-') || key.includes('supabase')
      );
      
      console.log('Removing Supabase keys:', supabaseKeys);
      
      supabaseKeys.forEach(key => {
        localStorage.removeItem(key);
      });
      
      console.log('Auth storage cleared. Page will reload in 2 seconds...');
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
      return { success: true, removedKeys: supabaseKeys };
    } catch (e) {
      console.error('Error clearing auth storage:', e);
      return { success: false, error: e };
    }
  },

  // Sign out and clear all storage - useful for debugging
  async emergencySignOut() {
    if (!supabaseClient) {
      console.error('Not initialized. Call authDebug.init(supabase) first');
      return null;
    }

    try {
      // Sign out
      console.log('Signing out...');
      await supabaseClient.auth.signOut();
      
      // Clear localStorage
      console.log('Clearing localStorage...');
      localStorage.clear();
      
      // Clear sessionStorage
      console.log('Clearing sessionStorage...');
      sessionStorage.clear();
      
      console.log('Emergency sign out complete. Redirecting to home in 2 seconds...');
      
      // Redirect to home
      setTimeout(() => {
        window.location.href = '/?reset=true';
      }, 2000);
      
      return { success: true };
    } catch (e) {
      console.error('Error in emergency sign out:', e);
      return { success: false, error: e };
    }
  }
};

// Expose to window if in browser
if (typeof window !== 'undefined') {
  window.authDebug = authDebug;
}

export default authDebug; 