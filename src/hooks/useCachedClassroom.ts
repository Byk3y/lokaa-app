import { useEffect } from 'react';
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
  } = useClassroomCache();

  // Auto-fetch when dependencies change
  useEffect(() => {
    if (!spaceId || !userId) return;

    const cachedCourses = getCourses(spaceId);
    const loading = isLoading(spaceId);
    
    if (cachedCourses === null && !loading) {
      fetchCourses(spaceId, userId, ownerId);
    }
  }, [spaceId, userId, ownerId, getCourses, isLoading, fetchCourses]);

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

  return {
    courses,
    loading,
    error,
    refetch,
    updateCourse,
    removeCourse,
    addCourse,
    handleEnrollment,
  };
} 