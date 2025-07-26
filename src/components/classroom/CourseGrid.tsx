import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CourseCard } from './CourseCard';
import { CreateCourseCard } from './CreateCourseCard';
import { CourseCardSkeleton } from './CourseCardSkeleton';
import { EmptyState } from './EmptyState';
import type { CourseDisplayData } from '@/hooks/useClassroomCache';

interface CourseGridProps {
  // Data
  courses: CourseDisplayData[];
  searchTerm: string;
  
  // State
  isLoading: boolean;
  authLoading: boolean;
  hasSpaceOwnerInfo: boolean;
  
  // User context
  hasValidAuth: boolean;
  isOwner: boolean;
  isAdmin?: boolean;
  user: any;
  
  // Handlers
  onCreateCourse: () => void;
  onViewCourse: (course: CourseDisplayData) => void;
  onEditCourse: (course: CourseDisplayData) => void;
  onDeleteCourse?: (course: CourseDisplayData) => void;
  onEnroll: (course: CourseDisplayData) => void;
  onUnenroll: (courseId: string) => void;
  onClearSearch?: () => void;
  
  // UI State
  isProcessingEnrollment: string | null;
  primaryColor: string;
}

export const CourseGrid = function CourseGrid({
  courses,
  searchTerm,
  isLoading,
  authLoading,
  hasSpaceOwnerInfo,
  hasValidAuth,
  isOwner,
  isAdmin = false,
  user,
  onCreateCourse,
  onViewCourse,
  onEditCourse,
  onDeleteCourse,
  onEnroll,
  onUnenroll,
  onClearSearch,
  isProcessingEnrollment,
  primaryColor,
}) {
  // Debug logging (only on significant changes)
  if (process.env.NODE_ENV === 'development' && courses?.length > 0) {
    console.log('🎓 [CourseGrid] Courses loaded:', courses.length);
  }
  // Component rendered
  // Memoize search filtering for better performance
  const searchedCourses = useMemo(() => {
    // Add null/undefined check for courses
    if (!courses || !Array.isArray(courses)) {
      return [];
    }
    
    if (!searchTerm) {
      return courses;
    }
    
    const lowerSearchTerm = searchTerm.toLowerCase();
    const filtered = courses.filter(course => 
      course.title.toLowerCase().includes(lowerSearchTerm) ||
      (course.description && course.description.toLowerCase().includes(lowerSearchTerm))
    );
    
    return filtered;
  }, [courses, searchTerm]);

  // Memoize loading states
  const isLoadingState = useMemo(() => {
    return isLoading || authLoading;
  }, [isLoading, authLoading]);

  // Memoize the show create card condition - only owners and admins can create courses
  const shouldShowCreateCard = useMemo(() => {
    return hasValidAuth && (isOwner || isAdmin);
  }, [hasValidAuth, isOwner, isAdmin]);

  // Memoize the show empty state condition
  const shouldShowEmptyState = useMemo(() => {
    return searchedCourses.length === 0 && !shouldShowCreateCard;
  }, [searchedCourses.length, shouldShowCreateCard]);

  // Show loading state
  if (isLoadingState) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, index) => (
          <CourseCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Create Course Card - visible for space owner */}
      {shouldShowCreateCard && (
        <CreateCourseCard
          onCreateCourse={onCreateCourse}
          hasExistingCourses={searchedCourses.length > 0}
        />
      )}

      {/* Course Cards */}
      {searchedCourses.map((course) => (
        <CourseCard
          key={course.id}
          course={course}
          isOwner={isOwner}
          user={user}
          onViewCourse={onViewCourse}
          onEditCourse={onEditCourse}
          onDeleteCourse={onDeleteCourse}
          onEnroll={onEnroll}
          onUnenroll={onUnenroll}
          isProcessingEnrollment={isProcessingEnrollment === course.id}
          primaryColor={primaryColor}
        />
      ))}
      
      {/* Empty State */}
      {shouldShowEmptyState && (
        <EmptyState
          searchTerm={searchTerm}
          onClearSearch={onClearSearch || (() => {})}
        />
      )}
    </div>
  );
}; 