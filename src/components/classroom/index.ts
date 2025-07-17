// Course Grid Components
export { CourseCard } from './CourseCard';
export { CreateCourseCard } from './CreateCourseCard';
export { CourseGrid } from './CourseGrid';

// Course Detail Components
export { ModuleCard } from './ModuleCard';
export { CourseContent } from './CourseContent';

// Layout Components
export { ClassroomHeader } from './ClassroomHeader';

// Main Components
export { ClassroomTabRefactored } from './ClassroomTabRefactored';
export { ClassroomDialogManager } from './ClassroomDialogManager';

// Dialog Components
export * from './dialogs';

// Types (re-export from types/classroom for convenience)
export type {
  CourseDisplayData,
  CourseModuleWithLessons,
  CourseLessonData,
  CourseModuleData,
  CourseEnrollmentData,
  CreateCourseFormData,
  ClassroomPermissions,
  ClassroomState
} from '@/types/classroom'; 