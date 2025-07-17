import { useEffect, useMemo, useCallback, useRef } from 'react';
import { useClassroomStore } from '@/stores/classroom/classroomStore';
import { useClassroomAuth } from './useClassroomAuth';
import { useCourseManagement } from './useCourseManagement';
import { useClassroomSearch } from './useClassroomSearch';
import type { ClassroomTabProps, UseClassroomAuthReturn } from '@/types/classroom';

// Create stable selectors outside the component to prevent recreating them
const selectCourses = (state: any) => state.courses;
const selectLoading = (state: any) => state.loading;
const selectError = (state: any) => state.error;
const selectSearchTerm = (state: any) => state.searchTerm;
const selectActiveTab = (state: any) => state.activeTab;
const selectIsRefreshing = (state: any) => state.isRefreshing;
const selectHasValidCache = (state: any) => state.hasValidCache;
const selectLastRefreshTime = (state: any) => state.lastRefreshTime;
const selectCourseDialog = (state: any) => state.courseDialog;
const selectModuleDialog = (state: any) => state.moduleDialog;
const selectLessonDialog = (state: any) => state.lessonDialog;
const selectAuth = (state: any) => state.auth;
const selectPermissions = (state: any) => state.permissions;
const selectGetFilteredCourses = (state: any) => state.getFilteredCourses;

// Individual stable action selectors (these return the same function reference each time)
const selectSetAuth = (state: any) => state.setAuth;
const selectClearAuth = (state: any) => state.clearAuth;
const selectSetCourses = (state: any) => state.setCourses;
const selectSetLoading = (state: any) => state.setLoading;
const selectSetError = (state: any) => state.setError;
const selectSetSearchTerm = (state: any) => state.setSearchTerm;
const selectSetActiveTab = (state: any) => state.setActiveTab;
const selectRefreshCourses = (state: any) => state.refreshCourses;
const selectInvalidateCache = (state: any) => state.invalidateCache;
const selectMarkCacheAsValid = (state: any) => state.markCacheAsValid;
const selectUpdateCourse = (state: any) => state.updateCourse;
const selectRemoveCourse = (state: any) => state.removeCourse;
const selectEnrollInCourse = (state: any) => state.enrollInCourse;
const selectUnenrollFromCourse = (state: any) => state.unenrollFromCourse;
const selectOpenCourseDialog = (state: any) => state.openCourseDialog;
const selectCloseCourseDialog = (state: any) => state.closeCourseDialog;
const selectOpenModuleDialog = (state: any) => state.openModuleDialog;
const selectCloseModuleDialog = (state: any) => state.closeModuleDialog;
const selectOpenLessonDialog = (state: any) => state.openLessonDialog;
const selectCloseLessonDialog = (state: any) => state.closeLessonDialog;

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
      console.warn('🚨 [useClassroomIntegration] Update rate limit exceeded, skipping update');
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
        console.log('🔄 [useClassroomIntegration] Auth state changed, updating store');
        setAuth(authHook);
        prevAuthHookRef.current = authHook;
      }
    } else if (!authHook && prevAuthHookRef.current) {
      if (shouldAllowUpdate()) {
        console.log('🔄 [useClassroomIntegration] Auth cleared, clearing store');
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
        console.log('🔄 [useClassroomIntegration] Courses updated, syncing to store');
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
        console.log('🔄 [useClassroomIntegration] Loading state changed:', courseManagement.loading);
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
        console.log('🔄 [useClassroomIntegration] Error state changed:', courseManagement.error);
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