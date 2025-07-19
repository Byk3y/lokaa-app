import { log } from '@/utils/logger';
import { useEffect } from 'react';
import { serviceWorkerManager } from '@/utils/serviceWorkerManager';
import { errorHandlingSystem } from '@/utils/errorHandlingSystem';

/**
 * PWA Initializer Component
 * 
 * Initializes Progressive Web App features including:
 * - Service Worker registration
 * - Install prompt handling
 * - Offline detection
 * - Cache management
 */
const PWAInitializer = () => {
  useEffect(() => {
    const initializePWA = async () => {
      try {
        log.debug('Component', '🚀 [PWAInitializer] Initializing PWA features...');

        // Register service worker with Supabase-aware configuration
        log.debug('Component', '🔧 [PWAInitializer] Registering service worker with auth-safe configuration...');
        
        const registered = await serviceWorkerManager.register();
        
        if (registered) {
          log.debug('Component', '✅ [PWAInitializer] Service worker registered successfully');
          
          // Set up event handlers
          serviceWorkerManager.setHandlers({
            onUpdateAvailable: () => {
              log.debug('Component', '🔄 [PWAInitializer] App update available');
              // In development, just log. In production, you might show a toast
              if (process.env.NODE_ENV === 'production') {
                // Could show update notification here
              }
            },
            onControllerChanged: () => {
              log.debug('Component', '🔄 [PWAInitializer] Service worker controller changed');
              // Could reload page here if needed
            }
          });
          
        } else {
          log.debug('Component', '⚠️ [PWAInitializer] Service worker registration failed or not supported');
        }

        // Development helpers
        if (process.env.NODE_ENV === 'development') {
          log.debug('Component', '🔧 [PWAInitializer] Development mode - PWA features available but minimal caching');
          log.debug('Component', '🔧 [PWAInitializer] Use Ctrl+Shift+U to clear all service workers');
        }

      } catch (error) {
        log.error('Component', '❌ [PWAInitializer] PWA initialization failed:', error);
        
        // Log error but don't break the app
        try {
          const appError = errorHandlingSystem.classifyError(error, {
            component: 'PWAInitializer',
            operation: 'initialize'
          });
          errorHandlingSystem.logError(appError);
        } catch (logError) {
          log.error('Component', 'Failed to log PWA initialization error:', logError);
        }
      }
    };

    initializePWA();
  }, []);

  // This component doesn't render anything
  return null;
};

export default PWAInitializer; 