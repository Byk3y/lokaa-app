import { log } from '@/utils/logger';
// Custom hook for app initialization - extracted from App.tsx
// Simplifies App component by handling all initialization logic

import { useState, useEffect } from 'react';
import { appInitializationService } from '@/services/AppInitializationService';
import { developmentTools } from '@/utils/DevelopmentTools';

export function useAppInitialization() {
  const [appReady, setAppReady] = useState(true);
  
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check if we're coming from a sign out (to avoid showing loading screen)
        const isSignOutRedirect = sessionStorage.getItem('lokaa-signing-out') === 'true';
        if (isSignOutRedirect) {
          // Clear the flag and keep app ready
          sessionStorage.removeItem('lokaa-signing-out');
          log.debug('Hook', '🚪 [AppInit] Detected sign out redirect, skipping initialization');
          return;
        }

        // Run initialization in background without blocking UI
        log.debug('Hook', '🚀 [AppInit] Starting background initialization...');
        
        // Initialize app services in background
        await appInitializationService.initialize();
        
        // Initialize development tools in background
        await developmentTools.initialize();
        
        log.debug('Hook', '✅ [AppInit] Background initialization completed');
        
      } catch (error) {
        log.error('Hook', '❌ [AppInit] Background initialization failed:', error);
        // Don't block the app even if initialization fails
      }
    };
    
    // Run initialization in background without blocking UI
    initializeApp();
    
    return () => {
      // Cleanup if needed
      appInitializationService.cleanup();
      if (import.meta.env?.DEV) {
        developmentTools.cleanup();
      }
    };
  }, []);

  return {
    appReady // Always true now - app renders immediately
  };
} 