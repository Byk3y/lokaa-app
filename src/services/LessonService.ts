import { getSupabaseClient } from '@/integrations/supabase/client';
import { log } from '@/utils/logger';
import { toast } from '@/hooks/use-toast';
import type { CourseLesson } from '@/types/classroom/courseDetail';

export interface LessonServiceOptions {
  enableMobileOptimizations?: boolean;
  enableOfflineSupport?: boolean;
  retryOnError?: boolean;
  cacheStrategy?: 'aggressive' | 'normal' | 'minimal';
}

export interface LessonCreateData {
  title: string;
  content_text?: string;
  module_id: string;
  course_id: string;
  lesson_order?: number;
  content_type?: 'rich_text' | 'video' | 'quiz' | 'assignment';
  page_type?: 'page' | 'folder' | 'quiz' | 'assignment';
  is_published?: boolean;
  estimated_duration?: number;
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
}

export interface LessonUpdateData {
  title?: string;
  content_text?: string;
  /**
   * Canonical video URL for the lesson. When provided, the HTML content should have
   * any embedded video iframes removed to avoid duplicates. Explicit null clears video.
   */
  content_url?: string | null;
  is_published?: boolean;
  lesson_order?: number;
  module_id?: string;
  estimated_duration?: number;
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
}

export interface EducationalContentData {
  title: string;
  content_type: 'rich_text' | 'video' | 'quiz' | 'assignment';
  text_content?: string;
  video_url?: string;
  estimated_duration?: number;
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
}

export interface LessonValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * LessonService - Handles all lesson-related business operations
 * 
 * Features:
 * - Lesson CRUD operations
 * - Educational content management
 * - Content sanitization and validation
 * - Media handling and optimization
 * - Version control and history
 * - Mobile-optimized operations
 * - Error handling and retry logic
 */
export class LessonService {
  private options: LessonServiceOptions;

  constructor(options: LessonServiceOptions = {}) {
    this.options = {
      enableMobileOptimizations: true,
      enableOfflineSupport: true,
      retryOnError: true,
      cacheStrategy: 'normal',
      ...options
    };
  }

  /**
   * Create a new lesson with educational content
   */
  async createLesson(data: LessonCreateData): Promise<CourseLesson> {
    const supabase = getSupabaseClient();

    try {
      log.debug('Service', `🎓 [LessonService] Creating new lesson: ${data.title}`);

      // Validate lesson data
      const validation = this.validateLessonData(data);
      if (!validation.isValid) {
        throw new Error(`Lesson validation failed: ${validation.errors.join(', ')}`);
      }

      // Create educational content first
      const contentData = await this.createEducationalContent({
        title: data.title,
        content_type: data.content_type || 'rich_text',
        text_content: data.content_text,
        estimated_duration: data.estimated_duration || this.calculateEstimatedDuration(data.content_text),
        difficulty_level: data.difficulty_level || 'beginner'
      });

      // Get the next lesson order if not provided
      let lessonOrder = data.lesson_order;
      if (lessonOrder === undefined) {
        lessonOrder = await this.getNextLessonOrder(data.module_id);
      }

      // Create the lesson record
      const { data: lessonData, error: lessonError } = await supabase
        .from('course_lessons')
        .insert({
          title: data.title,
          content_type: data.content_type || 'rich_text',
          content_text: data.content_text, // Keep for backward compatibility
          module_id: data.module_id,
          course_id: data.course_id,
          lesson_order: lessonOrder,
          content_id: contentData.id,
          page_type: data.page_type || 'page',
          is_published: data.is_published ?? true,
          estimated_duration: contentData.estimated_duration,
          difficulty_level: contentData.difficulty_level
        })
        .select()
        .single();

      if (lessonError) {
        // Clean up educational content if lesson creation fails
        await this.deleteEducationalContent(contentData.id);
        throw lessonError;
      }

      log.debug('Service', '🎓 [LessonService] Lesson created successfully:', lessonData.id);

      // Return the complete lesson with educational content
      return {
        ...lessonData,
        educational_content: contentData
      };

    } catch (error) {
      log.error('Service', '🎓 [LessonService] Error creating lesson:', error);
      throw error;
    }
  }

  /**
   * Update an existing lesson
   */
  async updateLesson(lessonId: string, updates: LessonUpdateData): Promise<CourseLesson> {
    const supabase = getSupabaseClient();

    try {
      log.debug('Service', `🎓 [LessonService] Updating lesson: ${lessonId}`);

      // Get the current lesson to find its content_id
      const { data: currentLesson, error: fetchError } = await supabase
        .from('course_lessons')
        .select('content_id, title, module_id')
        .eq('id', lessonId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      // Update lesson fields
      const lessonUpdates: any = {};
      if (updates.title !== undefined) lessonUpdates.title = updates.title;
      if (updates.is_published !== undefined) lessonUpdates.is_published = updates.is_published;
      // Apply content_url when explicitly present (including null to remove)
      if (Object.prototype.hasOwnProperty.call(updates, 'content_url')) {
        lessonUpdates.content_url = updates.content_url;
      }
      if (updates.lesson_order !== undefined) lessonUpdates.lesson_order = updates.lesson_order;
      if (updates.module_id !== undefined) lessonUpdates.module_id = updates.module_id;
      if (updates.estimated_duration !== undefined) lessonUpdates.estimated_duration = updates.estimated_duration;
      if (updates.difficulty_level !== undefined) lessonUpdates.difficulty_level = updates.difficulty_level;

      if (Object.keys(lessonUpdates).length > 0) {
        const { error: lessonError } = await supabase
          .from('course_lessons')
          .update(lessonUpdates)
          .eq('id', lessonId);

        if (lessonError) {
          throw lessonError;
        }
      }

      // Update educational content if content_text is provided
      if (updates.content_text && currentLesson.content_id) {
        const { error: contentError } = await supabase
          .from('educational_content')
          .update({ 
            text_content: updates.content_text,
            estimated_duration: updates.estimated_duration || this.calculateEstimatedDuration(updates.content_text)
          })
          .eq('id', currentLesson.content_id);

        if (contentError) {
          throw contentError;
        }
      } else if (updates.content_text && !currentLesson.content_id) {
        // If no content_id exists, update the legacy content_text field
        const { error: legacyError } = await supabase
          .from('course_lessons')
          .update({ content_text: updates.content_text })
          .eq('id', lessonId);

        if (legacyError) {
          throw legacyError;
        }
      }

      log.debug('Service', '🎓 [LessonService] Lesson updated successfully');

      // Return updated lesson
      return await this.getLessonById(lessonId);

    } catch (error) {
      log.error('Service', '🎓 [LessonService] Error updating lesson:', error);
      throw error;
    }
  }

  /**
   * Delete a lesson and its associated content
   */
  async deleteLesson(lessonId: string): Promise<void> {
    const supabase = getSupabaseClient();

    try {
      log.debug('Service', `🎓 [LessonService] Deleting lesson: ${lessonId}`);

      // Get the lesson to find its content_id
      const { data: lesson, error: fetchError } = await supabase
        .from('course_lessons')
        .select('content_id')
        .eq('id', lessonId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      // Delete the lesson
      const { error: lessonError } = await supabase
        .from('course_lessons')
        .delete()
        .eq('id', lessonId);

      if (lessonError) {
        throw lessonError;
      }

      // Delete associated educational content if it exists
      if (lesson.content_id) {
        await this.deleteEducationalContent(lesson.content_id);
      }

      log.debug('Service', '🎓 [LessonService] Lesson deleted successfully');

    } catch (error) {
      log.error('Service', '🎓 [LessonService] Error deleting lesson:', error);
      throw error;
    }
  }

  /**
   * Get a lesson by ID with its educational content
   */
  async getLessonById(lessonId: string): Promise<CourseLesson | null> {
    const supabase = getSupabaseClient();

    try {
      log.debug('Service', `🎓 [LessonService] Fetching lesson: ${lessonId}`);

      const { data: lesson, error } = await supabase
        .from('course_lessons')
        .select('*')
        .eq('id', lessonId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Lesson not found
        }
        throw error;
      }

      // Fetch educational content if it exists
      if (lesson.content_id) {
        const { data: content } = await supabase
          .from('educational_content')
          .select('*')
          .eq('id', lesson.content_id)
          .single();

        if (content) {
          lesson.educational_content = content;
        }
      }

      return lesson;

    } catch (error) {
      log.error('Service', '🎓 [LessonService] Error fetching lesson:', error);
      throw error;
    }
  }

  /**
   * Get lessons by module ID
   */
  async getLessonsByModule(moduleId: string): Promise<CourseLesson[]> {
    const supabase = getSupabaseClient();

    try {
      log.debug('Service', `🎓 [LessonService] Fetching lessons for module: ${moduleId}`);

      const { data: lessons, error } = await supabase
        .from('course_lessons')
        .select('*')
        .eq('module_id', moduleId)
        .order('lesson_order');

      if (error) {
        throw error;
      }

      // Fetch educational content for all lessons
      const lessonsWithContent = await Promise.all(
        lessons.map(async (lesson) => {
          if (lesson.content_id) {
            const { data: content } = await supabase
              .from('educational_content')
              .select('*')
              .eq('id', lesson.content_id)
              .single();

            if (content) {
              lesson.educational_content = content;
            }
          }
          return lesson;
        })
      );

      return lessonsWithContent;

    } catch (error) {
      log.error('Service', '🎓 [LessonService] Error fetching lessons by module:', error);
      throw error;
    }
  }

  /**
   * Duplicate a lesson
   */
  async duplicateLesson(lessonId: string, targetModuleId?: string): Promise<CourseLesson> {
    const supabase = getSupabaseClient();

    try {
      log.debug('Service', `🎓 [LessonService] Duplicating lesson: ${lessonId}`);

      // Get the original lesson
      const originalLesson = await this.getLessonById(lessonId);
      if (!originalLesson) {
        throw new Error('Original lesson not found');
      }

      // Duplicate educational content if it exists
      let newContentId: string | undefined;
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
      const duplicateData: LessonCreateData = {
        title: `${originalLesson.title} (Copy)`,
        content_text: originalLesson.content_text || undefined,
        module_id: targetModuleId || (originalLesson.module_id as string),
        course_id: (originalLesson as any).course_id as string,
        content_type: (originalLesson.content_type as any) || 'rich_text',
        page_type: (originalLesson.page_type as any) || 'page',
        is_published: originalLesson.is_published,
        estimated_duration: originalLesson.estimated_duration ?? undefined,
        difficulty_level: (originalLesson.difficulty_level as any) ?? undefined
      };

      const duplicatedLesson = await this.createLesson(duplicateData);

      log.debug('Service', '🎓 [LessonService] Lesson duplicated successfully:', duplicatedLesson.id);

      return duplicatedLesson;

    } catch (error) {
      log.error('Service', '🎓 [LessonService] Error duplicating lesson:', error);
      throw error;
    }
  }

  /**
   * Move a lesson to a different module
   */
  async moveLesson(lessonId: string, targetModuleId: string): Promise<void> {
    const supabase = getSupabaseClient();

    try {
      log.debug('Service', `🎓 [LessonService] Moving lesson ${lessonId} to module ${targetModuleId}`);

      const { error } = await supabase
        .from('course_lessons')
        .update({ module_id: targetModuleId })
        .eq('id', lessonId);

      if (error) {
        throw error;
      }

      log.debug('Service', '🎓 [LessonService] Lesson moved successfully');

    } catch (error) {
      log.error('Service', '🎓 [LessonService] Error moving lesson:', error);
      throw error;
    }
  }

  /**
   * Reorder lessons within a module
   */
  async reorderLessons(lessonIds: string[]): Promise<void> {
    const supabase = getSupabaseClient();

    try {
      log.debug('Service', `🎓 [LessonService] Reordering ${lessonIds.length} lessons`);

      // Update lesson order for each lesson
      const updatePromises = lessonIds.map((lessonId, index) =>
        supabase
          .from('course_lessons')
          .update({ lesson_order: index + 1 })
          .eq('id', lessonId)
      );

      await Promise.all(updatePromises);

      log.debug('Service', '🎓 [LessonService] Lessons reordered successfully');

    } catch (error) {
      log.error('Service', '🎓 [LessonService] Error reordering lessons:', error);
      throw error;
    }
  }

  /**
   * Create educational content
   */
  private async createEducationalContent(data: EducationalContentData): Promise<any> {
    const supabase = getSupabaseClient();

    try {
      const { data: content, error } = await supabase
        .from('educational_content')
        .insert({
          ...data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return content;

    } catch (error) {
      log.error('Service', '🎓 [LessonService] Error creating educational content:', error);
      throw error;
    }
  }

  /**
   * Delete educational content
   */
  private async deleteEducationalContent(contentId: string): Promise<void> {
    const supabase = getSupabaseClient();

    try {
      const { error } = await supabase
        .from('educational_content')
        .delete()
        .eq('id', contentId);

      if (error) {
        log.warn('Service', '🎓 [LessonService] Error deleting educational content:', error);
      }

    } catch (error) {
      log.warn('Service', '🎓 [LessonService] Error deleting educational content:', error);
    }
  }

  /**
   * Get the next lesson order for a module
   */
  private async getNextLessonOrder(moduleId: string): Promise<number> {
    const supabase = getSupabaseClient();

    try {
      const { data: maxOrderData, error } = await supabase
        .from('course_lessons')
        .select('lesson_order')
        .eq('module_id', moduleId)
        .order('lesson_order', { ascending: false })
        .limit(1);

      if (error) {
        log.warn('Service', '🎓 [LessonService] Error getting lesson order:', error);
        return 1;
      }

      return (maxOrderData?.[0]?.lesson_order || 0) + 1;

    } catch (error) {
      log.warn('Service', '🎓 [LessonService] Error getting lesson order:', error);
      return 1;
    }
  }

  /**
   * Calculate estimated duration based on content length
   */
  private calculateEstimatedDuration(content?: string): number {
    if (!content) return 1;
    
    // Rough estimate: 1 minute per 1000 characters
    const estimatedMinutes = Math.max(1, Math.ceil(content.length / 1000));
    return estimatedMinutes;
  }

  /**
   * Validate lesson data
   */
  private validateLessonData(data: LessonCreateData): LessonValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!data.title?.trim()) {
      errors.push('Title is required');
    }

    if (!data.module_id) {
      errors.push('Module ID is required');
    }

    if (!data.course_id) {
      errors.push('Course ID is required');
    }

    // Content validation
    if (data.content_text && data.content_text.length > 50000) {
      warnings.push('Content is very long and may affect performance');
    }

    // Title length validation
    if (data.title && data.title.length > 200) {
      errors.push('Title must be less than 200 characters');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Sanitize lesson content
   */
  sanitizeContent(content: string): string {
    // Basic HTML sanitization (in production, use a proper sanitizer like DOMPurify)
    return content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .trim();
  }

  /**
   * Get lesson statistics
   */
  async getLessonStats(moduleId?: string, courseId?: string): Promise<any> {
    const supabase = getSupabaseClient();

    try {
      let query = supabase.from('course_lessons').select('*', { count: 'exact', head: true });

      if (moduleId) {
        query = query.eq('module_id', moduleId);
      } else if (courseId) {
        query = query.eq('course_id', courseId);
      }

      const { count, error } = await query;

      if (error) throw error;

      return {
        totalLessons: count || 0,
        publishedLessons: 0, // Could be calculated with additional query
        draftLessons: 0 // Could be calculated with additional query
      };

    } catch (error) {
      log.error('Service', '🎓 [LessonService] Error getting lesson stats:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const lessonService = new LessonService(); 