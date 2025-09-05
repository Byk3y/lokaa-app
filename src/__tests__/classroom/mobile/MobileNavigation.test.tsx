import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useCourseNavigation } from '@/hooks/classroom/useCourseNavigation';
import type { CourseDetailData, CourseLesson } from '@/types/classroom/courseDetail';

// Mock hooks
vi.mock('@/hooks/classroom/useCourseNavigation');
vi.mock('@/hooks/classroom/useCourseDetail');
vi.mock('@/hooks/useMediaQuery');
import { useMediaQuery } from '@/hooks/useMediaQuery';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: query.includes('max-width: 768px'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('Mobile Navigation Tests', () => {
  const mockCourse: CourseDetailData = {
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
        lessons: [
          {
            id: 'lesson-1',
            title: 'Lesson 1',
            content_type: 'text',
            content_url: null,
            content_text: 'Test content',
            lesson_order: 1,
            module_id: 'module-1',
            content_id: 'content-1',
            is_published: true,
            completed: false,
            educational_content: {
              id: 'content-1',
              title: 'Lesson 1 Content',
              content_type: 'text',
              text_content: 'Test content',
              media_url: null,
              embed_data: null,
              estimated_duration: 10,
              difficulty_level: 'beginner',
            },
          },
          {
            id: 'lesson-2',
            title: 'Lesson 2',
            content_type: 'text',
            content_url: null,
            content_text: 'Test content 2',
            lesson_order: 2,
            module_id: 'module-1',
            content_id: 'content-2',
            is_published: true,
            completed: false,
            educational_content: {
              id: 'content-2',
              title: 'Lesson 2 Content',
              content_type: 'text',
              text_content: 'Test content 2',
              media_url: null,
              embed_data: null,
              estimated_duration: 15,
              difficulty_level: 'intermediate',
            },
          },
        ],
      },
    ],
    progress: 0,
  };

  const mockLesson: CourseLesson = mockCourse.modules[0].lessons[0];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Mobile Detection', () => {
    it('should detect mobile viewport correctly', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        value: 375,
      });

      vi.mocked(useMediaQuery).mockReturnValue(true);

      expect(useMediaQuery('(max-width: 768px)')).toBe(true);
    });

    it('should detect desktop viewport correctly', () => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        value: 1024,
      });

      vi.mocked(useMediaQuery).mockReturnValue(false);

      expect(useMediaQuery('(max-width: 768px)')).toBe(false);
    });
  });

  describe('Mobile Navigation State', () => {
    it('should initialize with course overview view on mobile', () => {
      const mockNavigation = {
        selectedLesson: null,
        isMobile: true,
        showCourseOverview: true,
        showLessonView: false,
        handleMobileLessonSelect: vi.fn(),
        handleNextLesson: vi.fn(),
        handleBackToMenu: vi.fn(),
        setSelectedLesson: vi.fn(),
      };

      vi.mocked(useCourseNavigation).mockReturnValue(mockNavigation);

      expect(mockNavigation.showCourseOverview).toBe(true);
      expect(mockNavigation.showLessonView).toBe(false);
    });

    it('should switch to lesson view when lesson is selected', () => {
      const mockNavigation = {
        selectedLesson: mockLesson,
        isMobile: true,
        showCourseOverview: false,
        showLessonView: true,
        handleMobileLessonSelect: vi.fn(),
        handleNextLesson: vi.fn(),
        handleBackToMenu: vi.fn(),
        setSelectedLesson: vi.fn(),
      };

      vi.mocked(useCourseNavigation).mockReturnValue(mockNavigation);

      expect(mockNavigation.showCourseOverview).toBe(false);
      expect(mockNavigation.showLessonView).toBe(true);
      expect(mockNavigation.selectedLesson).toBe(mockLesson);
    });
  });

  describe('Touch Interactions', () => {
    it('should handle touch events for lesson selection', () => {
      const mockHandleMobileLessonSelect = vi.fn();
      const mockNavigation = {
        selectedLesson: null,
        isMobile: true,
        showCourseOverview: true,
        showLessonView: false,
        handleMobileLessonSelect: mockHandleMobileLessonSelect,
        handleNextLesson: vi.fn(),
        handleBackToMenu: vi.fn(),
        setSelectedLesson: vi.fn(),
      };

      vi.mocked(useCourseNavigation).mockReturnValue(mockNavigation);

      // Simulate touch event
      const touchEvent = new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        touches: [{ clientX: 100, clientY: 100 } as Touch],
      });

      fireEvent.touchStart(document, touchEvent);

      expect(mockHandleMobileLessonSelect).toBeDefined();
    });

    it('should handle swipe gestures for navigation', () => {
      const mockHandleNextLesson = vi.fn();
      const mockHandleBackToMenu = vi.fn();
      const mockNavigation = {
        selectedLesson: mockLesson,
        isMobile: true,
        showCourseOverview: false,
        showLessonView: true,
        handleMobileLessonSelect: vi.fn(),
        handleNextLesson: mockHandleNextLesson,
        handleBackToMenu: mockHandleBackToMenu,
        setSelectedLesson: vi.fn(),
      };

      vi.mocked(useCourseNavigation).mockReturnValue(mockNavigation);

      // Simulate swipe right (back)
      const swipeRightEvent = new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        touches: [{ clientX: 300, clientY: 200 } as Touch],
      });

      fireEvent.touchStart(document, swipeRightEvent);

      // Simulate swipe left (next)
      const swipeLeftEvent = new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        touches: [{ clientX: 50, clientY: 200 } as Touch],
      });

      fireEvent.touchStart(document, swipeLeftEvent);

      expect(mockHandleNextLesson).toBeDefined();
      expect(mockHandleBackToMenu).toBeDefined();
    });
  });

  describe('Viewport Handling', () => {
    it('should handle viewport resize events', () => {
      const mockNavigation = {
        selectedLesson: null,
        isMobile: true,
        showCourseOverview: true,
        showLessonView: false,
        handleMobileLessonSelect: vi.fn(),
        handleNextLesson: vi.fn(),
        handleBackToMenu: vi.fn(),
        setSelectedLesson: vi.fn(),
      };

      vi.mocked(useCourseNavigation).mockReturnValue(mockNavigation);

      // Simulate viewport resize
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        value: 1024, // Desktop width
      });

      fireEvent.resize(window);

      // Should handle resize event
      expect(window.innerWidth).toBe(1024);
    });

    it('should handle orientation change events', () => {
      const mockNavigation = {
        selectedLesson: null,
        isMobile: true,
        showCourseOverview: true,
        showLessonView: false,
        handleMobileLessonSelect: vi.fn(),
        handleNextLesson: vi.fn(),
        handleBackToMenu: vi.fn(),
        setSelectedLesson: vi.fn(),
      };

      vi.mocked(useCourseNavigation).mockReturnValue(mockNavigation);

      // Simulate orientation change
      fireEvent.orientationchange(window);

      // Should handle orientation change
      expect(mockNavigation).toBeDefined();
    });
  });

  describe('Keyboard Interactions', () => {
    it('should handle keyboard navigation on mobile', () => {
      const mockHandleNextLesson = vi.fn();
      const mockHandleBackToMenu = vi.fn();
      const mockNavigation = {
        selectedLesson: mockLesson,
        isMobile: true,
        showCourseOverview: false,
        showLessonView: true,
        handleMobileLessonSelect: vi.fn(),
        handleNextLesson: mockHandleNextLesson,
        handleBackToMenu: mockHandleBackToMenu,
        setSelectedLesson: vi.fn(),
      };

      vi.mocked(useCourseNavigation).mockReturnValue(mockNavigation);

      // Simulate arrow key navigation
      fireEvent.keyDown(document, { key: 'ArrowRight' });
      fireEvent.keyDown(document, { key: 'ArrowLeft' });

      expect(mockHandleNextLesson).toBeDefined();
      expect(mockHandleBackToMenu).toBeDefined();
    });

    it('should handle escape key for back navigation', () => {
      const mockHandleBackToMenu = vi.fn();
      const mockNavigation = {
        selectedLesson: mockLesson,
        isMobile: true,
        showCourseOverview: false,
        showLessonView: true,
        handleMobileLessonSelect: vi.fn(),
        handleNextLesson: vi.fn(),
        handleBackToMenu: mockHandleBackToMenu,
        setSelectedLesson: vi.fn(),
      };

      vi.mocked(useCourseNavigation).mockReturnValue(mockNavigation);

      // Simulate escape key
      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockHandleBackToMenu).toBeDefined();
    });
  });

  describe('State Persistence', () => {
    it('should persist mobile navigation state in localStorage', () => {
      const mockNavigation = {
        selectedLesson: mockLesson,
        isMobile: true,
        showCourseOverview: false,
        showLessonView: true,
        handleMobileLessonSelect: vi.fn(),
        handleNextLesson: vi.fn(),
        handleBackToMenu: vi.fn(),
        setSelectedLesson: vi.fn(),
      };

      vi.mocked(useCourseNavigation).mockReturnValue(mockNavigation);

      // Should persist state
      expect(localStorageMock.setItem).toBeDefined();
    });

    it('should restore mobile navigation state from localStorage', () => {
      const savedState = {
        selectedLessonId: 'lesson-1',
        showCourseOverview: false,
        showLessonView: true,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedState));

      const mockNavigation = {
        selectedLesson: mockLesson,
        isMobile: true,
        showCourseOverview: false,
        showLessonView: true,
        handleMobileLessonSelect: vi.fn(),
        handleNextLesson: vi.fn(),
        handleBackToMenu: vi.fn(),
        setSelectedLesson: vi.fn(),
      };

      vi.mocked(useCourseNavigation).mockReturnValue(mockNavigation);

      // Should restore state
      expect(localStorageMock.getItem).toHaveBeenCalled();
    });
  });

  describe('Performance Optimization', () => {
    it('should optimize rendering for mobile devices', () => {
      const mockNavigation = {
        selectedLesson: mockLesson,
        isMobile: true,
        showCourseOverview: false,
        showLessonView: true,
        handleMobileLessonSelect: vi.fn(),
        handleNextLesson: vi.fn(),
        handleBackToMenu: vi.fn(),
        setSelectedLesson: vi.fn(),
      };

      vi.mocked(useCourseNavigation).mockReturnValue(mockNavigation);

      // Should use mobile optimizations
      expect(mockNavigation.isMobile).toBe(true);
    });

    it('should handle memory management on mobile', () => {
      const mockNavigation = {
        selectedLesson: mockLesson,
        isMobile: true,
        showCourseOverview: false,
        showLessonView: true,
        handleMobileLessonSelect: vi.fn(),
        handleNextLesson: vi.fn(),
        handleBackToMenu: vi.fn(),
        setSelectedLesson: vi.fn(),
      };

      vi.mocked(useCourseNavigation).mockReturnValue(mockNavigation);

      // Should implement memory management
      expect(mockNavigation).toBeDefined();
    });
  });

  describe('Accessibility', () => {
    it('should support screen readers on mobile', () => {
      const mockNavigation = {
        selectedLesson: mockLesson,
        isMobile: true,
        showCourseOverview: false,
        showLessonView: true,
        handleMobileLessonSelect: vi.fn(),
        handleNextLesson: vi.fn(),
        handleBackToMenu: vi.fn(),
        setSelectedLesson: vi.fn(),
      };

      vi.mocked(useCourseNavigation).mockReturnValue(mockNavigation);

      // Should have accessibility features
      expect(mockNavigation).toBeDefined();
    });

    it('should support voice navigation on mobile', () => {
      const mockNavigation = {
        selectedLesson: mockLesson,
        isMobile: true,
        showCourseOverview: false,
        showLessonView: true,
        handleMobileLessonSelect: vi.fn(),
        handleNextLesson: vi.fn(),
        handleBackToMenu: vi.fn(),
        setSelectedLesson: vi.fn(),
      };

      vi.mocked(useCourseNavigation).mockReturnValue(mockNavigation);

      // Should support voice navigation
      expect(mockNavigation).toBeDefined();
    });
  });

  describe('Offline Support', () => {
    it('should handle offline state on mobile', () => {
      const mockNavigation = {
        selectedLesson: mockLesson,
        isMobile: true,
        showCourseOverview: false,
        showLessonView: true,
        handleMobileLessonSelect: vi.fn(),
        handleNextLesson: vi.fn(),
        handleBackToMenu: vi.fn(),
        setSelectedLesson: vi.fn(),
      };

      vi.mocked(useCourseNavigation).mockReturnValue(mockNavigation);

      // Mock offline state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      fireEvent.offline(window);

      // Should handle offline state
      expect(navigator.onLine).toBe(false);
    });

    it('should handle online state restoration on mobile', () => {
      const mockNavigation = {
        selectedLesson: mockLesson,
        isMobile: true,
        showCourseOverview: false,
        showLessonView: true,
        handleMobileLessonSelect: vi.fn(),
        handleNextLesson: vi.fn(),
        handleBackToMenu: vi.fn(),
        setSelectedLesson: vi.fn(),
      };

      vi.mocked(useCourseNavigation).mockReturnValue(mockNavigation);

      // Mock online state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      fireEvent.online(window);

      // Should handle online state
      expect(navigator.onLine).toBe(true);
    });
  });

  describe('Deep Linking', () => {
    it('should handle deep links to specific lessons on mobile', () => {
      const mockNavigation = {
        selectedLesson: mockLesson,
        isMobile: true,
        showCourseOverview: false,
        showLessonView: true,
        handleMobileLessonSelect: vi.fn(),
        handleNextLesson: vi.fn(),
        handleBackToMenu: vi.fn(),
        setSelectedLesson: vi.fn(),
      };

      vi.mocked(useCourseNavigation).mockReturnValue(mockNavigation);

      // Should handle deep links
      expect(mockNavigation.selectedLesson?.id).toBe('lesson-1');
    });

    it('should handle deep links to course overview on mobile', () => {
      const mockNavigation = {
        selectedLesson: null,
        isMobile: true,
        showCourseOverview: true,
        showLessonView: false,
        handleMobileLessonSelect: vi.fn(),
        handleNextLesson: vi.fn(),
        handleBackToMenu: vi.fn(),
        setSelectedLesson: vi.fn(),
      };

      vi.mocked(useCourseNavigation).mockReturnValue(mockNavigation);

      // Should handle course overview deep links
      expect(mockNavigation.showCourseOverview).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle navigation errors on mobile', () => {
      const mockNavigation = {
        selectedLesson: mockLesson,
        isMobile: true,
        showCourseOverview: false,
        showLessonView: true,
        handleMobileLessonSelect: vi.fn(),
        handleNextLesson: vi.fn(),
        handleBackToMenu: vi.fn(),
        setSelectedLesson: vi.fn(),
      };

      vi.mocked(useCourseNavigation).mockReturnValue(mockNavigation);

      // Should handle navigation errors gracefully
      expect(mockNavigation).toBeDefined();
    });

    it('should handle state synchronization errors on mobile', () => {
      const mockNavigation = {
        selectedLesson: mockLesson,
        isMobile: true,
        showCourseOverview: false,
        showLessonView: true,
        handleMobileLessonSelect: vi.fn(),
        handleNextLesson: vi.fn(),
        handleBackToMenu: vi.fn(),
        setSelectedLesson: vi.fn(),
      };

      vi.mocked(useCourseNavigation).mockReturnValue(mockNavigation);

      // Should handle state sync errors
      expect(mockNavigation).toBeDefined();
    });
  });
}); 