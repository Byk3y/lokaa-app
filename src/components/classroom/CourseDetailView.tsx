import { log } from '@/utils/logger';
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, X } from 'lucide-react';
import RichTextEditor from '@/components/ui/rich-text-editor';
import { toast } from '@/hooks/use-toast';
import CourseSidebar from './CourseSidebar';
import LessonContent from './LessonContent';
import CourseDetailMobile from './mobile/CourseDetailMobile';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSpace } from '@/contexts/SpaceContext';
import { useClassroomStore } from '@/stores/classroom/classroomStore';
import type { CourseDisplayData } from '@/hooks/useClassroomCache';
import useClassroomCache from '@/hooks/useClassroomCache';
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
import { CourseRouteManager } from './routing/CourseRouteManager';
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
      }
    },
    onNavigationStateChange: (state) => {
      if (process.env.NODE_ENV === 'development') {
      }
    }
  });

  // FIXED: Move useCallback to top level to prevent Rules of Hooks violation
  const handleMobileStateChange = useCallback((state: { isMobile: boolean; showTabs: boolean }) => {
    if (process.env.NODE_ENV === 'development') {
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
      }
    },
    onPageUpdated: (pageId) => {
      if (process.env.NODE_ENV === 'development') {
      }
    },
    onPageMoved: (pageId, newFolderId) => {
      if (process.env.NODE_ENV === 'development') {
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
      }
    },
    onLessonUpdated: (lessonId, updates) => {
      if (process.env.NODE_ENV === 'development') {
        // Lesson updated - optimistic updates handled via useCourseDetail hook
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
    }

    try {
      await markLessonAsDone(selectedLesson, displayCourse);
    } catch (error) {
      console.error('🎓 [CourseDetailView] Error in handleMarkAsDone:', error);
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

  // FIXED: Add mobile loading state to prevent "back to courses" flash
  // Show mobile spinner while mobile state is being determined
  // IMPORTANT: This must come BEFORE the mobile container check
  if (isMobile && (loading || spaceLoading)) {
    if (process.env.NODE_ENV === 'development') {
      console.log('🎓 [CourseDetailView] Mobile loading state:', { 
        loading, 
        spaceLoading, 
        hasSpace: !!space, 
        spaceIconImage: space?.icon_image,
        spaceName: space?.name 
      });
    }
    
    return (
      <div className="fixed inset-0 flex flex-col bg-white z-50">
        {/* Mobile Header */}
        <div className="flex items-center justify-between px-4 py-1.5 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center space-x-3">
            <button 
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors active:bg-gray-200"
              aria-label="Go back to courses"
            >
              <ArrowLeft className="w-6 h-6 text-gray-700" />
            </button>
            
            {/* Space branding */}
            <div className="flex items-center space-x-2">
              {space?.icon_image ? (
                <img 
                  src={space.icon_image} 
                  alt={space.name}
                  className="w-8 h-8 bg-gray-200 rounded-lg object-cover"
                  loading="lazy"
                  onError={(e) => {
                    // Fallback to initials if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      const fallback = parent.querySelector('.space-icon-fallback') as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }
                  }}
                />
              ) : null}
              {/* Always show fallback, but hide if icon loads successfully */}
              <div 
                className={`w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center space-icon-fallback ${
                  space?.icon_image ? 'hidden' : ''
                }`}
              >
                <span className="text-sm font-medium text-gray-600">
                  {space?.name?.charAt(0).toUpperCase() || 'S'}
                </span>
              </div>
              <span className="font-bold text-gray-900 truncate max-w-[120px]">
                {space?.name || 'Space'}
              </span>
            </div>
          </div>
        </div>
        
        {/* Mobile Loading Spinner at Top */}
        <div className="flex justify-center py-8 border-b border-gray-100">
          <div className="w-8 h-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
        </div>
        
        {/* Empty content area */}
        <div className="flex-1"></div>
      </div>
    );
  }

  // MOBILE OPTIMIZATION: Prioritize mobile view over loading states
  // This eliminates white screen and long spinner on mobile
  if (showCourseOverview || showLessonView) {
    if (process.env.NODE_ENV === 'development') {
      console.log('🎓 [CourseDetailView] Rendering mobile container:', { showCourseOverview, showLessonView });
    }
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

  // Use course data directly (optimistic updates handled in useCourseDetail hook)
  const displayCourse = course;

  // Show loading state first
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
      </div>
    );
  }

  // Desktop error state - only show error for desktop view
  if (error || !displayCourse) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-red-500 mb-4">
          <X className="h-12 w-12 mx-auto" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Course Not Found</h3>
        <p className="text-gray-600 mb-4">
          {error?.includes('No rows returned') || error?.includes('not found') 
            ? 'The course you\'re looking for doesn\'t exist or has been removed.'
            : error || 'Course not found'}
        </p>
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Classroom
        </Button>
      </div>
    );
  }

  // Regular course view with Skool-style "New page" button (Desktop)
  return (
    <>
      <div className="flex w-full">
        <CourseSidebar
          course={displayCourse}
          selectedLesson={selectedLesson}
          onLessonSelect={setSelectedLesson}
          isOwner={isOwner}
          isAdmin={isAdmin}
          ownershipLoading={false}
          isCreatingPage={isCreatingPage}
          onAddLesson={(moduleId) => handleCreateNewPage(moduleId)}
          onAddModule={() => handleCreateNewPage()}
          onEditCourse={handleEditCourse}
          onDeleteCourse={handleDeleteCourse}
          onAddFolder={handleAddFolder}
          spaceId={displayCourse.space_id}
          onDeletePage={(pageId, title) => openDeletePageDialog(pageId, title)}
          onRevertToDraft={(pageId, title, isPublished) => openRevertToDraftDialog(pageId, title, isPublished)}
          onChangeFolder={(pageId, title, currentFolderId) => openChangeFolderDialog(pageId, title, currentFolderId)}
        />

        <div className="flex-1 w-full min-w-0">
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
                isSaving={false}
                spaceId={displayCourse?.space_id}
                courseId={displayCourse?.id}
                lessonId={undefined}
              />
            </div>
          ) : (
            <LessonContent
              lesson={selectedLesson}
              courseName={displayCourse.title}
              isOwner={isOwner}
              isAdmin={isAdmin}
              completed={selectedLesson?.completed || false}
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
          primary_color: '#26A69A',
          pricing_type: 'free'
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
});

export default CourseDetailViewInternal;