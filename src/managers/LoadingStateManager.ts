import { log } from '@/utils/logger';
/**
 * 🎯 Loading State Conductor - Master Orchestrator
 * 
 * This manager coordinates ALL loading states across the application to prevent conflicts.
 * It ensures only ONE loading experience is active at a time and provides instant feedback.
 * 
 * Enhanced loading state management with performance optimization.
 */

import { NavigateFunction } from 'react-router-dom';


// Loading state priorities (lower = higher priority)
export enum LoadingPriority {
  INSTANT_CACHE = 0,     // 0-50ms - immediate cache access
  FAST_DATABASE = 1,     // 100-300ms - optimized DB queries  
  FALLBACK_LOADING = 2,  // 500-800ms - standard loading
  ERROR_RECOVERY = 3     // 1000ms+ - error handling
}

// User types that affect loading strategy
export enum UserType {
  SPACE_OWNER = 'SPACE_OWNER',           // Owns spaces
  MEMBER_ONLY = 'MEMBER_ONLY',           // Only joined spaces
  OWNER_AND_MEMBER = 'OWNER_AND_MEMBER', // Owns AND member (high conflict)
  NO_SPACES = 'NO_SPACES',               // No space relationships
  UNKNOWN = 'UNKNOWN'                    // Not yet determined
}

// Loading operation types
export enum LoadingOperation {
  AUTH_CHECK = 'auth_check',
  SPACE_DETECTION = 'space_detection', 
  SPACE_ACCESS = 'space_access',
  MEMBERSHIP_VERIFICATION = 'membership_verification',
  SPACE_DATA_FETCH = 'space_data_fetch',
  REDIRECT_OPERATION = 'redirect_operation'
}

// Cache sources in priority order
export enum CacheSource {
  LAST_ACTIVE_SPACE = 'lastActiveSpace',
  OWNERSHIP_FLAGS = 'user_owns_space_',
  MEMBERSHIP_FLAGS = 'user_member_',
  LAST_VISITED_SPACE = 'lastVisitedSpace',
  LAST_JOINED_SPACE = 'lastJoinedSpace'
}

interface LoadingState {
  operation: LoadingOperation;
  priority: LoadingPriority;
  startTime: number;
  expectedDuration: number;
  userType: UserType;
  context?: any;
}

interface CacheResult {
  found: boolean;
  data?: any;
  source: CacheSource;
  isValid: boolean;
  timestamp?: number;
}

interface LoadingStrategy {
  userType: UserType;
  expectedTime: number;
  cacheFirst: boolean;
  skipOperations: LoadingOperation[];
  priorityOperations: LoadingOperation[];
}

class LoadingStateManager {
  private static instance: LoadingStateManager;
  private activeOperations: Map<LoadingOperation, LoadingState> = new Map();
  private currentUserType: UserType = UserType.UNKNOWN;
  private masterLoadingState: LoadingState | null = null;
  private loadingCallbacks: Map<string, (state: LoadingState | null) => void> = new Map();

  // Loading strategies by user type
  private loadingStrategies: Map<UserType, LoadingStrategy> = new Map([
    [UserType.SPACE_OWNER, {
      userType: UserType.SPACE_OWNER,
      expectedTime: 500,
      cacheFirst: true,
      skipOperations: [LoadingOperation.MEMBERSHIP_VERIFICATION],
      priorityOperations: [LoadingOperation.SPACE_ACCESS]
    }],
    [UserType.MEMBER_ONLY, {
      userType: UserType.MEMBER_ONLY, 
      expectedTime: 800,
      cacheFirst: true,
      skipOperations: [],
      priorityOperations: [LoadingOperation.MEMBERSHIP_VERIFICATION, LoadingOperation.SPACE_DETECTION]
    }],
    [UserType.OWNER_AND_MEMBER, {
      userType: UserType.OWNER_AND_MEMBER,
      expectedTime: 600,
      cacheFirst: true,
      skipOperations: [],
      priorityOperations: [LoadingOperation.SPACE_ACCESS, LoadingOperation.SPACE_DETECTION]
    }],
    [UserType.NO_SPACES, {
      userType: UserType.NO_SPACES,
      expectedTime: 300,
      cacheFirst: false,
      skipOperations: [LoadingOperation.SPACE_ACCESS, LoadingOperation.MEMBERSHIP_VERIFICATION, LoadingOperation.SPACE_DATA_FETCH],
      priorityOperations: [LoadingOperation.REDIRECT_OPERATION]
    }],
    [UserType.UNKNOWN, {
      userType: UserType.UNKNOWN,
      expectedTime: 1000,
      cacheFirst: true,
      skipOperations: [],
      priorityOperations: [LoadingOperation.AUTH_CHECK, LoadingOperation.SPACE_DETECTION]
    }]
  ]);

  private constructor() {
    this.initializeDebugTools();
  }

  static getInstance(): LoadingStateManager {
    if (!LoadingStateManager.instance) {
      LoadingStateManager.instance = new LoadingStateManager();
    }
    return LoadingStateManager.instance;
  }

  /**
   * 🎯 MASTER LOADING COORDINATOR
   * Call this to start any loading operation - it will coordinate with others
   */
  startOperation(operation: LoadingOperation, context?: any): boolean {
    try {
      const strategy = this.getStrategy();
      
      // Check if this operation should be skipped for this user type
      if (strategy.skipOperations && strategy.skipOperations.includes(operation)) {
        log.debug('App', `🎯 [LoadingManager] Skipping ${operation} for ${this.currentUserType}`);
        return false;
      }

      // Check if higher priority operation is running
      const currentPriority = this.getOperationPriority(operation);
      if (this.masterLoadingState && this.masterLoadingState.priority < currentPriority) {
        log.debug('App', `🎯 [LoadingManager] ${operation} blocked by higher priority ${this.masterLoadingState.operation}`);
        return false;
      }

      // Start the operation
      const loadingState: LoadingState = {
        operation,
        priority: currentPriority,
        startTime: Date.now(),
        expectedDuration: strategy.expectedTime || 1000,
        userType: this.currentUserType,
        context
      };

      this.activeOperations.set(operation, loadingState);
      
      // Update master loading state if this is higher priority
      if (!this.masterLoadingState || currentPriority <= this.masterLoadingState.priority) {
        this.masterLoadingState = loadingState;
        this.notifyLoadingChange(loadingState);
      }

      log.debug('App', `🎯 [LoadingManager] Started ${operation} (priority: ${currentPriority})`);
      return true;
    } catch (error) {
      log.error('App', `🚨 [LoadingManager] Error starting operation ${operation}:`, error);
      log.error('App', `🚨 [LoadingManager] Current user type: ${this.currentUserType}`);
      log.error('App', `🚨 [LoadingManager] Available strategies:`, Array.from(this.loadingStrategies.keys()));
      return false;
    }
  }

  /**
   * 🏁 Complete a loading operation
   */
  completeOperation(operation: LoadingOperation, success: boolean = true): void {
    const loadingState = this.activeOperations.get(operation);
    if (!loadingState) return;

    const duration = Date.now() - loadingState.startTime;
    log.debug('App', `🏁 [LoadingManager] Completed ${operation} in ${duration}ms (${success ? 'success' : 'failed'})`);

    this.activeOperations.delete(operation);

    // Update master loading state
    if (this.masterLoadingState?.operation === operation) {
      // Find next highest priority operation
      let nextOperation: LoadingState | null = null;
      for (const [_, state] of this.activeOperations) {
        if (!nextOperation || state.priority < nextOperation.priority) {
          nextOperation = state;
        }
      }
      
      this.masterLoadingState = nextOperation;
      this.notifyLoadingChange(nextOperation);
    }
  }

  /**
   * 🚀 INSTANT CACHE ACCESS ATTEMPT
   * Try to resolve immediately from cache without any loading states
   */
  attemptInstantCacheAccess(userId: string, targetSubdomain?: string): CacheResult {
    const cacheAttempts: CacheSource[] = [
      CacheSource.LAST_ACTIVE_SPACE,
      CacheSource.OWNERSHIP_FLAGS,
      CacheSource.MEMBERSHIP_FLAGS,
      CacheSource.LAST_VISITED_SPACE,
      CacheSource.LAST_JOINED_SPACE
    ];

    for (const source of cacheAttempts) {
      const result = this.checkCacheSource(source, userId, targetSubdomain);
      if (result.found && result.isValid) {
        log.debug('App', `🚀 [LoadingManager] INSTANT CACHE HIT from ${source}`);
        return result;
      }
    }

    log.debug('App', `🚀 [LoadingManager] No valid cache found, will need loading operation`);
    return { found: false, source: CacheSource.LAST_ACTIVE_SPACE, isValid: false };
  }

  /**
   * 👤 Set user type to optimize loading strategy
   */
  setUserType(userType: UserType): void {
    if (this.currentUserType !== userType) {
      log.debug('App', `👤 [LoadingManager] User type changed: ${this.currentUserType} → ${userType}`);
      this.currentUserType = userType;
    }
  }

  /**
   * 🎭 Detect user type from database data
   */
  detectUserType(userData: { spacesOwned: number; spacesJoined: number }): UserType {
    const { spacesOwned, spacesJoined } = userData;
    
    let userType: UserType;
    if (spacesOwned > 0 && spacesJoined > spacesOwned) {
      userType = UserType.OWNER_AND_MEMBER;
    } else if (spacesOwned > 0) {
      userType = UserType.SPACE_OWNER;
    } else if (spacesJoined > 0) {
      userType = UserType.MEMBER_ONLY;
    } else {
      userType = UserType.NO_SPACES;
    }

    this.setUserType(userType);
    return userType;
  }

  /**
   * 📊 Get current loading state for UI
   */
  getCurrentLoadingState(): LoadingState | null {
    return this.masterLoadingState;
  }

  /**
   * 🔔 Subscribe to loading state changes
   */
  subscribeToLoadingChanges(id: string, callback: (state: LoadingState | null) => void): void {
    this.loadingCallbacks.set(id, callback);
  }

  /**
   * 🔕 Unsubscribe from loading changes
   */
  unsubscribeFromLoadingChanges(id: string): void {
    this.loadingCallbacks.delete(id);
  }

  /**
   * 🚨 Check if specific operation is allowed to show loading UI
   */
  shouldShowLoadingFor(operation: LoadingOperation): boolean {
    const currentState = this.masterLoadingState;
    if (!currentState) return true;
    
    // Only show loading if this operation is the master operation
    return currentState.operation === operation;
  }

  /**
   * 🔍 Check if operation is currently in progress
   */
  isOperationInProgress(operation: LoadingOperation): boolean {
    return this.activeOperations.has(operation);
  }

  // =================== PRIVATE METHODS ===================

  private getStrategy(): LoadingStrategy {
    const strategy = this.loadingStrategies.get(this.currentUserType) || this.loadingStrategies.get(UserType.UNKNOWN);
    
    if (!strategy) {
      log.error('App', `🚨 [LoadingManager] No strategy found for user type: ${this.currentUserType}`);
      // Return a safe fallback strategy
      return {
        userType: UserType.UNKNOWN,
        expectedTime: 1000,
        cacheFirst: true,
        skipOperations: [],
        priorityOperations: [LoadingOperation.AUTH_CHECK]
      };
    }
    
    return strategy;
  }

  private getOperationPriority(operation: LoadingOperation): LoadingPriority {
    const strategy = this.getStrategy();
    
    if (strategy.priorityOperations.includes(operation)) {
      return LoadingPriority.INSTANT_CACHE;
    }
    
    switch (operation) {
      case LoadingOperation.AUTH_CHECK:
        return LoadingPriority.INSTANT_CACHE;
      case LoadingOperation.SPACE_DETECTION:
      case LoadingOperation.SPACE_ACCESS:
        return strategy.cacheFirst ? LoadingPriority.INSTANT_CACHE : LoadingPriority.FAST_DATABASE;
      case LoadingOperation.MEMBERSHIP_VERIFICATION:
        return LoadingPriority.FAST_DATABASE;
      case LoadingOperation.SPACE_DATA_FETCH:
        return LoadingPriority.FALLBACK_LOADING;
      case LoadingOperation.REDIRECT_OPERATION:
        return LoadingPriority.INSTANT_CACHE;
      default:
        return LoadingPriority.FALLBACK_LOADING;
    }
  }

  private checkCacheSource(source: CacheSource, userId: string, targetSubdomain?: string): CacheResult {
    try {
      let key: string;
      let data: any;

      switch (source) {
        case CacheSource.LAST_ACTIVE_SPACE:
          key = 'lastActiveSpace';
          data = localStorage.getItem(key);
          break;
        case CacheSource.OWNERSHIP_FLAGS:
          if (!targetSubdomain) return { found: false, source, isValid: false };
          key = `user_owns_space_${targetSubdomain}`;
          data = localStorage.getItem(key);
          break;
        case CacheSource.MEMBERSHIP_FLAGS:
          if (!targetSubdomain) return { found: false, source, isValid: false };
          key = `user_member_${targetSubdomain}_${userId}`;
          data = localStorage.getItem(key);
          break;
        case CacheSource.LAST_VISITED_SPACE:
          key = 'lastVisitedSpace';
          data = localStorage.getItem(key);
          break;
        case CacheSource.LAST_JOINED_SPACE:
          key = 'lastJoinedSpace';
          data = localStorage.getItem(key);
          break;
        default:
          return { found: false, source, isValid: false };
      }

      if (!data) {
        return { found: false, source, isValid: false };
      }

      // Parse data if it's JSON
      let parsedData = data;
      try {
        parsedData = JSON.parse(data);
      } catch {
        // Not JSON, use as string
      }

      // Validate timestamp if present
      const isValid = this.validateCacheTimestamp(parsedData, source);

      return {
        found: true,
        data: parsedData,
        source,
        isValid,
        timestamp: parsedData?.timestamp
      };

    } catch (error) {
      log.warn('App', `Cache check failed for ${source}:`, error);
      return { found: false, source, isValid: false };
    }
  }

  private validateCacheTimestamp(data: any, source: CacheSource): boolean {
    // For simple flags, consider them valid for longer
    if (source === CacheSource.OWNERSHIP_FLAGS) {
      return true; // Ownership rarely changes
    }

    if (source === CacheSource.MEMBERSHIP_FLAGS) {
      if (!data?.timestamp) return false;
      return (Date.now() - data.timestamp) < (2 * 60 * 1000); // 2 min TTL
    }

    // For space data, check timestamp
    if (!data?.timestamp) return false;
    return (Date.now() - data.timestamp) < (5 * 60 * 1000); // 5 min TTL
  }

  private notifyLoadingChange(state: LoadingState | null): void {
    for (const [_, callback] of this.loadingCallbacks) {
      try {
        callback(state);
      } catch (error) {
        log.error('App', 'Loading callback error:', error);
      }
    }
  }

  private initializeDebugTools(): void {
    if (process.env.NODE_ENV === 'development') {
      // Expose to window for debugging
      (window as any).loadingStateManager = this;
      (window as any).debugLoadingState = () => {
        log.debug('App', '🎯 Loading State Manager Debug:', {
          currentUserType: this.currentUserType,
          masterLoadingState: this.masterLoadingState,
          activeOperations: Array.from(this.activeOperations.entries()),
          subscriberCount: this.loadingCallbacks.size
        });
      };
    }
  }

  /**
   * Check if component should skip loading (legacy method)
   * Note: Always returns false since hydration system was removed
   */
  shouldSkipLoadingForHydratedComponent(componentId: string, userId: string): boolean {
    return false;
  }

  /**
   * Start loading operation (legacy method)
   */
  startOperationWithHydration(
    operation: LoadingOperation, 
    componentId: string, 
    userId: string,
    priority: LoadingPriority = LoadingPriority.FALLBACK_LOADING
  ): boolean {
    // Check if component is hydrated
    if (this.shouldSkipLoadingForHydratedComponent(componentId, userId)) {
      log.debug('App', `✅ [LoadingStateManager] Component ${componentId} is hydrated, skipping loading operation ${operation}`);
      return false; // Don't start loading
    }

    // Start normal loading operation
    return this.startOperation(operation, priority);
  }

  /**
   * Complete loading operation (legacy method)
   */
  completeOperationWithHydration(
    operation: LoadingOperation, 
    componentId: string, 
    userId: string
  ): void {
    this.completeOperation(operation);
  }

  /**
   * Get loading state (legacy method)
   */
  getHydrationAwareLoadingState(componentId: string, userId: string): {
    shouldShowLoading: boolean;
    isHydrated: boolean;
    currentOperation: LoadingOperation | null;
    loadingTime: number;
  } {
    const isHydrated = this.shouldSkipLoadingForHydratedComponent(componentId, userId);
    const shouldShowLoading = !isHydrated && this.masterLoadingState !== null;
    const currentOperation = this.masterLoadingState?.operation || null;
    const loadingTime = this.masterLoadingState ? Date.now() - this.masterLoadingState.startTime : 0;

    return {
      shouldShowLoading,
      isHydrated,
      currentOperation,
      loadingTime
    };
  }

  /**
   * Coordinate loading (legacy method)
   * Note: Always show loading since hydration system was removed
   */
  async coordinateWithHydration(componentId: string, userId: string): Promise<{
    shouldShowLoading: boolean;
    hydrationTime?: number;
  }> {
    return { shouldShowLoading: true };
  }
}

// Export singleton instance
export const loadingStateManager = LoadingStateManager.getInstance();

// Export types for other files
export type { LoadingState, CacheResult, LoadingStrategy }; 