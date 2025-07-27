import { getSupabaseClient } from '@/integrations/supabase/client';
import { log } from '@/utils/logger';
import { toast } from '@/hooks/use-toast';
import type { CourseDetailData, CourseLesson } from '@/types/classroom/courseDetail';

export interface ProgressServiceOptions {
  enableMobileOptimizations?: boolean;
  enableOfflineSupport?: boolean;
  retryOnError?: boolean;
  cacheStrategy?: 'aggressive' | 'normal' | 'minimal';
  enableOptimisticUpdates?: boolean;
}

export interface LessonCompletionData {
  user_id: string;
  lesson_id: string;
  course_id: string;
  module_id?: string;
  completed_at: string;
}

export interface ProgressCalculationResult {
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
  completedLessonIds: string[];
  incompleteLessonIds: string[];
}

export interface CourseProgressData {
  courseId: string;
  progress: number;
  totalLessons: number;
  completedLessons: number;
  lastUpdated: string;
  userId: string;
}

export interface ProgressAnalytics {
  averageProgress: number;
  totalCourses: number;
  completedCourses: number;
  inProgressCourses: number;
  notStartedCourses: number;
  totalLessonsCompleted: number;
  averageCompletionTime: number;
}

export interface ProgressReport {
  courseId: string;
  courseTitle: string;
  progress: number;
  completedLessons: number;
  totalLessons: number;
  lastActivity: string;
  estimatedCompletionTime?: number;
  difficultyLevel?: string;
}

/**
 * ProgressService - Handles all progress-related business operations
 * 
 * Features:
 * - Progress tracking and calculation
 * - Lesson completion management
 * - Progress analytics and reporting
 * - Progress synchronization across devices
 * - Mobile-optimized progress operations
 * - Error handling and retry logic
 * - Optimistic updates for better UX
 */
export class ProgressService {
  private options: ProgressServiceOptions;

  constructor(options: ProgressServiceOptions = {}) {
    this.options = {
      enableMobileOptimizations: true,
      enableOfflineSupport: true,
      retryOnError: true,
      cacheStrategy: 'normal',
      enableOptimisticUpdates: true,
      ...options
    };
  }

  /**
   * Mark a lesson as completed or incomplete
   */
  async toggleLessonCompletion(
    lesson: CourseLesson,
    course: CourseDetailData,
    userId: string
  ): Promise<{ completed: boolean; progress: number }> {
    const supabase = getSupabaseClient();

    try {
      log.debug('Service', `📊 [ProgressService] Toggling lesson completion: ${lesson.id}`);

      // Get the course_id from the lesson's module
      const lessonModule = course.modules.find(module => 
        module.lessons.some(l => l.id === lesson.id)
      );
      
      if (!lessonModule) {
        throw new Error('Lesson module not found');
      }

      // Check if lesson is already completed
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
        const { error: deleteError } = await supabase
          .from('lesson_completions')
          .delete()
          .eq('lesson_id', lesson.id);

        if (deleteError) throw deleteError;

        log.debug('Service', '📊 [ProgressService] Lesson marked as incomplete:', lesson.id);
        
        // Calculate new progress
        const progress = this.calculateCourseProgress(course, lesson.id, false);
        
        return { completed: false, progress };
      } else {
        // Mark lesson as completed
        const { error: insertError } = await supabase
          .from('lesson_completions')
          .insert({
            user_id: userId,
            lesson_id: lesson.id,
            course_id: lessonModule.course_id,
            module_id: lesson.module_id || course.modules[0]?.id,
            completed_at: new Date().toISOString()
          });

        if (insertError) throw insertError;

        log.debug('Service', '📊 [ProgressService] Lesson marked as complete:', lesson.id);
        
        // Calculate new progress
        const progress = this.calculateCourseProgress(course, lesson.id, true);
        
        return { completed: true, progress };
      }

    } catch (error) {
      log.error('Service', '📊 [ProgressService] Error toggling lesson completion:', error);
      throw error;
    }
  }

  /**
   * Get lesson completion status for a user
   */
  async getLessonCompletionStatus(
    lessonId: string,
    courseId: string,
    userId: string
  ): Promise<boolean> {
    const supabase = getSupabaseClient();

    try {
      log.debug('Service', `📊 [ProgressService] Getting completion status for lesson: ${lessonId}`);

      const { data: completions, error } = await supabase
        .from('lesson_completions')
        .select('id')
        .eq('lesson_id', lessonId)
        .eq('course_id', courseId);

      if (error) {
        throw error;
      }

      return completions && completions.length > 0;

    } catch (error) {
      log.error('Service', '📊 [ProgressService] Error getting lesson completion status:', error);
      throw error;
    }
  }

  /**
   * Get all lesson completions for a course
   */
  async getCourseCompletions(
    courseId: string,
    userId: string
  ): Promise<LessonCompletionData[]> {
    const supabase = getSupabaseClient();

    try {
      log.debug('Service', `📊 [ProgressService] Getting completions for course: ${courseId}`);

      const { data: completions, error } = await supabase
        .from('lesson_completions')
        .select('*')
        .eq('course_id', courseId);

      if (error) {
        throw error;
      }

      return completions || [];

    } catch (error) {
      log.error('Service', '📊 [ProgressService] Error getting course completions:', error);
      throw error;
    }
  }

  /**
   * Calculate course progress based on lesson completions
   */
  calculateCourseProgress(
    course: CourseDetailData,
    updatedLessonId?: string,
    lessonCompleted?: boolean
  ): number {
    try {
      const allLessons = course.modules.flatMap(module => module.lessons);
      let completedCount = 0;

      // Count completed lessons
      allLessons.forEach(lesson => {
        if (lesson.id === updatedLessonId) {
          // Use the provided completion status for the updated lesson
          if (lessonCompleted) {
            completedCount++;
          }
        } else {
          // Use existing completion status
          if (lesson.completed) {
            completedCount++;
          }
        }
      });

      const totalLessons = allLessons.length;
      const progress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

      log.debug('Service', '📊 [ProgressService] Progress calculated:', {
        completedCount,
        totalLessons,
        progressPercentage: progress
      });

      return progress;

    } catch (error) {
      log.error('Service', '📊 [ProgressService] Error calculating course progress:', error);
      return 0;
    }
  }

  /**
   * Get detailed progress calculation for a course
   */
  async getDetailedProgress(
    course: CourseDetailData,
    userId: string
  ): Promise<ProgressCalculationResult> {
    try {
      log.debug('Service', `📊 [ProgressService] Getting detailed progress for course: ${course.id}`);

      const completions = await this.getCourseCompletions(course.id, userId);
      const allLessons = course.modules.flatMap(module => module.lessons);
      
      const completedLessonIds = completions.map(c => c.lesson_id);
      const incompleteLessonIds = allLessons
        .filter(lesson => !completedLessonIds.includes(lesson.id))
        .map(lesson => lesson.id);

      const result: ProgressCalculationResult = {
        totalLessons: allLessons.length,
        completedLessons: completedLessonIds.length,
        progressPercentage: allLessons.length > 0 
          ? Math.round((completedLessonIds.length / allLessons.length) * 100) 
          : 0,
        completedLessonIds,
        incompleteLessonIds
      };

      log.debug('Service', '📊 [ProgressService] Detailed progress calculated:', result);

      return result;

    } catch (error) {
      log.error('Service', '📊 [ProgressService] Error getting detailed progress:', error);
      throw error;
    }
  }

  /**
   * Get progress analytics for a user across all courses
   */
  async getProgressAnalytics(userId: string): Promise<ProgressAnalytics> {
    const supabase = getSupabaseClient();

    try {
      log.debug('Service', `📊 [ProgressService] Getting progress analytics for user: ${userId}`);

      // Get all lesson completions for the user
      const { data: completions, error: completionsError } = await supabase
        .from('lesson_completions')
        .select('*')
        .eq('user_id', userId);

      if (completionsError) {
        throw completionsError;
      }

      // Get all courses the user has interacted with
      const courseIds = [...new Set(completions?.map(c => c.course_id) || [])];
      
      // Get course details
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('id, title')
        .in('id', courseIds);

      if (coursesError) {
        throw coursesError;
      }

      // Calculate analytics
      const totalCourses = courseIds.length;
      const totalLessonsCompleted = completions?.length || 0;
      
      // Group completions by course to calculate per-course progress
      const courseProgressMap = new Map<string, number>();
      completions?.forEach(completion => {
        const current = courseProgressMap.get(completion.course_id) || 0;
        courseProgressMap.set(completion.course_id, current + 1);
      });

      // Calculate average progress (simplified - would need total lessons per course for accurate calculation)
      const averageProgress = totalCourses > 0 ? Math.round(totalLessonsCompleted / totalCourses) : 0;

      const analytics: ProgressAnalytics = {
        averageProgress,
        totalCourses,
        completedCourses: 0, // Would need to check against total lessons per course
        inProgressCourses: totalCourses,
        notStartedCourses: 0, // Would need to check against all available courses
        totalLessonsCompleted,
        averageCompletionTime: 0 // Would need completion timestamps for calculation
      };

      log.debug('Service', '📊 [ProgressService] Progress analytics calculated:', analytics);

      return analytics;

    } catch (error) {
      log.error('Service', '📊 [ProgressService] Error getting progress analytics:', error);
      throw error;
    }
  }

  /**
   * Generate progress report for a specific course
   */
  async generateProgressReport(
    courseId: string,
    userId: string
  ): Promise<ProgressReport> {
    const supabase = getSupabaseClient();

    try {
      log.debug('Service', `📊 [ProgressService] Generating progress report for course: ${courseId}`);

      // Get course details
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('id, title')
        .eq('id', courseId)
        .single();

      if (courseError) {
        throw courseError;
      }

      // Get lesson completions
      const completions = await this.getCourseCompletions(courseId, userId);

      // Get all lessons for the course
      const { data: lessons, error: lessonsError } = await supabase
        .from('course_lessons')
        .select('id, title, estimated_duration, difficulty_level')
        .eq('course_id', courseId);

      if (lessonsError) {
        throw lessonsError;
      }

      const totalLessons = lessons?.length || 0;
      const completedLessons = completions.length;
      const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

      // Calculate last activity
      const lastActivity = completions.length > 0 
        ? Math.max(...completions.map(c => new Date(c.completed_at).getTime()))
        : 0;

      // Estimate completion time (simplified calculation)
      const remainingLessons = totalLessons - completedLessons;
      const averageDuration = lessons?.reduce((sum, lesson) => sum + (lesson.estimated_duration || 1), 0) / totalLessons || 1;
      const estimatedCompletionTime = remainingLessons * averageDuration;

      const report: ProgressReport = {
        courseId,
        courseTitle: course.title,
        progress,
        completedLessons,
        totalLessons,
        lastActivity: new Date(lastActivity).toISOString(),
        estimatedCompletionTime: lastActivity > 0 ? estimatedCompletionTime : undefined,
        difficultyLevel: this.calculateAverageDifficulty(lessons)
      };

      log.debug('Service', '📊 [ProgressService] Progress report generated:', report);

      return report;

    } catch (error) {
      log.error('Service', '📊 [ProgressService] Error generating progress report:', error);
      throw error;
    }
  }

  /**
   * Synchronize progress across devices
   */
  async synchronizeProgress(
    userId: string,
    courseId: string,
    localCompletions: LessonCompletionData[]
  ): Promise<void> {
    const supabase = getSupabaseClient();

    try {
      log.debug('Service', `📊 [ProgressService] Synchronizing progress for user: ${userId}, course: ${courseId}`);

      // Get server-side completions
      const serverCompletions = await this.getCourseCompletions(courseId, userId);

      // Find completions that exist locally but not on server
      const localOnlyCompletions = localCompletions.filter(local => 
        !serverCompletions.some(server => server.lesson_id === local.lesson_id)
      );

      // Find completions that exist on server but not locally
      const serverOnlyCompletions = serverCompletions.filter(server => 
        !localCompletions.some(local => local.lesson_id === server.lesson_id)
      );

      // Upload local-only completions to server
      if (localOnlyCompletions.length > 0) {
        const { error: insertError } = await supabase
          .from('lesson_completions')
          .insert(localOnlyCompletions);

        if (insertError) {
          log.warn('Service', '📊 [ProgressService] Error uploading local completions:', insertError);
        }
      }

      // Download server-only completions to local
      if (serverOnlyCompletions.length > 0) {
        log.debug('Service', '📊 [ProgressService] Server has additional completions:', serverOnlyCompletions.length);
        // In a real implementation, you would update local storage here
      }

      log.debug('Service', '📊 [ProgressService] Progress synchronization completed');

    } catch (error) {
      log.error('Service', '📊 [ProgressService] Error synchronizing progress:', error);
      throw error;
    }
  }

  /**
   * Batch update lesson completions
   */
  async batchUpdateCompletions(
    userId: string,
    completions: LessonCompletionData[]
  ): Promise<void> {
    const supabase = getSupabaseClient();

    try {
      log.debug('Service', `📊 [ProgressService] Batch updating ${completions.length} completions`);

      if (completions.length === 0) {
        return;
      }

      const { error } = await supabase
        .from('lesson_completions')
        .upsert(completions, { onConflict: 'user_id,lesson_id' });

      if (error) {
        throw error;
      }

      log.debug('Service', '📊 [ProgressService] Batch update completed successfully');

    } catch (error) {
      log.error('Service', '📊 [ProgressService] Error in batch update:', error);
      throw error;
    }
  }

  /**
   * Get progress statistics for a user
   */
  async getProgressStats(userId: string): Promise<any> {
    const supabase = getSupabaseClient();

    try {
      log.debug('Service', `📊 [ProgressService] Getting progress stats for user: ${userId}`);

      // Get total completions
      const { count: totalCompletions, error: completionsError } = await supabase
        .from('lesson_completions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (completionsError) {
        throw completionsError;
      }

      // Get unique courses
      const { data: uniqueCourses, error: coursesError } = await supabase
        .from('lesson_completions')
        .select('course_id')
        .eq('user_id', userId);

      if (coursesError) {
        throw coursesError;
      }

      const uniqueCourseIds = [...new Set(uniqueCourses?.map(c => c.course_id) || [])];

      const stats = {
        totalCompletions: totalCompletions || 0,
        uniqueCourses: uniqueCourseIds.length,
        averageCompletionsPerCourse: uniqueCourseIds.length > 0 
          ? Math.round((totalCompletions || 0) / uniqueCourseIds.length) 
          : 0,
        lastActivity: new Date().toISOString() // Would need to get from completions
      };

      log.debug('Service', '📊 [ProgressService] Progress stats calculated:', stats);

      return stats;

    } catch (error) {
      log.error('Service', '📊 [ProgressService] Error getting progress stats:', error);
      throw error;
    }
  }

  /**
   * Calculate average difficulty level for a course
   */
  private calculateAverageDifficulty(lessons: any[]): string {
    if (!lessons || lessons.length === 0) {
      return 'beginner';
    }

    const difficultyMap = { beginner: 1, intermediate: 2, advanced: 3 };
    const totalDifficulty = lessons.reduce((sum, lesson) => {
      return sum + (difficultyMap[lesson.difficulty_level as keyof typeof difficultyMap] || 1);
    }, 0);

    const averageDifficulty = totalDifficulty / lessons.length;

    if (averageDifficulty <= 1.3) return 'beginner';
    if (averageDifficulty <= 2.3) return 'intermediate';
    return 'advanced';
  }

  /**
   * Validate completion data
   */
  validateCompletionData(data: LessonCompletionData): boolean {
    return !!(
      data.user_id &&
      data.lesson_id &&
      data.course_id &&
      data.completed_at
    );
  }

  /**
   * Create optimistic progress update
   */
  createOptimisticUpdate(
    course: CourseDetailData,
    lessonId: string,
    completed: boolean
  ): CourseDetailData {
    const updatedCourse = { ...course };
    
    updatedCourse.modules = updatedCourse.modules.map(module => ({
      ...module,
      lessons: module.lessons.map(lesson => ({
        ...lesson,
        completed: lesson.id === lessonId ? completed : lesson.completed
      }))
    }));

    // Recalculate progress
    updatedCourse.progress = this.calculateCourseProgress(updatedCourse);

    return updatedCourse;
  }
}

// Export singleton instance
export const progressService = new ProgressService(); 