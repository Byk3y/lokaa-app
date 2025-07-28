import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCourseDetail } from '@/hooks/classroom/useCourseDetail';
import { getSupabaseClient } from '@/integrations/supabase/client';
import type { CourseDetailData } from '@/types/classroom/courseDetail';

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

describe('useCourseDetail', () => {
  const mockSupabase = {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  };

  const mockCourseData: CourseDetailData = {
    id: 'course-123',
    title: 'Test Course',
    description: 'Test Description',
    creator_id: 'creator-123',
    space_id: 'space-123',
    modules: [
      {
        id: 'module-1',
        title: 'Module 1',
        lessons: [
          {
            id: 'lesson-1',
            title: 'Lesson 1',
            content_id: 'content-1',
            module_id: 'module-1',
            order: 1,
            is_published: true,
            completed: false,
            educational_content: {
              id: 'content-1',
              title: 'Lesson 1 Content',
              content: 'Test content',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
          },
        ],
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
      const { result } = renderHook(() => useCourseDetail());

      expect(result.current.course).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.loadingPhase).toBe('idle');
    });

    it('should accept configuration options', () => {
      const { result } = renderHook(() => 
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

      const { result } = renderHook(() => useCourseDetail());

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

      const { result } = renderHook(() => useCourseDetail());

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

      const { result } = renderHook(() => useCourseDetail());

      await result.current.fetchCourseDetails('course-123');

      await waitFor(() => {
        expect(result.current.course).toBeNull();
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toContain('Network error');
      });
    });

    it('should handle course not found', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116', message: 'No rows returned' },
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });

      const { result } = renderHook(() => useCourseDetail());

      await result.current.fetchCourseDetails('nonexistent-course');

      await waitFor(() => {
        expect(result.current.course).toBeNull();
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toContain('Course not found');
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

      const { result } = renderHook(() => useCourseDetail());

      // First fetch
      await result.current.fetchCourseDetails('course-123');
      await waitFor(() => expect(result.current.course).toEqual(mockCourseData));

      // Second fetch should use cache
      await result.current.fetchCourseDetails('course-123');
      
      // Should only call database once
      expect(mockSupabase.from).toHaveBeenCalledTimes(1);
    });

    it('should invalidate cache when requested', async () => {
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

      const { result } = renderHook(() => useCourseDetail());

      // First fetch
      await result.current.fetchCourseDetails('course-123');
      await waitFor(() => expect(result.current.course).toEqual(mockCourseData));

      // Invalidate cache
      result.current.invalidateCache();

      // Second fetch should hit database again
      await result.current.fetchCourseDetails('course-123');
      
      // Should call database twice
      expect(mockSupabase.from).toHaveBeenCalledTimes(2);
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

      const { result } = renderHook(() => useCourseDetail());

      await result.current.fetchCourseDetails('course-123');
      await waitFor(() => expect(result.current.course).toEqual(mockCourseData));

      // Refetch
      await result.current.refetch();

      expect(mockSupabase.from).toHaveBeenCalledTimes(2);
    });

    it('should handle refetch errors', async () => {
      const mockSelect = vi.fn()
        .mockReturnValueOnce({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockCourseData,
              error: null,
            }),
          }),
        })
        .mockReturnValueOnce({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('Refetch error'),
            }),
          }),
        });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });

      const { result } = renderHook(() => useCourseDetail());

      await result.current.fetchCourseDetails('course-123');
      await waitFor(() => expect(result.current.course).toEqual(mockCourseData));

      // Refetch with error
      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.error).toBe('Refetch error');
      });
    });
  });

  describe('mobile optimizations', () => {
    it('should use mobile-optimized queries when enabled', async () => {
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

      const { result } = renderHook(() => 
        useCourseDetail({ enableMobileOptimizations: true })
      );

      await result.current.fetchCourseDetails('course-123');

      expect(mockSupabase.from).toHaveBeenCalled();
      // Should use optimized query structure for mobile
    });

    it('should handle offline mode', async () => {
      // Mock navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const { result } = renderHook(() => 
        useCourseDetail({ enableOfflineSupport: true })
      );

      await result.current.fetchCourseDetails('course-123');

      await waitFor(() => {
        expect(result.current.isOffline).toBe(true);
      });
    });
  });

  describe('retry logic', () => {
    it('should retry on error when enabled', async () => {
      const mockSelect = vi.fn()
        .mockReturnValueOnce({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockRejectedValue(new Error('Temporary error')),
          }),
        })
        .mockReturnValueOnce({
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

      const { result } = renderHook(() => 
        useCourseDetail({ retryOnError: true })
      );

      await result.current.fetchCourseDetails('course-123');

      await waitFor(() => {
        expect(result.current.course).toEqual(mockCourseData);
        expect(result.current.retryCount).toBeGreaterThan(0);
      });
    });
  });

  describe('loading states', () => {
    it('should show loading phases', async () => {
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

      const { result } = renderHook(() => useCourseDetail());

      const fetchPromise = result.current.fetchCourseDetails('course-123');

      // Should show loading during fetch
      expect(result.current.loading).toBe(true);
      expect(result.current.loadingPhase).toBe('initial');

      await fetchPromise;

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.loadingPhase).toBe('complete');
      });
    });
  });
}); 