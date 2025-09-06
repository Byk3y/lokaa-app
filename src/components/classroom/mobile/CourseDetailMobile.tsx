import React, { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { log } from '@/utils/logger';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useAuth } from '@/contexts/AuthContext';
import { useSpace } from '@/contexts/SpaceContext';
import { useClassroomStore } from '@/stores/classroom/classroomStore';
import { useCachedClassroom } from '@/hooks/useCachedClassroom';
import { useCourseDetail } from '@/hooks/classroom';
import { useCourseProgress } from '@/hooks/classroom/useCourseProgress';
import { useCourseOwnership } from '@/hooks/classroom/useCourseOwnership';
import { useCourseNavigation } from '@/hooks/classroom/useCourseNavigation';
import { useMobileGestures } from '@/hooks/classroom/useMobileGestures';
import { useMobileKeyboard } from '@/hooks/classroom/useMobileKeyboard';
import { useMobileNavigation } from '@/hooks/classroom/useMobileNavigation';
import { useCourseDialogs } from '@/hooks/classroom/useCourseDialogs';
import { useLessonManagement } from '@/hooks/classroom/useLessonManagement';
import CourseOverviewMobile from './CourseOverviewMobile';
import LessonViewMobile from './LessonViewMobile';
import MobileLoadingSkeleton from './MobileLoadingSkeleton';
import MobileErrorState from './MobileErrorState';
import type { 
  CourseModule, 
  CourseLesson, 
  CourseDetailData, 
  CourseDetailViewProps 
} from '@/types/classroom/courseDetail';
import type { CourseDisplayData } from '@/hooks/useClassroomCache';

interface CourseDetailMobileProps extends CourseDetailViewProps {
  onMobileStateChange?: (state: { isMobile: boolean; showTabs: boolean }) => void;
}

/**
 * Mobile Container Component for Course Detail View
 * 
 * Handles all mobile-specific logic including:
 * - Mobile navigation and routing
 * - Mobile state management
 * - Mobile gestures and interactions
 * - Mobile accessibility features
 * - Mobile performance optimizations
 * - Mobile viewport and orientation handling
 * - Mobile keyboard interactions
 */
const CourseDetailMobile: React.FC<CourseDetailMobileProps> = React.memo(({
  courseId,
  onBack,
  moduleId,
  lessonId,
  onMobileStateChange
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { space } = useSpace();
  
  // Refs for mobile interactions
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Mobile detection
  const isMobileDevice = useMediaQuery('(max-width: 768px)');
  
  // Get classroom store for dialog management
  const openCourseDialog = useClassroomStore(state => state.openCourseDialog);
  const openFolderDialog = useClassroomStore(state => state.openFolderDialog);
  
  // Get classroom cache for progress updates
  const { updateCourseProgress: updateCachedProgress } = useCachedClassroom(space?.id, user?.id, space?.owner_id);
  
  // Use the course detail hook with mobile optimizations
  const {
    course,
    loading,
    loadingPhase,
    error,
    fetchCourseDetails,
    refetch,
    silentRefetch,
    invalidateCache,
    retryCount,
    isOffline,
    
    // PHASE 1.3: Extract optimistic update functions for mobile integration
    applyOptimisticUpdate,
    clearOptimisticUpdate,
    clearAllOptimisticUpdates,
    hasOptimisticUpdates
  } = useCourseDetail({
    enableMobileOptimizations: true,
    enableOfflineSupport: true,
    retryOnError: true
  });
  
  // PHASE 1.3: Remove dual state anti-pattern - course data now comes from useCourseDetail hook with optimistic updates

  // Use the progress management hook with optimistic updates
  const { markLessonAsDone, progressLoading, progressError } = useCourseProgress({
    enableLogging: true,
    enableCaching: true,
    userId: user?.id || null,
    onOptimisticUpdate: (updatedCourse) => {
      
      // PHASE 1.3: No longer using local optimistic state - progress updates go to useCourseDetail hook
      // Also update the cached progress
      updateCachedProgress?.(updatedCourse.id, updatedCourse.progress || 0);
    },
    onProgressUpdate: () => {
      // Refresh course data after database update is complete
      refetch();
    }
  });


  // Use the ownership management hook
  const { isOwner, ownershipLoading, error: ownershipError, ownershipDetails } = useCourseOwnership({
    course,
    onOwnershipChange: (isOwner) => {
      log.debug('Mobile', '🎓 [CourseDetailMobile] Ownership changed:', isOwner);
    }
  });

  // Extract admin status from ownership details
  const isAdmin = ownershipDetails?.isGeneralAdmin || ownershipDetails?.isSpaceAdmin || false;

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
    course,
    onLessonChange: (lesson) => {
      log.debug('Mobile', '🎓 [CourseDetailMobile] Lesson changed:', lesson?.title);
    },
    onNavigationStateChange: (state) => {
      log.debug('Mobile', '🎓 [CourseDetailMobile] Navigation state changed:', state);
    }
  });

  // Use the dialog management hook
  const {
    isDeleteDialogOpen,
    isDeleting,
    pageToDelete,
    pageToRevert,
    pageToChangeFolder,
    isReverting,
    isChangingFolder,
    openDeleteCourseDialog,
    closeDeleteCourseDialog,
    openDeletePageDialog,
    closeDeletePageDialog,
    openRevertToDraftDialog,
    closeRevertToDraftDialog,
    openChangeFolderDialog,
    closeChangeFolderDialog,
    handleConfirmDeleteCourse,
    handleConfirmDeletePage,
    handleConfirmRevertToDraft,
    handleConfirmChangeFolder
  } = useCourseDialogs({
    course,
    onCourseDeleted: onBack,
    onPageDeleted: (pageId) => {
      log.debug('Mobile', '🎓 [CourseDetailMobile] Page deleted:', pageId);
    },
    onPageUpdated: (pageId) => {
      log.debug('Mobile', '🎓 [CourseDetailMobile] Page updated:', pageId);
    },
    onPageMoved: (pageId, newFolderId) => {
      log.debug('Mobile', '🎓 [CourseDetailMobile] Page moved:', pageId, 'to folder:', newFolderId);
    },
    onRefetch: refetch,
    onSelectedLessonChange: setSelectedLesson,
    selectedLesson
  });

  // Use the lesson management hook
  const {
    isCreatingPage,
    creatingModuleId,
    newPageTitle,
    newPageContent,
    isSaving,
    handleCreateNewPage,
    handleCancelCreate,
    handleSaveNewPage,
    handleUpdateLesson,
    setNewPageTitle,
    setNewPageContent
  } = useLessonManagement({
    course,
    courseId,
    userId: user?.id || null,
    selectedLesson,
    onLessonCreated: (lesson) => {
      log.debug('Mobile', '🎓 [CourseDetailMobile] Lesson created:', lesson.title);
    },
    onLessonUpdated: (lessonId, updates) => {
      log.debug('Mobile', '🎓 [CourseDetailMobile] Lesson updated:', lessonId, updates);
      
      // Update selectedLesson with fresh data to ensure edit mode shows current content
      if (selectedLesson && selectedLesson.id === lessonId && course) {
        // Find the updated lesson in the fresh course data
        const allLessons = course.modules.flatMap(m => m.lessons);
        const updatedLesson = allLessons.find(l => l.id === lessonId);
        
        if (updatedLesson) {
          // Update selectedLesson with the fresh lesson data
          setSelectedLesson(updatedLesson);
          log.debug('Mobile', '🎓 [CourseDetailMobile] Updated selectedLesson with fresh data:', {
            lessonId,
            lessonTitle: updatedLesson.title,
            hasEducationalContent: !!updatedLesson.educational_content?.text_content,
            hasContentText: !!updatedLesson.content_text
          });
        }
      }
    },
    onRefetch: refetch,
    onInvalidateCache: invalidateCache,
    onSelectedLessonChange: setSelectedLesson,
    
    // PHASE 1.3: Pass optimistic update functions to lesson management
    applyOptimisticUpdate,
    clearOptimisticUpdate
  });

  // Mobile navigation handlers using focused hooks
  const mobileNavigation = useMobileNavigation({
    course, // PHASE 1.3: Use course directly from useCourseDetail hook (contains optimistic updates)
    selectedLesson,
    showLessonView,
    onBackToMenu: handleBackToMenu,
    onNextLesson: handleNextLesson,
    onLessonSelect: handleMobileLessonSelect,
    onBack
  });

  // Mobile gesture handlers
  const { handleTouchStart, handleTouchEnd } = useMobileGestures({
    enableHapticFeedback: true,
    showLessonView,
    onBack: mobileNavigation.handleBack,
    onNextLesson: mobileNavigation.handleNextLesson
  });

  // Mobile keyboard handlers
  useMobileKeyboard({
    enableKeyboardSupport: true,
    isMobile,
    showLessonView,
    onBack: mobileNavigation.handleBack,
    onNextLesson: mobileNavigation.handleNextLesson,
    onPreviousLesson: mobileNavigation.handlePreviousLesson
  });

  // Course management handlers
  const handleEditCourse = useCallback(() => {
    log.debug('Mobile', '📝 [CourseDetailMobile] Edit course clicked');
    
    if (!course) {
      toast({
        title: "Error",
        description: "Course data not available for editing.",
        variant: "destructive"
      });
      return;
    }

    // Convert CourseDetailData to CourseDisplayData format
    const courseDisplayData: CourseDisplayData = {
      id: course.id,
      title: course.title,
      description: course.description || '',
      creator_id: course.creator_id,
      space_id: course.space_id,
      access_type: 'open',
      price: null,
      currency: 'USD',
      is_published: course.is_published,
      image_url: null,
      slug: courseId,
      students: 0,
      enrolled: false,
      progress: course.progress || 0,
      weeks: 0
    };

    openCourseDialog('edit', courseDisplayData);
  }, [course, courseId, openCourseDialog]);

  const handleAddFolder = useCallback(() => {
    log.debug('Mobile', '📁 [CourseDetailMobile] Add folder clicked');
    openFolderDialog('create');
  }, [openFolderDialog]);

  const handleDeleteCourse = useCallback(() => {
    log.debug('Mobile', '🗑️ [CourseDetailMobile] Delete course clicked');
    openDeleteCourseDialog();
  }, [openDeleteCourseDialog]);

  const handleMarkAsDone = useCallback(async () => {
    if (!selectedLesson || !course) {
      toast({
        title: "Error",
        description: "No lesson selected or course data not available.",
        variant: "destructive"
      });
      return;
    }

    await markLessonAsDone(selectedLesson, course);
  }, [selectedLesson, course, markLessonAsDone]);

  // Effects for mobile-specific functionality
  useEffect(() => {
    if (courseId) {
      fetchCourseDetails(courseId, moduleId);
    }
  }, [courseId, moduleId, fetchCourseDetails]);

  // PHASE 1.3: Removed setOptimisticCourse useEffect - no longer needed with unified optimistic updates in useCourseDetail hook

  // Mobile state signaling - memoized for performance
  const signalMobileState = useCallback(() => {
    const mobileState = { isMobile: true, showTabs: false };
    onMobileStateChange?.(mobileState);
  }, [onMobileStateChange]);

  const cleanupMobileState = useCallback(() => {
    const cleanupState = { isMobile: false, showTabs: true };
    onMobileStateChange?.(cleanupState);
  }, [onMobileStateChange]);

  // Mobile state signaling - ensure we always send correct mobile state
  useEffect(() => {
    signalMobileState();
    return cleanupMobileState;
  }, [signalMobileState, cleanupMobileState]);

  // Mobile navigation handled by focused hooks



  // Show loading skeleton
  if (loading) {
    return <MobileLoadingSkeleton />;
  }

  // Show error state
  if (error || !course) {
    return <MobileErrorState error={error} onBack={onBack} />;
  }

  // PHASE 1.3: Use course directly (contains optimistic updates from useCourseDetail hook)
  const courseData = course;

  // Mobile course overview view (first screen)
  if (showCourseOverview) {

    return (
      <div
        ref={containerRef}
        className="h-full min-h-screen"
        role="main"
        aria-label="Course overview"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <CourseOverviewMobile
          course={courseData}
          space={space}
          onBack={onBack}
          onLessonSelect={handleMobileLessonSelect}
          isOwner={isOwner}
          isAdmin={isAdmin}
          onEditCourse={handleEditCourse}
          onAddFolder={handleAddFolder}
          onAddPage={() => handleCreateNewPage()}
          onDeleteCourse={handleDeleteCourse}
          onEditLesson={(lessonId, title) => {
            // Note: Mobile edit lesson functionality needs implementation
            log.debug('Mobile', 'Edit lesson:', lessonId, title);
          }}
          onDeleteLesson={(lessonId, title) => openDeletePageDialog(lessonId, title)}
          onRevertToDraft={(lessonId, title, isPublished) => openRevertToDraftDialog(lessonId, title, isPublished)}
          onChangeFolder={(lessonId, title, currentFolderId) => openChangeFolderDialog(lessonId, title, currentFolderId)}
          onDuplicateLesson={(lessonId, title) => {
            // Note: Mobile duplicate lesson functionality needs implementation
            log.debug('Mobile', 'Duplicate lesson:', lessonId, title);
          }}
          enableHapticFeedback={true}
          enableAnimations={true}
          enableOfflineSupport={true}
          enableAccessibility={true}
        />
      </div>
    );
  }

  // Mobile lesson view (second screen)
  if (showLessonView && selectedLesson) {
    const allLessons = courseData.modules.flatMap(m => m.lessons);
    const currentIndex = allLessons.findIndex(l => l.id === selectedLesson.id);
    const hasNextLesson = currentIndex < allLessons.length - 1;
    
    const currentLesson = allLessons.find(l => l.id === selectedLesson.id);

    return (
      <div 
        ref={containerRef}
        className="h-full min-h-screen"
        role="main"
        aria-label="Lesson view"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <LessonViewMobile
          lesson={(() => {
            if (!selectedLesson || !courseData) return selectedLesson;
            // Find the lesson in the current course state to get the most up-to-date completion status
            const moduleWithLesson = courseData.modules.find(m => 
              m.lessons.some(l => l.id === selectedLesson.id)
            );
            const currentLesson = moduleWithLesson?.lessons.find(l => l.id === selectedLesson.id);
            return currentLesson || selectedLesson;
          })()}
          course={courseData}
          space={space}
          onBackToMenu={handleBackToMenu}
          onNextLesson={handleNextLesson}
          onMarkAsDone={handleMarkAsDone}
          isOwner={isOwner}
          isAdmin={isAdmin}
          hasNextLesson={hasNextLesson}
          onEditLesson={async (updatedData) => {
            try {
              const updates: { title?: string; content_text?: string; is_published?: boolean } = {};
              
              if (updatedData.title) {
                updates.title = updatedData.title;
              }
              
              if (updatedData.content_text || updatedData.educational_content?.text_content) {
                const newContent = updatedData.educational_content?.text_content || updatedData.content_text;
                updates.content_text = newContent;
              }
              
              if (updatedData.is_published !== undefined) {
                updates.is_published = updatedData.is_published;
              }
              
              await handleUpdateLesson(selectedLesson.id, updates);
              
              // Note: Removed explicit cache invalidation and refetching
              // The optimistic updates and lesson management hook handle UI updates properly
              // This prevents race conditions that were causing edits to not persist
            } catch (error) {
              console.error('Error updating lesson:', error);
              throw error;
            }
          }}
        />
      </div>
    );
  }

  // Fallback - should not reach here in mobile mode
  return null;
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  return (
    prevProps.courseId === nextProps.courseId &&
    prevProps.moduleId === nextProps.moduleId &&
    prevProps.lessonId === nextProps.lessonId &&
    prevProps.onBack === nextProps.onBack &&
    prevProps.onMobileStateChange === nextProps.onMobileStateChange
  );
});

export default CourseDetailMobile; 