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

// Singleton instance tracking
let isInitialized = false;
let activeInstance: string | null = null;

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
  
  // Early initialization check - before any state or effects
  if (typeof window !== 'undefined' && (window as any).DISABLE_MOBILE_LIFECYCLE) {
    console.log('🔧 [MobileLifecycle] DISABLED - Mobile Event Coordinator is managing events');
    // Return dummy implementation when disabled
    return {
      isBackground: false,
      returnedFromBackground: false,
      backgroundDuration: 0,
      isRecovering: false,
      needsRecovery: false,
      loadingStuckDuration: 0,
      recoveryAttempts: 0,
      sessionValidated: true,
      validationResult: null,
      phase1RecoveryActive: false,
      sessionValidationStatus: 'valid',
      lastRecoveryResult: null,
      triggerRecovery: async () => {},
      resetRecoveryState: () => {},
      markRecoveryComplete: () => {},
      triggerEnhancedRecovery: async () => {},
      validateSession: async () => ({ isValid: true })
    };
  }
  
  // Only enable mobile lifecycle management on actual mobile devices
  const isMobileDevice = shouldEnableMobileFeatures();
  
  // Generate unique instance ID
  const instanceId = useRef(Math.random().toString(36).substring(7));
  
  // Singleton enforcement
  useEffect(() => {
    if (!isMobileDevice) return;
    
    if (!isInitialized) {
      isInitialized = true;
      activeInstance = instanceId.current;
      console.log(`📱 [MobileLifecycle] Initializing first instance: ${instanceId.current}`);
    } else if (activeInstance !== instanceId.current) {
      console.warn(`📱 [MobileLifecycle] Multiple instances detected. Active: ${activeInstance}, Current: ${instanceId.current}`);
      return; // Don't initialize event listeners for duplicate instances
    }
    
    return () => {
      if (activeInstance === instanceId.current) {
        isInitialized = false;
        activeInstance = null;
        console.log(`📱 [MobileLifecycle] Cleaning up instance: ${instanceId.current}`);
      }
    };
  }, [isMobileDevice]);
  
  const [state, setState] = useState<MobileLifecycleState>({
    isBackground: false,
    returnedFromBackground: false,
    backgroundDuration: 0,
    isRecovering: false,
    needsRecovery: false,
    loadingStuckDuration: 0,
    recoveryAttempts: 0,
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
  const sessionValidationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastValidationTimeRef = useRef<number>(0);

  /**
   * PHASE 1: Enhanced page visibility changes with proactive session validation
   * Only activates on mobile devices and for the active instance
   */
  useEffect(() => {
    if (!isMobileDevice || activeInstance !== instanceId.current) {
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
        const isSignificantBackground = duration > 30000; // 30 seconds (much more reasonable)
        const isLongBackground = duration > 60000; // 1 minute - very long background
        
        setState(prev => ({
          ...prev,
          isBackground: false,
          returnedFromBackground: isSignificantBackground,
          backgroundDuration: duration,
          needsRecovery: false,
          sessionValidated: false,
          validationResult: null
        }));

        console.log(`📱 [MobileLifecycle] Returned from background after ${Math.round(duration / 1000)}s, isLongBackground: ${isLongBackground}, needsRecovery: delayed`);

        // PHASE 1: Trigger proactive session validation for significant background time
        if (isSignificantBackground && user) {
          const timeSinceLastValidation = now - lastValidationTimeRef.current;
          const validationThreshold = 30000; // 30 seconds
          
          if (timeSinceLastValidation > validationThreshold) {
            console.log('📱 [MobileLifecycle] Triggering proactive session validation');
            
            // ENHANCED: Delay validation longer for very long backgrounds to let Safari settle
            const validationDelay = isLongBackground ? 5000 : 1000; // 5s for long background, 1s for normal
            
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
                
                // ENHANCED: Only mark for recovery if session is truly invalid AND we're stuck
                if (!validationResult.isValid && loading) {
                  // Give more time for long backgrounds to settle before marking recovery
                  const recoveryDelay = isLongBackground ? 10000 : 5000; // 10s for long, 5s for normal
                  setTimeout(() => {
                  setState(prev => ({
                    ...prev,
                      needsRecovery: prev.returnedFromBackground && loading // Only if still loading
                  }));
                  }, recoveryDelay);
                }
              } catch (error) {
                console.warn('📱 [MobileLifecycle] Session validation failed:', error);
                console.log('📱 [MobileLifecycle] Deferring recovery decision due to validation failure (network may be blocked)');
                
                setState(prev => ({
                  ...prev,
                  sessionValidated: false,
                  validationResult: 'deferred'
                }));
                
                // Check again later if we're still having issues
                setTimeout(() => {
                  if (loading) {
                    setState(prev => ({
                      ...prev,
                  needsRecovery: true
                }));
              }
                }, 15000); // Wait 15 seconds before marking for recovery
              }
            }, validationDelay);
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

    // Only attach listeners for the active instance
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', () => {
      setState(prev => ({ ...prev, isBackground: false }));
    });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', () => {
        setState(prev => ({ ...prev, isBackground: false }));
      });
      
      // Clear all timeouts on cleanup
      if (sessionValidationTimeoutRef.current) {
        clearTimeout(sessionValidationTimeoutRef.current);
      }
      if (recoveryTimeoutRef.current) {
        clearTimeout(recoveryTimeoutRef.current);
      }
      if (stuckCheckIntervalRef.current) {
        clearInterval(stuckCheckIntervalRef.current);
      }
    };
  }, [isMobileDevice, state.isBackground, user, loading]);

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
          // ENHANCED: More patient recovery detection, especially for long backgrounds
          needsRecovery: prev.returnedFromBackground && (
            (prev.backgroundDuration > 60000 ? stuckDuration > 30000 : stuckDuration > 15000) || // Longer wait for long backgrounds
            (!prev.sessionValidated && prev.backgroundDuration > 60000 ? stuckDuration > 20000 : stuckDuration > 10000) // Patient session validation
          )
        }));

        // ENHANCED: More patient auto-trigger - longer delays for longer backgrounds
        const autoTriggerThreshold = state.backgroundDuration > 60000 ? 45000 : 25000; // 45s for long backgrounds, 25s for normal
        if (state.returnedFromBackground && stuckDuration > autoTriggerThreshold && !state.isRecovering && !state.phase1RecoveryActive) {
          console.log(`📱 [MobileLifecycle] Auto-triggering Phase 1 enhanced recovery for stuck loading state (${Math.round(stuckDuration/1000)}s stuck, background: ${Math.round(state.backgroundDuration/1000)}s)`);
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