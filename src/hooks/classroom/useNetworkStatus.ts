import { useState, useEffect } from 'react';
import { log } from '@/utils/logger';

interface UseNetworkStatusReturn {
  isOnline: boolean;
  isOffline: boolean;
  networkStatus: 'online' | 'offline' | 'unknown';
  lastNetworkChange: Date | null;
}

interface UseNetworkStatusOptions {
  enableLogging?: boolean;
  checkInterval?: number; // Optional polling interval in ms
}

/**
 * Custom hook for monitoring network connectivity status
 * 
 * Features:
 * - Real-time online/offline detection
 * - Network event handling
 * - Optional polling for reliability
 * - Comprehensive logging for debugging
 * - Network change timestamp tracking
 */
export function useNetworkStatus(options: UseNetworkStatusOptions = {}): UseNetworkStatusReturn {
  const {
    enableLogging = true,
    checkInterval = null // null means no polling, rely on events only
  } = options;

  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline' | 'unknown'>(
    navigator.onLine ? 'online' : 'offline'
  );
  const [lastNetworkChange, setLastNetworkChange] = useState<Date | null>(null);

  // Network event handlers
  const handleOnline = () => {
    const now = new Date();
    setIsOnline(true);
    setNetworkStatus('online');
    setLastNetworkChange(now);
    
    if (enableLogging) {
      log.debug('Hook', '🌐 [useNetworkStatus] Network connection restored');
    }
  };

  const handleOffline = () => {
    const now = new Date();
    setIsOnline(false);
    setNetworkStatus('offline');
    setLastNetworkChange(now);
    
    if (enableLogging) {
      log.debug('Hook', '🌐 [useNetworkStatus] Network connection lost');
    }
  };

  // Optional polling for reliability (useful for detecting network changes that events might miss)
  const checkNetworkStatus = () => {
    const currentOnlineStatus = navigator.onLine;
    if (currentOnlineStatus !== isOnline) {
      if (currentOnlineStatus) {
        handleOnline();
      } else {
        handleOffline();
      }
    }
  };

  useEffect(() => {
    // Set initial network status
    const initialStatus = navigator.onLine ? 'online' : 'offline';
    setNetworkStatus(initialStatus);
    
    if (enableLogging) {
      log.debug('Hook', `🌐 [useNetworkStatus] Initial network status: ${initialStatus}`);
    }

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set up optional polling
    let pollInterval: NodeJS.Timeout | null = null;
    if (checkInterval && checkInterval > 0) {
      pollInterval = setInterval(checkNetworkStatus, checkInterval);
      
      if (enableLogging) {
        log.debug('Hook', `🌐 [useNetworkStatus] Network polling enabled (${checkInterval}ms interval)`);
      }
    }

    // Cleanup function
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (pollInterval) {
        clearInterval(pollInterval);
        
        if (enableLogging) {
          log.debug('Hook', '🌐 [useNetworkStatus] Network polling disabled');
        }
      }
    };
  }, [enableLogging, checkInterval, isOnline]);

  return {
    isOnline,
    isOffline: !isOnline,
    networkStatus,
    lastNetworkChange
  };
} 