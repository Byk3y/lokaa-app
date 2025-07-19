import { log } from '@/utils/logger';
/**
 * 🚀 Quick Space Redirect - PHASE 3 Enhanced with State Management
 * 
 * Integrated with AuthFlowStateManager and NavigationCoordinator for
 * better coordination and elimination of loading state conflicts.
 */

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOptimizedAuth } from '@/contexts/AuthContext';
import { executeFastPath } from '@/utils/simpleFastPath';
import { Loader2 } from 'lucide-react';
import { 
  acquireFastPathLock, 
  releaseFastPathLock, 
  cleanupStaleCoordination,
  isOtherComponentHandlingFastPath 
} from '@/utils/fastPathCoordinator';
import { authFlowStateManager } from '@/utils/authFlowStateManager';
import { navigationCoordinator } from '@/utils/navigationCoordinator';

export default function QuickSpaceRedirect() {
  const { user, loading, fastPathEnabled, lastFastPathResult } = useOptimizedAuth();
  const navigate = useNavigate();
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const executedRef = useRef(false);

  // Helper function to clean up potentially stale cache
  const cleanupStaleCache = () => {
    try {
      const cacheKeys = ['lastActiveSpace', 'lastVisitedSpace', 'lastJoinedSpace'];
      cacheKeys.forEach(key => {
        const cached = localStorage.getItem(key);
        if (cached) {
          try {
            const data = JSON.parse(cached);
            // Remove cache entries older than 1 hour
            if (data.timestamp && (Date.now() - data.timestamp) > 3600000) {
              log.debug('Page', `🧹 [QuickSpaceRedirect] Removing stale cache: ${key}`);
              localStorage.removeItem(key);
            }
          } catch {
            // Invalid JSON, remove it
            localStorage.removeItem(key);
          }
        }
      });
    } catch (error) {
      log.warn('Page', 'Cache cleanup failed:', error);
    }
  };

  useEffect(() => {
    log.debug('Page', '🎯 [Phase 3] QuickSpaceRedirect mounted');
    
    // 🚀 [Phase 3] Update auth flow stage
    authFlowStateManager.updateStage('fast-path', { source: 'QuickSpaceRedirect' });
    
    // Clean up any stale cache that might cause bad redirects
    cleanupStaleCache();
    
    // 🚦 COORDINATION: Clean up stale coordination data
    cleanupStaleCoordination();
    
    // SAFETY: Set up timeout protection (8 seconds max - reduced for better UX)
    timeoutRef.current = setTimeout(() => {
      if (!executedRef.current) {
        log.warn('Page', '🎯 [Phase 3] QuickSpaceRedirect timeout, falling back to discover');
        authFlowStateManager.completeFlow({
          success: false,
          stage: 'error',
          error: 'Timeout'
        });
        setError('Loading took too long. Taking you to discover...');
        setTimeout(() => {
          // 🚀 [Phase 3] Use NavigationCoordinator
          navigationCoordinator.requestNavigation(
            '/discover',
            '/app',
            'QuickSpaceRedirect-timeout',
            { state: { timeout: true } }
          );
        }, 1000);
      }
    }, 8000);
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [navigate]);

  useEffect(() => {
    // If no user and not loading, redirect to landing page
    if (!user && !loading) {
      log.debug('Page', '🎯 [Phase 3] QuickSpaceRedirect no user, redirecting to landing');
      authFlowStateManager.completeFlow({
        success: false,
        stage: 'error',
        error: 'No user'
      });
      executedRef.current = true;
      
      // 🚀 [Phase 3] Use NavigationCoordinator
      navigationCoordinator.requestNavigation(
        '/',
        '/app',
        'QuickSpaceRedirect-nouser'
      );
      return;
    }

    // 🚦 COORDINATION: Check if another component is already handling fast path
    if (user && !redirecting && !error && !executedRef.current) {

      
      // Check if AuthContext or another component is already executing
      if (isOtherComponentHandlingFastPath('QuickSpaceRedirect')) {
        log.debug('Page', '🚦 [Phase 3] QuickSpaceRedirect - another component handling fast path');
        authFlowStateManager.completeFlow({
          success: false,
          stage: 'error',
          error: 'Another component handling'
        });
        executedRef.current = true;
        
        // 🚀 [Phase 3] Use NavigationCoordinator for fallback
        navigationCoordinator.requestNavigation(
          '/discover',
          '/app',
          'QuickSpaceRedirect-conflict'
        );
        return;
      }
      
      log.debug('Page', '🎯 [Phase 3] QuickSpaceRedirect executing coordinated fast path...');
      
      setRedirecting(true);
      executedRef.current = true;
      
      const performCoordinatedFastPathRedirect = async () => {
        // 🚦 STEP 1: Acquire execution lock
        const lockResult = acquireFastPathLock('QuickSpaceRedirect');
        
        if (!lockResult.acquired) {
          log.debug('Page', `🚦 [Phase 3] QuickSpaceRedirect lock failed, ${lockResult.conflictingComponent} is active`);
          authFlowStateManager.completeFlow({
            success: false,
            stage: 'error',
            error: 'Lock acquisition failed'
          });
          
          // 🚀 [Phase 3] Use NavigationCoordinator
          navigationCoordinator.requestNavigation(
            '/discover',
            '/app',
            'QuickSpaceRedirect-lockfailed'
          );
          return;
        }
        
        const executionId = lockResult.executionId!;
        log.debug('Page', `🚦 [Phase 3] QuickSpaceRedirect lock acquired: ${executionId.substr(-9)}`);
        
        try {
          // 🚀 [Phase 3] Update to fast-path execution stage
          authFlowStateManager.updateStage('fast-path', { 
            source: 'QuickSpaceRedirect'
          });
          
          log.debug('Page', '🚀 [Phase 3] QuickSpaceRedirect starting fast path execution...');
          const result = await executeFastPath(user.id, navigate, '/app');
          
          log.debug('Page', `🎯 [Phase 3] QuickSpaceRedirect fast path completed: ${result.strategy} in ${result.timing}ms`);
          
          // 🚦 STEP 2: Release lock with success result
          const success = result.strategy !== 'error';
          releaseFastPathLock(executionId, {
            success,
            redirectedTo: result.redirectUrl,
            strategy: result.strategy
          });
          
          // 🚀 [Phase 3] Complete auth flow with result
          authFlowStateManager.completeFlow({
            success,
            stage: success ? 'complete' : 'error',
            redirectPath: result.redirectUrl,
            executionTime: result.timing,
            source: result.strategy
          });
          
          // Clear timeout since we got a result
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          
          // Handle various result scenarios
          if (result.strategy === 'db-no-spaces' || result.strategy === 'cache-no-spaces') {
            log.debug('Page', '🎯 [Phase 3] QuickSpaceRedirect user has no spaces, redirecting to discover');
            
            // 🚀 [Phase 3] Use NavigationCoordinator
            navigationCoordinator.requestNavigation(
              '/discover',
              '/app',
              'QuickSpaceRedirect-nospaces'
            );
          } else if (result.strategy === 'error') {
            log.error('Page', '🎯 [Phase 3] QuickSpaceRedirect fast path failed, falling back to discover');
            
            // 🚀 [Phase 3] Use NavigationCoordinator
            navigationCoordinator.requestNavigation(
              '/discover',
              '/app',
              'QuickSpaceRedirect-error'
            );
          } else if (result.strategy === 'already-on-destination') {
            log.debug('Page', '🎯 [Phase 3] QuickSpaceRedirect already on destination, redirecting to discover');
            
            // 🚀 [Phase 3] Use NavigationCoordinator
            navigationCoordinator.requestNavigation(
              '/discover',
              '/app',
              'QuickSpaceRedirect-alreadythere'
            );
          }
          // For successful redirects (cache-has-spaces, db-has-spaces), navigation is already handled
          
        } catch (error) {
          log.error('Page', '🎯 [Phase 3] QuickSpaceRedirect fast path execution failed:', error);
          
          // 🚦 STEP 2: Release lock with failure result
          releaseFastPathLock(executionId, {
            success: false,
            strategy: 'error'
          });
          
          // 🚀 [Phase 3] Complete auth flow with error
          authFlowStateManager.completeFlow({
            success: false,
            stage: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          
          // Clear timeout
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          
          setError('Failed to load your spaces. Redirecting to discover...');
          
          // Fallback to discover page after a brief delay
          setTimeout(() => {
            // 🚀 [Phase 3] Use NavigationCoordinator
            navigationCoordinator.requestNavigation(
              '/discover',
              '/app',
              'QuickSpaceRedirect-exception'
            );
          }, 2000);
        }
      };
      
      performCoordinatedFastPathRedirect();
    }
    
    // ENHANCED: Show loading state while still waiting for auth
    if (loading && !user) {
      log.debug('Page', '🎯 [Phase 3] QuickSpaceRedirect waiting for auth completion...');
    }
  }, [user, loading, redirecting, error, navigate]);

  // Show error state if something went wrong
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" data-component="QuickSpaceRedirect">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {error}
          </p>
          <button 
            onClick={cleanupStaleCache}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Simple loading UI - show minimal content since redirect should be very fast
  // Check if mobile
  const isMobile = typeof window !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (isMobile) {
    // Use mobile enhanced loading screen with dynamic import
    const MobileEnhancedLoadingScreen = React.lazy(() => import('@/components/loading/MobileEnhancedLoadingScreen'));
    const message = user ? 'Loading your space...' : 'Authenticating...';
    const submessage = redirecting ? 'Finding your best space...' : 'Getting ready...';
    
    return (
      <React.Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50" data-component="QuickSpaceRedirect">
          <div className="flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600 mb-4" />
            <div className="text-lg font-medium text-gray-900 mb-2">{message}</div>
            <div className="text-sm text-gray-500">{submessage}</div>
          </div>
        </div>
      }>
        <MobileEnhancedLoadingScreen 
          message={message} 
          submessage={submessage}
          showProgress={true} 
        />
      </React.Suspense>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50" data-component="QuickSpaceRedirect">
      <div className="flex flex-col items-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600 mb-4" />
        <div className="text-lg font-medium text-gray-900 mb-2">
          {user ? 'Loading your space...' : 'Authenticating...'}
        </div>
        <div className="text-sm text-gray-500 text-center max-w-md">
          {redirecting ? 'Finding your best space...' : 'Getting ready...'}
          {lastFastPathResult && (
            <div className="mt-2 text-xs text-gray-400">
              Completed in {lastFastPathResult.timing}ms using {lastFastPathResult.strategy}
            </div>
          )}
        </div>
        {redirecting && (
          <div className="mt-3 text-xs text-gray-400">
            This should only take a moment
          </div>
        )}
        {loading && user && (
          <div className="mt-2 text-xs text-gray-400">
            Authentication complete, preparing redirect...
          </div>
        )}
      </div>
    </div>
  );
} 