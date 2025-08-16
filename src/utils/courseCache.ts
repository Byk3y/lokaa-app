/**
 * Simplified Course Cache System
 * 
 * Replaces 10+ complex cache files with a single, clean implementation.
 * Features: localStorage wrapper + TTL + simple invalidation
 * 
 * This consolidates all classroom caching functionality that was previously
 * spread across multiple files with theoretical features.
 */

import { log } from '@/utils/logger';
import type { CourseDetailData } from '@/types/classroom/courseDetail';

// Simple cache configuration
const CACHE_CONFIG = {
  COURSE_DETAIL_TTL: 10 * 60 * 1000, // 10 minutes
  PROGRESS_TTL: 5 * 60 * 1000,       // 5 minutes
  COURSE_LIST_TTL: 3 * 60 * 1000,    // 3 minutes
} as const;

// Cache item structure
interface CacheItem<T> {
  data: T;
  timestamp: number;
}

// Progress data structure
interface ProgressData {
  completedLessonIds: string[];
  progressPercentage: number;
}

/**
 * Simple cache operations
 */
class CourseCache {
  // --- Alias Mapping -------------------------------------------------------
  // Persist a mapping of external identifiers (short_id/slug) to canonical
  // course UUID so cache hits are consistent regardless of the route param.
  private getAliasKey(requestedId: string): string {
    return `course_alias_${requestedId}`;
  }

  rememberAlias(requestedId: string, canonicalUuid: string): void {
    try {
      if (!requestedId || !canonicalUuid) return;
      const key = this.getAliasKey(requestedId);
      const payload = { uuid: canonicalUuid, timestamp: Date.now() };
      localStorage.setItem(key, JSON.stringify(payload));
      log.debug('Utils', `[CourseCache] Remembered alias ${requestedId} → ${canonicalUuid}`);
    } catch (error) {
      log.warn('Utils', '[CourseCache] Failed to remember course alias:', error);
    }
  }

  resolveAlias(idOrAlias: string): string | null {
    try {
      const key = this.getAliasKey(idOrAlias);
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { uuid: string; timestamp: number };
      return parsed?.uuid || null;
    } catch (error) {
      log.warn('Utils', '[CourseCache] Failed to resolve course alias:', error);
      return null;
    }
  }

  private getCacheKey(type: string, id: string, userId?: string): string {
    return userId ? `${type}_${id}_${userId}` : `${type}_${id}`;
  }

  private get<T>(key: string, ttl: number): T | null {
    try {
      const cached = localStorage.getItem(key);
      if (cached) {
        const { data, timestamp }: CacheItem<T> = JSON.parse(cached);
        if (Date.now() - timestamp < ttl) {
          log.debug('Utils', `[CourseCache] Cache hit for key: ${key}`);
          return data;
        }
        // Clean expired cache
        localStorage.removeItem(key);
      }
    } catch (error) {
      log.warn('Utils', `[CourseCache] Failed to read cache for key ${key}:`, error);
    }
    return null;
  }

  private set<T>(key: string, data: T): void {
    try {
      const cacheItem: CacheItem<T> = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(key, JSON.stringify(cacheItem));
      log.debug('Utils', `[CourseCache] Cached data for key: ${key}`);
    } catch (error) {
      log.warn('Utils', `[CourseCache] Failed to cache data for key ${key}:`, error);
    }
  }

  private remove(key: string): void {
    try {
      localStorage.removeItem(key);
      log.debug('Utils', `[CourseCache] Invalidated cache for key: ${key}`);
    } catch (error) {
      log.warn('Utils', `[CourseCache] Failed to invalidate cache for key ${key}:`, error);
    }
  }

  // Course detail caching
  getCourseDetail(courseId: string): CourseDetailData | null {
    // Try direct key first
    const directKey = this.getCacheKey('course_detail', courseId);
    const direct = this.get<CourseDetailData>(directKey, CACHE_CONFIG.COURSE_DETAIL_TTL);
    if (direct) return direct;

    // Try alias (short_id/slug → uuid)
    const alias = this.resolveAlias(courseId);
    if (alias) {
      const aliasKey = this.getCacheKey('course_detail', alias);
      const viaAlias = this.get<CourseDetailData>(aliasKey, CACHE_CONFIG.COURSE_DETAIL_TTL);
      if (viaAlias) return viaAlias;
    }

    return null;
  }

  setCourseDetail(courseId: string, courseData: CourseDetailData): void {
    // Always write under the requested identifier
    const keyRequested = this.getCacheKey('course_detail', courseId);
    this.set(keyRequested, courseData);

    // Also write under canonical UUID to unify cache hits
    if (courseData?.id && courseData.id !== courseId) {
      const keyCanonical = this.getCacheKey('course_detail', courseData.id);
      this.set(keyCanonical, courseData);
      // Remember alias for future lookups
      this.rememberAlias(courseId, courseData.id);
    }
  }

  // Progress caching
  getCourseProgress(courseId: string, userId: string): ProgressData | null {
    const key = this.getCacheKey('course_progress', courseId, userId);
    return this.get<ProgressData>(key, CACHE_CONFIG.PROGRESS_TTL);
  }

  setCourseProgress(courseId: string, userId: string, progressData: ProgressData): void {
    const key = this.getCacheKey('course_progress', courseId, userId);
    this.set(key, progressData);
  }

  // Course list caching
  getCourseList(spaceId: string): any[] | null {
    const key = this.getCacheKey('courses_cache', spaceId);
    return this.get<any[]>(key, CACHE_CONFIG.COURSE_LIST_TTL);
  }

  setCourseList(spaceId: string, courses: any[]): void {
    const key = this.getCacheKey('courses_cache', spaceId);
    this.set(key, courses);
  }

  // Cache invalidation
  invalidateCourse(courseId: string, userId?: string): void {
    const cacheKey = this.getCacheKey('course_detail', courseId);
    const wasRemoved = this.remove(cacheKey);
    log.debug('Utils', `[CourseCache] Invalidated course cache for ${courseId}: ${wasRemoved ? 'removed' : 'not found'}`);
    
    if (userId) {
      const progressKey = this.getCacheKey('course_progress', courseId, userId);
      const progressRemoved = this.remove(progressKey);
      log.debug('Utils', `[CourseCache] Invalidated progress cache for ${courseId}: ${progressRemoved ? 'removed' : 'not found'}`);
    }
  }

  invalidateAllCourseCaches(courseId: string): void {
    try {
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
  }

  // Cache cleanup
  cleanup(): void {
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
              const ttl = key.startsWith('course_detail_') ? CACHE_CONFIG.COURSE_DETAIL_TTL :
                         key.startsWith('course_progress_') ? CACHE_CONFIG.PROGRESS_TTL :
                         CACHE_CONFIG.COURSE_LIST_TTL;
              
              if (now - timestamp > ttl) {
                keysToRemove.push(key);
              }
            }
          } catch (parseError) {
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
  }
}

// Create singleton instance
export const courseCache = new CourseCache();

// Auto-cleanup every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    courseCache.cleanup();
  }, 5 * 60 * 1000);
  
  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    courseCache.cleanup();
  });
}

// Backward compatibility exports for existing code
export const getCachedCourseDetail = <T>(courseId: string): T | null => {
  return courseCache.getCourseDetail(courseId) as T | null;
};

export const setCachedCourseDetail = <T>(courseId: string, courseData: T): void => {
  courseCache.setCourseDetail(courseId, courseData as CourseDetailData);
};

export const getCachedCourseProgress = (courseId: string, userId: string) => {
  return courseCache.getCourseProgress(courseId, userId);
};

export const setCachedCourseProgress = (courseId: string, userId: string, progressData: ProgressData) => {
  courseCache.setCourseProgress(courseId, userId, progressData);
};

export const invalidateCourseCache = (courseId: string, userId?: string) => {
  courseCache.invalidateCourse(courseId, userId);
};

export const invalidateAllCourseCaches = (courseId: string) => {
  courseCache.invalidateAllCourseCaches(courseId);
};

export const cleanupExpiredCaches = () => {
  courseCache.cleanup();
};

// Legacy exports to maintain compatibility
export const COURSE_CACHE_CONFIG = CACHE_CONFIG;
export const getCourseDetailCacheKey = (courseId: string) => `course_detail_${courseId}`;
export const getCourseProgressCacheKey = (courseId: string, userId: string) => `course_progress_${courseId}_${userId}`;
export const getCourseListCacheKey = (spaceId: string) => `courses_cache_${spaceId}`;