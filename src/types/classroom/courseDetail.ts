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
  isAdmin?: boolean;
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
  isAdmin?: boolean;
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
 * Enhanced props interface for the new CourseOverviewMobile component
 * Includes mobile-specific features and accessibility options
 */
export interface CourseOverviewMobileProps {
  course: CourseDetailData;
  space?: {
    id: string;
    name: string;
    subdomain: string;
    avatar_url?: string | null;
    icon_image?: string | null;
  } | null;
  onBack: () => void;
  onLessonSelect: (lesson: CourseLesson) => void;
  isOwner?: boolean;
  isAdmin?: boolean;
  onEditCourse?: () => void;
  onAddFolder?: () => void;
  onAddPage?: () => void;
  onDeleteCourse?: () => void;
  onEditLesson?: (lessonId: string, title: string) => void;
  onDeleteLesson?: (lessonId: string, title: string) => void;
  onRevertToDraft?: (lessonId: string, title: string, isPublished: boolean) => void;
  onChangeFolder?: (lessonId: string, title: string, currentFolderId?: string) => void;
  onDuplicateLesson?: (lessonId: string, title: string) => void;
  
  // Mobile-specific features
  enableHapticFeedback?: boolean;
  enableAnimations?: boolean;
  enableOfflineSupport?: boolean;
  enableAccessibility?: boolean;
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
  isAdmin?: boolean;
  hasNextLesson: boolean;
  onEditLesson: (updatedData: Partial<CourseLesson>) => Promise<void>;
}

/**
 * Enhanced props interface for the new LessonViewMobile component
 * Includes mobile-specific features, accessibility options, and performance optimizations
 */
export interface LessonViewMobileProps {
  lesson: CourseLesson;
  course: CourseDetailData;
  space?: {
    id: string;
    name: string;
    subdomain: string;
    avatar_url?: string | null;
    icon_image?: string | null;
  } | null;
  onBackToMenu: () => void;
  onNextLesson: () => void;
  onMarkAsDone: () => void;
  isOwner?: boolean;
  isAdmin?: boolean;
  hasNextLesson?: boolean;
  onEditLesson?: (updatedData: Partial<CourseLesson>) => Promise<void>;
  
  // Mobile-specific features
  enableHapticFeedback?: boolean;
  enableAnimations?: boolean;
  enableOfflineSupport?: boolean;
  enableAccessibility?: boolean;
  enableReadingMode?: boolean;
  enableVideoOptimization?: boolean;
  enableGestureSupport?: boolean;
}

/**
 * Enhanced props interface for the new MobileNavigationManager component
 * Includes mobile navigation features, gesture support, and performance optimizations
 */
export interface MobileNavigationManagerProps {
  course: CourseDetailData | null;
  selectedLesson: CourseLesson | null;
  isMobile: boolean;
  showCourseOverview: boolean;
  showLessonView: boolean;
  onBackToMenu: () => void;
  onNextLesson: () => void;
  onLessonSelect: (lesson: CourseLesson) => void;
  onBack?: () => void;
  
  // Mobile navigation features
  enableHapticFeedback?: boolean;
  enableAnimations?: boolean;
  enableGestureSupport?: boolean;
  enableKeyboardSupport?: boolean;
  enableDeepLinking?: boolean;
  enableNavigationHistory?: boolean;
  enableAccessibility?: boolean;
  enablePerformanceOptimization?: boolean;
}

/**
 * Enhanced props interface for the new MobileRouteHandler component
 * Includes comprehensive route management, validation, caching, and analytics
 */
export interface MobileRouteHandlerProps {
  course: CourseDetailData | null;
  selectedLesson: CourseLesson | null;
  isMobile: boolean;
  showCourseOverview: boolean;
  showLessonView: boolean;
  onRouteChange?: (route: string, params: Record<string, any>) => void;
  onRouteError?: (error: string, route: string) => void;
  onRouteValidation?: (isValid: boolean, route: string) => void;
  
  // Route management features
  enableRouteTransitions?: boolean;
  enableRouteCaching?: boolean;
  enableRouteValidation?: boolean;
  enableRouteAnalytics?: boolean;
  enableRouteFallbacks?: boolean;
  enableRoutePermissions?: boolean;
  enableDeepLinking?: boolean;
  enablePerformanceOptimization?: boolean;
}

export interface MobileViewManagerProps {
  course: CourseDetailData | null;
  selectedLesson: CourseLesson | null;
  isMobile: boolean;
  showCourseOverview: boolean;
  showLessonView: boolean;
  onViewChange?: (view: string, params: Record<string, any>) => void;
  onViewError?: (error: string, view: string) => void;
  onViewValidation?: (isValid: boolean, view: string) => void;
  
  // View management features
  enableViewTransitions?: boolean;
  enableViewCaching?: boolean;
  enableViewValidation?: boolean;
  enableViewAnalytics?: boolean;
  enableViewFallbacks?: boolean;
  enableViewPermissions?: boolean;
  enableAccessibility?: boolean;
  enablePerformanceOptimization?: boolean;
}

export interface MobileStateSynchronizerProps {
  course: CourseDetailData | null;
  selectedLesson: CourseLesson | null;
  isMobile: boolean;
  showCourseOverview: boolean;
  showLessonView: boolean;
  onStateChange?: (state: string, data: any) => void;
  onStateError?: (error: string, state: string) => void;
  onStateValidation?: (isValid: boolean, state: string) => void;
  onStateConflict?: (conflict: StateConflict) => void;
  onStateRecovery?: (recoveredState: any) => void;
  
  // State synchronization features
  enableStatePersistence?: boolean;
  enableStateConflicts?: boolean;
  enableStateRecovery?: boolean;
  enableStateValidation?: boolean;
  enableStateAnalytics?: boolean;
  enableStateFallbacks?: boolean;
  enableStatePermissions?: boolean;
  enableOfflineSupport?: boolean;
  enableRealTimeSync?: boolean;
  enablePerformanceOptimization?: boolean;
}

export interface StateConflict {
  id: string;
  type: 'lesson_selection' | 'view_state' | 'progress' | 'navigation' | 'data';
  localState: any;
  remoteState: any;
  timestamp: number;
  resolution: 'local' | 'remote' | 'manual' | 'pending';
}

export interface SynchronizedState {
  // Core state
  currentView: string;
  selectedLessonId: string | null;
  courseProgress: Record<string, boolean>;
  navigationHistory: string[];
  
  // UI state
  scrollPosition: Record<string, number>;
  expandedModules: string[];
  collapsedModules: string[];
  
  // User preferences
  readingMode: boolean;
  fontSize: 'small' | 'medium' | 'large';
  theme: 'light' | 'dark' | 'auto';
  
  // Performance state
  cachedData: Map<string, any>;
  lastSyncTimestamp: number;
  isOnline: boolean;
}

/**
 * Props interface for LessonContent component
 */
export interface LessonContentProps {
  lesson: CourseLesson | null;
  courseName: string;
  isOwner: boolean;
  isAdmin?: boolean;
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

// Routing types for CourseRouteManager
export interface RouteState {
  currentRoute: string;
  navigationHistory: string[];
  breadcrumbs: Array<{ label: string; path: string }>;
  lastVisitedCourse?: string;
  lastVisitedLesson?: string;
}

export interface RouteOperation {
  type: 'navigate' | 'replace' | 'back' | 'forward';
  path: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface RouteError {
  type: 'rate_limit' | 'duplicate' | 'permission' | 'validation' | 'network';
  message: string;
  timestamp: number;
  recoverable: boolean;
}

export interface CourseRouteManagerProps {
  children: React.ReactNode;
  onRouteChange?: (route: string) => void;
  onRouteError?: (error: RouteError) => void;
  enableAnalytics?: boolean;
  enableCaching?: boolean;
  enableRateLimiting?: boolean;
}

export interface CourseRouteContextType {
  routeState: RouteState;
  isNavigating: boolean;
  recoveryMode: boolean;
  routeErrors: RouteError[];
  navigateToRoute: (path: string, options?: any) => Promise<boolean>;
  navigateToCourse: (courseId: string) => Promise<boolean>;
  navigateToLesson: (courseId: string, lessonId: string) => Promise<boolean>;
  navigateToModule: (courseId: string, moduleId: string) => Promise<boolean>;
  goBack: () => void;
  goForward: () => void;
  getCurrentRoute: () => string;
  getRouteParams: () => any;
  getBreadcrumbs: () => Array<{ label: string; path: string }>;
  getNavigationHistory: () => string[];
  getCachedRoute: (path: string) => any;
  recoverFromError: (error: RouteError) => boolean;
  clearErrors: () => void;
} 