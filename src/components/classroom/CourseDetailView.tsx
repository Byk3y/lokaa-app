import { log } from '@/utils/logger';
import React, { useEffect, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSpace } from '@/contexts/SpaceContext';
import { useClassroomStore } from '@/stores/classroom/classroomStore';
import type { CourseDisplayData } from '@/hooks/useClassroomCache';
import useClassroomCache from '@/hooks/useClassroomCache';
import { useCourseDetail } from '@/hooks/classroom';
import { useCourseProgress } from '@/hooks/classroom/useCourseProgress';
import { useCourseOwnership } from '@/hooks/classroom/useCourseOwnership';
import { useCourseNavigation } from '@/hooks/classroom/useCourseNavigation';
import { useCourseDialogs } from '@/hooks/classroom/useCourseDialogs';
import { useLessonManagement } from '@/hooks/classroom/useLessonManagement';
import { 
  MobileStateManager,
  CourseDialogManager,
  CourseContentDisplay,
  CourseErrorHandler
} from './components';
import type { 
  CourseDetailData, 
  CourseDetailViewProps 
} from '@/types/classroom/courseDetail';

// Internal component that uses the route manager
const CourseDetailViewInternal: React.FC<CourseDetailViewProps> = React.memo(({
  courseId,
  onBack,
  moduleId,
  lessonId,
}) => {
  const { user } = useAuth();
  const { space, loading: spaceLoading } = useSpace();
  
  // Get classroom store for dialog management
  const openCourseDialog = useClassroomStore(state => state.openCourseDialog);
  const openFolderDialog = useClassroomStore(state => state.openFolderDialog);
  
  // Use the new course detail hook
  const {
    course,
    loading,
    error,
    fetchCourseDetails,
    refetch,
    invalidateCache,
    applyOptimisticUpdate,
    clearOptimisticUpdate,
    clearAllOptimisticUpdates,
    hasOptimisticUpdates
  } = useCourseDetail({
    enableMobileOptimizations: true,
    enableOfflineSupport: true,
    retryOnError: true
  });
  
  // Note: Optimistic updates now handled directly in useCourseDetail hook

  // Use the new progress management hook
  const { markLessonAsDone } = useCourseProgress({
    enableLogging: true,
    enableCaching: true,
    userId: user?.id || null,
    onProgressUpdate: () => {
      // Refresh course data to update UI with new completion status
      if (process.env.NODE_ENV === 'development') {
        // Development logging placeholder
      }
      refetch();
    },
    onOptimisticUpdate: (updatedCourse) => {
      // Update classroom cache with new progress for course cards
      if (updatedCourse && space?.id) {
        const classroomCache = useClassroomCache.getState();
        classroomCache.updateCourseProgress(space.id, updatedCourse.id, updatedCourse.progress || 0);
      }
    }
  });

  // Use the new ownership management hook
  const { isOwner, ownershipDetails } = useCourseOwnership({
    course,
    onOwnershipChange: (isOwner) => {
      if (process.env.NODE_ENV === 'development') {
        // Development logging placeholder
      }
    }
  });

  // Extract admin status from ownership details
  const isAdmin = ownershipDetails?.isGeneralAdmin || ownershipDetails?.isSpaceAdmin || false;

  // Use the new navigation management hook
  const {
    selectedLesson,
    isMobile,
    showCourseOverview,
    showLessonView,
    setSelectedLesson
  } = useCourseNavigation({
    course,
    onLessonChange: (lesson) => {
      if (process.env.NODE_ENV === 'development') {
        // Development logging placeholder
      }
    },
    onNavigationStateChange: (state) => {
      if (process.env.NODE_ENV === 'development') {
        // Development logging placeholder
      }
    }
  });

  // FIXED: Move useCallback to top level to prevent Rules of Hooks violation
  const handleMobileStateChange = useCallback((state: { isMobile: boolean; showTabs: boolean }) => {
    if (process.env.NODE_ENV === 'development') {
      // Development logging placeholder
    }
    // Signal to parent about mobile state for tab visibility
    window.dispatchEvent(new CustomEvent('courseDetailMobileState', {
      detail: state
    }));
  }, []);

  // Use the new dialog management hook
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
      if (process.env.NODE_ENV === 'development') {
        // Development logging placeholder
      }
    },
    onPageUpdated: (pageId) => {
      if (process.env.NODE_ENV === 'development') {
        // Development logging placeholder
      }
    },
    onPageMoved: (pageId, newFolderId) => {
      if (process.env.NODE_ENV === 'development') {
        // Development logging placeholder
      }
    },
    onRefetch: refetch,
    onSelectedLessonChange: setSelectedLesson,
    selectedLesson
  });

  // Use the new lesson management hook
  const {
    isCreatingPage,
    newPageTitle,
    newPageContent,
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
      if (process.env.NODE_ENV === 'development') {
        // Development logging placeholder
      }
    },
    onLessonUpdated: (lessonId, updates) => {
      if (process.env.NODE_ENV === 'development') {
        // Lesson updated - optimistic updates handled via useCourseDetail hook
      }
      
      // Update selectedLesson with fresh data to ensure edit mode shows current content
      if (selectedLesson && selectedLesson.id === lessonId && course) {
        // Find the updated lesson in the fresh course data
        const allLessons = course.modules.flatMap(m => m.lessons);
        const updatedLesson = allLessons.find(l => l.id === lessonId);
        
        if (updatedLesson) {
          // Update selectedLesson with the fresh lesson data
          setSelectedLesson(updatedLesson);
          log.debug('Component', '🎓 [CourseDetailView] Updated selectedLesson with fresh data:', {
            lessonId,
            lessonTitle: updatedLesson.title,
            hasEducationalContent: !!updatedLesson.educational_content?.text_content,
            hasContentText: !!updatedLesson.content_text
          });
        }
      }
      
      // Note: Optimistic updates now handled in useCourseDetail hook for consistency
      // This callback serves for logging and future component-level side effects
    },
    onRefetch: refetch,
    onInvalidateCache: invalidateCache,
    onSelectedLessonChange: setSelectedLesson,
    
    // PHASE 1.2: Pass optimistic update functions to lesson management
    applyOptimisticUpdate,
    clearOptimisticUpdate
  });

  log.debug('Component', '🎓 [CourseDetailView] Component rendered with courseId:', courseId);
  

  // Fetch course data when courseId changes
  useEffect(() => {
    if (courseId) {
      fetchCourseDetails(courseId, moduleId);
    }
  }, [courseId, moduleId, fetchCourseDetails]);

  // Note: Removed problematic useEffect that was overwriting optimistic updates
  // Optimistic updates are now handled directly in useCourseDetail hook

  // Use course data directly (optimistic updates handled in useCourseDetail hook)
  const displayCourse = course;

  const handleMarkAsDone = async () => {
    if (!selectedLesson || !displayCourse) {
      toast({
        title: "Error",
        description: "No lesson selected or course data not available.",
        variant: "destructive"
      });
      return;
    }

    if (process.env.NODE_ENV === 'development') {
      // Development logging placeholder
    }

    try {
      await markLessonAsDone(selectedLesson, displayCourse);
    } catch (error) {
      log.error('Component', '🎓 [CourseDetailView] Error in handleMarkAsDone:', error);
      toast({
        title: "Error",
        description: "Failed to update lesson completion status.",
        variant: "destructive"
      });
    }
  };

  // Course management handlers
  const handleEditCourse = () => {
    log.debug('Component', '📝 [CourseDetailView] Edit course clicked');
    
    if (!displayCourse) {
      toast({
        title: "Error",
        description: "Course data not available for editing.",
        variant: "destructive"
      });
      return;
    }

    // Convert CourseDetailData to CourseDisplayData format
    const courseDisplayData: CourseDisplayData = {
      id: displayCourse.id,
      title: displayCourse.title,
      description: displayCourse.description || '',
      creator_id: displayCourse.creator_id,
      space_id: displayCourse.space_id,
      access_type: 'open',
      price: null,
      currency: 'USD',
      is_published: true,
      image_url: null,
      slug: courseId,
      students: 0,
      enrolled: false,
      progress: 0,
      weeks: 0
    };

    openCourseDialog('edit', courseDisplayData);
  };

  const handleAddFolder = () => {
    log.debug('Component', '📁 [CourseDetailView] Add folder clicked');
    openFolderDialog('create');
  };

  const handleDeleteCourse = () => {
    openDeleteCourseDialog();
  };

  // Handle mobile states and routing - check conditions first
  if (isMobile && (loading || spaceLoading) || showCourseOverview || showLessonView) {
    return (
      <MobileStateManager
        courseId={courseId}
        onBack={onBack}
        moduleId={moduleId}
        lessonId={lessonId}
        isMobile={isMobile}
        loading={loading}
        spaceLoading={spaceLoading}
        showCourseOverview={showCourseOverview}
        showLessonView={showLessonView}
        space={space}
        onMobileStateChange={handleMobileStateChange}
      />
    );
  }

  // Handle error and loading states - check conditions first
  if (loading || error || !displayCourse) {
    return (
      <CourseErrorHandler
        loading={loading}
        error={error}
        course={displayCourse}
        onBack={onBack}
      />
    );
  }

  // Regular course view with Skool-style "New page" button (Desktop)
  return (
    <>
      <CourseContentDisplay
        displayCourse={displayCourse}
        selectedLesson={selectedLesson}
        setSelectedLesson={setSelectedLesson}
        isOwner={isOwner}
        isAdmin={isAdmin}
        isCreatingPage={isCreatingPage}
        newPageContent={newPageContent}
        setNewPageContent={setNewPageContent}
        setNewPageTitle={setNewPageTitle}
        handleCreateNewPage={handleCreateNewPage}
        handleCancelCreate={handleCancelCreate}
        handleSaveNewPage={handleSaveNewPage}
        handleUpdateLesson={handleUpdateLesson}
        handleMarkAsDone={handleMarkAsDone}
        handleEditCourse={handleEditCourse}
        handleDeleteCourse={handleDeleteCourse}
        handleAddFolder={handleAddFolder}
        openDeletePageDialog={openDeletePageDialog}
        openRevertToDraftDialog={openRevertToDraftDialog}
        openChangeFolderDialog={openChangeFolderDialog}
      />
      
      <CourseDialogManager
        course={displayCourse}
        selectedLesson={selectedLesson}
        isDeleteDialogOpen={isDeleteDialogOpen}
        isDeleting={isDeleting}
        closeDeleteCourseDialog={closeDeleteCourseDialog}
        handleConfirmDeleteCourse={handleConfirmDeleteCourse}
        pageToDelete={pageToDelete}
        pageToRevert={pageToRevert}
        pageToChangeFolder={pageToChangeFolder}
        isReverting={isReverting}
        isChangingFolder={isChangingFolder}
        closeDeletePageDialog={closeDeletePageDialog}
        closeRevertToDraftDialog={closeRevertToDraftDialog}
        closeChangeFolderDialog={closeChangeFolderDialog}
        handleConfirmDeletePage={handleConfirmDeletePage}
        handleConfirmRevertToDraft={handleConfirmRevertToDraft}
        handleConfirmChangeFolder={handleConfirmChangeFolder}
        refetch={refetch}
        setSelectedLesson={setSelectedLesson}
      />
    </>
  );
});

export default CourseDetailViewInternal;