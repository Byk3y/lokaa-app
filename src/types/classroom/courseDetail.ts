/**
 * CourseDetailView Shared Type Definitions
 * 
 * This file contains type definitions specifically for the CourseDetailView component
 * and related classroom components. These types are extracted from local interface
 * definitions to reduce code duplication and improve maintainability.
 * 
 * Note: These types are different from the general classroom types in ../classroom.ts
 * as they represent the actual data structure used by the current CourseDetailView implementation.
 */

/**
 * Educational content structure for lessons
 */
export interface EducationalContent {
  id: string;
  title: string;
  content_type: string;
  text_content: string | null;
  media_url: string | null;
  embed_data: any;
  estimated_duration: number | null;
  difficulty_level: string | null;
}

/**
 * Post content structure for lessons
 */
export interface PostContent {
  id: string;
  title: string;
  content: string;
}

/**
 * Course lesson structure used by CourseDetailView and related components
 */
export interface CourseLesson {
  id: string;
  title: string;
  content_type: string;
  content_url: string | null;
  content_text: string | null;
  lesson_order: number;
  module_id?: string;
  content_id?: string | null;
  is_published: boolean;
  page_type?: string;
  estimated_duration?: number | null;
  difficulty_level?: string | null;
  created_at?: string;
  updated_at?: string;
  completed?: boolean; // Track completion status
  educational_content?: EducationalContent | null;
  posts?: PostContent | null;
}

/**
 * Course module structure used by CourseDetailView and related components
 */
export interface CourseModule {
  id: string;
  title: string;
  description: string | null;
  module_order: number;
  module_type: 'folder' | 'module' | string;
  course_id: string;
  space_id: string;
  lessons: CourseLesson[];
}

/**
 * Complete course detail data structure used by CourseDetailView
 */
export interface CourseDetailData {
  id: string;
  title: string;
  description: string | null;
  creator_id: string;
  is_published: boolean;
  estimated_duration: number | null;
  difficulty_level: string | null;
  course_order: number;
  short_id: string | null;
  slug: string | null;
  space_id: string;
  created_at: string;
  updated_at: string;
  modules: CourseModule[];
  progress?: number;
}

/**
 * Props interface for CourseDetailView component
 */
export interface CourseDetailViewProps {
  courseId: string;
  onBack: () => void;
  moduleId?: string; // Optional module ID for direct module navigation
  lessonId?: string; // Optional lesson ID for direct lesson navigation (Skool-style)
}

/**
 * Props interface for CourseSidebar component
 */
export interface CourseSidebarProps {
  course: CourseDetailData;
  selectedLesson: CourseLesson | null;
  onLessonSelect: (lesson: CourseLesson) => void;
  isOwner?: boolean;
  ownershipLoading?: boolean;
  isCreatingPage?: boolean;
  onAddLesson?: (moduleId?: string) => void;
  onEditLesson?: (lesson: CourseLesson) => void;
  onAddModule?: () => void;
  onEditCourse?: () => void;
  onDeleteCourse?: () => void;
  onAddFolder?: () => void;
  spaceId?: string;
  onDeletePage?: (pageId: string, title: string) => void;
  onRevertToDraft?: (pageId: string, title: string, isPublished: boolean) => void;
  onDuplicatePage?: (pageId: string) => void;
  onChangeFolder?: (pageId: string, title: string, moduleId: string | null) => void;
}

/**
 * Props interface for MobileCourseOverview component
 */
export interface MobileCourseOverviewProps {
  course: CourseDetailData;
  space?: any | null; // Using any for now to avoid circular dependencies
  onBack: () => void;
  onLessonSelect: (lesson: CourseLesson) => void;
  isOwner?: boolean;
  onEditCourse?: () => void;
  onAddFolder?: () => void;
  onAddPage?: () => void;
  onDeleteCourse?: () => void;
  onEditLesson?: (lessonId: string, title: string) => void;
  onDeleteLesson?: (lessonId: string, title: string) => void;
  onRevertToDraft?: (lessonId: string, title: string, isPublished: boolean) => void;
  onChangeFolder?: (lessonId: string, title: string, currentFolderId?: string) => void;
}

/**
 * Props interface for MobileLessonView component
 */
export interface MobileLessonViewProps {
  lesson: CourseLesson;
  course: CourseDetailData;
  space?: any | null;
  onBackToMenu: () => void;
  onNextLesson: () => void;
  onMarkAsDone: () => void;
  isOwner: boolean;
  hasNextLesson: boolean;
  onEditLesson: (updatedData: Partial<CourseLesson>) => Promise<void>;
}

/**
 * Props interface for LessonContent component
 */
export interface LessonContentProps {
  lesson: CourseLesson | null;
  courseName: string;
  isOwner: boolean;
  completed: boolean;
  onUpdateLesson: (lessonId: string, updates: { title?: string; content_text?: string; is_published?: boolean }) => Promise<void>;
  onCreateNewPage: () => void;
  onMarkAsDone: () => void;
}

/**
 * Props interface for ModuleCard component
 */
export interface ModuleCardProps {
  module: CourseModule;
  isOwner: boolean;
  onAddLesson: (moduleId: string) => void;
  onEditModule: (module: CourseModule) => void;
  onDeleteModule: (module: CourseModule) => void;
  onEditLesson: (lesson: CourseLesson) => void;
  onDeleteLesson: (lesson: CourseLesson) => void;
  onRevertToDraft: (lesson: CourseLesson) => void;
  onChangeFolder: (lesson: CourseLesson) => void;
  onDuplicateLesson: (lesson: CourseLesson) => void;
}

/**
 * Props interface for CourseContent component
 */
export interface CourseContentProps {
  course: any; // Using any for now to avoid circular dependencies
  modules: CourseModule[];
  isLoading: boolean;
  isOwner: boolean;
  enrollmentDate: string | null;
  primaryColor: string;
  onBackToCourses: () => void;
  onAddModule: () => void;
  onEditModule: (module: CourseModule) => void;
  onDeleteModule: (module: CourseModule) => void;
  onAddLesson: (moduleId: string) => void;
  onEditLesson: (lesson: CourseLesson) => void;
  onViewLesson: (lesson: CourseLesson) => void;
} 