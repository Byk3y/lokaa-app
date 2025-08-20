import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { log } from '@/utils/logger';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useCourseCaching,
  useCourseProgress,
  useCourseFetching
} from './index';
import type { CourseDetailData, CourseLesson } from '@/types/classroom/courseDetail';

// Optimistic update types
interface OptimisticLessonUpdate {
  lessonId: string;
  updates: {
    title?: string;
    content_text?: string;
    content_url?: string | null;
    is_published?: boolean;
  };
  timestamp: number;
}

interface OptimisticUpdatesMap {
  [lessonId: string]: OptimisticLessonUpdate;
}

interface UseCourseDetailReturn {
  course: CourseDetailData | null;
  loading: boolean;
  loadingPhase: 'initial' | 'content' | 'complete';
  error: string | null;
  fetchCourseDetails: (courseId: string, moduleId?: string) => Promise<CourseDetailData | null>;
  refetch: () => Promise<CourseDetailData | null>;
  silentRefetch: () => Promise<void>;
  invalidateCache: () => void;
  updateCourseProgress: (updatedCourse: CourseDetailData) => void;
  retryCount: number;
  isOffline: boolean;
  
  // Optimistic update functions
  applyOptimisticUpdate: (lessonId: string, updates: OptimisticLessonUpdate['updates']) => void;
  clearOptimisticUpdate: (lessonId: string) => void;
  clearAllOptimisticUpdates: () => void;
  hasOptimisticUpdates: boolean;
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
  const [baseCourse, setBaseCourse] = useState<CourseDetailData | null>(null);
  const [currentCourseId, setCurrentCourseId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  
  // Optimistic updates state
  const [optimisticUpdates, setOptimisticUpdates] = useState<OptimisticUpdatesMap>({});
  const optimisticUpdatesRef = useRef<OptimisticUpdatesMap>({});
  
  // Update ref when state changes for consistent access
  useEffect(() => {
    optimisticUpdatesRef.current = optimisticUpdates;
  }, [optimisticUpdates]);

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
      setIsInitializing(true);
      
      log.debug('Hook', `🎓 [useCourseDetail] Fetching course: ${courseId}`);
      
      // Check cache first (try route id, then alias via courseCache internal logic)
      const cachedCourse = getCachedCourse(courseId);
      if (cachedCourse && (enableOfflineSupport || !isOffline)) {
        // Serve cache immediately for fast paint
        setBaseCourse(cachedCourse);
        setIsInitializing(false);
        log.debug('Hook', `🎓 [useCourseDetail] Using cached course data for: ${courseId}`);

        // Kick off a background refetch to reconcile stale cache (SWR)
        try {
          const fresh = await fetchCourseData({ courseId });
          if (fresh) {
            setBaseCourse(fresh);
            setCachedCourse(courseId, fresh);
            log.debug('Hook', `🎓 [useCourseDetail] Background refetch updated course: ${courseId}`);
          }
        } catch (e) {
          log.warn('Hook', `🎓 [useCourseDetail] Background refetch failed for: ${courseId}`, e);
        }
        return cachedCourse;
      } else {
        log.debug('Hook', `🎓 [useCourseDetail] Cache miss for course: ${courseId}, fetching fresh data`);
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

      setBaseCourse(courseData);
      // Cache under both the requested key and the canonical UUID. The setter
      // handles writing both and remembering alias mapping.
      setCachedCourse(courseId, courseData);
      setIsInitializing(false);
      
      log.debug('Hook', `🎓 [useCourseDetail] Fresh course data fetched and cached for: ${courseId}`);
      return courseData;
      
    } catch (error: any) {
      log.error('Hook', `🎓 [useCourseDetail] Error in fetchCourseDetails for course ${courseId}:`, error);
      setIsInitializing(false);
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

  // Refetch function - now returns fresh course data
  const refetch = useCallback(async (): Promise<CourseDetailData | null> => {
    if (currentCourseId) {
      log.debug('Hook', `🎓 [useCourseDetail] Refetching course: ${currentCourseId}`);
      
      // Force fresh data fetch by bypassing cache
      try {
        // First, invalidate the cache to ensure we get fresh data
        invalidateCourseCache(currentCourseId);
        log.debug('Hook', `🎓 [useCourseDetail] Invalidated cache for course: ${currentCourseId}`);
        
        // Fetch course data directly without checking cache
        const courseData = await fetchCourseData({ courseId: currentCourseId });
        if (!courseData) {
          log.error('Hook', `🎓 [useCourseDetail] Failed to fetch fresh course: ${currentCourseId}`);
          return null;
        }

        // Update both base course state and cache immediately
        setBaseCourse(courseData);
        setCachedCourse(currentCourseId, courseData);
        
        // Clear all optimistic updates now that we have fresh data
        clearAllOptimisticUpdates();
        
        log.debug('Hook', `🎓 [useCourseDetail] Fresh course data fetched and cached for: ${currentCourseId}`, {
          courseId: currentCourseId,
          lessonCount: courseData.modules.flatMap(m => m.lessons).length,
          cacheUpdated: true,
          baseCourseUpdated: true
        });
        
        return courseData;
      } catch (error: any) {
        log.error('Hook', `🎓 [useCourseDetail] Error in refetch for course ${currentCourseId}:`, error);
        return null;
      }
    }
    return null;
  }, [currentCourseId, fetchCourseData, setCachedCourse, invalidateCourseCache]);

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
      setBaseCourse(lastFetchedCourse);
    }
  }, [lastFetchedCourse]);

  // Optimistic update functions
  const applyOptimisticUpdate = useCallback((lessonId: string, updates: OptimisticLessonUpdate['updates']) => {
    log.debug('Hook', `🎓 [useCourseDetail] Applying optimistic update for lesson: ${lessonId}`, updates);
    
    setOptimisticUpdates(prev => ({
      ...prev,
      [lessonId]: {
        lessonId,
        updates,
        timestamp: Date.now()
      }
    }));
  }, []);
  
  const clearOptimisticUpdate = useCallback((lessonId: string) => {
    log.debug('Hook', `🎓 [useCourseDetail] Clearing optimistic update for lesson: ${lessonId}`);
    
    setOptimisticUpdates(prev => {
      const newUpdates = { ...prev };
      delete newUpdates[lessonId];
      return newUpdates;
    });
  }, []);
  
  const clearAllOptimisticUpdates = useCallback(() => {
    log.debug('Hook', '🎓 [useCourseDetail] Clearing all optimistic updates');
    setOptimisticUpdates({});
  }, []);
  
  // Function to update course progress externally (for optimistic updates)
  const updateCourseProgress = useCallback((updatedCourse: CourseDetailData) => {
    log.debug('Hook', `🎓 [useCourseDetail] External progress update for course: ${updatedCourse.id}`);
    setBaseCourse(updatedCourse);
    
    // Update cache with the new progress
    if (currentCourseId) {
      setCachedCourse(currentCourseId, updatedCourse);
    }
  }, [currentCourseId, setCachedCourse]);

  // Memoized course data with optimistic updates applied
  const course = useMemo((): CourseDetailData | null => {
    if (!baseCourse) return null;
    
    // If no optimistic updates, return base course
    if (Object.keys(optimisticUpdates).length === 0) {
      return baseCourse;
    }
    
    // Apply optimistic updates to course data
    const updatedCourse = { ...baseCourse };
    updatedCourse.modules = baseCourse.modules.map(module => ({
      ...module,
      lessons: module.lessons.map(lesson => {
        const optimisticUpdate = optimisticUpdates[lesson.id];
        if (!optimisticUpdate) return lesson;
        
        // Apply optimistic updates to lesson
        const updatedLesson = { ...lesson };
        
        if (optimisticUpdate.updates.title !== undefined) {
          updatedLesson.title = optimisticUpdate.updates.title;
        }
        
        if (optimisticUpdate.updates.content_url !== undefined) {
          updatedLesson.content_url = optimisticUpdate.updates.content_url;
        }
        
        if (optimisticUpdate.updates.is_published !== undefined) {
          updatedLesson.is_published = optimisticUpdate.updates.is_published;
        }
        
        // Apply content_text to the appropriate field
        // - If the lesson uses educational_content, update its text_content
        // - Otherwise, update legacy lesson.content_text so the viewer reflects edits immediately
        if (optimisticUpdate.updates.content_text !== undefined) {
          if (updatedLesson.educational_content) {
            updatedLesson.educational_content = {
              ...updatedLesson.educational_content,
              text_content: optimisticUpdate.updates.content_text
            };
          } else {
            updatedLesson.content_text = optimisticUpdate.updates.content_text as string;
          }
        }
        
        if (process.env.NODE_ENV === 'development') {
          log.debug('Hook', `🎓 [useCourseDetail] Applied optimistic update to lesson ${lesson.id}`, {
            originalTitle: lesson.title,
            updatedTitle: updatedLesson.title
          });
        }
        
        return updatedLesson;
      })
    }));
    
    return updatedCourse;
  }, [baseCourse, optimisticUpdates]);
  
  // Helper to check if there are pending optimistic updates
  const hasOptimisticUpdates = Object.keys(optimisticUpdates).length > 0;
  
  return {
    course,
    loading: fetchingLoading || isInitializing,
    loadingPhase: 'complete', // Simplified - no phases
    error: fetchingError,
    fetchCourseDetails,
    refetch,
    silentRefetch,
    invalidateCache: invalidateCourseCache,
    updateCourseProgress,
    retryCount: 0, // Simplified - no retry counting
    isOffline,
    
    // Optimistic update functions
    applyOptimisticUpdate,
    clearOptimisticUpdate,
    clearAllOptimisticUpdates,
    hasOptimisticUpdates
  };
} 