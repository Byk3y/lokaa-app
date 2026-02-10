import { useState, useCallback, useEffect, useMemo } from 'react';
import { log } from '@/utils/logger';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMobile } from '@/hooks/useMobile';
import {
    getCachedCourseDetail,
    setCachedCourseDetail
} from '@/utils/courseCache';
import type { CourseDetailData, CourseLesson } from '@/types/classroom/courseDetail';

interface UseCourseOptions {
    courseId: string;
    enableFetching?: boolean;
}

interface UseCourseReturn {
    course: CourseDetailData | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<CourseDetailData | null>;
    markLessonAsDone: (lesson: CourseLesson) => Promise<void>;
    isMobile: boolean;

    // Optimistic updates
    applyOptimisticUpdate: (lessonId: string, updates: any) => void;
    clearOptimisticUpdate: (lessonId: string) => void;
    clearAllOptimisticUpdates: () => void;
    hasOptimisticUpdates: boolean;
    updateCourseProgress: (updatedCourse: CourseDetailData) => void;
    invalidateCache: () => void;
}

/**
 * Unified hook for accessing course details, modules, lessons, and progress.
 * Consolidates useCourseFetching, useCourseCaching, and useCourseProgress.
 */
export function useCourse({ courseId, enableFetching = true }: UseCourseOptions): UseCourseReturn {
    const { user } = useAuth();
    const isMobile = useMobile();
    const [baseCourse, setBaseCourse] = useState<CourseDetailData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [optimisticUpdates, setOptimisticUpdates] = useState<Record<string, any>>({});

    const fetchCourse = useCallback(async (isInitial = false): Promise<CourseDetailData | null> => {
        if (!courseId) return null;

        try {
            setLoading(true);
            setError(null);

            // 1. Try Cache First (if initial load)
            if (isInitial) {
                const cached = getCachedCourseDetail<CourseDetailData>(courseId);
                if (cached) {
                    log.debug('useCourse', `Cache hit for ${courseId}`);
                    setBaseCourse(cached);
                    // If we have cache, we don't block the UI with initial loading
                    setLoading(false);
                    // Still continue to fetch fresh data
                }
            }

            const supabase = getSupabaseClient();

            // 2. Fetch from DB
            let query = supabase.from('courses').select('*');
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(courseId);
            const isShortId = /^[a-zA-Z0-9]{8}$/.test(courseId);

            if (isUUID) query = query.eq('id', courseId);
            else if (isShortId) query = query.eq('short_id', courseId);
            else query = query.eq('slug', courseId);

            const { data: courseData, error: courseError } = await query.single();
            if (courseError) throw courseError;

            // 3. Fetch Modules and Lessons
            const { data: modules, error: modulesError } = await supabase
                .from('course_modules')
                .select(`
          *,
          lessons:course_lessons(*)
        `)
                .eq('course_id', courseData.id)
                .order('module_order', { ascending: true });

            if (modulesError) throw modulesError;

            // 4. Fetch Progress if user is logged in
            let completedLessonIds: string[] = [];
            if (user?.id) {
                const { data: completions } = await supabase
                    .from('lesson_completions')
                    .select('lesson_id')
                    .eq('user_id', user.id)
                    .eq('course_id', courseData.id);

                completedLessonIds = completions?.map(c => c.lesson_id) || [];
            }

            // 5. Transform and set State
            const transformedCourse: CourseDetailData = {
                ...courseData,
                modules: modules.map(m => ({
                    ...m,
                    lessons: (m.lessons || []).map((l: any) => ({
                        ...l,
                        completed: completedLessonIds.includes(l.id)
                    })).sort((a: any, b: any) => (a.lesson_order || 0) - (b.lesson_order || 0))
                })),
                progress: transformedCourseProgress(modules, completedLessonIds)
            };

            setBaseCourse(transformedCourse);
            setCachedCourseDetail(courseId, transformedCourse);
            return transformedCourse;

        } catch (err: any) {
            log.error('useCourse', `Error fetching course: ${err.message}`, err);
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, [courseId, user?.id]);

    useEffect(() => {
        if (enableFetching) {
            fetchCourse(true);
        }
    }, [fetchCourse, enableFetching]);

    // Optimistic update methods
    const applyOptimisticUpdate = useCallback((lessonId: string, updates: any) => {
        setOptimisticUpdates(prev => ({ ...prev, [lessonId]: { ...prev[lessonId], ...updates } }));
    }, []);

    const clearOptimisticUpdate = useCallback((lessonId: string) => {
        setOptimisticUpdates(prev => {
            const next = { ...prev };
            delete next[lessonId];
            return next;
        });
    }, []);

    const clearAllOptimisticUpdates = useCallback(() => {
        setOptimisticUpdates({});
    }, []);

    const updateCourseProgress = useCallback((updatedCourse: CourseDetailData) => {
        setBaseCourse(updatedCourse);
        setCachedCourseDetail(courseId, updatedCourse);
    }, [courseId]);

    const invalidateCache = useCallback(() => {
        setCachedCourseDetail(courseId, null);
    }, [courseId]);

    // Memoized course with optimistic updates applied
    const course = useMemo(() => {
        if (!baseCourse) return null;
        if (Object.keys(optimisticUpdates).length === 0) return baseCourse;

        const updatedCourse = { ...baseCourse };
        updatedCourse.modules = updatedCourse.modules.map(module => ({
            ...module,
            lessons: module.lessons.map(lesson => {
                const updates = optimisticUpdates[lesson.id];
                if (!updates) return lesson;

                const updatedLesson = { ...lesson, ...updates };
                // Handle special educational_content mapping if needed
                if (updates.content_text !== undefined && updatedLesson.educational_content) {
                    updatedLesson.educational_content = {
                        ...updatedLesson.educational_content,
                        text_content: updates.content_text
                    };
                }
                return updatedLesson;
            })
        }));
        return updatedCourse;
    }, [baseCourse, optimisticUpdates]);

    const markLessonAsDone = useCallback(async (lesson: CourseLesson) => {
        if (!user?.id || !course) return;

        // Toggle logic
        const isCompleted = lesson.completed;

        // Optimistic progress update
        applyOptimisticUpdate(lesson.id, { completed: !isCompleted });

        try {
            const supabase = getSupabaseClient();
            if (isCompleted) {
                await supabase.from('lesson_completions').delete()
                    .eq('user_id', user.id).eq('lesson_id', lesson.id).eq('course_id', course.id);
            } else {
                const module = course.modules.find(m => m.lessons.some(l => l.id === lesson.id));
                await supabase.from('lesson_completions').insert({
                    user_id: user.id,
                    lesson_id: lesson.id,
                    course_id: course.id,
                    module_id: module?.id,
                    completed_at: new Date().toISOString()
                });
            }

            // Cleanup optimistic update and refetch to ensure stable state
            clearOptimisticUpdate(lesson.id);
            fetchCourse();
        } catch (err: any) {
            log.error('useCourse', 'Error toggling lesson completion', err);
            clearOptimisticUpdate(lesson.id); // Revert
            setError(err.message);
        }
    }, [user?.id, course, applyOptimisticUpdate, clearOptimisticUpdate, fetchCourse]);

    return {
        course,
        loading,
        error,
        refetch: () => fetchCourse(),
        markLessonAsDone,
        isMobile,
        applyOptimisticUpdate,
        clearOptimisticUpdate,
        clearAllOptimisticUpdates,
        hasOptimisticUpdates: Object.keys(optimisticUpdates).length > 0,
        updateCourseProgress,
        invalidateCache
    };
}

function transformedCourseProgress(modules: any[], completedIds: string[]) {
    const totalLessons = modules.flatMap((m: any) => m.lessons || []).length;
    if (totalLessons === 0) return 0;
    return Math.round((completedIds.length / totalLessons) * 100);
}
