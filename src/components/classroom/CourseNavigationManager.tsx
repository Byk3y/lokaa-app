import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { log } from '@/utils/logger';
import { useAuth } from '@/contexts/AuthContext';
import { useSpace } from '@/contexts/SpaceContext';
import { useCourseNavigation } from '@/hooks/classroom/useCourseNavigation';
import type { CourseDetailData, CourseDetailViewProps } from '@/types/classroom/courseDetail';

interface CourseNavigationManagerProps extends CourseDetailViewProps {
  enableNavigationHistory?: boolean;
  enableDeepLinking?: boolean;
  enableNavigationAnalytics?: boolean;
  enableBreadcrumbLogic?: boolean;
  enableRouteManagement?: boolean;
  enableMobileNavigation?: boolean;
  enableNavigationStatePersistence?: boolean;
  onNavigationChange?: (navigationState: any) => void;
  onRouteChange?: (route: string) => void;
  onLessonSelect?: (lesson: any) => void;
}

interface CourseNavigationManagerReturn {
  // Navigation state
  selectedLesson: any;
  isMobile: boolean;
  showCourseOverview: boolean;
  showLessonView: boolean;
  currentRoute: string;
  navigationHistory: string[];
  breadcrumbs: Array<{ title: string; path: string; active: boolean }>;
  
  // Navigation operations
  handleMobileLessonSelect: (lesson: any) => void;
  handleNextLesson: () => void;
  handleBackToMenu: () => void;
  setSelectedLesson: (lesson: any) => void;
  navigateToLesson: (lessonId: string) => void;
  navigateToModule: (moduleId: string) => void;
  navigateToCourse: (courseId: string) => void;
  goBack: () => void;
  goForward: () => void;
  
  // Route management
  updateRoute: (route: string) => void;
  updateSearchParams: (params: Record<string, string>) => void;
  getCurrentRoute: () => string;
  getRouteParams: () => Record<string, string>;
  
  // Breadcrumb operations
  generateBreadcrumbs: () => Array<{ title: string; path: string; active: boolean }>;
  navigateToBreadcrumb: (index: number) => void;
  
  // Navigation history
  addToHistory: (route: string) => void;
  clearHistory: () => void;
  getHistory: () => string[];
  
  // Deep linking
  handleDeepLink: (url: string) => void;
  generateDeepLink: (lessonId?: string, moduleId?: string) => string;
  
  // Navigation analytics
  trackNavigation: (action: string, data?: any) => void;
  getNavigationStats: () => any;
  
  // Mobile navigation
  handleMobileNavigation: (action: string, data?: any) => void;
  isMobileNavigationEnabled: boolean;
  
  // Navigation state persistence
  saveNavigationState: () => void;
  loadNavigationState: () => any;
  clearNavigationState: () => void;
}

/**
 * CourseNavigationManager - Handles all navigation-related operations for course detail views
 * 
 * Responsibilities:
 * - Navigation logic and state management
 * - Route management and URL synchronization
 * - Breadcrumb logic and generation
 * - Navigation history management
 * - Deep linking support
 * - Navigation analytics and tracking
 * - Mobile-specific navigation patterns
 * - Navigation state persistence
 */
const CourseNavigationManager: React.FC<CourseNavigationManagerProps> = ({
  courseId,
  onBack,
  moduleId,
  lessonId,
  enableNavigationHistory = true,
  enableDeepLinking = true,
  enableNavigationAnalytics = true,
  enableBreadcrumbLogic = true,
  enableRouteManagement = true,
  enableMobileNavigation = true,
  enableNavigationStatePersistence = true,
  onNavigationChange,
  onRouteChange,
  onLessonSelect,
}) => {
  const navigate = useNavigate();
  const { subdomain } = useParams<{ subdomain: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Mobile detection and view state
  const mdParam = searchParams.get('md');
  
  const { user } = useAuth();
  const { space } = useSpace();
  
  // Navigation state
  const [currentRoute, setCurrentRoute] = useState<string>('');
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ title: string; path: string; active: boolean }>>([]);
  const [navigationStats, setNavigationStats] = useState<any>({
    totalNavigations: 0,
    mobileNavigations: 0,
    desktopNavigations: 0,
    lessonSelections: 0,
    moduleSelections: 0,
  });

  // Use the navigation management hook
  const {
    selectedLesson,
    isMobile,
    showCourseOverview,
    showLessonView,
    handleMobileLessonSelect,
    handleNextLesson,
    handleBackToMenu,
    setSelectedLesson
  } = useCourseNavigation({
    course: null, // Will be set by parent
    onLessonChange: (lesson) => {
      log.debug('NavigationManager', '🎓 [CourseNavigationManager] Lesson changed:', lesson?.title);
      onLessonSelect?.(lesson);
      trackNavigation('lesson_select', { lessonId: lesson?.id, lessonTitle: lesson?.title });
    },
    onNavigationStateChange: (state) => {
      log.debug('NavigationManager', '🎓 [CourseNavigationManager] Navigation state changed:', state);
      onNavigationChange?.(state);
    }
  });

  log.debug('NavigationManager', '🎓 [CourseNavigationManager] Component rendered with courseId:', courseId);

  // Initialize current route
  useEffect(() => {
    const route = window.location.pathname;
    setCurrentRoute(route);
    if (enableNavigationHistory) {
      addToHistory(route);
    }
  }, [enableNavigationHistory]);

  // Update route when URL changes
  useEffect(() => {
    const handleRouteChange = () => {
      const newRoute = window.location.pathname;
      if (newRoute !== currentRoute) {
        setCurrentRoute(newRoute);
        onRouteChange?.(newRoute);
        if (enableNavigationHistory) {
          addToHistory(newRoute);
        }
      }
    };

    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, [currentRoute, enableNavigationHistory, onRouteChange]);

  // Generate breadcrumbs when route changes
  useEffect(() => {
    if (enableBreadcrumbLogic) {
      const newBreadcrumbs = generateBreadcrumbs();
      setBreadcrumbs(newBreadcrumbs);
    }
  }, [currentRoute, courseId, moduleId, lessonId, enableBreadcrumbLogic]);

  // Navigation operations
  const navigateToLesson = useCallback((lessonId: string) => {
    log.debug('NavigationManager', '🎓 [CourseNavigationManager] Navigating to lesson:', lessonId);
    
    if (enableRouteManagement) {
      const newRoute = `/nocode-architects/course/${courseId}?lesson=${lessonId}`;
      navigate(newRoute);
      updateRoute(newRoute);
    }
    
    trackNavigation('navigate_to_lesson', { lessonId });
  }, [courseId, enableRouteManagement, navigate]);

  const navigateToModule = useCallback((moduleId: string) => {
    log.debug('NavigationManager', '🎓 [CourseNavigationManager] Navigating to module:', moduleId);
    
    if (enableRouteManagement) {
      const newRoute = `/nocode-architects/course/${courseId}?module=${moduleId}`;
      navigate(newRoute);
      updateRoute(newRoute);
    }
    
    trackNavigation('navigate_to_module', { moduleId });
  }, [courseId, enableRouteManagement, navigate]);

  const navigateToCourse = useCallback((courseId: string) => {
    log.debug('NavigationManager', '🎓 [CourseNavigationManager] Navigating to course:', courseId);
    
    if (enableRouteManagement) {
      const newRoute = `/nocode-architects/course/${courseId}`;
      navigate(newRoute);
      updateRoute(newRoute);
    }
    
    trackNavigation('navigate_to_course', { courseId });
  }, [enableRouteManagement, navigate]);

  const goBack = useCallback(() => {
    log.debug('NavigationManager', '🎓 [CourseNavigationManager] Going back');
    
    if (navigationHistory.length > 1) {
      const previousRoute = navigationHistory[navigationHistory.length - 2];
      navigate(previousRoute);
      trackNavigation('go_back', { from: currentRoute, to: previousRoute });
    } else {
      onBack?.();
    }
  }, [navigationHistory, currentRoute, navigate, onBack]);

  const goForward = useCallback(() => {
    log.debug('NavigationManager', '🎓 [CourseNavigationManager] Going forward');
    
    // This would require a more sophisticated history management
    // For now, we'll just track the action
    trackNavigation('go_forward');
  }, []);

  // Route management
  const updateRoute = useCallback((route: string) => {
    setCurrentRoute(route);
    if (enableNavigationHistory) {
      addToHistory(route);
    }
  }, [enableNavigationHistory]);

  const updateSearchParams = useCallback((params: Record<string, string>) => {
    const newSearchParams = new URLSearchParams(searchParams);
    Object.entries(params).forEach(([key, value]) => {
      newSearchParams.set(key, value);
    });
    setSearchParams(newSearchParams);
  }, [searchParams, setSearchParams]);

  const getCurrentRoute = useCallback(() => {
    return currentRoute;
  }, [currentRoute]);

  const getRouteParams = useCallback(() => {
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return params;
  }, [searchParams]);

  // Breadcrumb operations
  const generateBreadcrumbs = useCallback(() => {
    const breadcrumbs: Array<{ title: string; path: string; active: boolean }> = [];
    
    // Home
    breadcrumbs.push({
      title: 'Home',
      path: '/nocode-architects/space',
      active: currentRoute === '/nocode-architects/space'
    });
    
    // Classroom
    breadcrumbs.push({
      title: 'Classroom',
      path: '/nocode-architects/space/classroom',
      active: currentRoute === '/nocode-architects/space/classroom'
    });
    
    // Course (if we have a courseId)
    if (courseId) {
      breadcrumbs.push({
        title: 'Course',
        path: `/nocode-architects/course/${courseId}`,
        active: currentRoute.includes(`/nocode-architects/course/${courseId}`)
      });
    }
    
    // Module (if we have a moduleId)
    if (moduleId) {
      breadcrumbs.push({
        title: 'Module',
        path: `/nocode-architects/course/${courseId}?module=${moduleId}`,
        active: currentRoute.includes(`module=${moduleId}`)
      });
    }
    
    // Lesson (if we have a lessonId)
    if (lessonId) {
      breadcrumbs.push({
        title: 'Lesson',
        path: `/nocode-architects/course/${courseId}?lesson=${lessonId}`,
        active: currentRoute.includes(`lesson=${lessonId}`)
      });
    }
    
    return breadcrumbs;
  }, [currentRoute, courseId, moduleId, lessonId]);

  const navigateToBreadcrumb = useCallback((index: number) => {
    if (index >= 0 && index < breadcrumbs.length) {
      const breadcrumb = breadcrumbs[index];
      navigate(breadcrumb.path);
      trackNavigation('breadcrumb_navigation', { index, path: breadcrumb.path });
    }
  }, [breadcrumbs, navigate]);

  // Navigation history
  const addToHistory = useCallback((route: string) => {
    setNavigationHistory(prev => {
      const newHistory = [...prev, route];
      // Keep only last 10 routes
      return newHistory.slice(-10);
    });
  }, []);

  const clearHistory = useCallback(() => {
    setNavigationHistory([]);
  }, []);

  const getHistory = useCallback(() => {
    return navigationHistory;
  }, [navigationHistory]);

  // Deep linking
  const handleDeepLink = useCallback((url: string) => {
    log.debug('NavigationManager', '🎓 [CourseNavigationManager] Handling deep link:', url);
    
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      const params = urlObj.searchParams;
      
      // Extract course, module, and lesson IDs
      const courseIdMatch = path.match(/\/course\/([^\/\?]+)/);
      const courseId = courseIdMatch?.[1];
      
      if (courseId) {
        navigateToCourse(courseId);
        
        const moduleId = params.get('module');
        if (moduleId) {
          navigateToModule(moduleId);
        }
        
        const lessonId = params.get('lesson');
        if (lessonId) {
          navigateToLesson(lessonId);
        }
      }
      
      trackNavigation('deep_link', { url });
    } catch (error) {
      log.error('NavigationManager', '🎓 [CourseNavigationManager] Error handling deep link:', error);
    }
  }, [navigateToCourse, navigateToModule, navigateToLesson]);

  const generateDeepLink = useCallback((lessonId?: string, moduleId?: string) => {
    let link = `/nocode-architects/course/${courseId}`;
    const params = new URLSearchParams();
    
    if (moduleId) {
      params.set('module', moduleId);
    }
    
    if (lessonId) {
      params.set('lesson', lessonId);
    }
    
    if (params.toString()) {
      link += `?${params.toString()}`;
    }
    
    return link;
  }, [courseId]);

  // Navigation analytics
  const trackNavigation = useCallback((action: string, data?: any) => {
    if (!enableNavigationAnalytics) return;
    
    log.debug('NavigationManager', '🎓 [CourseNavigationManager] Tracking navigation:', action, data);
    
    setNavigationStats(prev => ({
      ...prev,
      totalNavigations: prev.totalNavigations + 1,
      mobileNavigations: isMobile ? prev.mobileNavigations + 1 : prev.mobileNavigations,
      desktopNavigations: !isMobile ? prev.desktopNavigations + 1 : prev.desktopNavigations,
      lessonSelections: action === 'lesson_select' ? prev.lessonSelections + 1 : prev.lessonSelections,
      moduleSelections: action === 'navigate_to_module' ? prev.moduleSelections + 1 : prev.moduleSelections,
    }));
    
    // Here you could send analytics to your analytics service
    // analytics.track('navigation', { action, data, timestamp: Date.now() });
  }, [enableNavigationAnalytics, isMobile]);

  const getNavigationStats = useCallback(() => {
    return navigationStats;
  }, [navigationStats]);

  // Mobile navigation
  const handleMobileNavigation = useCallback((action: string, data?: any) => {
    if (!enableMobileNavigation) return;
    
    log.debug('NavigationManager', '🎓 [CourseNavigationManager] Mobile navigation:', action, data);
    
    switch (action) {
      case 'lesson_select':
        handleMobileLessonSelect(data.lesson);
        break;
      case 'next_lesson':
        handleNextLesson();
        break;
      case 'back_to_menu':
        handleBackToMenu();
        break;
      default:
        log.warn('NavigationManager', '🎓 [CourseNavigationManager] Unknown mobile navigation action:', action);
    }
    
    trackNavigation(`mobile_${action}`, data);
  }, [enableMobileNavigation, handleMobileLessonSelect, handleNextLesson, handleBackToMenu]);

  const isMobileNavigationEnabled = useMemo(() => {
    return enableMobileNavigation && isMobile;
  }, [enableMobileNavigation, isMobile]);

  // Navigation state persistence
  const saveNavigationState = useCallback(() => {
    if (!enableNavigationStatePersistence) return;
    
    const state = {
      currentRoute,
      selectedLesson: selectedLesson?.id,
      navigationHistory,
      timestamp: Date.now()
    };
    
    localStorage.setItem('courseNavigationState', JSON.stringify(state));
    log.debug('NavigationManager', '🎓 [CourseNavigationManager] Navigation state saved');
  }, [enableNavigationStatePersistence, currentRoute, selectedLesson, navigationHistory]);

  const loadNavigationState = useCallback(() => {
    if (!enableNavigationStatePersistence) return null;
    
    try {
      const saved = localStorage.getItem('courseNavigationState');
      if (saved) {
        const state = JSON.parse(saved);
        log.debug('NavigationManager', '🎓 [CourseNavigationManager] Navigation state loaded');
        return state;
      }
    } catch (error) {
      log.error('NavigationManager', '🎓 [CourseNavigationManager] Error loading navigation state:', error);
    }
    
    return null;
  }, [enableNavigationStatePersistence]);

  const clearNavigationState = useCallback(() => {
    if (!enableNavigationStatePersistence) return;
    
    localStorage.removeItem('courseNavigationState');
    log.debug('NavigationManager', '🎓 [CourseNavigationManager] Navigation state cleared');
  }, [enableNavigationStatePersistence]);

  // Save navigation state on changes
  useEffect(() => {
    if (enableNavigationStatePersistence) {
      saveNavigationState();
    }
  }, [currentRoute, selectedLesson, navigationHistory, enableNavigationStatePersistence, saveNavigationState]);

  // Memoized return object to prevent unnecessary re-renders
  const navigationManagerReturn: CourseNavigationManagerReturn = useMemo(() => ({
    // Navigation state
    selectedLesson,
    isMobile,
    showCourseOverview,
    showLessonView,
    currentRoute,
    navigationHistory,
    breadcrumbs,
    
    // Navigation operations
    handleMobileLessonSelect,
    handleNextLesson,
    handleBackToMenu,
    setSelectedLesson,
    navigateToLesson,
    navigateToModule,
    navigateToCourse,
    goBack,
    goForward,
    
    // Route management
    updateRoute,
    updateSearchParams,
    getCurrentRoute,
    getRouteParams,
    
    // Breadcrumb operations
    generateBreadcrumbs,
    navigateToBreadcrumb,
    
    // Navigation history
    addToHistory,
    clearHistory,
    getHistory,
    
    // Deep linking
    handleDeepLink,
    generateDeepLink,
    
    // Navigation analytics
    trackNavigation,
    getNavigationStats,
    
    // Mobile navigation
    handleMobileNavigation,
    isMobileNavigationEnabled,
    
    // Navigation state persistence
    saveNavigationState,
    loadNavigationState,
    clearNavigationState,
  }), [
    selectedLesson,
    isMobile,
    showCourseOverview,
    showLessonView,
    currentRoute,
    navigationHistory,
    breadcrumbs,
    handleMobileLessonSelect,
    handleNextLesson,
    handleBackToMenu,
    setSelectedLesson,
    navigateToLesson,
    navigateToModule,
    navigateToCourse,
    goBack,
    goForward,
    updateRoute,
    updateSearchParams,
    getCurrentRoute,
    getRouteParams,
    generateBreadcrumbs,
    navigateToBreadcrumb,
    addToHistory,
    clearHistory,
    getHistory,
    handleDeepLink,
    generateDeepLink,
    trackNavigation,
    getNavigationStats,
    handleMobileNavigation,
    isMobileNavigationEnabled,
    saveNavigationState,
    loadNavigationState,
    clearNavigationState,
  ]);

  return navigationManagerReturn;
};

export default CourseNavigationManager; 