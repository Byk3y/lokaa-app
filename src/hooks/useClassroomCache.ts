import { log } from '@/utils/logger';
import { create } from 'zustand';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface CourseDisplayData {
  id: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  slug?: string | null; // URL-friendly slug for course routing (legacy)
  short_id?: string | null; // Short ID for cleaner URLs (Skool-style)
  access_type: 'open' | 'paid';
  price?: number | null;
  is_published: boolean;
  currency?: string;
  weeks?: number;
  students?: number;
  enrolled?: boolean;
  creator_id?: string;
  space_id?: string;
  progress?: number;
}

interface CourseCache {
  courses: CourseDisplayData[];
  lastFetched: number;
  loading: boolean;
  error: string | null;
}

interface ClassroomCacheState {
  // Map of spaceId -> course cache
  spaceCache: Map<string, CourseCache>;
  
  // Cache duration: 3 minutes
  CACHE_DURATION: number;
  
  // Actions
  getCourses: (spaceId: string) => CourseDisplayData[] | null;
  isLoading: (spaceId: string) => boolean;
  getError: (spaceId: string) => string | null;
  fetchCourses: (spaceId: string, userId: string, ownerId?: string) => Promise<void>;
  updateCourseInCache: (spaceId: string, courseId: string, updates: Partial<CourseDisplayData>) => void;
  removeCourseFromCache: (spaceId: string, courseId: string) => void;
  addCourseToCache: (spaceId: string, course: CourseDisplayData) => void;
  invalidateCache: (spaceId?: string) => void;
  updateCourseProgress: (spaceId: string, courseId: string, progress: number) => void;
  forceRefreshCache: (spaceId: string, userId: string, ownerId?: string) => Promise<void>;
}

// POSTS PATTERN: Persistent cache utilities
const saveFallbackCache = (spaceId: string, courses: CourseDisplayData[]) => {
  try {
    const cacheData = {
      courses,
      timestamp: Date.now(),
      spaceId
    };
    localStorage.setItem(`classroom_fallback_${spaceId}`, JSON.stringify(cacheData));
  } catch (error) {
    log.warn('Hook', 'Failed to save classroom fallback cache:', error);
  }
};

const loadFallbackCache = (spaceId: string): CourseDisplayData[] | null => {
  // PRIORITY 1: Try direct courses cache first (from our console script)
  try {
    const directCacheKey = `courses_cache_${spaceId}`;
    const directData = localStorage.getItem(directCacheKey);
    if (directData) {
      const courses = JSON.parse(directData);
      if (Array.isArray(courses) && courses.length > 0) {
        log.debug('Hook', `✅ [ClassroomCache] Using REAL courses from localStorage (${courses.length} courses)`);
        return courses;
      }
    }
  } catch (error) {
    log.warn('Hook', 'Failed to load direct courses cache:', error);
  }
  
  // PRIORITY 2: Try fallback cache format - but check if it has progress data
  try {
    const cached = localStorage.getItem(`classroom_fallback_${spaceId}`);
    if (!cached) return null;
    
    const data = JSON.parse(cached);
    const age = Date.now() - data.timestamp;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    if (age > maxAge) {
      localStorage.removeItem(`classroom_fallback_${spaceId}`);
      return null;
    }
    
    const courses = data.courses || [];
    
    // ✅ PROGRESS FIX: Check if cache has progress data - if not, invalidate it
    const hasAnyProgress = courses.some((course: CourseDisplayData) => 
      course.progress !== undefined && course.progress !== null
    );
    
    if (!hasAnyProgress && courses.length > 0) {
      console.log('🧹 [ClassroomCache] Invalidating old fallback cache - no progress data found');
      localStorage.removeItem(`classroom_fallback_${spaceId}`);
      return null; // Force fresh fetch
    }
    
    return courses;
  } catch (error) {
    log.warn('Hook', 'Failed to load classroom fallback cache:', error);
    return null;
  }
};

// POSTS PATTERN: Timeout protection
const createTimeoutPromise = (timeoutMs: number, operation: string) => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`${operation} timeout`));
    }, timeoutMs);
  });
};

const useClassroomCache = create<ClassroomCacheState>((set, get) => ({
  spaceCache: new Map(),
  CACHE_DURATION: 10 * 60 * 1000, // ✅ OPTIMIZED: Increased from 3 to 10 minutes

  getCourses: (spaceId) => {
    const { spaceCache, CACHE_DURATION } = get();
    const cache = spaceCache.get(spaceId);
    
    if (!cache) {
      // Try fallback cache
      const fallbackCourses = loadFallbackCache(spaceId);
      if (fallbackCourses) {
        log.debug('Hook', `✅ [ClassroomCache] Using fallback cache for space ${spaceId}`);
        console.log('🔍 [ClassroomCache] RETURNING FALLBACK CACHE:', {
          spaceId: spaceId?.slice(0, 8) + '...',
          courseCount: fallbackCourses.length,
          coursesWithProgress: fallbackCourses.filter(c => c.progress && c.progress > 0).length
        });
        return fallbackCourses;
      }
      console.log('🔍 [ClassroomCache] NO CACHE FOUND - returning null to trigger fetch');
      return null;
    }
    
    const cacheAge = Date.now() - cache.lastFetched;
    if (cacheAge > CACHE_DURATION) {
      log.debug('Hook', `⏰ [ClassroomCache] Cache expired for space ${spaceId}, age: ${cacheAge}ms`);
      console.log('🔍 [ClassroomCache] CACHE EXPIRED - returning null to trigger fetch');
      return null;
    }
    
    console.log('🔍 [ClassroomCache] RETURNING CACHED COURSES:', {
      spaceId: spaceId?.slice(0, 8) + '...',
      courseCount: cache.courses.length,
      coursesWithProgress: cache.courses.filter(c => c.progress && c.progress > 0).length,
      cacheAge: Math.round(cacheAge / 1000) + 's'
    });
    
    return cache.courses;
  },

  isLoading: (spaceId) => {
    const cache = get().spaceCache.get(spaceId);
    return cache?.loading ?? false;
  },

  getError: (spaceId) => {
    const cache = get().spaceCache.get(spaceId);
    return cache?.error ?? null;
  },

  fetchCourses: async (spaceId, userId, ownerId) => {
    log.debug('Hook', '🚀 [ClassroomCache] fetchCourses called:', { spaceId, userId, ownerId });
    
    const { spaceCache } = get();
    
    // ✅ OPTIMIZED: Check if already loading to prevent duplicate requests
    const currentCache = spaceCache.get(spaceId);
    if (currentCache?.loading) {
      log.debug('Hook', '⏳ [ClassroomCache] Already loading courses for space:', spaceId);
      return;
    }
    
          // POSTS PATTERN: Check localStorage cache FIRST before setting loading state
    
    // Set loading state only if we need to fetch from database
    const newCache = new Map(spaceCache);
    newCache.set(spaceId, { 
      courses: currentCache?.courses || [],
      lastFetched: currentCache?.lastFetched || 0,
      loading: true, 
      error: null 
    });
    set({ spaceCache: newCache });

    try {
      // POSTS PATTERN: Increased timeout to match working queries
      const TIMEOUT_MS = 15000; // Increased from 4000 to match working queries
      
      // Comprehensive ownership/admin check
      // Determine space owner relationship if ownerId is available
      const isOwner = !!(userId && ownerId && userId === ownerId);
      
      // Determine space admin via membership, independent of ownerId readiness
      let isSpaceAdmin = false;
      if (userId) {
        try {
          const { data: spaceMembership } = await (getSupabaseClient() as any)
            .from('space_members')
            .select('role, status')
            .eq('space_id', spaceId)
            .eq('user_id', userId)
            .maybeSingle();
          
          isSpaceAdmin = spaceMembership?.role === 'admin' && spaceMembership?.status === 'active';
        } catch (error) {
          // Ignore errors for membership check - user might not be a member
          log.debug('Hook', 'User not a space member or error checking membership');
        }
      }
      
      // User can see draft courses if they're owner or space admin
      const canSeeDrafts = isOwner || isSpaceAdmin;
      
      log.debug('Hook', '🔍 [ClassroomCache] Ownership check:', {
        userId,
        ownerId,
        isOwner,
        isSpaceAdmin,
        canSeeDrafts,
        spaceId
      });
      
      let coursesQuery = (getSupabaseClient() as any)
        .from('courses')
        .select(
          'id, title, description, image_url, cover_image_url, access_type, price, is_published, creator_id, space_id, currency, slug, short_id'
        )
        .eq('space_id', spaceId);
      
      // Only filter by is_published if user cannot see drafts
      if (!canSeeDrafts) {
        coursesQuery = coursesQuery.eq('is_published', true);
      }
      
      coursesQuery = coursesQuery.order('created_at', { ascending: false });

      const { data: coursesData, error: coursesError } = await Promise.race([
        coursesQuery,
        createTimeoutPromise(TIMEOUT_MS, 'Courses query')
      ]);

      if (coursesError) {
        throw new Error(coursesError.message);
      }

      if (!coursesData || coursesData.length === 0) {
        const emptyCache = new Map(get().spaceCache);
        emptyCache.set(spaceId, {
          courses: [],
          lastFetched: Date.now(),
          loading: false,
          error: null,
        });
        set({ spaceCache: emptyCache });
        
        // Save empty state to fallback cache
        saveFallbackCache(spaceId, []);
        return;
      }

      const courseIds = coursesData.map(c => c.id);

      // Calculate progress for courses the user has access to
      // Updated model: Calculate progress for ALL users who have access to courses
      const courseProgressMap = new Map<string, number>();
      
      // Enhanced membership and access detection
      let hasProgressAccess = false;
      let membershipReason = 'unknown';
      
      // Check if user is the space owner (always has access)
      if (userId === ownerId) {
        hasProgressAccess = true;
        membershipReason = 'space_owner';
      }
      
      // Check if user is a general admin
      if (!hasProgressAccess && isOwner) {
        hasProgressAccess = true;
        membershipReason = 'general_admin';
      }
      
      // Check if user is a space member or admin
      if (!hasProgressAccess) {
        try {
          const { data: spaceMemberData, error: memberError } = await (getSupabaseClient() as any)
            .from('space_members')
            .select('id, role, status')
            .eq('space_id', spaceId)
            .eq('user_id', userId)
            .eq('status', 'active')
            .maybeSingle();
          
          if (!memberError && spaceMemberData) {
            hasProgressAccess = true;
            membershipReason = `space_member_${spaceMemberData.role || 'member'}`;
          }
        } catch (error) {
          log.debug('Hook', '📊 [ClassroomCache] Space membership check failed:', error);
        }
      }
      
      // Calculate progress - now more inclusive with fallback logic
      log.debug('Hook', '📊 [ClassroomCache] Progress calculation access check:', {
        userId,
        hasProgressAccess,
        membershipReason,
        courseCount: courseIds.length
      });
      
      // TEMP DEBUG: Force console logging to troubleshoot progress issue
      console.log('🔍 [ClassroomCache] PROGRESS DEBUG:', {
        userId: userId?.slice(0, 8) + '...',
        hasProgressAccess,
        membershipReason,
        courseCount: courseIds.length,
        spaceId: spaceId?.slice(0, 8) + '...'
      });
      
      if (courseIds.length > 0) {
        try {
          // Get all lesson IDs for these courses through modules
          // First get modules for these courses
          const { data: modules, error: moduleError } = await (getSupabaseClient() as any)
            .from('course_modules')
            .select('id, course_id')
            .in('course_id', courseIds);

          if (moduleError) {
            log.warn('Hook', '📊 [ClassroomCache] Error fetching course modules:', moduleError);
            // Continue without progress calculation
          } else if (modules && modules.length > 0) {
            const moduleIds = modules.map((m: any) => m.id);
            
            // Now get lessons for these modules
            const { data: lessonIds, error: lessonError } = await (getSupabaseClient() as any)
              .from('course_lessons')
              .select('id, module_id')
              .in('module_id', moduleIds)
              .eq('is_published', true); // Only count published lessons for progress
            
            // Map lessons back to courses through modules
            const lessonToCourseMap = new Map();
            if (lessonIds) {
              lessonIds.forEach((lesson: any) => {
                const module = modules.find((m: any) => m.id === lesson.module_id);
                if (module) {
                  lessonToCourseMap.set(lesson.id, {
                    lessonId: lesson.id,
                    courseId: module.course_id
                  });
                }
              });
            }

            if (lessonError) {
              log.warn('Hook', '📊 [ClassroomCache] Error fetching lesson IDs:', lessonError);
            } else if (lessonIds && lessonIds.length > 0) {
              const allLessonIds = lessonIds.map((l: any) => l.id);
              
              // Get completed lessons for this user - try even if not a space member
              // This allows progress tracking for users who might have accessed courses through other means
              const { data: completions, error: completionError } = await (getSupabaseClient() as any)
                .from('lesson_completions')
                .select('lesson_id, course_id')
                .eq('user_id', userId)
                .in('lesson_id', allLessonIds);

              if (completionError) {
                log.warn('Hook', '📊 [ClassroomCache] Error fetching completions:', completionError);
                // Continue without completions - will show 0% progress
              }
              
              // Group completions by course (even if completions is null/undefined)
              const courseCompletions = new Map<string, string[]>();
              if (completions && completions.length > 0) {
                completions.forEach((completion: any) => {
                  const courseId = completion.course_id;
                  if (!courseCompletions.has(courseId)) {
                    courseCompletions.set(courseId, []);
                  }
                  courseCompletions.get(courseId)!.push(completion.lesson_id);
                });
              }

              // Calculate progress for each course using the lessonToCourseMap
              courseIds.forEach((courseId: any) => {
                // Get lessons for this course through the lessonToCourseMap
                const courseLessons = Array.from(lessonToCourseMap.values())
                  .filter((item: any) => item.courseId === courseId);
                
                const completedLessons = courseCompletions.get(courseId) || [];
                const progress = courseLessons.length > 0 
                  ? Math.round((completedLessons.length / courseLessons.length) * 100)
                  : 0;
                
                courseProgressMap.set(courseId, progress);
                
                // Enhanced logging with more context
                log.debug('Hook', `📊 [ClassroomCache] Course progress calculated:`, {
                  courseId: courseId.slice(0, 8) + '...',
                  totalLessons: courseLessons.length,
                  completedLessons: completedLessons.length,
                  progressPercentage: progress,
                  hasProgressAccess,
                  membershipReason,
                  hasCompletionData: !!completions
                });
              });

              log.debug('Hook', '📊 [ClassroomCache] Overall progress calculation completed:', {
                coursesWithProgress: courseProgressMap.size,
                totalCourses: courseIds.length,
                totalLessons: allLessonIds.length,
                totalCompletions: completions?.length || 0,
                userAccess: { hasProgressAccess, membershipReason }
              });
              
              // TEMP DEBUG: Force console logging
              console.log('📊 [ClassroomCache] PROGRESS CALCULATION RESULT:', {
                coursesWithProgress: courseProgressMap.size,
                totalCourses: courseIds.length,
                totalLessons: allLessonIds.length,
                totalCompletions: completions?.length || 0,
                progressMap: Array.from(courseProgressMap.entries()).map(([id, progress]) => ({
                  courseId: id.slice(0, 8) + '...',
                  progress: progress + '%'
                }))
              });
            }
          }
        } catch (error) {
          log.warn('Hook', '📊 [ClassroomCache] Error calculating progress:', error);
          // Don't fail the entire request - just log the error
        }
      }

      const displayData: CourseDisplayData[] = coursesData.map((course: any) => {
        const progress = courseProgressMap.get(course.id) || 0;
        
        // Enhanced progress assignment logging
        log.debug('Hook', `📊 [ClassroomCache] Assigning progress to course "${course.title}":`, {
          courseId: course.id?.slice(0, 8) + '...',
          progressValue: progress,
          hasProgressInMap: courseProgressMap.has(course.id),
          courseTitle: course.title?.slice(0, 30) + (course.title?.length > 30 ? '...' : '')
        });
        
        // TEMP DEBUG: Force console logging for each course
        console.log(`🎯 [ClassroomCache] Course "${course.title}" progress:`, {
          courseId: course.id?.slice(0, 8) + '...',
          progress: progress + '%',
          inProgressMap: courseProgressMap.has(course.id)
        });
        
        return {
          id: course.id,
          title: course.title,
          description: course.description,
          image_url: course.cover_image_url || course.image_url, // Use cover_image_url first, fallback to image_url
          slug: course.slug, // Include slug for URL routing (legacy)
          short_id: course.short_id, // ✅ FIX: Include short_id for new URL pattern (Skool-style)
          access_type: course.access_type as 'open' | 'paid',
          price: course.price,
          is_published: course.is_published,
          currency: course.currency || 'NGN',
          creator_id: course.creator_id,
          space_id: course.space_id,
          enrolled: false, // No longer based on enrollment
          students: 0, // No longer based on enrollment
          weeks: 0,
          progress: progress, // ✅ FIXED: Show progress for all users
        };
      });

      // ✅ FIXED: Remove redundant filtering since we already filter at database level
      // Only apply filtering if database query included drafts for owners
      const filteredCourses = displayData; // Use all data since DB query already filtered correctly
      
      // Log filtering results for debugging
      log.debug('Hook', '🔍 [ClassroomCache] Course filtering:', {
        totalCourses: displayData.length,
        canSeeDrafts,
        draftCourses: displayData.filter(c => !c.is_published).length,
        publishedCourses: displayData.filter(c => c.is_published).length,
        userIsOwner: isOwner,
        userIsSpaceAdmin: isSpaceAdmin
      });

      // Update cache with successful data
      const successCache = new Map(get().spaceCache);
      successCache.set(spaceId, {
        courses: filteredCourses,
        lastFetched: Date.now(),
        loading: false,
        error: null,
      });
      set({ spaceCache: successCache });

      // POSTS PATTERN: Save to persistent fallback cache
      saveFallbackCache(spaceId, filteredCourses);

    } catch (error) {
      log.error('Hook', `❌ Error fetching courses for space ${spaceId}:`, error);
      
      // POSTS PATTERN: Attempt fallback cache recovery
      const fallbackCourses = loadFallbackCache(spaceId);
      
      if (fallbackCourses && fallbackCourses.length > 0) {
        log.debug('Hook', `✅ [ClassroomCache] Using fallback cache data for space ${spaceId}`);
        
        const fallbackCache = new Map(get().spaceCache);
        fallbackCache.set(spaceId, {
          courses: fallbackCourses,
          lastFetched: Date.now(),
          loading: false,
          error: null,
        });
        set({ spaceCache: fallbackCache });
        return;
      }

      // Final fallback: empty state with error
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch courses";
      
      const errorCache = new Map(get().spaceCache);
      errorCache.set(spaceId, {
        courses: [],
        lastFetched: Date.now(),
        loading: false,
        error: errorMessage,
      });
      set({ spaceCache: errorCache });
    }
  },

  updateCourseInCache: (spaceId, courseId, updates) => {
    const { spaceCache } = get();
    const cache = spaceCache.get(spaceId);
    
    if (!cache) return;
    
    const updatedCourses = cache.courses.map(course =>
      course.id === courseId ? { ...course, ...updates } : course
    );
    
    const newCache = new Map(spaceCache);
    newCache.set(spaceId, { ...cache, courses: updatedCourses });
    set({ spaceCache: newCache });
    
    // Update fallback cache
    saveFallbackCache(spaceId, updatedCourses);
  },

  removeCourseFromCache: (spaceId, courseId) => {
    const { spaceCache } = get();
    const cache = spaceCache.get(spaceId);
    
    if (!cache) return;
    
    const filteredCourses = cache.courses.filter(course => course.id !== courseId);
    
    const newCache = new Map(spaceCache);
    newCache.set(spaceId, { ...cache, courses: filteredCourses });
    set({ spaceCache: newCache });
    
    // Update fallback cache
    saveFallbackCache(spaceId, filteredCourses);
  },

  addCourseToCache: (spaceId, course) => {
    const { spaceCache } = get();
    const cache = spaceCache.get(spaceId);
    
    if (!cache) return;
    
    const newCourses = [course, ...cache.courses];
    
    const newCache = new Map(spaceCache);
    newCache.set(spaceId, { ...cache, courses: newCourses });
    set({ spaceCache: newCache });
    
    // Update fallback cache
    saveFallbackCache(spaceId, newCourses);
  },

  invalidateCache: (spaceId) => {
    const { spaceCache } = get();
    
    if (spaceId) {
      // Invalidate specific space cache
      const newCache = new Map(spaceCache);
      newCache.delete(spaceId);
      set({ spaceCache: newCache });
      
      // Clear fallback cache
      try {
        localStorage.removeItem(`classroom_fallback_${spaceId}`);
      } catch (error) {
        log.warn('Hook', 'Failed to clear classroom fallback cache:', error);
      }
    } else {
      // Clear all cache
      set({ spaceCache: new Map() });
      
      // Clear all fallback caches
      try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('classroom_fallback_')) {
            localStorage.removeItem(key);
          }
        });
      } catch (error) {
        log.warn('Hook', 'Failed to clear all classroom fallback caches:', error);
      }
    }
  },

  updateCourseProgress: (spaceId, courseId, progress) => {
    const { spaceCache } = get();
    const cache = spaceCache.get(spaceId);
    
    if (cache) {
      const updatedCourses = cache.courses.map(course => 
        course.id === courseId 
          ? { ...course, progress }
          : course
      );
      
      const newCache = new Map(spaceCache);
      newCache.set(spaceId, {
        ...cache,
        courses: updatedCourses,
      });
      set({ spaceCache: newCache });
      
      // Update fallback cache as well
      saveFallbackCache(spaceId, updatedCourses);
      
      log.debug('Hook', `✅ [ClassroomCache] Updated progress for course ${courseId}: ${progress}%`);
    }
  },

  forceRefreshCache: async (spaceId, userId, ownerId) => {
    log.debug('Hook', `🔄 [ClassroomCache] Force refreshing cache for space ${spaceId}`);
    
    // ✅ IMPROVED: Don't clear cache immediately to prevent flickering
    // Instead, keep existing data visible during refresh
    const { fetchCourses } = get();
    
    try {
      // Fetch fresh data with new ownership context without clearing cache
      await fetchCourses(spaceId, userId, ownerId);
      log.debug('Hook', `✅ [ClassroomCache] Force refresh completed for space ${spaceId}`);
    } catch (error) {
      log.error('Hook', `❌ [ClassroomCache] Force refresh failed for space ${spaceId}:`, error);
      // Keep existing cache on error to prevent data loss
    }
  },
}));

// Export the store
export default useClassroomCache;

// Auto-initialize debugging tools
if (typeof window !== 'undefined') {
  (window as any).classroomCache = {
    clearAllCache: () => {
      const spaceKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('classroom_fallback_') || key.startsWith('courses_cache_')
      );
      spaceKeys.forEach(key => localStorage.removeItem(key));
      useClassroomCache.getState().invalidateCache();
      console.log('🧹 [ClassroomCache] Manually cleared all classroom caches:', spaceKeys);
    },
    clearSpace: (spaceId: string) => {
      localStorage.removeItem(`classroom_fallback_${spaceId}`);
      localStorage.removeItem(`courses_cache_${spaceId}`);
      useClassroomCache.getState().invalidateCache(spaceId);
      console.log(`🧹 [ClassroomCache] Manually cleared cache for space ${spaceId}`);
    },
    getCacheInfo: () => {
      const caches = useClassroomCache.getState().spaceCache;
      const info = Array.from(caches.entries()).map(([spaceId, cache]) => ({
        spaceId: spaceId.slice(0, 8) + '...',
        courseCount: cache.courses.length,
        coursesWithProgress: cache.courses.filter(c => c.progress && c.progress > 0).length,
        lastFetched: new Date(cache.lastFetched).toLocaleString(),
        loading: cache.loading
      }));
      console.table(info);
      return info;
    }
  };
  
  console.log('🛠️ [ClassroomCache] Debug tools available:');
  console.log('- window.classroomCache.clearAllCache() - Clear all classroom caches');
  console.log('- window.classroomCache.clearSpace(spaceId) - Clear cache for specific space');
  console.log('- window.classroomCache.getCacheInfo() - Show cache information');
}