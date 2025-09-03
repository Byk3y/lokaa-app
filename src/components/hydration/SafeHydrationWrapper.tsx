import React, { ComponentType, useEffect, useState, useCallback, useMemo } from 'react';
import { log } from '@/utils/logger';
/**
 * 🛡️ Safe Hydration Wrapper
 * 
 * Phase 6B: Safe wrapper components for state hydration with error boundaries
 * and performance monitoring.
 */

import { useSafeStateHydration, useInteractionBasedHydration, useProgressiveHydration } from '@/hooks/useSafeStateHydration';
import { hydrationPerformanceMonitor } from '@/utils/hydrationPerformanceMonitor';

// Hydration configuration
export interface SafeHydrationConfig {
  componentId: string;
  userId: string;
  fallbackState?: any;
  autoSave?: boolean;
  saveInterval?: number;
  sensitiveKeys?: string[];
  debounceMs?: number;
  enablePerformanceTracking?: boolean;
  priority?: 'high' | 'medium' | 'low';
  interactionBased?: boolean;
}

// Wrapper props
export interface SafeHydrationWrapperProps {
  children: React.ReactNode;
  config: SafeHydrationConfig;
  fallback?: React.ReactNode;
  loadingComponent?: React.ReactNode;
  onHydrationComplete?: (success: boolean, state?: any) => void;
  onHydrationError?: (error: string) => void;
}

/**
 * 🛡️ SAFE HYDRATION PROVIDER
 * Provides safe hydration context with error boundaries
 */
export const SafeHydrationProvider: React.FC<SafeHydrationWrapperProps> = ({
  children,
  config,
  fallback,
  loadingComponent,
  onHydrationComplete,
  onHydrationError
}) => {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Choose hydration strategy based on config
  const hydrationResult = useMemo(() => {
    if (config.interactionBased) {
      return useInteractionBasedHydration(
        config.componentId,
        config.userId,
        config.fallbackState,
        {
          autoSave: config.autoSave,
          saveInterval: config.saveInterval,
          sensitiveKeys: config.sensitiveKeys,
          debounceMs: config.debounceMs,
          enablePerformanceTracking: config.enablePerformanceTracking
        }
      );
    } else if (config.priority) {
      return useProgressiveHydration(
        config.componentId,
        config.userId,
        config.priority,
        config.fallbackState,
        {
          autoSave: config.autoSave,
          saveInterval: config.saveInterval,
          sensitiveKeys: config.sensitiveKeys,
          debounceMs: config.debounceMs,
          enablePerformanceTracking: config.enablePerformanceTracking
        }
      );
    } else {
      return useSafeStateHydration(
        config.componentId,
        config.userId,
        config.fallbackState,
        {
          autoSave: config.autoSave,
          saveInterval: config.saveInterval,
          sensitiveKeys: config.sensitiveKeys,
          debounceMs: config.debounceMs,
          enablePerformanceTracking: config.enablePerformanceTracking
        }
      );
    }
  }, [config]);

  const {
    isHydrated,
    isHydrating,
    hydratedState,
    hydrationError,
    saveState,
    clearCache,
    hydrationTime,
    performanceMetrics
  } = hydrationResult;

  // Performance monitoring
  useEffect(() => {
    if (config.enablePerformanceTracking && hydrationTime) {
      hydrationPerformanceMonitor.recordHydration(
        config.componentId,
        config.userId,
        hydrationTime,
        isHydrated && !hydrationError
      );
    }
  }, [config.componentId, config.userId, hydrationTime, isHydrated, hydrationError, config.enablePerformanceTracking]);

  // Callbacks
  useEffect(() => {
    if (isHydrated && onHydrationComplete) {
      onHydrationComplete(true, hydratedState);
    }
  }, [isHydrated, hydratedState, onHydrationComplete]);

  useEffect(() => {
    if (hydrationError && onHydrationError) {
      onHydrationError(hydrationError);
    }
  }, [hydrationError, onHydrationError]);

  // Error boundary
  if (hasError) {
    return (
      <div className="p-4 text-center text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <p className="font-medium">Hydration Error</p>
        <p className="text-sm mt-1">{error?.message || 'An unexpected error occurred'}</p>
        <button
          onClick={() => {
            setHasError(false);
            setError(null);
            clearCache();
          }}
          className="mt-2 px-3 py-1 text-xs bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 rounded hover:bg-red-200 dark:hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  // Show loading component while hydrating
  if (isHydrating && loadingComponent) {
    return <>{loadingComponent}</>;
  }

  // Show fallback if hydration failed and no fallback state
  if (!isHydrated && !config.fallbackState && fallback) {
    return <>{fallback}</>;
  }

  // Provide hydration context
  return (
    <SafeHydrationContext.Provider
      value={{
        isHydrated,
        isHydrating,
        hydratedState,
        hydrationError,
        saveState,
        clearCache,
        hydrationTime,
        performanceMetrics,
        componentId: config.componentId,
        userId: config.userId
      }}
    >
      {children}
    </SafeHydrationContext.Provider>
  );
};

/**
 * 🛡️ SAFE HYDRATION CONTEXT
 */
interface SafeHydrationContextValue {
  isHydrated: boolean;
  isHydrating: boolean;
  hydratedState: any;
  hydrationError: string | null;
  saveState: (state: any) => Promise<boolean>;
  clearCache: () => void;
  hydrationTime?: number;
  performanceMetrics: any;
  componentId: string;
  userId: string;
}

const SafeHydrationContext = React.createContext<SafeHydrationContextValue | null>(null);

export const useSafeHydrationContext = () => {
  const context = React.useContext(SafeHydrationContext);
  if (!context) {
    throw new Error('useSafeHydrationContext must be used within a SafeHydrationProvider');
  }
  return context;
};

/**
 * 🛡️ SAFE HYDRATION BOUNDARY
 * Error boundary for hydration failures
 */
export class SafeHydrationBoundary extends React.Component<
  {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    log.error('SafeHydration', '🚨 [SafeHydrationBoundary] Hydration error:', error, errorInfo);
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 text-center text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="font-medium">Hydration Error</p>
          <p className="text-sm mt-1">{this.state.error?.message || 'An unexpected error occurred'}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="mt-2 px-3 py-1 text-xs bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 rounded hover:bg-red-200 dark:hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * 🛡️ WITH SAFE HYDRATION HOC
 * Higher-order component that adds safe hydration capabilities
 */
export function withSafeHydration<P extends object>(
  Component: ComponentType<P>,
  config: Omit<SafeHydrationConfig, 'componentId' | 'userId'>
) {
  const WrappedComponent = (props: P & { componentId: string; userId: string }) => {
    const { componentId, userId, ...componentProps } = props;
    
    const hydrationConfig: SafeHydrationConfig = {
      ...config,
      componentId,
      userId
    };

    return (
      <SafeHydrationBoundary
        fallback={
          <div className="p-4 text-center text-gray-500">
            <p>Failed to restore component state. Please refresh the page.</p>
          </div>
        }
        onError={(error) => {
          log.error('SafeHydration', `🚨 [withSafeHydration] Error in ${componentId}:`, error);
        }}
      >
        <SafeHydrationProvider
          config={hydrationConfig}
          loadingComponent={
            <div className="p-4 text-center text-gray-500">
              <p>Restoring component state...</p>
            </div>
          }
        >
          <Component {...(componentProps as P)} />
        </SafeHydrationProvider>
      </SafeHydrationBoundary>
    );
  };

  WrappedComponent.displayName = `withSafeHydration(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

/**
 * 📊 HYDRATION STATUS INDICATOR
 * Safe status indicator for development
 */
export const SafeHydrationIndicator: React.FC<{
  isHydrated: boolean;
  isHydrating: boolean;
  hydrationTime?: number;
  error?: string | null;
  performanceMetrics?: any;
  className?: string;
}> = ({
  isHydrated,
  isHydrating,
  hydrationTime,
  error,
  performanceMetrics,
  className = ''
}) => {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className={`fixed top-4 right-4 z-50 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-3 border border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="flex items-center space-x-2">
        {isHydrating && (
          <>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600 dark:text-gray-300">Hydrating...</span>
          </>
        )}
        {isHydrated && !isHydrating && !error && (
          <>
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Hydrated ({hydrationTime}ms)
            </span>
          </>
        )}
        {error && (
          <>
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-sm text-red-600 dark:text-red-400">
              Error: {error}
            </span>
          </>
        )}
      </div>
      
      {performanceMetrics && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          <div>Saves: {performanceMetrics.saveCount}</div>
          <div>Errors: {performanceMetrics.errorCount}</div>
          <div>Score: {performanceMetrics.performanceScore?.toFixed(1) || 'N/A'}</div>
        </div>
      )}
    </div>
  );
};

export default SafeHydrationProvider;
