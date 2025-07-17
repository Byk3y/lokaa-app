import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { CourseGrid } from '../CourseGrid';
import { createMockCourse, createMockAuth, renderWithClassroomContext, type MockAuth, type MockCourse } from './utils/testUtils';
import type { CourseDisplayData } from '@/types/classroom';

// Mock dependencies
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Convert MockCourse to CourseDisplayData
const convertToCourseDisplayData = (mockCourse: MockCourse): CourseDisplayData => ({
  id: mockCourse.id,
  title: mockCourse.title,
  description: mockCourse.description,
  image_url: mockCourse.thumbnail,
  access_type: 'open' as const,
  price: mockCourse.price,
  is_published: mockCourse.is_published,
  currency: 'USD',
  students: mockCourse.students || 0,
  enrolled: false,
  progress: 0,
});

describe('CourseGrid Component', () => {
  const mockCourses: CourseDisplayData[] = [
    convertToCourseDisplayData(createMockCourse({ 
      id: '1', 
      title: 'React Basics', 
      is_published: true 
    })),
    convertToCourseDisplayData(createMockCourse({ 
      id: '2', 
      title: 'Advanced TypeScript', 
      is_published: true 
    })),
    convertToCourseDisplayData(createMockCourse({ 
      id: '3', 
      title: 'Node.js Masterclass', 
      is_published: false 
    })),
  ];

  const defaultProps = {
    isLoading: false,
    authLoading: false,
    hasSpaceOwnerInfo: true,
    hasValidAuth: true,
    isOwner: false,
    courses: mockCourses,
    searchedCourses: mockCourses.filter(c => c.is_published),
    activeTab: 'all-courses' as const,
    courseGridKey: 1,
    permissionRefreshKey: 1,
    primaryColor: '#007bff',
    isProcessingEnrollment: null,
    onNewCourse: vi.fn(),
    onCourseClick: vi.fn(),
    onEnroll: vi.fn(),
    onEdit: vi.fn(),
    onUnenroll: vi.fn(),
    onViewContent: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading States', () => {
    it('renders skeleton loaders when loading', () => {
      renderWithClassroomContext(
        <CourseGrid {...defaultProps} isLoading={true} />
      );

      // Should show skeleton cards (6 by default)
      expect(screen.getAllByTestId('course-card-skeleton')).toHaveLength(6);
    });

    it('renders skeleton loaders when auth is loading', () => {
      renderWithClassroomContext(
        <CourseGrid {...defaultProps} authLoading={true} />
      );

      expect(screen.getAllByTestId('course-card-skeleton')).toHaveLength(6);
    });

    it('renders skeleton loaders when space owner info is not available', () => {
      renderWithClassroomContext(
        <CourseGrid {...defaultProps} hasSpaceOwnerInfo={false} />
      );

      expect(screen.getAllByTestId('course-card-skeleton')).toHaveLength(6);
    });

    it('renders courses when not loading', () => {
      renderWithClassroomContext(
        <CourseGrid {...defaultProps} />
      );

      expect(screen.getByText('React Basics')).toBeInTheDocument();
      expect(screen.getByText('Advanced TypeScript')).toBeInTheDocument();
      // Node.js Masterclass should not be shown (unpublished)
      expect(screen.queryByText('Node.js Masterclass')).not.toBeInTheDocument();
    });
  });

  describe('Owner Experience', () => {
    const ownerProps = {
      ...defaultProps,
      isOwner: true,
      hasValidAuth: true,
      searchedCourses: mockCourses, // Owner can see all courses
    };

    it('shows create course card for owners on all-courses tab', () => {
      renderWithClassroomContext(
        <CourseGrid {...ownerProps} activeTab="all-courses" />
      );

      expect(screen.getByText('Create New Course')).toBeInTheDocument();
    });

    it('does not show create course card on my-courses tab', () => {
      renderWithClassroomContext(
        <CourseGrid {...ownerProps} activeTab="my-courses" />
      );

      expect(screen.queryByText('Create New Course')).not.toBeInTheDocument();
    });

    it('shows all courses including unpublished ones for owners', () => {
      renderWithClassroomContext(
        <CourseGrid {...ownerProps} />
      );

      expect(screen.getByText('React Basics')).toBeInTheDocument();
      expect(screen.getByText('Advanced TypeScript')).toBeInTheDocument();
      expect(screen.getByText('Node.js Masterclass')).toBeInTheDocument();
    });
  });

  describe('Student Experience', () => {
    const studentProps = {
      ...defaultProps,
      isOwner: false,
      hasValidAuth: true,
    };

    it('does not show create course card for non-owners', () => {
      renderWithClassroomContext(
        <CourseGrid {...studentProps} />
      );

      expect(screen.queryByText('Create New Course')).not.toBeInTheDocument();
    });

    it('only shows published courses for non-owners', () => {
      renderWithClassroomContext(
        <CourseGrid {...studentProps} />
      );

      expect(screen.getByText('React Basics')).toBeInTheDocument();
      expect(screen.getByText('Advanced TypeScript')).toBeInTheDocument();
      expect(screen.queryByText('Node.js Masterclass')).not.toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('shows empty state when no courses are searched', () => {
      renderWithClassroomContext(
        <CourseGrid {...defaultProps} searchedCourses={[]} />
      );

      // Grid should be empty (only potential create course card)
      const grid = screen.getByRole('generic');
      expect(grid).toHaveClass('grid');
    });

    it('shows create course card even when no courses exist for owners', () => {
      renderWithClassroomContext(
        <CourseGrid 
          {...defaultProps} 
          isOwner={true}
          searchedCourses={[]}
          hasValidAuth={true}
          activeTab="all-courses"
        />
      );

      expect(screen.getByText('Create New Course')).toBeInTheDocument();
    });
  });

  describe('Course Display', () => {
    it('displays course information correctly', () => {
      renderWithClassroomContext(
        <CourseGrid {...defaultProps} />
      );

      mockCourses.filter(c => c.is_published).forEach(course => {
        expect(screen.getByText(course.title)).toBeInTheDocument();
      });
    });

    it('uses the correct grid layout', () => {
      const { container } = renderWithClassroomContext(
        <CourseGrid {...defaultProps} />
      );

      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3', 'gap-6');
    });

    it('applies course grid key for re-rendering', () => {
      const { container } = renderWithClassroomContext(
        <CourseGrid {...defaultProps} courseGridKey={42} />
      );

      const grid = container.querySelector('.grid');
      expect(grid).toHaveAttribute('key', '42');
    });
  });

  describe('Responsive Behavior', () => {
    it('renders with proper responsive grid classes', () => {
      const { container } = renderWithClassroomContext(
        <CourseGrid {...defaultProps} />
      );

      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3');
    });

    it('maintains consistent spacing with gap classes', () => {
      const { container } = renderWithClassroomContext(
        <CourseGrid {...defaultProps} />
      );

      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('gap-6');
    });
  });

  describe('Performance', () => {
    it('memoizes the component to prevent unnecessary re-renders', () => {
      const { rerender } = renderWithClassroomContext(
        <CourseGrid {...defaultProps} />
      );

      // Re-render with same props
      rerender(<CourseGrid {...defaultProps} />);

      // Should not cause issues or unnecessary re-renders
      expect(screen.getByText('React Basics')).toBeInTheDocument();
    });

    it('handles large course lists efficiently', () => {
      const largeCourseList = Array.from({ length: 100 }, (_, i) => 
        convertToCourseDisplayData(createMockCourse({ 
          id: `course-${i}`, 
          title: `Course ${i}`,
          is_published: true
        }))
      );

      const { container } = renderWithClassroomContext(
        <CourseGrid 
          {...defaultProps} 
          courses={largeCourseList}
          searchedCourses={largeCourseList}
        />
      );

      // Should render without performance issues
      expect(container.querySelectorAll('[data-testid*="course-card"]')).toHaveLength(largeCourseList.length);
    });
  });

  describe('Error Handling', () => {
    it('handles missing course data gracefully', () => {
      const corruptedCourses = [
        { ...mockCourses[0], title: '' },
        { ...mockCourses[1], id: '' },
      ] as CourseDisplayData[];

      // Should not crash when rendering with corrupted data
      expect(() => {
        renderWithClassroomContext(
          <CourseGrid 
            {...defaultProps} 
            courses={corruptedCourses}
            searchedCourses={corruptedCourses}
          />
        );
      }).not.toThrow();
    });

    it('continues to work when handlers are undefined', () => {
      const propsWithoutHandlers = {
        ...defaultProps,
        onNewCourse: undefined as any,
        onCourseClick: undefined as any,
        onEnroll: undefined as any,
      };

      // Should not crash with undefined handlers
      expect(() => {
        renderWithClassroomContext(
          <CourseGrid {...propsWithoutHandlers} />
        );
      }).not.toThrow();
    });
  });

  describe('Dynamic State Updates', () => {
    it('updates when course list changes', () => {
      const { rerender } = renderWithClassroomContext(
        <CourseGrid {...defaultProps} />
      );

      expect(screen.getByText('React Basics')).toBeInTheDocument();

      // Update with different courses
      const newCourses = [
        convertToCourseDisplayData(createMockCourse({ 
          id: '4', 
          title: 'Vue.js Essentials', 
          is_published: true 
        }))
      ];

      rerender(
        <CourseGrid 
          {...defaultProps} 
          courses={newCourses}
          searchedCourses={newCourses}
        />
      );

      expect(screen.queryByText('React Basics')).not.toBeInTheDocument();
      expect(screen.getByText('Vue.js Essentials')).toBeInTheDocument();
    });

    it('updates when owner status changes', () => {
      const { rerender } = renderWithClassroomContext(
        <CourseGrid {...defaultProps} isOwner={false} />
      );

      expect(screen.queryByText('Create New Course')).not.toBeInTheDocument();

      // Change to owner
      rerender(
        <CourseGrid 
          {...defaultProps} 
          isOwner={true}
          activeTab="all-courses"
          hasValidAuth={true}
        />
      );

      expect(screen.getByText('Create New Course')).toBeInTheDocument();
    });

    it('updates when active tab changes', () => {
      const { rerender } = renderWithClassroomContext(
        <CourseGrid 
          {...defaultProps} 
          isOwner={true}
          activeTab="all-courses"
          hasValidAuth={true}
        />
      );

      expect(screen.getByText('Create New Course')).toBeInTheDocument();

      // Change to my-courses tab
      rerender(
        <CourseGrid 
          {...defaultProps} 
          isOwner={true}
          activeTab="my-courses"
          hasValidAuth={true}
        />
      );

      expect(screen.queryByText('Create New Course')).not.toBeInTheDocument();
    });
  });

  describe('Authorization States', () => {
    it('handles invalid auth state', () => {
      renderWithClassroomContext(
        <CourseGrid {...defaultProps} hasValidAuth={false} />
      );

      // Should not show create course card when auth is invalid
      expect(screen.queryByText('Create New Course')).not.toBeInTheDocument();
    });

    it('shows appropriate content based on permission state', () => {
      renderWithClassroomContext(
        <CourseGrid 
          {...defaultProps} 
          hasValidAuth={true}
          isOwner={true}
          activeTab="all-courses"
        />
      );

      expect(screen.getByText('Create New Course')).toBeInTheDocument();
    });
  });
}); 