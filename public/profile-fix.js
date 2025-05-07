/**
 * Redirect Loop Fix
 * 
 * This script patches the window object to intercept and prevent redirect loops.
 */

console.log('📋 Loading redirect loop fix utility');

// Execute immediately when the script loads
(function() {
  // Store the original location functionality
  const originalLocationAssign = window.location.assign;
  const originalLocationReplace = window.location.replace;
  const originalHistoryPushState = window.history.pushState;
  const originalHistoryReplaceState = window.history.replaceState;
  
  // Track redirects
  let redirectCounter = {};
  let lastRedirectTime = Date.now();

  // Function to increment redirect count and check for loops
  function trackRedirect(url) {
    if (!url) return true;
    
    // Don't count redirects that happen more than 5 seconds apart
    // This allows for normal navigation
    const now = Date.now();
    if (now - lastRedirectTime > 5000) {
      console.log('📋 Resetting redirect counter - user initiated navigation');
      redirectCounter = {};
    }
    lastRedirectTime = now;
    
    // Normalize URL
    let normalizedUrl = url;
    if (typeof url === 'string') {
      // Handle both absolute and relative URLs
      try {
        normalizedUrl = new URL(url, window.location.origin).pathname;
      } catch (e) {
        normalizedUrl = url;
      }
    }
    
    // Count this redirect
    redirectCounter[normalizedUrl] = (redirectCounter[normalizedUrl] || 0) + 1;
    
    // Special handling for profile routes
    if (typeof normalizedUrl === 'string' && normalizedUrl.includes('/@')) {
      console.log(`📋 Profile route detected: ${normalizedUrl}`);
      
      // If we've been redirected to the same profile route multiple times
      if (redirectCounter[normalizedUrl] > 3) {
        console.error(`📋 Profile redirect loop detected! Going to discover page instead`);
        window.location.href = '/discover';
        return false;
      }
    }
    
    // Check if we're in a loop for any URL
    if (redirectCounter[normalizedUrl] > 5) {
      console.error(`📋 Redirect loop detected! Blocked redirect to ${normalizedUrl} (${redirectCounter[normalizedUrl]} redirects)`);
      return false;
    }
    
    console.log(`📋 Allowing redirect to ${normalizedUrl} (${redirectCounter[normalizedUrl]} redirects)`);
    return true;
  }

  // Patch window.location.assign
  window.location.assign = function(url) {
    if (trackRedirect(url)) {
      return originalLocationAssign.apply(window.location, arguments);
    }
    console.warn('📋 Blocked location.assign redirect to prevent loop');
    return false;
  };
  
  // Patch window.location.replace
  window.location.replace = function(url) {
    if (trackRedirect(url)) {
      return originalLocationReplace.apply(window.location, arguments);
    }
    console.warn('📋 Blocked location.replace redirect to prevent loop');
    return false;
  };
  
  // Patch window.history.pushState
  window.history.pushState = function(state, title, url) {
    if (trackRedirect(url)) {
      return originalHistoryPushState.apply(window.history, arguments);
    }
    console.warn('📋 Blocked history.pushState redirect to prevent loop');
    return false;
  };
  
  // Patch window.history.replaceState
  window.history.replaceState = function(state, title, url) {
    if (trackRedirect(url)) {
      return originalHistoryReplaceState.apply(window.history, arguments);
    }
    console.warn('📋 Blocked history.replaceState redirect to prevent loop');
    return false;
  };

  // Add global access for debugging
  window.__redirectDebug = {
    getRedirectCounter: () => redirectCounter,
    resetRedirectCounter: () => {
      redirectCounter = {};
      console.log('📋 Redirect counter manually reset');
    },
    disableAllRedirects: () => {
      window.location.assign = function() { 
        console.warn('📋 All redirects disabled - blocked location.assign');
        return false;
      };
      window.location.replace = function() { 
        console.warn('📋 All redirects disabled - blocked location.replace');
        return false;
      };
      window.history.pushState = function() { 
        console.warn('📋 All redirects disabled - blocked history.pushState');
        return false;
      };
      window.history.replaceState = function() { 
        console.warn('📋 All redirects disabled - blocked history.replaceState');
        return false;
      };
      console.log('📋 All redirects are now disabled');
    },
    enableAllRedirects: () => {
      window.location.assign = originalLocationAssign;
      window.location.replace = originalLocationReplace;
      window.history.pushState = originalHistoryPushState;
      window.history.replaceState = originalHistoryReplaceState;
      console.log('📋 All redirects are now enabled (original behavior)');
    }
  };
  
  // Special handling for the current page if it's a profile page
  if (window.location.pathname.includes('/@')) {
    console.log('📋 Profile page detected on load, adding special handling');
    
    // Set a flag to help prevent loops
    window.__isOnProfilePage = true;
    
    // Override React Router's internal hook to prevent further redirect loops
    setTimeout(() => {
      if (window.__isOnProfilePage) {
        console.log('📋 Still on profile page after timeout, applying extra protection');
        
        // Try to prevent profile hooks from being called incorrectly
        try {
          // Skip any further redirects for profile pages
          window.__redirectDebug.disableAllRedirects();
          console.log('📋 Disabled further redirects for profile page');
        } catch (e) {
          console.error('📋 Error applying profile page protection:', e);
        }
      }
    }, 3000);
  }
  
  console.log('📋 Redirect loop protection installed');
})(); 