import React from 'react';
import { ClassroomDialogManager } from '../ClassroomDialogManager';
import { DeleteCourseDialog } from '../dialogs/DeleteCourseDialog';
import DeletePageDialog from '../dialogs/DeletePageDialog';
import RevertToDraftDialog from '../dialogs/RevertToDraftDialog';
import ChangeFolderDialog from '../dialogs/ChangeFolderDialog';
import { getSupabaseClient } from '@/integrations/supabase/client';
import type { CourseDetailData, CourseLesson } from '@/types/classroom/courseDetail';

interface CourseDialogManagerProps {
  course: CourseDetailData;
  selectedLesson: CourseLesson | null;
  // Delete course dialog state
  isDeleteDialogOpen: boolean;
  isDeleting: boolean;
  closeDeleteCourseDialog: () => void;
  handleConfirmDeleteCourse: () => Promise<void>;
  // Page dialogs state
  pageToDelete: { id: string; title: string } | null;
  pageToRevert: { id: string; title: string; isPublished: boolean } | null;
  pageToChangeFolder: { id: string; title: string; currentFolderId: string | null } | null;
  isReverting: boolean;
  isChangingFolder: boolean;
  closeDeletePageDialog: () => void;
  closeRevertToDraftDialog: () => void;
  closeChangeFolderDialog: () => void;
  handleConfirmDeletePage: () => Promise<void>;
  handleConfirmRevertToDraft: () => Promise<void>;
  handleConfirmChangeFolder: () => Promise<void>;
  // Actions
  refetch: () => Promise<void>;
  setSelectedLesson: (lesson: CourseLesson | null) => void;
}

/**
 * CourseDialogManager consolidates all dialog management logic
 * Extracted from CourseDetailView to isolate dialog-specific functionality
 */
export const CourseDialogManager: React.FC<CourseDialogManagerProps> = ({
  course,
  selectedLesson,
  isDeleteDialogOpen,
  isDeleting,
  closeDeleteCourseDialog,
  handleConfirmDeleteCourse,
  pageToDelete,
  pageToRevert,
  pageToChangeFolder,
  isReverting,
  isChangingFolder,
  closeDeletePageDialog,
  closeRevertToDraftDialog,
  closeChangeFolderDialog,
  handleConfirmDeletePage,
  handleConfirmRevertToDraft,
  handleConfirmChangeFolder,
  refetch,
  setSelectedLesson
}) => {
  return (
    <>
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
};