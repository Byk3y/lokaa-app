import { useState, useEffect, useCallback } from 'react';
import { log } from '@/utils/logger';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useCourseCaching,
  useNetworkStatus,
  useCoursePermissions,
  useCourseProgress,
  useCourseFetching
} from './index';
import type { CourseDetailData } from '@/types/classroom/courseDetail';

interface UseCourseDetailReturn {
  course: CourseDetailData | null;
  loading: boolean;
  loadingPhase: 'initial' | 'content' | 'complete';
  error: string | null;
  fetchCourseDetails: (courseId: string, moduleId?: string) => Promise<CourseDetailData | null>;
  refetch: () => Promise<void>;
  silentRefetch: () => Promise<void>;
  invalidateCache: () => void;
  updateCourseProgress: (updatedCourse: CourseDetailData) => void;
  retryCount: number;
  isOffline: boolean;
}

interface UseCourseDetailOptions {
  enableMobileOptimizations?: boolean;
  enableOfflineSupport?: boolean;
  retryOnError?: boolean;
  cacheStrategy?: 'aggressive' | 'normal' | 'minimal';
}

/**
 * Custom hook for fetching and managing course details with mobile-specific optimizations
 * 
 * Features:
 * - Mobile-optimized caching and retry logic
 * - Offline support with cached data
 * - Network-aware error handling
 * - Performance optimizations for mobile devices
 * - Comprehensive logging for debugging
 * 
 * This hook now uses modular sub-hooks for better maintainability:
 * - useCourseCaching: Cache management
 * - useNetworkStatus: Network connectivity
 * - useCoursePermissions: Permission checking
 * - useCourseProgress: Progress calculation
 * - useCourseFetching: Data fetching
 */
export function useCourseDetail(options: UseCourseDetailOptions = {}): UseCourseDetailReturn {
  const {
    enableMobileOptimizations = true,
    enableOfflineSupport = true,
    retryOnError = true,
    cacheStrategy = 'normal'
  } = options;

  const { user } = useAuth();
  
  // Core state
  const [course, setCourse] = useState<CourseDetailData | null>(null);
  const [currentCourseId, setCurrentCourseId] = useState<string | null>(null);

  // Use modular hooks
  const {
    getCachedCourse,
    setCachedCourse,
    invalidateCourseCache
  } = useCourseCaching({
    enableMobileOptimizations,
    cacheStrategy,
    userId: user?.id || null
  });

  const {
    isOnline,
    isOffline,
    networkStatus
  } = useNetworkStatus({
    enableLogging: true,
    checkInterval: null
  });

  const {
    checkPermissions,
    canViewDrafts,
    isCreator,
    isGeneralAdmin,
    isSpaceAdmin,
    currentPermissions,
    permissionsLoading,
    permissionsError
  } = useCoursePermissions({
    enableLogging: true,
    autoCheckOnMount: false
  });

  const {
    calculateProgressFromCourse,
    currentProgress,
    progressLoading,
    progressError
  } = useCourseProgress({
    enableLogging: true,
    enableCaching: true,
    userId: user?.id || null
  });

  const {
    fetchCourseDetails: fetchCourseData,
    refetch: refetchCourse,
    silentRefetch: silentRefetchCourse,
    fetchingLoading,
    loadingPhase,
    fetchingError,
    retryCount,
    lastFetchedCourse
  } = useCourseFetching({
    enableLogging: true,
    enableMobileOptimizations,
    retryOnError,
    enableOfflineSupport
  });

  // PROGRESSIVE LOADING: Main fetch function that loads data in phases
  const fetchCourseDetails = useCallback(async (
    courseId: string, 
    moduleId?: string
  ): Promise<CourseDetailData | null> => {
    try {
      setCurrentCourseId(courseId);
      
      log.debug('Hook', `🎓 [useCourseDetail] Starting progressive fetch for course: ${courseId}`);
      
      // Check cache first
      const cachedCourse = getCachedCourse(courseId);
      if (cachedCourse && (enableOfflineSupport || !isOffline)) {
        setCourse(cachedCourse);
        log.debug('Hook', `🎓 [useCourseDetail] Using cached course data for: ${courseId}`);
        return cachedCourse;
      }

      // If offline and no cache, show appropriate error
      if (isOffline && enableOfflineSupport) {
        const offlineError = 'No cached data available offline. Please check your connection.';
        log.warn('Hook', `🎓 [useCourseDetail] Offline mode - no cached data for course: ${courseId}`);
        return null;
      }

      // PHASE 1: Load course metadata only (fast - under 500ms)
      log.debug('Hook', `🎓 [useCourseDetail] Phase 1: Loading course metadata for: ${courseId}`);
      const courseMetadata = await fetchCourseData({
        courseId,
        moduleId,
        enableMobileOptimizations: true, // Force mobile optimizations
        retryOnError,
        enableOfflineSupport,
        loadMetadataOnly: true // New flag to load only metadata
      });

      if (!courseMetadata) {
        log.error('Hook', `🎓 [useCourseDetail] Failed to fetch course metadata: ${courseId}`);
        return null;
      }

      // PHASE 2: Show course overview immediately with metadata
      log.debug('Hook', `🎓 [useCourseDetail] Phase 2: Setting course metadata for immediate display: ${courseId}`);
      setCourse(courseMetadata);
      
      // PHASE 3: Load lesson list in background (non-blocking)
      log.debug('Hook', `🎓 [useCourseDetail] Phase 3: Loading lesson list in background for: ${courseId}`);
      const lessonListPromise = fetchCourseData({
        courseId,
        moduleId,
        enableMobileOptimizations: true,
        retryOnError,
        enableOfflineSupport,
        loadLessonListOnly: true // New flag to load only lesson list
      });

      // PHASE 4: Load progress data in background (non-blocking)
      let progressPromise: Promise<any> | null = null;
      if (user?.id) {
        log.debug('Hook', `🎓 [useCourseDetail] Phase 4: Loading progress data in background for: ${courseId}`);
        progressPromise = calculateProgressFromCourse(courseMetadata).catch(error => {
          log.warn('Hook', `🎓 [useCourseDetail] Background progress calculation failed for course ${courseId}:`, error);
          return null;
        });
      }

      // PHASE 5: Wait for lesson list and update course data
      try {
        const lessonListData = await lessonListPromise;
        if (lessonListData) {
          log.debug('Hook', `🎓 [useCourseDetail] Phase 5: Updating course with lesson list for: ${courseId}`);
          const updatedCourse = { ...courseMetadata, ...lessonListData };
          setCourse(updatedCourse);
          
          // PHASE 6: Update with progress data when it arrives
          if (progressPromise) {
            progressPromise.then(progress => {
              if (progress) {
                log.debug('Hook', `🎓 [useCourseDetail] Phase 6: Updating course with progress data for: ${courseId}`);
                const finalCourse = {
                  ...updatedCourse,
                  progress: progress.progressPercentage,
                  modules: updatedCourse.modules?.map(module => ({
                    ...module,
                    lessons: module.lessons?.map(lesson => ({
                      ...lesson,
                      completed: progress.completedLessonIds.has(lesson.id)
                    })) || []
                  })) || []
                };
                setCourse(finalCourse);
                setCachedCourse(courseId, finalCourse);
              }
            });
          } else {
            setCachedCourse(courseId, updatedCourse);
          }
          
          return updatedCourse;
        }
      } catch (lessonError) {
        log.warn('Hook', `🎓 [useCourseDetail] Background lesson list loading failed for course ${courseId}:`, lessonError);
        // Return course metadata even if lesson list fails
        setCachedCourse(courseId, courseMetadata);
        return courseMetadata;
      }
      
      log.debug('Hook', `🎓 [useCourseDetail] Progressive fetch completed for: ${courseId}`);
      return courseMetadata;
      
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to fetch course details';
      log.error('Hook', `🎓 [useCourseDetail] Error in fetchCourseDetails for course ${courseId}:`, error);
      return null;
    }
  }, [
    user?.id,
    isOffline,
    enableOfflineSupport,
    getCachedCourse,
    setCachedCourse,
    checkPermissions,
    calculateProgressFromCourse,
    fetchCourseData
  ]);

  // Refetch function
  const refetch = useCallback(async () => {
    if (currentCourseId) {
      log.debug('Hook', `🎓 [useCourseDetail] Refetching course: ${currentCourseId}`);
      await fetchCourseDetails(currentCourseId);
    }
  }, [currentCourseId, fetchCourseDetails]);

  // Silent refetch function (doesn't trigger loading state)
  const silentRefetch = useCallback(async () => {
    if (currentCourseId) {
      log.debug('Hook', `🎓 [useCourseDetail] Silent refetching course: ${currentCourseId}`);
      try {
        await fetchCourseDetails(currentCourseId);
      } catch (error) {
        log.warn('Hook', `🎓 [useCourseDetail] Silent refetch failed:`, error);
      }
    }
  }, [currentCourseId, fetchCourseDetails]);

  // Update course state when lastFetchedCourse changes
  useEffect(() => {
    if (lastFetchedCourse) {
      setCourse(lastFetchedCourse);
    }
  }, [lastFetchedCourse]);

  // Function to update course progress externally (for optimistic updates)
  const updateCourseProgress = useCallback((updatedCourse: CourseDetailData) => {
    log.debug('Hook', `🎓 [useCourseDetail] External progress update for course: ${updatedCourse.id}`);
    setCourse(updatedCourse);
    
    // Update cache with the new progress
    if (currentCourseId) {
      setCachedCourse(currentCourseId, updatedCourse);
    }
  }, [currentCourseId, setCachedCourse]);

  return {
    course,
    loading: fetchingLoading,
    loadingPhase,
    error: fetchingError,
    fetchCourseDetails,
    refetch,
    silentRefetch,
    invalidateCache: invalidateCourseCache,
    updateCourseProgress,
    retryCount,
    isOffline
  };
} 