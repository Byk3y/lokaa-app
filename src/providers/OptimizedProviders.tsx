import React, { memo, useRef, useEffect, useMemo, useCallback, Component, ErrorInfo } from 'react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter as Router } from 'react-router-dom';
import { useCleanupTracker } from '../hooks/useCleanupTracker';
import performanceMonitor from '../utils/performanceMonitor';
import { pageVisibilityManager } from '../utils/pageVisibilityManager';
import { phase6BundleOptimizer } from '../utils/phase6BundleOptimizer';
import { mobileOptimizationLayer } from '../utils/mobileOptimizationLayer';

// Import your existing providers
import { AuthProvider } from '../contexts/AuthContext';
import { SpaceProvider } from '../contexts/SpaceContext';
import { UserProfileProvider } from '../contexts/UserProfileContext';
import { GlobalPresenceProvider } from '../providers/GlobalPresenceProvider';
import { MembershipProvider } from '../contexts/MembershipContext';
import { ProfileImageProvider } from '../contexts/ProfileImageContext';
import ModalProvider from '../shared/components/modals/ModalProvider';
import { SupabaseProvider } from '../contexts/SupabaseContext';

// FIXED: Create optimized query client with reduced overhead
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

interface OptimizedProviderProps {
  children: React.ReactNode;
}

/**
 * FIXED: Optimize provider performance with better memoization
 */
const MemoizedAuthProvider = React.memo(({ children }: { children: React.ReactNode }) => {
  const mountTime = useRef(Date.now());
  
  useEffect(() => {
    console.log('[MemoizedAuthProvider] Mounted with optimized cleanup tracking');
    return () => {
      console.log('[MemoizedAuthProvider] Unmounted after', Date.now() - mountTime.current, 'ms');
    };
  }, []); // FIXED: Empty dependency array to prevent unnecessary remounts
  
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
});

/**
 * FIXED: Minimal Space Provider wrapper - removed excessive monitoring
 */
const MemoizedSpaceProvider = memo(function MemoizedSpaceProvider({ 
  children 
}: OptimizedProviderProps) {
  // FIXED: Removed cleanup tracker to reduce overhead
  
  // FIXED: Minimal logging
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[MemoizedSpaceProvider] Mounted');
    }
  }, []);
  
  return <SpaceProvider>{children}</SpaceProvider>;
});

/**
 * FIXED: Minimal Presence Provider wrapper - removed excessive monitoring
 */
const MemoizedPresenceProvider = memo(function MemoizedPresenceProvider({ 
  children 
}: OptimizedProviderProps) {
  // FIXED: Removed cleanup tracker to reduce overhead
  
  // FIXED: Minimal logging
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[MemoizedPresenceProvider] Mounted');
    }
  }, []);
  
  return <GlobalPresenceProvider>{children}</GlobalPresenceProvider>;
});

/**
 * FIXED: Optimized Query Client Provider with reduced monitoring overhead
 */
const OptimizedQueryProvider = memo(function OptimizedQueryProvider({ 
  children 
}: OptimizedProviderProps) {
  // FIXED: Reduced cleanup tracking overhead
  
  // Stable query client reference to prevent provider re-renders
  const stableQueryClient = useMemo(() => queryClient, []);
  
  useEffect(() => {
    console.log('[OptimizedQueryProvider] Mounted with stable client');
    // FIXED: Removed expensive cleanup subscription tracking
  }, []);
  
  return (
    <QueryClientProvider client={stableQueryClient}>
      {children}
    </QueryClientProvider>
  );
});

/**
 * FIXED: Router Provider with minimal overhead
 */
const OptimizedRouterProvider = memo(function OptimizedRouterProvider({ 
  children 
}: OptimizedProviderProps) {
  // FIXED: Removed cleanup tracker
  
  // Stable router configuration
  const routerConfig = useMemo(() => ({
    future: { 
      v7_startTransition: true, 
      v7_relativeSplatPath: true 
    }
  }), []);
  
  return (
    <Router {...routerConfig}>
      {children}
    </Router>
  );
});

/**
 * FIXED: Performance-optimized provider tree with minimal monitoring
 */
export const OptimizedProviderTree = memo(function OptimizedProviderTree({ 
  children 
}: OptimizedProviderProps) {
  // Initialize PageVisibilityManager early
  useEffect(() => {
    pageVisibilityManager.initialize();
    console.log('🔋 [OptimizedProviders] PageVisibilityManager initialized');
    
    return () => {
      pageVisibilityManager.destroy();
    };
  }, []);

  // 🚀 Phase 6: Initialize consolidated systems
  useEffect(() => {
    const initializePhase6Systems = async () => {
      try {
        // Initialize mobile optimization layer if on mobile
        const { mobileOptimizationLayer } = await import('../utils/mobileOptimizationLayer');
        if (mobileOptimizationLayer.getCapabilities().isMobile) {
          mobileOptimizationLayer.initialize();
        }

        // Initialize mobile validation for debugging (dev only, mobile devices only)
        if (import.meta.env?.DEV && mobileOptimizationLayer.getCapabilities().isMobile) {
          await import('../utils/mobileConsoleValidation');
        }

        // Initialize bundle optimizer
        const { phase6BundleOptimizer } = await import('../utils/phase6BundleOptimizer');
        
        // Mark performance monitor as consolidated
        if ((window as any).phase6PerformanceConsolidated) {
          phase6BundleOptimizer.markSystemConsolidated(
            'performanceMonitor + realtimePerformanceMonitor + hmrMonitor',
            'UnifiedPerformanceMonitor'
          );
        }

        // Mark mobile systems as consolidated if available
        if ((window as any).phase6MobileConsolidated) {
          phase6BundleOptimizer.markSystemConsolidated(
            '7 mobile utilities',
            'MobileOptimizationLayer'
          );
        }

        console.log('🚀 [Phase6] Consolidated systems initialized');
        
      } catch (error) {
        console.warn('⚠️ [Phase6] System initialization failed:', error);
      }
    };

    // Delay initialization to avoid blocking initial render
    setTimeout(initializePhase6Systems, 500);
  }, []);
  
  // FIXED: Reduced performance monitoring overhead
  const renderCount = useRef(0);
  const lastRenderTime = useRef(performance.now());
  
  // FIXED: Minimal tracking with reduced frequency
  useEffect(() => {
    renderCount.current++;
    const now = performance.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    lastRenderTime.current = now;
    
    // FIXED: Only log every 10th render to reduce noise (was every 5th)
    if (process.env.NODE_ENV === 'development' && renderCount.current % 10 === 0) {
      console.log(`[OptimizedProviderTree] Render #${renderCount.current} (${timeSinceLastRender.toFixed(2)}ms since last)`);
    }
    
    // FIXED: Only warn on truly rapid re-renders (reduced threshold)
    if (renderCount.current > 1 && timeSinceLastRender < 30) {
      console.warn(`[OptimizedProviderTree] 🚨 Very rapid re-render detected! ${timeSinceLastRender.toFixed(2)}ms`);
      // FIXED: Removed expensive performance metric recording
    }
  });
  
  // FIXED: Direct JSX return without useMemo to prevent children dependency issues
  return (
    <OptimizedQueryProvider>
      <HelmetProvider>
        <OptimizedRouterProvider>
          <ModalProvider>
            <MemoizedAuthProvider>
              <ProfileImageProvider>
                <MemoizedSpaceProvider>
                  <MembershipProvider>
                    <UserProfileProvider>
                      <MemoizedPresenceProvider>
                        <SupabaseProvider>
                          {children}
                        </SupabaseProvider>
                      </MemoizedPresenceProvider>
                    </UserProfileProvider>
                  </MembershipProvider>
                </MemoizedSpaceProvider>
              </ProfileImageProvider>
            </MemoizedAuthProvider>
          </ModalProvider>
        </OptimizedRouterProvider>
      </HelmetProvider>
    </OptimizedQueryProvider>
  );
});

/**
 * FIXED: Simplified performance tracking for providers (reduced overhead)
 */
export function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  const WrappedComponent = memo(function PerformanceTrackedComponent(props: P) {
    // FIXED: Removed heavy cleanup tracking
    
    // FIXED: Minimal performance tracking only in development
    useEffect(() => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[${componentName}] Mounted`);
      }
    }, []);
    
    return <Component {...props} />;
  });
  
  WrappedComponent.displayName = `withPerformanceTracking(${componentName})`;
  return WrappedComponent;
}

/**
 * FIXED: Lightweight provider performance hook - named function for Fast Refresh compatibility
 */
export function useProviderPerformance() {
  const getProviderMetrics = useCallback(() => {
    // FIXED: Simplified metrics to reduce overhead
    const health = performanceMonitor.getSystemHealth();
    
    return {
      health,
      simplified: true,
      report: 'Performance monitoring simplified for better performance'
    };
  }, []);
  
  const logPerformanceReport = useCallback(() => {
    console.log('Provider performance monitoring simplified for optimal performance');
  }, []);
  
  return {
    getProviderMetrics,
    logPerformanceReport
  };
}

/**
 * FIXED: Simplified development helper
 */
if (process.env.NODE_ENV === 'development') {
  // FIXED: Lightweight global provider monitoring
  (window as any).getProviderPerformance = () => {
    return {
      message: 'Provider performance monitoring simplified',
      status: 'optimized',
      renderCount: 'tracking simplified'
    };
  };
  
  console.log('🔧 Provider debugging tools available:');
  console.log('- window.getProviderPerformance()');
}

// Module Error Boundary for handling lazy loading failures
interface ModuleErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

class ModuleErrorBoundary extends Component<{ children: React.ReactNode }, ModuleErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<ModuleErrorBoundaryState> {
    // Check if this is a module import error
    const isModuleError = (
      error.message?.includes('Importing a module script failed') ||
      error.message?.includes('Loading chunk') ||
      error.message?.includes('Failed to fetch') ||
      error.name === 'ChunkLoadError'
    );

    if (isModuleError) {
      console.error('🚨 [ModuleErrorBoundary] Caught module import error:', error);
      return { hasError: true, error };
    }

    // For other errors, let them bubble up
    throw error;
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 [ModuleErrorBoundary] Module error details:', { error, errorInfo });
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Module Loading Error</h2>
            <p className="text-gray-600 mb-4">
              A component failed to load. This usually happens during development.
            </p>
            <div className="flex gap-3 justify-center">
              <button 
                onClick={this.handleRetry}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                disabled={this.state.retryCount >= 3}
              >
                🔄 Retry {this.state.retryCount > 0 && `(${this.state.retryCount}/3)`}
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                ↻ Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
} 