import { log } from '@/utils/logger';
import { env } from "@/core/config/env";

// Extend Window interface for debugging tools
declare global {
  interface Window {
    profileRedirectFix?: ProfileRedirectDebugger;
  }
}

/**
 * Profile redirect debug interface
 */
export interface ProfileRedirectDebugInfo {
  counter: number;
  lastSlug: string | null;
  hasWarned: boolean;
}

/**
 * Environment-safe profile redirect utilities
 * Prevents redirection loops with profile pages
 */
class ProfileRedirectDebugger {
  private redirectCounter = 0;
  private lastSlug: string | null = null;
  private hasWarned = false;

  constructor() {
    // Log to make it easier to debug
    log.debug('Service', '📋 Profile redirect fix utility loaded');

    // Reset counter when page loads
    if (typeof window !== 'undefined') {
      window.addEventListener('load', () => {
        log.debug('Service', '📋 Window loaded, resetting profile redirect counter');
        this.resetProfileRedirectCounter();
      });
    }
  }

  /**
   * Check if we should allow another redirect to prevent infinite loops
   */
  shouldAllowProfileRedirect(slug: string): boolean {
    // Always allow first redirect
    if (this.redirectCounter === 0) {
      log.debug('Service', `📋 First redirect to ${slug}, allowing`);
      this.redirectCounter++;
      this.lastSlug = slug;
      return true;
    }
    
    // If it's a different slug, reset counter and allow
    if (slug !== this.lastSlug) {
      log.debug('Service', `📋 New slug ${slug} different from previous ${this.lastSlug}, allowing`);
      this.redirectCounter = 1;
      this.lastSlug = slug;
      return true;
    }
    
    // Increment counter for same slug
    this.redirectCounter++;
    
    // If we've already redirected too many times, block the redirect
    if (this.redirectCounter > 3) {
      if (!this.hasWarned) {
        log.error('Service', `📋 Too many redirects (${this.redirectCounter}) to ${slug}, possible loop detected`);
        this.hasWarned = true;
      }
      return false;
    }
    
    log.debug('Service', `📋 Redirect #${this.redirectCounter} to ${slug}, still allowing`);
    return true;
  }

  /**
   * Reset the redirect counter (useful when navigation is triggered by user)
   */
  resetProfileRedirectCounter(): void {
    log.debug('Service', '📋 Manually resetting profile redirect counter');
    this.redirectCounter = 0;
    this.lastSlug = null;
    this.hasWarned = false;
  }

  /**
   * Get the current redirect count
   */
  getProfileRedirectCount(): number {
    return this.redirectCounter;
  }

  /**
   * Get debug information
   */
  getDebugInfo(): ProfileRedirectDebugInfo {
    return {
      counter: this.redirectCounter,
      lastSlug: this.lastSlug,
      hasWarned: this.hasWarned
    };
  }
}

// Create singleton instance
export const profileRedirectDebugger = new ProfileRedirectDebugger();

// Export individual functions for backward compatibility
export const shouldAllowProfileRedirect = (slug: string): boolean => 
  profileRedirectDebugger.shouldAllowProfileRedirect(slug);

export const resetProfileRedirectCounter = (): void => 
  profileRedirectDebugger.resetProfileRedirectCounter();

export const getProfileRedirectCount = (): number => 
  profileRedirectDebugger.getProfileRedirectCount();

// Development-only window exposure
if (env.isDevelopment && typeof window !== 'undefined') {
  window.profileRedirectFix = profileRedirectDebugger;
}

// Export default for programmatic use
export default {
  shouldAllowProfileRedirect,
  resetProfileRedirectCounter,
  getProfileRedirectCount,
  debugger: profileRedirectDebugger
}; 