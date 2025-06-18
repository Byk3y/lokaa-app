// Custom hook for app initialization - extracted from App.tsx
// Simplifies App component by handling all initialization logic

import { useState, useEffect } from 'react';
import { appInitializationService } from '@/services/AppInitializationService';
import { developmentTools } from '@/utils/DevelopmentTools';
import { useCleanupTracker } from '@/hooks/useCleanupTracker';

export function useAppInitialization() {
  const cleanup = useCleanupTracker('App');
  const [appReady, setAppReady] = useState(false);
  
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize core app services
        const result = await appInitializationService.initialize({
          isDevelopment: import.meta.env?.DEV,
          enableDebugInterfaces: import.meta.env?.DEV,
          enableMobileRecovery: true
        });

        // Initialize development tools (handled automatically in dev mode)
        if (import.meta.env?.DEV) {
          await developmentTools.initialize({
            enablePhaseIntegrations: true,
            enableDebugUtilities: true,
            enableConsoleDebuggers: true
          });
        }

        if (!result.success) {
          console.error('🚨 [App] Initialization failed with errors:', result.errors);
        }

        if (result.warnings.length > 0) {
          console.warn('⚠️ [App] Initialization completed with warnings:', result.warnings);
        }

        console.log('✅ [App] Application ready');
        setAppReady(true);
        
      } catch (error) {
        console.error('❌ [App] Initialization error:', error);
        setAppReady(true);
      }
    };
    
    initializeApp();
    
    return () => {
      appInitializationService.cleanup();
      if (import.meta.env?.DEV) {
        developmentTools.cleanup();
      }
    };
  }, []);

  return { appReady };
} 