/**
 * Legacy Auth Debug Utility - Re-export Layer
 * 
 * This file has been migrated to TypeScript and moved to the shared debug services.
 * This file now serves as a backward-compatibility layer.
 * 
 * @deprecated Use @/shared/services/debug/auth-debug instead
 */

import { env } from '@/core/config/env';
import { authDebugger } from '@/shared/services/debug/auth-debug';

// Reference to the Supabase client we'll initialize later
let supabaseClient = null;

const authDebug = {
  // Initialize with the Supabase client
  init(supabase) {
    if (!env.isDevelopment) {
      console.warn('Auth debug utility is only available in development mode');
      return this;
    }
    
    // Initialize the new TypeScript debugger
    authDebugger.init(supabase);
    supabaseClient = supabase;
    return this;
  },

  // Legacy method - redirects to new service
  async checkSession() {
    if (!env.isDevelopment) {
      console.warn('Debug functions are only available in development mode');
      return { success: false, authenticated: false };
    }
    
    return await authDebugger.checkSession();
  },

  // Legacy method - redirects to new service
  checkStorage() {
    if (!env.isDevelopment) {
      console.warn('Debug functions are only available in development mode');
      return { success: false, allKeys: [], supabaseKeys: [], spaceKeys: [], otherKeys: [] };
    }
    
    return authDebugger.checkStorage();
  },

  // Legacy method - redirects to new service
  async getCurrentUser() {
    if (!env.isDevelopment) {
      console.warn('Debug functions are only available in development mode');
      return { success: false };
    }
    
    return await authDebugger.getCurrentUser();
  },

  // Legacy method - redirects to new service
  clearAuthStorage() {
    if (!env.isDevelopment) {
      console.warn('Debug functions are only available in development mode');
      return { success: false, removedKeys: [] };
    }
    
    return authDebugger.clearAuthStorage();
  },

  // Legacy method - redirects to new service
  async emergencySignOut() {
    if (!env.isDevelopment) {
      console.warn('Debug functions are only available in development mode');
      return { success: false };
    }
    
    return await authDebugger.emergencySignOut();
  }
};

// Only expose to window in development mode
if (env.isDevelopment && typeof window !== 'undefined') {
  window.authDebug = authDebug;
}

export default authDebug; 