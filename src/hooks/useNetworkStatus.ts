/**
 * Network Status Hook
 * 
 * Monitors browser online/offline status and provides state for UI notifications
 */

import { useState, useEffect } from 'react';

interface NetworkStatus {
  isOffline: boolean;
  justCameOnline: boolean;
}

export function useNetworkStatus(): NetworkStatus {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [justCameOnline, setJustCameOnline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setJustCameOnline(true);
      
      // Reset justCameOnline after a brief moment to allow toast to show
      setTimeout(() => {
        setJustCameOnline(false);
      }, 100);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setJustCameOnline(false);
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOffline, justCameOnline };
} 