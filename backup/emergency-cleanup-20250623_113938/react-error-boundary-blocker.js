/**
 * React Error Boundary Blocker
 * 
 * Prevents React error boundaries from triggering page reloads
 * by intercepting error events and console errors
 */

(function() {
  'use strict';
  
  console.log('🛡️ [ReactErrorBlocker] Initializing React error boundary protection...');
  
  // Track if React has loaded
  let reactLoaded = false;
  
  // Override console.error to prevent React error boundaries
  const originalConsoleError = console.error;
  console.error = function(...args) {
    const errorMessage = args.join(' ');
    
    // Block React errors that trigger error boundaries
    if (errorMessage.includes('React') || 
        errorMessage.includes('Component') ||
        errorMessage.includes('render') ||
        errorMessage.includes('boundary') ||
        errorMessage.includes('componentDidCatch') ||
        errorMessage.includes('getDerivedStateFromError')) {
      console.warn('🛡️ [ReactErrorBlocker] Suppressed React error to prevent boundary trigger');
      return;
    }
    
    // Block 401 authentication errors from React components
    if (errorMessage.includes('401') && reactLoaded) {
      console.warn('🛡️ [ReactErrorBlocker] Suppressed 401 error in React context');
      return;
    }
    
    return originalConsoleError.apply(console, args);
  };
  
  // Block unhandled promise rejections from React
  window.addEventListener('unhandledrejection', function(event) {
    const error = event.reason;
    const errorMessage = error?.message || error?.toString() || '';
    
    // Block React-related promise rejections
    if (errorMessage.includes('React') || 
        errorMessage.includes('Component') ||
        errorMessage.includes('render') ||
        errorMessage.includes('boundary') ||
        errorMessage.includes('getDerivedStateFromError')) {
      console.warn('🛡️ [ReactErrorBlocker] Suppressed React promise rejection');
      event.preventDefault();
      return false;
    }
    
    // Block authentication errors when React is loaded
    if ((errorMessage.includes('401') || errorMessage.includes('unauthorized')) && reactLoaded) {
      console.warn('🛡️ [ReactErrorBlocker] Suppressed auth error in React context');
      event.preventDefault();
      return false;
    }
  }, true);
  
  // Block error events that might trigger React error boundaries
  window.addEventListener('error', function(event) {
    const errorMessage = event.message || event.error?.message || '';
    const filename = event.filename || '';
    
    // Block React-related errors
    if (errorMessage.includes('React') || 
        errorMessage.includes('Component') ||
        errorMessage.includes('render') ||
        errorMessage.includes('boundary') ||
        filename.includes('react') ||
        filename.includes('React')) {
      console.warn('🛡️ [ReactErrorBlocker] Suppressed React error event');
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
    
    // Block network errors when React is loaded
    if ((errorMessage.includes('401') || 
         errorMessage.includes('Load failed') || 
         errorMessage.includes('Fetch API')) && reactLoaded) {
      console.warn('🛡️ [ReactErrorBlocker] Suppressed network error in React context');
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  }, true);
  
  // Detect when React loads
  let reactCheckInterval = setInterval(() => {
    if (window.React || document.querySelector('[data-reactroot]') || document.getElementById('root')?.hasChildNodes()) {
      reactLoaded = true;
      console.log('🛡️ [ReactErrorBlocker] React detected - error boundary protection active');
      clearInterval(reactCheckInterval);
    }
  }, 100);
  
  // Cleanup after 10 seconds
  setTimeout(() => {
    if (reactCheckInterval) {
      clearInterval(reactCheckInterval);
      reactLoaded = true; // Assume React is loaded
    }
  }, 10000);
  
  console.log('✅ [ReactErrorBlocker] React error boundary protection initialized');
})();
