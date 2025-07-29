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
export { useCourseProgress } from './useCourseProgress';
export { useCourseFetching } from './useCourseFetching';

// Mobile navigation hooks (replaces MobileNavigationManager component)
export { useMobileGestures } from './useMobileGestures';
export { useMobileKeyboard } from './useMobileKeyboard';
export { useMobileNavigation } from './useMobileNavigation';

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