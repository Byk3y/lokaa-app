import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
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

interface CourseDataManagerProps extends CourseDetailViewProps {
  enableDataValidation?: boolean;
  enableDataRefresh?: boolean;
  enableDataSynchronization?: boolean;
  enableDataErrorRecovery?: boolean;
  enableOptimisticUpdates?: boolean;
  enableMobileOptimizations?: boolean;
  enableOfflineSupport?: boolean;
  onDataChange?: (data: CourseDetailData) => void;
  onDataError?: (error: string) => void;
  onDataLoading?: (loading: boolean) => void;
}

interface CourseDataManagerReturn {
  // Data state
  course: CourseDetailData | null;
  optimisticCourse: CourseDetailData | null;
  loading: boolean;
  loadingPhase: string;
  error: string | null;
  isOffline: boolean;
  retryCount: number;
  
  // Ownership state
  isOwner: boolean;
  ownershipLoading: boolean;
  ownershipError: string | null;
  ownershipDetails: any;
  
  // Navigation state
  selectedLesson: any;
  isMobile: boolean;
  showCourseOverview: boolean;
  showLessonView: boolean;
  
  // Progress state
  isProgressUpdating: boolean;
  progressError: string | null;
  
  // Lesson management state
  isCreatingPage: boolean;
  creatingModuleId: string | null;
  newPageTitle: string;
  newPageContent: string;
  isSaving: boolean;
  isMigrating: boolean;
  
  // Dialog state
  isDeleteDialogOpen: boolean;
  isDeleting: boolean;
  pageToDelete: any;
  pageToRevert: any;
  pageToChangeFolder: any;
  isReverting: boolean;
  isChangingFolder: boolean;
  
  // Data operations
  fetchCourseDetails: (courseId: string, moduleId?: string) => Promise<void>;
  refetch: () => Promise<void>;
  silentRefetch: () => Promise<void>;
  invalidateCache: () => void;
  markLessonAsDone: (lesson: any, course: CourseDetailData) => Promise<void>;
  
  // Navigation operations
  handleMobileLessonSelect: (lesson: any) => void;
  handleNextLesson: () => void;
  handleBackToMenu: () => void;
  setSelectedLesson: (lesson: any) => void;
  
  // Lesson management operations
  handleCreateNewPage: (moduleId?: string) => void;
  handleCancelCreate: () => void;
  handleSaveNewPage: (title: string) => Promise<void>;
  handleUpdateLesson: (lessonId: string, updates: any) => Promise<void>;
  setNewPageTitle: (title: string) => void;
  setNewPageContent: (content: string) => void;
  
  // Dialog operations
  openDeleteCourseDialog: () => void;
  closeDeleteCourseDialog: () => void;
  openDeletePageDialog: (pageId: string, title: string) => void;
  closeDeletePageDialog: () => void;
  openRevertToDraftDialog: (pageId: string, title: string, isPublished: boolean) => void;
  closeRevertToDraftDialog: () => void;
  openChangeFolderDialog: (pageId: string, title: string, currentFolderId: string | null) => void;
  closeChangeFolderDialog: () => void;
  handleConfirmDeleteCourse: () => Promise<void>;
  handleConfirmDeletePage: () => Promise<void>;
  handleConfirmRevertToDraft: () => Promise<void>;
  handleConfirmChangeFolder: (folderId: string | null) => Promise<void>;
  
  // Course management operations
  handleEditCourse: () => void;
  handleAddFolder: () => void;
  handleDeleteCourse: () => void;
  
  // Store operations
  openCourseDialog: (type: string, course: CourseDisplayData) => void;
  closeCourseDialog: () => void;
  openFolderDialog: (type: string) => void;
  updateCourseProgress: (courseId: string, progress: number) => void;
  
  // Data validation and recovery
  validateData: () => boolean;
  recoverFromError: () => Promise<void>;
  synchronizeData: () => Promise<void>;
}

/**
 * CourseDataManager - Handles all data-related operations for course detail views
 * 
 * Responsibilities:
 * - Data fetching and caching
 * - Data validation and transformation
 * - Data synchronization and error recovery
 * - State management for all data operations
 * - Mobile-specific data optimizations
 * - Offline data support
 * - Data refresh and invalidation
 */
const CourseDataManager: React.FC<CourseDataManagerProps> = ({
  courseId,
  onBack,
  moduleId,
  lessonId,
  enableDataValidation = true,
  enableDataRefresh = true,
  enableDataSynchronization = true,
  enableDataErrorRecovery = true,
  enableOptimisticUpdates = true,
  enableMobileOptimizations = true,
  enableOfflineSupport = true,
  onDataChange,
  onDataError,
  onDataLoading,
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
      log.debug('DataManager', '🎓 [CourseDataManager] Optimistic update received from hook:', {
        progress: updatedCourse.progress,
        lessonCount: updatedCourse.modules?.flatMap(m => m.lessons)?.length
      });
      onDataChange?.(updatedCourse);
    } : undefined
  });

  // Use the ownership management hook
  const { isOwner, ownershipLoading, error: ownershipError, ownershipDetails } = useCourseOwnership({
    course,
    onOwnershipChange: (isOwner) => {
      log.debug('DataManager', '🎓 [CourseDataManager] Ownership changed:', isOwner);
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
      log.debug('DataManager', '🎓 [CourseDataManager] Lesson changed:', lesson?.title);
    },
    onNavigationStateChange: (state) => {
      log.debug('DataManager', '🎓 [CourseDataManager] Navigation state changed:', state);
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
      log.debug('DataManager', '🎓 [CourseDataManager] Page deleted:', pageId);
    },
    onPageUpdated: (pageId) => {
      log.debug('DataManager', '🎓 [CourseDataManager] Page updated:', pageId);
    },
    onPageMoved: (pageId, newFolderId) => {
      log.debug('DataManager', '🎓 [CourseDataManager] Page moved:', pageId, 'to folder:', newFolderId);
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
      log.debug('DataManager', '🎓 [CourseDataManager] Lesson created:', lesson.title);
    },
    onLessonUpdated: (lessonId, updates) => {
      log.debug('DataManager', '🎓 [CourseDataManager] Lesson updated:', lessonId, updates);
    },
    onRefetch: refetch,
    onInvalidateCache: invalidateCache,
    onSelectedLessonChange: setSelectedLesson
  });

  log.debug('DataManager', '🎓 [CourseDataManager] Component rendered with courseId:', courseId);

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
      onDataChange?.(course);
    }
  }, [course, enableOptimisticUpdates, onDataChange]);

  // Listen to store changes and update local course state
  useEffect(() => {
    if (course && storeCourses && storeCourses.length > 0) {
      const updatedCourse = storeCourses.find(c => c.id === course.id);
      if (updatedCourse && (updatedCourse.title !== course.title || updatedCourse.description !== course.description)) {
        log.debug('DataManager', '🎓 [CourseDataManager] Updating local course state from store:', updatedCourse);
      }
    }
  }, [storeCourses, course]);

  // Notify parent of loading state changes
  useEffect(() => {
    onDataLoading?.(loading);
  }, [loading, onDataLoading]);

  // Notify parent of error state changes
  useEffect(() => {
    if (error) {
      onDataError?.(error);
    }
  }, [error, onDataError]);

  // Data validation
  const validateData = useCallback((): boolean => {
    if (!enableDataValidation) return true;
    
    if (!course) {
      log.error('DataManager', '🎓 [CourseDataManager] Data validation failed: No course data');
      return false;
    }
    
    if (!course.modules || course.modules.length === 0) {
      log.warn('DataManager', '🎓 [CourseDataManager] Data validation warning: No modules found');
    }
    
    if (!course.creator_id) {
      log.error('DataManager', '🎓 [CourseDataManager] Data validation failed: No creator ID');
      return false;
    }
    
    return true;
  }, [course, enableDataValidation]);

  // Data recovery
  const recoverFromError = useCallback(async (): Promise<void> => {
    if (!enableDataErrorRecovery) return;
    
    log.debug('DataManager', '🎓 [CourseDataManager] Attempting data recovery...');
    
    try {
      await refetch();
      log.debug('DataManager', '🎓 [CourseDataManager] Data recovery successful');
    } catch (error) {
      log.error('DataManager', '🎓 [CourseDataManager] Data recovery failed:', error);
      throw error;
    }
  }, [enableDataErrorRecovery, refetch]);

  // Data synchronization
  const synchronizeData = useCallback(async (): Promise<void> => {
    if (!enableDataSynchronization) return;
    
    log.debug('DataManager', '🎓 [CourseDataManager] Synchronizing data...');
    
    try {
      await silentRefetch();
      log.debug('DataManager', '🎓 [CourseDataManager] Data synchronization successful');
    } catch (error) {
      log.error('DataManager', '🎓 [CourseDataManager] Data synchronization failed:', error);
      throw error;
    }
  }, [enableDataSynchronization, silentRefetch]);

  // Course management handlers
  const handleEditCourse = useCallback(() => {
    log.debug('DataManager', '📝 [CourseDataManager] Edit course clicked');
    
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
  }, [course, courseId, openCourseDialog]);

  const handleAddFolder = useCallback(() => {
    log.debug('DataManager', '📁 [CourseDataManager] Add folder clicked');
    openFolderDialog('create');
  }, [openFolderDialog]);

  const handleDeleteCourse = useCallback(() => {
    openDeleteCourseDialog();
  }, [openDeleteCourseDialog]);

  // Memoized return object to prevent unnecessary re-renders
  const dataManagerReturn: CourseDataManagerReturn = useMemo(() => ({
    // Data state
    course,
    optimisticCourse,
    loading,
    loadingPhase,
    error,
    isOffline,
    retryCount,
    
    // Ownership state
    isOwner,
    ownershipLoading,
    ownershipError,
    ownershipDetails,
    
    // Navigation state
    selectedLesson,
    isMobile,
    showCourseOverview,
    showLessonView,
    
    // Progress state
    isProgressUpdating,
    progressError,
    
    // Lesson management state
    isCreatingPage,
    creatingModuleId,
    newPageTitle,
    newPageContent,
    isSaving,
    isMigrating,
    
    // Dialog state
    isDeleteDialogOpen,
    isDeleting,
    pageToDelete,
    pageToRevert,
    pageToChangeFolder,
    isReverting,
    isChangingFolder,
    
    // Data operations
    fetchCourseDetails,
    refetch,
    silentRefetch,
    invalidateCache,
    markLessonAsDone,
    
    // Navigation operations
    handleMobileLessonSelect,
    handleNextLesson,
    handleBackToMenu,
    setSelectedLesson,
    
    // Lesson management operations
    handleCreateNewPage,
    handleCancelCreate,
    handleSaveNewPage,
    handleUpdateLesson,
    setNewPageTitle,
    setNewPageContent,
    
    // Dialog operations
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
    handleConfirmChangeFolder,
    
    // Course management operations
    handleEditCourse,
    handleAddFolder,
    handleDeleteCourse,
    
    // Store operations
    openCourseDialog,
    closeCourseDialog,
    openFolderDialog,
    updateCourseProgress,
    
    // Data validation and recovery
    validateData,
    recoverFromError,
    synchronizeData,
  }), [
    course,
    optimisticCourse,
    loading,
    loadingPhase,
    error,
    isOffline,
    retryCount,
    isOwner,
    ownershipLoading,
    ownershipError,
    ownershipDetails,
    selectedLesson,
    isMobile,
    showCourseOverview,
    showLessonView,
    isProgressUpdating,
    progressError,
    isCreatingPage,
    creatingModuleId,
    newPageTitle,
    newPageContent,
    isSaving,
    isMigrating,
    isDeleteDialogOpen,
    isDeleting,
    pageToDelete,
    pageToRevert,
    pageToChangeFolder,
    isReverting,
    isChangingFolder,
    fetchCourseDetails,
    refetch,
    silentRefetch,
    invalidateCache,
    markLessonAsDone,
    handleMobileLessonSelect,
    handleNextLesson,
    handleBackToMenu,
    setSelectedLesson,
    handleCreateNewPage,
    handleCancelCreate,
    handleSaveNewPage,
    handleUpdateLesson,
    setNewPageTitle,
    setNewPageContent,
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
    handleConfirmChangeFolder,
    handleEditCourse,
    handleAddFolder,
    handleDeleteCourse,
    openCourseDialog,
    closeCourseDialog,
    openFolderDialog,
    updateCourseProgress,
    validateData,
    recoverFromError,
    synchronizeData,
  ]);

  return dataManagerReturn;
};

export default CourseDataManager; 