import { useState, useMemo } from 'react';
import type { 
  UseClassroomSearchReturn, 
  CourseDisplayData 
} from '@/types/classroom';

export function useClassroomSearch(
  courses: CourseDisplayData[],
  userId?: string
): UseClassroomSearchReturn {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all-courses' | 'my-courses'>('all-courses');

  const filteredCourses = useMemo(() => {
    let filtered = courses;

    // Filter by tab
    if (activeTab === 'my-courses') {
      filtered = filtered.filter(course => course.enrolled === true);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(course => 
        course.title.toLowerCase().includes(searchLower) ||
        course.description?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [courses, activeTab, searchTerm]);

  return {
    searchTerm,
    setSearchTerm,
    filteredCourses,
    activeTab,
    setActiveTab,
  };
}

// Additional utility hooks for specific search scenarios
export function useCoursesForOwner(courses: CourseDisplayData[], userId?: string) {
  return useMemo(() => {
    if (!userId) return [];
    return courses.filter(course => course.creator_id === userId);
  }, [courses, userId]);
}

export function useEnrolledCourses(courses: CourseDisplayData[]) {
  return useMemo(() => {
    return courses.filter(course => course.enrolled === true);
  }, [courses]);
}

export function usePublishedCourses(courses: CourseDisplayData[]) {
  return useMemo(() => {
    return courses.filter(course => course.is_published === true);
  }, [courses]);
}

export function useCoursesWithSearch(courses: CourseDisplayData[], searchTerm: string) {
  return useMemo(() => {
    if (!searchTerm.trim()) return courses;
    
    const searchLower = searchTerm.toLowerCase().trim();
    return courses.filter(course => 
      course.title.toLowerCase().includes(searchLower) ||
      course.description?.toLowerCase().includes(searchLower)
    );
  }, [courses, searchTerm]);
} 