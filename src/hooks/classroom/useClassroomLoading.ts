import { useState, useCallback, useRef } from 'react';

interface LoadingState {
  [key: string]: boolean;
}

interface ClassroomLoadingManager {
  // Core loading state management
  isLoading: (key?: string) => boolean;
  setLoading: (key: string, loading: boolean) => void;
  startLoading: (key: string) => void;
  stopLoading: (key: string) => void;
  
  // Predefined loading keys for common operations
  isCreatingCourse: boolean;
  isUpdatingCourse: boolean;
  isDeletingCourse: boolean;
  isCreatingLesson: boolean;
  isUpdatingLesson: boolean;
  isDeletingLesson: boolean;
  isSaving: boolean;
  isNavigating: boolean;
  
  // Convenience methods for common operations
  withLoading: <T>(key: string, asyncFn: () => Promise<T>) => Promise<T>;
  createLoadingSpinner: (key: string, className?: string) => JSX.Element | null;
}

/**
 * Consolidated loading state management for classroom components
 * Provides consistent loading indicators and state management
 */
export const useClassroomLoading = (): ClassroomLoadingManager => {
  const [loadingStates, setLoadingStates] = useState<LoadingState>({});
  const timeoutRefs = useRef<Record<string, NodeJS.Timeout>>({});

  const setLoading = useCallback((key: string, loading: boolean) => {
    // Clear any existing timeout for this key
    if (timeoutRefs.current[key]) {
      clearTimeout(timeoutRefs.current[key]);
      delete timeoutRefs.current[key];
    }

    setLoadingStates(prev => ({
      ...prev,
      [key]: loading
    }));

    // Auto-clear loading state after 30 seconds as safety measure
    if (loading) {
      timeoutRefs.current[key] = setTimeout(() => {
        setLoadingStates(prev => ({
          ...prev,
          [key]: false
        }));
        delete timeoutRefs.current[key];
      }, 30000);
    }
  }, []);

  const startLoading = useCallback((key: string) => {
    setLoading(key, true);
  }, [setLoading]);

  const stopLoading = useCallback((key: string) => {
    setLoading(key, false);
  }, [setLoading]);

  const isLoading = useCallback((key?: string) => {
    if (!key) {
      // Return true if any loading state is active
      return Object.values(loadingStates).some(loading => loading);
    }
    return loadingStates[key] || false;
  }, [loadingStates]);

  const withLoading = useCallback(async <T>(
    key: string, 
    asyncFn: () => Promise<T>
  ): Promise<T> => {
    try {
      startLoading(key);
      const result = await asyncFn();
      return result;
    } finally {
      stopLoading(key);
    }
  }, [startLoading, stopLoading]);

  const createLoadingSpinner = useCallback((key: string, className = '') => {
    if (!isLoading(key)) return null;

    return (
      <div className={`animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 ${className || 'w-8 h-8'}`} />
    );
  }, [isLoading]);

  // Predefined loading states for common operations
  const isCreatingCourse = isLoading('course-create');
  const isUpdatingCourse = isLoading('course-update');
  const isDeletingCourse = isLoading('course-delete');
  const isCreatingLesson = isLoading('lesson-create');
  const isUpdatingLesson = isLoading('lesson-update');
  const isDeletingLesson = isLoading('lesson-delete');
  const isSaving = isLoading('save');
  const isNavigating = isLoading('navigate');

  return {
    isLoading,
    setLoading,
    startLoading,
    stopLoading,
    isCreatingCourse,
    isUpdatingCourse,
    isDeletingCourse,
    isCreatingLesson,
    isUpdatingLesson,
    isDeletingLesson,
    isSaving,
    isNavigating,
    withLoading,
    createLoadingSpinner
  };
};