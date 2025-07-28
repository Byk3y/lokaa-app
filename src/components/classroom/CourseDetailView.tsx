import { log } from '@/utils/logger';
import { getLessonUrl } from '@/utils/slugUtils';
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, X } from 'lucide-react';
import RichTextEditor from '@/components/ui/rich-text-editor';
import { toast } from '@/hooks/use-toast';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import CourseSidebar from './CourseSidebar';
import LessonContent from './LessonContent';
import MobileCourseOverview from './MobileCourseOverview';
import MobileLessonView from './MobileLessonView';
import CourseDetailMobile from './mobile/CourseDetailMobile';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSpace } from '@/contexts/SpaceContext';
import { EducationalContentService } from '@/services/EducationalContentService';
import { useClassroomStore, useClassroomCourses } from '@/stores/classroom/classroomStore';
import type { CourseDisplayData } from '@/hooks/useClassroomCache';
import { useCachedClassroom } from '@/hooks/useCachedClassroom';
import { ClassroomDialogManager } from './ClassroomDialogManager';
import { DeleteCourseDialog } from './dialogs/DeleteCourseDialog';
import DeletePageDialog from './dialogs/DeletePageDialog';
import RevertToDraftDialog from './dialogs/RevertToDraftDialog';
import ChangeFolderDialog from './dialogs/ChangeFolderDialog';
import { useCourseDetail } from '@/hooks/classroom';
import { useCourseProgress } from '@/hooks/classroom/useCourseProgress';
import { useCourseOwnership } from '@/hooks/classroom/useCourseOwnership';
import { useCourseNavigation } from '@/hooks/classroom/useCourseNavigation';
import { useCourseDialogs } from '@/hooks/classroom/useCourseDialogs';
import { useLessonManagement } from '@/hooks/classroom/useLessonManagement';
import type { 
  CourseModule, 
  CourseLesson, 
  CourseDetailData, 
  CourseDetailViewProps 
} from '@/types/classroom/courseDetail';

const CourseDetailView: React.FC<CourseDetailViewProps> = ({
  courseId,
  onBack,
  moduleId,
  lessonId,
}) => {
  const navigate = useNavigate();
  const { subdomain } = useParams<{ subdomain: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Mobile detection and view state - now handled by useCourseNavigation hook
  const mdParam = searchParams.get('md');
  
  const { user } = useAuth();
  const { space } = useSpace();
  const supabase = getSupabaseClient();
  
  // Get classroom store for dialog management
  const openCourseDialog = useClassroomStore(state => state.openCourseDialog);
  const closeCourseDialog = useClassroomStore(state => state.closeCourseDialog);
  const openFolderDialog = useClassroomStore(state => state.openFolderDialog);
  
  // Listen to store changes to update local course state
  const storeCourses = useClassroomCourses();
  
  // Get classroom cache for progress updates
  const { updateCourseProgress: updateCachedProgress } = useCachedClassroom(space?.id, user?.id, space?.owner_id);
  
  // Use the new course detail hook
  const {
    course,
    loading,
    loadingPhase,
    error,
    fetchCourseDetails,
    refetch,
    silentRefetch,
    invalidateCache,
    updateCourseProgress,
    retryCount,
    isOffline
  } = useCourseDetail({
    enableMobileOptimizations: true,
    enableOfflineSupport: true,
    retryOnError: true
  });
  
  // Local optimistic course state for mobile components (kept for mobile fallback)
  const [optimisticCourse, setOptimisticCourse] = useState<CourseDetailData | null>(null);

  // Use the new progress management hook
  const { markLessonAsDone, isUpdating: isProgressUpdating, error: progressError } = useCourseProgress({
    onOptimisticUpdate: (updatedCourse) => {
      console.log('🎓 [CourseDetailView] Optimistic update received from progress hook:', {
        progress: updatedCourse.progress,
        lessonCount: updatedCourse.modules?.flatMap(m => m.lessons)?.length
      });
      
      // Update the course detail hook immediately for instant UI feedback
      updateCourseProgress(updatedCourse);
      
      // Also update the cached progress
      updateCachedProgress?.(updatedCourse);
      
      // Set optimistic course for mobile components
      setOptimisticCourse(updatedCourse);
    },
    onProgressUpdate: () => {
      console.log('🎓 [CourseDetailView] Progress update callback triggered, refreshing course data');
      // Refresh course data after database update is complete
      refetch();
    }
  });

  // Use the new ownership management hook
  const { isOwner, ownershipLoading, error: ownershipError, ownershipDetails } = useCourseOwnership({
    course,
    onOwnershipChange: (isOwner) => {
      console.log('🎓 [CourseDetailView] Ownership changed:', isOwner);
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
    handleMobileLessonSelect,
    handleNextLesson,
    handleBackToMenu,
    setSelectedLesson
  } = useCourseNavigation({
    course,
    onLessonChange: (lesson) => {
      console.log('🎓 [CourseDetailView] Lesson changed:', lesson?.title);
    },
    onNavigationStateChange: (state) => {
      console.log('🎓 [CourseDetailView] Navigation state changed:', state);
      // COMPLETELY DISABLE mobile state signaling from CourseDetailView
      // Let CourseDetailMobile handle all mobile state management
    }
  });

  // REMOVED: Desktop state dispatch that was causing tab switching issues
  // Instead of complex state management, we'll use a simple back button for desktop navigation

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
      console.log('🎓 [CourseDetailView] Page deleted:', pageId);
    },
    onPageUpdated: (pageId) => {
      console.log('🎓 [CourseDetailView] Page updated:', pageId);
    },
    onPageMoved: (pageId, newFolderId) => {
      console.log('🎓 [CourseDetailView] Page moved:', pageId, 'to folder:', newFolderId);
    },
    onRefetch: refetch,
    onSelectedLessonChange: setSelectedLesson,
    selectedLesson
  });

  // Use the new lesson management hook
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
      console.log('🎓 [CourseDetailView] Lesson created:', lesson.title);
    },
    onLessonUpdated: (lessonId, updates) => {
      console.log('🎓 [CourseDetailView] Lesson updated:', lessonId, updates);
    },
    onRefetch: refetch,
    onInvalidateCache: invalidateCache,
    onSelectedLessonChange: setSelectedLesson
  });

  // FIXED: Move useCallback to top level to prevent Rules of Hooks violation
  const handleMobileStateChange = useCallback((state: { isMobile: boolean; showTabs: boolean }) => {
    console.log('🎓 [CourseDetailView] Mobile state change from container:', state);
    // Signal to parent about mobile state for tab visibility
    window.dispatchEvent(new CustomEvent('courseDetailMobileState', {
      detail: state
    }));
  }, []);

  log.debug('Component', '🎓 [CourseDetailView] Component rendered with courseId:', courseId);
  
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 [CourseDetailView] Component render:', {
      courseId,
      hasCourse: !!course,
      hasSelectedLesson: !!selectedLesson,
      isMobile,
      showCourseOverview,
      showLessonView,
      pathname: window.location.pathname
    });
  }



  // Fetch course data when courseId changes
  useEffect(() => {
    if (courseId) {
      fetchCourseDetails(courseId, moduleId);
    }
  }, [courseId, moduleId]); // Refetch when courseId or moduleId changes

  // Update optimistic course state when hook course data changes (for mobile fallback)
  useEffect(() => {
    if (course) {
      setOptimisticCourse(course);
    }
  }, [course]);



  // Listen to store changes and update local course state
  useEffect(() => {
    if (course && storeCourses && storeCourses.length > 0) {
      const updatedCourse = storeCourses.find(c => c.id === course.id);
      if (updatedCourse && (updatedCourse.title !== course.title || updatedCourse.description !== course.description)) {
        log.debug('Component', '🎓 [CourseDetailView] Updating local course state from store:', updatedCourse);
        // Note: Course state is now managed by the hook, so we don't need to update it here
      }
    }
  }, [storeCourses, course]);









  const handleMarkAsDone = async () => {
    if (!selectedLesson || !course) {
      toast({
        title: "Error",
        description: "No lesson selected or course data not available.",
        variant: "destructive"
      });
      return;
    }

    console.log('🎓 [CourseDetailView] handleMarkAsDone called for lesson:', selectedLesson.id);
    
    // Use the new progress management hook
    await markLessonAsDone(selectedLesson, course);
  };

  // Course management handlers
  const handleEditCourse = () => {
    log.debug('Component', '📝 [CourseDetailView] Edit course clicked');
    
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
      access_type: 'open', // Default to open, will be fetched from database
      price: null,
      currency: 'USD',
      is_published: true, // Default to published, will be fetched from database
      image_url: null,
      slug: courseId, // Use the current courseId as slug
      students: 0,
      enrolled: false,
      progress: 0,
      weeks: 0
    };

    // Open the edit course dialog using the store
    openCourseDialog('edit', courseDisplayData);
  };



  const handleAddFolder = () => {
    log.debug('Component', '📁 [CourseDetailView] Add folder clicked');
    openFolderDialog('create');
  };

  const handleDeleteCourse = () => {
    openDeleteCourseDialog();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
      </div>
    );
  }

  if (error || !course) {
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

  // Mobile view - use the new mobile container component
  if (showCourseOverview || showLessonView) {
    console.log('🎓 [CourseDetailView] Rendering mobile container:', { showCourseOverview, showLessonView });
    return (
      <CourseDetailMobile
        courseId={courseId}
        onBack={onBack}
        moduleId={moduleId}
        lessonId={lessonId}
        onMobileStateChange={handleMobileStateChange}
      />
    );
  }

  // Handle loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading course...</p>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <X className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Course Not Found</h3>
          <p className="text-gray-600 mb-4">
            {error.includes('No rows returned') || error.includes('not found') 
              ? 'The course you\'re looking for doesn\'t exist or has been removed.'
              : error}
          </p>
          <Button onClick={onBack} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Classroom
          </Button>
        </div>
      </div>
    );
  }

  // Handle case where course is null
  if (!course) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-gray-500 mb-4">
            <X className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Course Not Found</h3>
          <p className="text-gray-600 mb-4">
            The course you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={onBack} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Classroom
          </Button>
        </div>
      </div>
    );
  }

  // Regular course view with Skool-style "New page" button (Desktop)
  
  return (
    <>
      <div className="flex">
          <CourseSidebar
            course={course}
            selectedLesson={selectedLesson}
            onLessonSelect={setSelectedLesson}
            isOwner={isOwner}
            isAdmin={isAdmin}
            ownershipLoading={ownershipLoading}
            isCreatingPage={isCreatingPage}
            onAddLesson={(moduleId) => handleCreateNewPage(moduleId)}
            onEditLesson={() => {}} // Handled by LessonContent now
            onAddModule={() => handleCreateNewPage()}
            onEditCourse={handleEditCourse}
            onDeleteCourse={handleDeleteCourse}
            onAddFolder={handleAddFolder}
            spaceId={course.space_id}
            onDeletePage={(pageId, title) => openDeletePageDialog(pageId, title)}
            onRevertToDraft={(pageId, title, isPublished) => openRevertToDraftDialog(pageId, title, isPublished)}
            onChangeFolder={(pageId, title, currentFolderId) => openChangeFolderDialog(pageId, title, currentFolderId)}
            onDuplicatePage={(pageId) => {
              // Handle duplicate page
            }}
          />

        <div className="flex-1">
          {/* Show inline page creation in right panel - Direct to editor without title field */}
          {isCreatingPage ? (
            <div className="flex-1 pt-1 pb-6 pl-12 pr-6 overflow-hidden bg-gray-50">
              <RichTextEditor
                content={newPageContent}
                onChange={setNewPageContent}
                placeholder="Write your lesson content here...

You can use headings, bold text, links, and other formatting to structure your content."
                className="h-full"
                onSave={(title, content) => {
                  setNewPageTitle(title);
                  setNewPageContent(content);
                  handleSaveNewPage(title);
                }}
                onCancel={handleCancelCreate}
                hideTitle={false}
                isSaving={isSaving}
                spaceId={course?.space_id}
                courseId={course?.id}
                lessonId={undefined}
              />
            </div>
          ) : (
          <LessonContent
            lesson={selectedLesson}
            courseName={course.title}
            isOwner={isOwner}
            isAdmin={isAdmin}
            completed={(() => {
              if (!selectedLesson || !course) return false;
              // Find the lesson in the current course state to get the most up-to-date completion status
              const moduleWithLesson = course.modules.find(m => 
                m.lessons.some(l => l.id === selectedLesson.id)
              );
              const currentLesson = moduleWithLesson?.lessons.find(l => l.id === selectedLesson.id);
              return currentLesson?.completed || false;
            })()}
            onUpdateLesson={handleUpdateLesson}
            onCreateNewPage={() => handleCreateNewPage()}
            onMarkAsDone={handleMarkAsDone}
          />
          )}
        </div>
      </div>
      
      {/* Dialog Manager for Edit Course Dialog */}
      <ClassroomDialogManager 
        space={{
          id: course.space_id,
          owner_id: course.creator_id,
          primary_color: '#26A69A', // Default color
          pricing_type: 'free' // Default to free
        }}
        onDeletePage={async (pageId: string) => {
          try {
            const supabase = getSupabaseClient();
            
            // Get the lesson to find its content_id
            const { data: lesson, error: lessonError } = await supabase
              .from('course_lessons')
              .select('content_id')
              .eq('id', pageId)
              .single();

            if (lessonError) throw lessonError;

            // Delete the educational content if it exists
            if (lesson.content_id) {
              const { error: contentError } = await supabase
                .from('educational_content')
                .delete()
                .eq('id', lesson.content_id);

              if (contentError) throw contentError;
            }

            // Delete the lesson
            const { error: deleteError } = await supabase
              .from('course_lessons')
              .delete()
              .eq('id', pageId);

            if (deleteError) throw deleteError;

            // Refresh course data
            await refetch();

            // If the deleted lesson was selected, clear the selection
            if (selectedLesson?.id === pageId) {
              setSelectedLesson(null);
            }



          } catch (error) {
            console.error('Error deleting page:', error);
            throw error;
          }
        }}
        onRevertToDraft={async (pageId: string) => {
          try {
            const supabase = getSupabaseClient();
            const { error } = await supabase
              .from('course_lessons')
              .update({ is_published: false })
              .eq('id', pageId);

            if (error) throw error;
            await refetch();
          } catch (error) {
            console.error('Error reverting page to draft:', error);
            throw error;
          }
        }}
        onDuplicatePage={async (pageId: string) => {
          try {
            const supabase = getSupabaseClient();
            
            // Get the original lesson and its content
            const { data: originalLesson, error: lessonError } = await supabase
              .from('course_lessons')
              .select(`
                *,
                educational_content (*)
              `)
              .eq('id', pageId)
              .single();

            if (lessonError) throw lessonError;

            // Create new educational content if it exists
            let newContentId = null;
            if (originalLesson.educational_content) {
              const { data: newContent, error: contentError } = await supabase
                .from('educational_content')
                .insert({
                  ...originalLesson.educational_content,
                  id: undefined,
                  title: `${originalLesson.educational_content.title} (Copy)`,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
                .select()
                .single();

              if (contentError) throw contentError;
              newContentId = newContent.id;
            }

            // Create the duplicate lesson
            const { error: duplicateError } = await supabase
              .from('course_lessons')
              .insert({
                ...originalLesson,
                id: undefined,
                title: `${originalLesson.title} (Copy)`,
                content_id: newContentId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });

            if (duplicateError) throw duplicateError;
            await refetch();
          } catch (error) {
            console.error('Error duplicating page:', error);
            throw error;
          }
        }}
        onChangeFolder={async (pageId: string, folderId: string | null) => {
          try {
            const supabase = getSupabaseClient();
            const { error } = await supabase
              .from('course_lessons')
              .update({ module_id: folderId })
              .eq('id', pageId);

            if (error) throw error;
            await refetch();
          } catch (error) {
            console.error('Error changing folder:', error);
            throw error;
          }
        }}
      />

      {/* Delete Course Dialog */}
      <DeleteCourseDialog
        isOpen={isDeleteDialogOpen}
        onClose={closeDeleteCourseDialog}
        onConfirm={handleConfirmDeleteCourse}
        courseName={course.title}
        isDeleting={isDeleting}
      />

      {/* Delete Page Dialog */}
      {pageToDelete && (
        <DeletePageDialog
          isOpen={!!pageToDelete}
          onOpenChange={(isOpen) => !isOpen && closeDeletePageDialog()}
          onConfirmDelete={handleConfirmDeletePage}
          isDeleting={isDeleting}
          pageTitle={pageToDelete.title}
        />
      )}

      {/* Revert to Draft Dialog */}
      {pageToRevert && (
        <RevertToDraftDialog
          isOpen={!!pageToRevert}
          onOpenChange={(isOpen) => !isOpen && closeRevertToDraftDialog()}
          onConfirmRevert={handleConfirmRevertToDraft}
          isReverting={isReverting}
          pageTitle={pageToRevert.title}
          isPublished={pageToRevert.isPublished}
        />
      )}

      {/* Change Folder Dialog */}
      {pageToChangeFolder && (
        <ChangeFolderDialog
          isOpen={!!pageToChangeFolder}
          onOpenChange={(isOpen) => !isOpen && closeChangeFolderDialog()}
          onConfirmChange={handleConfirmChangeFolder}
          isChanging={isChangingFolder}
          pageTitle={pageToChangeFolder.title}
          courseId={course.id}
          currentFolderId={pageToChangeFolder.currentFolderId}
        />
      )}
    </>
  );
};

export default CourseDetailView; 