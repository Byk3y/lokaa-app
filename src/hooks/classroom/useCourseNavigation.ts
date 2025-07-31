import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { log } from '@/utils/logger';
import { getLessonUrl } from '@/utils/slugUtils';
import type { CourseDetailData, CourseLesson } from '@/types/classroom/courseDetail';

interface UseCourseNavigationReturn {
  // Navigation state
  selectedLesson: CourseLesson | null;
  isMobile: boolean;
  showCourseOverview: boolean;
  showLessonView: boolean;
  
  // Navigation handlers
  handleMobileLessonSelect: (lesson: CourseLesson) => void;
  handleNextLesson: () => void;
  handleBackToMenu: () => void;
  setSelectedLesson: (lesson: CourseLesson | null) => void;
  
  // URL synchronization
  syncUrlWithLesson: (lesson: CourseLesson) => void;
  syncUrlWithMenu: () => void;
  
  // Navigation utilities
  getLessonUrl: (lessonId: string) => string;
  getMenuUrl: () => string;
}

interface UseCourseNavigationProps {
  course: CourseDetailData | null;
  onLessonChange?: (lesson: CourseLesson | null) => void;
  onNavigationStateChange?: (state: {
    isMobile: boolean;
    showCourseOverview: boolean;
    showLessonView: boolean;
  }) => void;
}

export const useCourseNavigation = (props: UseCourseNavigationProps): UseCourseNavigationReturn => {
  const { course, onLessonChange, onNavigationStateChange } = props;
  
  const navigate = useNavigate();
  const { subdomain } = useParams<{ subdomain: string }>();
  const [searchParams] = useSearchParams();
  
  // Mobile detection and view state
  const isMobile = useIsMobile();
  const mdParam = searchParams.get('md');
  
  // Mobile view states - memoized to prevent unnecessary re-renders
  const showCourseOverview = useMemo(() => 
    isMobile && (!mdParam || mdParam === 'menu'), 
    [isMobile, mdParam]
  );
  const showLessonView = useMemo(() => 
    isMobile && mdParam && mdParam !== 'menu', 
    [isMobile, mdParam]
  );
  
  // Local state
  const [selectedLesson, setSelectedLessonState] = useState<CourseLesson | null>(null);
  
  // URL utilities - use shared getLessonUrl from slugUtils
  const getLessonUrlForCourse = useCallback((lessonId: string): string => {
    if (!subdomain || !course?.short_id) return '';
    return getLessonUrl(subdomain, course.short_id, lessonId);
  }, [subdomain, course?.short_id]);
  
  const getMenuUrl = useCallback((): string => {
    if (!subdomain || !course?.short_id) return '';
    return `/${subdomain}/space/classroom/${course.short_id}?md=menu`;
  }, [subdomain, course?.short_id]);
  
  // URL synchronization functions
  const syncUrlWithLesson = useCallback((lesson: CourseLesson) => {
    const lessonUrl = getLessonUrlForCourse(lesson.id);
    if (lessonUrl) {
      navigate(lessonUrl, { replace: true });
    }
  }, [getLessonUrlForCourse, navigate]);
  
  const syncUrlWithMenu = useCallback(() => {
    const menuUrl = getMenuUrl();
    if (menuUrl) {
      navigate(menuUrl, { replace: true });
    }
  }, [getMenuUrl, navigate]);
  
  // Navigation handlers
  const handleMobileLessonSelect = useCallback((lesson: CourseLesson) => {
    log.debug('Hook', '🎓 [useCourseNavigation] Mobile lesson selected:', lesson.title);
    
    // Update URL
    syncUrlWithLesson(lesson);
    
    // Update local state for immediate UI feedback
    setSelectedLessonState(lesson);
    
    // Notify parent component
    onLessonChange?.(lesson);
  }, [syncUrlWithLesson, onLessonChange]);
  
  const handleNextLesson = useCallback(() => {
    if (!selectedLesson || !course) return;
    
    log.debug('Hook', '🎓 [useCourseNavigation] Finding next lesson');
    
    // Find next lesson in sequence
    const allLessons = course.modules.flatMap(m => m.lessons);
    const currentIndex = allLessons.findIndex(l => l.id === selectedLesson.id);
    const nextLesson = allLessons[currentIndex + 1];
    
    if (nextLesson) {
      log.debug('Hook', '🎓 [useCourseNavigation] Navigating to next lesson:', nextLesson.title);
      handleMobileLessonSelect(nextLesson);
    } else {
      log.debug('Hook', '🎓 [useCourseNavigation] No next lesson found');
    }
  }, [selectedLesson, course, handleMobileLessonSelect]);
  
  const handleBackToMenu = useCallback(() => {
    log.debug('Hook', '🎓 [useCourseNavigation] Back to menu requested');
    syncUrlWithMenu();
  }, [syncUrlWithMenu]);
  
  // Wrapper for setSelectedLesson to include callbacks
  const setSelectedLesson = useCallback((lesson: CourseLesson | null) => {
    setSelectedLessonState(lesson);
    onLessonChange?.(lesson);
  }, [onLessonChange]);
  
  // DISABLED: Auto-select first lesson if none selected (Desktop only)
  // This was causing automatic navigation to course details from classroom overview
  useEffect(() => {
    if (!course || !course.modules || course.modules.length === 0) return;
    
    const currentUrl = window.location.pathname + window.location.search;
    const isOnCourseRoute = currentUrl.match(/^\/[^\/]+\/space\/classroom\/[^\/]+/);
    const isOnClassroomOverview = currentUrl.match(/^\/[^\/]+\/space\/classroom$/);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [useCourseNavigation] Lesson selection logic:', {
        currentUrl,
        isOnCourseRoute: !!isOnCourseRoute,
        isOnClassroomOverview: !!isOnClassroomOverview,
        hasSelectedLesson: !!selectedLesson,
        mdParam,
        hasCourse: !!course,
        hasModules: !!(course?.modules?.length),
        courseId: course?.id
      });
    }
    
    // Skip if not on course route or on classroom overview
    if (!isOnCourseRoute || isOnClassroomOverview) {
      log.debug('Hook', '🎓 [useCourseNavigation] Skipping lesson selection - not on course route');
      return;
    }

    // 1. If URL has specific lesson ID (md parameter), select that lesson
    if (mdParam && mdParam !== 'menu') {
      const targetLesson = course.modules
        .flatMap(module => module.lessons)
        .find(lesson => lesson.id === mdParam);
      
      if (targetLesson && selectedLesson?.id !== targetLesson.id) {
        log.debug('Hook', '🎓 [useCourseNavigation] Selecting lesson from URL:', targetLesson.title);
        setSelectedLesson(targetLesson);
        return;
      }
    }

    // 2. If no lesson selected and not mobile overview, auto-select a lesson
    if (!selectedLesson && !(isMobile && (!mdParam || mdParam === 'menu'))) {
      
      // Try to restore last viewed lesson first
      const lastViewedLessonId = localStorage.getItem(`lastViewedLesson_${course.id}`);
      
      if (lastViewedLessonId) {
        const lastViewedLesson = course.modules
          .flatMap(module => module.lessons)
          .find(lesson => lesson.id === lastViewedLessonId);
        
        if (lastViewedLesson) {
          log.debug('Hook', '🎓 [useCourseNavigation] Restoring last viewed lesson:', lastViewedLesson.title);
          setSelectedLesson(lastViewedLesson);
          return;
        }
      }
      
      // Fallback to first available lesson
      const firstModule = course.modules[0];
      if (firstModule.lessons && firstModule.lessons.length > 0) {
        const firstLesson = firstModule.lessons[0];
        log.debug('Hook', '🎓 [useCourseNavigation] Auto-selecting first lesson:', firstLesson.title);
        setSelectedLesson(firstLesson);
      }
    }
  }, [course, selectedLesson, isMobile, mdParam, setSelectedLesson]);

  // DISABLED: Mobile entry point handling - redirect to menu view if no md parameter
  // This was causing unwanted automatic navigation from classroom overview
  useEffect(() => {
    // DISABLED: Commenting out automatic mobile redirect to prevent unwanted navigation
    if (false && isMobile && course && subdomain && course.slug && !mdParam) {
      log.debug('Hook', '🎓 [useCourseNavigation] Mobile entry point - redirecting to menu');
      syncUrlWithMenu();
    }
  }, [isMobile, course, subdomain, mdParam, syncUrlWithMenu]);

  // Save last viewed lesson to localStorage when lesson changes
  useEffect(() => {
    if (selectedLesson && course?.id) {
      localStorage.setItem(`lastViewedLesson_${course.id}`, selectedLesson.id);
      log.debug('Hook', '🎓 [useCourseNavigation] Saved last viewed lesson:', selectedLesson.title);
    }
  }, [selectedLesson, course?.id]);

  // REMOVED: Automatic URL updates when selectedLesson changes
  // This was causing unwanted auto-navigation from classroom overview to course details
  // URL updates now only happen through explicit user actions (handleMobileLessonSelect)

  // Notify parent of navigation state changes
  useEffect(() => {
    onNavigationStateChange?.({
      isMobile,
      showCourseOverview,
      showLessonView
    });
  }, [isMobile, showCourseOverview, showLessonView, onNavigationStateChange]);

  return {
    // Navigation state
    selectedLesson,
    isMobile,
    showCourseOverview,
    showLessonView,
    
    // Navigation handlers
    handleMobileLessonSelect,
    handleNextLesson,
    handleBackToMenu,
    setSelectedLesson,
    
    // URL synchronization
    syncUrlWithLesson,
    syncUrlWithMenu,
    
    // Navigation utilities
    getLessonUrl: getLessonUrlForCourse,
    getMenuUrl,
  };
}; 