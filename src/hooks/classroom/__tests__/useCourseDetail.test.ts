import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCourseDetail } from '../useCourseDetail';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { EducationalContentService } from '@/services/EducationalContentService';
import type { CourseDetailData } from '@/types/classroom/courseDetail';

// Mock dependencies
vi.mock('@/integrations/supabase/client');
vi.mock('@/services/EducationalContentService');
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
    getCourse: vi.fn(() => null),
    setCourse: vi.fn(),
    updateCourseProgress: vi.fn(),
  }),
}));

const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  })),
};

const mockEducationalContentService = {
  getContentById: vi.fn(),
  createContent: vi.fn(),
  updateContent: vi.fn(),
  deleteContent: vi.fn(),
};

describe('useCourseDetail', () => {
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
            content_id: null,
            page_type: 'lesson',
            estimated_duration: null,
            difficulty_level: null,
          },
        ],
      },
    ],
    progress: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getSupabaseClient as any).mockReturnValue(mockSupabase);
    (EducationalContentService as any).mockImplementation(() => mockEducationalContentService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useCourseDetail());

      expect(result.current.course).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.fetchCourseDetails).toBeDefined();
    });
  });

  describe('Course Fetching', () => {
    it('should fetch course data successfully', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [mockCourse], error: null })),
        })),
      });

      const { result } = renderHook(() => useCourseDetail());

      await result.current.fetchCourseDetails('test-course-1');

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.course).toEqual(mockCourse);
      expect(result.current.error).toBeNull();
    });

    it('should handle course not found', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      });

      const { result } = renderHook(() => useCourseDetail());

      await result.current.fetchCourseDetails('non-existent-course');

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.course).toBeNull();
      expect(result.current.error).toBe('Course not found');
    });

    it('should handle database errors', async () => {
      const dbError = 'Database connection failed';
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: dbError })),
        })),
      });

      const { result } = renderHook(() => useCourseDetail());

      await result.current.fetchCourseDetails('test-course-1');

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.course).toBeNull();
      expect(result.current.error).toBe('Failed to fetch course data');
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.reject(networkError)),
        })),
      });

      const { result } = renderHook(() => useCourseDetail());

      await result.current.fetchCourseDetails('test-course-1');

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.course).toBeNull();
      expect(result.current.error).toBe('Failed to fetch course data');
    });
  });

  describe('Refetch Functionality', () => {
    it('should refetch course data', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [mockCourse], error: null })),
        })),
      });

      const { result } = renderHook(() => useCourseDetail());

      await result.current.fetchCourseDetails('test-course-1');

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Clear the mock to verify refetch calls it again
      vi.clearAllMocks();
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [mockCourse], error: null })),
        })),
      });

      await result.current.refetch();

      expect(mockSupabase.from).toHaveBeenCalledWith('courses');
    });

    it('should handle refetch errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [mockCourse], error: null })),
        })),
      });

      const { result } = renderHook(() => useCourseDetail());

      await result.current.fetchCourseDetails('test-course-1');

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Mock refetch to fail
      vi.clearAllMocks();
      const refetchError = 'Refetch failed';
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: refetchError })),
        })),
      });

      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to fetch course data');
      });
    });
  });

  describe('Educational Content Integration', () => {
    it('should fetch educational content for lessons', async () => {
      const mockContent = {
        id: 'content-1',
        title: 'Test Content',
        content_type: 'text',
        text_content: 'Test content text',
        media_url: null,
        embed_data: null,
        estimated_duration: 10,
        difficulty_level: 'beginner',
      };

      mockEducationalContentService.getContentById.mockResolvedValue(mockContent);
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [mockCourse], error: null })),
        })),
      });

      const { result } = renderHook(() => useCourseDetail());

      await result.current.fetchCourseDetails('test-course-1');

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockEducationalContentService.getContentById).toHaveBeenCalled();
    });

    it('should handle educational content fetch errors gracefully', async () => {
      mockEducationalContentService.getContentById.mockRejectedValue(new Error('Content fetch failed'));
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [mockCourse], error: null })),
        })),
      });

      const { result } = renderHook(() => useCourseDetail());

      await result.current.fetchCourseDetails('test-course-1');

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should still load the course even if content fetch fails
      expect(result.current.course).toEqual(mockCourse);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Performance', () => {
    it('should not cause unnecessary re-renders', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [mockCourse], error: null })),
        })),
      });

      const { result, rerender } = renderHook(() => useCourseDetail());

      await result.current.fetchCourseDetails('test-course-1');

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialRenderCount = mockSupabase.from.mock.calls.length;

      // Rerender with same course ID
      rerender();

      // Should not trigger another fetch
      expect(mockSupabase.from.mock.calls.length).toBe(initialRenderCount);
    });

    it('should handle concurrent requests', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [mockCourse], error: null })),
        })),
      });

      const { result } = renderHook(() => useCourseDetail());

      await result.current.fetchCourseDetails('test-course-1');

      // Trigger multiple refetches
      const promises = [
        result.current.refetch(),
        result.current.refetch(),
        result.current.refetch(),
      ];

      await Promise.all(promises);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.course).toEqual(mockCourse);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Error Recovery', () => {
    it('should recover from errors on successful refetch', async () => {
      // First fetch fails
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: 'Initial error' })),
        })),
      });

      const { result } = renderHook(() => useCourseDetail());

      await result.current.fetchCourseDetails('test-course-1');

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to fetch course data');

      // Refetch succeeds
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [mockCourse], error: null })),
        })),
      });

      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.course).toEqual(mockCourse);
      });
    });
  });
}); 