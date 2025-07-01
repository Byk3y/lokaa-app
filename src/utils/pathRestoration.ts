/**
 * Path Restoration Utilities
 * 
 * Handles smart path tracking and restoration for better user experience,
 * especially on mobile devices when returning from background.
 */

// Constants
const STORAGE_KEY = 'lastVisitedPath';
const TIMESTAMP_KEY = 'lastVisitedPath_timestamp';
const PATH_EXPIRY_HOURS = 24; // 24 hours
const PATH_EXPIRY_MS = PATH_EXPIRY_HOURS * 60 * 60 * 1000;

// Paths that should never be persisted
const EXCLUDED_PATHS = [
  '/login',
  '/signup', 
  '/forgot-password',
  '/auth/callback',
  '/create-space',
  '/create',
  '/onboarding',
  '/fix',
  '/storage-debug',
  '/debug',
  '/supabase-example',
  '/',
  '/app', // Don't persist the redirect page itself
];

// Paths that should never be restored to
const NEVER_RESTORE_PATHS = [
  ...EXCLUDED_PATHS,
  '/discover', // Only restore to discover if explicitly intended
];

interface PathInfo {
  path: string;
  timestamp: number;
}

/**
 * Check if a path should be persisted (stored)
 */
export function shouldPersistPath(path: string): boolean {
  // Don't persist excluded paths
  if (EXCLUDED_PATHS.some(excluded => path === excluded || path.startsWith(excluded + '/'))) {
    return false;
  }
  
  // Don't persist query parameters or hash fragments
  if (path.includes('?') || path.includes('#')) {
    return false;
  }
  
  // Don't persist paths that look like redirects or temporary states
  if (path.includes('/redirect') || path.includes('/temp') || path.includes('/loading')) {
    return false;
  }
  
  return true;
}

/**
 * Check if a path should be restored
 */
export function shouldRestorePath(path: string, userId?: string): boolean {
  // Don't restore never-restore paths
  if (NEVER_RESTORE_PATHS.some(excluded => path === excluded || path.startsWith(excluded + '/'))) {
    return false;
  }
  
  // Don't restore if mobile session recovery is active
  if (typeof window !== 'undefined' && (window as any).mobileSessionManager) {
    const isReturningFromBackground = (window as any).mobileSessionManager.isReturningFromBackground();
    if (isReturningFromBackground) {
      console.log('🚫 [PathRestoration] Skipping path restoration - mobile session recovery active');
      return false;
    }
  }
  
  // Don't restore if user explicitly chose discover
  if (typeof window !== 'undefined') {
    const userWantsDiscover = sessionStorage.getItem('userWantsDiscover');
    if (userWantsDiscover === 'true') {
      console.log('🚫 [PathRestoration] Skipping path restoration - user wants discover');
      return false;
    }
  }
  
  // Don't restore if another path restoration is already in progress
  if (isPathRestorationActive()) {
    console.log('🚫 [PathRestoration] Skipping path restoration - restoration already in progress');
    return false;
  }
  
  return true;
}

/**
 * Store the current path in localStorage with timestamp
 */
export function persistPath(path: string): void {
  if (!shouldPersistPath(path)) {
    return;
  }
  
  try {
    const pathInfo: PathInfo = {
      path,
      timestamp: Date.now()
    };
    
    localStorage.setItem(STORAGE_KEY, path);
    localStorage.setItem(TIMESTAMP_KEY, pathInfo.timestamp.toString());
    
    console.log(`💾 [PathRestoration] Persisted path: ${path}`);
  } catch (error) {
    console.warn('Failed to persist path:', error);
  }
}

/**
 * Get the last visited path if it's valid and not stale
 */
export function getLastVisitedPath(): string | null {
  try {
    const path = localStorage.getItem(STORAGE_KEY);
    const timestampStr = localStorage.getItem(TIMESTAMP_KEY);
    
    if (!path || !timestampStr) {
      return null;
    }
    
    const timestamp = parseInt(timestampStr, 10);
    const isStale = Date.now() - timestamp > PATH_EXPIRY_MS;
    
    if (isStale) {
      console.log(`🕒 [PathRestoration] Path is stale (${Math.round((Date.now() - timestamp) / (1000 * 60 * 60))}h old), clearing`);
      clearLastVisitedPath();
      return null;
    }
    
    return path;
  } catch (error) {
    console.warn('Failed to get last visited path:', error);
    return null;
  }
}

/**
 * Clear the stored path
 */
export function clearLastVisitedPath(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TIMESTAMP_KEY);
    console.log('🧹 [PathRestoration] Cleared stored path');
  } catch (error) {
    console.warn('Failed to clear last visited path:', error);
  }
}

/**
 * Validate if a restored path is safe and accessible for the current user
 */
export async function validateRestoredPath(path: string, userId?: string): Promise<boolean> {
  // Basic validation
  if (!shouldRestorePath(path, userId)) {
    return false;
  }
  
  // Check if it's a space path that requires permission validation
  const spaceMatch = path.match(/^\/([^\/]+)\/space/);
  if (spaceMatch && userId) {
    const subdomain = spaceMatch[1];
    
    // Basic subdomain validation
    if (!subdomain || subdomain.length < 2) {
      console.log('🚫 [PathRestoration] Invalid subdomain in path');
      return false;
    }
    
    // For now, we'll assume the space access validation happens in SpaceProtectedRoute
    // In the future, we could add explicit permission checking here
    console.log(`✅ [PathRestoration] Space path validation passed for: ${subdomain}`);
  }
  
  return true;
}

/**
 * Attempt to restore the user to their last visited path
 */
export async function attemptPathRestoration(navigate: any, userId?: string): Promise<boolean> {
  const lastPath = getLastVisitedPath();
  
  if (!lastPath) {
    console.log('📍 [PathRestoration] No valid path to restore');
    return false;
  }
  
  console.log(`📍 [PathRestoration] Attempting to restore path: ${lastPath}`);
  
  // Validate the path
  const isValid = await validateRestoredPath(lastPath, userId);
  if (!isValid) {
    console.log('🚫 [PathRestoration] Path validation failed, clearing stored path');
    clearLastVisitedPath();
    return false;
  }
  
  try {
    // Navigate to the restored path
    navigate(lastPath, { replace: true, state: { fromPathRestoration: true } });
    console.log(`✅ [PathRestoration] Successfully restored path: ${lastPath}`);
    return true;
  } catch (error) {
    console.error('❌ [PathRestoration] Navigation failed:', error);
    clearLastVisitedPath();
    return false;
  }
}

/**
 * Get debug information about path restoration state
 */
export function getPathRestorationDebugInfo(): any {
  const lastPath = localStorage.getItem(STORAGE_KEY);
  const timestampStr = localStorage.getItem(TIMESTAMP_KEY);
  const timestamp = timestampStr ? parseInt(timestampStr, 10) : null;
  
  return {
    lastPath,
    timestamp,
    age: timestamp ? Date.now() - timestamp : null,
    ageHours: timestamp ? Math.round((Date.now() - timestamp) / (1000 * 60 * 60) * 10) / 10 : null,
    isStale: timestamp ? Date.now() - timestamp > PATH_EXPIRY_MS : null,
    mobileSessionActive: typeof window !== 'undefined' && (window as any).mobileSessionManager ? 
      (window as any).mobileSessionManager.isReturningFromBackground() : false,
    userWantsDiscover: typeof window !== 'undefined' ? 
      sessionStorage.getItem('userWantsDiscover') === 'true' : false
  };
}

/**
 * Check if path restoration is currently active
 * Used by mobile session manager to avoid conflicts
 */
export function isPathRestorationActive(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check for active path restoration flag
  const activeFlag = sessionStorage.getItem('pathRestoration_active');
  if (activeFlag) {
    const flagData = JSON.parse(activeFlag);
    const isRecent = Date.now() - flagData.timestamp < 10000; // 10 seconds
    return isRecent;
  }
  
  return false;
}

/**
 * Mark path restoration as active
 */
export function markPathRestorationActive(): void {
  if (typeof window === 'undefined') return;
  
  try {
    sessionStorage.setItem('pathRestoration_active', JSON.stringify({
      timestamp: Date.now(),
      active: true
    }));
  } catch (error) {
    console.warn('Failed to mark path restoration as active:', error);
  }
}

/**
 * Clear path restoration active flag
 */
export function clearPathRestorationActive(): void {
  if (typeof window === 'undefined') return;
  
  try {
    sessionStorage.removeItem('pathRestoration_active');
  } catch (error) {
    console.warn('Failed to clear path restoration active flag:', error);
  }
}

// Make debug function available in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).pathRestorationDebug = getPathRestorationDebugInfo;
  (window as any).pathRestorationActive = isPathRestorationActive;
} 