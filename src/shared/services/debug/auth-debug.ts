import { getSupabaseClient } from "@/integrations/supabase/client";
import { env } from "@/core/config/env";
import type { Session, User } from "@supabase/supabase-js";

// Extend Window interface for debugging tools
declare global {
  interface Window {
    authDebug?: AuthDebugger;
  }
}

/**
 * Session check result interface
 */
export interface SessionCheckResult {
  success: boolean;
  authenticated: boolean;
  session?: {
    user: User;
    expires_at_formatted: string;
    created_at_formatted: string;
    expires_at?: number;
  };
  error?: any;
}

/**
 * User check result interface
 */
export interface UserCheckResult {
  success: boolean;
  user?: User;
  message?: string;
  error?: any;
}

/**
 * Storage analysis result interface
 */
export interface StorageAnalysisResult {
  success: boolean;
  total: number;
  supabaseRelated: number;
  spaceRelated: number;
  other: number;
  allKeys: string[];
  supabaseKeys: string[];
  spaceKeys: string[];
  otherKeys: string[];
  error?: any;
}

/**
 * Clear storage result interface
 */
export interface ClearStorageResult {
  success: boolean;
  removedKeys: string[];
  error?: any;
}

/**
 * Emergency sign out result interface
 */
export interface EmergencySignOutResult {
  success: boolean;
  error?: any;
}

/**
 * Environment-safe authentication debugging utilities
 * Only available in development mode
 */
class AuthDebugger {
  private supabaseClient: typeof supabase | null = null;
  private isInitialized = false;

  /**
   * Initialize with the Supabase client
   */
  init(supabaseClient: typeof supabase): this {
    if (!env.isDevelopment) {
      console.warn('Auth debugger is only available in development mode');
      return this;
    }

    this.supabaseClient = supabaseClient;
    this.isInitialized = true;
    console.log('Auth debug utility initialized');
    return this;
  }

  /**
   * Check current session details
   */
  async checkSession(): Promise<SessionCheckResult> {
    if (!this.isInitialized || !this.supabaseClient) {
      console.error('Not initialized. Call authDebug.init(supabase) first');
      return { success: false, authenticated: false };
    }

    try {
      const { data, error } = await this.supabaseClient.auth.getSession();
      
      if (error) {
        console.error('Session check error:', error);
        return { success: false, authenticated: false, error };
      }
      
      if (!data.session) {
        console.log('No active session found');
        return { success: false, authenticated: false };
      }
      
      // Format the session data for readability
      const { access_token, refresh_token, ...sessionDetails } = data.session;
      const userDetails = data.session.user;
      
      const formattedSession = {
        user: userDetails,
        expires_at_formatted: new Date((data.session.expires_at || 0) * 1000).toLocaleString(),
        created_at_formatted: 'Session created',
        expires_at: sessionDetails.expires_at
      };
      
      console.log('Active session found:', {
        user: userDetails,
        expires_at: formattedSession.expires_at_formatted,
        has_access_token: !!access_token,
        has_refresh_token: !!refresh_token
      });
      
      return { 
        success: true, 
        authenticated: true,
        session: formattedSession
      };
    } catch (error) {
      console.error('Exception checking session:', error);
      return { success: false, authenticated: false, error };
    }
  }

  /**
   * Check and analyze localStorage for debugging
   */
  checkStorage(): StorageAnalysisResult {
    if (!env.isDevelopment) {
      console.warn('Storage analysis is only available in development mode');
      return {
        success: false,
        total: 0,
        supabaseRelated: 0,
        spaceRelated: 0,
        other: 0,
        allKeys: [],
        supabaseKeys: [],
        spaceKeys: [],
        otherKeys: []
      };
    }

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
      
      const result = {
        success: true,
        total: allKeys.length,
        supabaseRelated: supabaseKeys.length,
        spaceRelated: spaceKeys.length,
        other: otherKeys.length,
        allKeys,
        supabaseKeys,
        spaceKeys,
        otherKeys
      };
      
      console.log('Local storage analysis:', {
        total: result.total,
        supabaseRelated: result.supabaseRelated,
        spaceRelated: result.spaceRelated,
        other: result.other
      });
      
      console.log('Supabase keys:', supabaseKeys);
      console.log('Space keys:', spaceKeys);
      console.log('Other keys:', otherKeys);
      
      return result;
    } catch (error) {
      console.error('Error checking localStorage:', error);
      return { 
        success: false,
        total: 0,
        supabaseRelated: 0,
        spaceRelated: 0,
        other: 0,
        allKeys: [],
        supabaseKeys: [],
        spaceKeys: [],
        otherKeys: [],
        error 
      };
    }
  }

  /**
   * Get current user ID directly using getUser
   */
  async getCurrentUser(): Promise<UserCheckResult> {
    if (!this.isInitialized || !this.supabaseClient) {
      console.error('Not initialized. Call authDebug.init(supabase) first');
      return { success: false };
    }

    try {
      const { data, error } = await this.supabaseClient.auth.getUser();
      
      if (error) {
        console.error('Error getting user:', error);
        return { success: false, error };
      }
      
      if (!data.user) {
        console.log('No user found');
        return { success: false, message: 'No user found' };
      }
      
      const userDetails = data.user;
      
      console.log('Current user:', userDetails);
      return { success: true, user: userDetails };
    } catch (error) {
      console.error('Exception getting user:', error);
      return { success: false, error };
    }
  }

  /**
   * Clear authentication-related localStorage and reload
   */
  clearAuthStorage(): ClearStorageResult {
    if (!env.isDevelopment) {
      console.warn('Storage clearing is only available in development mode');
      return { success: false, removedKeys: [] };
    }

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
    } catch (error) {
      console.error('Error clearing auth storage:', error);
      return { success: false, removedKeys: [], error };
    }
  }

  /**
   * Sign out and clear all storage - useful for debugging
   */
  async emergencySignOut(): Promise<EmergencySignOutResult> {
    if (!this.isInitialized || !this.supabaseClient) {
      console.error('Not initialized. Call authDebug.init(supabase) first');
      return { success: false };
    }

    if (!env.isDevelopment) {
      console.warn('Emergency sign out is only available in development mode');
      return { success: false };
    }

    try {
      // Sign out
      console.log('Signing out...');
      await this.supabaseClient.auth.signOut();
      
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
    } catch (error) {
      console.error('Error in emergency sign out:', error);
      return { success: false, error };
    }
  }
}

// Create singleton instance
export const authDebugger = new AuthDebugger();

// Development-only window exposure
if (env.isDevelopment && typeof window !== 'undefined') {
  window.authDebug = authDebugger;
}

// Export for programmatic use
export default authDebugger; 