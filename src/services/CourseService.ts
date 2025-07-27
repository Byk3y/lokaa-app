import { getSupabaseClient } from '@/integrations/supabase/client';
import { log } from '@/utils/logger';
import { toast } from '@/hooks/use-toast';
import type { CourseDetailData, CourseModule, CourseLesson } from '@/types/classroom/courseDetail';

export interface CourseServiceOptions {
  enableMobileOptimizations?: boolean;
  enableOfflineSupport?: boolean;
  retryOnError?: boolean;
  cacheStrategy?: 'aggressive' | 'normal' | 'minimal';
}

export interface CourseFetchOptions {
  includeDrafts?: boolean;
  includeProgress?: boolean;
  userId?: string;
}

export interface CourseCreateData {
  title: string;
  description?: string;
  space_id?: string;
  creator_id?: string;
  slug?: string;
  is_published?: boolean;
}

export interface CourseUpdateData {
  title?: string;
  description?: string;
  slug?: string;
  is_published?: boolean;
  cover_image_url?: string;
}

export interface ModuleCreateData {
  title: string;
  description?: string;
  course_id: string;
  module_order?: number;
  module_type?: 'folder' | 'module';
}

export interface ModuleUpdateData {
  title?: string;
  description?: string;
  module_order?: number;
  module_type?: 'folder' | 'module';
}

/**
 * CourseService - Handles all course-related business operations
 * 
 * Features:
 * - Course CRUD operations
 * - Module and lesson management
 * - Permission validation
 * - Mobile-optimized queries
 * - Error handling and retry logic
 * - Progress tracking
 */
export class CourseService {
  private options: CourseServiceOptions;

  constructor(options: CourseServiceOptions = {}) {
    this.options = {
      enableMobileOptimizations: true,
      enableOfflineSupport: true,
      retryOnError: true,
      cacheStrategy: 'normal',
      ...options
    };
  }

  /**
   * Fetch course details with optimized query strategy
   */
  async fetchCourseDetails(
    courseId: string, 
    options: CourseFetchOptions = {}
  ): Promise<CourseDetailData | null> {
    const { includeDrafts = false, includeProgress = false, userId } = options;
    const supabase = getSupabaseClient();

    log.debug('Service', `🎓 [CourseService] Fetching course details for: ${courseId}`);

    try {
      // Fetch course data - try by slug first, then by ID
      let courseQuery = supabase.from('courses').select('*');
      
      // Try to determine if courseId is a UUID or a slug
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(courseId);
      
      if (isUUID) {
        courseQuery = courseQuery.eq('id', courseId);
      } else {
        courseQuery = courseQuery.eq('slug', courseId);
      }
      
      let { data: courseData, error: courseError } = await courseQuery.single();

      if (courseError) {
        // If slug lookup failed, try ID lookup as fallback
        if (!isUUID) {
          log.debug('Service', `🎓 [CourseService] Slug lookup failed, trying ID lookup`);
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('courses')
            .select('*')
            .eq('id', courseId)
            .single();
          
          if (fallbackError) throw fallbackError;
          courseData = fallbackData;
        } else {
          throw courseError;
        }
      }

      if (!courseData) {
        throw new Error('Course not found');
      }

      log.debug('Service', '🎓 [CourseService] Course data fetched:', {
        id: courseData.id,
        title: courseData.title,
        short_id: courseData.short_id
      });

      // Check user permissions
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const isCreator = currentUser?.id === courseData.creator_id;
      
      // Check if user is a general admin
      const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', currentUser?.id)
        .single();
      
      const isGeneralAdmin = userProfile?.role === 'admin';
      
      // Check if user is a space admin
      let isSpaceAdmin = false;
      if (courseData.space_id && currentUser?.id) {
        const { data: spaceMembership } = await supabase
          .from('space_members')
          .select('role, status')
          .eq('space_id', courseData.space_id)
          .eq('user_id', currentUser.id)
          .single();
        
        isSpaceAdmin = spaceMembership?.role === 'admin' && spaceMembership?.status === 'active';
      }

      const canViewDrafts = isCreator || isGeneralAdmin || isSpaceAdmin;

      // Fetch modules and lessons with optimized query strategy
      const modulesData = await this.fetchModulesWithLessons(courseData.id, canViewDrafts);

      // Fetch progress if requested
      let progressData = null;
      if (includeProgress && userId) {
        progressData = await this.fetchCourseProgress(courseData.id, userId);
      }

      // Transform data into CourseDetailData format
      const courseDetailData: CourseDetailData = {
        ...courseData,
        modules: modulesData,
        progress: progressData,
        permissions: {
          canEdit: isCreator || isGeneralAdmin || isSpaceAdmin,
          canDelete: isCreator || isGeneralAdmin,
          canPublish: isCreator || isGeneralAdmin || isSpaceAdmin,
          canViewDrafts
        }
      };

      log.debug('Service', '🎓 [CourseService] Course details assembled successfully');
      return courseDetailData;

    } catch (error) {
      log.error('Service', '🎓 [CourseService] Error fetching course details:', error);
      throw error;
    }
  }

  /**
   * Fetch modules with lessons using optimized query strategy
   */
  private async fetchModulesWithLessons(courseId: string, canViewDrafts: boolean): Promise<CourseModule[]> {
    const supabase = getSupabaseClient();

    try {
      // Phase 1: Fetch modules with basic lesson metadata (fast)
      const modulesResult = await supabase
        .from('course_modules')
        .select(`
          id,
          title,
          description,
          module_order,
          module_type,
          course_id,
          space_id,
          course_lessons!inner (
            id,
            title,
            content_type,
            lesson_order,
            module_id,
            content_id,
            slug,
            page_type,
            is_published,
            estimated_duration,
            difficulty_level,
            created_at,
            updated_at
          )
        `)
        .eq('course_id', courseId)
        .order('module_order');
      
      if (modulesResult.error) {
        throw modulesResult.error;
      }

      const modulesData = modulesResult.data || [];

      log.debug('Service', '🎓 [CourseService] Phase 1 - Modules with basic lesson data fetched:', {
        moduleCount: modulesData.length,
        totalLessons: modulesData.reduce((sum, m) => sum + (m.course_lessons?.length || 0), 0)
      });

      // Phase 2: Fetch detailed content for lessons that need it (lazy loading)
      if (modulesData.length > 0) {
        const lessonsNeedingContent = modulesData
          .flatMap(module => module.course_lessons || [])
          .filter(lesson => lesson.content_id || lesson.content_type === 'rich_text');

        if (lessonsNeedingContent.length > 0) {
          await this.fetchDetailedContent(lessonsNeedingContent);
        }
      }

      // Transform modules data
      const modules: CourseModule[] = modulesData.map(module => ({
        ...module,
        lessons: (module.course_lessons || []).map(lesson => ({
          ...lesson,
          module: module
        }))
      }));

      return modules;

    } catch (error) {
      log.error('Service', '🎓 [CourseService] Error fetching modules:', error);
      throw error;
    }
  }

  /**
   * Fetch detailed content for lessons
   */
  private async fetchDetailedContent(lessons: any[]): Promise<void> {
    const supabase = getSupabaseClient();

    try {
      const contentIds = lessons
        .filter(lesson => lesson.content_id)
        .map(lesson => lesson.content_id);

      if (contentIds.length === 0) return;

      // Fetch educational content in batches
      const batchSize = 50;
      for (let i = 0; i < contentIds.length; i += batchSize) {
        const batch = contentIds.slice(i, i + batchSize);
        
        const { data: contentData, error: contentError } = await supabase
          .from('educational_content')
          .select('*')
          .in('id', batch);

        if (contentError) {
          log.warn('Service', '🎓 [CourseService] Error fetching content batch:', contentError);
          continue;
        }

        // Merge content data with lessons
        contentData?.forEach(content => {
          const lesson = lessons.find(l => l.content_id === content.id);
          if (lesson) {
            lesson.educational_content = content;
          }
        });
      }

      log.debug('Service', '🎓 [CourseService] Detailed content fetched for lessons:', contentIds.length);

    } catch (error) {
      log.error('Service', '🎓 [CourseService] Error fetching detailed content:', error);
      // Don't throw - this is non-critical
    }
  }

  /**
   * Fetch course progress for a user
   */
  private async fetchCourseProgress(courseId: string, userId: string): Promise<any> {
    const supabase = getSupabaseClient();

    try {
      // Get all lesson IDs for this course
      const { data: lessonIds, error: lessonError } = await supabase
        .from('course_lessons')
        .select('id')
        .eq('course_id', courseId);

      if (lessonError) throw lessonError;

      if (!lessonIds || lessonIds.length === 0) {
        return { completedLessonIds: [], progressPercentage: 0 };
      }

      // Get completed lessons
      const { data: completions, error: completionError } = await supabase
        .from('lesson_completions')
        .select('lesson_id')
        .eq('user_id', userId)
        .in('lesson_id', lessonIds.map(l => l.id));

      if (completionError) throw completionError;

      const completedLessonIds = completions?.map(c => c.lesson_id) || [];
      const progressPercentage = lessonIds.length > 0 
        ? Math.round((completedLessonIds.length / lessonIds.length) * 100)
        : 0;

      return {
        completedLessonIds,
        progressPercentage,
        totalLessons: lessonIds.length,
        completedLessons: completedLessonIds.length
      };

    } catch (error) {
      log.error('Service', '🎓 [CourseService] Error fetching course progress:', error);
      return { completedLessonIds: [], progressPercentage: 0 };
    }
  }

  /**
   * Create a new course
   */
  async createCourse(data: CourseCreateData): Promise<CourseDetailData> {
    const supabase = getSupabaseClient();

    try {
      log.debug('Service', '🎓 [CourseService] Creating new course:', data.title);

      const { data: course, error } = await supabase
        .from('courses')
        .insert({
          ...data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      log.debug('Service', '🎓 [CourseService] Course created successfully:', course.id);

      // Return course details
      return await this.fetchCourseDetails(course.id);

    } catch (error) {
      log.error('Service', '🎓 [CourseService] Error creating course:', error);
      throw error;
    }
  }

  /**
   * Update an existing course
   */
  async updateCourse(courseId: string, data: CourseUpdateData): Promise<CourseDetailData> {
    const supabase = getSupabaseClient();

    try {
      log.debug('Service', '🎓 [CourseService] Updating course:', courseId);

      const { data: course, error } = await supabase
        .from('courses')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', courseId)
        .select()
        .single();

      if (error) throw error;

      log.debug('Service', '🎓 [CourseService] Course updated successfully');

      // Return updated course details
      return await this.fetchCourseDetails(courseId);

    } catch (error) {
      log.error('Service', '🎓 [CourseService] Error updating course:', error);
      throw error;
    }
  }

  /**
   * Delete a course
   */
  async deleteCourse(courseId: string): Promise<void> {
    const supabase = getSupabaseClient();

    try {
      log.debug('Service', '🎓 [CourseService] Deleting course:', courseId);

      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

      if (error) throw error;

      log.debug('Service', '🎓 [CourseService] Course deleted successfully');

    } catch (error) {
      log.error('Service', '🎓 [CourseService] Error deleting course:', error);
      throw error;
    }
  }

  /**
   * Create a new module
   */
  async createModule(data: ModuleCreateData): Promise<CourseModule> {
    const supabase = getSupabaseClient();

    try {
      log.debug('Service', '🎓 [CourseService] Creating new module:', data.title);

      const { data: module, error } = await supabase
        .from('course_modules')
        .insert({
          ...data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      log.debug('Service', '🎓 [CourseService] Module created successfully:', module.id);

      return module;

    } catch (error) {
      log.error('Service', '🎓 [CourseService] Error creating module:', error);
      throw error;
    }
  }

  /**
   * Update an existing module
   */
  async updateModule(moduleId: string, data: ModuleUpdateData): Promise<CourseModule> {
    const supabase = getSupabaseClient();

    try {
      log.debug('Service', '🎓 [CourseService] Updating module:', moduleId);

      const { data: module, error } = await supabase
        .from('course_modules')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', moduleId)
        .select()
        .single();

      if (error) throw error;

      log.debug('Service', '🎓 [CourseService] Module updated successfully');

      return module;

    } catch (error) {
      log.error('Service', '🎓 [CourseService] Error updating module:', error);
      throw error;
    }
  }

  /**
   * Delete a module
   */
  async deleteModule(moduleId: string): Promise<void> {
    const supabase = getSupabaseClient();

    try {
      log.debug('Service', '🎓 [CourseService] Deleting module:', moduleId);

      const { error } = await supabase
        .from('course_modules')
        .delete()
        .eq('id', moduleId);

      if (error) throw error;

      log.debug('Service', '🎓 [CourseService] Module deleted successfully');

    } catch (error) {
      log.error('Service', '🎓 [CourseService] Error deleting module:', error);
      throw error;
    }
  }

  /**
   * Get course statistics
   */
  async getCourseStats(courseId: string): Promise<any> {
    const supabase = getSupabaseClient();

    try {
      // Get module count
      const { count: moduleCount, error: moduleError } = await supabase
        .from('course_modules')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', courseId);

      if (moduleError) throw moduleError;

      // Get lesson count
      const { count: lessonCount, error: lessonError } = await supabase
        .from('course_lessons')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', courseId);

      if (lessonError) throw lessonError;

      // Get enrollment count
      const { count: enrollmentCount, error: enrollmentError } = await supabase
        .from('course_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', courseId);

      if (enrollmentError) throw enrollmentError;

      return {
        moduleCount: moduleCount || 0,
        lessonCount: lessonCount || 0,
        enrollmentCount: enrollmentCount || 0
      };

    } catch (error) {
      log.error('Service', '🎓 [CourseService] Error getting course stats:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const courseService = new CourseService(); 