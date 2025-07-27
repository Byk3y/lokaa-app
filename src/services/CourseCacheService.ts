import { log } from '@/utils/logger';
import { getSupabaseClient } from '@/integrations/supabase/client';
import type { CourseDetailData } from '@/types/classroom/courseDetail';

export interface CourseCacheServiceOptions {
  enableMobileOptimizations?: boolean;
  enableOfflineSupport?: boolean;
  retryOnError?: boolean;
  cacheStrategy?: 'aggressive' | 'normal' | 'minimal';
  enablePersistentCache?: boolean;
  enableMemoryCache?: boolean;
  cacheExpirationMinutes?: number;
  maxCacheSize?: number;
}

export interface CourseDisplayData {
  id: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  slug?: string | null;
  short_id?: string | null;
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

export interface CourseCache {
  courses: CourseDisplayData[];
  lastFetched: number;
  loading: boolean;
  error: string | null;
}

export interface CourseProgressCache {
  completedLessonIds: string[];
  progressPercentage: number;
  lastUpdated: number;
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  oldestEntry: number;
  newestEntry: number;
  hitRate: number;
  missRate: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
}

/**
 * CourseCacheService - Handles all cache-related business operations
 * 
 * Features:
 * - Memory and persistent cache management
 * - Cache invalidation and expiration
 * - Cache size management and optimization
 * - Cache debugging and analytics
 * - Mobile-optimized caching strategies
 * - Offline cache support
 * - Progress tracking cache
 */
export class CourseCacheService {
  private options: CourseCacheServiceOptions;
  private memoryCache: Map<string, CacheEntry<any>>;
  private cacheStats: {
    hits: number;
    misses: number;
    totalRequests: number;
  };

  constructor(options: CourseCacheServiceOptions = {}) {
    this.options = {
      enableMobileOptimizations: true,
      enableOfflineSupport: true,
      retryOnError: true,
      cacheStrategy: 'normal',
      enablePersistentCache: true,
      enableMemoryCache: true,
      cacheExpirationMinutes: 3,
      maxCacheSize: 100,
      ...options
    };

    this.memoryCache = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      totalRequests: 0
    };
  }

  /**
   * Get courses from cache for a specific space
   */
  getCourses(spaceId: string): CourseDisplayData[] | null {
    try {
      const cacheKey = `courses_${spaceId}`;
      const cached = this.getFromCache<CourseCache>(cacheKey);
      
      if (cached && !this.isExpired(cached)) {
        this.recordCacheHit();
        log.debug('Service', `📦 [CourseCacheService] Cache hit for space: ${spaceId}`);
        return cached.courses;
      }

      // Try persistent cache as fallback
      if (this.options.enablePersistentCache) {
        const persistentData = this.loadFromPersistentCache(spaceId);
        if (persistentData) {
          this.recordCacheHit();
          log.debug('Service', `📦 [CourseCacheService] Persistent cache hit for space: ${spaceId}`);
          return persistentData;
        }
      }

      this.recordCacheMiss();
      log.debug('Service', `📦 [CourseCacheService] Cache miss for space: ${spaceId}`);
      return null;

    } catch (error) {
      log.error('Service', `📦 [CourseCacheService] Error getting courses from cache: ${error}`);
      return null;
    }
  }

  /**
   * Set courses in cache for a specific space
   */
  setCourses(spaceId: string, courses: CourseDisplayData[]): void {
    try {
      const cacheKey = `courses_${spaceId}`;
      const cacheData: CourseCache = {
        courses,
        lastFetched: Date.now(),
        loading: false,
        error: null
      };

      this.setInCache(cacheKey, cacheData);

      // Also save to persistent cache
      if (this.options.enablePersistentCache) {
        this.saveToPersistentCache(spaceId, courses);
      }

      log.debug('Service', `📦 [CourseCacheService] Cached ${courses.length} courses for space: ${spaceId}`);

    } catch (error) {
      log.error('Service', `📦 [CourseCacheService] Error setting courses in cache: ${error}`);
    }
  }

  /**
   * Get course details from cache
   */
  getCourseDetails(courseId: string): CourseDetailData | null {
    try {
      const cacheKey = `course_details_${courseId}`;
      const cached = this.getFromCache<CourseDetailData>(cacheKey);
      
      if (cached && !this.isExpired(cached)) {
        this.recordCacheHit();
        log.debug('Service', `📦 [CourseCacheService] Cache hit for course details: ${courseId}`);
        return cached;
      }

      this.recordCacheMiss();
      log.debug('Service', `📦 [CourseCacheService] Cache miss for course details: ${courseId}`);
      return null;

    } catch (error) {
      log.error('Service', `📦 [CourseCacheService] Error getting course details from cache: ${error}`);
      return null;
    }
  }

  /**
   * Set course details in cache
   */
  setCourseDetails(courseId: string, courseData: CourseDetailData): void {
    try {
      const cacheKey = `course_details_${courseId}`;
      this.setInCache(cacheKey, courseData);

      log.debug('Service', `📦 [CourseCacheService] Cached course details for: ${courseId}`);

    } catch (error) {
      log.error('Service', `📦 [CourseCacheService] Error setting course details in cache: ${error}`);
    }
  }

  /**
   * Get course progress from cache
   */
  getCourseProgress(courseId: string, userId: string): CourseProgressCache | null {
    try {
      const cacheKey = `progress_${courseId}_${userId}`;
      const cached = this.getFromCache<CourseProgressCache>(cacheKey);
      
      if (cached && !this.isExpired(cached)) {
        this.recordCacheHit();
        log.debug('Service', `📦 [CourseCacheService] Cache hit for progress: ${courseId}`);
        return cached;
      }

      this.recordCacheMiss();
      log.debug('Service', `📦 [CourseCacheService] Cache miss for progress: ${courseId}`);
      return null;

    } catch (error) {
      log.error('Service', `📦 [CourseCacheService] Error getting progress from cache: ${error}`);
      return null;
    }
  }

  /**
   * Set course progress in cache
   */
  setCourseProgress(courseId: string, userId: string, progress: CourseProgressCache): void {
    try {
      const cacheKey = `progress_${courseId}_${userId}`;
      this.setInCache(cacheKey, progress);

      log.debug('Service', `📦 [CourseCacheService] Cached progress for course: ${courseId}`);

    } catch (error) {
      log.error('Service', `📦 [CourseCacheService] Error setting progress in cache: ${error}`);
    }
  }

  /**
   * Update course progress in cache
   */
  updateCourseProgress(spaceId: string, courseId: string, progress: number): void {
    try {
      // Update in memory cache
      const cacheKey = `courses_${spaceId}`;
      const cached = this.getFromCache<CourseCache>(cacheKey);
      
      if (cached) {
        const updatedCourses = cached.courses.map(course => 
          course.id === courseId 
            ? { ...course, progress }
            : course
        );
        
        const updatedCache: CourseCache = {
          ...cached,
          courses: updatedCourses
        };
        
        this.setInCache(cacheKey, updatedCache);
        
        // Update persistent cache
        if (this.options.enablePersistentCache) {
          this.saveToPersistentCache(spaceId, updatedCourses);
        }
        
        log.debug('Service', `📦 [CourseCacheService] Updated progress for course ${courseId}: ${progress}%`);
      }

    } catch (error) {
      log.error('Service', `📦 [CourseCacheService] Error updating course progress: ${error}`);
    }
  }

  /**
   * Update course in cache
   */
  updateCourse(spaceId: string, courseId: string, updates: Partial<CourseDisplayData>): void {
    try {
      const cacheKey = `courses_${spaceId}`;
      const cached = this.getFromCache<CourseCache>(cacheKey);
      
      if (cached) {
        const updatedCourses = cached.courses.map(course =>
          course.id === courseId ? { ...course, ...updates } : course
        );
        
        const updatedCache: CourseCache = {
          ...cached,
          courses: updatedCourses
        };
        
        this.setInCache(cacheKey, updatedCache);
        
        // Update persistent cache
        if (this.options.enablePersistentCache) {
          this.saveToPersistentCache(spaceId, updatedCourses);
        }
        
        log.debug('Service', `📦 [CourseCacheService] Updated course in cache: ${courseId}`);
      }

    } catch (error) {
      log.error('Service', `📦 [CourseCacheService] Error updating course in cache: ${error}`);
    }
  }

  /**
   * Add course to cache
   */
  addCourse(spaceId: string, course: CourseDisplayData): void {
    try {
      const cacheKey = `courses_${spaceId}`;
      const cached = this.getFromCache<CourseCache>(cacheKey);
      
      if (cached) {
        const newCourses = [course, ...cached.courses];
        
        const updatedCache: CourseCache = {
          ...cached,
          courses: newCourses
        };
        
        this.setInCache(cacheKey, updatedCache);
        
        // Update persistent cache
        if (this.options.enablePersistentCache) {
          this.saveToPersistentCache(spaceId, newCourses);
        }
        
        log.debug('Service', `📦 [CourseCacheService] Added course to cache: ${course.id}`);
      }

    } catch (error) {
      log.error('Service', `📦 [CourseCacheService] Error adding course to cache: ${error}`);
    }
  }

  /**
   * Remove course from cache
   */
  removeCourse(spaceId: string, courseId: string): void {
    try {
      const cacheKey = `courses_${spaceId}`;
      const cached = this.getFromCache<CourseCache>(cacheKey);
      
      if (cached) {
        const filteredCourses = cached.courses.filter(course => course.id !== courseId);
        
        const updatedCache: CourseCache = {
          ...cached,
          courses: filteredCourses
        };
        
        this.setInCache(cacheKey, updatedCache);
        
        // Update persistent cache
        if (this.options.enablePersistentCache) {
          this.saveToPersistentCache(spaceId, filteredCourses);
        }
        
        log.debug('Service', `📦 [CourseCacheService] Removed course from cache: ${courseId}`);
      }

    } catch (error) {
      log.error('Service', `📦 [CourseCacheService] Error removing course from cache: ${error}`);
    }
  }

  /**
   * Invalidate cache for specific space or all cache
   */
  invalidateCache(spaceId?: string): void {
    try {
      if (spaceId) {
        // Invalidate specific space cache
        const cacheKey = `courses_${spaceId}`;
        this.memoryCache.delete(cacheKey);
        
        // Clear persistent cache
        if (this.options.enablePersistentCache) {
          this.clearPersistentCache(spaceId);
        }
        
        log.debug('Service', `📦 [CourseCacheService] Invalidated cache for space: ${spaceId}`);
      } else {
        // Clear all cache
        this.memoryCache.clear();
        
        // Clear all persistent cache
        if (this.options.enablePersistentCache) {
          this.clearAllPersistentCache();
        }
        
        log.debug('Service', `📦 [CourseCacheService] Invalidated all cache`);
      }

    } catch (error) {
      log.error('Service', `📦 [CourseCacheService] Error invalidating cache: ${error}`);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    const totalEntries = this.memoryCache.size;
    const totalSize = this.calculateCacheSize();
    const oldestEntry = Math.min(...Array.from(this.memoryCache.values()).map(entry => entry.timestamp));
    const newestEntry = Math.max(...Array.from(this.memoryCache.values()).map(entry => entry.timestamp));
    
    const hitRate = this.cacheStats.totalRequests > 0 
      ? this.cacheStats.hits / this.cacheStats.totalRequests 
      : 0;
    const missRate = 1 - hitRate;

    return {
      totalEntries,
      totalSize,
      oldestEntry: oldestEntry === Infinity ? 0 : oldestEntry,
      newestEntry: newestEntry === -Infinity ? 0 : newestEntry,
      hitRate,
      missRate
    };
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredEntries(): number {
    const now = Date.now();
    let clearedCount = 0;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (now > entry.expiresAt) {
        this.memoryCache.delete(key);
        clearedCount++;
      }
    }

    if (clearedCount > 0) {
      log.debug('Service', `📦 [CourseCacheService] Cleared ${clearedCount} expired cache entries`);
    }

    return clearedCount;
  }

  /**
   * Optimize cache size
   */
  optimizeCacheSize(): void {
    if (this.memoryCache.size <= this.options.maxCacheSize!) {
      return;
    }

    // Sort entries by access count and last accessed time
    const entries = Array.from(this.memoryCache.entries()).sort((a, b) => {
      const aScore = a[1].accessCount * 0.7 + (Date.now() - a[1].lastAccessed) * 0.3;
      const bScore = b[1].accessCount * 0.7 + (Date.now() - b[1].lastAccessed) * 0.3;
      return aScore - bScore;
    });

    // Remove least valuable entries
    const toRemove = entries.slice(0, this.memoryCache.size - this.options.maxCacheSize!);
    toRemove.forEach(([key]) => {
      this.memoryCache.delete(key);
    });

    log.debug('Service', `📦 [CourseCacheService] Optimized cache size, removed ${toRemove.length} entries`);
  }

  /**
   * Get cache debugging information
   */
  getDebugInfo(): any {
    const stats = this.getCacheStats();
    const entries = Array.from(this.memoryCache.entries()).map(([key, entry]) => ({
      key,
      timestamp: entry.timestamp,
      expiresAt: entry.expiresAt,
      accessCount: entry.accessCount,
      lastAccessed: entry.lastAccessed,
      dataSize: JSON.stringify(entry.data).length
    }));

    return {
      stats,
      entries,
      options: this.options,
      memoryUsage: this.calculateCacheSize()
    };
  }

  /**
   * Private methods for cache management
   */
  private getFromCache<T>(key: string): T | null {
    if (!this.options.enableMemoryCache) {
      return null;
    }

    const entry = this.memoryCache.get(key);
    if (!entry) {
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.memoryCache.set(key, entry);

    return entry.data;
  }

  private setInCache<T>(key: string, data: T): void {
    if (!this.options.enableMemoryCache) {
      return;
    }

    const expiresAt = Date.now() + (this.options.cacheExpirationMinutes! * 60 * 1000);
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt,
      accessCount: 0,
      lastAccessed: Date.now()
    };

    this.memoryCache.set(key, entry);

    // Optimize cache size if needed
    if (this.memoryCache.size > this.options.maxCacheSize!) {
      this.optimizeCacheSize();
    }
  }

  private isExpired(entry: any): boolean {
    return Date.now() > entry.expiresAt;
  }

  private recordCacheHit(): void {
    this.cacheStats.hits++;
    this.cacheStats.totalRequests++;
  }

  private recordCacheMiss(): void {
    this.cacheStats.misses++;
    this.cacheStats.totalRequests++;
  }

  private calculateCacheSize(): number {
    let totalSize = 0;
    for (const entry of this.memoryCache.values()) {
      totalSize += JSON.stringify(entry.data).length;
    }
    return totalSize;
  }

  private saveToPersistentCache(spaceId: string, courses: CourseDisplayData[]): void {
    try {
      const cacheData = {
        courses,
        timestamp: Date.now(),
        spaceId
      };
      localStorage.setItem(`classroom_cache_${spaceId}`, JSON.stringify(cacheData));
    } catch (error) {
      log.warn('Service', `📦 [CourseCacheService] Failed to save persistent cache: ${error}`);
    }
  }

  private loadFromPersistentCache(spaceId: string): CourseDisplayData[] | null {
    try {
      const cached = localStorage.getItem(`classroom_cache_${spaceId}`);
      if (!cached) return null;
      
      const data = JSON.parse(cached);
      const age = Date.now() - data.timestamp;
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      if (age > maxAge) {
        localStorage.removeItem(`classroom_cache_${spaceId}`);
        return null;
      }
      
      return data.courses || [];
    } catch (error) {
      log.warn('Service', `📦 [CourseCacheService] Failed to load persistent cache: ${error}`);
      return null;
    }
  }

  private clearPersistentCache(spaceId: string): void {
    try {
      localStorage.removeItem(`classroom_cache_${spaceId}`);
    } catch (error) {
      log.warn('Service', `📦 [CourseCacheService] Failed to clear persistent cache: ${error}`);
    }
  }

  private clearAllPersistentCache(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('classroom_cache_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      log.warn('Service', `📦 [CourseCacheService] Failed to clear all persistent cache: ${error}`);
    }
  }
}

// Export singleton instance
export const courseCacheService = new CourseCacheService(); 