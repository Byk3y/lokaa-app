import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { log } from '@/utils/logger';
import { toast } from '@/hooks/use-toast';
import type { 
  CourseLesson, 
  CourseDetailData 
} from '@/types/classroom/courseDetail';

/**
 * Mobile View Manager Component
 * 
 * Comprehensive mobile view management with:
 * - View switching logic and transitions
 * - View state management and validation
 * - View caching and optimization
 * - View error handling and recovery
 * - View analytics and monitoring
 * - View fallbacks and permissions
 * - Accessibility features
 * - Performance optimizations
 * - Mobile-specific view patterns
 */
interface MobileViewManagerProps {
  course: CourseDetailData | null;
  selectedLesson: CourseLesson | null;
  isMobile: boolean;
  showCourseOverview: boolean;
  showLessonView: boolean;
  onViewChange?: (view: string, params: Record<string, any>) => void;
  onViewError?: (error: string, view: string) => void;
  onViewValidation?: (isValid: boolean, view: string) => void;
  
  // View management features
  enableViewTransitions?: boolean;
  enableViewCaching?: boolean;
  enableViewValidation?: boolean;
  enableViewAnalytics?: boolean;
  enableViewFallbacks?: boolean;
  enableViewPermissions?: boolean;
  enableAccessibility?: boolean;
  enablePerformanceOptimization?: boolean;
}

interface ViewState {
  currentView: string;
  previousView: string | null;
  viewParams: Record<string, any>;
  viewHistory: string[];
  currentHistoryIndex: number;
  isTransitioning: boolean;
  transitionType: 'push' | 'replace' | 'back' | 'forward' | null;
  viewError: string | null;
  viewCache: Map<string, any>;
  viewPermissions: Map<string, boolean>;
  viewAnalytics: {
    totalViews: number;
    viewErrors: number;
    cacheHits: number;
    cacheMisses: number;
    averageTransitionTime: number;
    accessibilityUsage: number;
  };
  accessibilityState: {
    isScreenReaderActive: boolean;
    isHighContrastMode: boolean;
    isReducedMotion: boolean;
    fontSize: 'small' | 'medium' | 'large';
    colorScheme: 'light' | 'dark' | 'auto';
  };
}

const MobileViewManager: React.FC<MobileViewManagerProps> = React.memo(({
  course,
  selectedLesson,
  isMobile,
  showCourseOverview,
  showLessonView,
  onViewChange,
  onViewError,
  onViewValidation,
  enableViewTransitions = true,
  enableViewCaching = true,
  enableViewValidation = true,
  enableViewAnalytics = true,
  enableViewFallbacks = true,
  enableViewPermissions = true,
  enableAccessibility = true,
  enablePerformanceOptimization = true
}) => {
  // View state management
  const [viewState, setViewState] = useState<ViewState>({
    currentView: showCourseOverview ? 'course-overview' : showLessonView ? 'lesson-view' : 'none',
    previousView: null,
    viewParams: {},
    viewHistory: [],
    currentHistoryIndex: -1,
    isTransitioning: false,
    transitionType: null,
    viewError: null,
    viewCache: new Map(),
    viewPermissions: new Map(),
    viewAnalytics: {
      totalViews: 0,
      viewErrors: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageTransitionTime: 0,
      accessibilityUsage: 0
    },
    accessibilityState: {
      isScreenReaderActive: false,
      isHighContrastMode: false,
      isReducedMotion: false,
      fontSize: 'medium',
      colorScheme: 'auto'
    }
  });

  // Refs for performance optimization
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const accessibilityObserverRef = useRef<ResizeObserver | null>(null);

  // View validation function
  const validateView = useCallback((view: string, params: Record<string, any>): boolean => {
    try {
      // Validate course data for course overview view
      if (view === 'course-overview' && !course?.id) {
        log.warn('View', '🎓 [MobileViewManager] Invalid view: missing course data for course overview');
        return false;
      }

      // Validate lesson data for lesson view
      if (view === 'lesson-view' && !selectedLesson?.id) {
        log.warn('View', '🎓 [MobileViewManager] Invalid view: missing lesson data for lesson view');
        return false;
      }

      // Validate mobile context
      if (!isMobile) {
        log.warn('View', '🎓 [MobileViewManager] Invalid view: not in mobile context');
        return false;
      }

      return true;
    } catch (error) {
      log.error('View', '🎓 [MobileViewManager] View validation error:', error);
      return false;
    }
  }, [course, selectedLesson, isMobile]);

  // View permission checking
  const checkViewPermission = useCallback((view: string, params: Record<string, any>): boolean => {
    try {
      // Check if user has permission to access this view
      // This is a placeholder - implement actual permission logic
      return true;
    } catch (error) {
      log.error('View', '🎓 [MobileViewManager] Permission check error:', error);
      return false;
    }
  }, []);

  // View caching functions
  const getCachedView = useCallback((view: string): any => {
    if (!enableViewCaching) return null;
    
    const cached = viewState.viewCache.get(view);
    if (cached && cached.timestamp > Date.now() - 5 * 60 * 1000) { // 5 minutes
      log.debug('View', '🎓 [MobileViewManager] Cache hit for view:', view);
      return cached.data;
    }
    
    log.debug('View', '🎓 [MobileViewManager] Cache miss for view:', view);
    return null;
  }, [viewState.viewCache, enableViewCaching]);

  const setCachedView = useCallback((view: string, data: any): void => {
    if (!enableViewCaching) return;
    
    viewState.viewCache.set(view, {
      data,
      timestamp: Date.now()
    });
    
    log.debug('View', '🎓 [MobileViewManager] Cached view data:', view);
  }, [viewState.viewCache, enableViewCaching]);

  // View analytics tracking
  const trackViewAnalytics = useCallback((view: string, transitionTime: number, success: boolean): void => {
    if (!enableViewAnalytics) return;
    
    setViewState(prev => {
      const newAnalytics = {
        ...prev.viewAnalytics,
        totalViews: prev.viewAnalytics.totalViews + 1,
        viewErrors: prev.viewAnalytics.viewErrors + (success ? 0 : 1),
        averageTransitionTime: (prev.viewAnalytics.averageTransitionTime * prev.viewAnalytics.totalViews + transitionTime) / (prev.viewAnalytics.totalViews + 1)
      };
      
      if (success) {
        newAnalytics.cacheHits = prev.viewAnalytics.cacheHits + 1;
      } else {
        newAnalytics.cacheMisses = prev.viewAnalytics.cacheMisses + 1;
      }
      
      log.debug('View', '🎓 [MobileViewManager] View analytics updated:', newAnalytics);
      return { ...prev, viewAnalytics: newAnalytics };
    });
  }, [enableViewAnalytics]);

  // View transition handling
  const handleViewTransition = useCallback(async (
    view: string, 
    params: Record<string, any>, 
    transitionType: 'push' | 'replace' | 'back' | 'forward'
  ): Promise<boolean> => {
    const startTime = Date.now();
    
    try {
      // Validate view
      if (enableViewValidation && !validateView(view, params)) {
        throw new Error('View validation failed');
      }

      // Check permissions
      if (enableViewPermissions && !checkViewPermission(view, params)) {
        throw new Error('View permission denied');
      }

      // Set transition state
      setViewState(prev => ({
        ...prev,
        isTransitioning: true,
        transitionType,
        viewError: null
      }));

      log.debug('View', '🎓 [MobileViewManager] View transition started:', {
        view,
        transitionType,
        params
      });

      // Check cache first
      const cachedData = getCachedView(view);
      if (cachedData) {
        log.debug('View', '🎓 [MobileViewManager] Using cached view data');
        // Use cached data
      }

      // Simulate transition delay for smooth UX
      if (enableViewTransitions) {
        await new Promise(resolve => setTimeout(resolve, 150));
      }

      // Update view state
      const transitionTime = Date.now() - startTime;
      setViewState(prev => ({
        ...prev,
        currentView: view,
        previousView: prev.currentView,
        viewParams: params,
        viewHistory: [...prev.viewHistory, view],
        currentHistoryIndex: prev.viewHistory.length,
        isTransitioning: false,
        transitionType: null
      }));

      // Track analytics
      trackViewAnalytics(view, transitionTime, true);

      // Cache view data
      if (enableViewCaching) {
        setCachedView(view, { params, timestamp: Date.now() });
      }

      log.debug('View', '🎓 [MobileViewManager] View transition completed:', {
        view,
        transitionTime,
        success: true
      });

      return true;
    } catch (error) {
      const transitionTime = Date.now() - startTime;
      
      setViewState(prev => ({
        ...prev,
        isTransitioning: false,
        transitionType: null,
        viewError: error instanceof Error ? error.message : 'View transition failed'
      }));

      // Track analytics
      trackViewAnalytics(view, transitionTime, false);

      log.error('View', '🎓 [MobileViewManager] View transition failed:', error);
      return false;
    }
  }, [
    enableViewValidation, 
    validateView, 
    enableViewPermissions, 
    checkViewPermission, 
    getCachedView, 
    enableViewTransitions, 
    enableViewCaching, 
    setCachedView, 
    trackViewAnalytics
  ]);

  // View switching functions
  const switchToCourseOverview = useCallback((): Promise<boolean> => {
    return handleViewTransition('course-overview', { courseId: course?.id }, 'push');
  }, [course?.id, handleViewTransition]);

  const switchToLessonView = useCallback((lessonId: string): Promise<boolean> => {
    return handleViewTransition('lesson-view', { lessonId, courseId: course?.id }, 'push');
  }, [course?.id, handleViewTransition]);

  const switchToMenuView = useCallback((): Promise<boolean> => {
    return handleViewTransition('menu-view', { courseId: course?.id }, 'push');
  }, [course?.id, handleViewTransition]);

  const goBackToPreviousView = useCallback((): Promise<boolean> => {
    if (viewState.currentHistoryIndex > 0) {
      const previousView = viewState.viewHistory[viewState.currentHistoryIndex - 1];
      if (previousView) {
        return handleViewTransition(previousView, {}, 'back');
      }
    }
    return Promise.resolve(false);
  }, [viewState.currentHistoryIndex, viewState.viewHistory, handleViewTransition]);

  // View fallback handling
  const handleViewFallback = useCallback((failedView: string): Promise<boolean> => {
    if (!enableViewFallbacks) return Promise.resolve(false);
    
    try {
      log.debug('View', '🎓 [MobileViewManager] Handling view fallback:', failedView);
      
      // Navigate to course overview as fallback
      if (course?.id) {
        return handleViewTransition('course-overview', { courseId: course.id }, 'replace');
      }
      
      return Promise.resolve(false);
    } catch (fallbackError) {
      log.error('View', '🎓 [MobileViewManager] Fallback view failed:', fallbackError);
      return Promise.resolve(false);
    }
  }, [enableViewFallbacks, course?.id, handleViewTransition]);

  // Accessibility management
  const updateAccessibilityState = useCallback(() => {
    if (!enableAccessibility) return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');

    setViewState(prev => ({
      ...prev,
      accessibilityState: {
        ...prev.accessibilityState,
        isReducedMotion: mediaQuery.matches,
        isHighContrastMode: highContrastQuery.matches,
        colorScheme: colorSchemeQuery.matches ? 'dark' : 'light'
      }
    }));

    log.debug('View', '🎓 [MobileViewManager] Accessibility state updated');
  }, [enableAccessibility]);

  // Cache cleanup effect
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const expiredViews: string[] = [];
      
      viewState.viewCache.forEach((value, view) => {
        if (value.timestamp < now - 10 * 60 * 1000) { // 10 minutes
          expiredViews.push(view);
        }
      });
      
      expiredViews.forEach(view => {
        viewState.viewCache.delete(view);
        log.debug('View', '🎓 [MobileViewManager] Cleaned up expired cache entry:', view);
      });
    }, 5 * 60 * 1000); // Clean up every 5 minutes

    return () => clearInterval(cleanupInterval);
  }, [viewState.viewCache]);

  // View change detection
  useEffect(() => {
    const currentView = showCourseOverview ? 'course-overview' : showLessonView ? 'lesson-view' : 'none';
    
    if (currentView !== viewState.currentView) {
      log.debug('View', '🎓 [MobileViewManager] View change detected:', {
        from: viewState.currentView,
        to: currentView
      });
      
      setViewState(prev => ({
        ...prev,
        currentView,
        previousView: prev.currentView
      }));
      
      // Notify parent component
      if (onViewChange) {
        onViewChange(currentView, viewState.viewParams);
      }
    }
  }, [showCourseOverview, showLessonView, viewState.currentView, viewState.viewParams, onViewChange]);

  // View error handling
  useEffect(() => {
    if (viewState.viewError && onViewError) {
      onViewError(viewState.viewError, viewState.currentView);
    }
  }, [viewState.viewError, viewState.currentView, onViewError]);

  // View validation notification
  useEffect(() => {
    if (onViewValidation) {
      const isValid = !viewState.viewError && validateView(viewState.currentView, viewState.viewParams);
      onViewValidation(isValid, viewState.currentView);
    }
  }, [viewState.viewError, viewState.currentView, viewState.viewParams, validateView, onViewValidation]);

  // Accessibility setup
  useEffect(() => {
    if (enableAccessibility) {
      updateAccessibilityState();
      
      // Listen for accessibility preference changes
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
      const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleAccessibilityChange = () => updateAccessibilityState();
      
      mediaQuery.addEventListener('change', handleAccessibilityChange);
      highContrastQuery.addEventListener('change', handleAccessibilityChange);
      colorSchemeQuery.addEventListener('change', handleAccessibilityChange);
      
      return () => {
        mediaQuery.removeEventListener('change', handleAccessibilityChange);
        highContrastQuery.removeEventListener('change', handleAccessibilityChange);
        colorSchemeQuery.removeEventListener('change', handleAccessibilityChange);
      };
    }
  }, [enableAccessibility, updateAccessibilityState]);

  // Performance optimization: Memoize view methods
  const viewMethods = useMemo(() => ({
    switchToCourseOverview,
    switchToLessonView,
    switchToMenuView,
    goBackToPreviousView,
    handleViewFallback,
    validateView,
    checkViewPermission,
    getCachedView,
    setCachedView,
    updateAccessibilityState,
    viewState
  }), [
    switchToCourseOverview,
    switchToLessonView,
    switchToMenuView,
    goBackToPreviousView,
    handleViewFallback,
    validateView,
    checkViewPermission,
    getCachedView,
    setCachedView,
    updateAccessibilityState,
    viewState
  ]);

  // Expose methods via ref
  const viewManagerRef = useRef<typeof viewMethods | null>(null);
  React.useImperativeHandle(viewManagerRef, () => viewMethods, [viewMethods]);

  // Development logging
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 [MobileViewManager] Component render:', {
      currentView: viewState.currentView,
      isTransitioning: viewState.isTransitioning,
      hasError: !!viewState.viewError,
      analytics: viewState.viewAnalytics,
      accessibility: viewState.accessibilityState
    });
  }

  return (
    <div
      className="mobile-view-manager"
      role="navigation"
      aria-label="Mobile view manager"
      style={{ display: 'contents' }} // Don't render as a visible element
    >
      {/* View Error Display */}
      {viewState.viewError && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-700 text-sm">View Error: {viewState.viewError}</p>
          <button
            onClick={() => setViewState(prev => ({ ...prev, viewError: null }))}
            className="absolute top-2 right-2 text-red-500 hover:text-red-700"
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {/* View Transition Indicator */}
      {viewState.isTransitioning && (
        <div className="fixed top-4 left-4 z-50 bg-blue-50 border border-blue-200 rounded-lg p-2">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 animate-spin rounded-full border-2 border-blue-300 border-t-blue-600"></div>
            <span className="text-blue-700 text-sm">
              {viewState.transitionType === 'push' ? 'Switching view...' : 'Updating view...'}
            </span>
          </div>
        </div>
      )}

      {/* Accessibility Indicator (Development Only) */}
      {process.env.NODE_ENV === 'development' && enableAccessibility && (
        <div className="fixed bottom-4 left-4 z-50 bg-green-50 border border-green-200 rounded-lg p-2 text-xs">
          <div className="text-green-700">
            <div>Screen Reader: {viewState.accessibilityState.isScreenReaderActive ? 'On' : 'Off'}</div>
            <div>High Contrast: {viewState.accessibilityState.isHighContrastMode ? 'On' : 'Off'}</div>
            <div>Reduced Motion: {viewState.accessibilityState.isReducedMotion ? 'On' : 'Off'}</div>
            <div>Color Scheme: {viewState.accessibilityState.colorScheme}</div>
          </div>
        </div>
      )}

      {/* View Analytics Display (Development Only) */}
      {process.env.NODE_ENV === 'development' && enableViewAnalytics && (
        <div className="fixed bottom-4 right-4 z-50 bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs">
          <div className="text-gray-700">
            <div>Views: {viewState.viewAnalytics.totalViews}</div>
            <div>Errors: {viewState.viewAnalytics.viewErrors}</div>
            <div>Cache: {viewState.viewAnalytics.cacheHits}/{viewState.viewAnalytics.cacheHits + viewState.viewAnalytics.cacheMisses}</div>
            <div>Avg: {viewState.viewAnalytics.averageTransitionTime.toFixed(0)}ms</div>
            <div>Accessibility: {viewState.viewAnalytics.accessibilityUsage}</div>
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
    prevProps.onViewChange === nextProps.onViewChange &&
    prevProps.onViewError === nextProps.onViewError &&
    prevProps.onViewValidation === nextProps.onViewValidation &&
    prevProps.enableViewTransitions === nextProps.enableViewTransitions &&
    prevProps.enableViewCaching === nextProps.enableViewCaching &&
    prevProps.enableViewValidation === nextProps.enableViewValidation &&
    prevProps.enableViewAnalytics === nextProps.enableViewAnalytics &&
    prevProps.enableViewFallbacks === nextProps.enableViewFallbacks &&
    prevProps.enableViewPermissions === nextProps.enableViewPermissions &&
    prevProps.enableAccessibility === nextProps.enableAccessibility &&
    prevProps.enablePerformanceOptimization === nextProps.enablePerformanceOptimization
  );
});

export default MobileViewManager; 