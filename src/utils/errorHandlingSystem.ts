import { log } from '@/utils/logger';
/**
 * 🛡️ Phase 4: Error Handling and Fallback Systems
 * 
 * Comprehensive error handling system that provides:
 * - Centralized error classification and recovery
 * - Intelligent retry mechanisms with exponential backoff
 * - Graceful degradation and fallback states
 * - Error boundary coordination
 * - User-friendly error messaging
 */

import { getSupabaseClient } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Error types and classifications
export enum ErrorType {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication', 
  AUTHORIZATION = 'authorization',
  DATABASE = 'database',
  SPACE_ACCESS = 'space_access',
  RATE_LIMIT = 'rate_limit',
  TIMEOUT = 'timeout',
  VALIDATION = 'validation',
  UNKNOWN = 'unknown'
}

export enum ErrorSeverity {
  LOW = 'low',       // Minor issues, app continues normally
  MEDIUM = 'medium', // Significant issues, some features affected
  HIGH = 'high',     // Major issues, core functionality impacted
  CRITICAL = 'critical' // App-breaking issues, requires immediate action
}

export interface AppError {
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  context: Record<string, any>;
  timestamp: number;
  stackTrace?: string;
  recoverable: boolean;
  retryable: boolean;
  originalError?: Error;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBackoff: boolean;
  shouldRetry?: (error: AppError) => boolean;
}

export interface FallbackStrategy {
  type: 'cache' | 'placeholder' | 'redirect' | 'offline' | 'minimal';
  config: Record<string, any>;
}

// Default retry configurations by error type
const DEFAULT_RETRY_CONFIGS: Record<ErrorType, RetryConfig> = {
  [ErrorType.NETWORK]: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    exponentialBackoff: true,
    shouldRetry: (error) => !error.message.includes('404')
  },
  [ErrorType.DATABASE]: {
    maxAttempts: 2,
    baseDelay: 2000,
    maxDelay: 8000,
    exponentialBackoff: true
  },
  [ErrorType.AUTHENTICATION]: {
    maxAttempts: 1,
    baseDelay: 1000,
    maxDelay: 1000,
    exponentialBackoff: false
  },
  [ErrorType.RATE_LIMIT]: {
    maxAttempts: 2,
    baseDelay: 5000,
    maxDelay: 30000,
    exponentialBackoff: true
  },
  [ErrorType.TIMEOUT]: {
    maxAttempts: 2,
    baseDelay: 1500,
    maxDelay: 5000,
    exponentialBackoff: true
  },
  [ErrorType.SPACE_ACCESS]: {
    maxAttempts: 2,
    baseDelay: 1000,
    maxDelay: 3000,
    exponentialBackoff: true
  },
  [ErrorType.AUTHORIZATION]: {
    maxAttempts: 1,
    baseDelay: 1000,
    maxDelay: 1000,
    exponentialBackoff: false
  },
  [ErrorType.VALIDATION]: {
    maxAttempts: 0,
    baseDelay: 0,
    maxDelay: 0,
    exponentialBackoff: false
  },
  [ErrorType.UNKNOWN]: {
    maxAttempts: 1,
    baseDelay: 2000,
    maxDelay: 2000,
    exponentialBackoff: false
  }
};

class ErrorHandlingSystem {
  private static instance: ErrorHandlingSystem;
  private errorLog: AppError[] = [];
  private recoveryStrategies: Map<ErrorType, (error: AppError) => Promise<boolean>> = new Map();
  private fallbackStrategies: Map<ErrorType, FallbackStrategy> = new Map();
  private activeRetries: Map<string, number> = new Map();

  private constructor() {
    this.initializeRecoveryStrategies();
    this.initializeFallbackStrategies();
    this.setupGlobalErrorHandlers();
  }

  public static getInstance(): ErrorHandlingSystem {
    if (!ErrorHandlingSystem.instance) {
      ErrorHandlingSystem.instance = new ErrorHandlingSystem();
    }
    return ErrorHandlingSystem.instance;
  }

  /**
   * 🔍 Classify and create an AppError from any error
   */
  public classifyError(error: any, context: Record<string, any> = {}): AppError {
    const id = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Date.now();
    
    let type = ErrorType.UNKNOWN;
    let severity = ErrorSeverity.MEDIUM;
    const message = 'An unexpected error occurred';
    let userMessage = 'Something went wrong. Please try again.';
    const recoverable = true;
    let retryable = true;

    // Classify by error message and properties
    if (error?.message || error?.toString) {
      const errorText = (error.message || error.toString()).toLowerCase();
      
      if (errorText.includes('network') || errorText.includes('fetch') || errorText.includes('connection')) {
        type = ErrorType.NETWORK;
        userMessage = 'Network error. Please check your internet connection.';
      } else if (errorText.includes('timeout') || errorText.includes('aborted')) {
        type = ErrorType.TIMEOUT;
        userMessage = 'Request timed out. Please try again.';
      } else if (errorText.includes('auth') || errorText.includes('session') || errorText.includes('token')) {
        type = ErrorType.AUTHENTICATION;
        severity = ErrorSeverity.HIGH;
        userMessage = 'Authentication error. Please sign in again.';
        retryable = false;
      } else if (errorText.includes('permission') || errorText.includes('unauthorized') || errorText.includes('forbidden')) {
        type = ErrorType.AUTHORIZATION;
        userMessage = 'Access denied. You may not have permission for this action.';
        retryable = false;
      } else if (errorText.includes('rate limit') || errorText.includes('too many requests')) {
        type = ErrorType.RATE_LIMIT;
        userMessage = 'Too many requests. Please wait a moment and try again.';
      } else if (errorText.includes('validation') || errorText.includes('invalid')) {
        type = ErrorType.VALIDATION;
        userMessage = 'Invalid data provided. Please check your input.';
        retryable = false;
      }
    }

    // Classify by error code (Supabase errors)
    if (error?.code && typeof error.code === 'string') {
      if (error.code === 'PGRST301' || error.code === 'PGRST116') {
        type = ErrorType.DATABASE;
        if (error.code === 'PGRST116') {
          userMessage = 'No data found.';
          severity = ErrorSeverity.LOW;
        }
      } else if (error.code.startsWith('PGRST')) {
        type = ErrorType.DATABASE;
      }
    }

    // Handle specific context-based classification
    if (context.component === 'SpaceProtectedRoute' || context.operation === 'space-access') {
      type = ErrorType.SPACE_ACCESS;
      userMessage = 'Unable to access this space. Please check your permissions.';
    }

    // Adjust severity based on context
    if (context.critical || context.blocking) {
      severity = ErrorSeverity.CRITICAL;
    }

    return {
      id,
      type,
      severity,
      message: error?.message || message,
      userMessage,
      context,
      timestamp,
      stackTrace: error?.stack,
      recoverable,
      retryable,
      originalError: error instanceof Error ? error : undefined
    };
  }

  /**
   * 🔄 Execute operation with retry logic
   */
  public async withRetry<T>(
    operation: () => Promise<T>,
    context: Record<string, any> = {},
    customRetryConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const operationId = context.operationId || `op_${Date.now()}`;
    let lastError: AppError;

    // Determine retry config
    const errorType = context.expectedErrorType || ErrorType.UNKNOWN;
    const retryConfig = {
      ...DEFAULT_RETRY_CONFIGS[errorType],
      ...customRetryConfig
    };

    for (let attempt = 0; attempt <= retryConfig.maxAttempts; attempt++) {
      try {
        const result = await operation();
        
        // Success - clear retry count
        this.activeRetries.delete(operationId);
        
        if (attempt > 0) {
          log.debug('Utils', `✅ [ErrorHandling] Operation succeeded on attempt ${attempt + 1}`);
        }
        
        return result;
      } catch (error) {
        lastError = this.classifyError(error, { ...context, attempt: attempt + 1 });
        this.logError(lastError);

        // Check if we should retry
        if (attempt >= retryConfig.maxAttempts || 
            !lastError.retryable || 
            (retryConfig.shouldRetry && !retryConfig.shouldRetry(lastError))) {
          break;
        }

        // Calculate delay
        let delay = retryConfig.baseDelay;
        if (retryConfig.exponentialBackoff) {
          delay = Math.min(
            retryConfig.baseDelay * Math.pow(2, attempt),
            retryConfig.maxDelay
          );
        }

        // Add jitter to prevent thundering herd
        delay += Math.random() * 1000;

        log.warn('Utils', `⚠️ [ErrorHandling] Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, lastError.message);
        
        // Track active retries
        this.activeRetries.set(operationId, attempt + 1);

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // All retries exhausted - attempt recovery
    const recovered = await this.attemptRecovery(lastError!);
    if (!recovered) {
      throw lastError!;
    }

    // Recovery successful, try one more time
    try {
      return await operation();
    } catch (error) {
      throw this.classifyError(error, context);
    }
  }

  /**
   * 🛠️ Attempt to recover from an error
   */
  public async attemptRecovery(error: AppError): Promise<boolean> {
    if (!error.recoverable) {
      return false;
    }

    const recoveryStrategy = this.recoveryStrategies.get(error.type);
    if (!recoveryStrategy) {
      return false;
    }

    try {
      log.debug('Utils', `🔧 [ErrorHandling] Attempting recovery for ${error.type} error`);
      const recovered = await recoveryStrategy(error);
      
      if (recovered) {
        log.debug('Utils', `✅ [ErrorHandling] Successfully recovered from ${error.type} error`);
      }
      
      return recovered;
    } catch (recoveryError) {
      log.error('Utils', `❌ [ErrorHandling] Recovery failed for ${error.type}:`, recoveryError);
      return false;
    }
  }

  /**
   * 🎭 Get fallback strategy for error type
   */
  public getFallbackStrategy(errorType: ErrorType): FallbackStrategy | null {
    return this.fallbackStrategies.get(errorType) || null;
  }

  /**
   * 📝 Log error for debugging and analytics
   */
  public logError(error: AppError): void {
    // Add to error log
    this.errorLog.push(error);
    
    // Keep only last 100 errors
    if (this.errorLog.length > 100) {
      this.errorLog = this.errorLog.slice(-100);
    }

    // Console logging with clear, readable format
    const logMethod = error.severity === ErrorSeverity.CRITICAL ? 'error' : 
                     error.severity === ErrorSeverity.HIGH ? 'error' : 
                     error.severity === ErrorSeverity.MEDIUM ? 'warn' : 'log';
    
    // Format error message for better visibility
    const errorMessage = error.message || 'Unknown error occurred';
    const contextInfo = error.context?.component ? ` in ${error.context.component}` : '';
    const operationInfo = error.context?.operation ? ` during ${error.context.operation}` : '';
    
    console[logMethod](`🚨 [ErrorHandling] ${error.type}: ${errorMessage}${contextInfo}${operationInfo}`, {
      severity: error.severity,
      userMessage: error.userMessage,
      ...(error.context && Object.keys(error.context).length > 0 && { context: error.context }),
      ...(error.stackTrace && { stackTrace: error.stackTrace }),
      timestamp: new Date(error.timestamp).toISOString()
    });

    // Show user notification for significant errors (async to avoid render-phase updates)
    if (error.severity !== ErrorSeverity.LOW && !error.context?.silent) {
      // Use setTimeout to avoid calling toast during render phase
      setTimeout(() => {
        toast({
          title: error.severity === ErrorSeverity.CRITICAL ? 'Critical Error' : 'Error',
          description: error.userMessage,
          variant: 'destructive',
          duration: error.severity === ErrorSeverity.CRITICAL ? 0 : 5000
        });
      }, 0);
    }
  }

  /**
   * 📊 Get error statistics and health metrics
   */
  public getErrorMetrics(): {
    totalErrors: number;
    errorsByType: Record<ErrorType, number>;
    recentErrors: AppError[];
    activeRetries: number;
    systemHealth: 'good' | 'degraded' | 'poor';
  } {
    const now = Date.now();
    const recentErrors = this.errorLog.filter(e => now - e.timestamp < 300000); // Last 5 minutes
    
    const errorsByType = recentErrors.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {} as Record<ErrorType, number>);

    // Determine system health
    const criticalErrors = recentErrors.filter(e => e.severity === ErrorSeverity.CRITICAL).length;
    const highErrors = recentErrors.filter(e => e.severity === ErrorSeverity.HIGH).length;
    
    let systemHealth: 'good' | 'degraded' | 'poor' = 'good';
    if (criticalErrors > 0 || highErrors > 5) {
      systemHealth = 'poor';
    } else if (highErrors > 2 || recentErrors.length > 10) {
      systemHealth = 'degraded';
    }

    return {
      totalErrors: this.errorLog.length,
      errorsByType,
      recentErrors,
      activeRetries: this.activeRetries.size,
      systemHealth
    };
  }

  /**
   * 🔧 Initialize recovery strategies
   */
  private initializeRecoveryStrategies(): void {
    // Network error recovery
    this.recoveryStrategies.set(ErrorType.NETWORK, async (error) => {
      // Check if we're back online
      if (navigator.onLine) {
        // Wait a bit for connection to stabilize
        await new Promise(resolve => setTimeout(resolve, 1000));
        return true;
      }
      return false;
    });

    // Authentication error recovery
    this.recoveryStrategies.set(ErrorType.AUTHENTICATION, async (error) => {
      try {
        // Try to refresh the session
        const { data, error: refreshError } = await getSupabaseClient().auth.refreshSession();
        return !refreshError && !!data.session;
      } catch {
        return false;
      }
    });

    // Database error recovery
    this.recoveryStrategies.set(ErrorType.DATABASE, async (error) => {
      try {
        // Test database connectivity
        const { error: testError } = await getSupabaseClient()
          .from('spaces')
          .select('count(*)', { count: 'exact', head: true });
        return !testError;
      } catch {
        return false;
      }
    });

    // Space access error recovery
    this.recoveryStrategies.set(ErrorType.SPACE_ACCESS, async (error) => {
      try {
        // Clear space-related cache
        const spaceKeys = Object.keys(localStorage).filter(key => 
          key.includes('space') || key.includes('membership')
        );
        spaceKeys.forEach(key => localStorage.removeItem(key));
        
        // Wait for cache clear to take effect
        await new Promise(resolve => setTimeout(resolve, 500));
        return true;
      } catch {
        return false;
      }
    });
  }

  /**
   * 🎭 Initialize fallback strategies
   */
  private initializeFallbackStrategies(): void {
    this.fallbackStrategies.set(ErrorType.NETWORK, {
      type: 'offline',
      config: { showOfflineIndicator: true }
    });

    this.fallbackStrategies.set(ErrorType.SPACE_ACCESS, {
      type: 'redirect',
      config: { path: '/discover', message: 'Space not accessible' }
    });

    this.fallbackStrategies.set(ErrorType.AUTHENTICATION, {
      type: 'redirect',
      config: { path: '/login', message: 'Please sign in again' }
    });

    this.fallbackStrategies.set(ErrorType.DATABASE, {
      type: 'cache',
      config: { useCachedData: true, showStalenessWarning: true }
    });
  }

  /**
   * 🌐 Setup global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const error = this.classifyError(event.reason, { 
        source: 'unhandledRejection',
        critical: true 
      });
      this.logError(error);
    });

    // JavaScript errors
    window.addEventListener('error', (event) => {
      const error = this.classifyError(event.error, {
        source: 'javascriptError',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
      this.logError(error);
    });
  }

  /**
   * 🧹 Clear error log and reset system
   */
  public reset(): void {
    this.errorLog = [];
    this.activeRetries.clear();
    log.debug('Utils', '🧹 [ErrorHandling] System reset completed');
  }
}

// Export singleton instance
export const errorHandlingSystem = ErrorHandlingSystem.getInstance();

// Convenience functions
export const withRetry = errorHandlingSystem.withRetry.bind(errorHandlingSystem);
export const classifyError = errorHandlingSystem.classifyError.bind(errorHandlingSystem);
export const logError = errorHandlingSystem.logError.bind(errorHandlingSystem);
export const getErrorMetrics = errorHandlingSystem.getErrorMetrics.bind(errorHandlingSystem);

// Add to window for debugging
if (typeof window !== 'undefined') {
  (window as any).errorHandlingSystem = errorHandlingSystem;
} 