/**
 * Profile Redirect Fix Utility
 * 
 * This utility helps prevent redirection loops with profile pages.
 * It keeps track of redirect attempts and prevents infinite loops.
 */

let redirectCounter = 0;
let lastSlug = null;
let hasWarned = false;

// Log to make it easier to debug
console.log('📋 Profile redirect fix utility loaded');

// Reset counter when page loads
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    console.log('📋 Window loaded, resetting profile redirect counter');
    redirectCounter = 0;
    lastSlug = null;
    hasWarned = false;
  });
}

/**
 * Check if we should allow another redirect to prevent infinite loops
 * @param {string} slug - The profile slug we're redirecting to
 * @returns {boolean} - True if redirect should be allowed, false otherwise
 */
export function shouldAllowProfileRedirect(slug) {
  // Always allow first redirect
  if (redirectCounter === 0) {
    console.log(`📋 First redirect to ${slug}, allowing`);
    redirectCounter++;
    lastSlug = slug;
    return true;
  }
  
  // If it's a different slug, reset counter and allow
  if (slug !== lastSlug) {
    console.log(`📋 New slug ${slug} different from previous ${lastSlug}, allowing`);
    redirectCounter = 1;
    lastSlug = slug;
    return true;
  }
  
  // Increment counter for same slug
  redirectCounter++;
  
  // If we've already redirected too many times, block the redirect
  if (redirectCounter > 3) {
    if (!hasWarned) {
      console.error(`📋 Too many redirects (${redirectCounter}) to ${slug}, possible loop detected`);
      hasWarned = true;
    }
    return false;
  }
  
  console.log(`📋 Redirect #${redirectCounter} to ${slug}, still allowing`);
  return true;
}

/**
 * Reset the redirect counter (useful when navigation is triggered by user)
 */
export function resetProfileRedirectCounter() {
  console.log('📋 Manually resetting profile redirect counter');
  redirectCounter = 0;
  lastSlug = null;
  hasWarned = false;
}

/**
 * Get the current redirect count
 * @returns {number} - Current redirect count
 */
export function getProfileRedirectCount() {
  return redirectCounter;
}

// Make available globally for debugging
if (typeof window !== 'undefined') {
  window.profileRedirectFix = {
    shouldAllowProfileRedirect,
    resetProfileRedirectCounter,
    getProfileRedirectCount,
    _debug: {
      get counter() { return redirectCounter; },
      get lastSlug() { return lastSlug; },
      get hasWarned() { return hasWarned; }
    }
  };
}

export default {
  shouldAllowProfileRedirect,
  resetProfileRedirectCounter,
  getProfileRedirectCount
};
