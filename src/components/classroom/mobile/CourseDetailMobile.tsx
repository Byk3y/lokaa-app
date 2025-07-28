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
import { useCourseDialogs } from '@/hooks/classroom/useCourseDialogs';
import { useLessonManagement } from '@/hooks/classroom/useLessonManagement';
import MobileCourseOverview from '../MobileCourseOverview';
import MobileLessonView from '../MobileLessonView';
import CourseOverviewMobile from './CourseOverviewMobile';
import LessonViewMobile from './LessonViewMobile';
import MobileNavigationManager from './MobileNavigationManager';
import MobileRouteHandler from './MobileRouteHandler';
import MobileViewManager from './MobileViewManager';
import MobileStateSynchronizer from './MobileStateSynchronizer';
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
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTapRef = useRef<number>(0);
  const orientationRef = useRef<string>('portrait');
  
  // Mobile detection
  const isMobileDevice = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
  const isLandscape = useMediaQuery('(orientation: landscape)');
  
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
    isOffline
  } = useCourseDetail({
    enableMobileOptimizations: true,
    enableOfflineSupport: true,
    retryOnError: true
  });
  
  // Local optimistic course state for mobile components
  const [optimisticCourse, setOptimisticCourse] = React.useState<CourseDetailData | null>(null);

  // Use the progress management hook with optimistic updates
  const { markLessonAsDone, progressLoading, progressError } = useCourseProgress({
    enableLogging: true,
    enableCaching: true,
    userId: user?.id || null,
    onOptimisticUpdate: (updatedCourse) => {
      console.log('🎓 [CourseDetailMobile] Optimistic update received:', {
        progress: updatedCourse.progress,
        lessonCount: updatedCourse.modules?.flatMap(m => m.lessons)?.length
      });
      
      // Update mobile optimistic course state immediately for instant UI feedback
      setOptimisticCourse(updatedCourse);
      
      // Also update the cached progress
      updateCachedProgress?.(updatedCourse.id, updatedCourse.progress || 0);
    },
    onProgressUpdate: () => {
      console.log('🎓 [CourseDetailMobile] Progress update callback triggered, refreshing course data');
      // Refresh course data after database update is complete
      refetch();
    }
  });

  // CRITICAL FIX: Move all useCallback hooks here to prevent hooks violation


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
    isMigrating,
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
    },
    onRefetch: refetch,
    onInvalidateCache: invalidateCache,
    onSelectedLessonChange: setSelectedLesson
  });

  // Mobile navigation is now handled by MobileNavigationManager component
  // All gesture, keyboard, and navigation logic has been extracted

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

    console.log('🎓 [CourseDetailMobile] handleMarkAsDone called for lesson:', selectedLesson.id);
    await markLessonAsDone(selectedLesson, course);
  }, [selectedLesson, course, markLessonAsDone]);

  // Effects for mobile-specific functionality
  useEffect(() => {
    if (courseId) {
      fetchCourseDetails(courseId, moduleId);
    }
  }, [courseId, moduleId, fetchCourseDetails]);

  useEffect(() => {
    if (course) {
      setOptimisticCourse(course);
    }
  }, [course]);

  // Mobile state signaling - memoized for performance
  const signalMobileState = useCallback(() => {
    const mobileState = { isMobile: true, showTabs: false };
    console.log('🎓 [CourseDetailMobile] Sending mobile state:', mobileState);
    onMobileStateChange?.(mobileState);
  }, [onMobileStateChange]);

  const cleanupMobileState = useCallback(() => {
    const cleanupState = { isMobile: false, showTabs: true };
    console.log('🎓 [CourseDetailMobile] Cleaning up mobile state:', cleanupState);
    onMobileStateChange?.(cleanupState);
  }, [onMobileStateChange]);

  // Mobile state signaling - ensure we always send correct mobile state
  useEffect(() => {
    signalMobileState();
    return cleanupMobileState;
  }, [signalMobileState, cleanupMobileState]);

  // Mobile event listeners are now handled by MobileNavigationManager
  // All navigation, gesture, and keyboard logic has been extracted

  // Mobile accessibility setup
  useEffect(() => {
    // Set up mobile accessibility features
    if (containerRef.current) {
      containerRef.current.setAttribute('role', 'main');
      containerRef.current.setAttribute('aria-label', 'Course Detail Mobile View');
    }
  }, []);

  // Development logging
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 [CourseDetailMobile] Component render:', {
      courseId,
      hasCourse: !!course,
      hasSelectedLesson: !!selectedLesson,
      isMobile,
      showCourseOverview,
      showLessonView,
      isMobileDevice,
      isTablet,
      isLandscape,
      orientation: orientationRef.current
    });
  }

  // MOBILE OPTIMIZATION: Show skeleton content immediately for better perceived performance
  // This eliminates white screen and provides instant visual feedback
  if (loading) {
    return (
      <div 
        ref={containerRef}
        className="h-full min-h-screen bg-white"
        role="main"
        aria-label="Loading course"
      >
        {/* Show skeleton content immediately instead of empty container */}
        <div className="flex flex-col h-full">
          {/* Header skeleton */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3"></div>
              </div>
            </div>
          </div>
          
          {/* Content skeleton */}
          <div className="flex-1 p-4">
            <div className="space-y-4">
              <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
            </div>
            
            {/* Lesson list skeleton */}
            <div className="mt-6 space-y-3">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                  <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded animate-pulse mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-1/3"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !course) {
    return (
      <div 
        ref={containerRef}
        className="flex flex-col items-center justify-center h-full min-h-screen p-4"
        role="main"
        aria-label="Course error"
      >
        <div className="text-center max-w-md">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Course</h3>
          <p className="text-gray-600 mb-4">{error || 'Course not found'}</p>
          <button 
            onClick={onBack}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            aria-label="Go back to courses"
          >
            ← Back to Courses
          </button>
        </div>
      </div>
    );
  }

    // Single MobileNavigationManager and MobileRouteHandler at top level to prevent conflicts
  const courseData = optimisticCourse || course;

  // Mobile course overview view (first screen)
  if (showCourseOverview) {
    log.debug('Mobile', '🎓 [CourseDetailMobile] Rendering CourseOverviewMobile with:', {
      usingOptimistic: !!optimisticCourse,
      courseProgress: courseData?.progress,
      lessonCount: courseData?.modules?.flatMap(m => m.lessons)?.length,
      completedLessons: courseData?.modules?.flatMap(m => m.lessons)?.filter(l => l.completed)?.length
    });

    return (
      <div
        ref={containerRef}
        className="h-full min-h-screen"
        role="main"
        aria-label="Course overview"
      >
        {/* Single MobileNavigationManager at top level */}
        <MobileNavigationManager
          course={courseData}
          selectedLesson={selectedLesson}
          isMobile={isMobile}
          showCourseOverview={showCourseOverview}
          showLessonView={showLessonView}
          onBackToMenu={handleBackToMenu}
          onNextLesson={handleNextLesson}
          onLessonSelect={handleMobileLessonSelect}
          onBack={onBack}
          enableHapticFeedback={true}
          enableAnimations={true}
          enableGestureSupport={true}
          enableKeyboardSupport={true}
          enableDeepLinking={true}
          enableNavigationHistory={true}
          enableAccessibility={true}
          enablePerformanceOptimization={true}
        />
        
        {/* Single MobileRouteHandler at top level */}
        <MobileRouteHandler
          course={courseData}
          selectedLesson={selectedLesson}
          isMobile={isMobile}
          showCourseOverview={showCourseOverview}
          showLessonView={showLessonView}
          onRouteChange={(route, params) => {
            log.debug('Mobile', '🎓 [CourseDetailMobile] Route change:', route, params);
          }}
          onRouteError={(error, route) => {
            log.error('Mobile', '🎓 [CourseDetailMobile] Route error:', new Error(error), route);
            toast({
              title: "Navigation Error",
              description: error,
              variant: "destructive"
            });
          }}
          onRouteValidation={(isValid, route) => {
            log.debug('Mobile', '🎓 [CourseDetailMobile] Route validation:', isValid, route);
          }}
          enableRouteTransitions={true}
          enableRouteCaching={true}
          enableRouteValidation={true}
          enableRouteAnalytics={true}
          enableRouteFallbacks={true}
          enableRoutePermissions={true}
          enableDeepLinking={true}
          enablePerformanceOptimization={true}
        />
        
        {/* Single MobileViewManager at top level */}
        <MobileViewManager
          course={courseData}
          selectedLesson={selectedLesson}
          isMobile={isMobile}
          showCourseOverview={showCourseOverview}
          showLessonView={showLessonView}
          onViewChange={(view, params) => {
            log.debug('Mobile', '🎓 [CourseDetailMobile] View change:', view, params);
          }}
          onViewError={(error, view) => {
            log.error('Mobile', '🎓 [CourseDetailMobile] View error:', new Error(error), view);
            toast({
              title: "View Error",
              description: error,
              variant: "destructive"
            });
          }}
          onViewValidation={(isValid, view) => {
            log.debug('Mobile', '🎓 [CourseDetailMobile] View validation:', isValid, view);
          }}
          enableViewTransitions={true}
          enableViewCaching={true}
          enableViewValidation={true}
          enableViewAnalytics={true}
          enableViewFallbacks={true}
          enableViewPermissions={true}
          enableAccessibility={true}
          enablePerformanceOptimization={true}
        />
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
            // TODO: Implement edit lesson for mobile
            log.debug('Mobile', 'Edit lesson:', lessonId, title);
          }}
          onDeleteLesson={(lessonId, title) => openDeletePageDialog(lessonId, title)}
          onRevertToDraft={(lessonId, title, isPublished) => openRevertToDraftDialog(lessonId, title, isPublished)}
          onChangeFolder={(lessonId, title, currentFolderId) => openChangeFolderDialog(lessonId, title, currentFolderId)}
          onDuplicateLesson={(lessonId, title) => {
            // TODO: Implement duplicate lesson for mobile
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
    log.debug('Mobile', '🎓 [CourseDetailMobile] Rendering MobileLessonView with:', {
      usingOptimistic: !!optimisticCourse,
      lessonId: selectedLesson.id,
      lessonCompleted: currentLesson?.completed,
      courseProgress: courseData?.progress
    });

    return (
      <div 
        ref={containerRef}
        className="h-full min-h-screen"
        role="main"
        aria-label="Lesson view"
      >
        {/* Single MobileNavigationManager at top level */}
        <MobileNavigationManager
          course={courseData}
          selectedLesson={selectedLesson}
          isMobile={isMobile}
          showCourseOverview={showCourseOverview}
          showLessonView={showLessonView}
          onBackToMenu={handleBackToMenu}
          onNextLesson={handleNextLesson}
          onLessonSelect={handleMobileLessonSelect}
          onBack={onBack}
          enableHapticFeedback={true}
          enableAnimations={true}
          enableGestureSupport={true}
          enableKeyboardSupport={true}
          enableDeepLinking={true}
          enableNavigationHistory={true}
          enableAccessibility={true}
          enablePerformanceOptimization={true}
        />
        
        {/* Single MobileRouteHandler at top level */}
        <MobileRouteHandler
          course={courseData}
          selectedLesson={selectedLesson}
          isMobile={isMobile}
          showCourseOverview={showCourseOverview}
          showLessonView={showLessonView}
          onRouteChange={(route, params) => {
            log.debug('Mobile', '🎓 [CourseDetailMobile] Route change:', route, params);
          }}
          onRouteError={(error, route) => {
            log.error('Mobile', '🎓 [CourseDetailMobile] Route error:', new Error(error), route);
            toast({
              title: "Navigation Error",
              description: error,
              variant: "destructive"
            });
          }}
          onRouteValidation={(isValid, route) => {
            log.debug('Mobile', '🎓 [CourseDetailMobile] Route validation:', isValid, route);
          }}
          enableRouteTransitions={true}
          enableRouteCaching={true}
          enableRouteValidation={true}
          enableRouteAnalytics={true}
          enableRouteFallbacks={true}
          enableRoutePermissions={true}
          enableDeepLinking={true}
          enablePerformanceOptimization={true}
        />
        
        {/* Single MobileViewManager at top level */}
        <MobileViewManager
          course={courseData}
          selectedLesson={selectedLesson}
          isMobile={isMobile}
          showCourseOverview={showCourseOverview}
          showLessonView={showLessonView}
          onViewChange={(view, params) => {
            log.debug('Mobile', '🎓 [CourseDetailMobile] View change:', view, params);
          }}
          onViewError={(error, view) => {
            log.error('Mobile', '🎓 [CourseDetailMobile] View error:', new Error(error), view);
            toast({
              title: "View Error",
              description: error,
              variant: "destructive"
            });
          }}
          onViewValidation={(isValid, view) => {
            log.debug('Mobile', '🎓 [CourseDetailMobile] View validation:', isValid, view);
          }}
          enableViewTransitions={true}
          enableViewCaching={true}
          enableViewValidation={true}
          enableViewAnalytics={true}
          enableViewFallbacks={true}
          enableViewPermissions={true}
          enableAccessibility={true}
          enablePerformanceOptimization={true}
        />
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
              
              // Refresh course data
              invalidateCache();
              await refetch();
            } catch (error) {
              console.error('Error updating lesson:', error);
              throw error;
            }
          }}
          enableHapticFeedback={true}
          enableAnimations={true}
          enableOfflineSupport={true}
          enableAccessibility={true}
          enableReadingMode={true}
          enableVideoOptimization={true}
          enableGestureSupport={true}
        />
        
        {/* Single MobileStateSynchronizer at top level */}
        <MobileStateSynchronizer
          course={courseData}
          selectedLesson={selectedLesson}
          isMobile={isMobile}
          showCourseOverview={showCourseOverview}
          showLessonView={showLessonView}
          onStateChange={(state, data) => {
            log.debug('Mobile', '🎓 [CourseDetailMobile] State change:', state, data);
          }}
          onStateError={(error, state) => {
            log.error('Mobile', '🎓 [CourseDetailMobile] State error:', new Error(error), state);
            toast({
              title: "State Error",
              description: error,
              variant: "destructive"
            });
          }}
          onStateValidation={(isValid, state) => {
            log.debug('Mobile', '🎓 [CourseDetailMobile] State validation:', isValid, state);
          }}
          onStateConflict={(conflict) => {
            log.warn('Mobile', '🎓 [CourseDetailMobile] State conflict detected:', conflict);
            toast({
              title: "State Conflict",
              description: `Conflict detected in ${conflict.type}. Resolving automatically.`,
              variant: "default"
            });
          }}
          onStateRecovery={(recoveredState) => {
            log.info('Mobile', '🎓 [CourseDetailMobile] State recovered:', recoveredState);
            toast({
              title: "State Recovered",
              description: "Your state has been recovered from backup.",
              variant: "default"
            });
          }}
          enableStatePersistence={true}
          enableStateConflicts={true}
          enableStateRecovery={true}
          enableStateValidation={true}
          enableStateAnalytics={true}
          enableStateFallbacks={true}
          enableStatePermissions={true}
          enableOfflineSupport={true}
          enableRealTimeSync={true}
          enablePerformanceOptimization={true}
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