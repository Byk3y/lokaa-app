import { log } from '@/utils/logger';
import { useEffect, useMemo, useCallback, useRef } from 'react';
import { useClassroomStore } from '@/stores/classroom/classroomStore';
import { useClassroomAuth } from './useClassroomAuth';
import { useCourseManagement } from './useCourseManagement';
import { useClassroomSearch } from './useClassroomSearch';
import type { 
  ClassroomTabProps, 
  UseClassroomAuthReturn, 
  CourseDisplayData,
  ClassroomPermissions,
  CourseDialogState,
  ModuleDialogState,
  LessonDialogState
} from '@/types/classroom';

// Properly typed store state interface
interface ClassroomStoreState {
  courses: CourseDisplayData[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  activeTab: 'all-courses' | 'my-courses';
  isRefreshing: boolean;
  hasValidCache: boolean;
  lastRefreshTime: number | null;
  courseDialog: CourseDialogState;
  moduleDialog: ModuleDialogState;
  lessonDialog: LessonDialogState;
  auth: UseClassroomAuthReturn | null;
  permissions: ClassroomPermissions | null;
  getFilteredCourses: () => CourseDisplayData[];
  setAuth: (auth: UseClassroomAuthReturn) => void;
  clearAuth: () => void;
  setCourses: (courses: CourseDisplayData[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSearchTerm: (term: string) => void;
  setActiveTab: (tab: 'all-courses' | 'my-courses') => void;
  refreshCourses: () => void;
  invalidateCache: () => void;
  markCacheAsValid: () => void;
  updateCourse: (courseId: string, updates: Partial<CourseDisplayData>) => void;
  removeCourse: (courseId: string) => void;
  enrollInCourse: (courseId: string) => void;
  unenrollFromCourse: (courseId: string) => void;
  openCourseDialog: (mode: 'create' | 'edit' | 'view', course?: CourseDisplayData) => void;
  closeCourseDialog: () => void;
  openModuleDialog: (mode: 'create' | 'edit' | 'delete', module?: any) => void;
  closeModuleDialog: () => void;
  openLessonDialog: (mode: 'create' | 'edit' | 'view', lesson?: any, moduleId?: string) => void;
  closeLessonDialog: () => void;
}

// Create stable selectors outside the component to prevent recreating them
const selectCourses = (state: ClassroomStoreState) => state.courses;
const selectLoading = (state: ClassroomStoreState) => state.loading;
const selectError = (state: ClassroomStoreState) => state.error;
const selectSearchTerm = (state: ClassroomStoreState) => state.searchTerm;
const selectActiveTab = (state: ClassroomStoreState) => state.activeTab;
const selectIsRefreshing = (state: ClassroomStoreState) => state.isRefreshing;
const selectHasValidCache = (state: ClassroomStoreState) => state.hasValidCache;
const selectLastRefreshTime = (state: ClassroomStoreState) => state.lastRefreshTime;
const selectCourseDialog = (state: ClassroomStoreState) => state.courseDialog;
const selectModuleDialog = (state: ClassroomStoreState) => state.moduleDialog;
const selectLessonDialog = (state: ClassroomStoreState) => state.lessonDialog;
const selectAuth = (state: ClassroomStoreState) => state.auth;
const selectPermissions = (state: ClassroomStoreState) => state.permissions;
const selectGetFilteredCourses = (state: ClassroomStoreState) => state.getFilteredCourses;

// Individual stable action selectors (these return the same function reference each time)
const selectSetAuth = (state: ClassroomStoreState) => state.setAuth;
const selectClearAuth = (state: ClassroomStoreState) => state.clearAuth;
const selectSetCourses = (state: ClassroomStoreState) => state.setCourses;
const selectSetLoading = (state: ClassroomStoreState) => state.setLoading;
const selectSetError = (state: ClassroomStoreState) => state.setError;
const selectSetSearchTerm = (state: ClassroomStoreState) => state.setSearchTerm;
const selectSetActiveTab = (state: ClassroomStoreState) => state.setActiveTab;
const selectRefreshCourses = (state: ClassroomStoreState) => state.refreshCourses;
const selectInvalidateCache = (state: ClassroomStoreState) => state.invalidateCache;
const selectMarkCacheAsValid = (state: ClassroomStoreState) => state.markCacheAsValid;
const selectUpdateCourse = (state: ClassroomStoreState) => state.updateCourse;
const selectRemoveCourse = (state: ClassroomStoreState) => state.removeCourse;
const selectEnrollInCourse = (state: ClassroomStoreState) => state.enrollInCourse;
const selectUnenrollFromCourse = (state: ClassroomStoreState) => state.unenrollFromCourse;
const selectOpenCourseDialog = (state: ClassroomStoreState) => state.openCourseDialog;
const selectCloseCourseDialog = (state: ClassroomStoreState) => state.closeCourseDialog;
const selectOpenModuleDialog = (state: ClassroomStoreState) => state.openModuleDialog;
const selectCloseModuleDialog = (state: ClassroomStoreState) => state.closeModuleDialog;
const selectOpenLessonDialog = (state: ClassroomStoreState) => state.openLessonDialog;
const selectCloseLessonDialog = (state: ClassroomStoreState) => state.closeLessonDialog;

/**
 * Integration hook that bridges existing classroom hooks with the Zustand store
 * This provides a migration path while maintaining backward compatibility
 */
export function useClassroomIntegration(space: ClassroomTabProps['space']) {
  // Circuit breaker to prevent excessive updates
  const updateCountRef = useRef(0);
  const lastResetRef = useRef(Date.now());
  const MAX_UPDATES_PER_SECOND = 10;
  
  // Reset counter every second
  const resetUpdateCounter = useCallback(() => {
    const now = Date.now();
    if (now - lastResetRef.current > 1000) {
      updateCountRef.current = 0;
      lastResetRef.current = now;
    }
  }, []);
  
  // Check if we should allow updates
  const shouldAllowUpdate = useCallback(() => {
    resetUpdateCounter();
    if (updateCountRef.current >= MAX_UPDATES_PER_SECOND) {
      log.warn('Hook', '🚨 [useClassroomIntegration] Update rate limit exceeded, skipping update');
      return false;
    }
    updateCountRef.current++;
    return true;
  }, [resetUpdateCounter]);
  // Get store state using stable selectors
  const courses = useClassroomStore(selectCourses);
  const loading = useClassroomStore(selectLoading);
  const error = useClassroomStore(selectError);
  const searchTerm = useClassroomStore(selectSearchTerm);
  const activeTab = useClassroomStore(selectActiveTab);
  const isRefreshing = useClassroomStore(selectIsRefreshing);
  const hasValidCache = useClassroomStore(selectHasValidCache);
  const lastRefreshTime = useClassroomStore(selectLastRefreshTime);
  const courseDialog = useClassroomStore(selectCourseDialog);
  const moduleDialog = useClassroomStore(selectModuleDialog);
  const lessonDialog = useClassroomStore(selectLessonDialog);
  const auth = useClassroomStore(selectAuth);
  const permissions = useClassroomStore(selectPermissions);
  const getFilteredCourses = useClassroomStore(selectGetFilteredCourses);
  
  // Get individual stable action references
  const setAuth = useClassroomStore(selectSetAuth);
  const clearAuth = useClassroomStore(selectClearAuth);
  const setCourses = useClassroomStore(selectSetCourses);
  const setLoadingState = useClassroomStore(selectSetLoading);
  const setError = useClassroomStore(selectSetError);
  const setSearchTermStore = useClassroomStore(selectSetSearchTerm);
  const setActiveTabStore = useClassroomStore(selectSetActiveTab);
  const refreshCoursesStore = useClassroomStore(selectRefreshCourses);
  const invalidateCache = useClassroomStore(selectInvalidateCache);
  const markCacheAsValid = useClassroomStore(selectMarkCacheAsValid);
  const updateCourseStore = useClassroomStore(selectUpdateCourse);
  const removeCourseStore = useClassroomStore(selectRemoveCourse);
  const enrollInCourseStore = useClassroomStore(selectEnrollInCourse);
  const unenrollFromCourseStore = useClassroomStore(selectUnenrollFromCourse);
  const openCourseDialog = useClassroomStore(selectOpenCourseDialog);
  const closeCourseDialog = useClassroomStore(selectCloseCourseDialog);
  const openModuleDialog = useClassroomStore(selectOpenModuleDialog);
  const closeModuleDialog = useClassroomStore(selectCloseModuleDialog);
  const openLessonDialog = useClassroomStore(selectOpenLessonDialog);
  const closeLessonDialog = useClassroomStore(selectCloseLessonDialog);
  
  // Existing hooks
  const authHook = useClassroomAuth(space);
  const courseManagement = useCourseManagement(space);
  const searchHook = useClassroomSearch(courseManagement.courses);

  // Sync auth state with store using stable reference check
  const prevAuthHookRef = useRef<UseClassroomAuthReturn | null>(null);
  
  useEffect(() => {
    // Only update if the auth hook reference actually changed (not just re-rendered)
    if (authHook && authHook !== prevAuthHookRef.current) {
      if (shouldAllowUpdate()) {
        log.debug('Hook', '🔄 [useClassroomIntegration] Auth state changed, updating store');
        setAuth(authHook);
        prevAuthHookRef.current = authHook;
      }
    } else if (!authHook && prevAuthHookRef.current) {
      if (shouldAllowUpdate()) {
        log.debug('Hook', '🔄 [useClassroomIntegration] Auth cleared, clearing store');
        clearAuth();
        prevAuthHookRef.current = null;
      }
    }
  }, [authHook, setAuth, clearAuth, shouldAllowUpdate]);

  // Sync courses with store with rate limiting
  const prevCoursesRef = useRef<any[]>([]);
  const lastCourseUpdateRef = useRef<number>(0);
  
  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastCourseUpdateRef.current;
    
    // Rate limit updates (minimum 100ms between updates)
    if (timeSinceLastUpdate < 100) {
      return;
    }
    
    // Only update if courses actually changed
    if (courseManagement.courses.length > 0 && 
        JSON.stringify(courseManagement.courses) !== JSON.stringify(prevCoursesRef.current)) {
      if (shouldAllowUpdate()) {
        log.debug('Hook', '🔄 [useClassroomIntegration] Courses updated, syncing to store');
        setCourses(courseManagement.courses);
        prevCoursesRef.current = courseManagement.courses;
        lastCourseUpdateRef.current = now;
      }
    }
  }, [courseManagement.courses, setCourses, shouldAllowUpdate]);

  // Sync loading state with debouncing
  const prevLoadingRef = useRef<boolean>(false);
  
  useEffect(() => {
    if (courseManagement.loading !== prevLoadingRef.current) {
      if (shouldAllowUpdate()) {
        log.debug('Hook', '🔄 [useClassroomIntegration] Loading state changed:', courseManagement.loading);
        setLoadingState(courseManagement.loading);
        prevLoadingRef.current = courseManagement.loading;
      }
    }
  }, [courseManagement.loading, setLoadingState, shouldAllowUpdate]);

  // Sync error state with debouncing
  const prevErrorRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (courseManagement.error !== prevErrorRef.current) {
      if (shouldAllowUpdate()) {
        log.debug('Hook', '🔄 [useClassroomIntegration] Error state changed:', courseManagement.error);
        if (courseManagement.error) {
          setError(courseManagement.error);
        }
        prevErrorRef.current = courseManagement.error;
      }
    }
  }, [courseManagement.error, setError, shouldAllowUpdate]);

  // Stable action callbacks to prevent infinite loops
  const createCourse = useCallback(async (data: any) => {
    try {
      setLoadingState(true);
      await courseManagement.createCourse(data);
      await courseManagement.refetch(); // Refresh the data
      setLoadingState(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create course');
      throw error;
    }
  }, [courseManagement.createCourse, courseManagement.refetch, setLoadingState, setError]);

  const updateCourse = useCallback(async (id: string, data: any) => {
    try {
      setLoadingState(true);
      await courseManagement.updateCourse(id, data);
      updateCourseStore(id, data);
      setLoadingState(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update course');
      throw error;
    }
  }, [courseManagement.updateCourse, setLoadingState, updateCourseStore, setError]);

  const deleteCourse = useCallback(async (id: string) => {
    try {
      setLoadingState(true);
      await courseManagement.deleteCourse(id);
      removeCourseStore(id);
      setLoadingState(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete course');
      throw error;
    }
  }, [courseManagement.deleteCourse, setLoadingState, removeCourseStore, setError]);

  const enrollInCourse = useCallback(async (courseId: string) => {
    try {
      setLoadingState(true);
      await courseManagement.enrollInCourse(courseId);
      enrollInCourseStore(courseId);
      setLoadingState(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to enroll in course');
      throw error;
    }
  }, [courseManagement.enrollInCourse, setLoadingState, enrollInCourseStore, setError]);

  const unenrollFromCourse = useCallback(async (courseId: string) => {
    try {
      setLoadingState(true);
      await courseManagement.unenrollFromCourse(courseId);
      unenrollFromCourseStore(courseId);
      setLoadingState(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to unenroll from course');
      throw error;
    }
  }, [courseManagement.unenrollFromCourse, setLoadingState, unenrollFromCourseStore, setError]);

  const refreshCourses = useCallback(async () => {
    try {
      refreshCoursesStore();
      await courseManagement.refetch();
      markCacheAsValid();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to refresh courses');
    }
  }, [courseManagement.refetch, refreshCoursesStore, markCacheAsValid, setError]);

  // Enhanced course management actions (now stable with proper dependencies)
  const enhancedActions = useMemo(() => ({
    // Course CRUD operations
    createCourse,
    updateCourse,
    deleteCourse,

    // Enrollment operations
    enrollInCourse,
    unenrollFromCourse,

    // Search integration (using store actions directly to avoid unstable dependencies)
    setSearchTerm: setSearchTermStore,
    setActiveTab: setActiveTabStore,

    // Data refresh
    refreshCourses,

    // Cache management
    invalidateCache,

    // Dialog management
    openCourseDialog,
    closeCourseDialog,
    openModuleDialog,
    closeModuleDialog,
    openLessonDialog,
    closeLessonDialog,
  }), [
    createCourse,
    updateCourse,
    deleteCourse,
    enrollInCourse,
    unenrollFromCourse,
    refreshCourses,
    setSearchTermStore,
    setActiveTabStore,
    invalidateCache,
    openCourseDialog,
    closeCourseDialog,
    openModuleDialog,
    closeModuleDialog,
    openLessonDialog,
    closeLessonDialog,
  ]);

  // Return integrated state and actions
  return {
    // State from store (source of truth)
    courses,
    filteredCourses: getFilteredCourses(),
    searchTerm,
    activeTab,
    loading,
    error,
    auth,
    permissions,
    
    // Dialog states
    courseDialog,
    moduleDialog,
    lessonDialog,
    
    // Cache status
    isRefreshing,
    hasValidCache,
    lastRefreshTime,
    
    // Enhanced actions
    actions: enhancedActions,
    
    // Backward compatibility - original hook returns
    legacy: {
      auth: authHook,
      courseManagement,
      search: searchHook,
    },
  };
}

/**
 * Simplified hook for components that only need specific classroom functionality
 */
export function useClassroomCourses() {
  const courses = useClassroomStore(state => state.courses);
  const filteredCourses = useClassroomStore(state => state.getFilteredCourses());
  const loading = useClassroomStore(state => state.loading);
  const error = useClassroomStore(state => state.error);
  
  return {
    courses,
    filteredCourses,
    loading,
    error,
  };
}

/**
 * Hook for components that need authentication and permissions
 */
export function useClassroomPermissions() {
  const auth = useClassroomStore(state => state.auth);
  const permissions = useClassroomStore(state => state.permissions);
  
  return {
    auth,
    permissions,
    isOwner: permissions?.isOwner ?? false,
    isAdmin: permissions?.isAdmin ?? false,
    canCreateCourse: permissions?.canCreateCourse ?? false,
    canEditCourse: permissions?.canEditCourse ?? false,
    canDeleteCourse: permissions?.canDeleteCourse ?? false,
    canManageModules: permissions?.canManageModules ?? false,
    canManageLessons: permissions?.canManageLessons ?? false,
    canViewAnalytics: permissions?.canViewAnalytics ?? false,
  };
}

/**
 * Hook for components that need search and filtering
 */
export function useClassroomFilters() {
  const searchTerm = useClassroomStore(state => state.searchTerm);
  const activeTab = useClassroomStore(state => state.activeTab);
  const setSearchTerm = useClassroomStore(state => state.setSearchTerm);
  const setActiveTab = useClassroomStore(state => state.setActiveTab);
  const filteredCourses = useClassroomStore(state => state.getFilteredCourses());
  
  return {
    searchTerm,
    activeTab,
    setSearchTerm,
    setActiveTab,
    filteredCourses,
  };
}

/**
 * Hook for components that manage dialogs
 */
export function useClassroomDialogs() {
  return useClassroomStore(state => ({
    courseDialog: state.courseDialog,
    moduleDialog: state.moduleDialog,
    lessonDialog: state.lessonDialog,
    openCourseDialog: state.openCourseDialog,
    closeCourseDialog: state.closeCourseDialog,
    openModuleDialog: state.openModuleDialog,
    closeModuleDialog: state.closeModuleDialog,
    openLessonDialog: state.openLessonDialog,
    closeLessonDialog: state.closeLessonDialog,
  }));
}

/**
 * Hook for getting computed values and statistics
 */
export function useClassroomStats() {
  const courses = useClassroomStore(state => state.courses);
  
  return useMemo(() => ({
    totalCourses: courses.length,
    enrolledCourses: courses.filter(c => c.enrolled).length,
    publishedCourses: courses.filter(c => c.is_published).length,
    draftCourses: courses.filter(c => !c.is_published).length,
    averageProgress: courses.filter(c => c.enrolled && c.progress).length > 0
      ? courses
          .filter(c => c.enrolled && c.progress)
          .reduce((sum, c) => sum + (c.progress || 0), 0) / courses.filter(c => c.enrolled && c.progress).length
      : 0,
    totalStudents: courses.reduce((sum, c) => sum + (c.students || 0), 0),
  }), [courses]);
} 