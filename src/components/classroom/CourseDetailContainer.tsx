import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { log } from '@/utils/logger';
import { useAuth } from '@/contexts/AuthContext';
import { useSpace } from '@/contexts/SpaceContext';
import { useClassroomStore, useClassroomCourses } from '@/stores/classroom/classroomStore';
import { useCachedClassroom } from '@/hooks/useCachedClassroom';
import { useCourseDetail } from '@/hooks/classroom';
import { useCourseProgress } from '@/hooks/classroom/useCourseProgress';
import { useCourseOwnership } from '@/hooks/classroom/useCourseOwnership';
import { useCourseNavigation } from '@/hooks/classroom/useCourseNavigation';
import { useCourseDialogs } from '@/hooks/classroom/useCourseDialogs';
import { useLessonManagement } from '@/hooks/classroom/useLessonManagement';
import type { CourseDetailData, CourseDetailViewProps } from '@/types/classroom/courseDetail';
import type { CourseDisplayData } from '@/hooks/useClassroomCache';
import CourseDetailView from './CourseDetailView';
import { EnhancedErrorBoundary } from '@/components/errors/EnhancedErrorBoundary';

interface CourseDetailContainerProps extends CourseDetailViewProps {
  enableErrorBoundary?: boolean;
  enableLoadingStates?: boolean;
  enableOptimisticUpdates?: boolean;
  enableMobileOptimizations?: boolean;
  enableOfflineSupport?: boolean;
}

/**
 * CourseDetailContainer - Main orchestration component for course detail views
 * 
 * Responsibilities:
 * - State orchestration and management
 * - Error handling and recovery
 * - Loading state management
 * - Component composition
 * - Mobile/desktop view switching
 * - Optimistic updates coordination
 * - Error boundary integration
 */
const CourseDetailContainer: React.FC<CourseDetailContainerProps> = ({
  courseId,
  onBack,
  moduleId,
  lessonId,
  enableErrorBoundary = true,
  enableLoadingStates = true,
  enableOptimisticUpdates = true,
  enableMobileOptimizations = true,
  enableOfflineSupport = true,
}) => {
  const navigate = useNavigate();
  const { subdomain } = useParams<{ subdomain: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Mobile detection and view state
  const mdParam = searchParams.get('md');
  
  const { user } = useAuth();
  const { space } = useSpace();
  
  // Get classroom store for dialog management
  const openCourseDialog = useClassroomStore(state => state.openCourseDialog);
  const closeCourseDialog = useClassroomStore(state => state.closeCourseDialog);
  const openFolderDialog = useClassroomStore(state => state.openFolderDialog);
  
  // Listen to store changes to update local course state
  const storeCourses = useClassroomCourses();
  
  // Get classroom cache for progress updates
  const { updateCourseProgress } = useCachedClassroom(space?.id, user?.id, space?.owner_id);
  
  // Use the course detail hook
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
    enableMobileOptimizations,
    enableOfflineSupport,
    retryOnError: true
  });
  
  // Local optimistic course state for mobile components
  const [optimisticCourse, setOptimisticCourse] = useState<CourseDetailData | null>(null);

  // Use the progress management hook
  const { markLessonAsDone, isUpdating: isProgressUpdating, error: progressError } = useCourseProgress({
    onOptimisticUpdate: enableOptimisticUpdates ? (updatedCourse) => {
      setOptimisticCourse(updatedCourse);
      log.debug('Container', '🎓 [CourseDetailContainer] Optimistic update received from hook:', {
        progress: updatedCourse.progress,
        lessonCount: updatedCourse.modules?.flatMap(m => m.lessons)?.length
      });
    } : undefined
  });

  // Use the ownership management hook
  const { isOwner, ownershipLoading, error: ownershipError, ownershipDetails } = useCourseOwnership({
    course,
    onOwnershipChange: (isOwner) => {
      log.debug('Container', '🎓 [CourseDetailContainer] Ownership changed:', isOwner);
    }
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
    course,
    onLessonChange: (lesson) => {
      log.debug('Container', '🎓 [CourseDetailContainer] Lesson changed:', lesson?.title);
    },
    onNavigationStateChange: (state) => {
      log.debug('Container', '🎓 [CourseDetailContainer] Navigation state changed:', state);
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
      log.debug('Container', '🎓 [CourseDetailContainer] Page deleted:', pageId);
    },
    onPageUpdated: (pageId) => {
      log.debug('Container', '🎓 [CourseDetailContainer] Page updated:', pageId);
    },
    onPageMoved: (pageId, newFolderId) => {
      log.debug('Container', '🎓 [CourseDetailContainer] Page moved:', pageId, 'to folder:', newFolderId);
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
      log.debug('Container', '🎓 [CourseDetailContainer] Lesson created:', lesson.title);
    },
    onLessonUpdated: (lessonId, updates) => {
      log.debug('Container', '🎓 [CourseDetailContainer] Lesson updated:', lessonId, updates);
    },
    onRefetch: refetch,
    onInvalidateCache: invalidateCache,
    onSelectedLessonChange: setSelectedLesson
  });

  log.debug('Container', '🎓 [CourseDetailContainer] Component rendered with courseId:', courseId);

  // Fetch course data when courseId changes
  useEffect(() => {
    if (courseId) {
      fetchCourseDetails(courseId, moduleId);
    }
  }, [courseId, moduleId, fetchCourseDetails]);

  // Update optimistic course state when hook course data changes
  useEffect(() => {
    if (course && enableOptimisticUpdates) {
      setOptimisticCourse(course);
    }
  }, [course, enableOptimisticUpdates]);

  // Listen to store changes and update local course state
  useEffect(() => {
    if (course && storeCourses && storeCourses.length > 0) {
      const updatedCourse = storeCourses.find(c => c.id === course.id);
      if (updatedCourse && (updatedCourse.title !== course.title || updatedCourse.description !== course.description)) {
        log.debug('Container', '🎓 [CourseDetailContainer] Updating local course state from store:', updatedCourse);
      }
    }
  }, [storeCourses, course]);

  // Handle mark as done action
  const handleMarkAsDone = async () => {
    if (!selectedLesson || !course) {
      toast({
        title: "Error",
        description: "No lesson selected or course data not available.",
        variant: "destructive"
      });
      return;
    }

    log.debug('Container', '🎓 [CourseDetailContainer] handleMarkAsDone called for lesson:', selectedLesson.id);
    
    await markLessonAsDone(selectedLesson, course);
  };

  // Course management handlers
  const handleEditCourse = () => {
    log.debug('Container', '📝 [CourseDetailContainer] Edit course clicked');
    
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
      is_published: true,
      image_url: null,
      slug: courseId,
      students: 0,
      enrolled: false,
      progress: 0,
      weeks: 0
    };

    // Open the edit course dialog using the store
    openCourseDialog('edit', courseDisplayData);
  };

  const handleAddFolder = () => {
    log.debug('Container', '📁 [CourseDetailContainer] Add folder clicked');
    openFolderDialog('create');
  };

  const handleDeleteCourse = () => {
    openDeleteCourseDialog();
  };

  // Error handling
  const handleError = (error: any) => {
    log.error('Container', '🎓 [CourseDetailContainer] Error caught by boundary:', error);
    toast({
      title: "Error",
      description: "An unexpected error occurred. Please try refreshing the page.",
      variant: "destructive"
    });
  };

  // Loading state
  if (enableLoadingStates && loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
      </div>
    );
  }

  // Error state
  if (enableLoadingStates && (error || !course)) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Course</h3>
        <p className="text-gray-600 mb-4">{error || 'Course not found'}</p>
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Courses
        </Button>
      </div>
    );
  }

  // Progress error handling
  if (progressError) {
    log.error('Container', '🎓 [CourseDetailContainer] Progress error:', new Error(progressError));
    toast({
      title: "Progress Error",
      description: "Failed to update lesson progress. Please try again.",
      variant: "destructive"
    });
  }

  // Ownership error handling
  if (ownershipError) {
    log.error('Container', '🎓 [CourseDetailContainer] Ownership error:', new Error(ownershipError));
  }

  // Prepare props for CourseDetailView
  const courseDetailViewProps = {
    courseId,
    onBack,
    moduleId,
    lessonId,
    course: course!,
    optimisticCourse,
    selectedLesson,
    isOwner,
    ownershipLoading,
    isMobile,
    showCourseOverview,
    showLessonView,
    isCreatingPage,
    creatingModuleId,
    newPageTitle,
    newPageContent,
    isSaving,
    isProgressUpdating,
    space,
    user,
    // Event handlers
    handleMarkAsDone,
    handleEditCourse,
    handleAddFolder,
    handleDeleteCourse,
    handleCreateNewPage,
    handleCancelCreate,
    handleSaveNewPage,
    handleUpdateLesson,
    setNewPageTitle,
    setNewPageContent,
    handleMobileLessonSelect,
    handleNextLesson,
    handleBackToMenu,
    setSelectedLesson,
    // Dialog handlers
    openDeletePageDialog,
    openRevertToDraftDialog,
    openChangeFolderDialog,
    // Cache and refetch
    invalidateCache,
    refetch,
    // Store actions
    openCourseDialog,
    closeCourseDialog,
    openFolderDialog,
    updateCourseProgress,
  };

  // Render with error boundary if enabled
  if (enableErrorBoundary) {
    return (
      <EnhancedErrorBoundary onError={handleError}>
        <CourseDetailView {...courseDetailViewProps} />
      </EnhancedErrorBoundary>
    );
  }

  // Render without error boundary
  return <CourseDetailView {...courseDetailViewProps} />;
};

export default CourseDetailContainer; 