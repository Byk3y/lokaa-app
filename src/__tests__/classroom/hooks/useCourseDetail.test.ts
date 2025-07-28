import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { useCourseDetail } from '@/hooks/classroom/useCourseDetail';
import { AuthProvider } from '@/contexts/AuthContext';
import { SpaceProvider } from '@/contexts/SpaceContext';
import { getSupabaseClient } from '@/integrations/supabase/client';
import type { CourseDetailData } from '@/types/classroom/courseDetail';

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
          module_id: 'module-123',
          course_id: 'course-123',
          content_id: 'content-123',
          lesson_order: 1,
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

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  return React.createElement(AuthProvider, {}, 
    React.createElement(SpaceProvider, {}, children)
  );
};

// Helper function to render hook with providers
const renderHookWithProviders = <T>(hook: () => T) => {
  return renderHook(hook, {
    wrapper: TestWrapper,
  });
};

describe('useCourseDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHookWithProviders(() => useCourseDetail());

      expect(result.current.course).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.loadingPhase).toBe('idle');
    });

    it('should accept configuration options', () => {
      const { result } = renderHookWithProviders(() => 
        useCourseDetail({
          enableMobileOptimizations: true,
          enableOfflineSupport: true,
          retryOnError: true,
        })
      );

      expect(result.current).toBeDefined();
    });
  });

  describe('fetchCourseDetails', () => {
    it('should fetch course data successfully', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockCourseData,
            error: null,
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });

      const { result } = renderHookWithProviders(() => useCourseDetail());

      await result.current.fetchCourseDetails('course-123');

      await waitFor(() => {
        expect(result.current.course).toEqual(mockCourseData);
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('courses');
    });

    it('should handle database errors', async () => {
      const mockError = new Error('Database error');
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: mockError,
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });

      const { result } = renderHookWithProviders(() => useCourseDetail());

      await result.current.fetchCourseDetails('course-123');

      await waitFor(() => {
        expect(result.current.course).toBeNull();
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe('Database error');
      });
    });

    it('should handle network errors', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockRejectedValue(new Error('Network error')),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });

      const { result } = renderHookWithProviders(() => useCourseDetail());

      await result.current.fetchCourseDetails('course-123');

      await waitFor(() => {
        expect(result.current.course).toBeNull();
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe('Network error');
      });
    });
  });

  describe('caching', () => {
    it('should cache course data', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockCourseData,
            error: null,
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });

      const { result } = renderHookWithProviders(() => useCourseDetail());

      // First fetch
      await result.current.fetchCourseDetails('course-123');
      
      // Second fetch should use cache
      await result.current.fetchCourseDetails('course-123');

      // Should only call database once
      expect(mockSupabase.from).toHaveBeenCalledTimes(1);
    });

    it('should invalidate cache', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockCourseData,
            error: null,
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });

      const { result } = renderHookWithProviders(() => useCourseDetail());

      await result.current.fetchCourseDetails('course-123');
      result.current.invalidateCache();
      await result.current.fetchCourseDetails('course-123');

      // Should call database twice after invalidation
      expect(mockSupabase.from).toHaveBeenCalledTimes(2);
    });
  });

  describe('mobile optimizations', () => {
    it('should enable mobile optimizations', () => {
      const { result } = renderHookWithProviders(() => 
        useCourseDetail({ enableMobileOptimizations: true })
      );

      expect(result.current).toBeDefined();
    });

    it('should handle offline support', () => {
      const { result } = renderHookWithProviders(() => 
        useCourseDetail({ enableOfflineSupport: true })
      );

      expect(result.current).toBeDefined();
    });
  });

  describe('retry logic', () => {
    it('should retry on error when enabled', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockRejectedValue(new Error('Network error')),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });

      const { result } = renderHookWithProviders(() => 
        useCourseDetail({ retryOnError: true })
      );

      await result.current.fetchCourseDetails('course-123');

      await waitFor(() => {
        expect(result.current.retryCount).toBeGreaterThan(0);
      });
    });
  });

  describe('loading states', () => {
    it('should show loading state during fetch', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockCourseData,
            error: null,
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });

      const { result } = renderHookWithProviders(() => useCourseDetail());

      const fetchPromise = result.current.fetchCourseDetails('course-123');

      expect(result.current.loading).toBe(true);
      expect(result.current.loadingPhase).toBe('fetching');

      await fetchPromise;

      expect(result.current.loading).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle missing course ID', async () => {
      const { result } = renderHookWithProviders(() => useCourseDetail());

      await result.current.fetchCourseDetails('');

      expect(result.current.error).toBe('Course ID is required');
    });

    it('should handle invalid course data', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });

      const { result } = renderHookWithProviders(() => useCourseDetail());

      await result.current.fetchCourseDetails('course-123');

      await waitFor(() => {
        expect(result.current.error).toBe('Course not found');
      });
    });
  });

  describe('refetch functionality', () => {
    it('should refetch course data', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockCourseData,
            error: null,
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });

      const { result } = renderHookWithProviders(() => useCourseDetail());

      await result.current.fetchCourseDetails('course-123');
      await result.current.refetch();

      expect(mockSupabase.from).toHaveBeenCalledTimes(2);
    });

    it('should silent refetch without loading state', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockCourseData,
            error: null,
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });

      const { result } = renderHookWithProviders(() => useCourseDetail());

      await result.current.fetchCourseDetails('course-123');
      await result.current.silentRefetch();

      expect(mockSupabase.from).toHaveBeenCalledTimes(2);
    });
  });

  describe('offline detection', () => {
    it('should detect offline state', () => {
      // Mock navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const { result } = renderHookWithProviders(() => useCourseDetail());

      expect(result.current.isOffline).toBe(true);
    });

    it('should detect online state', () => {
      // Mock navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      const { result } = renderHookWithProviders(() => useCourseDetail());

      expect(result.current.isOffline).toBe(false);
    });
  });
});