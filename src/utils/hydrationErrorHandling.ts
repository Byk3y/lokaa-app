import { log } from '@/utils/logger';
/**
 * 🚀 Hydration Error Handling & Fallback Mechanisms
 * 
 * Phase 6B: Comprehensive error handling and fallback strategies for smart state hydration.
 * Ensures graceful degradation when hydration fails.
 */

import { smartStateHydrator, HydrationResult } from '@/services/SmartStateHydrator';
import { stateSerializer } from '@/utils/stateSerialization';

// Error types
export enum HydrationErrorType {
  CACHE_MISS = 'cache_miss',
  SERIALIZATION_ERROR = 'serialization_error',
  DESERIALIZATION_ERROR = 'deserialization_error',
  NETWORK_ERROR = 'network_error',
  PERMISSION_ERROR = 'permission_error',
  STORAGE_ERROR = 'storage_error',
  TIMEOUT_ERROR = 'timeout_error',
  UNKNOWN_ERROR = 'unknown_error'
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',           // Non-critical, can continue with fallback
  MEDIUM = 'medium',     // Some functionality may be limited
  HIGH = 'high',         // Significant impact, user experience degraded
  CRITICAL = 'critical'  // Complete failure, requires user intervention
}

// Error context
export interface HydrationErrorContext {
  componentId: string;
  userId: string;
  operation: string;
  timestamp: number;
  userAgent?: string;
  url?: string;
  retryCount?: number;
}

// Hydration error
export interface HydrationError {
  type: HydrationErrorType;
  severity: ErrorSeverity;
  message: string;
  context: HydrationErrorContext;
  originalError?: Error;
  recoverable: boolean;
  fallbackAvailable: boolean;
}

// Fallback strategy
export interface FallbackStrategy {
  type: 'default_state' | 'cached_state' | 'fresh_fetch' | 'user_prompt';
  priority: number;
  timeout?: number;
  description: string;
}

// Error recovery result
export interface ErrorRecoveryResult {
  success: boolean;
  recoveredState?: any;
  strategy: string;
  recoveryTime: number;
  error?: string;
}

class HydrationErrorHandler {
  private static instance: HydrationErrorHandler;
  private errorHistory: HydrationError[] = [];
  private fallbackStrategies: Map<HydrationErrorType, FallbackStrategy[]> = new Map();
  private retryAttempts: Map<string, number> = new Map();
  private maxRetries = 3;

  private constructor() {
    this.initializeFallbackStrategies();
    this.initializeDebugTools();
  }

  static getInstance(): HydrationErrorHandler {
    if (!HydrationErrorHandler.instance) {
      HydrationErrorHandler.instance = new HydrationErrorHandler();
    }
    return HydrationErrorHandler.instance;
  }

  /**
   * 🚨 HANDLE HYDRATION ERROR
   */
  async handleError(
    error: Error,
    context: HydrationErrorContext,
    fallbackState?: any
  ): Promise<ErrorRecoveryResult> {
    const hydrationError = this.classifyError(error, context);
    this.errorHistory.push(hydrationError);

    log.error('ErrorHandler', `🚨 [HydrationErrorHandler] Handling error: ${hydrationError.type}`, {
      componentId: context.componentId,
      severity: hydrationError.severity,
      message: hydrationError.message
    });

    // Try to recover
    if (hydrationError.recoverable) {
      return await this.attemptRecovery(hydrationError, fallbackState);
    }

    // Return failure result
    return {
      success: false,
      strategy: 'none',
      recoveryTime: 0,
      error: hydrationError.message
    };
  }

  /**
   * 🔄 ATTEMPT ERROR RECOVERY
   */
  async attemptRecovery(
    error: HydrationError,
    fallbackState?: any
  ): Promise<ErrorRecoveryResult> {
    const startTime = Date.now();
    const strategies = this.fallbackStrategies.get(error.type) || [];

    for (const strategy of strategies.sort((a, b) => a.priority - b.priority)) {
      try {
        log.debug('ErrorHandler', `🔄 [HydrationErrorHandler] Attempting recovery with strategy: ${strategy.type}`);

        const result = await this.executeRecoveryStrategy(strategy, error, fallbackState);
        
        if (result.success) {
          const recoveryTime = Date.now() - startTime;
          log.debug('ErrorHandler', `✅ [HydrationErrorHandler] Recovery successful with ${strategy.type} in ${recoveryTime}ms`);
          
          return {
            success: true,
            recoveredState: result.state,
            strategy: strategy.type,
            recoveryTime
          };
        }
      } catch (recoveryError) {
        log.warn('ErrorHandler', `⚠️ [HydrationErrorHandler] Recovery strategy ${strategy.type} failed:`, recoveryError);
      }
    }

    const recoveryTime = Date.now() - startTime;
    return {
      success: false,
      strategy: 'all_failed',
      recoveryTime,
      error: 'All recovery strategies failed'
    };
  }

  /**
   * 🔍 CLASSIFY ERROR
   */
  private classifyError(error: Error, context: HydrationErrorContext): HydrationError {
    let type: HydrationErrorType;
    let severity: ErrorSeverity;
    let recoverable = true;
    let fallbackAvailable = true;

    // Classify error type
    if (error.message.includes('No cached state')) {
      type = HydrationErrorType.CACHE_MISS;
      severity = ErrorSeverity.LOW;
    } else if (error.message.includes('serialization')) {
      type = HydrationErrorType.SERIALIZATION_ERROR;
      severity = ErrorSeverity.MEDIUM;
    } else if (error.message.includes('deserialization')) {
      type = HydrationErrorType.DESERIALIZATION_ERROR;
      severity = ErrorSeverity.MEDIUM;
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      type = HydrationErrorType.NETWORK_ERROR;
      severity = ErrorSeverity.HIGH;
    } else if (error.message.includes('permission') || error.message.includes('unauthorized')) {
      type = HydrationErrorType.PERMISSION_ERROR;
      severity = ErrorSeverity.HIGH;
      recoverable = false;
    } else if (error.message.includes('storage') || error.message.includes('quota')) {
      type = HydrationErrorType.STORAGE_ERROR;
      severity = ErrorSeverity.MEDIUM;
    } else if (error.message.includes('timeout')) {
      type = HydrationErrorType.TIMEOUT_ERROR;
      severity = ErrorSeverity.MEDIUM;
    } else {
      type = HydrationErrorType.UNKNOWN_ERROR;
      severity = ErrorSeverity.HIGH;
    }

    return {
      type,
      severity,
      message: error.message,
      context,
      originalError: error,
      recoverable,
      fallbackAvailable
    };
  }

  /**
   * ⚡ EXECUTE RECOVERY STRATEGY
   */
  private async executeRecoveryStrategy(
    strategy: FallbackStrategy,
    error: HydrationError,
    fallbackState?: any
  ): Promise<{ success: boolean; state?: any }> {
    const { componentId, userId } = error.context;

    switch (strategy.type) {
      case 'default_state':
        return {
          success: true,
          state: fallbackState || this.getDefaultState(componentId)
        };

      case 'cached_state':
        // Try to get any cached state, even if partial
        try {
          const result = await smartStateHydrator.hydrateComponent(componentId, userId, fallbackState);
          return {
            success: result.success,
            state: result.state?.data
          };
        } catch {
          return { success: false };
        }

      case 'fresh_fetch':
        // This would trigger a fresh data fetch
        // For now, return fallback state
        return {
          success: true,
          state: fallbackState
        };

      case 'user_prompt':
        // This would show a user prompt to retry or continue
        // For now, return fallback state
        return {
          success: true,
          state: fallbackState
        };

      default:
        return { success: false };
    }
  }

  /**
   * 🎯 GET DEFAULT STATE
   */
  private getDefaultState(componentId: string): any {
    // Return appropriate default state based on component type
    if (componentId.includes('feedtab')) {
      return {
        selectedTab: 'all',
        posts: [],
        pinnedPosts: [],
        categories: [],
        currentPage: 1,
        totalCount: 0
      };
    }

    if (componentId.includes('space-settings')) {
      return {
        activeTab: 'dashboard',
        formData: {},
        isDirty: false,
        isOpen: false
      };
    }

    if (componentId.includes('membership-store')) {
      return {
        isMember: false,
        isOwner: false,
        isAdmin: false,
        role: null,
        status: null
      };
    }

    // Generic default state
    return {
      loading: false,
      error: null,
      data: null
    };
  }

  /**
   * 📊 GET ERROR STATISTICS
   */
  getErrorStatistics(): {
    totalErrors: number;
    errorsByType: Record<HydrationErrorType, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    recentErrors: HydrationError[];
    errorRate: number;
  } {
    const totalErrors = this.errorHistory.length;
    const errorsByType = {} as Record<HydrationErrorType, number>;
    const errorsBySeverity = {} as Record<ErrorSeverity, number>;

    // Initialize counters
    Object.values(HydrationErrorType).forEach(type => {
      errorsByType[type] = 0;
    });
    Object.values(ErrorSeverity).forEach(severity => {
      errorsBySeverity[severity] = 0;
    });

    // Count errors
    this.errorHistory.forEach(error => {
      errorsByType[error.type]++;
      errorsBySeverity[error.severity]++;
    });

    // Get recent errors (last 10)
    const recentErrors = this.errorHistory.slice(-10);

    // Calculate error rate (errors per hour)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const recentErrorCount = this.errorHistory.filter(
      error => error.context.timestamp > oneHourAgo
    ).length;
    const errorRate = recentErrorCount; // errors per hour

    return {
      totalErrors,
      errorsByType,
      errorsBySeverity,
      recentErrors,
      errorRate
    };
  }

  /**
   * 🧹 CLEAR ERROR HISTORY
   */
  clearErrorHistory(): void {
    this.errorHistory = [];
    this.retryAttempts.clear();
    log.debug('ErrorHandler', '🧹 [HydrationErrorHandler] Error history cleared');
  }

  // =================== PRIVATE METHODS ===================

  private initializeFallbackStrategies(): void {
    // Cache miss strategies
    this.fallbackStrategies.set(HydrationErrorType.CACHE_MISS, [
      {
        type: 'default_state',
        priority: 1,
        description: 'Use default component state'
      },
      {
        type: 'fresh_fetch',
        priority: 2,
        description: 'Fetch fresh data from server'
      }
    ]);

    // Serialization error strategies
    this.fallbackStrategies.set(HydrationErrorType.SERIALIZATION_ERROR, [
      {
        type: 'cached_state',
        priority: 1,
        description: 'Try to use any available cached state'
      },
      {
        type: 'default_state',
        priority: 2,
        description: 'Use default component state'
      }
    ]);

    // Deserialization error strategies
    this.fallbackStrategies.set(HydrationErrorType.DESERIALIZATION_ERROR, [
      {
        type: 'cached_state',
        priority: 1,
        description: 'Try to use any available cached state'
      },
      {
        type: 'default_state',
        priority: 2,
        description: 'Use default component state'
      }
    ]);

    // Network error strategies
    this.fallbackStrategies.set(HydrationErrorType.NETWORK_ERROR, [
      {
        type: 'cached_state',
        priority: 1,
        description: 'Use cached state while offline'
      },
      {
        type: 'default_state',
        priority: 2,
        description: 'Use default state'
      },
      {
        type: 'user_prompt',
        priority: 3,
        description: 'Prompt user to retry'
      }
    ]);

    // Storage error strategies
    this.fallbackStrategies.set(HydrationErrorType.STORAGE_ERROR, [
      {
        type: 'default_state',
        priority: 1,
        description: 'Use default state without caching'
      },
      {
        type: 'fresh_fetch',
        priority: 2,
        description: 'Fetch fresh data without caching'
      }
    ]);

    // Timeout error strategies
    this.fallbackStrategies.set(HydrationErrorType.TIMEOUT_ERROR, [
      {
        type: 'cached_state',
        priority: 1,
        description: 'Use cached state'
      },
      {
        type: 'default_state',
        priority: 2,
        description: 'Use default state'
      }
    ]);
  }

  private initializeDebugTools(): void {
    if (process.env.NODE_ENV === 'development') {
      (window as any).hydrationErrorHandler = this;
      (window as any).getHydrationErrors = () => this.getErrorStatistics();
      (window as any).clearHydrationErrors = () => this.clearErrorHistory();
    }
  }
}

// Export singleton instance
export const hydrationErrorHandler = HydrationErrorHandler.getInstance();

// Export types
export type { 
  HydrationErrorContext, 
  HydrationError, 
  FallbackStrategy, 
  ErrorRecoveryResult 
};
