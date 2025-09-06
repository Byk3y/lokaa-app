import { log } from '@/utils/logger';
/**
 * 🎯 Unified Loading Hook
 * 
 * Single hook that replaces all individual loading states.
 * Integrates with LoadingStateManager for conflict-free loading experience.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  loadingStateManager, 
  LoadingOperation, 
  UserType, 
  LoadingState 
} from '@/managers/LoadingStateManager';
import { enhancedCacheManager } from '@/services/EnhancedCacheManager';

interface UnifiedLoadingState {
  isLoading: boolean;
  operation: LoadingOperation | null;
  progress: number;
  expectedDuration: number;
  userType: UserType;
  canShowLoader: boolean;
  shouldShowInstantFeedback: boolean;
}

interface UseUnifiedLoadingOptions {
  operations?: LoadingOperation[];
  enableInstantFeedback?: boolean;
  enableProgressTracking?: boolean;
  onLoadingChange?: (state: UnifiedLoadingState) => void;
}

interface LoadingOperationControl {
  start: (operation: LoadingOperation, context?: any) => boolean;
  complete: (operation: LoadingOperation, success?: boolean) => void;
  isActive: (operation: LoadingOperation) => boolean;
  shouldShow: (operation: LoadingOperation) => boolean;
}

/**
 * 🎯 Master Loading Hook - Use this instead of individual loading states
 */
export function useUnifiedLoading(options: UseUnifiedLoadingOptions = {}) {
  const {
    operations = [],
    enableInstantFeedback = true,
    enableProgressTracking = true,
    onLoadingChange
  } = options;

  // Core loading state
  const [loadingState, setLoadingState] = useState<UnifiedLoadingState>({
    isLoading: false,
    operation: null,
    progress: 0,
    expectedDuration: 0,
    userType: UserType.UNKNOWN,
    canShowLoader: false,
    shouldShowInstantFeedback: false
  });

  // Subscription ID for manager callbacks
  const [subscriptionId] = useState(() => `unified-loading-${Date.now()}-${Math.random()}`);

  // Subscribe to loading state changes from manager
  useEffect(() => {
    const handleLoadingChange = (managerState: LoadingState | null) => {
      const newState: UnifiedLoadingState = {
        isLoading: managerState !== null,
        operation: managerState?.operation || null,
        progress: managerState ? calculateProgress(managerState) : 0,
        expectedDuration: managerState?.expectedDuration || 0,
        userType: managerState?.userType || UserType.UNKNOWN,
        canShowLoader: managerState ? loadingStateManager.shouldShowLoadingFor(managerState.operation) : false,
        shouldShowInstantFeedback: enableInstantFeedback && managerState !== null
      };

      setLoadingState(newState);
      onLoadingChange?.(newState);
    };

    loadingStateManager.subscribeToLoadingChanges(subscriptionId, handleLoadingChange);

    return () => {
      loadingStateManager.unsubscribeFromLoadingChanges(subscriptionId);
    };
  }, [subscriptionId, enableInstantFeedback, onLoadingChange]);

  // Loading operation controls
  const controls: LoadingOperationControl = useMemo(() => ({
    start: (operation: LoadingOperation, context?: any) => {
      return loadingStateManager.startOperation(operation, context);
    },
    
    complete: (operation: LoadingOperation, success = true) => {
      loadingStateManager.completeOperation(operation, success);
    },
    
    isActive: (operation: LoadingOperation) => {
      const current = loadingStateManager.getCurrentLoadingState();
      return current?.operation === operation;
    },
    
    shouldShow: (operation: LoadingOperation) => {
      return loadingStateManager.shouldShowLoadingFor(operation);
    }
  }), []);

  // Instant cache access helper
  const attemptInstantAccess = useCallback((userId: string, targetSubdomain?: string) => {
    return loadingStateManager.attemptInstantCacheAccess(userId, targetSubdomain);
  }, []);

  // Smart loading sequence for common patterns
  const executeLoadingSequence = useCallback(async (
    sequence: Array<{
      operation: LoadingOperation;
      action: () => Promise<any>;
      onSuccess?: (result: any) => void;
      onError?: (error: any) => void;
    }>
  ) => {
    for (const step of sequence) {
      const started = controls.start(step.operation);
      if (!started) {
        log.debug('Hook', `🎯 [UnifiedLoading] Sequence step ${step.operation} skipped by manager`);
        continue;
      }

      try {
        const result = await step.action();
        step.onSuccess?.(result);
        controls.complete(step.operation, true);
      } catch (error) {
        step.onError?.(error);
        controls.complete(step.operation, false);
        break; // Stop sequence on error
      }
    }
  }, [controls]);

  // User type detection helper
  const detectUserType = useCallback((userData: { spacesOwned: number; spacesJoined: number }) => {
    return loadingStateManager.detectUserType(userData);
  }, []);

  // Quick loading state checks
  const isLoadingAny = loadingState.isLoading;
  const isLoadingSpecific = useCallback((operation: LoadingOperation) => {
    return loadingState.operation === operation;
  }, [loadingState.operation]);

  // Progress calculation
  function calculateProgress(state: LoadingState): number {
    if (!enableProgressTracking) return 0;
    
    const elapsed = Date.now() - state.startTime;
    const progress = Math.min((elapsed / state.expectedDuration) * 100, 95); // Never show 100% until complete
    return Math.round(progress);
  }

  // Exposed state and controls
  return {
    // Loading state
    ...loadingState,
    isLoadingAny,
    
    // Operation controls
    startOperation: controls.start,
    completeOperation: controls.complete,
    isOperationActive: controls.isActive,
    shouldShowOperation: controls.shouldShow,
    
    // Specific loading checks
    isLoadingAuth: isLoadingSpecific(LoadingOperation.AUTH_CHECK),
    isLoadingSpaceDetection: isLoadingSpecific(LoadingOperation.SPACE_DETECTION),
    isLoadingSpaceAccess: isLoadingSpecific(LoadingOperation.SPACE_ACCESS),
    isLoadingMembership: isLoadingSpecific(LoadingOperation.MEMBERSHIP_VERIFICATION),
    isLoadingSpaceData: isLoadingSpecific(LoadingOperation.SPACE_DATA_FETCH),
    isLoadingRedirect: isLoadingSpecific(LoadingOperation.REDIRECT_OPERATION),
    
    // Utilities
    attemptInstantAccess,
    executeLoadingSequence,
    detectUserType,
    
    // Cache integration
    cacheManager: enhancedCacheManager
  };
}

/**
 * FIXED: Converted to const export for React Fast Refresh compatibility
 */
export const useSpaceLoading = (subdomain?: string) => {
  const unifiedLoading = useUnifiedLoading({
    operations: [
      LoadingOperation.SPACE_DETECTION,
      LoadingOperation.SPACE_ACCESS, 
      LoadingOperation.MEMBERSHIP_VERIFICATION,
      LoadingOperation.SPACE_DATA_FETCH
    ]
  });

  const loadSpace = useCallback(async (userId: string) => {
    if (!subdomain) return null;

    // Try instant cache access first
    const cacheResult = unifiedLoading.attemptInstantAccess(userId, subdomain);
    if (cacheResult.found && cacheResult.isValid) {
      return cacheResult.data;
    }

    // Execute loading sequence
    let spaceData = null;
    await unifiedLoading.executeLoadingSequence([
      {
        operation: LoadingOperation.SPACE_DETECTION,
        action: async () => {
          // Space detection logic here
          return { exists: true, subdomain };
        }
      },
      {
        operation: LoadingOperation.SPACE_ACCESS,
        action: async () => {
          // Space access verification
          return { hasAccess: true };
        }
      },
      {
        operation: LoadingOperation.SPACE_DATA_FETCH,
        action: async () => {
          // Fetch space data
          return { id: '123', name: 'Test Space', subdomain };
        },
        onSuccess: (data) => {
          spaceData = data;
          // Cache the result
          unifiedLoading.cacheManager.cacheSpaceData(data, userId, unifiedLoading.userType);
        }
      }
    ]);

    return spaceData;
  }, [subdomain, unifiedLoading]);

  return {
    ...unifiedLoading,
    loadSpace,
    subdomain
  };
}

/**
 * 🎭 User Type Detection Hook
 */
export function useUserTypeDetection() {
  const [userType, setUserType] = useState<UserType>(UserType.UNKNOWN);
  const [isDetecting, setIsDetecting] = useState(false);

  const detectFromDatabase = useCallback(async (userId: string) => {
    setIsDetecting(true);
    
    try {
      // This would typically query your database
      // For now, using mock data
      const userData = {
        spacesOwned: 1,
        spacesJoined: 3
      };

      const detectedType = loadingStateManager.detectUserType(userData);
      setUserType(detectedType);
      
      return detectedType;
    } catch (error) {
      log.error('Hook', 'User type detection failed:', error);
      return UserType.UNKNOWN;
    } finally {
      setIsDetecting(false);
    }
  }, []);

  return {
    userType,
    isDetecting,
    detectFromDatabase
  };
}

// Export types
export type { UnifiedLoadingState, UseUnifiedLoadingOptions, LoadingOperationControl }; 