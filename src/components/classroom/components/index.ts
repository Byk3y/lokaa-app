/**
 * Exported components for the classroom/components module
 * Phase 4.2: Components extracted from LessonContent.tsx
 * Phase 6.1: Components extracted from CourseDetailView.tsx
 */

export { default as EmptyLessonState } from './EmptyLessonState';
export { default as LessonEditor } from './LessonEditor';
export { default as LessonViewer } from './LessonViewer';
export { default as VideoRenderer } from './VideoRenderer';

// Phase 6.1: CourseDetailView extractions
export { MobileStateManager } from './MobileStateManager';
export { CourseDialogManager } from './CourseDialogManager';
export { CourseContentDisplay } from './CourseContentDisplay';
export { CourseErrorHandler } from './CourseErrorHandler';

export type { EmptyLessonStateProps } from './EmptyLessonState';
export type { LessonEditorProps } from './LessonEditor';
export type { LessonViewerProps } from './LessonViewer';
export type { VideoRendererProps } from './VideoRenderer';