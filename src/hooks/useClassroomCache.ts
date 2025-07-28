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
  
  // PRIORITY 2: Try fallback cache format
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
    
    return data.courses || [];
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
    
    // ✅ OPTIMIZED: Removed forced cache invalidation for specific spaces
    // This was causing unnecessary API calls and re-renders
    
    if (!cache) {
      // Try fallback cache
      const fallbackCourses = loadFallbackCache(spaceId);
      if (fallbackCourses) {
        log.debug('Hook', `✅ [ClassroomCache] Using fallback cache for space ${spaceId}`);
        return fallbackCourses;
      }
      return null;
    }
    
    const cacheAge = Date.now() - cache.lastFetched;
    if (cacheAge > CACHE_DURATION) {
      log.debug('Hook', `⏰ [ClassroomCache] Cache expired for space ${spaceId}, age: ${cacheAge}ms`);
      return null;
    }
    
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
    try {
      const directCacheKey = `courses_cache_${spaceId}`;
      const directData = localStorage.getItem(directCacheKey);
      if (directData) {
        const courses = JSON.parse(directData);
        if (Array.isArray(courses) && courses.length > 0) {
          log.debug('Hook', `✅ [ClassroomCache] Loading REAL courses from localStorage (${courses.length} courses)`);
          
          const realCoursesCache = new Map(spaceCache);
          realCoursesCache.set(spaceId, {
            courses: courses,
            lastFetched: Date.now(),
            loading: false,
            error: null,
          });
          set({ spaceCache: realCoursesCache });
          return; // Use real courses data, skip database query
        }
      }
    } catch (error) {
      log.warn('Hook', 'Failed to load real courses from localStorage:', error);
    }
    
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
      
      // Comprehensive ownership check instead of simple comparison
      let isOwner = false;
      let isSpaceAdmin = false;
      
      if (userId && ownerId) {
        // Check if user is the space owner
        isOwner = userId === ownerId;
        
        // Check if user is a space admin
        if (!isOwner) {
          try {
            const { data: spaceMembership } = await (getSupabaseClient() as any)
              .from('space_members')
              .select('role, status')
              .eq('space_id', spaceId)
              .eq('user_id', userId)
              .single();
            
            isSpaceAdmin = spaceMembership?.role === 'admin' && spaceMembership?.status === 'active';
          } catch (error) {
            // Ignore errors for membership check - user might not be a member
            log.debug('Hook', 'User not a space member or error checking membership');
          }
        }
        
        // Check if user is a general admin
        if (!isOwner && !isSpaceAdmin) {
          try {
            const { data: userProfile } = await (getSupabaseClient() as any)
              .from('users')
              .select('role')
              .eq('id', userId)
              .single();
            
            isOwner = userProfile?.role === 'admin';
          } catch (error) {
            log.debug('Hook', 'Error checking user role');
          }
        }
      }
      
      // User can see draft courses if they're owner, space admin, or general admin
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
      // New model: Users have access if they are space members, not if they are enrolled
      const courseProgressMap = new Map<string, number>();
      
      // Check if user is a space member (has access to all courses)
      const { data: spaceMemberData, error: memberError } = await (getSupabaseClient() as any)
        .from('space_members')
        .select('id')
        .eq('space_id', spaceId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();

      const isSpaceMember = !!spaceMemberData;
      
      // Only calculate progress if user is a space member or can see drafts
      if (isSpaceMember || canSeeDrafts) {
        try {
          // Batch query for lesson IDs
          const { data: allLessonIds, error: lessonError } = await (getSupabaseClient() as any)
            .from('lessons')
            .select('id')
            .in('course_id', courseIds);
          
          if (lessonError) {
            log.warn('Hook', 'Error fetching lesson IDs:', lessonError);
          } else if (allLessonIds && allLessonIds.length > 0) {
            const lessonIds = allLessonIds.map(l => l.id);
            
            // Batch query for completed lessons
            const { data: completedLessons, error: completionError } = await (getSupabaseClient() as any)
              .from('lesson_completions')
              .select('lesson_id')
              .eq('user_id', userId)
              .in('lesson_id', lessonIds);
            
            if (completionError) {
              log.warn('Hook', 'Error fetching lesson completions:', completionError);
            } else if (completedLessons) {
              // Calculate progress for each course
              const lessonCountByCourse = new Map<string, number>();
              const completedCountByCourse = new Map<string, number>();
              
              // Count lessons per course
              for (const lesson of allLessonIds) {
                const courseId = coursesData.find(c => c.id === lesson.course_id)?.id;
                if (courseId) {
                  lessonCountByCourse.set(courseId, (lessonCountByCourse.get(courseId) || 0) + 1);
                }
              }
              
              // Count completed lessons per course
              for (const completion of completedLessons) {
                const lesson = allLessonIds.find(l => l.id === completion.lesson_id);
                if (lesson) {
                  const courseId = coursesData.find(c => c.id === lesson.course_id)?.id;
                  if (courseId) {
                    completedCountByCourse.set(courseId, (completedCountByCourse.get(courseId) || 0) + 1);
                  }
                }
              }
              
              // Calculate progress percentages
              for (const courseId of courseIds) {
                const totalLessons = lessonCountByCourse.get(courseId) || 0;
                const completedLessons = completedCountByCourse.get(courseId) || 0;
                const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
                courseProgressMap.set(courseId, progress);
              }

              log.debug('Hook', '✅ [ClassroomCache] Progress calculated for courses:', {
                totalCourses: courseIds.length,
                totalLessons: allLessonIds.length,
                completedLessons: completedLessons.length,
                progressMap: Object.fromEntries(courseProgressMap),
                canSeeDrafts,
                isSpaceMember
              });
            }
          }
        } catch (progressError) {
          log.warn('Hook', '❌ Error calculating course progress:', progressError);
        }
      }

      const displayData: CourseDisplayData[] = coursesData.map((course: any) => ({
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
        progress: canSeeDrafts || isSpaceMember ? (courseProgressMap.get(course.id) || 0) : undefined,
      }));

      // Filter courses based on user permissions using comprehensive ownership check
      const filteredCourses = canSeeDrafts 
        ? displayData 
        : displayData.filter(course => course.is_published);
      
      // Log filtering results for debugging
      log.debug('Hook', '🔍 [ClassroomCache] Course filtering:', {
        totalCourses: displayData.length,
        filteredCourses: filteredCourses.length,
        canSeeDrafts,
        draftCourses: displayData.filter(c => !c.is_published).map(c => ({ id: c.id, title: c.title })),
        visibleDraftCourses: filteredCourses.filter(c => !c.is_published).map(c => ({ id: c.id, title: c.title }))
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
    
    // Clear the cache first
    const { invalidateCache, fetchCourses } = get();
    invalidateCache(spaceId);
    
    // Fetch fresh data with new ownership context
    await fetchCourses(spaceId, userId, ownerId);
    
    log.debug('Hook', `✅ [ClassroomCache] Force refresh completed for space ${spaceId}`);
  },
}));

export default useClassroomCache;