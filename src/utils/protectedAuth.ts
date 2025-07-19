import { log } from '@/utils/logger';
/**
 * 🛡️ Protected Auth Utilities
 * 
 * Provides safe wrappers around auth operations that might fail
 * in mobile browser environments or during network issues
 */

import { getSupabaseClient } from '@/integrations/supabase/client';
import { devLogger } from '@/utils/developmentLogger';
import { migrationAdapter } from './indexeddb/migration/MigrationAdapter';

/**
 * Mobile-safe replacement for getSupabaseClient().auth.getUser()
 * Uses IndexedDB bridge to handle mobile browser blocking
 */
export async function getProtectedCurrentUser(options: {
  forceNetwork?: boolean;
} = {}) {
  try {
    return await migrationAdapter.getCurrentUser(options);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      log.warn('Utils', 'Protected auth fallback to direct call:', error);
    }
    
    // Final fallback to direct call
    try {
      return await getSupabaseClient().auth.getUser();
    } catch (directError) {
      return { data: { user: null }, error: directError, fromCache: false };
    }
  }
}

/**
 * Mobile-safe wrapper for presence updates
 * Uses IndexedDB bridge to handle mobile browser blocking
 */
export async function updateProtectedPresence(
  userId: string, 
  isOnline: boolean, 
  options: {
    forceNetwork?: boolean;
  } = {}
) {
  try {
    return await migrationAdapter.updateGlobalPresence(userId, isOnline, options);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      log.warn('Utils', 'Protected presence update failed:', error);
    }
    return { data: null, error, fromCache: false };
  }
}

/**
 * Check if we're in a mobile browser that might block network requests
 */
export function isMobileBrowser(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Check if user returned from mobile background recently (within 30 seconds)
 */
export function didJustReturnFromBackground(): boolean {
  if (typeof window === 'undefined') return false;
  
  const lastVisibilityChange = (window as any).__lastVisibilityChange;
  return lastVisibilityChange && (Date.now() - lastVisibilityChange) < 30000;
}

/**
 * Determine if we should use cache-first approach
 * Always returns boolean - true for mobile browsers (potential for blocking)
 */
export function shouldUseCacheFirst(): boolean {
  // Mobile browsers have potential for network blocking when returning from background
  // So we enable cache-first behavior for all mobile browsers as a safety measure
  return isMobileBrowser();
} 