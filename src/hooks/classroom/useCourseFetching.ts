import { useCallback, useState } from 'react';
import { log } from '@/utils/logger';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { shouldEnableMobileFeatures } from '@/utils/mobileDetection';
import { MOBILE_SAFE_RELOAD_DELAY_MS, MAX_REFRESH_RETRIES } from '@/constants/mobile';
import type { CourseDetailData } from '@/types/classroom/courseDetail';

interface FetchCourseOptions {
  courseId: string;
  moduleId?: string;
  enableMobileOptimizations?: boolean;
  retryOnError?: boolean;
  enableOfflineSupport?: boolean;
  loadMetadataOnly?: boolean; // New flag for progressive loading
  loadLessonListOnly?: boolean; // New flag for progressive loading
}

interface UseCourseFetchingReturn {
  // Core fetching functions
  fetchCourseDetails: (options: FetchCourseOptions) => Promise<CourseDetailData | null>;
  refetch: (courseId: string) => Promise<CourseDetailData | null>;
  silentRefetch: (courseId: string) => Promise<CourseDetailData | null>;
  
  // Fetching state
  fetchingLoading: boolean;
  loadingPhase: 'initial' | 'content' | 'complete';
  fetchingError: string | null;
  retryCount: number;
  
  // Current fetch state
  currentCourseId: string | null;
  lastFetchedCourse: CourseDetailData | null;
}

interface UseCourseFetchingOptions {
  enableLogging?: boolean;
  enableMobileOptimizations?: boolean;
  retryOnError?: boolean;
  enableOfflineSupport?: boolean;
}

/**
 * Custom hook for fetching course data with mobile optimizations
 * 
 * Features:
 * - Course data fetching with retry logic
 * - Module and lesson fetching with optimized queries
 * - Permission checking integration
 * - Data transformation and filtering
 * - Mobile-specific optimizations
 * - Comprehensive error handling and logging
 */
export function useCourseFetching(options: UseCourseFetchingOptions = {}): UseCourseFetchingReturn {
  const {
    enableLogging = true,
    enableMobileOptimizations = true,
    retryOnError = true,
    enableOfflineSupport = true
  } = options;

  const { user } = useAuth();
  
  // Fetching state
  const [fetchingLoading, setFetchingLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<'initial' | 'content' | 'complete'>('initial');
  const [fetchingError, setFetchingError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [currentCourseId, setCurrentCourseId] = useState<string | null>(null);
  const [lastFetchedCourse, setLastFetchedCourse] = useState<CourseDetailData | null>(null);

  // Mobile detection
  const isMobile = enableMobileOptimizations && shouldEnableMobileFeatures();

  // PROGRESSIVE LOADING: Main fetch function with phase-based loading
  const fetchCourseDetails = useCallback(async (
    fetchOptions: FetchCourseOptions
  ): Promise<CourseDetailData | null> => {
    const {
      courseId,
      moduleId,
      enableMobileOptimizations: fetchMobileOpts = true,
      retryOnError: fetchRetryOnError = true,
      enableOfflineSupport: fetchOfflineSupport = true,
      loadMetadataOnly = false,
      loadLessonListOnly = false
    } = fetchOptions;

    try {
      setFetchingLoading(true);
      setLoadingPhase('initial');
      setFetchingError(null);
      setCurrentCourseId(courseId);
      
      const supabase = getSupabaseClient();
      
      if (enableLogging) {
        log.debug('Hook', `🎓 [useCourseFetching] Fetching course details for ID/slug: ${courseId}`);
        log.debug('Hook', `🎓 [useCourseFetching] Mobile optimizations: ${isMobile}`);
      }

      // Fetch course data with retry logic
      let courseData = null;
      let courseError = null;
      let attempts = 0;
      // MOBILE OPTIMIZATION: Reduce retry attempts for faster failure
      const maxAttempts = isMobile ? 1 : 3;

      // MOBILE OPTIMIZATION: Add timeout for faster failure on mobile
      const timeoutMs = isMobile ? 3000 : 10000; // 3 seconds on mobile, 10 on desktop
      
      const fetchWithTimeout = async (queryPromise: Promise<any>) => {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
        );
        return Promise.race([queryPromise, timeoutPromise]);
      };

      while (attempts < maxAttempts && !courseData) {
        attempts++;
        
        try {
          // Fetch course data with optimized approach for mobile
          let courseQuery = supabase.from('courses').select('*');
          
          // Try to determine if courseId is a UUID, short_id, or slug
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(courseId);
          const isShortId = /^[a-zA-Z0-9]{8}$/.test(courseId); // 8 character alphanumeric

          if (isUUID) {
            courseQuery = courseQuery.eq('id', courseId);
          } else if (isShortId) {
            courseQuery = courseQuery.eq('short_id', courseId);
          } else {
            courseQuery = courseQuery.eq('slug', courseId);
          }
          
          // PROGRESSIVE LOADING: Handle different loading phases
          let { data, error } = await courseQuery.single();

          if (error) {
            // MOBILE OPTIMIZATION: Skip fallback attempts on mobile for faster failure
            if (isMobile) {
              throw error; // Fail fast on mobile
            }
            
            // Desktop fallback logic (only for desktop)
            if (isUUID) {
              if (enableLogging) {
                log.debug('Hook', `🎓 [useCourseFetching] UUID lookup failed, trying short_id lookup (attempt ${attempts})`);
              }
              const { data: fallbackData, error: fallbackError } = await supabase
                .from('courses')
                .select('*')
                .eq('short_id', courseId)
                .single();
              
              if (fallbackError) {
                if (enableLogging) {
                  log.debug('Hook', `🎓 [useCourseFetching] Short ID lookup failed, trying slug lookup (attempt ${attempts})`);
                }
                const { data: slugFallbackData, error: slugFallbackError } = await supabase
                  .from('courses')
                  .select('*')
                  .eq('slug', courseId)
                  .single();
                
                if (slugFallbackError) throw slugFallbackError;
                data = slugFallbackData;
              } else {
                data = fallbackData;
              }
            } else if (isShortId) {
              // If short_id lookup failed, try slug lookup as fallback
              if (enableLogging) {
                log.debug('Hook', `🎓 [useCourseFetching] Short ID lookup failed, trying slug lookup (attempt ${attempts})`);
              }
              const { data: fallbackData, error: fallbackError } = await supabase
                .from('courses')
                .select('*')
                .eq('slug', courseId)
                .single();
              
              if (fallbackError) throw fallbackError;
              data = fallbackData;
            } else {
              // If slug lookup failed and courseId is not a UUID or short_id, just throw the error
              // Don't try ID lookup with invalid UUID format
              throw error;
            }
          }

          courseData = data;
          courseError = null;
          
        } catch (attemptError: any) {
          courseError = attemptError;
          if (enableLogging) {
            log.warn('Hook', `🎓 [useCourseFetching] Fetch attempt ${attempts} failed:`, attemptError);
          }
          
          // MOBILE OPTIMIZATION: No delay between retries on mobile for faster failure
          if (attempts < maxAttempts && fetchRetryOnError && !isMobile) {
            const delay = 1000;
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

      if (enableLogging) {
        log.debug('Hook', '🎓 [useCourseFetching] Course data fetched:', {
          id: courseData.id,
          title: courseData.title,
          short_id: courseData.short_id,
          hasShortId: !!courseData.short_id,
          loadMetadataOnly,
          loadLessonListOnly
        });
      }

      // PROGRESSIVE LOADING: If only metadata is requested, return early
      if (loadMetadataOnly) {
        if (enableLogging) {
          log.debug('Hook', '🎓 [useCourseFetching] Returning course metadata only for progressive loading');
        }
        setFetchingLoading(false);
        setLoadingPhase('complete');
        return {
          ...courseData,
          modules: [],
          progress: 0
        } as CourseDetailData;
      }

      // Check user permissions (only if we need lesson data)
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
      let modulesData, modulesError;
      
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
          .eq('course_id', courseData.id)
          .order('module_order');
        
        modulesData = modulesResult.data;
        modulesError = modulesResult.error;

        if (enableLogging) {
          log.debug('Hook', '🎓 [useCourseFetching] Phase 1 - Modules with basic lesson data fetched:', {
            moduleCount: modulesData?.length || 0,
            totalLessons: modulesData?.reduce((sum, m) => sum + (m.course_lessons?.length || 0), 0) || 0
          });
        }

        // Set loading phase to content for better UX
        setLoadingPhase('content');

        // Phase 2: Fetch detailed content for lessons that need it (lazy loading)
        if (modulesData && modulesData.length > 0) {
          const lessonsNeedingContent = modulesData
            .flatMap(module => module.course_lessons || [])
            .filter(lesson => lesson.content_id || lesson.content_type === 'rich_text');

          if (lessonsNeedingContent.length > 0) {
            if (enableLogging) {
              log.debug('Hook', '🎓 [useCourseFetching] Phase 2 - Fetching detailed content for lessons:', lessonsNeedingContent.length);
            }
            
            // Fetch educational content in batches for better performance
            const contentIds = lessonsNeedingContent
              .map(lesson => lesson.content_id)
              .filter(Boolean) as string[];

            if (contentIds.length > 0) {
              const { data: educationalContent, error: contentError } = await supabase
                .from('educational_content')
                .select(`
                  id,
                  title,
                  content_type,
                  text_content,
                  media_url,
                  embed_data,
                  estimated_duration,
                  difficulty_level
                `)
                .in('id', contentIds);

              if (contentError) {
                if (enableLogging) {
                  log.warn('Hook', '🎓 [useCourseFetching] Error fetching educational content:', contentError);
                }
              } else {
                // Create a map for quick lookup
                const contentMap = new Map(
                  educationalContent?.map(content => [content.id, content]) || []
                );

                // Merge content into lessons
                modulesData = modulesData.map(module => ({
                  ...module,
                  course_lessons: (module.course_lessons || []).map(lesson => ({
                    ...lesson,
                    educational_content: lesson.content_id ? contentMap.get(lesson.content_id) : null
                  }))
                }));

                if (enableLogging) {
                  log.debug('Hook', '🎓 [useCourseFetching] Phase 2 - Educational content merged successfully');
                }
              }
            }
          }
        }

      } catch (error) {
        if (enableLogging) {
          log.error('Hook', '🎓 [useCourseFetching] Error in optimized query strategy:', error);
        }
        
        // Fallback to simple query if optimized strategy fails
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
        
        if (enableLogging) {
          log.debug('Hook', '🎓 [useCourseFetching] Fallback query executed');
        }
      }

      if (modulesError) throw modulesError;

      // Fetch lesson completion status for the current user
      let lessonCompletions: { lesson_id: string }[] = [];
      if (currentUser?.id) {
        try {
          const { data: completions, error: completionsError } = await supabase
            .from('lesson_completions')
            .select('lesson_id')
            .eq('user_id', currentUser.id)
            .eq('course_id', courseData.id);

          if (completionsError) {
            if (enableLogging) {
              log.warn('Hook', '🎓 [useCourseFetching] Error fetching lesson completions:', completionsError);
            }
          } else {
            lessonCompletions = completions || [];
            if (enableLogging) {
              log.debug('Hook', '🎓 [useCourseFetching] Lesson completions fetched:', lessonCompletions.length);
            }
          }
        } catch (error) {
          if (enableLogging) {
            log.warn('Hook', '🎓 [useCourseFetching] Error fetching lesson completions:', error);
          }
        }
      }

      // Create a set of completed lesson IDs for fast lookup
      const completedLessonIds = new Set(lessonCompletions.map(c => c.lesson_id));

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
              completed: completedLessonIds.has(lesson.id)
            }))
        }))
      };

      if (enableLogging) {
        log.debug('Hook', '🎓 [useCourseFetching] Transformed course data:', {
          courseId: transformedCourse.id,
          moduleCount: transformedCourse.modules.length,
          canViewDrafts
        });
      }

      // Handle module selection from cache
      if (moduleId && transformedCourse.modules.length > 0) {
        if (enableLogging) {
          log.debug('Hook', `🎓 [useCourseFetching] Looking for module with ID: ${moduleId}`);
        }
        const targetModule = transformedCourse.modules.find(m => m.id === moduleId);
        if (targetModule && targetModule.lessons.length > 0) {
          if (enableLogging) {
            log.debug('Hook', `🎓 [useCourseFetching] Found target module, first lesson: ${targetModule.lessons[0].title}`);
          }
        }
      }

      setLastFetchedCourse(transformedCourse);
      setRetryCount(0); // Reset retry count on success
      setLoadingPhase('complete');
      
      return transformedCourse;
      
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to fetch course details';
      
      if (enableLogging) {
        log.error('Hook', '🎓 [useCourseFetching] Error fetching course details:', error);
      }
      
      setFetchingError(errorMessage);
      setRetryCount(prev => prev + 1);
      
      // Mobile-specific error handling
      if (isMobile) {
        if (enableLogging) {
          log.debug('Hook', `🎓 [useCourseFetching] Mobile error - retry count: ${retryCount + 1}`);
        }
      }
      
      return null;
    } finally {
      setFetchingLoading(false);
    }
  }, [isMobile, enableLogging]);

  // Refetch function
  const refetch = useCallback(async (courseId: string): Promise<CourseDetailData | null> => {
    if (enableLogging) {
      log.debug('Hook', `🎓 [useCourseFetching] Refetching course: ${courseId}`);
    }
    return fetchCourseDetails({ courseId });
  }, [fetchCourseDetails, enableLogging]);

  // Silent refetch function (doesn't trigger loading state)
  const silentRefetch = useCallback(async (courseId: string): Promise<CourseDetailData | null> => {
    if (enableLogging) {
      log.debug('Hook', `🎓 [useCourseFetching] Silent refetching course: ${courseId}`);
    }
    try {
      // Temporarily disable loading state
      const wasLoading = fetchingLoading;
      setFetchingLoading(false);
      
      const result = await fetchCourseDetails({ courseId });
      
      // Restore loading state if it was loading before
      if (wasLoading) {
        setFetchingLoading(true);
      }
      
      return result;
    } catch (error) {
      if (enableLogging) {
        log.warn('Hook', `🎓 [useCourseFetching] Silent refetch failed:`, error);
      }
      return null;
    }
  }, [fetchCourseDetails, fetchingLoading, enableLogging]);

  return {
    fetchCourseDetails,
    refetch,
    silentRefetch,
    fetchingLoading,
    loadingPhase,
    fetchingError,
    retryCount,
    currentCourseId,
    lastFetchedCourse
  };
} 