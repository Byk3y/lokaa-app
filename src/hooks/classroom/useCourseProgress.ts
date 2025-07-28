import { useCallback, useState } from 'react';
import { log } from '@/utils/logger';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { CourseDetailData, CourseLesson } from '@/types/classroom/courseDetail';

interface ProgressData {
  completedLessonIds: Set<string>;
  progressPercentage: number;
  completedCount: number;
  totalLessons: number;
}

interface UseCourseProgressReturn {
  // Progress calculation
  calculateProgress: (courseId: string, lessonIds: string[]) => Promise<ProgressData>;
  calculateProgressFromCourse: (course: CourseDetailData) => Promise<ProgressData>;
  
  // Lesson completion
  markLessonAsDone: (lesson: CourseLesson, course: CourseDetailData) => Promise<void>;
  
  // Progress caching (uses useCourseCaching hook)
  getCachedProgress: (courseId: string) => ProgressData | null;
  setCachedProgress: (courseId: string, progress: ProgressData) => void;
  invalidateProgressCache: (courseId: string) => void;
  
  // Progress state
  currentProgress: ProgressData | null;
  progressLoading: boolean;
  progressError: string | null;
}

interface UseCourseProgressOptions {
  enableLogging?: boolean;
  enableCaching?: boolean;
  userId?: string | null;
  onProgressUpdate?: () => void; // Callback to trigger course refresh
  onOptimisticUpdate?: (updatedCourse: CourseDetailData) => void; // Optimistic UI updates
}

/**
 * Custom hook for calculating and managing course progress
 * 
 * Features:
 * - Progress calculation from lesson completions
 * - Progress caching for performance
 * - Mobile-optimized progress handling
 * - Comprehensive error handling and logging
 * - Integration with lesson completion tracking
 */
export function useCourseProgress(options: UseCourseProgressOptions = {}): UseCourseProgressReturn {
  const {
    enableLogging = true,
    enableCaching = true,
    userId = null,
    onProgressUpdate,
    onOptimisticUpdate
  } = options;

  const { user } = useAuth();
  const currentUserId = userId || user?.id;
  
  // Progress state
  const [currentProgress, setCurrentProgress] = useState<ProgressData | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);

  // Main progress calculation function
  const calculateProgress = useCallback(async (
    courseId: string, 
    lessonIds: string[]
  ): Promise<ProgressData> => {
    if (!currentUserId) {
      const defaultProgress: ProgressData = {
        completedLessonIds: new Set(),
        progressPercentage: 0,
        completedCount: 0,
        totalLessons: lessonIds.length
      };
      
      if (enableLogging) {
        log.debug('Hook', '📊 [useCourseProgress] No user authenticated, returning default progress');
      }
      
      return defaultProgress;
    }

    if (lessonIds.length === 0) {
      const emptyProgress: ProgressData = {
        completedLessonIds: new Set(),
        progressPercentage: 0,
        completedCount: 0,
        totalLessons: 0
      };
      
      if (enableLogging) {
        log.debug('Hook', '📊 [useCourseProgress] No lessons to calculate progress for');
      }
      
      return emptyProgress;
    }

    try {
      setProgressLoading(true);
      setProgressError(null);
      
      if (enableLogging) {
        log.debug('Hook', `📊 [useCourseProgress] Calculating progress for course: ${courseId}`, {
          lessonCount: lessonIds.length,
          userId: currentUserId
        });
      }

      const supabase = getSupabaseClient();

      // Fetch user's completed lessons for this course
      // ✅ IMPROVED: Filter by user_id and course_id for better performance
      const { data: allCompletions, error: progressError } = await supabase
        .from('lesson_completions')
        .select('lesson_id, course_id')
        .eq('user_id', currentUserId)
        .eq('course_id', courseId);
      
      if (progressError) {
        throw new Error(`Failed to fetch progress: ${progressError.message}`);
      }

      // Filter for lessons that exist in the current course
      const completedLessons = allCompletions?.filter(completion => 
        lessonIds.includes(completion.lesson_id)
      ) || [];

      // Calculate progress metrics
      const completedCount = completedLessons.length;
      const totalLessons = lessonIds.length;
      const progressPercentage = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
      const completedLessonIds = new Set(completedLessons.map(l => l.lesson_id));

      const progress: ProgressData = {
        completedLessonIds,
        progressPercentage,
        completedCount,
        totalLessons
      };

      if (enableLogging) {
        log.debug('Hook', '📊 [useCourseProgress] Progress calculated:', {
          courseId,
          completedCount,
          totalLessons,
          progressPercentage,
          completedLessonIds: Array.from(completedLessonIds)
        });
      }

      setCurrentProgress(progress);
      return progress;

    } catch (error: any) {
      const errorMessage = error.message || 'Failed to calculate progress';
      
      if (enableLogging) {
        log.error('Hook', '📊 [useCourseProgress] Error calculating progress:', error);
      }

      setProgressError(errorMessage);
      
      // Return default progress on error
      const defaultProgress: ProgressData = {
        completedLessonIds: new Set(),
        progressPercentage: 0,
        completedCount: 0,
        totalLessons: lessonIds.length
      };

      return defaultProgress;
    } finally {
      setProgressLoading(false);
    }
  }, [currentUserId, enableLogging]);

  // Calculate progress from course data
  const calculateProgressFromCourse = useCallback(async (
    course: CourseDetailData
  ): Promise<ProgressData> => {
    const allLessonIds = course.modules
      .flatMap(module => module.lessons)
      .map(lesson => lesson.id);

    return calculateProgress(course.id, allLessonIds);
  }, [calculateProgress]);

  // Progress caching functions (these would integrate with useCourseCaching)
  const getCachedProgress = useCallback((_courseId: string): ProgressData | null => {
    // This would integrate with useCourseCaching hook
    // For now, return null to indicate no cached data
    return null;
  }, []);

  const setCachedProgress = useCallback((courseId: string, _progress: ProgressData) => {
    // This would integrate with useCourseCaching hook
    if (enableLogging) {
      log.debug('Hook', `📊 [useCourseProgress] Would cache progress for course: ${courseId}`);
    }
  }, [enableLogging]);

  const invalidateProgressCache = useCallback((courseId: string) => {
    // This would integrate with useCourseCaching hook
    if (enableLogging) {
      log.debug('Hook', `📊 [useCourseProgress] Would invalidate progress cache for course: ${courseId}`);
    }
  }, [enableLogging]);

  // Toggle lesson completion status (mark as done or undone)
  const markLessonAsDone = useCallback(async (
    lesson: CourseLesson, 
    course: CourseDetailData
  ): Promise<void> => {
    console.log('🎯 [useCourseProgress] markLessonAsDone called with:', {
      lessonId: lesson?.id,
      lessonTitle: lesson?.title,
      courseId: course?.id,
      currentUserId,
      enableLogging
    });

    if (!currentUserId) {
      console.log('🎯 [useCourseProgress] No currentUserId, returning early');
      if (enableLogging) {
        log.warn('Hook', '📊 [useCourseProgress] Cannot mark lesson as done - no user authenticated');
      }
      return;
    }

    try {
      console.log('🎯 [useCourseProgress] Starting markLessonAsDone execution');
      if (enableLogging) {
        log.debug('Hook', `📊 [useCourseProgress] Toggling lesson completion: ${lesson.id}`);
      }

      const supabase = getSupabaseClient();
      console.log('🎯 [useCourseProgress] Got Supabase client');

      // Check if lesson is already completed
      console.log('🎯 [useCourseProgress] About to query lesson_completions...');
      const { data: existingCompletions, error: checkError } = await supabase
        .from('lesson_completions')
        .select('id')
        .eq('user_id', currentUserId)
        .eq('lesson_id', lesson.id)
        .eq('course_id', course.id);

      console.log('🎯 [useCourseProgress] Query completed:', {
        data: existingCompletions,
        error: checkError,
        dataLength: existingCompletions?.length
      });

      if (checkError) {
        console.log('🎯 [useCourseProgress] Query error:', checkError);
        throw checkError;
      }

      // Check if lesson is already completed
      const isAlreadyCompleted = existingCompletions && existingCompletions.length > 0;
      
      if (isAlreadyCompleted) {
        // Delete the completion record to mark as undone
        const { error: deleteError } = await supabase
          .from('lesson_completions')
          .delete()
          .eq('user_id', currentUserId)
          .eq('lesson_id', lesson.id)
          .eq('course_id', course.id);

        if (deleteError) {
          throw deleteError;
        }

        if (enableLogging) {
          log.debug('Hook', `📊 [useCourseProgress] Lesson marked as undone: ${lesson.id}`);
        }
      } else {
        // Find the module that contains this lesson
        const module = course.modules.find(m => 
          m.lessons.some(l => l.id === lesson.id)
        );

        if (!module) {
          throw new Error(`Module not found for lesson: ${lesson.id}`);
        }

        // Mark lesson as completed
        const insertData = {
          user_id: currentUserId,
          lesson_id: lesson.id,
          course_id: course.id,
          module_id: module.id,
          completed_at: new Date().toISOString()
        };

        const { error: insertError } = await supabase
          .from('lesson_completions')
          .insert(insertData);

        if (insertError) {
          throw insertError;
        }

        if (enableLogging) {
          log.debug('Hook', `📊 [useCourseProgress] Lesson marked as completed: ${lesson.id}`);
        }
      }

      // Recalculate progress for the course (for both done and undone cases)
      const updatedProgress = await calculateProgressFromCourse(course);
      setCurrentProgress(updatedProgress);

      // Create optimistic course update with new progress
      if (onOptimisticUpdate) {
        const optimisticCourse: CourseDetailData = {
          ...course,
          progress: updatedProgress.progressPercentage,
          modules: course.modules.map(module => ({
            ...module,
            lessons: module.lessons.map(courseLesson => ({
              ...courseLesson,
              completed: courseLesson.id === lesson.id 
                ? !isAlreadyCompleted // Toggle completion state
                : updatedProgress.completedLessonIds.has(courseLesson.id)
            }))
          }))
        };
        
        if (enableLogging) {
          log.debug('Hook', '📊 [useCourseProgress] Triggering optimistic update:', {
            newProgress: updatedProgress.progressPercentage,
            completedLessons: updatedProgress.completedCount,
            totalLessons: updatedProgress.totalLessons
          });
        }
        
        onOptimisticUpdate(optimisticCourse);
      }

      // Trigger course refresh to update UI (for both done and undone cases)
      if (onProgressUpdate) {
        if (enableLogging) {
          log.debug('Hook', '📊 [useCourseProgress] Triggering course refresh callback');
        }
        onProgressUpdate();
      }

    } catch (error: any) {
      const errorMessage = error.message || 'Failed to mark lesson as done';
      
      if (enableLogging) {
        log.error('Hook', '📊 [useCourseProgress] Error marking lesson as done:', error);
      }

      setProgressError(errorMessage);
      throw error;
    }
  }, [currentUserId, enableLogging, calculateProgressFromCourse, onProgressUpdate, onOptimisticUpdate]);

  return {
    calculateProgress,
    calculateProgressFromCourse,
    markLessonAsDone,
    getCachedProgress,
    setCachedProgress,
    invalidateProgressCache,
    currentProgress,
    progressLoading,
    progressError
  };
} 