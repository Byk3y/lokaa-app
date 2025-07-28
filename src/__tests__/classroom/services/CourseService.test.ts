import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CourseService } from '@/services/CourseService';
import { getSupabaseClient } from '@/integrations/supabase/client';
import type { CourseDetailData } from '@/types/classroom/courseDetail';

// Mock Supabase client
vi.mock('@/integrations/supabase/client');
vi.mock('@/utils/logger', () => ({
  log: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

const mockSupabase = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null
    })
  }
};

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

describe('CourseService', () => {
  let courseService: CourseService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase as ReturnType<typeof getSupabaseClient>);
    courseService = new CourseService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchCourseDetails', () => {
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

      const result = await courseService.fetchCourseDetails('course-123');

      expect(result).toEqual(expect.objectContaining({
        id: 'course-123',
        title: 'Test Course',
      }));
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

      await expect(courseService.fetchCourseDetails('nonexistent-course'))
        .rejects.toThrow('No rows returned');
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

      await expect(courseService.fetchCourseDetails('course-123'))
        .rejects.toThrow('Database error');
    });
  });

  describe('createCourse', () => {
    it('should create course successfully', async () => {
      const courseData = {
        title: 'New Course',
        description: 'New course description',
        creator_id: 'creator-123',
        space_id: 'space-123',
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

      const result = await courseService.createCourse(courseData);

      expect(result).toEqual(expect.objectContaining({
        id: 'new-course-123',
        title: 'New Course',
      }));

      expect(mockSupabase.from).toHaveBeenCalledWith('courses');
    });

    it('should handle creation errors', async () => {
      const courseData = {
        title: 'New Course',
        description: 'New course description',
        creator_id: 'creator-123',
        space_id: 'space-123',
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

      await expect(courseService.createCourse(courseData))
        .rejects.toThrow('Creation failed');
    });
  });

  describe('updateCourse', () => {
    it('should update course successfully', async () => {
      const updateData = {
        title: 'Updated Course',
        description: 'Updated description',
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

      const result = await courseService.updateCourse('course-123', updateData);

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

      await expect(courseService.updateCourse('course-123', updateData))
        .rejects.toThrow('Update failed');
    });
  });

  describe('deleteCourse', () => {
    it('should delete course successfully', async () => {
      const mockDelete = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      mockSupabase.from.mockReturnValue({
        delete: mockDelete,
      });

      await courseService.deleteCourse('course-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('courses');
    });

    it('should handle deletion errors', async () => {
      const mockDelete = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('Deletion failed'),
        }),
      });

      mockSupabase.from.mockReturnValue({
        delete: mockDelete,
      });

      await expect(courseService.deleteCourse('course-123'))
        .rejects.toThrow('Deletion failed');
    });
  });

  describe('createModule', () => {
    it('should create module successfully', async () => {
      const moduleData = {
        title: 'New Module',
        description: 'New module description',
        course_id: 'course-123',
        module_order: 1,
        module_type: 'content' as const,
      };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: { ...moduleData, id: 'new-module-123' },
          error: null,
        }),
      });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      });

      const result = await courseService.createModule(moduleData);

      expect(result).toEqual(expect.objectContaining({
        id: 'new-module-123',
        title: 'New Module',
      }));

      expect(mockSupabase.from).toHaveBeenCalledWith('course_modules');
    });
  });

  describe('updateModule', () => {
    it('should update module successfully', async () => {
      const updateData = {
        title: 'Updated Module',
        description: 'Updated description',
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

      const result = await courseService.updateModule('module-123', updateData);

      expect(result).toEqual(expect.objectContaining(updateData));
      expect(mockSupabase.from).toHaveBeenCalledWith('course_modules');
    });
  });

  describe('deleteModule', () => {
    it('should delete module successfully', async () => {
      const mockDelete = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      mockSupabase.from.mockReturnValue({
        delete: mockDelete,
      });

      await courseService.deleteModule('module-123');

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

      await courseService.fetchCourseDetails('course-123', { 
        includeProgress: true,
        userId: 'test-user-id'
      });

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

      await expect(courseService.fetchCourseDetails('course-123'))
        .rejects.toThrow('Network error');
    });

    it('should handle authentication errors', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

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

      // This should still work but with different permissions
      const result = await courseService.fetchCourseDetails('course-123');
      expect(result).toBeDefined();
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
      await courseService.fetchCourseDetails('course-123');
      
      // Second request should use cache
      await courseService.fetchCourseDetails('course-123');

      // Should only call database once due to caching
      expect(mockSupabase.from).toHaveBeenCalledTimes(1);
    });
  });
}); 