/**
 * 📱 Mobile Lifecycle Hook - Phase 1 Enhanced
 * 
 * React hook for mobile app lifecycle management, background detection,
 * and integration with Phase 1 enhanced session recovery.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { mobileSessionManager } from '@/utils/mobileSessionManager';
import { useOptimizedAuth } from '@/contexts/AuthContext';
import { shouldEnableMobileFeatures } from '@/utils/mobileDetection';

interface MobileLifecycleState {
  isBackground: boolean;
  returnedFromBackground: boolean;
  backgroundDuration: number;
  isRecovering: boolean;
  needsRecovery: boolean;
  loadingStuckDuration: number;
  recoveryAttempts: number;
  // PHASE 1: Enhanced state tracking
  sessionValidated: boolean;
  validationResult: string | null;
  phase1RecoveryActive: boolean;
  sessionValidationStatus: 'idle' | 'validating' | 'valid' | 'invalid' | 'failed';
  lastRecoveryResult: string | null;
}

interface UseMobileLifecycleReturn extends MobileLifecycleState {
  triggerRecovery: () => Promise<void>;
  resetRecoveryState: () => void;
  markRecoveryComplete: () => void;
  // PHASE 1: New methods
  triggerEnhancedRecovery: () => Promise<void>;
  validateSession: () => Promise<any>;
}

/**
 * Mobile Lifecycle Hook - Phase 1 Enhanced
 */
export const useMobileLifecycle = (): UseMobileLifecycleReturn => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useOptimizedAuth();
  
  // Only enable mobile lifecycle management on actual mobile devices
  const isMobileDevice = shouldEnableMobileFeatures();
  
  const [state, setState] = useState<MobileLifecycleState>({
    isBackground: false,
    returnedFromBackground: false,
    backgroundDuration: 0,
    isRecovering: false,
    needsRecovery: false,
    loadingStuckDuration: 0,
    recoveryAttempts: 0,
    // PHASE 1: Enhanced state
    sessionValidated: false,
    validationResult: null,
    phase1RecoveryActive: false,
    sessionValidationStatus: 'idle',
    lastRecoveryResult: null
  });

  const backgroundStartRef = useRef<number>(0);
  const loadingStartRef = useRef<number>(0);
  const recoveryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stuckCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // PHASE 1: Enhanced refs for session validation
  const sessionValidationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastValidationTimeRef = useRef<number>(0);

  /**
   * PHASE 1: Enhanced page visibility changes with proactive session validation
   * Only activates on mobile devices
   */
  useEffect(() => {
    // Only enable mobile lifecycle management on actual mobile devices
    if (!isMobileDevice) {
      console.log('📱 [MobileLifecycle] Desktop detected - mobile lifecycle management disabled');
      return;
    }

    const handleVisibilityChange = () => {
      const now = Date.now();
      const wasBackground = state.isBackground;
      const nowBackground = document.hidden;

      if (!wasBackground && nowBackground) {
        // Going to background
        backgroundStartRef.current = now;
        setState(prev => ({ 
          ...prev, 
          isBackground: true,
          phase1RecoveryActive: false 
        }));
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
          needsRecovery: isSignificantBackground && loading,
          // PHASE 1: Reset session validation state on return
          sessionValidated: false,
          validationResult: null
        }));

        console.log(`📱 [MobileLifecycle] Returned from background after ${Math.round(duration / 1000)}s, needsRecovery: ${isSignificantBackground && loading}`);

        // PHASE 1: Trigger proactive session validation for significant background time
        if (isSignificantBackground && user) {
          const timeSinceLastValidation = now - lastValidationTimeRef.current;
          const validationThreshold = 30000; // 30 seconds
          
          if (timeSinceLastValidation > validationThreshold) {
            console.log('📱 [MobileLifecycle] Triggering proactive session validation');
            
            // Delay validation slightly to let the app settle
            sessionValidationTimeoutRef.current = setTimeout(async () => {
              try {
                const validationResult = await mobileSessionManager.validateSessionProactively();
                
                setState(prev => ({
                  ...prev,
                  sessionValidated: validationResult.isValid,
                  validationResult: validationResult.action
                }));
                
                lastValidationTimeRef.current = now;
                
                console.log(`📱 [MobileLifecycle] Session validation completed: ${validationResult.action}`);
                
                // If session is invalid, mark for recovery
                if (!validationResult.isValid) {
                  setState(prev => ({
                    ...prev,
                    needsRecovery: true
                  }));
                }
              } catch (error) {
                console.warn('📱 [MobileLifecycle] Session validation failed:', error);
                setState(prev => ({
                  ...prev,
                  sessionValidated: false,
                  needsRecovery: true
                }));
              }
            }, 1000);
          }
        }

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
      
      // PHASE 1: Cleanup validation timeouts
      if (sessionValidationTimeoutRef.current) {
        clearTimeout(sessionValidationTimeoutRef.current);
      }
    };
  }, [state.isBackground, loading, user, isMobileDevice]);

  /**
   * PHASE 1: Enhanced loading state monitoring
   * Only activates on mobile devices
   */
  useEffect(() => {
    // Only enable loading monitoring on mobile devices
    if (!isMobileDevice) {
      return;
    }

    if (loading) {
      if (loadingStartRef.current === 0) {
        loadingStartRef.current = Date.now();
      }

      // Check if we're stuck every second
      stuckCheckIntervalRef.current = setInterval(() => {
        const stuckDuration = Date.now() - loadingStartRef.current;
        
        setState(prev => ({
          ...prev,
          loadingStuckDuration: stuckDuration,
          // PHASE 1: Enhanced recovery detection
          needsRecovery: prev.returnedFromBackground && (
            stuckDuration > 8000 || // 8 seconds stuck
            (!prev.sessionValidated && stuckDuration > 5000) // 5 seconds if session not validated
          )
        }));

        // PHASE 1: Auto-trigger enhanced recovery if stuck too long after background return
        if (state.returnedFromBackground && stuckDuration > 10000 && !state.isRecovering && !state.phase1RecoveryActive) {
          console.log('📱 [MobileLifecycle] Auto-triggering Phase 1 enhanced recovery for stuck loading state');
          triggerEnhancedRecovery();
        }
      }, 1000);
    } else {
      // Reset loading tracking when not loading
      loadingStartRef.current = 0;
      setState(prev => ({ 
        ...prev, 
        loadingStuckDuration: 0, 
        needsRecovery: false 
      }));
      
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
  }, [loading, state.returnedFromBackground, state.isRecovering, state.phase1RecoveryActive, isMobileDevice]);

  /**
   * PHASE 1: Enhanced mobile recovery with session validation
   */
  const triggerEnhancedRecovery = useCallback(async () => {
    if (state.isRecovering || state.phase1RecoveryActive) {
      console.log('📱 [MobileLifecycle] Enhanced recovery already in progress, skipping');
      return;
    }

    console.log('📱 [MobileLifecycle] Triggering Phase 1 enhanced mobile recovery');
    
    setState(prev => ({ 
      ...prev, 
      isRecovering: true, 
      phase1RecoveryActive: true,
      recoveryAttempts: prev.recoveryAttempts + 1
    }));

    try {
      const result = await mobileSessionManager.performEnhancedMobileRecovery(navigate);
      
      console.log('📱 [MobileLifecycle] Enhanced recovery result:', result);

      if (result.success) {
        setState(prev => ({
          ...prev,
          isRecovering: false,
          needsRecovery: false,
          returnedFromBackground: false,
          phase1RecoveryActive: false,
          sessionValidated: true,
          validationResult: 'recovered'
        }));
      } else {
        // Recovery failed, reset state and let user try manually
        setState(prev => ({ 
          ...prev, 
          isRecovering: false, 
          phase1RecoveryActive: false 
        }));
        
        console.warn('📱 [MobileLifecycle] Enhanced recovery failed:', result.error);
      }
    } catch (error) {
      console.error('📱 [MobileLifecycle] Enhanced recovery error:', error);
      setState(prev => ({ 
        ...prev, 
        isRecovering: false, 
        phase1RecoveryActive: false 
      }));
    }
  }, [state.isRecovering, state.phase1RecoveryActive, navigate]);

  /**
   * PHASE 1: Manual session validation
   */
  const validateSession = useCallback(async () => {
    if (!user) return;
    
    console.log('📱 [MobileLifecycle] Manual session validation triggered');
    
    try {
      const validationResult = await mobileSessionManager.validateSessionProactively();
      
      setState(prev => ({
        ...prev,
        sessionValidated: validationResult.isValid,
        validationResult: validationResult.action
      }));
      
      lastValidationTimeRef.current = Date.now();
      
      console.log(`📱 [MobileLifecycle] Manual session validation completed: ${validationResult.action}`);
      
      return validationResult;
    } catch (error) {
      console.warn('📱 [MobileLifecycle] Manual session validation failed:', error);
      setState(prev => ({
        ...prev,
        sessionValidated: false,
        validationResult: 'failed'
      }));
    }
  }, [user]);

  /**
   * Trigger legacy mobile recovery (keeping for compatibility)
   */
  const triggerRecovery = useCallback(async () => {
    if (state.isRecovering) {
      console.log('📱 [MobileLifecycle] Recovery already in progress, skipping');
      return;
    }

    console.log('📱 [MobileLifecycle] Triggering legacy mobile recovery');
    
    setState(prev => ({ ...prev, isRecovering: true }));

    try {
      // PHASE 1: Use enhanced recovery by default
      const result = await mobileSessionManager.performEnhancedMobileRecovery(navigate);
      
      console.log('📱 [MobileLifecycle] Recovery result:', result);

      if (result.success) {
        setState(prev => ({
          ...prev,
          isRecovering: false,
          needsRecovery: false,
          returnedFromBackground: false,
          sessionValidated: true
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
      loadingStuckDuration: 0,
      recoveryAttempts: 0,
      // PHASE 1: Reset enhanced state
      sessionValidated: false,
      validationResult: null,
      phase1RecoveryActive: false
    }));
    
    loadingStartRef.current = 0;
    lastValidationTimeRef.current = 0;
    
    if (recoveryTimeoutRef.current) {
      clearTimeout(recoveryTimeoutRef.current);
      recoveryTimeoutRef.current = null;
    }
    
    // PHASE 1: Clear validation timeouts
    if (sessionValidationTimeoutRef.current) {
      clearTimeout(sessionValidationTimeoutRef.current);
      sessionValidationTimeoutRef.current = null;
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
      returnedFromBackground: false,
      // PHASE 1: Mark session as validated on completion
      sessionValidated: true,
      validationResult: 'completed',
      phase1RecoveryActive: false
    }));
    
    mobileSessionManager.resetRecoveryState();
  }, []);

  /**
   * PHASE 1: Auto-trigger enhanced recovery when conditions are met
   */
  useEffect(() => {
    if (state.needsRecovery && !state.isRecovering && !state.phase1RecoveryActive && user) {
      console.log('📱 [MobileLifecycle] Auto-triggering enhanced recovery based on needsRecovery state');
      
      // Small delay to let other components settle
      recoveryTimeoutRef.current = setTimeout(() => {
        triggerEnhancedRecovery();
      }, 1000);
    }

    return () => {
      if (recoveryTimeoutRef.current) {
        clearTimeout(recoveryTimeoutRef.current);
        recoveryTimeoutRef.current = null;
      }
    };
  }, [state.needsRecovery, state.isRecovering, state.phase1RecoveryActive, user, triggerEnhancedRecovery]);

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
    markRecoveryComplete,
    // PHASE 1: Enhanced methods
    triggerEnhancedRecovery,
    validateSession
  };
};

/**
 * Simplified hook for components that only need background detection
 */
export const useMobileBackgroundDetection = () => {
  const { 
    isBackground, 
    returnedFromBackground, 
    backgroundDuration,
    // PHASE 1: Include session validation state
    sessionValidated,
    validationResult
  } = useMobileLifecycle();
  
  return {
    isBackground,
    returnedFromBackground,
    backgroundDuration,
    isReturningFromBackground: returnedFromBackground,
    // PHASE 1: Session validation state
    sessionValidated,
    validationResult
  };
}; 