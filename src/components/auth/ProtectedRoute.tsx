import { log } from '@/utils/logger';
import React, { memo, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useOptimizedAuth } from "@/contexts/AuthContext";
import { useComponentLoading } from "@/utils/authFlowStateManager";


interface ProtectedRouteProps {
  children: React.ReactNode;
}

// 🚀 PERFORMANCE: Memoized component to prevent unnecessary re-renders
const ProtectedRoute = memo(({ children }: ProtectedRouteProps) => {
  const { user, loading, routingInProgress } = useOptimizedAuth();
  const location = useLocation();
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [wasAuthenticated, setWasAuthenticated] = useState(false);

  // 🚀 [Phase 3] Use AuthFlowStateManager for coordinated loading state
  const { shouldShowLoading, authStage, blockComponent, unblockComponent } = useComponentLoading('ProtectedRoute');

  // Track authentication state to prevent loading flashes during navigation
  useEffect(() => {
    if (user && !wasAuthenticated) {
      setWasAuthenticated(true);
      // Block ProtectedRoute loading when user authentication is confirmed
      if (authStage === 'complete' || authStage === 'redirecting') {
        blockComponent();
      }
    }
  }, [user, wasAuthenticated, authStage, blockComponent]);

  // 🚀 [Phase 3] Enhanced fast path detection and component blocking
  useEffect(() => {
    const isOnSpacePage = location.pathname.includes('/space') && location.pathname !== '/app';
    const isOnFastPathRoute = isOnSpacePage || location.pathname.includes('/discover');
    
    if (user && isOnFastPathRoute) {
      // Fast path likely completed - block loading UI
      blockComponent();
      log.debug('Component', '🚀 [Phase 3] ProtectedRoute blocked - fast path detected');
    }
    
    // Unblock when navigating away from fast path routes
    if (!user || (!isOnFastPathRoute && authStage === 'initializing')) {
      unblockComponent();
    }
  }, [user, location.pathname, authStage, blockComponent, unblockComponent]);

  // 🔧 SAFETY: Prevent permanent loading states
  useEffect(() => {
    if (loading || routingInProgress) {
      const timeout = setTimeout(() => {
        log.warn('Component', '⚠️ [ProtectedRoute] Loading state timeout, forcing render');
        setLoadingTimeout(true);
        blockComponent(); // Block after timeout
      }, 1000); // ENHANCED: Reduced to 1000ms for faster recovery

      return () => clearTimeout(timeout);
    } else {
      setLoadingTimeout(false);
    }
  }, [loading, routingInProgress, blockComponent]);

  // 🚀 [Phase 3] Enhanced skip logic using AuthFlowStateManager
  const isOnSpacePage = location.pathname.includes('/space') && location.pathname !== '/app';
  const isOnPublicPage = ['/discover', '/create', '/create-space'].some(page => 
    location.pathname === '/' ? page === '/' : location.pathname.startsWith(page)
  );
  
  // Multiple conditions to skip loading states
  const fastPathInProgress = authStage === 'fast-path' || authStage === 'redirecting';
  const cacheCheckInProgress = authStage === 'checking-cache';
  const fastPathLikelySucceeded = user && isOnSpacePage && !loading;
  const isAuthenticatedUserOnPublicPage = user && isOnPublicPage && wasAuthenticated;
  const isAlreadyAuthenticatedUser = wasAuthenticated && user && !loading;
  
  const shouldSkipLoading = !shouldShowLoading || // AuthFlowStateManager decision
                          fastPathInProgress ||
                          cacheCheckInProgress ||
                          fastPathLikelySucceeded || 
                          isAuthenticatedUserOnPublicPage || 
                          isAlreadyAuthenticatedUser || 
                          loadingTimeout;

  // 🚀 [Phase 3] Enhanced loading decision with AuthFlowStateManager coordination
  if ((loading || routingInProgress) && !shouldSkipLoading) {
    log.debug('Component', `🔐 [Phase 3] ProtectedRoute showing loading - authStage: ${authStage}, shouldShowLoading: ${shouldShowLoading}`);
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {authStage === 'slow-path' ? 'Loading your spaces...' :
             routingInProgress ? 'Redirecting...' : 
             'Verifying your session...'}
          </p>
        </div>
      </div>
    );
  }



  // ✅ CRITICAL FIX: Only redirect when authentication is completely finished
  // This prevents the race condition where we redirect before session restoration completes
  if (!user && !loading && !routingInProgress) {
    log.debug('Component', '🔥 [CRITICAL FIX] ProtectedRoute: Authentication complete, no user found, redirecting to landing page', {
      loading,
      routingInProgress,
      authStage,
      currentPath: location.pathname,
      preventInfiniteLoop: 'This redirect only happens when auth is completely finished'
    });
    return <Navigate to="/" replace />;
  }

  log.debug('Component', '✅ [Phase 3] ProtectedRoute rendering children:', {
    user: user ? 'authenticated' : 'not authenticated',
    userId: user?.id,
    loading,
    routingInProgress,
    currentPath: location.pathname,
    timeout: loadingTimeout,
    authStage,
    shouldShowLoading,
    skipReason: shouldSkipLoading ? 'optimized' : 'none'
  });

  // User is authenticated, render children
  return <>{children}</>;
});

ProtectedRoute.displayName = 'ProtectedRoute';

export default ProtectedRoute;
