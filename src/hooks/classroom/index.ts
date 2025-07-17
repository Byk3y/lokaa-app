// Authentication and permissions
export { 
  useClassroomAuth, 
  useClassroomPermissions, 
  useClassroomActions 
} from './useClassroomAuth';

// Course management
export { useCourseManagement } from './useCourseManagement';

// Search and filtering
export { 
  useClassroomSearch,
  useCoursesForOwner,
  useEnrolledCourses,
  usePublishedCourses,
  useCoursesWithSearch
} from './useClassroomSearch';

// Re-export existing hooks for convenience
export { useCachedClassroom } from '@/hooks/useCachedClassroom';
export { default as useClassroomCache } from '@/hooks/useClassroomCache'; 