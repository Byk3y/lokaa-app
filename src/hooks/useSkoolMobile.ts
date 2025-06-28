/**
 * 🍎 useSkoolMobile Hook
 * 
 * React integration for Skool-style mobile background handling
 * Replaces all existing mobile hooks with a single, graceful approach
 */

import { useState, useEffect, useCallback } from 'react';
import { skoolMobileHandler } from '@/utils/SkoolStyleMobileHandler';
import { useOptimizedAuth } from '@/contexts/AuthContext';

interface SkoolMobileState {
  isMobile: boolean;
  isBackground: boolean;
  backgroundDuration: number;
  shouldUseCacheFirst: boolean;
  shouldDelayRequests: boolean;
  status: string;
  networkRestored: boolean;
}

export function useSkoolMobile() {
  const { user } = useOptimizedAuth();
  const [state, setState] = useState<SkoolMobileState>(() => {
    const handlerState = skoolMobileHandler.getState();
    return {
      isMobile: handlerState.isMobile,
      isBackground: handlerState.isBackground,
      backgroundDuration: handlerState.backgroundDuration,
      shouldUseCacheFirst: handlerState.shouldUseCacheFirst,
      shouldDelayRequests: handlerState.shouldDelayRequests,
      status: skoolMobileHandler.getCurrentStatus(),
      networkRestored: handlerState.networkRestoredAfterBackground
    };
  });

  // Update handler when user changes
  useEffect(() => {
    skoolMobileHandler.setUser(user?.id || null);
  }, [user?.id]);

  // Listen for state changes
  useEffect(() => {
    const updateState = () => {
      const handlerState = skoolMobileHandler.getState();
      setState({
        isMobile: handlerState.isMobile,
        isBackground: handlerState.isBackground,
        backgroundDuration: handlerState.backgroundDuration,
        shouldUseCacheFirst: handlerState.shouldUseCacheFirst,
        shouldDelayRequests: handlerState.shouldDelayRequests,
        status: skoolMobileHandler.getCurrentStatus(),
        networkRestored: handlerState.networkRestoredAfterBackground
      });
    };

    // Update state every 2 seconds (gentle polling)
    const interval = setInterval(updateState, 2000);

    // Also listen for visibility changes
    const handleVisibilityChange = () => {
      setTimeout(updateState, 100); // Small delay to let handler process first
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Manual state refresh
  const refreshState = useCallback(() => {
    const handlerState = skoolMobileHandler.getState();
    setState({
      isMobile: handlerState.isMobile,
      isBackground: handlerState.isBackground,
      backgroundDuration: handlerState.backgroundDuration,
      shouldUseCacheFirst: handlerState.shouldUseCacheFirst,
      shouldDelayRequests: handlerState.shouldDelayRequests,
      status: skoolMobileHandler.getCurrentStatus(),
      networkRestored: handlerState.networkRestoredAfterBackground
    });
  }, []);

  // Test background simulation
  const simulateBackgroundReturn = useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
      (window as any).skoolMobileHandler?.testBackgroundReturn?.();
      setTimeout(refreshState, 100);
    }
  }, [refreshState]);

  return {
    ...state,
    refreshState,
    simulateBackgroundReturn
  };
} 