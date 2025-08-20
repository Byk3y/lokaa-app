import { useCallback, useState } from 'react';
import { log } from '@/utils/logger';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { CourseDetailData } from '@/types/classroom/courseDetail';

interface FetchCourseOptions {
  courseId: string;
  moduleId?: string;
}

interface UseCourseFetchingReturn {
  fetchCourseDetails: (options: FetchCourseOptions) => Promise<CourseDetailData | null>;
  refetch: (courseId: string) => Promise<CourseDetailData | null>;
  fetchingLoading: boolean;
  fetchingError: string | null;
  currentCourseId: string | null;
  lastFetchedCourse: CourseDetailData | null;
}

interface UseCourseFetchingOptions {
  enableLogging?: boolean;
}

/**
 * Simplified hook for fetching course data
 * 
 * Features:
 * - Basic course data fetching
 * - Module and lesson fetching
 * - Permission checking
 * - Data transformation and filtering
 */
export function useCourseFetching(options: UseCourseFetchingOptions = {}): UseCourseFetchingReturn {
  const { enableLogging = true } = options;
  const { user } = useAuth();
  
  // Core state
  const [fetchingLoading, setFetchingLoading] = useState(false);
  const [fetchingError, setFetchingError] = useState<string | null>(null);
  const [currentCourseId, setCurrentCourseId] = useState<string | null>(null);
  const [lastFetchedCourse, setLastFetchedCourse] = useState<CourseDetailData | null>(null);

  // Main fetch function - simplified
  const fetchCourseDetails = useCallback(async (
    fetchOptions: FetchCourseOptions
  ): Promise<CourseDetailData | null> => {
    const { courseId, moduleId } = fetchOptions;

    try {
      setFetchingLoading(true);
      setFetchingError(null);
      setCurrentCourseId(courseId);
      
      const supabase = getSupabaseClient();
      
      if (enableLogging) {
        log.debug('Hook', `🎓 [useCourseFetching] Fetching course: ${courseId}`);
      }

      // Fetch course data with proper ID/short_id/slug detection
      let courseQuery = supabase.from('courses').select('*');
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(courseId);
      const isShortId = /^[a-zA-Z0-9]{8}$/.test(courseId); // 8 character alphanumeric
      
      if (isUUID) {
        courseQuery = courseQuery.eq('id', courseId);
      } else if (isShortId) {
        courseQuery = courseQuery.eq('short_id', courseId);
      } else {
        courseQuery = courseQuery.eq('slug', courseId);
      }
      
      let { data: courseData, error: courseError } = await courseQuery.single();

      // Fallback strategy if primary lookup fails
      if (courseError) {
        if (isShortId) {
          // Try slug lookup as fallback
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('courses')
            .select('*')
            .eq('slug', courseId)
            .single();
          
          if (fallbackError) {
            // Final fallback to UUID
            const { data: uuidFallbackData, error: uuidFallbackError } = await supabase
              .from('courses')
              .select('*')
              .eq('id', courseId)
              .single();
            
            if (uuidFallbackError) throw uuidFallbackError;
            courseData = uuidFallbackData;
          } else {
            courseData = fallbackData;
          }
        } else if (!isUUID) {
          // Try short_id as fallback for slugs
          const { data: shortIdData, error: shortIdError } = await supabase
            .from('courses')
            .select('*')
            .eq('short_id', courseId)
            .single();
          
          if (shortIdError) throw courseError; // Throw original error
          courseData = shortIdData;
        } else {
          throw courseError;
        }
      }

      // Check user permissions
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const isCreator = currentUser?.id === courseData.creator_id;
      
      const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', currentUser?.id)
        .single();
      
      const isGeneralAdmin = userProfile?.role === 'admin';
      
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

      // OPTIMIZED: Split the complex nested query into smaller, efficient parts
      // Phase 1: Fetch modules with basic metadata (fast)
      let modulesQuery = supabase
        .from('course_modules')
        .select(`
          id, title, description, module_order, module_type, course_id, space_id, is_published
        `)
        .eq('course_id', courseData.id)
        .order('module_order');

      // Only filter by published if user can't view drafts
      if (!canViewDrafts) {
        modulesQuery = modulesQuery.eq('is_published', true);
      }

      const { data: modulesData, error: modulesError } = await modulesQuery;

      if (modulesError) throw modulesError;

      // Phase 2: Fetch lessons for all modules in a single query (efficient)
      let lessonsQuery = supabase
        .from('course_lessons')
        .select(`
          id, title, content_type, content_text, content_url, lesson_order, module_id,
          content_id, slug, page_type, is_published, estimated_duration,
          difficulty_level, created_at, updated_at
        `)
        .in('module_id', modulesData?.map(m => m.id) || [])
        .order('lesson_order');

      // Only filter by published if user can't view drafts
      if (!canViewDrafts) {
        lessonsQuery = lessonsQuery.eq('is_published', true);
      }

      const { data: lessonsData, error: lessonsError } = await lessonsQuery;

      if (lessonsError) throw lessonsError;

      // Phase 3: Fetch educational content for lessons that need it (lazy loading)
      const lessonsWithContent = lessonsData?.filter(lesson => lesson.content_id) || [];
      let educationalContentMap = new Map();
      
      if (lessonsWithContent.length > 0) {
        const contentIds = lessonsWithContent.map(lesson => lesson.content_id).filter(Boolean);
        const { data: contentData, error: contentError } = await supabase
          .from('educational_content')
          .select(`
            id, title, content_type, text_content, media_url, media_metadata,
            thumbnail_url, embed_data, estimated_duration, difficulty_level,
            created_at, updated_at, slug
          `)
          .in('id', contentIds);

        if (contentError) {
          if (enableLogging) {
            log.warn('Hook', '🎓 [useCourseFetching] Failed to fetch educational content:', contentError);
          }
        } else {
          educationalContentMap = new Map(contentData?.map(content => [content.id, content]) || []);
        }
      }

      // Debug: Log the optimized query results
      if (enableLogging) {
        log.debug('Hook', `🎓 [useCourseFetching] Optimized query results:`, {
          courseId,
          modulesCount: modulesData?.length || 0,
          lessonsCount: lessonsData?.length || 0,
          contentCount: educationalContentMap.size,
          queryStrategy: 'split-query-optimization'
        });
      }

      // Fetch lesson completions
      let completedLessonIds = new Set<string>();
      if (currentUser?.id) {
        const { data: completions } = await supabase
          .from('lesson_completions')
          .select('lesson_id')
          .eq('user_id', currentUser.id)
          .eq('course_id', courseData.id);
        
        if (completions) {
          completedLessonIds = new Set(completions.map(c => c.lesson_id));
        }
      }

      // Transform and filter data
      const transformedModules = (modulesData || []).map(module => {
        // Get lessons for this module
        const moduleLessons = (lessonsData || [])
          .filter(lesson => lesson.module_id === module.id)
          .filter(lesson => canViewDrafts || lesson.is_published) // Filter drafts in app layer
          .sort((a, b) => a.lesson_order - b.lesson_order)
          .map(lesson => ({
            ...lesson,
            completed: completedLessonIds.has(lesson.id),
            educational_content: lesson.content_id ? educationalContentMap.get(lesson.content_id) : null
          }));

        return {
          ...module,
          lessons: moduleLessons
        };
      }).filter(module => canViewDrafts || module.is_published); // Filter draft modules in app layer

      // Calculate course progress
      const allLessons = transformedModules.flatMap(module => module.lessons);
      const totalLessons = allLessons.length;
      const completedLessons = allLessons.filter(lesson => lesson.completed).length;
      const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

      const transformedCourse: CourseDetailData = {
        ...courseData,
        modules: transformedModules,
        progress: progressPercentage
      };

      setLastFetchedCourse(transformedCourse);
      return transformedCourse;
      
    } catch (error: any) {
      let errorMessage = error.message || 'Failed to fetch course details';
      
      // Handle specific database timeout errors (PostgreSQL error 57014)
      if (error.code === '57014' || (error.message && error.message.includes('statement timeout'))) {
        errorMessage = 'The course is taking longer than expected to load. This may be due to high server load. Please try again in a moment.';
        
        if (enableLogging) {
          log.warn('Hook', '🎓 [useCourseFetching] Database timeout detected (57014), providing user-friendly message');
        }
      }
      
      if (enableLogging) {
        log.error('Hook', '🎓 [useCourseFetching] Error fetching course:', error);
      }
      
      setFetchingError(errorMessage);
      return null;
    } finally {
      setFetchingLoading(false);
    }
  }, [enableLogging]);

  // Refetch function
  const refetch = useCallback(async (courseId: string): Promise<CourseDetailData | null> => {
    if (enableLogging) {
      log.debug('Hook', `🎓 [useCourseFetching] Refetching course: ${courseId}`);
    }
    return fetchCourseDetails({ courseId });
  }, [fetchCourseDetails, enableLogging]);

  return {
    fetchCourseDetails,
    refetch,
    fetchingLoading,
    fetchingError,
    currentCourseId,
    lastFetchedCourse
  };
} 