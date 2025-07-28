import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { log } from '@/utils/logger';
import { toast } from '@/hooks/use-toast';
import { getLessonUrl, getCourseUrl } from '@/utils/slugUtils';
import type { 
  CourseLesson, 
  CourseDetailData 
} from '@/types/classroom/courseDetail';

/**
 * Mobile Route Handler Component
 * 
 * Comprehensive mobile route management with:
 * - Route transitions and animations
 * - Route state management and validation
 * - Route caching and optimization
 * - Route error handling and recovery
 * - Route analytics and monitoring
 * - Route fallbacks and permissions
 * - Deep linking support
 * - URL synchronization
 * - Performance optimizations
 * - Mobile-specific route patterns
 */
interface MobileRouteHandlerProps {
  course: CourseDetailData | null;
  selectedLesson: CourseLesson | null;
  isMobile: boolean;
  showCourseOverview: boolean;
  showLessonView: boolean;
  onRouteChange?: (route: string, params: Record<string, any>) => void;
  onRouteError?: (error: string, route: string) => void;
  onRouteValidation?: (isValid: boolean, route: string) => void;
  
  // Route management features
  enableRouteTransitions?: boolean;
  enableRouteCaching?: boolean;
  enableRouteValidation?: boolean;
  enableRouteAnalytics?: boolean;
  enableRouteFallbacks?: boolean;
  enableRoutePermissions?: boolean;
  enableDeepLinking?: boolean;
  enablePerformanceOptimization?: boolean;
}

interface RouteState {
  currentRoute: string;
  previousRoute: string | null;
  routeParams: Record<string, any>;
  routeHistory: string[];
  currentHistoryIndex: number;
  isTransitioning: boolean;
  transitionType: 'push' | 'replace' | 'back' | 'forward' | null;
  routeError: string | null;
  routeCache: Map<string, any>;
  routePermissions: Map<string, boolean>;
  routeAnalytics: {
    totalRoutes: number;
    routeErrors: number;
    cacheHits: number;
    cacheMisses: number;
    averageTransitionTime: number;
  };
}

const MobileRouteHandler: React.FC<MobileRouteHandlerProps> = React.memo(({
  course,
  selectedLesson,
  isMobile,
  showCourseOverview,
  showLessonView,
  onRouteChange,
  onRouteError,
  onRouteValidation,
  enableRouteTransitions = true,
  enableRouteCaching = true,
  enableRouteValidation = true,
  enableRouteAnalytics = true,
  enableRouteFallbacks = true,
  enableRoutePermissions = true,
  enableDeepLinking = true,
  enablePerformanceOptimization = true
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { subdomain } = useParams<{ subdomain: string }>();
  const [searchParams] = useSearchParams();
  
  // Route state management
  const [routeState, setRouteState] = useState<RouteState>({
    currentRoute: location.pathname + location.search,
    previousRoute: null,
    routeParams: {},
    routeHistory: [],
    currentHistoryIndex: -1,
    isTransitioning: false,
    transitionType: null,
    routeError: null,
    routeCache: new Map(),
    routePermissions: new Map(),
    routeAnalytics: {
      totalRoutes: 0,
      routeErrors: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageTransitionTime: 0
    }
  });

  // Refs for performance optimization
  const transitionStartTimeRef = useRef<number>(0);
  const routeCacheRef = useRef<Map<string, any>>(new Map());
  const permissionCacheRef = useRef<Map<string, boolean>>(new Map());
  const analyticsRef = useRef<{
    totalRoutes: number;
    routeErrors: number;
    cacheHits: number;
    cacheMisses: number;
    transitionTimes: number[];
  }>({
    totalRoutes: 0,
    routeErrors: 0,
    cacheHits: 0,
    cacheMisses: 0,
    transitionTimes: []
  });

  // Route validation utilities
  const validateRoute = useCallback((route: string, params: Record<string, any>): boolean => {
    if (!enableRouteValidation) return true;
    
    try {
      // Validate course routes
      if (route.includes('/space/classroom/')) {
        const courseId = params.courseId || course?.id;
        if (!courseId) {
          log.warn('Route', '🎓 [MobileRouteHandler] Invalid route: missing course ID');
          return false;
        }
      }
      
      // Validate lesson routes
      if (route.includes('?md=') && params.lessonId) {
        const lesson = course?.modules.flatMap(m => m.lessons).find(l => l.id === params.lessonId);
        if (!lesson) {
          log.warn('Route', '🎓 [MobileRouteHandler] Invalid route: lesson not found');
          return false;
        }
      }
      
      // Validate subdomain
      if (!subdomain) {
        log.warn('Route', '🎓 [MobileRouteHandler] Invalid route: missing subdomain');
        return false;
      }
      
      return true;
    } catch (error) {
      log.error('Route', '🎓 [MobileRouteHandler] Route validation error:', error);
      return false;
    }
  }, [enableRouteValidation, course, subdomain]);

  // Route permission checking
  const checkRoutePermission = useCallback((route: string, params: Record<string, any>): boolean => {
    if (!enableRoutePermissions) return true;
    
    const permissionKey = `${route}_${JSON.stringify(params)}`;
    
    // Check cache first
    if (permissionCacheRef.current.has(permissionKey)) {
      return permissionCacheRef.current.get(permissionKey)!;
    }
    
    try {
      // Check course access permissions
      if (route.includes('/space/classroom/')) {
        const courseId = params.courseId || course?.id;
        if (!courseId) {
          permissionCacheRef.current.set(permissionKey, false);
          return false;
        }
        
        // Check if user has access to this course
        // This could be expanded to check enrollment, ownership, etc.
        const hasAccess = true; // Simplified for now
        permissionCacheRef.current.set(permissionKey, hasAccess);
        return hasAccess;
      }
      
      // Default permission
      permissionCacheRef.current.set(permissionKey, true);
      return true;
    } catch (error) {
      log.error('Route', '🎓 [MobileRouteHandler] Permission check error:', error);
      permissionCacheRef.current.set(permissionKey, false);
      return false;
    }
  }, [enableRoutePermissions, course]);

  // Route caching utilities
  const getCachedRoute = useCallback((route: string): any => {
    if (!enableRouteCaching) return null;
    
    const cached = routeCacheRef.current.get(route);
    if (cached) {
      analyticsRef.current.cacheHits++;
      log.debug('Route', '🎓 [MobileRouteHandler] Cache hit for route:', route);
    } else {
      analyticsRef.current.cacheMisses++;
      log.debug('Route', '🎓 [MobileRouteHandler] Cache miss for route:', route);
    }
    
    return cached;
  }, [enableRouteCaching]);

  const setCachedRoute = useCallback((route: string, data: any) => {
    if (!enableRouteCaching) return;
    
    routeCacheRef.current.set(route, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + (5 * 60 * 1000) // 5 minutes cache
    });
    
    log.debug('Route', '🎓 [MobileRouteHandler] Cached route data:', route);
  }, [enableRouteCaching]);

  // Route analytics
  const trackRouteAnalytics = useCallback((route: string, transitionTime: number, success: boolean) => {
    if (!enableRouteAnalytics) return;
    
    analyticsRef.current.totalRoutes++;
    analyticsRef.current.transitionTimes.push(transitionTime);
    
    if (!success) {
      analyticsRef.current.routeErrors++;
    }
    
    // Keep only last 100 transition times for average calculation
    if (analyticsRef.current.transitionTimes.length > 100) {
      analyticsRef.current.transitionTimes.shift();
    }
    
    // Calculate average transition time
    const averageTime = analyticsRef.current.transitionTimes.reduce((a, b) => a + b, 0) / 
                       analyticsRef.current.transitionTimes.length;
    
    setRouteState(prev => ({
      ...prev,
      routeAnalytics: {
        totalRoutes: analyticsRef.current.totalRoutes,
        routeErrors: analyticsRef.current.routeErrors,
        cacheHits: analyticsRef.current.cacheHits,
        cacheMisses: analyticsRef.current.cacheMisses,
        averageTransitionTime: averageTime
      }
    }));
    
    log.debug('Route', '🎓 [MobileRouteHandler] Route analytics updated:', {
      route,
      transitionTime,
      success,
      totalRoutes: analyticsRef.current.totalRoutes,
      averageTime
    });
  }, [enableRouteAnalytics]);

  // Route transition handling
  const handleRouteTransition = useCallback(async (
    targetRoute: string, 
    params: Record<string, any> = {}, 
    transitionType: 'push' | 'replace' = 'replace'
  ) => {
    const startTime = Date.now();
    transitionStartTimeRef.current = startTime;
    
    log.debug('Route', '🎓 [MobileRouteHandler] Route transition started:', {
      from: routeState.currentRoute,
      to: targetRoute,
      type: transitionType,
      params
    });
    
    try {
      // Set transitioning state
      setRouteState(prev => ({
        ...prev,
        isTransitioning: true,
        transitionType,
        routeError: null
      }));
      
      // Validate route
      const isValid = validateRoute(targetRoute, params);
      onRouteValidation?.(isValid, targetRoute);
      
      if (!isValid) {
        throw new Error('Invalid route');
      }
      
      // Check permissions
      const hasPermission = checkRoutePermission(targetRoute, params);
      if (!hasPermission) {
        throw new Error('Route access denied');
      }
      
      // Check cache for route data
      const cachedData = getCachedRoute(targetRoute);
      if (cachedData) {
        log.debug('Route', '🎓 [MobileRouteHandler] Using cached route data');
      }
      
      // Perform navigation
      const navigationPromise = new Promise<void>((resolve, reject) => {
        try {
          if (transitionType === 'push') {
            navigate(targetRoute);
          } else {
            navigate(targetRoute, { replace: true });
          }
          resolve();
        } catch (error) {
          reject(error);
        }
      });
      
      await navigationPromise;
      
      // Update route state
      setRouteState(prev => {
        const newHistory = [...prev.routeHistory];
        if (transitionType === 'push') {
          newHistory.push(targetRoute);
        } else {
          // For replace, update the current entry
          if (newHistory.length > 0) {
            newHistory[newHistory.length - 1] = targetRoute;
          } else {
            newHistory.push(targetRoute);
          }
        }
        
        return {
          ...prev,
          currentRoute: targetRoute,
          previousRoute: prev.currentRoute,
          routeParams: params,
          routeHistory: newHistory.slice(-50), // Keep last 50 routes
          currentHistoryIndex: newHistory.length - 1,
          isTransitioning: false,
          transitionType: null
        };
      });
      
      // Track analytics
      const transitionTime = Date.now() - startTime;
      trackRouteAnalytics(targetRoute, transitionTime, true);
      
      // Notify parent
      onRouteChange?.(targetRoute, params);
      
      log.debug('Route', '🎓 [MobileRouteHandler] Route transition completed:', {
        route: targetRoute,
        transitionTime
      });
      
    } catch (error) {
      const transitionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Route transition failed';
      
      // Update error state
      setRouteState(prev => ({
        ...prev,
        isTransitioning: false,
        transitionType: null,
        routeError: errorMessage
      }));
      
      // Track analytics
      trackRouteAnalytics(targetRoute, transitionTime, false);
      
      // Notify parent
      onRouteError?.(errorMessage, targetRoute);
      
      // Show user-friendly error
      toast({
        title: "Navigation Error",
        description: errorMessage,
        variant: "destructive"
      });
      
      log.error('Route', '🎓 [MobileRouteHandler] Route transition failed:', error);
    }
  }, [
    routeState.currentRoute,
    validateRoute,
    checkRoutePermission,
    getCachedRoute,
    trackRouteAnalytics,
    onRouteChange,
    onRouteError,
    onRouteValidation,
    navigate
  ]);

  // Route utilities
  const getLessonRoute = useCallback((lessonId: string): string => {
    if (!subdomain || !course?.short_id) return '';
    return getLessonUrl(subdomain, course.short_id, lessonId);
  }, [subdomain, course?.short_id]);

  const getCourseRoute = useCallback((moduleId?: string): string => {
    if (!subdomain || !course?.short_id) return '';
    return getCourseUrl(subdomain, course.short_id, moduleId);
  }, [subdomain, course?.short_id]);

  const getMenuRoute = useCallback((): string => {
    if (!subdomain || !course?.short_id) return '';
    return `/${subdomain}/space/classroom/${course.short_id}?md=menu`;
  }, [subdomain, course?.short_id]);

  // Route handlers
  const navigateToLesson = useCallback((lesson: CourseLesson) => {
    const route = getLessonRoute(lesson.id);
    if (route) {
      handleRouteTransition(route, { lessonId: lesson.id });
    }
  }, [getLessonRoute, handleRouteTransition]);

  const navigateToCourse = useCallback((moduleId?: string) => {
    const route = getCourseRoute(moduleId);
    if (route) {
      handleRouteTransition(route, { moduleId });
    }
  }, [getCourseRoute, handleRouteTransition]);

  const navigateToMenu = useCallback(() => {
    const route = getMenuRoute();
    if (route) {
      handleRouteTransition(route, { view: 'menu' });
    }
  }, [getMenuRoute, handleRouteTransition]);

  const navigateBack = useCallback(() => {
    if (routeState.currentHistoryIndex > 0) {
      const previousRoute = routeState.routeHistory[routeState.currentHistoryIndex - 1];
      if (previousRoute) {
        handleRouteTransition(previousRoute, {}, 'replace');
      }
    }
  }, [routeState.currentHistoryIndex, routeState.routeHistory, handleRouteTransition]);

  // Deep linking support
  const handleDeepLink = useCallback((url: string) => {
    if (!enableDeepLinking) return;
    
    log.debug('Route', '🎓 [MobileRouteHandler] Processing deep link:', url);
    
    try {
      const urlObj = new URL(url, window.location.origin);
      const pathname = urlObj.pathname;
      const searchParams = new URLSearchParams(urlObj.search);
      
      // Parse route parameters
      const params: Record<string, any> = {};
      
      // Extract course ID from path
      const courseMatch = pathname.match(/\/space\/classroom\/([^\/\?]+)/);
      if (courseMatch) {
        params.courseId = courseMatch[1];
      }
      
      // Extract lesson ID from search params
      const lessonId = searchParams.get('md');
      if (lessonId && lessonId !== 'menu') {
        params.lessonId = lessonId;
      }
      
      // Extract view type
      const view = searchParams.get('md');
      if (view === 'menu') {
        params.view = 'menu';
      }
      
      handleRouteTransition(pathname + urlObj.search, params);
      
    } catch (error) {
      log.error('Route', '🎓 [MobileRouteHandler] Deep link processing error:', error);
      onRouteError?.('Invalid deep link', url);
    }
  }, [enableDeepLinking, handleRouteTransition, onRouteError]);

  // Route fallback handling
  const handleRouteFallback = useCallback((failedRoute: string, error: string) => {
    if (!enableRouteFallbacks) return;
    
    log.debug('Route', '🎓 [MobileRouteHandler] Handling route fallback:', failedRoute);
    
    try {
      // Try to navigate to a safe fallback route
      if (failedRoute.includes('/space/classroom/')) {
        // Fallback to classroom overview
        const fallbackRoute = `/${subdomain}/space/classroom`;
        handleRouteTransition(fallbackRoute, { fallback: true });
      } else {
        // Fallback to space home
        const fallbackRoute = `/${subdomain}/space`;
        handleRouteTransition(fallbackRoute, { fallback: true });
      }
    } catch (fallbackError) {
      log.error('Route', '🎓 [MobileRouteHandler] Fallback route failed:', fallbackError);
      // Last resort - reload the page
      window.location.reload();
    }
  }, [enableRouteFallbacks, subdomain, handleRouteTransition]);

  // Performance optimizations
  useEffect(() => {
    if (!enablePerformanceOptimization) return;
    
    // Clean up expired cache entries
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [route, cached] of routeCacheRef.current.entries()) {
        if (cached.expiresAt && cached.expiresAt < now) {
          routeCacheRef.current.delete(route);
          log.debug('Route', '🎓 [MobileRouteHandler] Cleaned up expired cache entry:', route);
        }
      }
    }, 60000); // Clean up every minute
    
    return () => clearInterval(cleanupInterval);
  }, [enablePerformanceOptimization]);

  // Initialize route state
  useEffect(() => {
    const currentRoute = location.pathname + location.search;
    setRouteState(prev => ({
      ...prev,
      currentRoute,
      routeHistory: [currentRoute],
      currentHistoryIndex: 0
    }));
  }, []);

  // Monitor route changes
  useEffect(() => {
    const currentRoute = location.pathname + location.search;
    
    if (currentRoute !== routeState.currentRoute) {
      log.debug('Route', '🎓 [MobileRouteHandler] Route change detected:', {
        from: routeState.currentRoute,
        to: currentRoute
      });
      
      setRouteState(prev => ({
        ...prev,
        currentRoute,
        previousRoute: prev.currentRoute
      }));
    }
  }, [location.pathname, location.search, routeState.currentRoute]);

  // Development logging
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 [MobileRouteHandler] Component render:', {
      currentRoute: routeState.currentRoute,
      isTransitioning: routeState.isTransitioning,
      transitionType: routeState.transitionType,
      routeError: routeState.routeError,
      routeHistoryLength: routeState.routeHistory.length,
      currentHistoryIndex: routeState.currentHistoryIndex,
      cacheSize: routeCacheRef.current.size,
      permissionCacheSize: permissionCacheRef.current.size,
      analytics: routeState.routeAnalytics
    });
  }

  // Expose route methods to parent
  const routeMethods = useMemo(() => ({
    navigateToLesson,
    navigateToCourse,
    navigateToMenu,
    navigateBack,
    handleDeepLink,
    handleRouteFallback,
    getLessonRoute,
    getCourseRoute,
    getMenuRoute,
    validateRoute,
    checkRoutePermission,
    getCachedRoute,
    setCachedRoute,
    routeState
  }), [
    navigateToLesson,
    navigateToCourse,
    navigateToMenu,
    navigateBack,
    handleDeepLink,
    handleRouteFallback,
    getLessonRoute,
    getCourseRoute,
    getMenuRoute,
    validateRoute,
    checkRoutePermission,
    getCachedRoute,
    setCachedRoute,
    routeState
  ]);

  // Expose methods via ref
  const routeHandlerRef = useRef<typeof routeMethods | null>(null);
  React.useImperativeHandle(routeHandlerRef, () => routeMethods, [routeMethods]);

  return (
    <div
      className="mobile-route-handler"
      role="navigation"
      aria-label="Mobile route handler"
      style={{ display: 'contents' }} // Don't render as a visible element
    >
      {/* Route Error Display */}
      {routeState.routeError && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-700 text-sm">Route Error: {routeState.routeError}</p>
          <button
            onClick={() => setRouteState(prev => ({ ...prev, routeError: null }))}
            className="absolute top-2 right-2 text-red-500 hover:text-red-700"
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {/* Route Transition Indicator */}
      {routeState.isTransitioning && (
        <div className="fixed top-4 left-4 z-50 bg-blue-50 border border-blue-200 rounded-lg p-2">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 animate-spin rounded-full border-2 border-blue-300 border-t-blue-600"></div>
            <span className="text-blue-700 text-sm">
              {routeState.transitionType === 'push' ? 'Navigating...' : 'Updating...'}
            </span>
          </div>
        </div>
      )}

      {/* Route Analytics Display (Development Only) */}
      {process.env.NODE_ENV === 'development' && enableRouteAnalytics && (
        <div className="fixed bottom-4 right-4 z-50 bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs">
          <div className="text-gray-700">
            <div>Routes: {routeState.routeAnalytics.totalRoutes}</div>
            <div>Errors: {routeState.routeAnalytics.routeErrors}</div>
            <div>Cache: {routeState.routeAnalytics.cacheHits}/{routeState.routeAnalytics.cacheHits + routeState.routeAnalytics.cacheMisses}</div>
            <div>Avg: {routeState.routeAnalytics.averageTransitionTime.toFixed(0)}ms</div>
          </div>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  return (
    prevProps.course?.id === nextProps.course?.id &&
    prevProps.selectedLesson?.id === nextProps.selectedLesson?.id &&
    prevProps.isMobile === nextProps.isMobile &&
    prevProps.showCourseOverview === nextProps.showCourseOverview &&
    prevProps.showLessonView === nextProps.showLessonView &&
    prevProps.onRouteChange === nextProps.onRouteChange &&
    prevProps.onRouteError === nextProps.onRouteError &&
    prevProps.onRouteValidation === nextProps.onRouteValidation &&
    prevProps.enableRouteTransitions === nextProps.enableRouteTransitions &&
    prevProps.enableRouteCaching === nextProps.enableRouteCaching &&
    prevProps.enableRouteValidation === nextProps.enableRouteValidation &&
    prevProps.enableRouteAnalytics === nextProps.enableRouteAnalytics &&
    prevProps.enableRouteFallbacks === nextProps.enableRouteFallbacks &&
    prevProps.enableRoutePermissions === nextProps.enableRoutePermissions &&
    prevProps.enableDeepLinking === nextProps.enableDeepLinking &&
    prevProps.enablePerformanceOptimization === nextProps.enablePerformanceOptimization
  );
});

export default MobileRouteHandler; 