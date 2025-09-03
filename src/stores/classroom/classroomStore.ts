import React from 'react';
import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
// Temporarily removing immer to fix white screen issue
// import { immer } from 'zustand/middleware/immer';
import type { CourseDisplayData } from '@/hooks/useClassroomCache';
import type { 
  CourseDialogState, 
  ModuleDialogState, 
  LessonDialogState,
  FolderDialogState
} from '@/types/classroom';
import { smartStateHydrator, HydrationStatus } from '@/services/SmartStateHydrator';

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

  // Phase 6B: Smart State Hydration Methods
  /**
   * Hydrate store state from cache
   */
  hydrateFromCache: (userId: string) => Promise<boolean>;
  
  /**
   * Enable background sync for classroom data
   */
  enableBackgroundSync: (userId: string) => void;
  
  /**
   * Get hydration status
   */
  getHydrationStatus: () => HydrationStatus;
  
  /**
   * Invalidate hydration cache
   */
  invalidateHydrationCache: (userId: string) => void;
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
      // Using regular Zustand instead of immer
      (set, get) => ({
        ...initialState,

        // Auth actions
        setAuth: (auth) => set((state) => ({
          ...state,
          auth,
          permissions: auth.permissions,
        })),

        clearAuth: () => set((state) => ({
          ...state,
          auth: null,
          permissions: null,
        })),

        updatePermissions: (permissions) => set((state) => ({
          ...state,
          permissions,
          auth: state.auth ? { ...state.auth, permissions } : null,
        })),

        // Course actions
        setCourses: (courses) => set((state) => ({
          ...state,
          courses,
          loading: false,
          error: null,
          lastRefreshTime: Date.now(),
          hasValidCache: true,
        })),

        addCourse: (course) => set((state) => ({
          ...state,
          courses: [course, ...state.courses], // Add to beginning
        })),

        updateCourse: (courseId, updates) => set((state) => ({
          ...state,
          courses: state.courses.map(c => 
            c.id === courseId ? { ...c, ...updates } : c
          ),
          selectedCourse: state.selectedCourse?.id === courseId 
            ? { ...state.selectedCourse, ...updates } 
            : state.selectedCourse,
        })),

        removeCourse: (courseId) => set((state) => ({
          ...state,
          courses: state.courses.filter(c => c.id !== courseId),
          selectedCourse: state.selectedCourse?.id === courseId 
            ? null 
            : state.selectedCourse,
        })),

        setSelectedCourse: (course) => set((state) => ({
          ...state,
          selectedCourse: course,
        })),

        // Enrollment actions
        enrollInCourse: (courseId) => set((state) => ({
          ...state,
          courses: state.courses.map(c => 
            c.id === courseId 
              ? { ...c, enrolled: true, students: (c.students || 0) + 1 }
              : c
          ),
        })),

        unenrollFromCourse: (courseId) => set((state) => ({
          ...state,
          courses: state.courses.map(c => 
            c.id === courseId 
              ? { ...c, enrolled: false, students: Math.max((c.students || 1) - 1, 0) }
              : c
          ),
        })),

        updateCourseProgress: (courseId, progress) => set((state) => ({
          ...state,
          courses: state.courses.map(c => 
            c.id === courseId ? { ...c, progress } : c
          ),
          selectedCourse: state.selectedCourse?.id === courseId
            ? { ...state.selectedCourse, progress }
            : state.selectedCourse,
        })),

        // Dialog actions
        openCourseDialog: (mode, course) => set((state) => ({
          ...state,
          courseDialog: {
            isOpen: true,
            mode,
            course,
          },
        })),

        closeCourseDialog: () => set((state) => ({
          ...state,
          courseDialog: {
            isOpen: false,
            mode: 'create',
            course: undefined,
          },
        })),

        openModuleDialog: (mode, module) => set((state) => ({
          ...state,
          moduleDialog: {
            isOpen: true,
            mode,
            module,
          },
        })),

        closeModuleDialog: () => set((state) => ({
          ...state,
          moduleDialog: {
            isOpen: false,
            mode: 'create',
            module: undefined,
          },
        })),

        openLessonDialog: (mode, lesson, moduleId) => set((state) => ({
          ...state,
          lessonDialog: {
            isOpen: true,
            mode,
            lesson,
            moduleId,
          },
        })),

        closeLessonDialog: () => set((state) => ({
          ...state,
          lessonDialog: {
            isOpen: false,
            mode: 'create',
            lesson: undefined,
            moduleId: undefined,
          },
        })),

        openFolderDialog: (mode, folder) => set((state) => ({
          ...state,
          folderDialog: {
            isOpen: true,
            mode,
            folder,
          },
        })),

        closeFolderDialog: () => set((state) => ({
          ...state,
          folderDialog: {
            isOpen: false,
            mode: 'create',
            folder: undefined,
          },
        })),

        // UI actions
        setSearchTerm: (term) => set((state) => ({
          ...state,
          searchTerm: term,
        })),

        setActiveTab: (tab) => set((state) => ({
          ...state,
          activeTab: tab,
        })),

        setLoading: (loading) => set((state) => ({
          ...state,
          loading,
        })),

        setError: (error) => set((state) => ({
          ...state,
          error,
        })),

        // Cache actions
        refreshCourses: () => set((state) => ({
          ...state,
          isRefreshing: true,
          error: null,
        })),

        invalidateCache: () => set((state) => ({
          ...state,
          hasValidCache: false,
          lastRefreshTime: null,
        })),

        markCacheAsValid: () => set((state) => ({
          ...state,
          hasValidCache: true,
          isRefreshing: false,
          lastRefreshTime: Date.now(),
        })),

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

        // Phase 6B: Smart State Hydration Methods
        
        // Hydrate store state from cache
        hydrateFromCache: async (userId: string): Promise<boolean> => {
          try {
            const componentId = 'classroom-store';
            
            const result = await smartStateHydrator.hydrateComponent(
              componentId,
              userId,
              get() // Use current state as fallback
            );

            if (result.success && result.state) {
              // Restore state from cache
              const cachedState = result.state.data;
              set({
                courses: cachedState.courses || [],
                selectedCourse: cachedState.selectedCourse || null,
                modules: cachedState.modules || [],
                searchTerm: cachedState.searchTerm || '',
                activeTab: cachedState.activeTab || 'all-courses',
                loading: false,
                error: null,
                auth: cachedState.auth || null,
                permissions: cachedState.permissions || null,
                courseDialog: cachedState.courseDialog || { isOpen: false, mode: 'create' },
                moduleDialog: cachedState.moduleDialog || { isOpen: false, mode: 'create' },
                lessonDialog: cachedState.lessonDialog || { isOpen: false, mode: 'create' },
                folderDialog: cachedState.folderDialog || { isOpen: false, mode: 'create' },
                isRefreshing: false,
                lastRefreshTime: cachedState.lastRefreshTime || null,
                hasValidCache: true
              });

              return true;
            }

            return false;
          } catch (error) {
            console.error('Classroom store hydration failed:', error);
            return false;
          }
        },

        // Enable background sync for classroom data
        enableBackgroundSync: (userId: string) => {
          const componentId = 'classroom-store';
          
          const syncFunction = async () => {
            try {
              // Refresh courses in background
              const currentState = get();
              if (currentState.auth) {
                // Trigger course refresh
                currentState.refreshCourses();
                
                // Save updated state to cache
                await smartStateHydrator.saveComponentState(
                  componentId,
                  userId,
                  {
                    courses: currentState.courses,
                    selectedCourse: currentState.selectedCourse,
                    modules: currentState.modules,
                    searchTerm: currentState.searchTerm,
                    activeTab: currentState.activeTab,
                    auth: currentState.auth,
                    permissions: currentState.permissions,
                    lastRefreshTime: Date.now()
                  }
                );
              }
            } catch (error) {
              console.warn('Classroom store background sync failed:', error);
            }
          };

          smartStateHydrator.enableBackgroundSync(componentId, syncFunction, {
            enabled: true,
            interval: 120000, // 2 minutes
            maxRetries: 3
          });
        },

        // Get hydration status
        getHydrationStatus: (): HydrationStatus => {
          const componentId = 'classroom-store';
          return smartStateHydrator.getHydrationStatus(componentId);
        },

        // Invalidate hydration cache
        invalidateHydrationCache: (userId: string) => {
          const componentId = 'classroom-store';
          smartStateHydrator.clearComponentCache(componentId, userId);
        },
      })
    )
  )
);

// Selector hooks for optimized re-renders
export const useClassroomCourses = () => useClassroomStore(state => state.courses);
export const useClassroomAuth = () => useClassroomStore(state => state.auth);
export const useClassroomPermissions = () => useClassroomStore(state => state.permissions);
export const useClassroomSearch = () => useClassroomStore(state => ({
  searchTerm: state.searchTerm,
  setSearchTerm: state.setSearchTerm,
  filteredCourses: state.getFilteredCourses(),
}));
export const useClassroomTabs = () => useClassroomStore(state => ({
  activeTab: state.activeTab,
  setActiveTab: state.setActiveTab,
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
  
  // Use React.useMemo to ensure stable object reference
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

export const useClassroomLoading = () => useClassroomStore(state => ({
  loading: state.loading,
  isRefreshing: state.isRefreshing,
  setLoading: state.setLoading,
}));

// Computed selectors
export const useEnrolledCoursesCount = () => 
  useClassroomStore(state => state.courses.filter(c => c.enrolled).length);

export const usePublishedCoursesCount = () => 
  useClassroomStore(state => state.courses.filter(c => c.is_published).length);

export const useCanCreateCourse = () => 
  useClassroomStore(state => state.permissions?.canCreateCourse ?? false);

export const useCanManageCourses = () => 
  useClassroomStore(state => state.permissions?.canEditCourse ?? false);

// Cache validity checker
export const useCacheStatus = () => useClassroomStore(state => ({
  hasValidCache: state.hasValidCache,
  lastRefreshTime: state.lastRefreshTime,
  cacheExpiry: state.cacheExpiry,
  isExpired: state.lastRefreshTime ? 
    (Date.now() - state.lastRefreshTime) > state.cacheExpiry : 
    true,
})); 