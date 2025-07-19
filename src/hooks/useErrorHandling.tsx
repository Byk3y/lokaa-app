import { log } from '@/utils/logger';
/**
 * 🪝 useErrorHandling Hook - Phase 4 Error Handling
 * 
 * React hook that provides easy access to the error handling system
 * Includes error reporting, retry logic, and recovery mechanisms
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  errorHandlingSystem, 
  withRetry, 
  classifyError, 
  logError,
  getErrorMetrics,
  type AppError, 
  type ErrorType,
  type RetryConfig 
} from '@/utils/errorHandlingSystem';
import { toast } from '@/hooks/use-toast';

interface UseErrorHandlingOptions {
  component?: string;
  autoReport?: boolean;
  showToasts?: boolean;
  onError?: (error: AppError) => void;
}

interface UseErrorHandlingReturn {
  // Error reporting
  reportError: (error: any, context?: Record<string, any>) => AppError;
  
  // Retry functionality
  executeWithRetry: <T>(
    operation: () => Promise<T>,
    context?: Record<string, any>,
    retryConfig?: Partial<RetryConfig>
  ) => Promise<T>;
  
  // Recovery
  attemptRecovery: (error: AppError) => Promise<boolean>;
  
  // Error metrics
  getMetrics: () => ReturnType<typeof getErrorMetrics>;
  
  // Navigation helpers
  safeNavigate: (path: string, fallback?: string) => void;
  handleCriticalError: (error: AppError) => void;
  
  // State
  isRecovering: boolean;
  systemHealth: 'good' | 'degraded' | 'poor';
}

export const useErrorHandling = (options: UseErrorHandlingOptions = {}): UseErrorHandlingReturn => {
  const {
    component = 'UnknownComponent',
    autoReport = true,
    showToasts = true,
    onError
  } = options;

  const navigate = useNavigate();
  const [isRecovering, setIsRecovering] = useState(false);
  const [systemHealth, setSystemHealth] = useState<'good' | 'degraded' | 'poor'>('good');

  // Update system health periodically
  useEffect(() => {
    const updateHealth = () => {
      const metrics = getErrorMetrics();
      setSystemHealth(metrics.systemHealth);
    };

    updateHealth();
    const interval = setInterval(updateHealth, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const reportError = useCallback((error: any, context: Record<string, any> = {}): AppError => {
    const appError = classifyError(error, {
      component,
      ...context,
      reportedViaHook: true
    });

    if (autoReport) {
      logError(appError);
    }

    onError?.(appError);

    return appError;
  }, [component, autoReport, onError]);

  const executeWithRetry = useCallback(
    async <T,>(
      operation: () => Promise<T>,
      context: Record<string, any> = {},
      retryConfig?: Partial<RetryConfig>
    ): Promise<T> => {
      try {
        return await withRetry(operation, {
          component,
          ...context
        }, retryConfig);
      } catch (error) {
        const appError = reportError(error, context);
        throw appError;
      }
    }, 
    [component, reportError]
  );

  const attemptRecovery = useCallback(async (error: AppError): Promise<boolean> => {
    setIsRecovering(true);
    
    try {
      const recovered = await errorHandlingSystem.attemptRecovery(error);
      
      if (recovered && showToasts) {
        toast({
          title: "Recovery Successful",
          description: "The issue has been resolved automatically",
          variant: "default"
        });
      } else if (!recovered && showToasts) {
        toast({
          title: "Recovery Failed",
          description: "Unable to automatically resolve the issue",
          variant: "destructive"
        });
      }
      
      return recovered;
    } catch (recoveryError) {
      log.error('Hook', 'Recovery attempt failed:', recoveryError);
      return false;
    } finally {
      setIsRecovering(false);
    }
  }, [showToasts]);

  const safeNavigate = useCallback((path: string, fallback: string = '/'): void => {
    try {
      navigate(path);
    } catch (error) {
      log.error('Hook', 'Navigation failed, using fallback:', error);
      reportError(error, { 
        operation: 'navigation',
        targetPath: path,
        fallbackPath: fallback 
      });
      
      // Try fallback navigation
      try {
        navigate(fallback);
      } catch (fallbackError) {
        log.error('Hook', 'Fallback navigation also failed:', fallbackError);
        // Last resort: hard redirect
        window.location.href = fallback;
      }
    }
  }, [navigate, reportError]);

  const handleCriticalError = useCallback((error: AppError): void => {
    log.error('Hook', '🚨 Critical error handled by useErrorHandling:', error);
    
    // For critical errors, we need immediate action
    if (showToasts) {
      toast({
        title: "Critical Error",
        description: "A serious error occurred. The page will be reloaded.",
        variant: "destructive",
        duration: 0 // Don't auto-dismiss
      });
    }

    // Try to recover first
    attemptRecovery(error).then(recovered => {
      if (!recovered) {
        // Recovery failed, force reload after a delay
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      }
    });
  }, [showToasts, attemptRecovery]);

  const getMetrics = useCallback(() => {
    return getErrorMetrics();
  }, []);

  return {
    reportError,
    executeWithRetry,
    attemptRecovery,
    getMetrics,
    safeNavigate,
    handleCriticalError,
    isRecovering,
    systemHealth
  };
};

// Convenience hook for specific error types
export const useNetworkErrorHandling = () => {
  return useErrorHandling({
    component: 'NetworkOperations',
    autoReport: true,
    showToasts: true
  });
};

export const useSpaceErrorHandling = () => {
  return useErrorHandling({
    component: 'SpaceOperations',
    autoReport: true,
    showToasts: true
  });
};

export const useAuthErrorHandling = () => {
  return useErrorHandling({
    component: 'AuthOperations',
    autoReport: true,
    showToasts: false // Auth errors often handled specially
  });
};

export default useErrorHandling; 