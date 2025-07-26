import { log } from '@/utils/logger';

// Cache configuration
export const COURSE_CACHE_CONFIG = {
  COURSE_DETAIL_TTL: 10 * 60 * 1000, // 10 minutes
  PROGRESS_TTL: 5 * 60 * 1000, // 5 minutes
  COURSE_LIST_TTL: 3 * 60 * 1000, // 3 minutes
};

// Cache key generators
export const getCourseDetailCacheKey = (courseId: string) => `course_detail_${courseId}`;
export const getCourseProgressCacheKey = (courseId: string, userId: string) => `course_progress_${courseId}_${userId}`;
export const getCourseListCacheKey = (spaceId: string) => `courses_cache_${spaceId}`;

// Cache utility functions
export const getCachedData = <T>(key: string, ttl: number): T | null => {
  try {
    const cached = localStorage.getItem(key);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < ttl) {
        log.debug('Utils', `[CourseCache] Cache hit for key: ${key}`);
        return data;
      }
    }
  } catch (error) {
    log.warn('Utils', `[CourseCache] Failed to read cache for key ${key}:`, error);
  }
  return null;
};

export const setCachedData = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
    log.debug('Utils', `[CourseCache] Cached data for key: ${key}`);
  } catch (error) {
    log.warn('Utils', `[CourseCache] Failed to cache data for key ${key}:`, error);
  }
};

export const invalidateCache = (key: string): void => {
  try {
    localStorage.removeItem(key);
    log.debug('Utils', `[CourseCache] Invalidated cache for key: ${key}`);
  } catch (error) {
    log.warn('Utils', `[CourseCache] Failed to invalidate cache for key ${key}:`, error);
  }
};

// Course-specific cache functions
export const getCachedCourseDetail = <T>(courseId: string): T | null => {
  return getCachedData<T>(getCourseDetailCacheKey(courseId), COURSE_CACHE_CONFIG.COURSE_DETAIL_TTL);
};

export const setCachedCourseDetail = <T>(courseId: string, courseData: T) => {
  setCachedData<T>(getCourseDetailCacheKey(courseId), courseData);
};

export const getCachedCourseProgress = (courseId: string, userId: string) => {
  return getCachedData<{ completedLessonIds: string[]; progressPercentage: number }>(
    getCourseProgressCacheKey(courseId, userId), 
    COURSE_CACHE_CONFIG.PROGRESS_TTL
  );
};

export const setCachedCourseProgress = (courseId: string, userId: string, progressData: { completedLessonIds: string[]; progressPercentage: number }) => {
  setCachedData(getCourseProgressCacheKey(courseId, userId), progressData);
};

export const invalidateCourseCache = (courseId: string, userId?: string) => {
  invalidateCache(getCourseDetailCacheKey(courseId));
  if (userId) {
    invalidateCache(getCourseProgressCacheKey(courseId, userId));
  }
};

// Bulk cache invalidation
export const invalidateAllCourseCaches = (courseId: string) => {
  try {
    // Remove all cache entries that start with the course ID
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes(`course_detail_${courseId}`) || key.includes(`course_progress_${courseId}`))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    log.debug('Utils', `[CourseCache] Invalidated ${keysToRemove.length} cache entries for course: ${courseId}`);
  } catch (error) {
    log.warn('Utils', `[CourseCache] Failed to invalidate all caches for course ${courseId}:`, error);
  }
};

// Cache cleanup utilities
export const cleanupExpiredCaches = () => {
  try {
    const keysToRemove: string[] = [];
    const now = Date.now();
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('course_detail_') || key.startsWith('course_progress_') || key.startsWith('courses_cache_'))) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const { timestamp } = JSON.parse(cached);
            const ttl = key.startsWith('course_detail_') ? COURSE_CACHE_CONFIG.COURSE_DETAIL_TTL :
                       key.startsWith('course_progress_') ? COURSE_CACHE_CONFIG.PROGRESS_TTL :
                       COURSE_CACHE_CONFIG.COURSE_LIST_TTL;
            
            if (now - timestamp > ttl) {
              keysToRemove.push(key);
            }
          }
        } catch (parseError) {
          // If we can't parse the cache entry, remove it
          keysToRemove.push(key);
        }
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    if (keysToRemove.length > 0) {
      log.debug('Utils', `[CourseCache] Cleaned up ${keysToRemove.length} expired cache entries`);
    }
  } catch (error) {
    log.warn('Utils', '[CourseCache] Failed to cleanup expired caches:', error);
  }
};

// Cache statistics
export const getCacheStats = () => {
  try {
    const stats = {
      courseDetail: 0,
      courseProgress: 0,
      courseList: 0,
      totalSize: 0
    };
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          if (key.startsWith('course_detail_')) stats.courseDetail++;
          else if (key.startsWith('course_progress_')) stats.courseProgress++;
          else if (key.startsWith('courses_cache_')) stats.courseList++;
          
          stats.totalSize += value.length;
        }
      }
    }
    
    return stats;
  } catch (error) {
    log.warn('Utils', '[CourseCache] Failed to get cache stats:', error);
    return null;
  }
};

// Initialize cache cleanup on app start
if (typeof window !== 'undefined') {
  // Clean up expired caches every 5 minutes
  setInterval(cleanupExpiredCaches, 5 * 60 * 1000);
  
  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    cleanupExpiredCaches();
  });
} 