import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ClassroomToastManager {
  // Success notifications
  showSuccess: (title: string, description?: string) => void;
  showLessonSuccess: (action: 'created' | 'updated' | 'deleted', title: string) => void;
  showCourseSuccess: (action: 'created' | 'updated' | 'deleted', title: string) => void;
  
  // Error notifications (use with error handler)
  showError: (title: string, description?: string) => void;
  
  // Info notifications
  showInfo: (title: string, description?: string) => void;
  
  // Progress notifications
  showProgress: (title: string, description?: string) => void;
}

/**
 * Consolidated toast notification manager for classroom components
 * Provides consistent success, error, and info notifications
 */
export const useClassroomToast = (): ClassroomToastManager => {
  const { toast } = useToast();

  const showSuccess = useCallback((title: string, description?: string) => {
    toast({
      title,
      description,
      variant: 'default'
    });
  }, [toast]);

  const showError = useCallback((title: string, description?: string) => {
    toast({
      title,
      description,
      variant: 'destructive'
    });
  }, [toast]);

  const showInfo = useCallback((title: string, description?: string) => {
    toast({
      title,
      description,
      variant: 'default'
    });
  }, [toast]);

  const showProgress = useCallback((title: string, description?: string) => {
    toast({
      title,
      description,
      variant: 'default'
    });
  }, [toast]);

  const showLessonSuccess = useCallback((
    action: 'created' | 'updated' | 'deleted', 
    title: string
  ) => {
    const actionMap = {
      created: { title: 'Lesson Created', description: `"${title}" has been created successfully.` },
      updated: { title: 'Lesson Updated', description: `"${title}" has been saved successfully.` },
      deleted: { title: 'Lesson Deleted', description: `"${title}" has been deleted successfully.` }
    };

    const { title: toastTitle, description } = actionMap[action];
    showSuccess(toastTitle, description);
  }, [showSuccess]);

  const showCourseSuccess = useCallback((
    action: 'created' | 'updated' | 'deleted', 
    title: string
  ) => {
    const actionMap = {
      created: { title: 'Course Created', description: `"${title}" has been created successfully.` },
      updated: { title: 'Course Updated', description: `"${title}" has been updated successfully.` },
      deleted: { title: 'Course Deleted', description: `"${title}" has been deleted successfully.` }
    };

    const { title: toastTitle, description } = actionMap[action];
    showSuccess(toastTitle, description);
  }, [showSuccess]);

  return {
    showSuccess,
    showError,
    showInfo,
    showProgress,
    showLessonSuccess,
    showCourseSuccess
  };
};