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

  // Main fetch function that orchestrates all hooks
  const fetchCourseDetails = useCallback(async (
    courseId: string, 
    moduleId?: string
  ): Promise<CourseDetailData | null> => {
    try {
      setCurrentCourseId(courseId);
      
      log.debug('Hook', `🎓 [useCourseDetail] Starting fetch for course: ${courseId}`);
      
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

      // Fetch course data using the fetching hook
      const fetchedCourse = await fetchCourseData({
        courseId,
        moduleId,
        enableMobileOptimizations,
        retryOnError,
        enableOfflineSupport
      });

      if (!fetchedCourse) {
        log.error('Hook', `🎓 [useCourseDetail] Failed to fetch course: ${courseId}`);
        return null;
      }

      // Check permissions for the fetched course
      const permissions = await checkPermissions(courseId);
      log.debug('Hook', `🎓 [useCourseDetail] Permissions checked for course: ${courseId}`, {
        canViewDrafts: permissions.canViewDrafts,
        isCreator: permissions.isCreator,
        isGeneralAdmin: permissions.isGeneralAdmin,
        isSpaceAdmin: permissions.isSpaceAdmin
      });

      // Calculate progress if user is authenticated
      if (user?.id) {
        try {
          const progress = await calculateProgressFromCourse(fetchedCourse);
          log.debug('Hook', `🎓 [useCourseDetail] Progress calculated for course: ${courseId}`, {
            progressPercentage: progress.progressPercentage,
            completedCount: progress.completedCount,
            totalLessons: progress.totalLessons
          });

          // Update course with progress data
          fetchedCourse.progress = progress.progressPercentage;
          fetchedCourse.modules = fetchedCourse.modules.map(module => ({
            ...module,
            lessons: module.lessons.map(lesson => ({
              ...lesson,
              completed: progress.completedLessonIds.has(lesson.id)
            }))
          }));
        } catch (progressError) {
          log.warn('Hook', `🎓 [useCourseDetail] Error calculating progress for course ${courseId}:`, progressError);
        }
      }

      // Cache the final course data
      setCachedCourse(courseId, fetchedCourse);
      setCourse(fetchedCourse);
      
      log.debug('Hook', `🎓 [useCourseDetail] Course fetch completed successfully: ${courseId}`);
      return fetchedCourse;
      
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