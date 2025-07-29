import { useState, useEffect, useCallback } from 'react';
import { log } from '@/utils/logger';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useCourseCaching,
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
 * - Simple network checking with navigator.onLine
 * - Performance optimizations for mobile devices
 * - Comprehensive logging for debugging
 * 
 * This hook now uses simplified sub-hooks for better maintainability:
 * - useCourseCaching: Cache management
 * - useCourseProgress: Progress calculation
 * - useCourseFetching: Data fetching
 * - Simple alternatives for network/permissions (RLS handles permissions)
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

  // Simple network status - RLS handles permissions, navigator.onLine handles network
  const isOnline = navigator.onLine;
  const isOffline = !isOnline;

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
    fetchingLoading,
    fetchingError,
    lastFetchedCourse
  } = useCourseFetching({
    enableLogging: true
  });

  // Simplified fetch function 
  const fetchCourseDetails = useCallback(async (
    courseId: string, 
    moduleId?: string
  ): Promise<CourseDetailData | null> => {
    try {
      setCurrentCourseId(courseId);
      
      log.debug('Hook', `🎓 [useCourseDetail] Fetching course: ${courseId}`);
      
      // Check cache first
      const cachedCourse = getCachedCourse(courseId);
      if (cachedCourse && (enableOfflineSupport || !isOffline)) {
        setCourse(cachedCourse);
        log.debug('Hook', `🎓 [useCourseDetail] Using cached course data for: ${courseId}`);
        return cachedCourse;
      }

      // If offline and no cache, return null
      if (isOffline && enableOfflineSupport) {
        log.warn('Hook', `🎓 [useCourseDetail] Offline mode - no cached data for course: ${courseId}`);
        return null;
      }

      // Fetch course data
      const courseData = await fetchCourseData({ courseId, moduleId });
      if (!courseData) {
        log.error('Hook', `🎓 [useCourseDetail] Failed to fetch course: ${courseId}`);
        return null;
      }

      setCourse(courseData);
      setCachedCourse(courseId, courseData);
      
      return courseData;
      
    } catch (error: any) {
      log.error('Hook', `🎓 [useCourseDetail] Error in fetchCourseDetails for course ${courseId}:`, error);
      return null;
    }
  }, [
    user?.id,
    isOffline,
    enableOfflineSupport,
    getCachedCourse,
    setCachedCourse,
    fetchCourseData
  ]);

  // Refetch function
  const refetch = useCallback(async () => {
    if (currentCourseId) {
      log.debug('Hook', `🎓 [useCourseDetail] Refetching course: ${currentCourseId}`);
      await fetchCourseDetails(currentCourseId);
    }
  }, [currentCourseId, fetchCourseDetails]);

  // Silent refetch function 
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
    loadingPhase: 'complete', // Simplified - no phases
    error: fetchingError,
    fetchCourseDetails,
    refetch,
    silentRefetch,
    invalidateCache: invalidateCourseCache,
    updateCourseProgress,
    retryCount: 0, // Simplified - no retry counting
    isOffline
  };
} 