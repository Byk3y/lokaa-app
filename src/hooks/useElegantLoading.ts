import { useState, useEffect } from 'react';

/**
 * Hook for elegant loading state management
 * Prevents flickering loading states and ensures minimum loading durations
 * 
 * @param isLoading Current loading state
 * @param minLoadingTimeMs Minimum loading time in milliseconds
 * @returns Visible loading state to use for UI
 */
export function useElegantLoading(
  isLoading: boolean, 
  minLoadingTimeMs = 500
): boolean {
  const [visibleLoading, setVisibleLoading] = useState(isLoading);
  const [loadingStartTime, setLoadingStartTime] = useState(0);
  
  useEffect(() => {
    if (isLoading && !visibleLoading) {
      // Started loading
      setVisibleLoading(true);
      setLoadingStartTime(Date.now());
    } else if (!isLoading && visibleLoading) {
      // Finished loading - add a small delay for UX
      const loadingDuration = Date.now() - loadingStartTime;
      
      if (loadingDuration < minLoadingTimeMs) {
        // If loading was too quick, keep showing loading state for a bit longer
        const remainingTime = minLoadingTimeMs - loadingDuration;
        const timeoutId = setTimeout(() => setVisibleLoading(false), remainingTime);
        return () => clearTimeout(timeoutId);
      } else {
        setVisibleLoading(false);
      }
    }
  }, [isLoading, visibleLoading, loadingStartTime, minLoadingTimeMs]);
  
  return visibleLoading;
} 