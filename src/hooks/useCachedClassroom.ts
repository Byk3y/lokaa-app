import { useEffect, useCallback } from 'react';
import { log } from '@/utils/logger';
import useClassroomCache, { type CourseDisplayData } from './useClassroomCache';

interface UseCachedClassroomReturn {
  courses: CourseDisplayData[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;

  // Course management actions with optimistic updates
  updateCourse: (courseId: string, updates: Partial<CourseDisplayData>) => void;
  removeCourse: (courseId: string) => void;
  addCourse: (course: CourseDisplayData) => void;

  // Enrollment actions with optimistic updates
  handleEnrollment: (courseId: string, enrolled: boolean) => void;

  // Progress management
  updateCourseProgress: (courseId: string, progress: number) => void;
}

export function useCachedClassroom(spaceId?: string, userId?: string, ownerId?: string): UseCachedClassroomReturn {
  // ✅ REACTIVE SELECTOR: Subscribe to cache changes for this specific space
  // This is the core fix for the "double refresh" issue.
  const cacheEntry = useClassroomCache(
    state => spaceId ? state.spaceCache.get(spaceId) : undefined
  );

  const {
    fetchCourses,
    updateCourseInCache,
    removeCourseFromCache,
    addCourseToCache,
    updateCourseProgress: updateCourseProgressInCache,
  } = useClassroomCache();

  const courses = cacheEntry?.courses || [];
  const loading = cacheEntry?.loading || false;
  const error = cacheEntry?.error || null;

  // Auto-fetch when dependencies change
  useEffect(() => {
    if (!spaceId) {
      if (process.env.NODE_ENV === 'development' && !loading && courses.length === 0) {
        log.debug('SpaceManagement', `⏳ [useCachedClassroom] Skipping fetch - no spaceId provided (userId: ${userId || 'guest'})`);
      }
      return;
    }

    // SWR Strategy: Fetch if cache is null or we want to revalidate
    // Fix: Only trigger auto-fetch if we haven't fetched recently (within 10s) 
    // to prevent infinite loops on empty spaces.
    const lastFetched = cacheEntry?.lastFetched || 0;
    const isStale = Date.now() - lastFetched > 10000; // 10s grace period for auto-fetch

    if (!loading && (courses.length === 0 || isStale)) {
      if (process.env.NODE_ENV === 'development') {
        log.debug('SpaceManagement', `🔄 [useCachedClassroom] Triggering fetch for space ${spaceId} (userId: ${userId || 'guest'}, count: ${courses.length})`);
      }
      fetchCourses(spaceId, userId || '', ownerId);
    }
  }, [spaceId, userId, ownerId, fetchCourses, loading, courses.length, cacheEntry?.lastFetched]);

  const refetch = useCallback(async () => {
    if (!spaceId || !userId) return;
    await fetchCourses(spaceId, userId, ownerId);
  }, [spaceId, userId, ownerId, fetchCourses]);

  const updateCourse = (courseId: string, updates: Partial<CourseDisplayData>) => {
    if (!spaceId) return;
    updateCourseInCache(spaceId, courseId, updates);
  };

  const removeCourse = (courseId: string) => {
    if (!spaceId) return;
    removeCourseFromCache(spaceId, courseId);
  };

  const addCourse = (course: CourseDisplayData) => {
    if (!spaceId) return;
    addCourseToCache(spaceId, course);
  };

  const handleEnrollment = (courseId: string, enrolled: boolean) => {
    if (!spaceId) return;

    // Optimistic update
    const course = courses.find(c => c.id === courseId);
    if (course) {
      const studentCount = enrolled
        ? (course.students || 0) + 1
        : Math.max((course.students || 0) - 1, 0);

      updateCourseInCache(spaceId, courseId, {
        enrolled,
        students: studentCount,
        progress: enrolled ? 0 : undefined,
      });
    }
  };

  const updateCourseProgress = (courseId: string, progress: number) => {
    if (!spaceId) return;
    updateCourseProgressInCache(spaceId, courseId, progress);
  };

  return {
    courses,
    loading,
    error,
    refetch,
    updateCourse,
    removeCourse,
    addCourse,
    handleEnrollment,
    updateCourseProgress,
  };
} 