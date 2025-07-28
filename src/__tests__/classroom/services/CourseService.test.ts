import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CourseService } from '@/services/CourseService';
import { getSupabaseClient } from '@/integrations/supabase/client';
import type { CourseDetailData, CourseModule } from '@/types/classroom/courseDetail';

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

describe('CourseService', () => {
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
    is_published: true,
    estimated_duration: 60,
    difficulty_level: 'beginner',
    course_order: 1,
    short_id: 'test123',
    slug: 'test-course',
    space_id: 'space-123',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    modules: [
      {
        id: 'module-1',
        title: 'Module 1',
        description: 'Test module',
        module_order: 1,
        module_type: 'module',
        course_id: 'course-123',
        space_id: 'space-123',
        lessons: [],
      },
    ],
    progress: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getCourseById', () => {
    it('should fetch course by ID successfully', async () => {
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

      const courseService = new CourseService();
      const result = await courseService.fetchCourseDetails('course-123');

      expect(result).toEqual(mockCourseData);
      expect(mockSupabase.from).toHaveBeenCalledWith('courses');
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

      const courseService = new CourseService();
      await expect(courseService.fetchCourseDetails('nonexistent-course'))
        .rejects.toThrow('Course not found');
    });

    it('should handle database errors', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: new Error('Database error'),
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });

      await expect(CourseService.getCourseById('course-123'))
        .rejects.toThrow('Database error');
    });
  });

  describe('createCourse', () => {
    it('should create course successfully', async () => {
      const courseData = {
        title: 'New Course',
        description: 'New Description',
        space_id: 'space-123',
        creator_id: 'creator-123',
      };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: { ...courseData, id: 'new-course-123' },
          error: null,
        }),
      });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      });

      const result = await CourseService.createCourse(courseData);

      expect(result).toEqual(expect.objectContaining({
        ...courseData,
        id: 'new-course-123',
      }));
      expect(mockSupabase.from).toHaveBeenCalledWith('courses');
    });

    it('should handle creation errors', async () => {
      const courseData = {
        title: 'New Course',
        description: 'New Description',
        space_id: 'space-123',
        creator_id: 'creator-123',
      };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('Creation failed'),
        }),
      });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      });

      await expect(CourseService.createCourse(courseData))
        .rejects.toThrow('Creation failed');
    });
  });

  describe('updateCourse', () => {
    it('should update course successfully', async () => {
      const updateData = {
        title: 'Updated Course',
        description: 'Updated Description',
      };

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: { ...mockCourseData, ...updateData },
            error: null,
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      });

      const result = await CourseService.updateCourse('course-123', updateData);

      expect(result).toEqual(expect.objectContaining(updateData));
      expect(mockSupabase.from).toHaveBeenCalledWith('courses');
    });

    it('should handle update errors', async () => {
      const updateData = {
        title: 'Updated Course',
      };

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: null,
            error: new Error('Update failed'),
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      });

      await expect(CourseService.updateCourse('course-123', updateData))
        .rejects.toThrow('Update failed');
    });
  });

  describe('deleteCourse', () => {
    it('should delete course successfully', async () => {
      const mockDelete = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'course-123' },
            error: null,
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        delete: mockDelete,
      });

      const result = await CourseService.deleteCourse('course-123');

      expect(result).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('courses');
    });

    it('should handle deletion errors', async () => {
      const mockDelete = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: new Error('Deletion failed'),
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        delete: mockDelete,
      });

      await expect(CourseService.deleteCourse('course-123'))
        .rejects.toThrow('Deletion failed');
    });
  });

  describe('getCoursesBySpace', () => {
    it('should fetch courses by space ID successfully', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [mockCourseData],
            error: null,
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });

      const result = await CourseService.getCoursesBySpace('space-123');

      expect(result).toEqual([mockCourseData]);
      expect(mockSupabase.from).toHaveBeenCalledWith('courses');
    });

    it('should handle empty results', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });

      const result = await CourseService.getCoursesBySpace('space-123');

      expect(result).toEqual([]);
    });
  });

  describe('validateCoursePermissions', () => {
    it('should validate owner permissions successfully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'creator-123' } },
        error: null,
      });

      const result = await CourseService.validateCoursePermissions(
        mockCourseData,
        'edit'
      );

      expect(result).toBe(true);
    });

    it('should validate admin permissions', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-123' } },
        error: null,
      });

      // Mock admin check
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'admin' },
              error: null,
            }),
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });

      const result = await CourseService.validateCoursePermissions(
        mockCourseData,
        'edit'
      );

      expect(result).toBe(true);
    });

    it('should reject insufficient permissions', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

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

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });

      await expect(
        CourseService.validateCoursePermissions(mockCourseData, 'edit')
      ).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('createModule', () => {
    it('should create module successfully', async () => {
      const moduleData = {
        title: 'New Module',
        course_id: 'course-123',
        order: 1,
      };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: { ...moduleData, id: 'module-123' },
          error: null,
        }),
      });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      });

      const result = await CourseService.createModule(moduleData);

      expect(result).toEqual(expect.objectContaining({
        ...moduleData,
        id: 'module-123',
      }));
      expect(mockSupabase.from).toHaveBeenCalledWith('course_modules');
    });
  });

  describe('updateModule', () => {
    it('should update module successfully', async () => {
      const updateData = {
        title: 'Updated Module',
      };

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: { id: 'module-123', ...updateData },
            error: null,
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      });

      const result = await CourseService.updateModule('module-123', updateData);

      expect(result).toEqual(expect.objectContaining(updateData));
      expect(mockSupabase.from).toHaveBeenCalledWith('course_modules');
    });
  });

  describe('deleteModule', () => {
    it('should delete module successfully', async () => {
      const mockDelete = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'module-123' },
            error: null,
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        delete: mockDelete,
      });

      const result = await CourseService.deleteModule('module-123');

      expect(result).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('course_modules');
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

      await CourseService.getCourseById('course-123', { 
        enableMobileOptimizations: true 
      });

      // Should use optimized query structure for mobile
      expect(mockSupabase.from).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockRejectedValue(new Error('Network error')),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      });

      await expect(CourseService.getCourseById('course-123'))
        .rejects.toThrow('Network error');
    });

    it('should handle authentication errors', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Authentication failed'),
      });

      await expect(
        CourseService.validateCoursePermissions(mockCourseData, 'edit')
      ).rejects.toThrow('User not authenticated');
    });
  });

  describe('caching', () => {
    it('should implement caching for repeated requests', async () => {
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

      // First request
      await CourseService.getCourseById('course-123');
      
      // Second request should use cache
      await CourseService.getCourseById('course-123');

      // Should only call database once due to caching
      expect(mockSupabase.from).toHaveBeenCalledTimes(1);
    });
  });
}); 