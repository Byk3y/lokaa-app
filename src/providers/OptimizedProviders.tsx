import { log } from '@/utils/logger';
import React, { memo, useRef, useEffect, useMemo, useCallback } from 'react';
import { ModuleErrorBoundary } from '../components/errors/ModuleErrorBoundary';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter as Router } from 'react-router-dom';
import { useCleanupTracker } from '../hooks/useCleanupTracker';
import performanceMonitor from '../utils/performanceMonitor';
// DISABLED: All mobile systems completely disabled for bfcache optimization
// import { pageVisibilityManager } from '../utils/pageVisibilityManager';
// DISABLED: All mobile optimization completely disabled for bfcache optimization
// import { mobileOptimizationLayer } from '../utils/mobileOptimizationLayer';

// Import your existing providers
import { AuthProvider } from '../contexts/AuthContext';
import { SpaceProvider } from '../contexts/SpaceContext';
import { UserProfileProvider } from '../contexts/UserProfileContext';
import { GlobalPresenceProvider } from '../providers/GlobalPresenceProvider';
import { MembershipProvider } from '../contexts/MembershipContext';
import { ProfileImageProvider } from '../contexts/ProfileImageContext';
import ModalProvider from '../shared/components/modals/ModalProvider';
import { SupabaseProvider } from '../contexts/SupabaseContext';
import { TabVisibilityProvider } from '../contexts/TabVisibilityContext';
import { SearchProvider } from '../contexts/SearchContext';

// Comment cache system removed - using simplified course cache

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

// Comment cache initialization removed - using simplified cache system

interface OptimizedProviderProps {
  children: React.ReactNode;
}

/**
 * FIXED: Optimize provider performance with better memoization
 */
const MemoizedAuthProvider = React.memo(({ children }: { children: React.ReactNode }) => {
  const mountTime = useRef(Date.now());
  
  useEffect(() => {
    log.debug('App', '[MemoizedAuthProvider] Mounted with optimized cleanup tracking');
    return () => {
      log.debug('App', '[MemoizedAuthProvider] Unmounted after', Date.now() - mountTime.current, 'ms');
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
      log.debug('App', '[MemoizedSpaceProvider] Mounted');
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
      log.debug('App', '[MemoizedPresenceProvider] Mounted');
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
    log.debug('App', '[OptimizedQueryProvider] Mounted with stable client');
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
    const initializeSystems = async () => {
      // CHECK FOR ULTRA AGGRESSIVE DISABLE FLAGS
      if ((window as any).__DISABLE_ALL_MOBILE_SYSTEMS__) {
        log.debug('App', '🚨 [OptimizedProviders] UltraKiller flags detected - ALL mobile systems disabled');
        return;
      }
      
      // DISABLED: All mobile optimization systems for bfcache compatibility
      // Complex mobile systems prevent browser's native Back/Forward Cache optimization
      log.debug('App', '📱 [OptimizedProviders] All mobile systems disabled for bfcache optimization');
      log.debug('App', '📱 [OptimizedProviders] Bundle optimizer disabled for bfcache optimization');
      log.debug('App', '📱 [OptimizedProviders] Phase 6 systems disabled for bfcache optimization');
      
      // bfcache works best with minimal JavaScript intervention
      log.debug('App', '🚀 [OptimizedProviders] PWA + bfcache optimization active');
    };
    
    initializeSystems().catch(err => log.error('App', 'Failed to initialize systems:', err));
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
      log.debug('App', `[OptimizedProviderTree] Render #${renderCount.current} (${timeSinceLastRender.toFixed(2)}ms since last)`);
    }
    
    // FIXED: Only warn on truly rapid re-renders (reduced threshold)
    if (renderCount.current > 1 && timeSinceLastRender < 30) {
      log.warn('App', `[OptimizedProviderTree] 🚨 Very rapid re-render detected! ${timeSinceLastRender.toFixed(2)}ms`);
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
                <SearchProvider>
                  <MemoizedSpaceProvider>
                    <TabVisibilityProvider>
                      <MembershipProvider>
                        <UserProfileProvider>
                          <MemoizedPresenceProvider>
                            <SupabaseProvider>
                              {children}
                            </SupabaseProvider>
                          </MemoizedPresenceProvider>
                        </UserProfileProvider>
                      </MembershipProvider>
                    </TabVisibilityProvider>
                  </MemoizedSpaceProvider>
                </SearchProvider>
              </ProfileImageProvider>
            </MemoizedAuthProvider>
          </ModalProvider>
        </OptimizedRouterProvider>
      </HelmetProvider>
    </OptimizedQueryProvider>
  );
});

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
  
  log.debug('App', '🔧 Provider debugging tools available:');
  log.debug('App', '- window.getProviderPerformance()');
}

 