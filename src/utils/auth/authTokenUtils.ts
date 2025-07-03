/**
 * Centralized Authentication Token Utilities
 * 
 * This module provides unified utilities for handling authentication tokens
 * across the application, ensuring consistent localStorage management and
 * eliminating the localStorage key inconsistency issues.
 * 
 * SECURITY NOTE: This replaces all custom localStorage token management
 * with Supabase's automatic token handling to prevent authentication issues.
 */

import { getSupabaseClient } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';

/**
 * All problematic localStorage keys that were discovered during investigation
 * These keys are used for cleanup but should NEVER be used for storage
 */
const PROBLEMATIC_AUTH_KEYS = [
  // Pattern 1: Custom function-based key (INCORRECT)
  'getSupabaseClient().auth.token',
  
  // Pattern 2: Simple auth key (INCORRECT) 
  'supabase.auth.token',
  
  // Legacy auth-related keys that may exist
  'lokaa-auth-cache',
  'lokaa-space-cache',
  'auth.token',
  'auth_token',
  'session_token',
] as const;

/**
 * Supabase project-specific keys that should be preserved
 * These are managed automatically by Supabase and should not be manually manipulated
 */
const SUPABASE_AUTH_PATTERN = /^sb-nmddvthcsyppyjncqfsk-auth/;

/**
 * Interface for auth token validation result
 */
interface AuthValidationResult {
  isValid: boolean;
  session: Session | null;
  hasInconsistentKeys: boolean;
  problematicKeys: string[];
  supabaseKeys: string[];
}

/**
 * Clear all problematic authentication tokens from localStorage
 * This function removes custom localStorage keys that conflict with Supabase's automatic management
 * 
 * @param preserveSupabaseKeys - Whether to preserve Supabase's automatic auth keys (default: true)
 * @returns Array of keys that were cleared
 */
export const clearAllAuthTokens = (preserveSupabaseKeys: boolean = true): string[] => {
  const clearedKeys: string[] = [];
  
  try {
    // Clear all problematic custom keys
    PROBLEMATIC_AUTH_KEYS.forEach(key => {
      try {
        if (localStorage.getItem(key) !== null) {
          localStorage.removeItem(key);
          clearedKeys.push(key);
        }
      } catch (error) {
        console.warn(`⚠️ [AuthTokenUtils] Failed to clear key ${key}:`, error);
      }
    });
    
    // Optionally clear Supabase keys (only during full logout)
    if (!preserveSupabaseKeys) {
      try {
        Object.keys(localStorage)
          .filter(key => SUPABASE_AUTH_PATTERN.test(key))
          .forEach(key => {
            try {
              localStorage.removeItem(key);
              clearedKeys.push(key);
            } catch (error) {
              console.warn(`⚠️ [AuthTokenUtils] Failed to clear Supabase key ${key}:`, error);
            }
          });
      } catch (error) {
        console.warn('⚠️ [AuthTokenUtils] Error during Supabase key cleanup:', error);
      }
    }
    
    return clearedKeys;
    
  } catch (error) {
    console.error('❌ [AuthTokenUtils] Critical error during auth token cleanup:', error);
    return clearedKeys;
  }
};

/**
 * Validate current authentication session and detect localStorage inconsistencies
 * This function checks for auth token inconsistencies and validates the current session
 * 
 * @returns Validation result with session status and inconsistency details
 */
export const validateAuthSession = async (): Promise<AuthValidationResult> => {
  const result: AuthValidationResult = {
    isValid: false,
    session: null,
    hasInconsistentKeys: false,
    problematicKeys: [],
    supabaseKeys: []
  };
  
  try {
    // Check for problematic custom keys
    PROBLEMATIC_AUTH_KEYS.forEach(key => {
      if (localStorage.getItem(key) !== null) {
        result.problematicKeys.push(key);
      }
    });
    
    // Check for Supabase keys
    Object.keys(localStorage)
      .filter(key => SUPABASE_AUTH_PATTERN.test(key))
      .forEach(key => {
        result.supabaseKeys.push(key);
      });
    
    // Mark as inconsistent if we have problematic keys
    result.hasInconsistentKeys = result.problematicKeys.length > 0;
    
    // Get current session from Supabase (the authoritative source)
    const { data: { session }, error } = await getSupabaseClient().auth.getSession();
    
    if (error) {
      console.warn('⚠️ [AuthTokenUtils] Session validation error:', error);
      return result;
    }
    
    result.session = session;
    result.isValid = !!session;
    
    if (result.hasInconsistentKeys) {
      console.warn(`⚠️ [AuthTokenUtils] Found ${result.problematicKeys.length} inconsistent auth keys:`, result.problematicKeys);
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ [AuthTokenUtils] Critical error during session validation:', error);
    return result;
  }
};

/**
 * Check if the current authentication session is valid
 * This is a simplified version of validateAuthSession for quick checks
 * 
 * @returns Boolean indicating if there's a valid session
 */
export const isValidAuthSession = async (): Promise<boolean> => {
  try {
    const { data: { session }, error } = await getSupabaseClient().auth.getSession();
    
    if (error) {
      console.warn('⚠️ [AuthTokenUtils] Quick session check error:', error);
      return false;
    }
    
    return !!session;
  } catch (error) {
    console.error('❌ [AuthTokenUtils] Error during quick session check:', error);
    return false;
  }
};

/**
 * Perform comprehensive auth cleanup and validation
 * This function combines cleanup and validation for migration scenarios
 * 
 * @param forceFullCleanup - Whether to clear all auth keys including Supabase's (default: false)
 * @returns Validation result after cleanup
 */
export const performAuthMigration = async (forceFullCleanup: boolean = false): Promise<AuthValidationResult> => {
  try {
    // First, validate current state
    const preCleanupValidation = await validateAuthSession();
    
    if (preCleanupValidation.hasInconsistentKeys) {
      // Clear problematic keys
      clearAllAuthTokens(!forceFullCleanup);
    }
    
    // Validate after cleanup
    const postCleanupValidation = await validateAuthSession();
    
    return postCleanupValidation;
    
  } catch (error) {
    console.error('❌ [AuthTokenUtils] Critical error during auth migration:', error);
    throw error;
  }
};

/**
 * Get diagnostic information about current auth storage state
 * Useful for debugging and monitoring
 * 
 * @returns Object with comprehensive auth storage diagnostics
 */
export const getAuthStorageDiagnostics = () => {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    problematicKeys: [] as string[],
    supabaseKeys: [] as string[],
    totalLocalStorageKeys: 0,
    storageUsage: 0
  };
  
  try {
    // Count total localStorage keys
    diagnostics.totalLocalStorageKeys = localStorage.length;
    
    // Calculate approximate storage usage
    diagnostics.storageUsage = JSON.stringify(localStorage).length;
    
    // Check for problematic keys
    PROBLEMATIC_AUTH_KEYS.forEach(key => {
      if (localStorage.getItem(key) !== null) {
        diagnostics.problematicKeys.push(key);
      }
    });
    
    // Check for Supabase keys
    Object.keys(localStorage)
      .filter(key => SUPABASE_AUTH_PATTERN.test(key))
      .forEach(key => {
        diagnostics.supabaseKeys.push(key);
      });
    
    return diagnostics;
  } catch (error) {
    console.error('❌ [AuthTokenUtils] Error getting storage diagnostics:', error);
    return diagnostics;
  }
};

/**
 * Emergency auth recovery function
 * Use this function when authentication is completely broken
 * 
 * @returns Promise resolving to recovery success
 */
export const emergencyAuthRecovery = async (): Promise<boolean> => {
  try {
    // Step 1: Clear all auth-related localStorage
    clearAllAuthTokens(false); // Clear everything including Supabase keys
    
    // Step 2: Sign out from Supabase to reset state
    await getSupabaseClient().auth.signOut();
    
    // Step 3: Wait for state to settle
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 4: Verify recovery
    const postRecoveryValidation = await validateAuthSession();
    
    const recoverySuccess = !postRecoveryValidation.hasInconsistentKeys;
    
    if (!recoverySuccess) {
      console.error('❌ [AuthTokenUtils] Emergency recovery failed - inconsistencies remain.');
    }
    
    return recoverySuccess;
    
  } catch (error) {
    console.error('❌ [AuthTokenUtils] Critical error during emergency recovery:', error);
    return false;
  }
};

// Export types for use in other modules
export type { AuthValidationResult }; 