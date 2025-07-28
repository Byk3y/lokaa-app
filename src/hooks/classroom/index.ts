// Authentication and permissions
export { 
  useClassroomAuth, 
  useClassroomPermissions, 
  useClassroomActions 
} from './useClassroomAuth';

// Course management
export { useCourseManagement } from './useCourseManagement';
export { useCourseDetail } from './useCourseDetail';

// NEW: Refactored hooks from useCourseDetail.ts
export { useCourseCaching } from './useCourseCaching';
export { useNetworkStatus } from './useNetworkStatus';
export { useCoursePermissions } from './useCoursePermissions';
export { useCourseProgress } from './useCourseProgress';
export { useCourseFetching } from './useCourseFetching';

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