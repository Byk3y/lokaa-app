import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { log } from '@/utils/logger';
import { getLessonUrl } from '@/utils/slugUtils';
import type { CourseDetailData, CourseLesson } from '@/types/classroom/courseDetail';

interface MobileNavigationConfig {
  course: CourseDetailData | null;
  selectedLesson: CourseLesson | null;
  showLessonView?: boolean;
  onBackToMenu?: () => void;
  onNextLesson?: () => void;
  onLessonSelect?: (lesson: CourseLesson) => void;
  onBack?: () => void;
}

interface MobileNavigationHandlers {
  handleBackToMenu: () => void;
  handleNextLesson: () => void;
  handlePreviousLesson: () => void;
  handleBack: () => void;
}

/**
 * Simple mobile navigation hook
 * Handles core navigation logic without over-engineering
 */
export function useMobileNavigation(config: MobileNavigationConfig): MobileNavigationHandlers {
  const {
    course,
    selectedLesson,
    showLessonView = false,
    onBackToMenu,
    onNextLesson,
    onLessonSelect,
    onBack
  } = config;

  const navigate = useNavigate();
  const { subdomain } = useParams<{ subdomain: string }>();

  // Simple navigation to menu
  const handleBackToMenu = useCallback(() => {
    log.debug('Mobile', '🎓 [useMobileNavigation] Back to menu requested');
    
    if (!subdomain || !course?.short_id) return;
    
    const menuUrl = `/${subdomain}/space/classroom/${course.short_id}?md=menu`;
    navigate(menuUrl, { replace: true });
    onBackToMenu?.();
  }, [subdomain, course?.short_id, navigate, onBackToMenu]);

  // Simple next lesson navigation
  const handleNextLesson = useCallback(() => {
    if (!selectedLesson || !course) return;
    
    log.debug('Mobile', '🎓 [useMobileNavigation] Next lesson requested');
    
    const allLessons = course.modules.flatMap(m => m.lessons);
    const currentIndex = allLessons.findIndex(l => l.id === selectedLesson.id);
    const nextLesson = allLessons[currentIndex + 1];
    
    if (nextLesson) {
      if (!subdomain || !course.short_id) return;
      
      const lessonUrl = getLessonUrl(subdomain, course.short_id, nextLesson.id);
      navigate(lessonUrl, { replace: true });
      onLessonSelect?.(nextLesson);
      onNextLesson?.();
    } else {
      toast({
        title: "No More Lessons",
        description: "You've reached the end of this course.",
        duration: 2000
      });
    }
  }, [selectedLesson, course, subdomain, navigate, onLessonSelect, onNextLesson]);

  // Simple previous lesson navigation
  const handlePreviousLesson = useCallback(() => {
    if (!selectedLesson || !course) return;
    
    log.debug('Mobile', '🎓 [useMobileNavigation] Previous lesson requested');
    
    const allLessons = course.modules.flatMap(m => m.lessons);
    const currentIndex = allLessons.findIndex(l => l.id === selectedLesson.id);
    const previousLesson = allLessons[currentIndex - 1];
    
    if (previousLesson) {
      if (!subdomain || !course.short_id) return;
      
      const lessonUrl = getLessonUrl(subdomain, course.short_id, previousLesson.id);
      navigate(lessonUrl, { replace: true });
      onLessonSelect?.(previousLesson);
    } else {
      // Go back to menu if no previous lesson
      handleBackToMenu();
    }
  }, [selectedLesson, course, subdomain, navigate, onLessonSelect, handleBackToMenu]);

  // Simple back navigation
  const handleBack = useCallback(() => {
    log.debug('Mobile', '🎓 [useMobileNavigation] Back navigation requested');
    
    if (showLessonView) {
      handleBackToMenu();
    } else {
      onBack?.();
    }
  }, [showLessonView, handleBackToMenu, onBack]);

  return {
    handleBackToMenu,
    handleNextLesson,
    handlePreviousLesson,
    handleBack
  };
}