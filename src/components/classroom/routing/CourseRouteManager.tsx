import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
// Using console.log for consistency with other classroom components
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSpace } from '@/contexts/SpaceContext';
import { useCourseNavigation } from '@/hooks/classroom/useCourseNavigation';
import type { 
  CourseModule, 
  CourseLesson, 
  CourseDetailData,
  RouteState,
  RouteOperation,
  RouteError,
  CourseRouteManagerProps
} from '@/types/classroom/courseDetail';

export const CourseRouteManager: React.FC<CourseRouteManagerProps> = React.memo(({
  children,
  onRouteChange,
  onRouteError,
  enableAnalytics = true,
  enableCaching = true,
  enableRateLimiting = true
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { subdomain } = useParams<{ subdomain: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const { user } = useAuth();
  const { space } = useSpace();
  
  // Route state management
  const [routeState, setRouteState] = useState<RouteState>({
    currentRoute: location.pathname,
    navigationHistory: [],
    breadcrumbs: []
  });
  
  // Rate limiting and navigation queue
  const [navigationQueue, setNavigationQueue] = useState<RouteOperation[]>([]);
  const [isNavigating, setIsNavigating] = useState(false);
  const [lastNavigationTime, setLastNavigationTime] = useState(0);
  
  // Error handling
  const [routeErrors, setRouteErrors] = useState<RouteError[]>([]);
  const [recoveryMode, setRecoveryMode] = useState(false);
  
  // Refs for stable callbacks
  const routeStateRef = useRef(routeState);
  const navigationQueueRef = useRef(navigationQueue);
  const lastNavigationTimeRef = useRef(lastNavigationTime);
  
  // Constants
  const RATE_LIMIT_DELAY = 100; // 100ms between navigations
  const MAX_HISTORY_SIZE = 50;
  const MAX_ERRORS = 10;
  
  // Update refs when state changes
  useEffect(() => {
    routeStateRef.current = routeState;
  }, [routeState]);
  
  useEffect(() => {
    navigationQueueRef.current = navigationQueue;
  }, [navigationQueue]);
  
  useEffect(() => {
    lastNavigationTimeRef.current = lastNavigationTime;
  }, [lastNavigationTime]);
  
  // Rate limiting check
  const checkRateLimit = useCallback((): boolean => {
    if (!enableRateLimiting) return true;
    
    const now = Date.now();
    const timeSinceLastNav = now - lastNavigationTimeRef.current;
    
    if (timeSinceLastNav < RATE_LIMIT_DELAY) {
      const error: RouteError = {
        type: 'rate_limit',
        message: `Navigation rate limit exceeded. Please wait ${RATE_LIMIT_DELAY - timeSinceLastNav}ms`,
        timestamp: now,
        recoverable: true
      };
      
      setRouteErrors(prev => [...prev.slice(-MAX_ERRORS + 1), error]);
      onRouteError?.(error);
      
      console.log('🚫 [CourseRouteManager] Rate limit exceeded', {
        timeSinceLastNav,
        rateLimitDelay: RATE_LIMIT_DELAY
      });
      
      return false;
    }
    
    return true;
  }, [enableRateLimiting, onRouteError]);
  
  // Duplicate route check
  const checkDuplicateRoute = useCallback((path: string): boolean => {
    const currentPath = routeStateRef.current.currentRoute;
    
    if (path === currentPath) {
      const error: RouteError = {
        type: 'duplicate',
        message: `Duplicate navigation to ${path}`,
        timestamp: Date.now(),
        recoverable: true
      };
      
      setRouteErrors(prev => [...prev.slice(-MAX_ERRORS + 1), error]);
      onRouteError?.(error);
      
      console.log('🔄 [CourseRouteManager] Duplicate route detected', { path, currentPath });
      return false;
    }
    
    return true;
  }, [onRouteError]);
  
  // Permission validation
  const validateRoutePermission = useCallback((path: string): boolean => {
    if (!user || !space) {
      const error: RouteError = {
        type: 'permission',
        message: 'User or space not available for route validation',
        timestamp: Date.now(),
        recoverable: false
      };
      
      setRouteErrors(prev => [...prev.slice(-MAX_ERRORS + 1), error]);
      onRouteError?.(error);
      return false;
    }
    
    // Add specific permission checks here
    // For now, allow all routes
    return true;
  }, [user, space, onRouteError]);
  
  // Route validation
  const validateRoute = useCallback((path: string): boolean => {
    // Basic path validation
    if (!path || typeof path !== 'string') {
      const error: RouteError = {
        type: 'validation',
        message: 'Invalid route path',
        timestamp: Date.now(),
        recoverable: false
      };
      
      setRouteErrors(prev => [...prev.slice(-MAX_ERRORS + 1), error]);
      onRouteError?.(error);
      return false;
    }
    
    // Check for malformed URLs
    if (path.includes('//') || path.includes('/space/space')) {
      const error: RouteError = {
        type: 'validation',
        message: 'Malformed route path detected',
        timestamp: Date.now(),
        recoverable: true
      };
      
      setRouteErrors(prev => [...prev.slice(-MAX_ERRORS + 1), error]);
      onRouteError?.(error);
      return false;
    }
    
    return true;
  }, [onRouteError]);
  
  // Unified navigation function
  const navigateToRoute = useCallback(async (
    path: string, 
    options: { 
      replace?: boolean; 
      metadata?: Record<string, any>;
      skipValidation?: boolean;
    } = {}
  ): Promise<boolean> => {
    const { replace = false, metadata = {}, skipValidation = false } = options;
    
    try {
      // Validation checks
      if (!skipValidation) {
        if (!checkRateLimit()) return false;
        if (!checkDuplicateRoute(path)) return false;
        if (!validateRoute(path)) return false;
        if (!validateRoutePermission(path)) return false;
      }
      
      // Add to navigation queue
      const operation: RouteOperation = {
        type: replace ? 'replace' : 'navigate',
        path,
        timestamp: Date.now(),
        metadata
      };
      
      setNavigationQueue(prev => [...prev, operation]);
      setIsNavigating(true);
      setLastNavigationTime(Date.now());
      
      // Analytics tracking
      if (enableAnalytics) {
        log('📊 [CourseRouteManager] Navigation analytics', {
          path,
          replace,
          metadata,
          timestamp: operation.timestamp
        });
      }
      
      // Perform navigation
      if (replace) {
        navigate(path, { replace: true });
      } else {
        navigate(path);
      }
      
      // Update route state
      setRouteState(prev => ({
        ...prev,
        currentRoute: path,
        navigationHistory: [...prev.navigationHistory, prev.currentRoute].slice(-MAX_HISTORY_SIZE),
        breadcrumbs: generateBreadcrumbs(path)
      }));
      
      // Cache route if enabled
      if (enableCaching) {
        cacheRoute(path, metadata);
      }
      
      // Notify parent component
      onRouteChange?.(path);
      
      log('✅ [CourseRouteManager] Navigation successful', {
        path,
        replace,
        metadata
      });
      
      return true;
      
    } catch (error) {
      const routeError: RouteError = {
        type: 'network',
        message: `Navigation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
        recoverable: true
      };
      
      setRouteErrors(prev => [...prev.slice(-MAX_ERRORS + 1), routeError]);
      onRouteError?.(routeError);
      
      log('❌ [CourseRouteManager] Navigation failed', {
        path,
        error: error instanceof Error ? error.message : error
      });
      
      return false;
    } finally {
      setIsNavigating(false);
    }
  }, [
    checkRateLimit,
    checkDuplicateRoute,
    validateRoute,
    validateRoutePermission,
    navigate,
    enableAnalytics,
    enableCaching,
    onRouteChange,
    onRouteError
  ]);
  
  // Generate breadcrumbs
  const generateBreadcrumbs = useCallback((path: string): Array<{ label: string; path: string }> => {
    const segments = path.split('/').filter(Boolean);
    const breadcrumbs: Array<{ label: string; path: string }> = [];
    
    let currentPath = '';
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      // Generate human-readable labels
      let label = segment;
      if (segment === 'space') label = 'Space';
      else if (segment === 'classroom') label = 'Classroom';
      else if (segment === 'course') label = 'Course';
      else if (segment === 'lesson') label = 'Lesson';
      else if (segment === 'module') label = 'Module';
      
      breadcrumbs.push({ label, path: currentPath });
    });
    
    return breadcrumbs;
  }, []);
  
  // Cache route information
  const cacheRoute = useCallback((path: string, metadata: Record<string, any>) => {
    try {
      const routeCache = {
        path,
        metadata,
        timestamp: Date.now(),
        user: user?.id,
        space: space?.id
      };
      
      localStorage.setItem(`route_cache_${path}`, JSON.stringify(routeCache));
      
      log('💾 [CourseRouteManager] Route cached', { path, metadata });
    } catch (error) {
      log('⚠️ [CourseRouteManager] Failed to cache route', { path, error });
    }
  }, [user?.id, space?.id]);
  
  // Get cached route
  const getCachedRoute = useCallback((path: string) => {
    try {
      const cached = localStorage.getItem(`route_cache_${path}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      log('⚠️ [CourseRouteManager] Failed to get cached route', { path, error });
      return null;
    }
  }, []);
  
  // Navigation history management
  const goBack = useCallback(() => {
    const history = routeStateRef.current.navigationHistory;
    if (history.length > 0) {
      const previousRoute = history[history.length - 1];
      navigateToRoute(previousRoute, { replace: true });
    }
  }, [navigateToRoute]);
  
  const goForward = useCallback(() => {
    // Implementation for forward navigation
    log('🔄 [CourseRouteManager] Forward navigation not implemented yet');
  }, []);
  
  // Course-specific navigation
  const navigateToCourse = useCallback((courseId: string) => {
    const path = `/${subdomain}/space/classroom/${courseId}`;
    return navigateToRoute(path, {
      metadata: { type: 'course', courseId }
    });
  }, [subdomain, navigateToRoute]);
  
  const navigateToLesson = useCallback((courseId: string, lessonId: string) => {
    const path = `/${subdomain}/space/classroom/${courseId}/${lessonId}`;
    return navigateToRoute(path, {
      metadata: { type: 'lesson', courseId, lessonId }
    });
  }, [subdomain, navigateToRoute]);
  
  const navigateToModule = useCallback((courseId: string, moduleId: string) => {
    const path = `/${subdomain}/space/classroom/${courseId}/module/${moduleId}`;
    return navigateToRoute(path, {
      metadata: { type: 'module', courseId, moduleId }
    });
  }, [subdomain, navigateToRoute]);
  
  // Error recovery
  const recoverFromError = useCallback((error: RouteError) => {
    if (!error.recoverable) {
      log('❌ [CourseRouteManager] Non-recoverable error', { error });
      return false;
    }
    
    setRecoveryMode(true);
    
    try {
      // Attempt recovery based on error type
      switch (error.type) {
        case 'rate_limit':
          // Wait and retry
          setTimeout(() => {
            setRecoveryMode(false);
          }, RATE_LIMIT_DELAY);
          break;
          
        case 'duplicate':
          // Clear duplicate and continue
          setRecoveryMode(false);
          break;
          
        case 'validation':
          // Try to fix malformed URL
          const fixedPath = routeStateRef.current.currentRoute.replace(/\/space\/space/g, '/space');
          if (fixedPath !== routeStateRef.current.currentRoute) {
            navigateToRoute(fixedPath, { replace: true, skipValidation: true });
          }
          setRecoveryMode(false);
          break;
          
        default:
          setRecoveryMode(false);
          break;
      }
      
      log('🔄 [CourseRouteManager] Error recovery attempted', { error });
      return true;
      
    } catch (recoveryError) {
      log('❌ [CourseRouteManager] Error recovery failed', { error, recoveryError });
      setRecoveryMode(false);
      return false;
    }
  }, [navigateToRoute]);
  
  // Clear errors
  const clearErrors = useCallback(() => {
    setRouteErrors([]);
  }, []);
  
  // Get current route info
  const getCurrentRoute = useCallback(() => {
    return routeStateRef.current.currentRoute;
  }, []);
  
  const getRouteParams = useCallback(() => {
    return {
      subdomain,
      searchParams: Object.fromEntries(searchParams.entries())
    };
  }, [subdomain, searchParams]);
  
  const getBreadcrumbs = useCallback(() => {
    return routeStateRef.current.breadcrumbs;
  }, []);
  
  const getNavigationHistory = useCallback(() => {
    return routeStateRef.current.navigationHistory;
  }, []);
  
  // Effect to handle location changes
  useEffect(() => {
    const currentPath = location.pathname;
    
    if (currentPath !== routeState.currentRoute) {
      setRouteState(prev => ({
        ...prev,
        currentRoute: currentPath,
        breadcrumbs: generateBreadcrumbs(currentPath)
      }));
      
      onRouteChange?.(currentPath);
      
      log('📍 [CourseRouteManager] Location changed', { 
        from: routeState.currentRoute, 
        to: currentPath 
      });
    }
  }, [location.pathname, routeState.currentRoute, generateBreadcrumbs, onRouteChange]);
  
  // Effect to process navigation queue
  useEffect(() => {
    if (navigationQueue.length > 0 && !isNavigating) {
      const nextOperation = navigationQueue[0];
      setNavigationQueue(prev => prev.slice(1));
      
      // Process the next operation
      log('🔄 [CourseRouteManager] Processing navigation queue', { 
        operation: nextOperation,
        queueLength: navigationQueue.length 
      });
    }
  }, [navigationQueue, isNavigating]);
  
  // Effect to handle route errors
  useEffect(() => {
    if (routeErrors.length > 0) {
      const latestError = routeErrors[routeErrors.length - 1];
      
      // Auto-recover from certain errors
      if (latestError.recoverable && !recoveryMode) {
        recoverFromError(latestError);
      }
      
      // Show user notification for non-recoverable errors
      if (!latestError.recoverable) {
        toast({
          title: 'Navigation Error',
          description: latestError.message,
          variant: 'destructive'
        });
      }
    }
  }, [routeErrors, recoveryMode, recoverFromError]);
  
  // Context value for child components
  const routeContextValue = {
    // State
    routeState,
    isNavigating,
    recoveryMode,
    routeErrors,
    
    // Navigation functions
    navigateToRoute,
    navigateToCourse,
    navigateToLesson,
    navigateToModule,
    goBack,
    goForward,
    
    // Utility functions
    getCurrentRoute,
    getRouteParams,
    getBreadcrumbs,
    getNavigationHistory,
    getCachedRoute,
    
    // Error handling
    recoverFromError,
    clearErrors
  };
  
  return (
    <CourseRouteContext.Provider value={routeContextValue}>
      {children}
    </CourseRouteContext.Provider>
  );
});

// Context for route management
interface CourseRouteContextType {
  routeState: RouteState;
  isNavigating: boolean;
  recoveryMode: boolean;
  routeErrors: RouteError[];
  navigateToRoute: (path: string, options?: { replace?: boolean; state?: Record<string, unknown> }) => Promise<boolean>;
  navigateToCourse: (courseId: string) => Promise<boolean>;
  navigateToLesson: (courseId: string, lessonId: string) => Promise<boolean>;
  navigateToModule: (courseId: string, moduleId: string) => Promise<boolean>;
  goBack: () => void;
  goForward: () => void;
  getCurrentRoute: () => string;
  getRouteParams: () => Record<string, string | undefined>;
  getBreadcrumbs: () => Array<{ label: string; path: string }>;
  getNavigationHistory: () => string[];
  getCachedRoute: (path: string) => { timestamp: number; data: Record<string, unknown> } | null;
  recoverFromError: (error: RouteError) => boolean;
  clearErrors: () => void;
}

const CourseRouteContext = React.createContext<CourseRouteContextType | null>(null);

// Hook to use route manager
export const useCourseRouteManager = () => {
  const context = React.useContext(CourseRouteContext);
  if (!context) {
    throw new Error('useCourseRouteManager must be used within CourseRouteManager');
  }
  return context;
};

// Display name for debugging
CourseRouteManager.displayName = 'CourseRouteManager'; 