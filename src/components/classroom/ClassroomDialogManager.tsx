import React, { Suspense, lazy } from 'react';
import { useClassroomDialogs } from '@/hooks/classroom/useClassroomDialogs';
import type { CourseDisplayData } from '@/types/classroom';

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

interface ClassroomDialogManagerProps {
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

export function ClassroomDialogManager({ space }: ClassroomDialogManagerProps) {
  const {
    courseDialog,
    moduleDialog,
    lessonDialog,
    closeCourseDialog,
    closeModuleDialog,
    closeLessonDialog,
  } = useClassroomDialogs();

  // Helper to get primary color
  const primaryColor = space?.primary_color ?? '#26A69A';
  
  // Helper to get space pricing type
  const spacePricingType = space?.pricing_type ?? 'free';

  const handleCourseCreated = (course: any) => {
    // The hook will handle updating the store
    // Additional logic can be added here if needed
    console.log('Course created:', course);
  };

  const handleCourseUpdated = (course: any) => {
    // The hook will handle updating the store
    // Additional logic can be added here if needed
    console.log('Course updated:', course);
  };

  const handleModuleCreated = async (title: string, description: string, releaseDelay: number | null) => {
    // TODO: Implement module creation logic
    console.log('Create module:', { title, description, releaseDelay });
  };

  const handleModuleUpdated = async (moduleId: string, title: string, description: string, releaseDelay: number | null) => {
    // TODO: Implement module update logic
    console.log('Update module:', { moduleId, title, description, releaseDelay });
  };

  const handleModuleDeleted = async () => {
    // TODO: Implement module deletion logic
    console.log('Delete module');
  };

  const handleLessonCreated = async (lessonData: any) => {
    // TODO: Implement lesson creation logic
    console.log('Create lesson:', lessonData);
  };

  const handleLessonUpdated = async (updatedLesson: any) => {
    // TODO: Implement lesson update logic
    console.log('Update lesson:', updatedLesson);
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
      console.error('Error processing video URL:', error);
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
            isCreating={false} // TODO: Implement loading state
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
            isUpdating={false} // TODO: Implement loading state
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
            isDeleting={false} // TODO: Implement loading state
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
            isCreating={false} // TODO: Implement loading state
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
            isUpdating={false} // TODO: Implement loading state
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
    </>
  );
}

export default ClassroomDialogManager; 