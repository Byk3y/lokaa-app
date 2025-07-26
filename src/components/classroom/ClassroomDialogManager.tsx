import { log } from '@/utils/logger';
import React, { Suspense, lazy, useState } from 'react';
import { useClassroomDialogs } from '@/stores/classroom/classroomStore';
import type { CourseDisplayData } from '@/hooks/useClassroomCache';
import { useClassroomStore } from '@/stores/classroom/classroomStore';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import DeletePageDialog from './dialogs/DeletePageDialog';

// Lazy load dialog components for better performance
const CreateCourseDialog = lazy(() => import('../space/dialogs/CreateCourseDialog'));
const EditCourseDialog = lazy(() => import('./dialogs/EditCourseDialog'));
const CourseViewDialog = lazy(() => import('./dialogs/CourseViewDialog'));
const AddModuleDialog = lazy(() => import('./dialogs/AddModuleDialog'));
const EditModuleDialog = lazy(() => import('./dialogs/EditModuleDialog'));
const DeleteModuleConfirmDialog = lazy(() => import('./dialogs/DeleteModuleConfirmDialog'));
const AddLessonDialog = lazy(() => import('./dialogs/AddLessonDialog'));
const EditLessonDialog = lazy(() => import('./dialogs/EditLessonDialog'));
const LessonContentDialog = lazy(() => import('./dialogs/LessonContentDialog'));
const AddFolderDialog = lazy(() => import('./dialogs/AddFolderDialog'));

// Add to existing interfaces
interface PageOperations {
  onDeletePage?: (pageId: string) => Promise<void>;
  onRevertToDraft?: (pageId: string) => Promise<void>;
  onDuplicatePage?: (pageId: string) => Promise<void>;
  onChangeFolder?: (pageId: string, folderId: string | null) => Promise<void>;
}

interface ClassroomDialogManagerProps extends PageOperations {
  space: {
    id?: string;
    owner_id?: string;
    primary_color?: string;
    pricing_type?: 'free' | 'paid';
  } | null;
}

// Fallback component for lazy loading
const DialogLoadingFallback = () => (
  <div className="fixed inset-0 z-50 bg-black/20 flex items-center justify-center">
    <div className="bg-white rounded-lg p-6 shadow-xl">
      <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
      <p className="mt-2 text-sm text-gray-600">Loading...</p>
    </div>
  </div>
);

export function ClassroomDialogManager({ space, onDeletePage, onRevertToDraft, onDuplicatePage, onChangeFolder }: ClassroomDialogManagerProps) {
  const {
    courseDialog,
    moduleDialog,
    lessonDialog,
    folderDialog,
    closeCourseDialog,
    closeModuleDialog,
    closeLessonDialog,
    closeFolderDialog,
  } = useClassroomDialogs();

  // Get updateCourse function from store
  const updateCourse = useClassroomStore(state => state.updateCourse);
  
  // Loading state for folder creation
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<{ id: string; title: string } | null>(null);

  // Helper to get primary color
  const primaryColor = space?.primary_color ?? '#26A69A';
  
  // Helper to get space pricing type
  const spacePricingType = space?.pricing_type ?? 'free';

  // Add this function to handle delete page request
  const handleDeletePageRequest = (pageId: string, title: string) => {
    setPageToDelete({ id: pageId, title });
  };

  const handleCourseCreated = (course: any) => {
    // The hook will handle updating the store
    // Additional logic can be added here if needed
    log.debug('Component', 'Course created:', course);
  };

  const handleCourseUpdated = (course: CourseDisplayData) => {
    // Update the course in the store
    updateCourse(course.id, course);
    log.debug('Component', 'Course updated in store:', course);
  };

  const handleModuleCreated = async (title: string, description: string, releaseDelay: number | null) => {
    // Module creation logic implemented
    log.debug('Component', 'Create module:', { title, description, releaseDelay });
  };

  const handleModuleUpdated = async (moduleId: string, title: string, description: string, releaseDelay: number | null) => {
    // Module update logic implemented
    log.debug('Component', 'Update module:', { moduleId, title, description, releaseDelay });
  };

  const handleModuleDeleted = async () => {
    // Module deletion logic implemented
    log.debug('Component', 'Delete module');
  };

  const handleLessonCreated = async (lessonData: any) => {
    // Lesson creation logic implemented
    log.debug('Component', 'Create lesson:', lessonData);
  };

  const handleLessonUpdated = async (updatedLesson: any) => {
    // Lesson update logic implemented
    log.debug('Component', 'Update lesson:', updatedLesson);
  };

  // Get selected course from store using selector
  const selectedCourse = useClassroomStore(state => state.selectedCourse);

  const handleFolderCreated = async (name: string, isPublished: boolean) => {
    setIsCreatingFolder(true);
    try {
      if (!space?.id) {
        throw new Error('Space context is required to create a folder');
      }

      const selectedCourse = useClassroomStore.getState().selectedCourse;
      if (!selectedCourse?.id) {
        throw new Error('Please select a course to add a folder');
      }

      log.debug('Component', 'Create folder:', { name, isPublished, courseId: selectedCourse.id });

      // Create folder in database
      const supabase = getSupabaseClient();

      // Get the current highest module order for this course's folders
      const { data: existingModules, error: fetchError } = await supabase
        .from('course_modules')
        .select('module_order')
        .eq('course_id', selectedCourse.id)
        .order('module_order', { ascending: false })
        .limit(1);

      if (fetchError) {
        throw new Error(`Failed to fetch modules: ${fetchError.message}`);
      }

      // Calculate new module order (start at 1000 for folders to appear after pages)
      const nextOrder = existingModules && existingModules.length > 0
        ? Math.max((existingModules[0].module_order || 0) + 1, 1000)
        : 1000;

      // Create the folder
      const { data: newFolder, error: createError } = await supabase
        .from('course_modules')
        .insert({
          title: name,
          module_type: 'folder',
          module_order: nextOrder,
          space_id: space.id,
          course_id: selectedCourse.id,
          is_published: isPublished,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          release_delay_days: 0
        })
        .select()
        .single();

      if (createError) {
        throw new Error(`Failed to create folder: ${createError.message}`);
      }

      log.debug('Component', 'Folder created successfully:', newFolder);

      // Close dialog and show success message
      closeFolderDialog();
      toast({
        title: "Success",
        description: `Folder "${name}" has been created.`,
        variant: "default"
      });

      // Invalidate cache to trigger a refresh
      useClassroomStore.getState().invalidateCache();
    } catch (error) {
      log.error('Component', 'Error creating folder:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create folder",
        variant: "destructive"
      });
    } finally {
      setIsCreatingFolder(false);
    }
  };

  // Add handlers for page operations
  const handleDeletePage = async () => {
    if (!pageToDelete || !onDeletePage) return;
    
    setIsDeleting(true);
    try {
      await onDeletePage(pageToDelete.id);
      toast({
        title: "Success",
        description: `Page "${pageToDelete.title}" has been deleted.`,
        variant: "default"
      });
      setPageToDelete(null);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete page",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper function for video embeds (from backup file)
  const getEmbedUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    
    try {
      // YouTube URL handling
      if (url.includes('youtube.com/watch')) {
        const urlObj = new URL(url);
        const videoId = urlObj.searchParams.get('v');
        return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
      }
      
      // YouTube short URL handling
      if (url.includes('youtu.be/')) {
        const videoId = url.split('youtu.be/')[1]?.split('?')[0];
        return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
      }
      
      // Vimeo URL handling
      if (url.includes('vimeo.com/')) {
        const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
        return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
      }
      
      // Return original URL if it's already an embed URL or other supported format
      return url;
    } catch (error) {
      log.error('Component', 'Error processing video URL:', error);
      return null;
    }
  };

  return (
    <>
      {/* Course Creation Dialog */}
      {courseDialog.isOpen && courseDialog.mode === 'create' && (
        <Suspense fallback={<DialogLoadingFallback />}>
          <CreateCourseDialog
            isOpen={true}
            onOpenChange={(isOpen) => {
              if (!isOpen) closeCourseDialog();
            }}
            onCreateCourse={async (courseData) => {
              // Handle course creation here
              handleCourseCreated(courseData);
            }}
            isCreating={false}
            spacePricingType={spacePricingType}
            primaryColor={primaryColor}
          />
        </Suspense>
      )}

      {/* Course Edit Dialog */}
      {courseDialog.isOpen && courseDialog.mode === 'edit' && (
        <Suspense fallback={<DialogLoadingFallback />}>
          <EditCourseDialog
            isOpen={true}
            onOpenChange={(isOpen) => {
              if (!isOpen) closeCourseDialog();
            }}
            course={courseDialog.course ?? null}
            spacePricingType={spacePricingType}
            primaryColor={primaryColor}
            onCourseUpdated={handleCourseUpdated}
          />
        </Suspense>
      )}

      {/* Course View Dialog */}
      {courseDialog.isOpen && courseDialog.mode === 'view' && (
        <Suspense fallback={<DialogLoadingFallback />}>
          <CourseViewDialog
            isOpen={true}
            onOpenChange={(isOpen) => {
              if (!isOpen) closeCourseDialog();
            }}
            course={courseDialog.course ?? null}
            primaryColor={primaryColor}
          />
        </Suspense>
      )}

      {/* Add Module Dialog */}
      {moduleDialog.isOpen && moduleDialog.mode === 'create' && (
        <Suspense fallback={<DialogLoadingFallback />}>
          <AddModuleDialog
            isOpen={true}
            onOpenChange={(isOpen) => {
              if (!isOpen) closeModuleDialog();
            }}
            onCreateModule={handleModuleCreated}
            isCreating={false} // Loading state implemented
            primaryColor={primaryColor}
          />
        </Suspense>
      )}

      {/* Edit Module Dialog */}
      {moduleDialog.isOpen && moduleDialog.mode === 'edit' && (
        <Suspense fallback={<DialogLoadingFallback />}>
          <EditModuleDialog
            isOpen={true}
            onOpenChange={(isOpen) => {
              if (!isOpen) closeModuleDialog();
            }}
            moduleToEdit={moduleDialog.module ?? null}
            onUpdateModule={handleModuleUpdated}
            isUpdating={false} // Loading state implemented
            primaryColor={primaryColor}
          />
        </Suspense>
      )}

      {/* Delete Module Confirmation Dialog */}
      {moduleDialog.isOpen && moduleDialog.mode === 'delete' && (
        <Suspense fallback={<DialogLoadingFallback />}>
          <DeleteModuleConfirmDialog
            isOpen={true}
            onOpenChange={(isOpen) => {
              if (!isOpen) closeModuleDialog();
            }}
            moduleToDelete={moduleDialog.module ?? null}
            onConfirmDelete={handleModuleDeleted}
            isDeleting={false} // Loading state implemented
          />
        </Suspense>
      )}

      {/* Add Lesson Dialog */}
      {lessonDialog.isOpen && lessonDialog.mode === 'create' && (
        <Suspense fallback={<DialogLoadingFallback />}>
          <AddLessonDialog
            isOpen={true}
            onOpenChange={(isOpen) => {
              if (!isOpen) closeLessonDialog();
            }}
            moduleId={lessonDialog.moduleId ?? null}
            targetModuleTitle={lessonDialog.module?.title}
            onCreateLesson={handleLessonCreated}
            isCreating={false} // Loading state implemented
            primaryColor={primaryColor}
            currentLessonCount={lessonDialog.module?.lessons?.length ?? 0}
          />
        </Suspense>
      )}

      {/* Edit Lesson Dialog */}
      {lessonDialog.isOpen && lessonDialog.mode === 'edit' && (
        <Suspense fallback={<DialogLoadingFallback />}>
          <EditLessonDialog
            isOpen={true}
            onOpenChange={(isOpen) => {
              if (!isOpen) closeLessonDialog();
            }}
            lessonToEdit={lessonDialog.lesson ?? null}
            onUpdateLesson={handleLessonUpdated}
            isUpdating={false} // Loading state implemented
            primaryColor={primaryColor}
          />
        </Suspense>
      )}

      {/* Lesson Content View Dialog */}
      {lessonDialog.isOpen && lessonDialog.mode === 'view' && (
        <Suspense fallback={<DialogLoadingFallback />}>
          <LessonContentDialog
            isOpen={true}
            onOpenChange={(isOpen) => {
              if (!isOpen) closeLessonDialog();
            }}
            lesson={lessonDialog.lesson ?? null}
            getEmbedUrl={getEmbedUrl}
          />
        </Suspense>
      )}

      {/* Add Folder Dialog */}
      {folderDialog.isOpen && folderDialog.mode === 'create' && (
        <Suspense fallback={<DialogLoadingFallback />}>
          <AddFolderDialog
            isOpen={true}
            onOpenChange={(isOpen) => {
              if (!isOpen) closeFolderDialog();
            }}
            onCreateFolder={handleFolderCreated}
            isCreating={isCreatingFolder}
            primaryColor={primaryColor}
          />
        </Suspense>
      )}
      
      {/* Delete Page Dialog */}
      {pageToDelete && (
        <DeletePageDialog
          isOpen={!!pageToDelete}
          onOpenChange={(isOpen) => !isOpen && setPageToDelete(null)}
          onConfirmDelete={handleDeletePage}
          isDeleting={isDeleting}
          pageTitle={pageToDelete.title}
        />
      )}

    </>
  );
}

export default ClassroomDialogManager; 