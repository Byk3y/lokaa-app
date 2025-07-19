import { log } from '@/utils/logger';
/**
 * 🪝 usePWA Hook - Phase 6A PWA Implementation
 * 
 * React hook for Progressive Web App functionality:
 * - Install prompts and app installation
 * - Service worker integration
 * - Offline status and capabilities
 * - Update notifications
 * - Background sync management
 */

import { useState, useEffect, useCallback } from 'react';
import { serviceWorkerManager, type CacheInfo, type OfflineAction } from '@/utils/serviceWorkerManager';
import { useErrorHandling } from './useErrorHandling';
import { toast } from '@/hooks/use-toast';

interface BeforeInstallPromptEvent extends Event {
  platforms: string[];
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  prompt(): Promise<void>;
}

interface PWAState {
  // Installation
  isInstallable: boolean;
  isInstalled: boolean;
  installPrompt: BeforeInstallPromptEvent | null;
  
  // Service Worker
  isServiceWorkerSupported: boolean;
  isServiceWorkerRegistered: boolean;
  hasUpdate: boolean;
  
  // Network
  isOnline: boolean;
  pendingActionsCount: number;
  
  // Cache
  cacheInfo: CacheInfo;
}

interface PWAActions {
  // Installation
  showInstallPrompt: () => Promise<boolean>;
  dismissInstallPrompt: () => void;
  
  // Service Worker
  registerServiceWorker: () => Promise<boolean>;
  updateApp: () => Promise<void>;
  
  // Cache
  clearCache: () => Promise<void>;
  getCacheStats: () => Promise<CacheInfo>;
  
  // Offline
  queueOfflineAction: (action: OfflineAction) => Promise<void>;
  
  // Utilities
  canShare: () => boolean;
  shareContent: (data: ShareData) => Promise<boolean>;
}

export interface UsePWAReturn extends PWAState, PWAActions {}

export const usePWA = (): UsePWAReturn => {
  const { reportError } = useErrorHandling({ component: 'usePWA' });
  
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    installPrompt: null,
    isServiceWorkerSupported: 'serviceWorker' in navigator,
    isServiceWorkerRegistered: false,
    hasUpdate: false,
    isOnline: navigator.onLine,
    pendingActionsCount: 0,
    cacheInfo: {}
  });

  /**
   * Check if app is already installed
   */
  const checkIfInstalled = useCallback((): boolean => {
    // Check for standalone mode (iOS)
    if ((window.navigator as any).standalone) {
      return true;
    }
    
    // Check for display mode (Android/Desktop)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return true;
    }
    
    // Check for minimal-ui mode
    if (window.matchMedia('(display-mode: minimal-ui)').matches) {
      return true;
    }
    
    return false;
  }, []);

  /**
   * Initialize PWA functionality
   */
  useEffect(() => {
    const initializePWA = async () => {
      try {
        // Check installation status
        const installed = checkIfInstalled();
        setState(prev => ({ ...prev, isInstalled: installed }));

        // Register service worker
        if (state.isServiceWorkerSupported) {
          const registration = await serviceWorkerManager.register();
          setState(prev => ({ 
            ...prev, 
            isServiceWorkerRegistered: !!registration 
          }));
        }

        // Get initial cache info
        const cacheInfo = await serviceWorkerManager.getCacheInfo();
        setState(prev => ({ ...prev, cacheInfo }));

        log.debug('Hook', '✅ [usePWA] PWA initialized successfully');
      } catch (error) {
        log.error('Hook', '❌ [usePWA] PWA initialization failed:', error);
        reportError(error, { operation: 'pwa-initialization' });
      }
    };

    initializePWA();
  }, [state.isServiceWorkerSupported, checkIfInstalled, reportError]);

  /**
   * Set up install prompt listener
   */
  useEffect(() => {
    const handleBeforeInstallPrompt = (event: BeforeInstallPromptEvent) => {
      log.debug('Hook', '📱 [usePWA] Install prompt available');
      
      // Prevent default prompt
      event.preventDefault();
      
      // Store the event for later use
      setState(prev => ({
        ...prev,
        isInstallable: true,
        installPrompt: event
      }));

      // Check if we should show the install prompt
      const shouldShowPrompt = (() => {
        // Don't show if already installed
        if (state.isInstalled) return false;
        
        // PREVENT FLASHING DURING PAGE RELOADS
        // Don't show prompt if page just loaded (within 5 seconds)
        const pageLoadTime = performance.now();
        if (pageLoadTime < 5000) {
          log.debug('Hook', '📱 [usePWA] Page recently loaded, skipping prompt to prevent flash');
          return false;
        }
        
        // Don't show if this is a page reload (navigation type is reload)
        if (typeof performance !== 'undefined' && performance.getEntriesByType) {
          const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
          if (navigationEntries.length > 0 && navigationEntries[0].type === 'reload') {
            log.debug('Hook', '📱 [usePWA] Page reload detected, skipping prompt to prevent flash');
            return false;
          }
        }
        
        // Check if recently dismissed (within 24 hours)
        const dismissedTime = localStorage.getItem('pwa-install-dismissed');
        if (dismissedTime) {
          const timeSince = Date.now() - parseInt(dismissedTime);
          const hours24 = 24 * 60 * 60 * 1000;
          if (timeSince < hours24) {
            log.debug('Hook', '📱 [usePWA] Install prompt recently dismissed, skipping');
            return false;
          }
        }
        
        // Check if too many prompts shown recently (throttling)
        const promptCount = parseInt(localStorage.getItem('pwa-prompt-count') || '0');
        const lastPromptTime = parseInt(localStorage.getItem('pwa-last-prompt') || '0');
        const timeSinceLastPrompt = Date.now() - lastPromptTime;
        const hour = 60 * 60 * 1000;
        
        // Reset counter if more than 1 hour passed
        if (timeSinceLastPrompt > hour) {
          localStorage.setItem('pwa-prompt-count', '0');
          localStorage.setItem('pwa-last-prompt', Date.now().toString());
          return true;
        }
        
        // Don't show more than 1 prompt per hour
        if (promptCount >= 1) {
          log.debug('Hook', '📱 [usePWA] Too many prompts shown recently, throttling');
          return false;
        }
        
        // Detect mobile (iOS/Android)
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        
        // On iOS, be very conservative with prompts (Safari handles this natively)
        if (isIOS) {
          log.debug('Hook', '📱 [usePWA] iOS detected, skipping custom prompt (Safari handles natively)');
          return false;
        }
        
        // On mobile, only show if user has been actively using the app
        if (isMobile) {
          const sessionStart = sessionStorage.getItem('session-start');
          if (sessionStart) {
            const sessionTime = Date.now() - parseInt(sessionStart);
            const minutes5 = 5 * 60 * 1000;
            if (sessionTime < minutes5) {
              log.debug('Hook', '📱 [usePWA] Mobile session too short for install prompt');
              return false;
            }
          }
        }
        
        return true;
      })();

      // DELAY PROMPT SHOWING TO PREVENT FLASH DURING RELOADS
      // Only show prompt after app has been stable for a bit
      if (shouldShowPrompt) {
        setTimeout(() => {
          // Double-check conditions after delay
          const stillShouldShow = !state.isInstalled && 
                                  !localStorage.getItem('pwa-install-dismissed') &&
                                  performance.now() > 5000;
          
          if (stillShouldShow) {
            // Track prompt showing
            const currentCount = parseInt(localStorage.getItem('pwa-prompt-count') || '0');
            localStorage.setItem('pwa-prompt-count', (currentCount + 1).toString());
            localStorage.setItem('pwa-last-prompt', Date.now().toString());
            
            toast({
              title: "Install Lokaa Spaces",
              description: "Install the app for a better experience with offline support!",
              action: {
                label: "Install",
                onClick: () => showInstallPrompt()
              },
              duration: 10000
            });
          }
        }, 3000); // 3 second delay to ensure app is stable
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    };
  }, [state.isInstalled, showInstallPrompt]);

  /**
   * Set up app installed listener
   */
  useEffect(() => {
    const handleAppInstalled = () => {
      log.debug('Hook', '🎉 [usePWA] App installed successfully');
      
      setState(prev => ({
        ...prev,
        isInstalled: true,
        isInstallable: false,
        installPrompt: null
      }));

      toast({
        title: "App Installed!",
        description: "Lokaa Spaces has been installed successfully. Enjoy the enhanced experience!",
        variant: "default",
        duration: 5000
      });
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  /**
   * Set up online/offline listeners
   */
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
      // Update pending actions count
      updatePendingActionsCount();
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /**
   * Update pending actions count
   */
  const updatePendingActionsCount = useCallback(() => {
    const count = serviceWorkerManager.getPendingActionsCount();
    setState(prev => ({ ...prev, pendingActionsCount: count }));
  }, []);

  /**
   * Show install prompt
   */
  const showInstallPrompt = useCallback(async (): Promise<boolean> => {
    if (!state.installPrompt) {
      log.warn('Hook', '⚠️ [usePWA] No install prompt available');
      return false;
    }

    try {
      await state.installPrompt.prompt();
      const choice = await state.installPrompt.userChoice;
      
      log.debug('Hook', '📱 [usePWA] Install prompt result:', choice.outcome);
      
      if (choice.outcome === 'accepted') {
        setState(prev => ({
          ...prev,
          installPrompt: null,
          isInstallable: false
        }));
        return true;
      }
      
      return false;
    } catch (error) {
      log.error('Hook', '❌ [usePWA] Install prompt failed:', error);
      reportError(error, { operation: 'install-prompt' });
      return false;
    }
  }, [state.installPrompt, reportError]);

  /**
   * Dismiss install prompt
   */
  const dismissInstallPrompt = useCallback(() => {
    setState(prev => ({
      ...prev,
      isInstallable: false,
      installPrompt: null
    }));
    
    // Store dismissal in localStorage to avoid showing again soon
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  }, []);

  /**
   * Register service worker
   */
  const registerServiceWorker = useCallback(async (): Promise<boolean> => {
    if (!state.isServiceWorkerSupported) {
      log.warn('Hook', '⚠️ [usePWA] Service Worker not supported');
      return false;
    }

    try {
      const registration = await serviceWorkerManager.register();
      const success = !!registration;
      
      setState(prev => ({ 
        ...prev, 
        isServiceWorkerRegistered: success 
      }));
      
      return success;
    } catch (error) {
      log.error('Hook', '❌ [usePWA] Service worker registration failed:', error);
      reportError(error, { operation: 'service-worker-registration' });
      return false;
    }
  }, [state.isServiceWorkerSupported, reportError]);

  /**
   * Update app (skip waiting)
   */
  const updateApp = useCallback(async (): Promise<void> => {
    try {
      await serviceWorkerManager.skipWaiting();
      log.debug('Hook', '🔄 [usePWA] App update initiated');
    } catch (error) {
      log.error('Hook', '❌ [usePWA] App update failed:', error);
      reportError(error, { operation: 'app-update' });
    }
  }, [reportError]);

  /**
   * Clear cache
   */
  const clearCache = useCallback(async (): Promise<void> => {
    try {
      await serviceWorkerManager.clearCaches();
      
      // Update cache info
      const cacheInfo = await serviceWorkerManager.getCacheInfo();
      setState(prev => ({ ...prev, cacheInfo }));
      
      log.debug('Hook', '🗑️ [usePWA] Cache cleared successfully');
    } catch (error) {
      log.error('Hook', '❌ [usePWA] Cache clear failed:', error);
      reportError(error, { operation: 'cache-clear' });
    }
  }, [reportError]);

  /**
   * Get cache statistics
   */
  const getCacheStats = useCallback(async (): Promise<CacheInfo> => {
    try {
      const cacheInfo = await serviceWorkerManager.getCacheInfo();
      setState(prev => ({ ...prev, cacheInfo }));
      return cacheInfo;
    } catch (error) {
      log.error('Hook', '❌ [usePWA] Failed to get cache stats:', error);
      reportError(error, { operation: 'cache-stats' });
      return {};
    }
  }, [reportError]);

  /**
   * Queue offline action
   */
  const queueOfflineAction = useCallback(async (action: OfflineAction): Promise<void> => {
    try {
      await serviceWorkerManager.queueOfflineAction(action);
      updatePendingActionsCount();
      
      toast({
        title: "Action Saved",
        description: "Your action will sync when you're back online",
        variant: "default",
        duration: 3000
      });
    } catch (error) {
      log.error('Hook', '❌ [usePWA] Failed to queue offline action:', error);
      reportError(error, { operation: 'queue-offline-action' });
    }
  }, [reportError, updatePendingActionsCount]);

  /**
   * Check if Web Share API is available
   */
  const canShare = useCallback((): boolean => {
    return 'share' in navigator;
  }, []);

  /**
   * Share content using Web Share API
   */
  const shareContent = useCallback(async (data: ShareData): Promise<boolean> => {
    if (!canShare()) {
      log.warn('Hook', '⚠️ [usePWA] Web Share API not supported');
      return false;
    }

    try {
      await navigator.share(data);
      log.debug('Hook', '📤 [usePWA] Content shared successfully');
      return true;
    } catch (error) {
      // User cancelled sharing or error occurred
      if ((error as Error).name !== 'AbortError') {
        log.error('Hook', '❌ [usePWA] Share failed:', error);
        reportError(error, { operation: 'web-share' });
      }
      return false;
    }
  }, [canShare, reportError]);

  return {
    // State
    ...state,
    
    // Actions
    showInstallPrompt,
    dismissInstallPrompt,
    registerServiceWorker,
    updateApp,
    clearCache,
    getCacheStats,
    queueOfflineAction,
    canShare,
    shareContent
  };
};

// Utility hook for offline-specific functionality
export const useOffline = () => {
  const { isOnline, pendingActionsCount, queueOfflineAction } = usePWA();
  
  return {
    isOffline: !isOnline,
    isOnline,
    pendingActionsCount,
    queueOfflineAction,
    hasQueuedActions: pendingActionsCount > 0
  };
};

// Utility hook for installation prompts
export const useInstallPrompt = () => {
  const { 
    isInstallable, 
    isInstalled, 
    showInstallPrompt, 
    dismissInstallPrompt 
  } = usePWA();
  
  return {
    canInstall: isInstallable && !isInstalled,
    isInstalled,
    showPrompt: showInstallPrompt,
    dismissPrompt: dismissInstallPrompt
  };
}; 