import { useState, useEffect, useCallback } from 'react';
import { log } from '@/utils/logger';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getCachedCourseDetail, 
  setCachedCourseDetail, 
  getCachedCourseProgress, 
  setCachedCourseProgress, 
  invalidateCourseCache as invalidateCourseCacheUtil 
} from '@/utils/courseCacheUtils';
import { shouldEnableMobileFeatures } from '@/utils/mobileDetection';
import { MOBILE_SAFE_RELOAD_DELAY_MS, MAX_REFRESH_RETRIES } from '@/constants/mobile';
import type { 
  CourseDetailData, 
  CourseModule, 
  CourseLesson 
} from '@/types/classroom';

interface UseCourseDetailReturn {
  course: CourseDetailData | null;
  loading: boolean;
  error: string | null;
  fetchCourseDetails: (courseId: string, moduleId?: string) => Promise<CourseDetailData | null>;
  refetch: () => Promise<void>;
  invalidateCache: () => void;
  retryCount: number;
  isOffline: boolean;
}

interface UseCourseDetailOptions {
  enableMobileOptimizations?: boolean;
  enableOfflineSupport?: boolean;
  retryOnError?: boolean;
  cacheStrategy?: 'aggressive' | 'normal' | 'minimal';
}

/**
 * Custom hook for fetching and managing course details with mobile-specific optimizations
 * 
 * Features:
 * - Mobile-optimized caching and retry logic
 * - Offline support with cached data
 * - Network-aware error handling
 * - Performance optimizations for mobile devices
 * - Comprehensive logging for debugging
 */
export function useCourseDetail(options: UseCourseDetailOptions = {}): UseCourseDetailReturn {
  const {
    enableMobileOptimizations = true,
    enableOfflineSupport = true,
    retryOnError = true,
    cacheStrategy = 'normal'
  } = options;

  const { user } = useAuth();
  const [course, setCourse] = useState<CourseDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isOffline, setIsOffline] = useState(false);
  const [currentCourseId, setCurrentCourseId] = useState<string | null>(null);

  // Mobile detection
  const isMobile = enableMobileOptimizations && shouldEnableMobileFeatures();

  // Enhanced cache management with mobile considerations
  const getCachedCourse = useCallback((courseId: string): CourseDetailData | null => {
    try {
      const cached = getCachedCourseDetail<CourseDetailData>(courseId);
      if (cached) {
        log.debug('Hook', `🎓 [useCourseDetail] Cache hit for course: ${courseId}`);
        return cached;
      }
    } catch (error) {
      log.warn('Hook', `🎓 [useCourseDetail] Cache read error for course ${courseId}:`, error);
    }
    return null;
  }, []);

  const setCachedCourse = useCallback((courseId: string, courseData: CourseDetailData) => {
    try {
      setCachedCourseDetail<CourseDetailData>(courseId, courseData);
      log.debug('Hook', `🎓 [useCourseDetail] Cached course data for: ${courseId}`);
    } catch (error) {
      log.warn('Hook', `🎓 [useCourseDetail] Cache write error for course ${courseId}:`, error);
    }
  }, []);

  const getCachedProgress = useCallback((courseId: string): { completedLessonIds: Set<string>; progressPercentage: number } | null => {
    if (!user?.id) return null;
    
    try {
      const cached = getCachedCourseProgress(courseId, user.id);
      if (cached) {
        return {
          completedLessonIds: new Set(cached.completedLessonIds),
          progressPercentage: cached.progressPercentage
        };
      }
    } catch (error) {
      log.warn('Hook', `🎓 [useCourseDetail] Progress cache read error for course ${courseId}:`, error);
    }
    return null;
  }, [user?.id]);

  const setCachedProgress = useCallback((courseId: string, completedLessonIds: Set<string>, progressPercentage: number) => {
    if (!user?.id) return;
    
    try {
      setCachedCourseProgress(courseId, user.id, {
        completedLessonIds: Array.from(completedLessonIds),
        progressPercentage
      });
      log.debug('Hook', `🎓 [useCourseDetail] Cached progress for course: ${courseId}`);
    } catch (error) {
      log.warn('Hook', `🎓 [useCourseDetail] Progress cache write error for course ${courseId}:`, error);
    }
  }, [user?.id]);

  const invalidateCache = useCallback((courseId?: string) => {
    const targetCourseId = courseId || currentCourseId;
    if (targetCourseId) {
      try {
        invalidateCourseCacheUtil(targetCourseId, user?.id);
        log.debug('Hook', `🎓 [useCourseDetail] Invalidated cache for course: ${targetCourseId}`);
      } catch (error) {
        log.warn('Hook', `🎓 [useCourseDetail] Cache invalidation error for course ${targetCourseId}:`, error);
      }
    }
  }, [currentCourseId, user?.id]);

  // Network status detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      log.debug('Hook', '🎓 [useCourseDetail] Network connection restored');
    };

    const handleOffline = () => {
      setIsOffline(true);
      log.debug('Hook', '🎓 [useCourseDetail] Network connection lost');
    };

    // Check initial network status
    setIsOffline(!navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Main fetch function with mobile optimizations
  const fetchCourseDetails = useCallback(async (
    courseId: string, 
    moduleId?: string
  ): Promise<CourseDetailData | null> => {
    try {
      setLoading(true);
      setError(null);
      setCurrentCourseId(courseId);
      
      const supabase = getSupabaseClient();
      
      log.debug('Hook', `🎓 [useCourseDetail] Fetching course details for ID/slug: ${courseId}`);
      log.debug('Hook', `🎓 [useCourseDetail] Mobile optimizations: ${isMobile}, Offline: ${isOffline}`);
      
      // Check cache first (more aggressive on mobile)
      const cachedCourse = getCachedCourse(courseId);
      if (cachedCourse && (enableOfflineSupport || !isOffline)) {
        setCourse(cachedCourse);
        setLoading(false);
        
        // Handle module selection from cache
        if (moduleId && cachedCourse.modules.length > 0) {
          log.debug('Hook', `🎓 [useCourseDetail] Looking for module with ID: ${moduleId}`);
          const targetModule = cachedCourse.modules.find(m => m.id === moduleId);
          if (targetModule && targetModule.lessons.length > 0) {
            log.debug('Hook', `🎓 [useCourseDetail] Found target module, first lesson: ${targetModule.lessons[0].title}`);
          }
        }
        return cachedCourse;
      }

      // If offline and no cache, show appropriate error
      if (isOffline && enableOfflineSupport) {
        const offlineError = 'No cached data available offline. Please check your connection.';
        setError(offlineError);
        setLoading(false);
        log.warn('Hook', `🎓 [useCourseDetail] Offline mode - no cached data for course: ${courseId}`);
        return null;
      }

      // Fetch course data with retry logic
      let courseData = null;
      let courseError = null;
      let attempts = 0;
      const maxAttempts = isMobile ? MAX_REFRESH_RETRIES : 3;

      while (attempts < maxAttempts && !courseData) {
        attempts++;
        
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
          
          let { data, error } = await courseQuery.single();

          if (error) {
            // If slug lookup failed, try ID lookup as fallback
            if (!isUUID) {
              log.debug('Hook', `🎓 [useCourseDetail] Slug lookup failed, trying ID lookup (attempt ${attempts})`);
              const { data: fallbackData, error: fallbackError } = await supabase
                .from('courses')
                .select('*')
                .eq('id', courseId)
                .single();
              
              if (fallbackError) throw fallbackError;
              data = fallbackData;
            } else {
              throw error;
            }
          }

          courseData = data;
          courseError = null;
          
        } catch (attemptError: any) {
          courseError = attemptError;
          log.warn('Hook', `🎓 [useCourseDetail] Fetch attempt ${attempts} failed:`, attemptError);
          
          if (attempts < maxAttempts && retryOnError) {
            // Mobile-specific delay between retries
            const delay = isMobile ? MOBILE_SAFE_RELOAD_DELAY_MS / 1000 : 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      if (courseError) {
        throw courseError;
      }

      if (!courseData) {
        throw new Error('Course not found');
      }

      log.debug('Hook', '🎓 [useCourseDetail] Course data fetched:', {
        id: courseData.id,
        title: courseData.title,
        short_id: courseData.short_id,
        hasShortId: !!courseData.short_id
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

      // Fetch modules and lessons with mobile-optimized query
      let modulesData, modulesError;
      
      try {
        // Use simpler query on mobile for better performance
        const query = isMobile ? `
          id,
          title,
          description,
          module_order,
          module_type,
          course_id,
          space_id,
          course_lessons (
            id,
            title,
            content_type,
            content_text,
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
        ` : `
          id,
          title,
          description,
          module_order,
          module_type,
          course_id,
          space_id,
          course_lessons (
            id,
            title,
            content_type,
            content_text,
            lesson_order,
            module_id,
            content_id,
            slug,
            page_type,
            is_published,
            estimated_duration,
            difficulty_level,
            created_at,
            updated_at,
            educational_content (
              id,
              title,
              content_type,
              text_content,
              media_url,
              embed_data,
              estimated_duration,
              difficulty_level
            ),
            posts!course_lessons_post_id_fkey (
              id,
              title,
              content
            )
          )
        `;

        const result = await supabase
          .from('course_modules')
          .select(query)
          .eq('course_id', courseData.id)
          .order('module_order');
        
        modulesData = result.data;
        modulesError = result.error;

        log.debug('Hook', '🎓 [useCourseDetail] Modules data fetched:', {
          moduleCount: modulesData?.length || 0,
          isMobileQuery: isMobile,
          modules: modulesData?.map(m => ({
            id: m.id,
            title: m.title,
            type: m.module_type,
            lessonCount: m.course_lessons?.length || 0
          }))
        });

      } catch (timeoutError) {
        log.debug('Hook', '🎓 [useCourseDetail] Complex query timed out, trying simpler query...');
        
        // Fallback to simpler query without educational_content
        const fallbackResult = await supabase
          .from('course_modules')
          .select(`
            id,
            title,
            description,
            module_order,
            module_type,
            course_id,
            space_id,
            course_lessons (
              id,
              title,
              content_type,
              content_text,
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
          .eq('course_id', courseData.id)
          .order('module_order');
        
        modulesData = fallbackResult.data;
        modulesError = fallbackResult.error;
      }

      if (modulesError) throw modulesError;

      // Transform data and filter out unpublished lessons for non-owners
      const transformedCourse: CourseDetailData = {
        ...courseData,
        modules: (modulesData || []).map(module => ({
          ...module,
          lessons: (module.course_lessons || [])
            .filter(lesson => canViewDrafts || lesson.is_published)
            .sort((a, b) => a.lesson_order - b.lesson_order)
            .map(lesson => ({
              ...lesson,
              completed: false // Will be updated with actual completion status
            }))
        }))
      };

      log.debug('Hook', '🎓 [useCourseDetail] Transformed course data:', {
        courseId: transformedCourse.id,
        moduleCount: transformedCourse.modules.length,
        canViewDrafts
      });

      // Calculate user progress if user is authenticated
      if (user?.id) {
        try {
          // Check cache first for progress data
          const cachedProgress = getCachedProgress(courseId);
          
          if (cachedProgress) {
            // Use cached progress data
            transformedCourse.progress = cachedProgress.progressPercentage;
            
            // Update completion status for each lesson
            transformedCourse.modules = transformedCourse.modules.map(module => ({
              ...module,
              lessons: module.lessons.map(lesson => ({
                ...lesson,
                completed: cachedProgress.completedLessonIds.has(lesson.id)
              }))
            }));

            log.debug('Hook', '🎓 [useCourseDetail] Using cached progress:', {
              progressPercentage: cachedProgress.progressPercentage,
              completedCount: cachedProgress.completedLessonIds.size
            });
          } else {
            // Get all lesson IDs from the course
            const allLessonIds = transformedCourse.modules
              .flatMap(module => module.lessons)
              .map(lesson => lesson.id);

            if (allLessonIds.length > 0) {
              // Fetch user's completed lessons
              const { data: completedLessons, error: progressError } = await supabase
                .from('lesson_completions')
                .select('lesson_id')
                .eq('user_id', user.id)
                .eq('course_id', transformedCourse.id)
                .in('lesson_id', allLessonIds);

              if (progressError) {
                log.warn('Hook', '🎓 [useCourseDetail] Error fetching progress:', progressError);
              } else {
                // Calculate progress percentage and update lesson completion status
                const completedCount = completedLessons?.length || 0;
                const totalLessons = allLessonIds.length;
                const progressPercentage = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
                const completedLessonIds = new Set(completedLessons?.map(l => l.lesson_id) || []);

                transformedCourse.progress = progressPercentage;

                // Update completion status for each lesson
                transformedCourse.modules = transformedCourse.modules.map(module => ({
                  ...module,
                  lessons: module.lessons.map(lesson => ({
                    ...lesson,
                    completed: completedLessonIds.has(lesson.id)
                  }))
                }));

                // Cache the progress data
                setCachedProgress(courseId, completedLessonIds, progressPercentage);

                log.debug('Hook', '🎓 [useCourseDetail] Progress calculated and cached:', {
                  completedCount,
                  totalLessons,
                  progressPercentage,
                  completedLessonIds: Array.from(completedLessonIds)
                });
              }
            }
          }
        } catch (progressError) {
          log.warn('Hook', '🎓 [useCourseDetail] Error calculating progress:', progressError);
        }
      }

      // Cache the course data (more aggressive on mobile)
      setCachedCourse(courseId, transformedCourse);
      setCourse(transformedCourse);
      setRetryCount(0); // Reset retry count on success
      
      return transformedCourse;
      
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to fetch course details';
      log.error('Hook', '🎓 [useCourseDetail] Error fetching course details:', error);
      
      setError(errorMessage);
      setRetryCount(prev => prev + 1);
      
      // Mobile-specific error handling
      if (isMobile) {
        log.debug('Hook', `🎓 [useCourseDetail] Mobile error - retry count: ${retryCount + 1}`);
      }
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [
    user?.id, 
    isMobile, 
    isOffline, 
    enableOfflineSupport, 
    retryOnError, 
    retryCount,
    getCachedCourse, 
    setCachedCourse, 
    getCachedProgress, 
    setCachedProgress
  ]);

  // Refetch function
  const refetch = useCallback(async () => {
    if (currentCourseId) {
      log.debug('Hook', `🎓 [useCourseDetail] Refetching course: ${currentCourseId}`);
      await fetchCourseDetails(currentCourseId);
    }
  }, [currentCourseId, fetchCourseDetails]);

  return {
    course,
    loading,
    error,
    fetchCourseDetails,
    refetch,
    invalidateCache,
    retryCount,
    isOffline
  };
} 