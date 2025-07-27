import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCachedClassroom } from '@/hooks/useCachedClassroom';
import type { CourseDetailData, CourseLesson } from '@/types/classroom/courseDetail';
import { log } from '@/utils/logger';

interface UseCourseProgressReturn {
  markLessonAsDone: (lesson: CourseLesson, course: CourseDetailData) => Promise<void>;
  isUpdating: boolean;
  error: string | null;
}

interface UseCourseProgressProps {
  onProgressUpdate?: (courseId: string, progress: number) => void;
  onOptimisticUpdate?: (updatedCourse: CourseDetailData) => void;
}

/**
 * Custom hook for managing course progress and lesson completion
 * Extracted from CourseDetailView.tsx to improve maintainability and testability
 */
export const useCourseProgress = (props?: UseCourseProgressProps): UseCourseProgressReturn => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { updateCourseProgress } = useCachedClassroom();

  const markLessonAsDone = useCallback(async (
    lesson: CourseLesson, 
    course: CourseDetailData
  ): Promise<void> => {
    if (!user?.id) {
      const errorMsg = "User not authenticated.";
      setError(errorMsg);
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive"
      });
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();

      // Get the course_id from the lesson's module
      const lessonModule = course.modules.find(module => 
        module.lessons.some(l => l.id === lesson.id)
      );
      
      if (!lessonModule) {
        throw new Error('Lesson module not found');
      }
      
      // Check if lesson is already completed
      // ✅ FIXED: Remove course_id filter to comply with RLS policy
      // RLS policy only allows filtering by user_id, so we filter in JavaScript
      const { data: allCompletions, error: checkError } = await supabase
        .from('lesson_completions')
        .select('id, lesson_id, course_id, completed_at');
      
      if (checkError) {
        throw checkError;
      }
      
      // Filter for the specific lesson in JavaScript
      const existingCompletion = allCompletions?.find(completion => 
        completion.lesson_id === lesson.id && 
        completion.course_id === lessonModule.course_id
      );

      if (existingCompletion) {
        // Lesson is already completed, toggle to incomplete
        // ✅ FIXED: Remove course_id filter to comply with RLS policy
        // RLS policy will automatically filter by user_id
        const { error: deleteError } = await supabase
          .from('lesson_completions')
          .delete()
          .eq('lesson_id', lesson.id);

        if (deleteError) throw deleteError;

        toast({
          title: "Lesson Unmarked",
          description: "Lesson marked as incomplete.",
          variant: "default"
        });
      } else {
        // Mark lesson as completed
        const { error: insertError } = await supabase
          .from('lesson_completions')
          .insert({
            user_id: user.id,
            lesson_id: lesson.id,
            course_id: lessonModule.course_id,
            module_id: lesson.module_id || course.modules[0]?.id,
            completed_at: new Date().toISOString()
          });

        if (insertError) throw insertError;

        toast({
          title: "Lesson Completed!",
          description: "Great job! This lesson has been marked as complete.",
          variant: "default"
        });
      }

      // Create optimistically updated course data
      const updatedCourse = { ...course };
      
      if (existingCompletion) {
        // Remove completion
        updatedCourse.modules = updatedCourse.modules.map(module => ({
          ...module,
          lessons: module.lessons.map(l => ({
            ...l,
            completed: l.id === lesson.id ? false : l.completed
          }))
        }));
        log.debug('Component', '🎓 [useCourseProgress] Removed completion for lesson:', lesson.title);
      } else {
        // Add completion
        updatedCourse.modules = updatedCourse.modules.map(module => ({
          ...module,
          lessons: module.lessons.map(l => ({
            ...l,
            completed: l.id === lesson.id ? true : l.completed
          }))
        }));
        log.debug('Component', '🎓 [useCourseProgress] Added completion for lesson:', lesson.title);
      }
      
      // Recalculate progress
      const allLessons = updatedCourse.modules.flatMap(module => module.lessons);
      const completedCount = allLessons.filter(l => l.completed).length;
      const totalLessons = allLessons.length;
      updatedCourse.progress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
      
      log.debug('Component', '🎓 [useCourseProgress] Updated progress:', {
        completedCount,
        totalLessons,
        progressPercentage: updatedCourse.progress
      });
      
      // Update the classroom cache with the new progress
      if (updatedCourse.progress !== undefined) {
        updateCourseProgress(course.id, updatedCourse.progress);
        log.debug('Component', '🎓 [useCourseProgress] Updated classroom cache progress:', updatedCourse.progress);
      }
      
      // Call optional callback for optimistic updates
      if (props?.onOptimisticUpdate) {
        props.onOptimisticUpdate(updatedCourse);
      }
      
      // Call optional callback for progress updates
      if (props?.onProgressUpdate && updatedCourse.progress !== undefined) {
        props.onProgressUpdate(course.id, updatedCourse.progress);
      }

      console.log('🎓 [useCourseProgress] Lesson completion updated successfully:', {
        lessonId: lesson.id,
        completed: !existingCompletion,
        progress: updatedCourse.progress
      });

    } catch (error) {
      console.error('Error marking lesson as done:', error);
      const errorMsg = "Failed to update lesson completion status.";
      setError(errorMsg);
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  }, [user?.id, updateCourseProgress, props]);

  return {
    markLessonAsDone,
    isUpdating,
    error
  };
}; 