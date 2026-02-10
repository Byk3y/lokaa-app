import { log } from '@/utils/logger';
import { create } from 'zustand';
import { getSupabaseClient } from '@/integrations/supabase/client';

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
  loadingForUserId?: string | null; // Track who we are currently fetching for
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
        log.debug('Hook', `📋 [ClassroomCache] Found ${courses.length} courses in direct cache`);
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

    const courses = data.courses || [];

    // ✅ EMPTY CACHE FIX: If empty, return null to force a fresh fetch
    if (courses.length === 0) {
      return null;
    }

    // ✅ PROGRESS FIX: Check if cache has progress data - if not, invalidate it
    const hasAnyProgress = courses.some((course: CourseDisplayData) =>
      course.progress !== undefined && course.progress !== null
    );

    if (!hasAnyProgress && courses.length > 0) {
      localStorage.removeItem(`classroom_fallback_${spaceId}`);
      return null; // Force fresh fetch
    }

    log.debug('Hook', `📋 [ClassroomCache] Found ${courses.length} courses in fallback cache`);
    return courses;
  } catch (error) {
    log.warn('Hook', 'Failed to load classroom fallback cache:', error);
    return null;
  }
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
        return fallbackCourses;
      }
      return null;
    }

    const cacheAge = Date.now() - cache.lastFetched;
    if (cacheAge > CACHE_DURATION) {
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
    const { spaceCache } = get();
    const currentCache = spaceCache.get(spaceId);

    // Prevent redundant fetches for the same user/space combo
    // IMPORTANT: Re-get state to avoid stale check if multiple calls happen in same tick
    const latestCache = get().spaceCache.get(spaceId);
    if (latestCache?.loading && latestCache?.loadingForUserId === userId) {
      log.debug('SpaceManagement', `⏳ [ClassroomCache] Already fetching for space ${spaceId} and user ${userId || 'guest'}, skipping`);
      return;
    }

    // SWR Pattern: Set loading state but PRESERVE existing courses
    const newCache = new Map(spaceCache);
    newCache.set(spaceId, {
      courses: currentCache?.courses || loadFallbackCache(spaceId) || [],
      lastFetched: currentCache?.lastFetched || 0,
      loading: true,
      loadingForUserId: userId || null,
      error: null
    });
    set({ spaceCache: newCache });

    // Non-destructive timeout
    const timeoutId = setTimeout(() => {
      log.warn('SpaceManagement', `⏰ [ClassroomCache] Revalidation timeout for space ${spaceId}`);
      const state = get().spaceCache.get(spaceId);
      const timeoutCache = new Map(get().spaceCache);
      timeoutCache.set(spaceId, {
        courses: state?.courses || [],
        lastFetched: state?.lastFetched || Date.now(),
        loading: false,
        error: 'Update slowed down - showing cached data'
      });
      set({ spaceCache: timeoutCache });
    }, 15000);

    try {
      const supabase = getSupabaseClient();

      // Ownership/Admin check for visibility
      const isOwner = !!(userId && ownerId && userId === ownerId);

      log.debug('SpaceManagement', `🎓 [ClassroomCache] Fetching courses for space: ${spaceId}`, {
        userId,
        ownerId,
        isOwner,
        env: process.env.NODE_ENV
      });

      let isSpaceAdmin = false;
      if (userId && !isOwner) {
        const { data: membership } = await supabase
          .from('space_members')
          .select('role, status')
          .eq('space_id', spaceId)
          .eq('user_id', userId)
          .maybeSingle();
        isSpaceAdmin = membership?.role === 'admin' && membership?.status === 'active';
      }

      const canSeeDrafts = isOwner || isSpaceAdmin;

      // OPTIMIZED: Use the aggregated view
      let query = supabase
        .from('view_course_details')
        .select('*')
        .eq('space_id', spaceId);

      if (!canSeeDrafts) {
        query = query.eq('is_published', true);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      log.debug('SpaceManagement', `✅ [ClassroomCache] Sucessfully fetched ${data?.length || 0} courses from DB`);

      // Map view data to Display format
      const courses: CourseDisplayData[] = (data || []).map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        image_url: row.cover_image_url || row.image_url,
        slug: row.slug,
        short_id: row.short_id,
        access_type: row.access_type,
        price: row.price,
        is_published: row.is_published,
        currency: row.currency || 'NGN',
        students: row.students_count || 0,
        enrolled: row.is_enrolled || false,
        creator_id: row.creator_id,
        space_id: row.space_id,
        progress: row.progress_percentage || 0
      }));

      clearTimeout(timeoutId);

      // GUEST OVERWRITE PROTECTION (ENHANCED):
      // On fresh refresh, currentCache might be empty but we might have loaded from fallback.
      // We check if we're overwriting a state that had MORE courses (like owner drafts).
      let finalCourses = courses;

      // Get the current source of truth for the comparison:
      // Either precisely what's in memory, or what we just fetched.
      const existingCourses = currentCache?.courses || [];

      if (!userId && existingCourses.length > courses.length) {
        // If this is a guest fetch and it has FEWER results than we already have...
        // Check if the existing data had drafts (which guests won't see)
        const hadDrafts = existingCourses.some(c => !c.is_published);

        if (hadDrafts || existingCourses.length > 0) {
          log.debug('SpaceManagement', `🛡️ [ClassroomCache] Guest fetch (empty/limited) received for space ${spaceId} while existing courses (${existingCourses.length}) are present. PRESERVING cache.`);
          finalCourses = existingCourses;
        }
      }

      const successCache = new Map(get().spaceCache);
      successCache.set(spaceId, {
        courses: finalCourses,
        lastFetched: Date.now(),
        loading: false,
        loadingForUserId: null,
        error: null,
      });
      set({ spaceCache: successCache });

      saveFallbackCache(spaceId, finalCourses);

    } catch (error: any) {
      clearTimeout(timeoutId);
      log.error('SpaceManagement', `❌ [ClassroomCache] Revalidation failed for ${spaceId}:`, error);

      // SWR Pattern: Keep old data on error
      const state = get().spaceCache.get(spaceId);
      const errorCache = new Map(get().spaceCache);
      errorCache.set(spaceId, {
        courses: state?.courses || [],
        lastFetched: state?.lastFetched || Date.now(),
        loading: false,
        error: error.message || 'Failed to update courses'
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

    }
  },

  forceRefreshCache: async (spaceId, userId, ownerId) => {

    // ✅ IMPROVED: Don't clear cache immediately to prevent flickering
    // Instead, keep existing data visible during refresh
    const { fetchCourses } = get();

    try {
      // Fetch fresh data with new ownership context without clearing cache
      await fetchCourses(spaceId, userId, ownerId);
    } catch (error) {
      log.error('Hook', `❌ [ClassroomCache] Force refresh failed for space ${spaceId}:`, error instanceof Error ? error : new Error(String(error)));
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
    },
    clearSpace: (spaceId: string) => {
      localStorage.removeItem(`classroom_fallback_${spaceId}`);
      localStorage.removeItem(`courses_cache_${spaceId}`);
      useClassroomCache.getState().invalidateCache(spaceId);
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

}