import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { log } from '@/utils/logger';
import { toast } from '@/hooks/use-toast';
import { getLessonUrl } from '@/utils/slugUtils';
import type { 
  CourseLesson, 
  CourseDetailData, 
  MobileNavigationManagerProps 
} from '@/types/classroom/courseDetail';

/**
 * Mobile Navigation Manager Component
 * 
 * Enhanced mobile navigation management with:
 * - Mobile gesture navigation (swipe, tap, double-tap)
 * - Keyboard navigation support
 * - Navigation history management
 * - Deep linking support
 * - URL synchronization
 * - Performance optimizations
 * - Accessibility features
 * - Navigation state management
 * - Error handling
 * - Mobile-specific navigation patterns
 */
const MobileNavigationManager: React.FC<MobileNavigationManagerProps> = React.memo(({
  course,
  selectedLesson,
  isMobile,
  showCourseOverview,
  showLessonView,
  onBackToMenu,
  onNextLesson,
  onLessonSelect,
  onBack,
  enableHapticFeedback = true,
  enableAnimations = true,
  enableGestureSupport = true,
  enableKeyboardSupport = true,
  enableDeepLinking = true,
  enableNavigationHistory = true,
  enableAccessibility = true,
  enablePerformanceOptimization = true
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { subdomain } = useParams<{ subdomain: string }>();
  
  // Navigation state
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigationError, setNavigationError] = useState<string | null>(null);
  const [lastNavigationTime, setLastNavigationTime] = useState<number>(0);

  // Refs for mobile interactions
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTapRef = useRef<number>(0);
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const gestureTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const keyboardListenerRef = useRef<((e: KeyboardEvent) => void) | null>(null);

  // Performance optimizations
  const [isInViewport, setIsInViewport] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [navigationQueue, setNavigationQueue] = useState<Array<() => void>>([]);

  // Haptic feedback utility
  const triggerHapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!enableHapticFeedback || !navigator.vibrate) return;
    
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30]
    };
    
    navigator.vibrate(patterns[type]);
  }, [enableHapticFeedback]);

  // Navigation history management
  const addToHistory = useCallback((url: string) => {
    if (!enableNavigationHistory) return;
    
    setNavigationHistory(prev => {
      const newHistory = [...prev];
      // Remove any entries after current index (if we navigated back)
      if (currentHistoryIndex < newHistory.length - 1) {
        newHistory.splice(currentHistoryIndex + 1);
      }
      // Add new URL
      newHistory.push(url);
      // Keep only last 50 entries
      if (newHistory.length > 50) {
        newHistory.shift();
      }
      return newHistory;
    });
    setCurrentHistoryIndex(prev => prev + 1);
  }, [enableNavigationHistory, currentHistoryIndex]);

  const canGoBack = useMemo(() => currentHistoryIndex > 0, [currentHistoryIndex]);
  const canGoForward = useMemo(() => currentHistoryIndex < navigationHistory.length - 1, [currentHistoryIndex, navigationHistory.length]);

  // URL utilities
  const getLessonUrlForCourse = useCallback((lessonId: string): string => {
    if (!subdomain || !course?.short_id) return '';
    return getLessonUrl(subdomain, course.short_id, lessonId);
  }, [subdomain, course?.short_id]);

  const getMenuUrl = useCallback((): string => {
    if (!subdomain || !course?.short_id) return '';
    return `/${subdomain}/space/classroom/${course.short_id}?md=menu`;
  }, [subdomain, course?.short_id]);

  // Navigation queue management
  const processNavigationQueue = useCallback(() => {
    if (navigationQueue.length === 0 || isNavigating) return;
    
    const nextNavigation = navigationQueue[0];
    setNavigationQueue(prev => prev.slice(1));
    
    setIsNavigating(true);
    nextNavigation();
    
    // Reset navigation state after a short delay
    setTimeout(() => {
      setIsNavigating(false);
      processNavigationQueue();
    }, 100);
  }, [navigationQueue, isNavigating]);

  useEffect(() => {
    processNavigationQueue();
  }, [processNavigationQueue]);

  // Safe navigation wrapper
  const safeNavigate = useCallback((navigationFn: () => void, url?: string) => {
    const now = Date.now();
    const timeSinceLastNavigation = now - lastNavigationTime;
    
    // Prevent rapid navigation
    if (timeSinceLastNavigation < 100) {
      setNavigationQueue(prev => [...prev, navigationFn]);
      return;
    }
    
    try {
      setNavigationError(null);
      setIsNavigating(true);
      setLastNavigationTime(now);
      
      navigationFn();
      
      if (url) {
        addToHistory(url);
      }
      
      triggerHapticFeedback('light');
    } catch (error) {
      console.error('Navigation error:', error);
      setNavigationError('Navigation failed. Please try again.');
      toast({
        title: "Navigation Error",
        description: "Failed to navigate. Please try again.",
        variant: "destructive"
      });
    } finally {
      setTimeout(() => setIsNavigating(false), 100);
    }
  }, [lastNavigationTime, addToHistory, triggerHapticFeedback]);

  // Navigation handlers
  const handleBackToMenu = useCallback(() => {
    log.debug('Mobile', '🎓 [MobileNavigationManager] Back to menu requested');
    
    const menuUrl = getMenuUrl();
    safeNavigate(() => {
      navigate(menuUrl, { replace: true });
      onBackToMenu?.();
    }, menuUrl);
  }, [getMenuUrl, safeNavigate, navigate, onBackToMenu]);

  const handleNextLesson = useCallback(() => {
    if (!selectedLesson || !course) return;
    
    log.debug('Mobile', '🎓 [MobileNavigationManager] Next lesson requested');
    
    const allLessons = course.modules.flatMap(m => m.lessons);
    const currentIndex = allLessons.findIndex(l => l.id === selectedLesson.id);
    const nextLesson = allLessons[currentIndex + 1];
    
    if (nextLesson) {
      const lessonUrl = getLessonUrlForCourse(nextLesson.id);
      safeNavigate(() => {
        navigate(lessonUrl, { replace: true });
        onLessonSelect?.(nextLesson);
        onNextLesson?.();
      }, lessonUrl);
    } else {
      toast({
        title: "No More Lessons",
        description: "You've reached the end of this course.",
        duration: 2000
      });
    }
  }, [selectedLesson, course, getLessonUrlForCourse, safeNavigate, navigate, onLessonSelect, onNextLesson]);

  const handlePreviousLesson = useCallback(() => {
    if (!selectedLesson || !course) return;
    
    log.debug('Mobile', '🎓 [MobileNavigationManager] Previous lesson requested');
    
    const allLessons = course.modules.flatMap(m => m.lessons);
    const currentIndex = allLessons.findIndex(l => l.id === selectedLesson.id);
    const previousLesson = allLessons[currentIndex - 1];
    
    if (previousLesson) {
      const lessonUrl = getLessonUrlForCourse(previousLesson.id);
      safeNavigate(() => {
        navigate(lessonUrl, { replace: true });
        onLessonSelect?.(previousLesson);
      }, lessonUrl);
    } else {
      // Go back to menu if no previous lesson
      handleBackToMenu();
    }
  }, [selectedLesson, course, getLessonUrlForCourse, safeNavigate, navigate, onLessonSelect, handleBackToMenu]);

  const handleBack = useCallback(() => {
    log.debug('Mobile', '🎓 [MobileNavigationManager] Back navigation requested');
    
    if (showLessonView) {
      handleBackToMenu();
    } else {
      safeNavigate(() => {
        onBack?.();
      });
    }
  }, [showLessonView, handleBackToMenu, safeNavigate, onBack]);

  // Touch gesture handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enableGestureSupport) return;
    
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
  }, [enableGestureSupport]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!enableGestureSupport || !touchStartRef.current) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;
    
    // Detect swipe gestures
    const minSwipeDistance = 50;
    const maxSwipeTime = 300;
    
    if (deltaTime < maxSwipeTime) {
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
        // Horizontal swipe
        if (deltaX > 0) {
          // Swipe right - go back
          handleBack();
          triggerHapticFeedback('medium');
        } else {
          // Swipe left - go to next lesson
          if (showLessonView) {
            handleNextLesson();
            triggerHapticFeedback('medium');
          }
        }
      } else if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > minSwipeDistance) {
        // Vertical swipe
        if (deltaY > 0) {
          // Swipe down - could be used for menu or other actions
          log.debug('Mobile', '🎓 [MobileNavigationManager] Swipe down detected');
        } else {
          // Swipe up - could be used for next section or other actions
          log.debug('Mobile', '🎓 [MobileNavigationManager] Swipe up detected');
        }
      }
    }
    
    // Detect double tap
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;
    if (timeSinceLastTap < 300) {
      // Double tap detected - could be used for zoom or other actions
      log.debug('Mobile', '🎓 [MobileNavigationManager] Double tap detected');
      triggerHapticFeedback('light');
    }
    lastTapRef.current = now;
    
    touchStartRef.current = null;
  }, [enableGestureSupport, handleBack, handleNextLesson, showLessonView, triggerHapticFeedback]);

  // Keyboard navigation handlers
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enableKeyboardSupport || !isMobile) return;
    
    // Prevent default behavior for navigation keys
    const navigationKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Escape', 'Backspace'];
    if (navigationKeys.includes(e.key)) {
      e.preventDefault();
    }
    
    switch (e.key) {
      case 'ArrowLeft':
        handleBack();
        break;
      case 'ArrowRight':
        if (showLessonView) {
          handleNextLesson();
        }
        break;
      case 'ArrowUp':
        // Could be used for previous lesson or section
        if (showLessonView) {
          handlePreviousLesson();
        }
        break;
      case 'ArrowDown':
        // Could be used for next lesson or section
        if (showLessonView) {
          handleNextLesson();
        }
        break;
      case 'Escape':
        handleBack();
        break;
      case 'Backspace':
        // Handle browser back button simulation
        if (canGoBack) {
          handleGoBack();
        } else {
          handleBack();
        }
        break;
    }
  }, [enableKeyboardSupport, isMobile, handleBack, handleNextLesson, handlePreviousLesson, showLessonView, canGoBack]);

  // History navigation
  const handleGoBack = useCallback(() => {
    if (!canGoBack) return;
    
    const previousUrl = navigationHistory[currentHistoryIndex - 1];
    if (previousUrl) {
      safeNavigate(() => {
        navigate(previousUrl, { replace: true });
        setCurrentHistoryIndex(prev => prev - 1);
      });
    }
  }, [canGoBack, navigationHistory, currentHistoryIndex, safeNavigate, navigate]);

  const handleGoForward = useCallback(() => {
    if (!canGoForward) return;
    
    const nextUrl = navigationHistory[currentHistoryIndex + 1];
    if (nextUrl) {
      safeNavigate(() => {
        navigate(nextUrl, { replace: true });
        setCurrentHistoryIndex(prev => prev + 1);
      });
    }
  }, [canGoForward, navigationHistory, currentHistoryIndex, safeNavigate, navigate]);

  // Deep linking support
  const handleDeepLink = useCallback((url: string) => {
    if (!enableDeepLinking) return;
    
    log.debug('Mobile', '🎓 [MobileNavigationManager] Deep link requested:', url);
    
    try {
      // Parse the URL to determine the target
      const urlObj = new URL(url, window.location.origin);
      const pathname = urlObj.pathname;
      
      // Handle different types of deep links
      if (pathname.includes('/space/classroom/') && pathname.includes('/lesson/')) {
        // Lesson deep link
        const lessonId = pathname.split('/lesson/')[1];
        const lesson = course?.modules.flatMap(m => m.lessons).find(l => l.id === lessonId);
        if (lesson) {
          onLessonSelect?.(lesson);
        }
      } else if (pathname.includes('/space/classroom/')) {
        // Course deep link
        handleBackToMenu();
      }
      
      safeNavigate(() => {
        navigate(url, { replace: true });
      }, url);
    } catch (error) {
      console.error('Deep link error:', error);
      setNavigationError('Invalid deep link');
    }
  }, [enableDeepLinking, course, onLessonSelect, handleBackToMenu, safeNavigate, navigate]);

  // Performance optimizations
  useEffect(() => {
    if (!enablePerformanceOptimization) return;
    
    // Intersection Observer for performance
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInViewport(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    
    // Observe the document body
    observer.observe(document.body);
    
    return () => observer.disconnect();
  }, [enablePerformanceOptimization]);

  // Visibility change handling
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Keyboard event listeners
  useEffect(() => {
    if (!enableKeyboardSupport) return;
    
    const keyboardHandler = (e: KeyboardEvent) => handleKeyDown(e);
    keyboardListenerRef.current = keyboardHandler;
    
    document.addEventListener('keydown', keyboardHandler);
    
    return () => {
      document.removeEventListener('keydown', keyboardHandler);
      keyboardListenerRef.current = null;
    };
  }, [enableKeyboardSupport, handleKeyDown]);

  // Initialize navigation history - FIXED: Prevent infinite loops
  useEffect(() => {
    if (enableNavigationHistory && location.pathname) {
      const currentUrl = location.pathname + location.search;
      // Only add to history if it's different from the last entry
      if (navigationHistory.length === 0 || navigationHistory[navigationHistory.length - 1] !== currentUrl) {
        addToHistory(currentUrl);
      }
    }
  }, [enableNavigationHistory, location.pathname, location.search]); // Removed addToHistory dependency

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
      if (gestureTimeoutRef.current) {
        clearTimeout(gestureTimeoutRef.current);
      }
    };
  }, []);

  // Development logging
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 [MobileNavigationManager] Component render:', {
      courseId: course?.id,
      courseShortId: course?.short_id,
      courseSlug: course?.slug,
      selectedLessonId: selectedLesson?.id,
      isMobile,
      showCourseOverview,
      showLessonView,
      navigationHistoryLength: navigationHistory.length,
      currentHistoryIndex,
      canGoBack,
      canGoForward,
      isNavigating,
      isInViewport,
      isVisible
    });
  }

  // Navigation state for parent components
  const navigationState = useMemo(() => ({
    canGoBack,
    canGoForward,
    isNavigating,
    navigationError,
    historyLength: navigationHistory.length,
    currentIndex: currentHistoryIndex
  }), [canGoBack, canGoForward, isNavigating, navigationError, navigationHistory.length, currentHistoryIndex]);

  // Expose navigation methods to parent - FIXED: Proper ref type
  const navigationRef = useRef<{
    handleBackToMenu: () => void;
    handleNextLesson: () => void;
    handlePreviousLesson: () => void;
    handleBack: () => void;
    handleGoBack: () => void;
    handleGoForward: () => void;
    handleDeepLink: (url: string) => void;
    navigationState: typeof navigationState;
  } | null>(null);

  React.useImperativeHandle(navigationRef, () => ({
    handleBackToMenu,
    handleNextLesson,
    handlePreviousLesson,
    handleBack,
    handleGoBack,
    handleGoForward,
    handleDeepLink,
    navigationState
  }), [handleBackToMenu, handleNextLesson, handlePreviousLesson, handleBack, handleGoBack, handleGoForward, handleDeepLink, navigationState]);

  return (
    <div
      className="mobile-navigation-manager"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role="navigation"
      aria-label="Mobile navigation manager"
      style={{ display: 'contents' }} // Don't render as a visible element
    >
      {/* Error Display */}
      {navigationError && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-700 text-sm">{navigationError}</p>
          <button
            onClick={() => setNavigationError(null)}
            className="absolute top-2 right-2 text-red-500 hover:text-red-700"
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {/* Loading Indicator */}
      {isNavigating && (
        <div className="fixed top-4 left-4 z-50 bg-blue-50 border border-blue-200 rounded-lg p-2">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 animate-spin rounded-full border-2 border-blue-300 border-t-blue-600"></div>
            <span className="text-blue-700 text-sm">Navigating...</span>
          </div>
        </div>
      )}

      {/* Navigation Queue Indicator */}
      {navigationQueue.length > 0 && (
        <div className="fixed top-4 right-4 z-50 bg-yellow-50 border border-yellow-200 rounded-lg p-2">
          <span className="text-yellow-700 text-sm">
            {navigationQueue.length} navigation(s) queued
          </span>
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
    prevProps.onBackToMenu === nextProps.onBackToMenu &&
    prevProps.onNextLesson === nextProps.onNextLesson &&
    prevProps.onLessonSelect === nextProps.onLessonSelect &&
    prevProps.onBack === nextProps.onBack &&
    prevProps.enableHapticFeedback === nextProps.enableHapticFeedback &&
    prevProps.enableAnimations === nextProps.enableAnimations &&
    prevProps.enableGestureSupport === nextProps.enableGestureSupport &&
    prevProps.enableKeyboardSupport === nextProps.enableKeyboardSupport &&
    prevProps.enableDeepLinking === nextProps.enableDeepLinking &&
    prevProps.enableNavigationHistory === nextProps.enableNavigationHistory &&
    prevProps.enableAccessibility === nextProps.enableAccessibility &&
    prevProps.enablePerformanceOptimization === nextProps.enablePerformanceOptimization
  );
});

export default MobileNavigationManager; 