/**
 * Educational Content Service
 * 
 * This service manages educational content using the new proper system
 * that separates educational content from social posts.
 * 
 * This replaces the terrible practice of storing lessons as posts.
 */

import { getSupabaseClient } from '@/integrations/supabase/client';
import { log } from '@/utils/logger';
import type {
  EducationalContent,
  EnhancedCourseLesson,
  LessonWithContent,
  CourseVideo,
  CourseMedia,
  CreateEducationalContentPayload,
  UpdateEducationalContentPayload,
  CreateLessonPayload,
  EducationalContentType,
  ContentDifficulty,
  VideoProvider,
  isUsingNewContentSystem,
  needsMigration
} from '@/types/educationalContent';

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class EducationalContentService {
  private supabase = getSupabaseClient();

  // ============================================================================
  // EDUCATIONAL CONTENT METHODS
  // ============================================================================

  /**
   * Create new educational content
   */
  async createEducationalContent(payload: CreateEducationalContentPayload): Promise<EducationalContent> {
    try {
      log.debug('EducationalContent', '📚 Creating educational content:', payload.title);

      const { data, error } = await this.supabase
        .from('educational_content')
        .insert({
          title: payload.title,
          content_type: payload.content_type,
          text_content: payload.text_content,
          media_url: payload.media_url,
          embed_data: payload.embed_data || {},
          estimated_duration: payload.estimated_duration,
          difficulty_level: payload.difficulty_level,
        })
        .select()
        .single();

      if (error) throw error;

      log.debug('EducationalContent', '✅ Educational content created successfully:', data.id);
      return data;
    } catch (error) {
      log.error('EducationalContent', 'Failed to create educational content:', error);
      throw error;
    }
  }

  /**
   * Update educational content
   */
  async updateEducationalContent(
    contentId: string, 
    payload: UpdateEducationalContentPayload
  ): Promise<EducationalContent> {
    try {
      log.debug('EducationalContent', '📝 Updating educational content:', contentId);

      const { data, error } = await this.supabase
        .from('educational_content')
        .update({
          ...payload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', contentId)
        .select()
        .single();

      if (error) throw error;

      log.debug('EducationalContent', '✅ Educational content updated successfully');
      return data;
    } catch (error) {
      log.error('EducationalContent', 'Failed to update educational content:', error);
      throw error;
    }
  }

  /**
   * Get educational content by ID
   */
  async getEducationalContent(contentId: string): Promise<EducationalContent | null> {
    try {
      const { data, error } = await this.supabase
        .from('educational_content')
        .select('*')
        .eq('id', contentId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return data;
    } catch (error) {
      log.error('EducationalContent', 'Failed to get educational content:', error);
      throw error;
    }
  }

  /**
   * Delete educational content
   */
  async deleteEducationalContent(contentId: string): Promise<void> {
    try {
      log.debug('EducationalContent', '🗑️ Deleting educational content:', contentId);

      const { error } = await this.supabase
        .from('educational_content')
        .delete()
        .eq('id', contentId);

      if (error) throw error;

      log.debug('EducationalContent', '✅ Educational content deleted successfully');
    } catch (error) {
      log.error('EducationalContent', 'Failed to delete educational content:', error);
      throw error;
    }
  }

  // ============================================================================
  // ENHANCED LESSON METHODS
  // ============================================================================



  /**
   * Create a new lesson with educational content (NEW SYSTEM)
   */
  async createLessonWithContent(payload: CreateLessonPayload): Promise<LessonWithContent> {
    try {
      log.debug('EducationalContent', '🎓 Creating lesson with content:', payload.title);

      // Start transaction-like operation
      // 1. Create educational content first
      const educationalContent = await this.createEducationalContent(payload.educational_content);

      // 2. Get next lesson order
      const { data: maxOrderData } = await this.supabase
        .from('course_lessons')
        .select('lesson_order')
        .eq('module_id', payload.module_id)
        .order('lesson_order', { ascending: false })
        .limit(1);

      const nextOrder = payload.lesson_order ?? ((maxOrderData?.[0]?.lesson_order || 0) + 1);

      // 3. Create lesson
      const { data: lessonData, error: lessonError } = await this.supabase
        .from('course_lessons')
        .insert({
          title: payload.title,
          module_id: payload.module_id,
          content_id: educationalContent.id, // Use new content system
          content_type: payload.educational_content.content_type,
          lesson_order: nextOrder,
          is_published: payload.is_published ?? true,
          prerequisites: payload.prerequisites || [],
          learning_objectives: payload.learning_objectives || [],
        })
        .select()
        .single();

      if (lessonError) {
        // Cleanup: delete the educational content if lesson creation fails
        await this.deleteEducationalContent(educationalContent.id);
        throw lessonError;
      }

      log.debug('EducationalContent', '✅ Lesson created successfully with new content system');

      // Return complete lesson with content
      return {
        ...lessonData,
        educational_content: educationalContent,
        course_videos: [],
        content_blocks: [],
      };
    } catch (error) {
      log.error('EducationalContent', 'Failed to create lesson with content:', error);
      throw error;
    }
  }

  /**
   * Get lesson with educational content
   */
  async getLessonWithContent(lessonId: string): Promise<LessonWithContent | null> {
    try {
      // Get lesson data
      const { data: lessonData, error: lessonError } = await this.supabase
        .from('course_lessons')
        .select(`
          *,
          educational_content(*),
          course_videos(*),
          lesson_content_blocks(*, educational_content(*))
        `)
        .eq('id', lessonId)
        .single();

      if (lessonError) {
        if (lessonError.code === 'PGRST116') return null; // Not found
        throw lessonError;
      }

      // If lesson doesn't have content_id, it's using the old system
      if (!lessonData.content_id) {
        log.warn('EducationalContent', '⚠️ Lesson using old post-based system:', lessonId);
        
        // Return lesson with legacy content handling
        return {
          ...lessonData,
          educational_content: null as any, // Will need special handling
          course_videos: lessonData.course_videos || [],
          content_blocks: [],
        };
      }

      return {
        ...lessonData,
        educational_content: lessonData.educational_content,
        course_videos: lessonData.course_videos || [],
        content_blocks: lessonData.lesson_content_blocks || [],
      };
    } catch (error) {
      log.error('EducationalContent', 'Failed to get lesson with content:', error);
      throw error;
    }
  }

  /**
   * Update lesson content
   */
  async updateLessonContent(
    lessonId: string, 
    contentUpdates: UpdateEducationalContentPayload
  ): Promise<void> {
    try {
      log.debug('EducationalContent', '📝 Updating lesson content:', lessonId);

      // Get lesson to find content_id
      const { data: lessonData, error: lessonError } = await this.supabase
        .from('course_lessons')
        .select('content_id, post_id')
        .eq('id', lessonId)
        .single();

      if (lessonError) throw lessonError;

      if (lessonData.content_id) {
        // Using new system - update educational content
        await this.updateEducationalContent(lessonData.content_id, contentUpdates);
      } else if (lessonData.post_id) {
        // Legacy system - update the lesson directly (and potentially migrate)
        log.warn('EducationalContent', '⚠️ Lesson using legacy post system, consider migrating:', lessonId);
        
        const { error: updateError } = await this.supabase
          .from('course_lessons')
          .update({
            content_text: contentUpdates.text_content,
            updated_at: new Date().toISOString(),
          })
          .eq('id', lessonId);

        if (updateError) throw updateError;
      } else {
        throw new Error('Lesson has no content system configured');
      }

      log.debug('EducationalContent', '✅ Lesson content updated successfully');
    } catch (error) {
      log.error('EducationalContent', 'Failed to update lesson content:', error);
      throw error;
    }
  }

  // ============================================================================
  // VIDEO MANAGEMENT
  // ============================================================================

  /**
   * Create course video
   */
  async createCourseVideo(
    lessonId: string,
    contentId: string,
    videoData: {
      title: string;
      video_url: string;
      description?: string;
      video_provider?: VideoProvider;
      thumbnail_url?: string;
    }
  ): Promise<CourseVideo> {
    try {
      log.debug('EducationalContent', '🎥 Creating course video for lesson:', lessonId);

      const { data, error } = await this.supabase
        .from('course_videos')
        .insert({
          lesson_id: lessonId,
          content_id: contentId,
          title: videoData.title,
          video_url: videoData.video_url,
          description: videoData.description,
          video_provider: videoData.video_provider || 'external',
          thumbnail_url: videoData.thumbnail_url,
          show_controls: true,
          auto_play: false,
          allow_download: false,
        })
        .select()
        .single();

      if (error) throw error;

      log.debug('EducationalContent', '✅ Course video created successfully');
      return data;
    } catch (error) {
      log.error('EducationalContent', 'Failed to create course video:', error);
      throw error;
    }
  }

  /**
   * Extract video provider and ID from URL
   */
  extractVideoInfo(url: string): { provider: VideoProvider; videoId?: string } {
    // YouTube patterns
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      let videoId: string | undefined;
      
      if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0];
      } else if (url.includes('v=')) {
        videoId = url.split('v=')[1]?.split('&')[0];
      }
      
      return { provider: 'youtube', videoId };
    }

    // Vimeo patterns
    if (url.includes('vimeo.com')) {
      const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
      return { provider: 'vimeo', videoId };
    }

    // Loom patterns
    if (url.includes('loom.com')) {
      return { provider: 'loom' };
    }

    // Wistia patterns
    if (url.includes('wistia.com')) {
      return { provider: 'wistia' };
    }

    return { provider: 'external' };
  }

  // ============================================================================
  // MEDIA MANAGEMENT
  // ============================================================================

  /**
   * Upload course media file
   */
  async uploadCourseMedia(
    file: File,
    courseId: string,
    lessonId?: string,
    contentId?: string
  ): Promise<CourseMedia> {
    try {
      log.debug('EducationalContent', '📎 Uploading course media:', file.name);

      // Upload file to storage
      const fileName = `${Date.now()}-${file.name}`;
      const storagePath = `courses/${courseId}/media/${fileName}`;

      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from('course-media')
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from('course-media')
        .getPublicUrl(storagePath);

      // Save media record
      const { data: mediaData, error: mediaError } = await this.supabase
        .from('course_media')
        .insert({
          course_id: courseId,
          lesson_id: lessonId,
          content_id: contentId,
          media_type: this.getMediaTypeFromFile(file),
          file_name: file.name,
          file_url: urlData.publicUrl,
          storage_path: storagePath,
          file_size: file.size,
          mime_type: file.type,
          processing_status: 'completed',
        })
        .select()
        .single();

      if (mediaError) throw mediaError;

      log.debug('EducationalContent', '✅ Course media uploaded successfully');
      return mediaData;
    } catch (error) {
      log.error('EducationalContent', 'Failed to upload course media:', error);
      throw error;
    }
  }

  /**
   * Get media type from file
   */
  private getMediaTypeFromFile(file: File): EducationalContentType {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video_upload';
    if (file.type.startsWith('audio/')) return 'audio';
    return 'document';
  }

  // ============================================================================
  // MIGRATION UTILITIES
  // ============================================================================

  /**
   * Migrate a lesson from post-based system to educational content system
   */
  async migrateLessonFromPost(lessonId: string): Promise<LessonWithContent> {
    try {
      log.debug('EducationalContent', '🔄 Migrating lesson from post system:', lessonId);

      // Get lesson with post data
      const { data: lessonData, error: lessonError } = await this.supabase
        .from('course_lessons')
        .select(`
          *,
          posts(*)
        `)
        .eq('id', lessonId)
        .single();

      if (lessonError) throw lessonError;

      if (!lessonData.post_id) {
        throw new Error('Lesson does not have a post_id to migrate from');
      }

      // Create educational content from post data
      const educationalContent = await this.createEducationalContent({
        title: lessonData.posts?.title || lessonData.title,
        content_type: this.mapLegacyContentType(lessonData.content_type),
        text_content: lessonData.posts?.content || lessonData.content_text,
        media_url: lessonData.content_url,
      });

      // Update lesson to use new content system
      const { data: updatedLesson, error: updateError } = await this.supabase
        .from('course_lessons')
        .update({
          content_id: educationalContent.id,
          is_published: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', lessonId)
        .select()
        .single();

      if (updateError) {
        // Cleanup: delete the educational content if lesson update fails
        await this.deleteEducationalContent(educationalContent.id);
        throw updateError;
      }

      log.debug('EducationalContent', '✅ Lesson migrated successfully to new content system');

      return {
        ...updatedLesson,
        educational_content: educationalContent,
        course_videos: [],
        content_blocks: [],
      };
    } catch (error) {
      log.error('EducationalContent', 'Failed to migrate lesson from post:', error);
      throw error;
    }
  }

  /**
   * Map legacy content types to new content types
   */
  private mapLegacyContentType(legacyType: string): EducationalContentType {
    switch (legacyType) {
      case 'text': return 'text';
      case 'rich_text': return 'rich_text';
      case 'video_embed': return 'video_embed';
      case 'external_link': return 'external_link';
      case 'markdown': return 'rich_text';
      case 'html': return 'rich_text';
      default: return 'rich_text';
    }
  }

  /**
   * Check if lesson needs migration
   */
  async checkLessonMigrationStatus(lessonId: string): Promise<{
    needsMigration: boolean;
    usingNewSystem: boolean;
    hasPostId: boolean;
    hasContentId: boolean;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('course_lessons')
        .select('post_id, content_id')
        .eq('id', lessonId)
        .single();

      if (error) throw error;

      const hasPostId = Boolean(data.post_id);
      const hasContentId = Boolean(data.content_id);
      const usingNewSystem = hasContentId;
      const needsMigration = hasPostId && !hasContentId;

      return {
        needsMigration,
        usingNewSystem,
        hasPostId,
        hasContentId,
      };
    } catch (error) {
      log.error('EducationalContent', 'Failed to check migration status:', error);
      throw error;
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get content statistics
   */
  async getContentStatistics(courseId?: string): Promise<{
    totalContent: number;
    contentByType: Record<EducationalContentType, number>;
    migratedLessons: number;
    legacyLessons: number;
  }> {
    try {
      // Get total educational content
      let contentQuery = this.supabase
        .from('educational_content')
        .select('content_type');

      if (courseId) {
        // Filter by course - do this in steps to avoid Supabase query complexity
        const { data: courseModules, error: moduleError } = await this.supabase
          .from('course_modules')
          .select('id')
          .eq('course_id', courseId);
        
        if (moduleError) throw moduleError;
        
        if (courseModules && courseModules.length > 0) {
          // Get content IDs for lessons in this course
          const { data: lessonsWithContent, error: lessonError } = await this.supabase
            .from('course_lessons')
            .select('content_id')
            .in('module_id', courseModules.map(m => m.id))
            .not('content_id', 'is', null);
          
          if (lessonError) throw lessonError;
          
          if (lessonsWithContent && lessonsWithContent.length > 0) {
            const contentIds = lessonsWithContent
              .map(l => l.content_id)
              .filter(id => id !== null);
            
            if (contentIds.length > 0) {
              contentQuery = contentQuery.in('id', contentIds);
            }
          }
        }
      }

      const { data: contentData, error: contentError } = await contentQuery;
      if (contentError) throw contentError;

      // Get lesson migration status
      let lessonQuery = this.supabase
        .from('course_lessons')
        .select('content_id, post_id');

      if (courseId) {
        // Get module IDs for this course first
        const { data: moduleIds, error: moduleError } = await this.supabase
          .from('course_modules')
          .select('id')
          .eq('course_id', courseId);
        
        if (moduleError) throw moduleError;
        
        if (moduleIds && moduleIds.length > 0) {
          lessonQuery = lessonQuery.in('module_id', moduleIds.map(m => m.id));
        }
      }

      const { data: lessonData, error: lessonError } = await lessonQuery;
      if (lessonError) throw lessonError;

      // Calculate statistics
      const contentByType = contentData.reduce((acc, content) => {
        acc[content.content_type] = (acc[content.content_type] || 0) + 1;
        return acc;
      }, {} as Record<EducationalContentType, number>);

      const migratedLessons = lessonData.filter(lesson => lesson.content_id).length;
      const legacyLessons = lessonData.filter(lesson => lesson.post_id && !lesson.content_id).length;

      return {
        totalContent: contentData.length,
        contentByType,
        migratedLessons,
        legacyLessons,
      };
    } catch (error) {
      log.error('EducationalContent', 'Failed to get content statistics:', error);
      throw error;
    }
  }

  /**
   * Migrate all legacy lessons for a specific course to the new educational content system
   */
  static async migrateCourseToEducationalContent(courseId: string): Promise<{
    success: boolean;
    message: string;
    migrated: number;
    skipped: number;
    errors: number;
  }> {
    try {
      const supabase = getSupabaseClient();
      
      // Get all lessons for this course that still use the old post-based system
      const { data: legacyLessons, error: fetchError } = await supabase
        .from('course_lessons')
        .select(`
          *,
          course_modules!inner(course_id)
        `)
        .eq('course_modules.course_id', courseId)
        .not('post_id', 'is', null)  // Has post_id
        .is('content_id', null);     // No content_id yet

      if (fetchError) {
        throw new Error(`Failed to fetch legacy lessons: ${fetchError.message}`);
      }

      if (!legacyLessons || legacyLessons.length === 0) {
        return {
          success: true,
          message: 'No legacy lessons found to migrate',
          migrated: 0,
          skipped: 0,
          errors: 0
        };
      }

      let migrated = 0;
      const skipped = 0;
      let errors = 0;

      for (const lesson of legacyLessons) {
        try {
          // Create educational content
          const { data: contentData, error: contentError } = await supabase
            .from('educational_content')
            .insert({
              title: lesson.title,
              content_type: lesson.content_type === 'text' ? 'text' : 'rich_text',
              text_content: lesson.content_text,
              estimated_duration: Math.max(1, Math.ceil((lesson.content_text?.length || 0) / 1000)),
              difficulty_level: 'beginner'
            })
            .select()
            .single();

          if (contentError) {
            console.error(`Failed to create educational content for lesson ${lesson.id}:`, contentError);
            errors++;
            continue;
          }

          // Update lesson to link to educational content and clear post_id
          const { error: updateError } = await supabase
            .from('course_lessons')
            .update({
              content_id: contentData.id,
              post_id: null, // Remove the old post link
              is_published: true,
              estimated_duration: contentData.estimated_duration,
              difficulty_level: contentData.difficulty_level
            })
            .eq('id', lesson.id);

          if (updateError) {
            console.error(`Failed to update lesson ${lesson.id}:`, updateError);
            errors++;
            // Clean up the created educational content
            await supabase.from('educational_content').delete().eq('id', contentData.id);
            continue;
          }

          migrated++;
          console.log(`✅ Migrated lesson "${lesson.title}" to educational content system`);

        } catch (error) {
          console.error(`Error migrating lesson ${lesson.id}:`, error);
          errors++;
        }
      }

      return {
        success: errors === 0,
        message: `Migration completed: ${migrated} lessons migrated, ${skipped} skipped, ${errors} errors`,
        migrated,
        skipped,
        errors
      };

    } catch (error) {
      console.error('Course migration failed:', error);
      return {
        success: false,
        message: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        migrated: 0,
        skipped: 0,
        errors: 1
      };
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const educationalContentService = new EducationalContentService();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Create educational content
 */
export const createEducationalContent = (payload: CreateEducationalContentPayload) =>
  educationalContentService.createEducationalContent(payload);

/**
 * Create lesson with content (NEW SYSTEM)
 */
export const createLessonWithContent = (payload: CreateLessonPayload) =>
  educationalContentService.createLessonWithContent(payload);

/**
 * Get lesson with content
 */
export const getLessonWithContent = (lessonId: string) =>
  educationalContentService.getLessonWithContent(lessonId);

/**
 * Update lesson content
 */
export const updateLessonContent = (lessonId: string, updates: UpdateEducationalContentPayload) =>
  educationalContentService.updateLessonContent(lessonId, updates);

/**
 * Migrate lesson from post system
 */
export const migrateLessonFromPost = (lessonId: string) =>
  educationalContentService.migrateLessonFromPost(lessonId);

/**
 * Check if lesson needs migration
 */
export const checkLessonMigrationStatus = (lessonId: string) =>
  educationalContentService.checkLessonMigrationStatus(lessonId); 

 