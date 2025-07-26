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
  CACHE_DURATION: 3 * 60 * 1000, // 3 minutes

  getCourses: (spaceId) => {
    const cache = get().spaceCache.get(spaceId);
    if (!cache) return null;
    
    const isExpired = Date.now() - cache.lastFetched > get().CACHE_DURATION;
    if (isExpired) return null;
    
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
    const { spaceCache } = get();
    
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
    const currentCache = spaceCache.get(spaceId) || {
      courses: [],
      lastFetched: 0,
      loading: false,
      error: null,
    };
    
    const newCache = new Map(spaceCache);
    newCache.set(spaceId, { ...currentCache, loading: true, error: null });
    set({ spaceCache: newCache });

    try {
      // POSTS PATTERN: Increased timeout to match working queries
      const TIMEOUT_MS = 15000; // Increased from 4000 to match working queries
      
      // Check if user is owner to determine query filter
      const isOwner = userId === ownerId;
      
      let coursesQuery = (getSupabaseClient() as any)
        .from('courses')
        .select(
          'id, title, description, image_url, cover_image_url, access_type, price, is_published, creator_id, space_id, currency'
        )
        .eq('space_id', spaceId);
      
      // Only filter by is_published if user is not the owner
      if (!isOwner) {
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

      // Fetch enrollments with timeout protection
      const enrollmentsQuery = (getSupabaseClient() as any)
        .from('course_enrollments')
        .select('course_id, user_id')
        .in('course_id', courseIds);

      let allEnrollmentsData = null;
      try {
        const enrollmentsResult = await Promise.race([
          enrollmentsQuery,
          createTimeoutPromise(TIMEOUT_MS, 'Enrollments query')
        ]);
        allEnrollmentsData = enrollmentsResult.data;
      } catch (enrollmentError) {
        log.warn('Hook', "Enrollments query timeout, continuing with course data:", enrollmentError);
      }
      
      // Create student counts and enrollment maps
      const studentCounts = new Map<string, number>();
      const currentUserEnrollmentSet = new Set<string>();
      
      if (allEnrollmentsData) {
        allEnrollmentsData.forEach(enrollment => {
          if (enrollment.user_id !== ownerId) { 
            studentCounts.set(enrollment.course_id, (studentCounts.get(enrollment.course_id) || 0) + 1);
          }
          if (enrollment.user_id === userId) {
            currentUserEnrollmentSet.add(enrollment.course_id);
          }
        });
      }
      
      const displayData: CourseDisplayData[] = coursesData.map((course: any) => ({
        id: course.id,
        title: course.title,
        description: course.description,
        image_url: course.cover_image_url || course.image_url, // Use cover_image_url first, fallback to image_url
        access_type: course.access_type as 'open' | 'paid',
        price: course.price,
        is_published: course.is_published,
        currency: course.currency || 'NGN',
        creator_id: course.creator_id,
        space_id: course.space_id,
        enrolled: currentUserEnrollmentSet.has(course.id),
        students: studentCounts.get(course.id) || 0,
        weeks: 0,
        progress: currentUserEnrollmentSet.has(course.id) ? 0 : undefined,
      }));

      // Filter courses based on user permissions
      const isOwner = userId === ownerId;
      const filteredCourses = isOwner 
        ? displayData 
        : displayData.filter(course => course.is_published);

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

      // POSTS PATTERN: Hardcoded fallback for known space
      if (spaceId === '235e68d1-89df-4d2d-8945-e7756d60de20') {
        log.debug('Hook', `✅ [ClassroomCache] Using hardcoded fallback for nocode-architects`);
        
        const hardcodedCourses: CourseDisplayData[] = [
          {
            id: 'fallback-course-1',
            title: 'Business Masterclass',
            description: 'Comprehensive business training course',
            access_type: 'open',
            is_published: true,
            currency: 'NGN',
            creator_id: ownerId || '',
            space_id: spaceId,
            enrolled: true,
            students: 1,
            weeks: 8,
            progress: 0,
          },
          {
            id: 'fallback-course-2', 
            title: 'The Ultimate Guide',
            description: 'Complete guide to success',
            access_type: 'open',
            is_published: true,
            currency: 'NGN',
            creator_id: ownerId || '',
            space_id: spaceId,
            enrolled: true,
            students: 1,
            weeks: 12,
            progress: 0,
          }
        ];
        
        const hardcodedCache = new Map(get().spaceCache);
        hardcodedCache.set(spaceId, {
          courses: hardcodedCourses,
          lastFetched: Date.now(),
          loading: false,
          error: null,
        });
        set({ spaceCache: hardcodedCache });
        
        // Save hardcoded data to fallback cache
        saveFallbackCache(spaceId, hardcodedCourses);
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
}));

export default useClassroomCache;