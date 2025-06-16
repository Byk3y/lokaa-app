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
        console.log('🚀 [PWAInitializer] Initializing PWA features...');

        // Register service worker with Supabase-aware configuration
        console.log('🔧 [PWAInitializer] Registering service worker with auth-safe configuration...');
        
        const registered = await serviceWorkerManager.register();
        
        if (registered) {
          console.log('✅ [PWAInitializer] Service worker registered successfully');
          
          // Set up event handlers
          serviceWorkerManager.setHandlers({
            onUpdateAvailable: () => {
              console.log('🔄 [PWAInitializer] App update available');
              // In development, just log. In production, you might show a toast
              if (process.env.NODE_ENV === 'production') {
                // Could show update notification here
              }
            },
            onControllerChanged: () => {
              console.log('🔄 [PWAInitializer] Service worker controller changed');
              // Could reload page here if needed
            }
          });
          
        } else {
          console.log('⚠️ [PWAInitializer] Service worker registration failed or not supported');
        }

        // Development helpers
        if (process.env.NODE_ENV === 'development') {
          console.log('🔧 [PWAInitializer] Development mode - PWA features available but minimal caching');
          console.log('🔧 [PWAInitializer] Use Ctrl+Shift+U to clear all service workers');
        }

      } catch (error) {
        console.error('❌ [PWAInitializer] PWA initialization failed:', error);
        
        // Log error but don't break the app
        try {
          const appError = errorHandlingSystem.classifyError(error, {
            component: 'PWAInitializer',
            operation: 'initialize'
          });
          errorHandlingSystem.logError(appError);
        } catch (logError) {
          console.error('Failed to log PWA initialization error:', logError);
        }
      }
    };

    initializePWA();
  }, []);

  // This component doesn't render anything
  return null;
};

export default PWAInitializer; 