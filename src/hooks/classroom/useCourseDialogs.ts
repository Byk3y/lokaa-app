import { useState, useCallback } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { log } from '@/utils/logger';
import type { CourseDetailData, CourseLesson } from '@/types/classroom/courseDetail';

interface PageToDelete {
  id: string;
  title: string;
}

interface PageToRevert {
  id: string;
  title: string;
  isPublished: boolean;
}

interface PageToChangeFolder {
  id: string;
  title: string;
  currentFolderId: string | null;
}

interface UseCourseDialogsReturn {
  // Dialog state
  isDeleteDialogOpen: boolean;
  isDeleting: boolean;
  pageToDelete: PageToDelete | null;
  pageToRevert: PageToRevert | null;
  pageToChangeFolder: PageToChangeFolder | null;
  isReverting: boolean;
  isChangingFolder: boolean;
  
  // Dialog handlers
  openDeleteCourseDialog: () => void;
  closeDeleteCourseDialog: () => void;
  openDeletePageDialog: (pageId: string, title: string) => void;
  closeDeletePageDialog: () => void;
  openRevertToDraftDialog: (pageId: string, title: string, isPublished: boolean) => void;
  closeRevertToDraftDialog: () => void;
  openChangeFolderDialog: (pageId: string, title: string, currentFolderId: string | null) => void;
  closeChangeFolderDialog: () => void;
  
  // Dialog confirmation handlers
  handleConfirmDeleteCourse: () => Promise<void>;
  handleConfirmDeletePage: () => Promise<void>;
  handleConfirmRevertToDraft: () => Promise<void>;
  handleConfirmChangeFolder: (folderId: string | null) => Promise<void>;
}

interface UseCourseDialogsProps {
  course: CourseDetailData | null;
  onCourseDeleted?: () => void;
  onPageDeleted?: (pageId: string) => void;
  onPageUpdated?: (pageId: string) => void;
  onPageMoved?: (pageId: string, newFolderId: string | null) => void;
  onRefetch?: () => Promise<CourseDetailData | null>;
  onSelectedLessonChange?: (lesson: CourseLesson | null) => void;
  selectedLesson: CourseLesson | null;
}

export const useCourseDialogs = (props: UseCourseDialogsProps): UseCourseDialogsReturn => {
  const {
    course,
    onCourseDeleted,
    onPageDeleted,
    onPageUpdated,
    onPageMoved,
    onRefetch,
    onSelectedLessonChange,
    selectedLesson
  } = props;
  
  // Dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<PageToDelete | null>(null);
  const [pageToRevert, setPageToRevert] = useState<PageToRevert | null>(null);
  const [pageToChangeFolder, setPageToChangeFolder] = useState<PageToChangeFolder | null>(null);
  const [isReverting, setIsReverting] = useState(false);
  const [isChangingFolder, setIsChangingFolder] = useState(false);
  
  // Dialog open/close handlers
  const openDeleteCourseDialog = useCallback(() => {
    log.debug('Hook', '🎓 [useCourseDialogs] Opening delete course dialog');
    setIsDeleteDialogOpen(true);
  }, []);
  
  const closeDeleteCourseDialog = useCallback(() => {
    log.debug('Hook', '🎓 [useCourseDialogs] Closing delete course dialog');
    setIsDeleteDialogOpen(false);
  }, []);
  
  const openDeletePageDialog = useCallback((pageId: string, title: string) => {
    log.debug('Hook', '🎓 [useCourseDialogs] Opening delete page dialog:', title);
    setPageToDelete({ id: pageId, title });
  }, []);
  
  const closeDeletePageDialog = useCallback(() => {
    log.debug('Hook', '🎓 [useCourseDialogs] Closing delete page dialog');
    setPageToDelete(null);
  }, []);
  
  const openRevertToDraftDialog = useCallback((pageId: string, title: string, isPublished: boolean) => {
    log.debug('Hook', '🎓 [useCourseDialogs] Opening revert to draft dialog:', title);
    setPageToRevert({ id: pageId, title, isPublished });
  }, []);
  
  const closeRevertToDraftDialog = useCallback(() => {
    log.debug('Hook', '🎓 [useCourseDialogs] Closing revert to draft dialog');
    setPageToRevert(null);
  }, []);
  
  const openChangeFolderDialog = useCallback((pageId: string, title: string, currentFolderId: string | null) => {
    log.debug('Hook', '🎓 [useCourseDialogs] Opening change folder dialog:', title);
    setPageToChangeFolder({ id: pageId, title, currentFolderId });
  }, []);
  
  const closeChangeFolderDialog = useCallback(() => {
    log.debug('Hook', '🎓 [useCourseDialogs] Closing change folder dialog');
    setPageToChangeFolder(null);
  }, []);
  
  // Dialog confirmation handlers
  const handleConfirmDeleteCourse = useCallback(async () => {
    if (!course?.id) return;
    
    log.debug('Hook', '🎓 [useCourseDialogs] Confirming course deletion');
    setIsDeleting(true);
    
    try {
      const supabase = getSupabaseClient();

      // Delete course lessons
      const { error: lessonsError } = await supabase
        .from('course_lessons')
        .delete()
        .in('module_id', course.modules.map(m => m.id));

      if (lessonsError) throw lessonsError;

      // Delete course modules
      const { error: modulesError } = await supabase
        .from('course_modules')
        .delete()
        .eq('course_id', course.id);

      if (modulesError) throw modulesError;

      // Delete the course itself
      const { error: courseError } = await supabase
        .from('courses')
        .delete()
        .eq('id', course.id);

      if (courseError) throw courseError;

      // Show success message
      toast({
        title: "Course Deleted",
        description: "The course has been permanently deleted.",
        variant: "default"
      });

      // Close dialog and notify parent
      closeDeleteCourseDialog();
      onCourseDeleted?.();
    } catch (error) {
      console.error('Error deleting course:', error);
      toast({
        title: "Error",
        description: "Failed to delete course. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  }, [course, closeDeleteCourseDialog, onCourseDeleted]);
  
  const handleConfirmDeletePage = useCallback(async () => {
    if (!pageToDelete) return;
    
    log.debug('Hook', '🎓 [useCourseDialogs] Confirming page deletion:', pageToDelete.title);
    setIsDeleting(true);
    
    try {
      const supabase = getSupabaseClient();
      
      // Get the lesson to find its content_id
      const { data: lesson, error: lessonError } = await supabase
        .from('course_lessons')
        .select('content_id')
        .eq('id', pageToDelete.id)
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
        .eq('id', pageToDelete.id);

      if (deleteError) throw deleteError;

      // Refresh course data
      await onRefetch?.();

      // If the deleted lesson was selected, clear the selection
      if (selectedLesson?.id === pageToDelete.id) {
        onSelectedLessonChange?.(null);
      }

      // Show success message
      toast({
        title: "Success",
        description: `Page "${pageToDelete.title}" has been deleted.`,
        variant: "default"
      });

      // Close dialog and notify parent
      closeDeletePageDialog();
      onPageDeleted?.(pageToDelete.id);
    } catch (error) {
      console.error('Error deleting page:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete page",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  }, [pageToDelete, selectedLesson, onRefetch, onSelectedLessonChange, closeDeletePageDialog, onPageDeleted]);
  
  const handleConfirmRevertToDraft = useCallback(async () => {
    if (!pageToRevert) return;
    
    log.debug('Hook', '🎓 [useCourseDialogs] Confirming revert to draft:', pageToRevert.title);
    setIsReverting(true);
    
    try {
      const supabase = getSupabaseClient();

      // Toggle the publish status
      const newStatus = !pageToRevert.isPublished;
      const { error: updateError } = await supabase
        .from('course_lessons')
        .update({ is_published: newStatus })
        .eq('id', pageToRevert.id);

      if (updateError) throw updateError;
      
      // Refresh course data
      await onRefetch?.();

      // Show success message
      toast({
        title: "Success",
        description: `"${pageToRevert.title}" has been ${newStatus ? 'published' : 'reverted to draft'}.`,
        variant: "default"
      });

      // Close dialog and notify parent
      closeRevertToDraftDialog();
      onPageUpdated?.(pageToRevert.id);
    } catch (error) {
      console.error('Error updating page status:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update page status",
        variant: "destructive"
      });
    } finally {
      setIsReverting(false);
    }
  }, [pageToRevert, onRefetch, closeRevertToDraftDialog, onPageUpdated]);
  
  const handleConfirmChangeFolder = useCallback(async (folderId: string | null) => {
    if (!pageToChangeFolder) return;
    
    log.debug('Hook', '🎓 [useCourseDialogs] Confirming change folder:', pageToChangeFolder.title);
    setIsChangingFolder(true);
    
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('course_lessons')
        .update({ module_id: folderId })
        .eq('id', pageToChangeFolder.id);

      if (error) throw error;
      
      // Refresh course data
      await onRefetch?.();

      // Show success message
      toast({
        title: "Success",
        description: `"${pageToChangeFolder.title}" has been moved to ${folderId ? 'the selected folder' : 'root level'}.`,
        variant: "default"
      });

      // Close dialog and notify parent
      closeChangeFolderDialog();
      onPageMoved?.(pageToChangeFolder.id, folderId);
    } catch (error) {
      console.error('Error changing folder:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to change folder",
        variant: "destructive"
      });
    } finally {
      setIsChangingFolder(false);
    }
  }, [pageToChangeFolder, onRefetch, closeChangeFolderDialog, onPageMoved]);
  
  return {
    // Dialog state
    isDeleteDialogOpen,
    isDeleting,
    pageToDelete,
    pageToRevert,
    pageToChangeFolder,
    isReverting,
    isChangingFolder,
    
    // Dialog handlers
    openDeleteCourseDialog,
    closeDeleteCourseDialog,
    openDeletePageDialog,
    closeDeletePageDialog,
    openRevertToDraftDialog,
    closeRevertToDraftDialog,
    openChangeFolderDialog,
    closeChangeFolderDialog,
    
    // Dialog confirmation handlers
    handleConfirmDeleteCourse,
    handleConfirmDeletePage,
    handleConfirmRevertToDraft,
    handleConfirmChangeFolder,
  };
}; 