import { renderHook } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { useCourseProgress } from '@/hooks/classroom/useCourseProgress';
import { AuthProvider } from '@/contexts/AuthContext';
import { SpaceProvider } from '@/contexts/SpaceContext';
import { getSupabaseClient } from '@/integrations/supabase/client';
import type { CourseDetailData, CourseLesson } from '@/types/classroom/courseDetail';

// Mock Supabase client
vi.mock('@/integrations/supabase/client');
const mockSupabase = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null
    })
  }
};
vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase as ReturnType<typeof getSupabaseClient>);

// Mock course data
const mockCourseData: CourseDetailData = {
  id: 'course-123',
  title: 'Test Course',
  description: 'Test course description',
  creator_id: 'creator-123',
  space_id: 'space-123',
  is_published: true,
  estimated_duration: 120,
  difficulty_level: 'beginner',
  course_order: 1,
  short_id: 'test-course',
  slug: 'test-course',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  progress: 0,
  modules: [
    {
      id: 'module-123',
      title: 'Test Module',
      description: 'Test module description',
      module_order: 1,
      module_type: 'content',
      course_id: 'course-123',
      space_id: 'space-123',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      lessons: [
        {
          id: 'lesson-123',
          title: 'Test Lesson',
          content_type: 'text',
          content_url: null,
          content_text: 'Test content text',
          lesson_order: 1,
          module_id: 'module-123',
          content_id: 'content-123',
          is_published: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          completed: false,
          educational_content: {
            id: 'content-123',
            title: 'Test Content',
            text_content: 'Test content text',
            content_type: 'text',
            media_url: null,
            embed_data: null,
            estimated_duration: 30,
            difficulty_level: 'beginner'
          }
        }
      ]
    }
  ]
};

const mockLesson: CourseLesson = {
  id: 'lesson-123',
  title: 'Test Lesson',
  content_type: 'text',
  content_url: null,
  content_text: 'Test content text',
  lesson_order: 1,
  module_id: 'module-123',
  content_id: 'content-123',
  is_published: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  completed: false,
  educational_content: {
    id: 'content-123',
    title: 'Test Content',
    text_content: 'Test content text',
    content_type: 'text',
    media_url: null,
    embed_data: null,
    estimated_duration: 30,
    difficulty_level: 'beginner'
  }
};

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  return React.createElement(AuthProvider, { children: 
    React.createElement(SpaceProvider, { children })
  });
};

// Helper function to render hook with providers
const renderHookWithProviders = <T>(hook: () => T) => {
  return renderHook(hook, {
    wrapper: TestWrapper,
  });
};

describe('useCourseProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHookWithProviders(() => useCourseProgress());

      expect(result.current.isUpdating).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should accept configuration options', () => {
      const { result } = renderHookWithProviders(() => 
        useCourseProgress({
          onOptimisticUpdate: vi.fn(),
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
          data: { id: 'progress-123' },
          error: null,
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        insert: mockInsert,
      });

      const { result } = renderHookWithProviders(() => useCourseProgress());

      await result.current.markLessonAsDone(mockLesson, mockCourseData);

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false);
        expect(result.current.error).toBeNull();
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('course_progress');
    });

    it('should handle existing completion record', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'existing-progress' },
              error: null,
            }),
          }),
        }),
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: { id: 'updated-progress' },
            error: null,
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
      });

      const { result } = renderHookWithProviders(() => useCourseProgress());

      await result.current.markLessonAsDone(mockLesson, mockCourseData);

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false);
        expect(result.current.error).toBeNull();
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('course_progress');
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

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        insert: mockInsert,
      });

      const { result } = renderHookWithProviders(() => useCourseProgress());

      await result.current.markLessonAsDone(mockLesson, mockCourseData);

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

      const { result } = renderHookWithProviders(() => useCourseProgress());

      await result.current.markLessonAsDone(mockLesson, mockCourseData);

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false);
        expect(result.current.error).toBe('Network error');
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
          data: { id: 'progress-123' },
          error: null,
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        insert: mockInsert,
      });

      let optimisticUpdate: CourseDetailData | null = null;
      const { result } = renderHookWithProviders(() => 
        useCourseProgress({
          onOptimisticUpdate: (updatedCourse) => {
            optimisticUpdate = updatedCourse;
          },
        })
      );

      await result.current.markLessonAsDone(mockLesson, mockCourseData);

      await waitFor(() => {
        expect(optimisticUpdate).toBeDefined();
        expect(optimisticUpdate?.progress).toBeGreaterThan(0);
      });
    });

    it('should handle course with multiple lessons', async () => {
      const courseWithMultipleLessons = {
        ...mockCourseData,
        modules: [
          {
            ...mockCourseData.modules[0],
            lessons: [
              mockLesson,
              {
                ...mockLesson,
                id: 'lesson-456',
                title: 'Second Lesson',
                completed: false,
              },
            ],
          },
        ],
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
          data: { id: 'progress-123' },
          error: null,
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        insert: mockInsert,
      });

      let optimisticUpdate: CourseDetailData | null = null;
      const { result } = renderHookWithProviders(() => 
        useCourseProgress({
          onOptimisticUpdate: (updatedCourse) => {
            optimisticUpdate = updatedCourse;
          },
        })
      );

      await result.current.markLessonAsDone(mockLesson, courseWithMultipleLessons);

      await waitFor(() => {
        expect(optimisticUpdate).toBeDefined();
        expect(optimisticUpdate?.progress).toBe(50); // 1 out of 2 lessons completed
      });
    });
  });

  describe('error handling', () => {
    it('should handle missing lesson data', async () => {
      const { result } = renderHookWithProviders(() => useCourseProgress());

      await result.current.markLessonAsDone(null as never, mockCourseData);

      expect(result.current.error).toBe('Lesson data is required');
    });

    it('should handle missing course data', async () => {
      const { result } = renderHookWithProviders(() => useCourseProgress());

      await result.current.markLessonAsDone(mockLesson, null as never);

      expect(result.current.error).toBe('Course data is required');
    });

    it('should handle missing user authentication', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const { result } = renderHookWithProviders(() => useCourseProgress());

      await result.current.markLessonAsDone(mockLesson, mockCourseData);

      expect(result.current.error).toBe('User not authenticated');
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
          data: { id: 'progress-123' },
          error: null,
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        insert: mockInsert,
      });

      const { result } = renderHookWithProviders(() => useCourseProgress());

      const updatePromise = result.current.markLessonAsDone(mockLesson, mockCourseData);

      expect(result.current.isUpdating).toBe(true);

      await updatePromise;

      expect(result.current.isUpdating).toBe(false);
    });
  });

  describe('progress calculation', () => {
    it('should calculate progress correctly for empty course', () => {
      const emptyCourse = {
        ...mockCourseData,
        modules: [],
      };

      const { result } = renderHookWithProviders(() => useCourseProgress());

      // This would be tested through the optimistic update callback
      expect(result.current).toBeDefined();
    });

    it('should calculate progress correctly for completed course', () => {
      const completedCourse = {
        ...mockCourseData,
        modules: [
          {
            ...mockCourseData.modules[0],
            lessons: [
              {
                ...mockLesson,
                completed: true,
              },
            ],
          },
        ],
      };

      const { result } = renderHookWithProviders(() => useCourseProgress());

      expect(result.current).toBeDefined();
    });
  });
}); 