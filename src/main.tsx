import { log } from '@/utils/logger';
// Load polyfills first
import './polyfills'

import React from 'react'
import ReactDOM from 'react-dom/client'

// Debug React loading
console.log('🚀 [Main] React import:', React);
console.log('🚀 [Main] ReactDOM import:', ReactDOM);
import App from './App.tsx'
import './index.css'

// HMR OPTIMIZATION: Initialize HMR optimizer for development
import './utils/hmrOptimizer'
// Legacy modal import removed - now handled by modern system with bridge
// import './utils/authModals' // REMOVED
// import { redirectToSpace } from './utils/spaceRedirect'

// MOBILE OPTIMIZATION: Initialize mobile component preloader
import { MobileComponentPreloader } from './utils/mobileComponentPreloader'

// Service worker temporarily disabled to fix preload errors
// Initialize service worker manager
// import { ServiceWorkerManager } from './utils/serviceWorkerManager';

// Clear any existing service workers in all environments
if ('serviceWorker' in navigator && navigator.serviceWorker) {
  navigator.serviceWorker
    .getRegistrations()
    .then(registrations => {
      registrations.forEach(registration => {
        log.debug('App', '🧹 Unregistering service worker:', registration.scope);
        registration.unregister();
      });
    })
    .catch(err => {
      log.warn('App', '⚠️ Error clearing service workers:', err);
    });
} else {
  log.debug('App', 'ℹ️ Service workers not supported in this environment');
}

// Immediate space redirection for authenticated users
// Run before React app initialization
// This ensures users with spaces don't see the Discover page at all
/* (async function immediateSpaceRedirect() {
  log.debug('App', '🔍 Checking for immediate redirection opportunities');
  
  // Only run on Discover page or home page 
  const isOnDiscoverPage = window.location.pathname === '/discover' || window.location.pathname === '/'
  
  if (isOnDiscoverPage) {
    log.debug('App', '🔀 Attempting immediate space redirection...')
    
    // Add console entries to help debug local storage issues
    try {
      // Check if we have any cached spaces
      const hasLastCreatedSpace = !!localStorage.getItem('lastCreatedSpace');
      const hasLastVisitedSpace = !!localStorage.getItem('lastVisitedSpace');
      
      log.debug('App', '📋 localStorage check:', {
        hasLastCreatedSpace,
        hasLastVisitedSpace,
        currentPath: window.location.pathname,
        href: window.location.href,
        timestamp: new Date().toISOString()
      });
    } catch (storageError) {
      log.warn('App', '⚠️ Error checking localStorage:', storageError);
    }
    
    try {
      // Attempt direct redirection with a short timeout
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(() => reject(new Error('Redirection timeout')), 5000)
      });
      
      // Start the actual redirection - no navigate function means window.location.href will be used
      const redirectionPromise = redirectToSpace().catch(async (err: unknown) => {
        log.error('App', '❌ Error in redirectToSpace:', err);
        // Returning false means no redirection happened - let the app continue loading
        return false;
      });
      
      // Race between redirection and timeout
      const redirected = await Promise.race([redirectionPromise, timeoutPromise])
        .catch((err: unknown) => {
          log.warn('App', '⚠️ Redirection failed with timeout or error:', err);
          return false;
        });
        
      if (redirected) {
        log.debug('App', '✅ Successfully redirected user to space');
      } else {
        log.debug('App', 'ℹ️ No redirection performed, continuing to load app');
      }
    } catch (err: unknown) {
      log.error('App', '❌ Error during immediate space redirection:', err);
      // Continue loading the app even if there's an error
    }
  }
})(); */

// Initialize React app with error handling
try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
  
  // Initialize mobile component preloader after app starts
  MobileComponentPreloader.initialize();
  
  log.debug('App', '✅ React app initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize React app:', error);
  
  // Fallback: show error message
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; text-align: center; padding: 20px;">
        <div>
          <h1 style="color: #ef4444; margin-bottom: 16px;">Application Error</h1>
          <p style="color: #6b7280; margin-bottom: 20px;">Failed to load the application. Please refresh the page.</p>
          <button onclick="window.location.reload()" style="background: #3b82f6; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">
            Refresh Page
          </button>
        </div>
      </div>
    `;
  }
}
