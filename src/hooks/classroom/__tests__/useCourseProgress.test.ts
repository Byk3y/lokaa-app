import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCourseProgress } from '../useCourseProgress';
import { getSupabaseClient } from '@/integrations/supabase/client';
import type { CourseLesson, CourseDetailData } from '@/types/classroom/courseDetail';

// Mock dependencies
vi.mock('@/integrations/supabase/client');
vi.mock('@/utils/logger', () => ({
  log: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock useAuth
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user' },
  }),
}));

// Mock useCachedClassroom
vi.mock('@/hooks/useCachedClassroom', () => ({
  useCachedClassroom: () => ({
    updateCourseProgress: vi.fn(),
  }),
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
    })),
    insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  })),
  auth: {
    getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'test-user' } }, error: null })),
  },
};

describe('useCourseProgress', () => {
  const mockCourse: CourseDetailData = {
    id: 'test-course-1',
    title: 'Test Course',
    description: 'Test Description',
    creator_id: 'test-creator',
    is_published: true,
    estimated_duration: 60,
    difficulty_level: 'beginner',
    course_order: 1,
    short_id: 'test',
    slug: 'test-course',
    space_id: 'test-space',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    modules: [
      {
        id: 'test-module-1',
        title: 'Test Module',
        description: 'Test Module Description',
        module_order: 1,
        module_type: 'module',
        course_id: 'test-course-1',
        space_id: 'test-space',
        lessons: [
          {
            id: 'test-lesson-1',
            title: 'Test Lesson',
            content_type: 'text',
            content_url: null,
            content_text: 'Test content',
            lesson_order: 1,
            module_id: 'test-module-1',
            is_published: true,
            completed: false,
          },
        ],
      },
    ],
    progress: 0,
  };

  const mockLesson: CourseLesson = {
    id: 'test-lesson-1',
    title: 'Test Lesson',
    content_type: 'text',
    content_url: null,
    content_text: 'Test content',
    lesson_order: 1,
    module_id: 'test-module-1',
    is_published: true,
    completed: false,
    content_id: null,
    page_type: 'lesson',
    estimated_duration: null,
    difficulty_level: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getSupabaseClient as any).mockReturnValue(mockSupabase);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useCourseProgress());

      expect(result.current.isUpdating).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.markLessonAsDone).toBeDefined();
    });

    it('should initialize with custom options', () => {
      const onOptimisticUpdate = vi.fn();
      const { result } = renderHook(() => 
        useCourseProgress({ onOptimisticUpdate })
      );

      expect(result.current.isUpdating).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('markLessonAsDone', () => {
    it('should mark lesson as done successfully', async () => {
      const onOptimisticUpdate = vi.fn();
      const { result } = renderHook(() => 
        useCourseProgress({ onOptimisticUpdate })
      );

      await result.current.markLessonAsDone(mockLesson, mockCourse);

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false);
        expect(result.current.error).toBeNull();
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('lesson_completions');
      expect(onOptimisticUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          modules: expect.arrayContaining([
            expect.objectContaining({
              lessons: expect.arrayContaining([
                expect.objectContaining({ completed: true }),
              ]),
            }),
          ]),
        })
      );
    });

    it('should handle progress update error', async () => {
      const errorMessage = 'Failed to update progress';
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        insert: vi.fn(() => Promise.resolve({ data: null, error: errorMessage })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      });

      const { result } = renderHook(() => useCourseProgress());

      await result.current.markLessonAsDone(mockLesson, mockCourse);

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false);
        expect(result.current.error).toBe('Failed to update lesson completion status.');
      });
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      // Clear previous mocks and set up failing mock
      vi.clearAllMocks();
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.reject(networkError)),
        })),
        insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      });

      const { result } = renderHook(() => useCourseProgress());

      await result.current.markLessonAsDone(mockLesson, mockCourse);

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false);
        expect(result.current.error).toBe('Failed to update lesson completion status.');
      });
    });

    it('should update course progress optimistically', async () => {
      const onOptimisticUpdate = vi.fn();
      const { result } = renderHook(() => 
        useCourseProgress({ onOptimisticUpdate })
      );

      await result.current.markLessonAsDone(mockLesson, mockCourse);

      expect(onOptimisticUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          progress: expect.any(Number),
        })
      );
    });

    it('should handle duplicate progress entries', async () => {
      // Mock that lesson is already completed
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ 
            data: [{ id: 'existing-completion' }], 
            error: null 
          })),
        })),
        insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      });

      const { result } = renderHook(() => useCourseProgress());

      await result.current.markLessonAsDone(mockLesson, mockCourse);

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false);
        expect(result.current.error).toBeNull();
      });
    });
  });

  describe('Progress Calculation', () => {
    it('should calculate completion percentage correctly', async () => {
      const lessonToMark = { ...mockLesson, id: 'lesson-1' };
      const courseWithLessons: CourseDetailData = {
        ...mockCourse,
        modules: [
          {
            id: 'module-1',
            title: 'Module 1',
            description: 'Test Module',
            module_order: 1,
            module_type: 'module',
            course_id: 'test-course-1',
            space_id: 'test-space',
            lessons: [
              { ...mockLesson, id: 'lesson-1', completed: false },
              { ...mockLesson, id: 'lesson-2', completed: false },
            ],
          },
        ],
      };

      const onOptimisticUpdate = vi.fn();
      const { result } = renderHook(() => 
        useCourseProgress({ onOptimisticUpdate })
      );

      await result.current.markLessonAsDone(lessonToMark, courseWithLessons);

      expect(onOptimisticUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          progress: 50, // 1 out of 2 lessons completed
        })
      );
    });

    it('should handle courses with no lessons', async () => {
      const courseWithoutLessons: CourseDetailData = {
        ...mockCourse,
        modules: [],
      };

      const { result } = renderHook(() => useCourseProgress());

      await result.current.markLessonAsDone(mockLesson, courseWithoutLessons);

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to update lesson completion status.');
      });
    });
  });

  describe('Error Recovery', () => {
    it('should clear error on successful operation', async () => {
      // First operation fails
      vi.clearAllMocks();
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        insert: vi.fn(() => Promise.resolve({ data: null, error: 'Initial error' })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      });

      const { result } = renderHook(() => useCourseProgress());

      await result.current.markLessonAsDone(mockLesson, mockCourse);

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to update lesson completion status.');
      });

      // Reset mock for successful operation
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      });

      await result.current.markLessonAsDone(mockLesson, mockCourse);

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });
  });

  describe('Performance', () => {
    it('should not cause unnecessary re-renders', async () => {
      const { result, rerender } = renderHook(() => useCourseProgress());

      const initialRenderCount = mockSupabase.from.mock.calls.length;

      // Rerender without changes
      rerender();

      expect(mockSupabase.from.mock.calls.length).toBe(initialRenderCount);
    });

    it('should handle concurrent progress updates', async () => {
      const { result } = renderHook(() => useCourseProgress());

      const lesson1 = { ...mockLesson, id: 'lesson-1' };
      const lesson2 = { ...mockLesson, id: 'lesson-2' };

      // Start two concurrent updates
      const update1 = result.current.markLessonAsDone(lesson1, mockCourse);
      const update2 = result.current.markLessonAsDone(lesson2, mockCourse);

      await Promise.all([update1, update2]);

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false);
        expect(result.current.error).toBeNull();
      });
    });
  });

  describe('Mobile Optimizations', () => {
    it('should handle mobile-specific progress updates', async () => {
      const onOptimisticUpdate = vi.fn();
      const { result } = renderHook(() => 
        useCourseProgress({ 
          onOptimisticUpdate,
        })
      );

      await result.current.markLessonAsDone(mockLesson, mockCourse);

      expect(onOptimisticUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          modules: expect.arrayContaining([
            expect.objectContaining({
              lessons: expect.arrayContaining([
                expect.objectContaining({ completed: true }),
              ]),
            }),
          ]),
        })
      );
    });
  });
}); 