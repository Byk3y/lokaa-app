import { useEffect } from 'react';
import useClassroomCache, { type CourseDisplayData } from './useClassroomCache';
import { useAuth } from '@/contexts/AuthContext';
import { log } from '@/utils/logger';

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
  const {
    getCourses,
    isLoading,
    getError,
    fetchCourses,
    updateCourseInCache,
    removeCourseFromCache,
    addCourseToCache,
    updateCourseProgress: updateCourseProgressInCache,
    forceRefreshCache,
  } = useClassroomCache();

  const { user } = useAuth();

  // Auto-fetch when dependencies change
  useEffect(() => {
    if (!spaceId || !userId) return;

    const cachedCourses = getCourses(spaceId);
    const loading = isLoading(spaceId);
    
    // ✅ OPTIMIZED: Only fetch if no cache exists and not already loading
    if (cachedCourses === null && !loading) {
      fetchCourses(spaceId, userId, ownerId);
    }
  }, [spaceId, userId, ownerId, getCourses, isLoading, fetchCourses]);

  // ✅ OPTIMIZED: Reduced frequency of ownership checks
  // Only check ownership when user ID changes, not on every render
  useEffect(() => {
    if (!spaceId || !userId || !user?.id) return;

    // Check if we have cached data that might be stale
    const cachedCourses = getCourses(spaceId);
    if (cachedCourses && cachedCourses.length > 0) {
      // Check if any draft courses are missing (indicating stale ownership data)
      const hasDraftCourses = cachedCourses.some(course => !course.is_published);
      
      // ✅ OPTIMIZED: Only force refresh if user is owner/admin and missing drafts
      // This prevents unnecessary refreshes for regular users
      if (!hasDraftCourses && (ownerId === userId || user?.role === 'admin')) {
        log.debug('Hook', '🔄 [useCachedClassroom] Force refreshing cache for fresh ownership data');
        forceRefreshCache(spaceId, userId, ownerId);
      }
    }
  }, [user?.id, spaceId, userId, ownerId, getCourses, forceRefreshCache]);

  const courses = spaceId ? getCourses(spaceId) || [] : [];
  const loading = spaceId ? isLoading(spaceId) : false;
  const error = spaceId ? getError(spaceId) : null;

  const refetch = async () => {
    if (!spaceId || !userId) return;
    await fetchCourses(spaceId, userId, ownerId);
  };

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