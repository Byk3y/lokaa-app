import React from 'react';
import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { CourseDisplayData } from '@/hooks/useClassroomCache';
import type {
  CourseDialogState,
  ModuleDialogState,
  LessonDialogState,
  FolderDialogState
} from '@/types/classroom';


// Core classroom state interface
interface ClassroomStoreState {
  // Core state
  courses: CourseDisplayData[];
  selectedCourse: CourseDisplayData | null;
  modules: any[];

  // Auth state
  auth: any | null;
  permissions: any | null;

  // Dialog states
  courseDialog: CourseDialogState;
  moduleDialog: ModuleDialogState;
  lessonDialog: LessonDialogState;
  folderDialog: FolderDialogState;

  // UI state
  searchTerm: string;
  activeTab: 'all-courses' | 'my-courses';
  loading: boolean;
  error: string | null;
  isRefreshing: boolean;
  lastRefreshTime: number | null;

  // Cache management
  cacheExpiry: number;
  hasValidCache: boolean;
}

// Store actions interface
interface ClassroomStoreActions {
  // Auth actions
  setAuth: (auth: any) => void;
  clearAuth: () => void;
  updatePermissions: (permissions: any) => void;

  // Course actions
  setCourses: (courses: CourseDisplayData[]) => void;
  addCourse: (course: CourseDisplayData) => void;
  updateCourse: (courseId: string, updates: Partial<CourseDisplayData>) => void;
  removeCourse: (courseId: string) => void;
  setSelectedCourse: (course: CourseDisplayData | null) => void;

  // Enrollment actions
  enrollInCourse: (courseId: string) => void;
  unenrollFromCourse: (courseId: string) => void;
  updateCourseProgress: (courseId: string, progress: number) => void;

  // Dialog actions
  openCourseDialog: (mode: 'create' | 'edit' | 'view', course?: CourseDisplayData) => void;
  closeCourseDialog: () => void;
  openModuleDialog: (mode: 'create' | 'edit' | 'delete', module?: any) => void;
  closeModuleDialog: () => void;
  openLessonDialog: (mode: 'create' | 'edit' | 'view', lesson?: any, moduleId?: string) => void;
  closeLessonDialog: () => void;
  openFolderDialog: (mode: 'create' | 'edit' | 'delete', folder?: any) => void;
  closeFolderDialog: () => void;

  // UI actions
  setSearchTerm: (term: string) => void;
  setActiveTab: (tab: 'all-courses' | 'my-courses') => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Cache actions
  refreshCourses: () => void;
  invalidateCache: () => void;
  markCacheAsValid: () => void;

  // Utility actions
  reset: () => void;
  getFilteredCourses: () => CourseDisplayData[];
  getMyCourses: () => CourseDisplayData[];
  getCourseById: (courseId: string) => CourseDisplayData | undefined;
}

type ClassroomStore = ClassroomStoreState & ClassroomStoreActions;

// Initial state
const initialState: ClassroomStoreState = {
  // Core state
  courses: [],
  selectedCourse: null,
  modules: [],
  searchTerm: '',
  activeTab: 'all-courses',
  loading: false,
  error: null,

  // Auth state
  auth: null,
  permissions: null,

  // Dialog states
  courseDialog: {
    isOpen: false,
    mode: 'create',
  },
  moduleDialog: {
    isOpen: false,
    mode: 'create',
  },
  lessonDialog: {
    isOpen: false,
    mode: 'create',
  },
  folderDialog: {
    isOpen: false,
    mode: 'create',
  },

  // UI state
  isRefreshing: false,
  lastRefreshTime: null,

  // Cache management
  cacheExpiry: 5 * 60 * 1000, // 5 minutes
  hasValidCache: false,
};

export const useClassroomStore = create<ClassroomStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        ...initialState,

        // Auth actions
        setAuth: (auth) => set((state) => {
          state.auth = auth;
          state.permissions = auth.permissions;
        }),

        clearAuth: () => set((state) => {
          state.auth = null;
          state.permissions = null;
        }),

        updatePermissions: (permissions) => set((state) => {
          state.permissions = permissions;
          if (state.auth) {
            state.auth.permissions = permissions;
          }
        }),

        // Course actions
        setCourses: (courses) => set((state) => {
          state.courses = courses;
          state.loading = false;
          state.error = null;
          state.lastRefreshTime = Date.now();
          state.hasValidCache = true;
        }),

        addCourse: (course) => set((state) => {
          state.courses.unshift(course);
        }),

        updateCourse: (courseId, updates) => set((state) => {
          const course = state.courses.find(c => c.id === courseId);
          if (course) {
            Object.assign(course, updates);
          }
          if (state.selectedCourse?.id === courseId) {
            Object.assign(state.selectedCourse, updates);
          }
        }),

        removeCourse: (courseId) => set((state) => {
          state.courses = state.courses.filter(c => c.id !== courseId);
          if (state.selectedCourse?.id === courseId) {
            state.selectedCourse = null;
          }
        }),

        setSelectedCourse: (course) => set((state) => {
          state.selectedCourse = course;
        }),

        // Enrollment actions
        enrollInCourse: (courseId) => set((state) => {
          const course = state.courses.find(c => c.id === courseId);
          if (course) {
            course.enrolled = true;
            course.students = (course.students || 0) + 1;
          }
        }),

        unenrollFromCourse: (courseId) => set((state) => {
          const course = state.courses.find(c => c.id === courseId);
          if (course) {
            course.enrolled = false;
            course.students = Math.max((course.students || 1) - 1, 0);
          }
        }),

        updateCourseProgress: (courseId, progress) => set((state) => {
          const course = state.courses.find(c => c.id === courseId);
          if (course) {
            course.progress = progress;
          }
          if (state.selectedCourse?.id === courseId) {
            state.selectedCourse.progress = progress;
          }
        }),

        // Dialog actions
        openCourseDialog: (mode, course) => set((state) => {
          state.courseDialog.isOpen = true;
          state.courseDialog.mode = mode;
          state.courseDialog.course = course;
        }),

        closeCourseDialog: () => set((state) => {
          state.courseDialog.isOpen = false;
          state.courseDialog.mode = 'create';
          state.courseDialog.course = undefined;
        }),

        openModuleDialog: (mode, module) => set((state) => {
          state.moduleDialog.isOpen = true;
          state.moduleDialog.mode = mode;
          state.moduleDialog.module = module;
        }),

        closeModuleDialog: () => set((state) => {
          state.moduleDialog.isOpen = false;
          state.moduleDialog.mode = 'create';
          state.moduleDialog.module = undefined;
        }),

        openLessonDialog: (mode, lesson, moduleId) => set((state) => {
          state.lessonDialog.isOpen = true;
          state.lessonDialog.mode = mode;
          state.lessonDialog.lesson = lesson;
          state.lessonDialog.moduleId = moduleId;
        }),

        closeLessonDialog: () => set((state) => {
          state.lessonDialog.isOpen = false;
          state.lessonDialog.mode = 'create';
          state.lessonDialog.lesson = undefined;
          state.lessonDialog.moduleId = undefined;
        }),

        openFolderDialog: (mode, folder) => set((state) => {
          state.folderDialog.isOpen = true;
          state.folderDialog.mode = mode;
          state.folderDialog.folder = folder;
        }),

        closeFolderDialog: () => set((state) => {
          state.folderDialog.isOpen = false;
          state.folderDialog.mode = 'create';
          state.folderDialog.folder = undefined;
        }),

        // UI actions
        setSearchTerm: (term) => set((state) => {
          state.searchTerm = term;
        }),

        setActiveTab: (tab) => set((state) => {
          state.activeTab = tab;
        }),

        setLoading: (loading) => set((state) => {
          state.loading = loading;
        }),

        setError: (error) => set((state) => {
          state.error = error;
        }),

        // Cache actions
        refreshCourses: () => set((state) => {
          state.isRefreshing = true;
          state.error = null;
        }),

        invalidateCache: () => set((state) => {
          state.hasValidCache = false;
          state.lastRefreshTime = null;
        }),

        markCacheAsValid: () => set((state) => {
          state.hasValidCache = true;
          state.isRefreshing = false;
          state.lastRefreshTime = Date.now();
        }),

        // Utility actions
        reset: () => set(() => ({ ...initialState })),

        getFilteredCourses: () => {
          const state = get();
          const { courses, searchTerm, activeTab } = state;

          let filtered = [...courses];

          // Filter by tab
          if (activeTab === 'my-courses') {
            filtered = filtered.filter(course => course.enrolled);
          }

          // Filter by search term
          if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(course =>
              course.title.toLowerCase().includes(term) ||
              (course.description?.toLowerCase().includes(term))
            );
          }

          return filtered;
        },

        getMyCourses: () => {
          const state = get();
          return state.courses.filter(course => course.enrolled);
        },

        getCourseById: (courseId) => {
          const state = get();
          return state.courses.find(course => course.id === courseId);
        },


      }))
    )
  )
);

// Selector hooks for optimized re-renders
export const useClassroomCourses = () => useClassroomStore(state => state.courses);
export const useClassroomAuth = () => useClassroomStore(state => ({
  auth: state.auth,
  permissions: state.permissions,
  canCreateCourse: state.permissions?.canCreateCourse ?? false,
  canManageCourses: state.permissions?.canEditCourse ?? false,
}));

export const useClassroomSearch = () => useClassroomStore(state => ({
  searchTerm: state.searchTerm,
  setSearchTerm: state.setSearchTerm,
  activeTab: state.activeTab,
  setActiveTab: state.setActiveTab,
  filteredCourses: state.getFilteredCourses(),
}));

// UI & Loading state
export const useClassroomUI = () => useClassroomStore(state => ({
  loading: state.loading,
  isRefreshing: state.isRefreshing,
  error: state.error,
  setLoading: state.setLoading,
  setError: state.setError,
}));

// Fixed selector with useMemo for truly stable references
export const useClassroomDialogs = () => {
  const courseDialog = useClassroomStore(state => state.courseDialog);
  const moduleDialog = useClassroomStore(state => state.moduleDialog);
  const lessonDialog = useClassroomStore(state => state.lessonDialog);
  const folderDialog = useClassroomStore(state => state.folderDialog);
  const openCourseDialog = useClassroomStore(state => state.openCourseDialog);
  const closeCourseDialog = useClassroomStore(state => state.closeCourseDialog);
  const openModuleDialog = useClassroomStore(state => state.openModuleDialog);
  const closeModuleDialog = useClassroomStore(state => state.closeModuleDialog);
  const openLessonDialog = useClassroomStore(state => state.openLessonDialog);
  const closeLessonDialog = useClassroomStore(state => state.closeLessonDialog);
  const openFolderDialog = useClassroomStore(state => state.openFolderDialog);
  const closeFolderDialog = useClassroomStore(state => state.closeFolderDialog);

  return React.useMemo(() => ({
    courseDialog,
    moduleDialog,
    lessonDialog,
    folderDialog,
    openCourseDialog,
    closeCourseDialog,
    openModuleDialog,
    closeModuleDialog,
    openLessonDialog,
    closeLessonDialog,
    openFolderDialog,
    closeFolderDialog,
  }), [
    courseDialog,
    moduleDialog,
    lessonDialog,
    folderDialog,
    openCourseDialog,
    closeCourseDialog,
    openModuleDialog,
    closeModuleDialog,
    openLessonDialog,
    closeLessonDialog,
    openFolderDialog,
    closeFolderDialog,
  ]);
};

// Cache and stats
export const useClassroomStats = () => useClassroomStore(state => ({
  enrolledCount: state.courses.filter(c => c.enrolled).length,
  publishedCount: state.courses.filter(c => c.is_published).length,
  hasValidCache: state.hasValidCache,
  isExpired: state.lastRefreshTime ?
    (Date.now() - state.lastRefreshTime) > state.cacheExpiry :
    true,
})); 