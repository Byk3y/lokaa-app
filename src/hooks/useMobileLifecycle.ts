/**
 * 📱 Mobile Lifecycle Hook - Phase 1
 * 
 * React hook for mobile app lifecycle management, background detection,
 * and integration with mobile session recovery.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { mobileSessionManager } from '@/utils/mobileSessionManager';
import { useOptimizedAuth } from '@/contexts/AuthContext';

interface MobileLifecycleState {
  isBackground: boolean;
  returnedFromBackground: boolean;
  backgroundDuration: number;
  isRecovering: boolean;
  needsRecovery: boolean;
  loadingStuckDuration: number;
}

interface MobileLifecycleActions {
  triggerRecovery: () => Promise<void>;
  resetRecoveryState: () => void;
  markRecoveryComplete: () => void;
}

export interface UseMobileLifecycleReturn extends MobileLifecycleState, MobileLifecycleActions {}

/**
 * Mobile Lifecycle Hook
 */
export const useMobileLifecycle = (): UseMobileLifecycleReturn => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, routingInProgress } = useOptimizedAuth();
  
  const [state, setState] = useState<MobileLifecycleState>({
    isBackground: false,
    returnedFromBackground: false,
    backgroundDuration: 0,
    isRecovering: false,
    needsRecovery: false,
    loadingStuckDuration: 0
  });

  const backgroundStartRef = useRef<number>(0);
  const loadingStartRef = useRef<number>(0);
  const recoveryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stuckCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Handle page visibility changes
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      const now = Date.now();
      const wasBackground = state.isBackground;
      const nowBackground = document.hidden;

      if (!wasBackground && nowBackground) {
        // Going to background
        backgroundStartRef.current = now;
        setState(prev => ({ ...prev, isBackground: true }));
        console.log('📱 [MobileLifecycle] App backgrounded');
        
      } else if (wasBackground && !nowBackground) {
        // Returning from background
        const duration = now - backgroundStartRef.current;
        const isSignificantBackground = duration > 5000; // 5 seconds
        
        setState(prev => ({
          ...prev,
          isBackground: false,
          returnedFromBackground: isSignificantBackground,
          backgroundDuration: duration,
          needsRecovery: isSignificantBackground && (loading || routingInProgress)
        }));

        console.log(`📱 [MobileLifecycle] Returned from background after ${Math.round(duration / 1000)}s, needsRecovery: ${isSignificantBackground && (loading || routingInProgress)}`);

        // Clear the returned flag after processing
        if (isSignificantBackground) {
          setTimeout(() => {
            setState(prev => ({ ...prev, returnedFromBackground: false }));
          }, 3000);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', () => {
      setState(prev => ({ ...prev, isBackground: false }));
    });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', () => {});
    };
  }, [state.isBackground, loading, routingInProgress]);

  /**
   * Monitor loading state duration to detect stuck scenarios
   */
  useEffect(() => {
    if (loading || routingInProgress) {
      if (loadingStartRef.current === 0) {
        loadingStartRef.current = Date.now();
      }

      // Check if we're stuck every second
      stuckCheckIntervalRef.current = setInterval(() => {
        const stuckDuration = Date.now() - loadingStartRef.current;
        
        setState(prev => ({
          ...prev,
          loadingStuckDuration: stuckDuration,
          needsRecovery: prev.returnedFromBackground && stuckDuration > 8000 // 8 seconds
        }));

        // Auto-trigger recovery if stuck too long after background return
        if (state.returnedFromBackground && stuckDuration > 10000 && !state.isRecovering) {
          console.log('📱 [MobileLifecycle] Auto-triggering recovery for stuck loading state');
          triggerRecovery();
        }
      }, 1000);
    } else {
      // Reset loading tracking when not loading
      loadingStartRef.current = 0;
      setState(prev => ({ ...prev, loadingStuckDuration: 0, needsRecovery: false }));
      
      if (stuckCheckIntervalRef.current) {
        clearInterval(stuckCheckIntervalRef.current);
        stuckCheckIntervalRef.current = null;
      }
    }

    return () => {
      if (stuckCheckIntervalRef.current) {
        clearInterval(stuckCheckIntervalRef.current);
        stuckCheckIntervalRef.current = null;
      }
    };
  }, [loading, routingInProgress, state.returnedFromBackground, state.isRecovering]);

  /**
   * Trigger mobile recovery
   */
  const triggerRecovery = useCallback(async () => {
    if (state.isRecovering) {
      console.log('📱 [MobileLifecycle] Recovery already in progress, skipping');
      return;
    }

    console.log('📱 [MobileLifecycle] Triggering mobile recovery');
    
    setState(prev => ({ ...prev, isRecovering: true }));

    try {
      const result = await mobileSessionManager.performMobileRecovery(navigate);
      
      console.log('📱 [MobileLifecycle] Recovery result:', result);

      if (result.success) {
        setState(prev => ({
          ...prev,
          isRecovering: false,
          needsRecovery: false,
          returnedFromBackground: false
        }));
      } else {
        // Recovery failed, reset state and let user try manually
        setState(prev => ({ ...prev, isRecovering: false }));
        
        // Show user feedback that something went wrong
        console.warn('📱 [MobileLifecycle] Recovery failed:', result.error);
      }
    } catch (error) {
      console.error('📱 [MobileLifecycle] Recovery error:', error);
      setState(prev => ({ ...prev, isRecovering: false }));
    }
  }, [state.isRecovering, navigate]);

  /**
   * Reset recovery state manually
   */
  const resetRecoveryState = useCallback(() => {
    console.log('📱 [MobileLifecycle] Resetting recovery state');
    
    mobileSessionManager.resetRecoveryState();
    setState(prev => ({
      ...prev,
      isRecovering: false,
      needsRecovery: false,
      returnedFromBackground: false,
      loadingStuckDuration: 0
    }));
    
    loadingStartRef.current = 0;
    
    if (recoveryTimeoutRef.current) {
      clearTimeout(recoveryTimeoutRef.current);
      recoveryTimeoutRef.current = null;
    }
  }, []);

  /**
   * Mark recovery as complete (called by components after successful recovery)
   */
  const markRecoveryComplete = useCallback(() => {
    console.log('📱 [MobileLifecycle] Recovery marked as complete');
    
    setState(prev => ({
      ...prev,
      isRecovering: false,
      needsRecovery: false,
      returnedFromBackground: false
    }));
    
    mobileSessionManager.resetRecoveryState();
  }, []);

  /**
   * Auto-trigger recovery when conditions are met
   */
  useEffect(() => {
    if (state.needsRecovery && !state.isRecovering && user) {
      console.log('📱 [MobileLifecycle] Auto-triggering recovery based on needsRecovery state');
      
      // Small delay to let other components settle
      recoveryTimeoutRef.current = setTimeout(() => {
        triggerRecovery();
      }, 1000);
    }

    return () => {
      if (recoveryTimeoutRef.current) {
        clearTimeout(recoveryTimeoutRef.current);
        recoveryTimeoutRef.current = null;
      }
    };
  }, [state.needsRecovery, state.isRecovering, user, triggerRecovery]);

  /**
   * Update space cache when navigating to spaces
   */
  useEffect(() => {
    const pathname = location.pathname;
    const spaceMatch = pathname.match(/\/([^\/]+)\/space/);
    
    if (spaceMatch && user) {
      const subdomain = spaceMatch[1];
      
      // Get space data from current URL and update mobile session cache
      const spaceData = {
        id: '', // Will be filled by actual space data later
        subdomain,
        name: subdomain.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      };
      
      mobileSessionManager.updateSpaceCache(spaceData);
    }
  }, [location.pathname, user]);

  return {
    ...state,
    triggerRecovery,
    resetRecoveryState,
    markRecoveryComplete
  };
};

/**
 * Simplified hook for components that only need background detection
 */
export const useMobileBackgroundDetection = () => {
  const { isBackground, returnedFromBackground, backgroundDuration } = useMobileLifecycle();
  
  return {
    isBackground,
    returnedFromBackground,
    backgroundDuration,
    isReturningFromBackground: returnedFromBackground
  };
}; 