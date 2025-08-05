import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { log } from '@/utils/logger';

interface ErrorHandlerOptions {
  logContext?: string;
  showToast?: boolean;
  fallbackMessage?: string;
}

interface ClassroomErrorHandler {
  handleError: (error: unknown, title: string, options?: ErrorHandlerOptions) => void;
  handleLessonError: (error: unknown, action: 'saving' | 'creating' | 'updating' | 'deleting') => void;
  handleCourseError: (error: unknown, action: 'creating' | 'updating' | 'deleting' | 'loading') => void;
  handleNavigationError: (error: unknown, path?: string) => void;
  handleGenericError: (error: unknown, context?: string) => void;
}

/**
 * Consolidated error handler for classroom components
 * Provides consistent error logging, toast notifications, and user feedback
 */
export const useClassroomErrorHandler = (): ClassroomErrorHandler => {
  const { toast } = useToast();

  const handleError = useCallback((
    error: unknown, 
    title: string, 
    options: ErrorHandlerOptions = {}
  ) => {
    const {
      logContext = 'Component',
      showToast = true,
      fallbackMessage = 'An unexpected error occurred. Please try again.'
    } = options;

    // Log the error
    log.error(logContext, `${title}:`, error);

    // Show toast notification if enabled
    if (showToast) {
      const description = error instanceof Error ? error.message : fallbackMessage;
      
      toast({
        title,
        description,
        variant: 'destructive'
      });
    }
  }, [toast]);

  const handleLessonError = useCallback((
    error: unknown, 
    action: 'saving' | 'creating' | 'updating' | 'deleting'
  ) => {
    const actionMap = {
      saving: { title: 'Error Saving Lesson', message: 'Failed to save lesson changes' },
      creating: { title: 'Error Creating Lesson', message: 'Failed to create new lesson' },
      updating: { title: 'Error Updating Lesson', message: 'Failed to update lesson' },
      deleting: { title: 'Error Deleting Lesson', message: 'Failed to delete lesson' }
    };

    const { title, message } = actionMap[action];
    
    handleError(error, title, {
      logContext: 'LessonManagement',
      fallbackMessage: message
    });
  }, [handleError]);

  const handleCourseError = useCallback((
    error: unknown, 
    action: 'creating' | 'updating' | 'deleting' | 'loading'
  ) => {
    const actionMap = {
      creating: { title: 'Error Creating Course', message: 'Failed to create new course' },
      updating: { title: 'Error Updating Course', message: 'Failed to update course' },
      deleting: { title: 'Error Deleting Course', message: 'Failed to delete course' },
      loading: { title: 'Error Loading Course', message: 'Failed to load course data' }
    };

    const { title, message } = actionMap[action];
    
    handleError(error, title, {
      logContext: 'CourseManagement',
      fallbackMessage: message
    });
  }, [handleError]);

  const handleNavigationError = useCallback((error: unknown, path?: string) => {
    const title = 'Navigation Error';
    const fallbackMessage = path 
      ? `Failed to navigate to ${path}` 
      : 'Navigation failed. Please try again.';

    handleError(error, title, {
      logContext: 'Navigation',
      fallbackMessage
    });
  }, [handleError]);

  const handleGenericError = useCallback((error: unknown, context = 'Classroom') => {
    handleError(error, 'Error', {
      logContext: context,
      fallbackMessage: 'An unexpected error occurred. Please try refreshing the page.'
    });
  }, [handleError]);

  return {
    handleError,
    handleLessonError,
    handleCourseError,
    handleNavigationError,
    handleGenericError
  };
};