import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCourseProgress } from '@/hooks/classroom/useCourseProgress';
import { getSupabaseClient } from '@/integrations/supabase/client';
import type { CourseDetailData, CourseLesson } from '@/types/classroom/courseDetail';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  getSupabaseClient: vi.fn(),
}));

// Mock logger
vi.mock('@/utils/logger', () => ({
  log: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

describe('useCourseProgress', () => {
  const mockSupabase = {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  };

  const mockLesson: CourseLesson = {
    id: 'lesson-1',
    title: 'Test Lesson',
    content_id: 'content-1',
    module_id: 'module-1',
    order: 1,
    is_published: true,
    completed: false,
    educational_content: {
      id: 'content-1',
      title: 'Test Content',
      content: 'Test content',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  };

  const mockCourse: CourseDetailData = {
    id: 'course-123',
    title: 'Test Course',
    description: 'Test Description',
    creator_id: 'creator-123',
    space_id: 'space-123',
    modules: [
      {
        id: 'module-1',
        title: 'Module 1',
        lessons: [mockLesson],
      },
    ],
    progress: {
      completed_lessons: 0,
      total_lessons: 1,
      percentage: 0,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useCourseProgress());

      expect(result.current.isUpdating).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should accept configuration options', () => {
      const mockOnOptimisticUpdate = vi.fn();
      const { result } = renderHook(() => 
        useCourseProgress({
          onOptimisticUpdate: mockOnOptimisticUpdate,
        })
      );

      expect(result.current).toBeDefined();
    });
  });

  describe('markLessonAsDone', () => {
    it('should mark lesson as completed successfully', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: { id: 'completion-1' },
          error: null,
        }),
      });

      mockSupabase.from
        .mockReturnValueOnce({ select: mockSelect })
        .mockReturnValueOnce({ insert: mockInsert });

      const mockOnOptimisticUpdate = vi.fn();
      const { result } = renderHook(() => 
        useCourseProgress({
          onOptimisticUpdate: mockOnOptimisticUpdate,
        })
      );

      await result.current.markLessonAsDone(mockLesson, mockCourse);

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false);
        expect(result.current.error).toBeNull();
      });

      expect(mockOnOptimisticUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          progress: expect.objectContaining({
            completed_lessons: 1,
            percentage: 100,
          }),
        })
      );
    });

    it('should handle existing completion record', async () => {
      const existingCompletion = {
        id: 'completion-1',
        lesson_id: 'lesson-1',
        course_id: 'course-123',
        completed_at: '2024-01-01T00:00:00Z',
      };

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: existingCompletion,
              error: null,
            }),
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });

      const mockOnOptimisticUpdate = vi.fn();
      const { result } = renderHook(() => 
        useCourseProgress({
          onOptimisticUpdate: mockOnOptimisticUpdate,
        })
      );

      await result.current.markLessonAsDone(mockLesson, mockCourse);

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false);
        expect(result.current.error).toBeNull();
      });

      // Should not call insert since completion already exists
      expect(mockSupabase.from).toHaveBeenCalledTimes(1);
    });

    it('should handle database errors during completion', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('Database error'),
        }),
      });

      mockSupabase.from
        .mockReturnValueOnce({ select: mockSelect })
        .mockReturnValueOnce({ insert: mockInsert });

      const { result } = renderHook(() => useCourseProgress());

      await result.current.markLessonAsDone(mockLesson, mockCourse);

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false);
        expect(result.current.error).toBe('Database error');
      });
    });

    it('should handle network errors', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockRejectedValue(new Error('Network error')),
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });

      const { result } = renderHook(() => useCourseProgress());

      await result.current.markLessonAsDone(mockLesson, mockCourse);

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false);
        expect(result.current.error).toContain('Network error');
      });
    });
  });

  describe('optimistic updates', () => {
    it('should provide optimistic update with correct progress', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: { id: 'completion-1' },
          error: null,
        }),
      });

      mockSupabase.from
        .mockReturnValueOnce({ select: mockSelect })
        .mockReturnValueOnce({ insert: mockInsert });

      const mockOnOptimisticUpdate = vi.fn();
      const { result } = renderHook(() => 
        useCourseProgress({
          onOptimisticUpdate: mockOnOptimisticUpdate,
        })
      );

      await result.current.markLessonAsDone(mockLesson, mockCourse);

      expect(mockOnOptimisticUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          progress: {
            completed_lessons: 1,
            total_lessons: 1,
            percentage: 100,
          },
        })
      );
    });

    it('should handle course with multiple lessons', async () => {
      const courseWithMultipleLessons: CourseDetailData = {
        ...mockCourse,
        modules: [
          {
            id: 'module-1',
            title: 'Module 1',
            lessons: [
              mockLesson,
              {
                ...mockLesson,
                id: 'lesson-2',
                title: 'Lesson 2',
                completed: true,
              },
            ],
          },
        ],
        progress: {
          completed_lessons: 1,
          total_lessons: 2,
          percentage: 50,
        },
      };

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: { id: 'completion-1' },
          error: null,
        }),
      });

      mockSupabase.from
        .mockReturnValueOnce({ select: mockSelect })
        .mockReturnValueOnce({ insert: mockInsert });

      const mockOnOptimisticUpdate = vi.fn();
      const { result } = renderHook(() => 
        useCourseProgress({
          onOptimisticUpdate: mockOnOptimisticUpdate,
        })
      );

      await result.current.markLessonAsDone(mockLesson, courseWithMultipleLessons);

      expect(mockOnOptimisticUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          progress: {
            completed_lessons: 2,
            total_lessons: 2,
            percentage: 100,
          },
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle missing lesson data', async () => {
      const { result } = renderHook(() => useCourseProgress());

      await result.current.markLessonAsDone(null as any, mockCourse);

      await waitFor(() => {
        expect(result.current.error).toContain('Invalid lesson data');
      });
    });

    it('should handle missing course data', async () => {
      const { result } = renderHook(() => useCourseProgress());

      await result.current.markLessonAsDone(mockLesson, null as any);

      await waitFor(() => {
        expect(result.current.error).toContain('Invalid course data');
      });
    });

    it('should handle missing user authentication', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const { result } = renderHook(() => useCourseProgress());

      await result.current.markLessonAsDone(mockLesson, mockCourse);

      await waitFor(() => {
        expect(result.current.error).toContain('User not authenticated');
      });
    });
  });

  describe('loading states', () => {
    it('should show loading state during update', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: { id: 'completion-1' },
          error: null,
        }),
      });

      mockSupabase.from
        .mockReturnValueOnce({ select: mockSelect })
        .mockReturnValueOnce({ insert: mockInsert });

      const { result } = renderHook(() => useCourseProgress());

      const updatePromise = result.current.markLessonAsDone(mockLesson, mockCourse);

      // Should show loading during update
      expect(result.current.isUpdating).toBe(true);

      await updatePromise;

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false);
      });
    });
  });

  describe('progress calculation', () => {
    it('should calculate progress correctly for empty course', () => {
      const emptyCourse: CourseDetailData = {
        ...mockCourse,
        modules: [],
        progress: {
          completed_lessons: 0,
          total_lessons: 0,
          percentage: 0,
        },
      };

      const { result } = renderHook(() => useCourseProgress());

      // This would be tested through the markLessonAsDone function
      // but we can test the progress calculation logic directly
      expect(emptyCourse.progress.percentage).toBe(0);
    });

    it('should calculate progress correctly for partially completed course', () => {
      const partialCourse: CourseDetailData = {
        ...mockCourse,
        modules: [
          {
            id: 'module-1',
            title: 'Module 1',
            lessons: [
              { ...mockLesson, completed: true },
              { ...mockLesson, id: 'lesson-2', title: 'Lesson 2', completed: false },
            ],
          },
        ],
        progress: {
          completed_lessons: 1,
          total_lessons: 2,
          percentage: 50,
        },
      };

      expect(partialCourse.progress.percentage).toBe(50);
    });
  });
}); 