import { log } from '@/utils/logger';
/**
 * 🚀 Phase 3: Auth Flow State Manager
 * 
 * Centralized state management for authentication flow progress.
 * Coordinates UI components to prevent loading state conflicts.
 * 
 * Enhanced authentication flow state management.
 */

import { useState, useEffect } from 'react';


type AuthFlowStage = 
  | 'initializing'
  | 'checking-cache' 
  | 'fast-path'
  | 'slow-path'
  | 'redirecting'
  | 'complete'
  | 'error';

interface AuthFlowResult {
  success: boolean;
  stage: AuthFlowStage;
  redirectPath?: string;
  spaceData?: any;
  source?: string;
  executionTime?: number;
  error?: string;
}

interface AuthFlowState {
  stage: AuthFlowStage;
  isLoading: boolean;
  showLoadingUI: boolean;
  blockedComponents: Set<string>;
  lastResult?: AuthFlowResult;
  timestamp: number;
}

class AuthFlowStateManager {
  private static instance: AuthFlowStateManager;
  private state: AuthFlowState;
  private subscribers: Set<(state: AuthFlowState) => void> = new Set();

  private constructor() {
    this.state = {
      stage: 'initializing',
      isLoading: false,
      showLoadingUI: false,
      blockedComponents: new Set(),
      timestamp: Date.now()
    };

    if (typeof window !== 'undefined') {
      // Expose for debugging
      (window as any).authFlowStateManager = this;
    }
  }

  static getInstance(): AuthFlowStateManager {
    if (!AuthFlowStateManager.instance) {
      AuthFlowStateManager.instance = new AuthFlowStateManager();
    }
    return AuthFlowStateManager.instance;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback: (state: AuthFlowState) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Update auth flow stage
   */
  updateStage(stage: AuthFlowStage, context?: { source?: string; spaceData?: any }): void {
    const shouldShowLoading = this.shouldShowLoadingForStage(stage);
    
    this.state = {
      ...this.state,
      stage,
      isLoading: ['checking-cache', 'fast-path', 'slow-path', 'redirecting'].includes(stage),
      showLoadingUI: shouldShowLoading,
      timestamp: Date.now()
    };

    log.debug('Utils', `🎯 [AuthFlowStateManager] Stage: ${stage}, Loading UI: ${shouldShowLoading}`, context);
    
    // Notify subscribers
    this.notifySubscribers();
  }

  /**
   * Complete auth flow with result
   */
  completeFlow(result: AuthFlowResult): void {
    this.state = {
      ...this.state,
      stage: result.success ? 'complete' : 'error',
      isLoading: false,
      showLoadingUI: false,
      lastResult: result,
      timestamp: Date.now()
    };

    log.debug('Utils', `✅ [AuthFlowStateManager] Flow completed:`, result);
    
    // Clear blocked components on completion
    this.state.blockedComponents.clear();
    
    // Notify subscribers
    this.notifySubscribers();
  }

  /**
   * Block a component from showing loading
   */
  blockComponent(componentName: string): void {
    this.state.blockedComponents.add(componentName);
    log.debug('Utils', `🚫 [AuthFlowStateManager] Blocked component: ${componentName}`);
  }

  /**
   * Unblock a component
   */
  unblockComponent(componentName: string): void {
    this.state.blockedComponents.delete(componentName);
    log.debug('Utils', `✅ [AuthFlowStateManager] Unblocked component: ${componentName}`);
  }

  /**
   * Check if a component should show loading
   */
  shouldComponentShowLoading(componentName: string): boolean {
    if (this.state.blockedComponents.has(componentName)) {
      return false;
    }
    
    return this.state.showLoadingUI;
  }

  /**
   * Determine if loading UI should be shown for a stage
   */
  private shouldShowLoadingForStage(stage: AuthFlowStage): boolean {
    switch (stage) {
      case 'initializing':
        return true;
      case 'checking-cache':
        return false; // Cache check should be instant
      case 'fast-path':
        return false; // Fast path should complete in <10ms
      case 'slow-path':
        return true;  // Slow path needs loading UI
      case 'redirecting':
        return false; // Don't show loading during redirect
      case 'complete':
      case 'error':
        return false;
      default:
        return false;
    }
  }

  /**
   * Notify all subscribers of state changes
   */
  private notifySubscribers(): void {
    this.subscribers.forEach(callback => {
      try {
        callback({ ...this.state });
      } catch (error) {
        log.error('Utils', '🚫 [AuthFlowStateManager] Subscriber error:', error);
      }
    });
  }

  /**
   * Get current state
   */
  getState(): AuthFlowState {
    return { ...this.state };
  }

  /**
   * Reset state (useful for testing)
   */
  reset(): void {
    this.state = {
      stage: 'initializing',
      isLoading: false,
      showLoadingUI: false,
      blockedComponents: new Set(),
      timestamp: Date.now()
    };
    
    log.debug('Utils', '🧹 [AuthFlowStateManager] State reset');
    this.notifySubscribers();
  }

  /**
   * Check if fast path is available based on current state
   */
  shouldUseFastPath(): boolean {
    return this.state.stage === 'checking-cache' || this.state.stage === 'initializing';
  }

  /**
   * Check if components should skip loading (legacy method)
   * Note: Always returns false since hydration system was removed
   */
  shouldSkipLoadingForHydratedComponents(componentId: string, userId: string): boolean {
    return false;
  }

  /**
   * Coordinate with auth flow stages (legacy method)
   */
  async coordinateWithHydration(componentId: string, userId: string): Promise<boolean> {
    try {
      // If component is hydrated, skip loading states
      if (this.shouldSkipLoadingForHydratedComponents(componentId, userId)) {
        log.debug('Utils', `✅ [AuthFlowStateManager] Component ${componentId} is hydrated, skipping loading states`);
        return true;
      }

      // If auth flow is in fast path, allow hydration to proceed
      if (this.shouldUseFastPath()) {
        log.debug('Utils', `🚀 [AuthFlowStateManager] Auth flow in fast path, allowing hydration for ${componentId}`);
        return true;
      }

      // Otherwise, wait for auth flow to complete
      log.debug('Utils', `⏳ [AuthFlowStateManager] Waiting for auth flow completion before hydrating ${componentId}`);
      return false;
    } catch (error) {
      log.error('Utils', `🚨 [AuthFlowStateManager] Hydration coordination failed for ${componentId}:`, error);
      return false;
    }
  }

  /**
   * Notify of auth flow completion (legacy method)
   */
  notifyHydrationOfAuthCompletion(): void {
    // No-op since hydration system was removed
  }

  /**
   * Get loading state for components (legacy method)
   */
  getHydrationAwareLoadingState(componentId: string, userId: string): {
    shouldShowLoading: boolean;
    isHydrated: boolean;
    authStage: AuthFlowStage;
  } {
    const isHydrated = this.shouldSkipLoadingForHydratedComponents(componentId, userId);
    const shouldShowLoading = !isHydrated && this.shouldComponentShowLoading(componentId);
    
    return {
      shouldShowLoading,
      isHydrated,
      authStage: this.state.stage
    };
  }
}

// Export singleton instance
export const authFlowStateManager = AuthFlowStateManager.getInstance();

// React hook for components - FIXED: const export for Fast Refresh
export const useAuthFlowState = () => {
  const [state, setState] = useState(authFlowStateManager.getState());
  
  useEffect(() => {
    const unsubscribe = authFlowStateManager.subscribe(setState);
    return unsubscribe;
  }, []);
  
  return state;
}

// Hook for component-specific loading state - FIXED: const export for Fast Refresh
export const useComponentLoading = (componentName: string) => {
  const state = useAuthFlowState();
  
  return {
    shouldShowLoading: authFlowStateManager.shouldComponentShowLoading(componentName),
    authStage: state.stage,
    blockComponent: () => authFlowStateManager.blockComponent(componentName),
    unblockComponent: () => authFlowStateManager.unblockComponent(componentName)
  };
}

// Legacy hook for loading state (hydration system removed)
export const useHydrationAwareLoading = (componentId: string, userId: string) => {
  const state = useAuthFlowState();
  
  return {
    ...authFlowStateManager.getHydrationAwareLoadingState(componentId, userId),
    blockComponent: () => authFlowStateManager.blockComponent(componentId),
    unblockComponent: () => authFlowStateManager.unblockComponent(componentId),
    coordinateWithHydration: () => authFlowStateManager.coordinateWithHydration(componentId, userId)
  };
}

// Debug utilities
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).debugAuthFlow = () => {
    const state = authFlowStateManager.getState();
    log.debug('Utils', '🔍 [AuthFlowStateManager] Debug State:', {
      stage: state.stage,
      isLoading: state.isLoading,
      showLoadingUI: state.showLoadingUI,
      blockedComponents: Array.from(state.blockedComponents),
      lastResult: state.lastResult,
      timeSinceUpdate: Date.now() - state.timestamp
    });
  };
} 