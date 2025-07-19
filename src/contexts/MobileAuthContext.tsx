import { log } from '@/utils/logger';
/**
 * 📱 Mobile Auth Context - Phase 1
 * 
 * Enhanced auth context specifically for mobile with background detection,
 * session recovery, and simplified auth flows.
 */

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useOptimizedAuth } from '@/contexts/AuthContext';
import { useMobileLifecycle } from '@/hooks/useMobileLifecycle';
import { mobileSessionManager } from '@/utils/mobileSessionManager';

interface MobileAuthContextType {
  // Extend base auth
  user: any;
  loading: boolean;
  routingInProgress: boolean;
  
  // Mobile-specific features
  isMobileBackground: boolean;
  returnedFromBackground: boolean;
  backgroundDuration: number;
  isRecovering: boolean;
  needsRecovery: boolean;
  mobileAuthReady: boolean;
  
  // Mobile actions
  triggerMobileRecovery: () => Promise<void>;
  resetMobileState: () => void;
  markRecoveryComplete: () => void;
}

const MobileAuthContext = createContext<MobileAuthContextType | undefined>(undefined);

interface MobileAuthProviderProps {
  children: ReactNode;
}

export const MobileAuthProvider: React.FC<MobileAuthProviderProps> = ({ children }) => {
  const baseAuth = useOptimizedAuth();
  const mobileLifecycle = useMobileLifecycle();

  // Update mobile session manager with user info when available
  useEffect(() => {
    if (baseAuth.user && !mobileSessionManager.getState().userId) {
      const currentState = mobileSessionManager.getState();
      if (currentState.userId !== baseAuth.user.id) {
        log.debug('Context', '📱 [MobileAuthContext] Updating mobile session manager with user ID');
        // Update user ID in mobile session manager
        mobileSessionManager.getState().userId = baseAuth.user.id;
      }
    }
  }, [baseAuth.user]);

  // Mobile-specific recovery logic
  useEffect(() => {
    // Auto-trigger recovery if user returns from background and gets stuck
    if (
      mobileLifecycle.needsRecovery && 
      !mobileLifecycle.isRecovering && 
      baseAuth.user &&
      (baseAuth.loading || baseAuth.routingInProgress)
    ) {
      log.debug('Context', '📱 [MobileAuthContext] Auto-triggering mobile recovery');
      
      // Small delay to let other systems settle
      const timeout = setTimeout(() => {
        mobileLifecycle.triggerRecovery();
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [
    mobileLifecycle.needsRecovery,
    mobileLifecycle.isRecovering,
    baseAuth.user,
    baseAuth.loading,
    baseAuth.routingInProgress,
    mobileLifecycle.triggerRecovery
  ]);

  const contextValue: MobileAuthContextType = {
    // Base auth properties
    user: baseAuth.user,
    loading: baseAuth.loading,
    routingInProgress: baseAuth.routingInProgress,
    
    // Mobile lifecycle properties
    isMobileBackground: mobileLifecycle.isBackground,
    returnedFromBackground: mobileLifecycle.returnedFromBackground,
    backgroundDuration: mobileLifecycle.backgroundDuration,
    isRecovering: mobileLifecycle.isRecovering,
    needsRecovery: mobileLifecycle.needsRecovery,
    mobileAuthReady: !baseAuth.loading && !mobileLifecycle.isRecovering,
    
    // Mobile actions
    triggerMobileRecovery: mobileLifecycle.triggerRecovery,
    resetMobileState: mobileLifecycle.resetRecoveryState,
    markRecoveryComplete: mobileLifecycle.markRecoveryComplete,
  };

  return (
    <MobileAuthContext.Provider value={contextValue}>
      {children}
    </MobileAuthContext.Provider>
  );
};

/**
 * Hook to use mobile auth context
 */
export const useMobileAuth = (): MobileAuthContextType => {
  const context = useContext(MobileAuthContext);
  if (context === undefined) {
    throw new Error('useMobileAuth must be used within a MobileAuthProvider');
  }
  return context;
};

/**
 * Hook that provides both base auth and mobile auth in one interface
 */
export const useUnifiedAuth = () => {
  const baseAuth = useOptimizedAuth();
  const mobileAuth = useMobileAuth();
  
  return {
    // Base auth
    ...baseAuth,
    
    // Mobile enhancements (overrides base where applicable)
    loading: mobileAuth.isRecovering || baseAuth.loading,
    
    // Mobile-specific
    isMobileBackground: mobileAuth.isMobileBackground,
    returnedFromBackground: mobileAuth.returnedFromBackground,
    backgroundDuration: mobileAuth.backgroundDuration,
    isRecovering: mobileAuth.isRecovering,
    needsRecovery: mobileAuth.needsRecovery,
    mobileAuthReady: mobileAuth.mobileAuthReady,
    
    // Mobile actions
    triggerMobileRecovery: mobileAuth.triggerMobileRecovery,
    resetMobileState: mobileAuth.resetMobileState,
    markRecoveryComplete: mobileAuth.markRecoveryComplete,
  };
};

export default MobileAuthProvider; 