// Course Management Dialogs
export { default as CreateCourseDialog } from './CreateCourseDialog';
export { default as EditCourseDialog } from './EditCourseDialog';

// Module Management Dialogs
export { default as AddModuleDialog } from './AddModuleDialog';
export { default as EditModuleDialog } from './EditModuleDialog';
export { default as DeleteModuleConfirmDialog } from './DeleteModuleConfirmDialog';

// Lesson Management Dialogs
export { default as AddLessonDialog } from './AddLessonDialog';
export { default as EditLessonDialog } from './EditLessonDialog';
export { default as LessonContentDialog } from './LessonContentDialog';

// Export types
export type {
  CourseDisplayData,
  CourseModuleWithLessons,
  CourseLessonData,
  ClassroomTabProps
} from '@/types/classroom'; 