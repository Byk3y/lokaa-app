import { log } from '@/utils/logger';
/**
 * Utilities for reliable profile page navigation and redirection
 * 
 * Phase 3.2: Updated for space-based profile discovery
 * - Global profiles: /profile/:username (legacy, will redirect to space-specific)
 * - Space profiles: /:subdomain/profile/:username (new pattern)
 */
import { NavigateFunction } from 'react-router-dom';

// Store for tracking redirect attempts to prevent loops
const redirectTracker = {
  attempts: new Map<string, number>(),
  MAX_ATTEMPTS: 2,
  
  recordAttempt(url: string): boolean {
    const currentAttempts = this.attempts.get(url) || 0;
    const newAttempts = currentAttempts + 1;
    this.attempts.set(url, newAttempts);
    
    // Return true if we've exceeded max attempts (prevent further redirects)
    return newAttempts > this.MAX_ATTEMPTS;
  },
  
  reset(url: string): void {
    this.attempts.delete(url);
  },
  
  clearAll(): void {
    this.attempts.clear();
  }
};

/**
 * Phase 3.2: Generate space-based profile URL
 * @param subdomain Space subdomain
 * @param username Username
 * @returns Space-based profile URL
 */
export function generateSpaceProfileUrl(subdomain: string, username: string): string {
  return `/${subdomain}/profile/${username}`;
}

/**
 * Phase 3.2: Parse space-based profile URL
 * @param url URL or pathname to check
 * @returns Object with information about the space profile URL
 */
export function parseSpaceProfileUrl(url: string): {
  isSpaceProfileUrl: boolean;
  subdomain: string | null;
  username: string | null;
  correctUrl: string | null;
} {
  // Get only the pathname part if a full URL is provided
  const pathname = url.startsWith('http') ? new URL(url).pathname : url;
  
  // Check if this is a space profile URL: /:subdomain/profile/:username
  const spaceProfileRegex = /^\/([^/]+)\/profile\/([^/]+)(?:\/.*)?$/;
  const match = pathname.match(spaceProfileRegex);
  
  if (!match) {
    return { isSpaceProfileUrl: false, subdomain: null, username: null, correctUrl: null };
  }
  
  const subdomain = match[1];
  const username = match[2];
  
  // Normalize to the correct format: /:subdomain/profile/:username
  const correctUrl = `/${subdomain}/profile/${username}`;
  
  // Check if the URL is already in the correct format
  const isCorrectFormat = pathname === correctUrl;
  
  return {
    isSpaceProfileUrl: true,
    subdomain,
    username,
    correctUrl: isCorrectFormat ? null : correctUrl
  };
}

/**
 * Checks if a URL is a profile URL and ensures it's in the correct format
 * @param url URL or pathname to check
 * @returns Object with information about the profile URL
 */
export function parseProfileUrl(url: string): {
  isProfileUrl: boolean;
  username: string | null;
  correctUrl: string | null;
} {
  // Get only the pathname part if a full URL is provided
  const pathname = url.startsWith('http') ? new URL(url).pathname : url;
  
  // Check if this is a profile URL in any form
  const profileRegex = /^\/?profile\/([^/]+)(?:\/.*)?$/;
  const match = pathname.match(profileRegex);
  
  if (!match) {
    // Fallback check for old /@username format for transition period or direct links
    const oldProfileRegex = /^\/?@([^/]+)(?:\/.*)?$/;
    const oldMatch = pathname.match(oldProfileRegex);
    if (oldMatch) {
      const username = oldMatch[1];
      const correctUrl = `/profile/${username}`;
      log.warn('Utils', `parseProfileUrl: Detected old format /@${username}, converting to ${correctUrl}`);
      return {
        isProfileUrl: true,
        username,
        correctUrl: correctUrl,
      };
    }
    return { isProfileUrl: false, username: null, correctUrl: null };
  }
  
  // Extract the username from the new /profile/username format
  const username = match[1];
  
  // Normalize to the correct format: /profile/username
  const correctUrl = `/profile/${username}`;
  
  // Check if the URL is already in the correct format
  const isCorrectFormat = pathname === correctUrl;
  
  return {
    isProfileUrl: true,
    username,
    correctUrl: isCorrectFormat ? null : correctUrl
  };
}

/**
 * Phase 3.2: Safely navigates to a space-based profile page
 * @param navigate React Router navigate function
 * @param subdomain Space subdomain
 * @param username Username to navigate to
 * @returns true if navigation was performed, false if prevented
 */
export function safelyNavigateToSpaceProfile(
  navigate: NavigateFunction,
  subdomain: string,
  username: string
): boolean {
  if (!subdomain || !username) {
    log.warn('Utils', 'safelyNavigateToSpaceProfile: Empty subdomain or username provided');
    return false;
  }
  
  // Construct the target URL
  const targetUrl = `/${subdomain}/profile/${username.replace(/^@/, '')}`;
  
  // Check if we've already tried too many times
  if (redirectTracker.recordAttempt(targetUrl)) {
    log.warn('Utils', `safelyNavigateToSpaceProfile: Too many redirect attempts for ${targetUrl}, preventing further redirects`);
    return false;
  }
  
  log.debug('Utils', `safelyNavigateToSpaceProfile: Navigating to space profile: ${targetUrl}`);
  navigate(targetUrl, { replace: true });
  return true;
}

/**
 * Safely navigates to a profile page, preventing redirect loops
 * @param navigate React Router navigate function
 * @param username Username to navigate to
 * @returns true if navigation was performed, false if prevented
 */
export function safelyNavigateToProfile(
  navigate: NavigateFunction,
  username: string
): boolean {
  if (!username) {
    log.warn('Utils', 'safelyNavigateToProfile: Empty username provided');
    return false;
  }
  
  // Construct the target URL
  const targetUrl = `/profile/${username.replace(/^@/, '')}`;
  
  // Check if we've already tried too many times
  if (redirectTracker.recordAttempt(targetUrl)) {
    log.warn('Utils', `Profile redirect loop detected for ${targetUrl}, stopping redirects`);
    return false;
  }
  
  // Perform the navigation
  log.debug('Utils', `Navigating to profile: ${targetUrl}`);
  navigate(targetUrl, { replace: true });
  return true;
}

/**
 * Clears the redirect tracking
 */
export function resetRedirectTracking(): void {
  redirectTracker.clearAll();
} 