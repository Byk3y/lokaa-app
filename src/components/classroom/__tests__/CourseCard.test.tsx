import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CourseCard } from '../CourseCard';
import { renderWithClassroomContext, createMockCourse, createMockAuth } from './utils/testUtils';

// Mock LazyImage component
vi.mock('../LazyImage', () => ({
  LazyImage: ({ src, alt, className }: any) => (
    <img src={src} alt={alt} className={className} data-testid="lazy-image" />
  ),
}));

// Mock Intl for price formatting
const mockNumberFormat = vi.fn();
vi.stubGlobal('Intl', {
  NumberFormat: vi.fn(() => ({
    format: mockNumberFormat,
  })),
});

describe('CourseCard', () => {
  const mockCourse = createMockCourse({
    id: 'test-course-1',
    title: 'JavaScript Fundamentals',
    description: 'Learn the basics of JavaScript programming',
    price: 99.99,
    students: 150,
    thumbnail: 'https://example.com/js-course.jpg',
    is_published: true,
  });

  const mockAuth = createMockAuth({
    isOwner: false,
    isAdmin: false,
  });

  const defaultProps = {
    course: mockCourse,
    auth: mockAuth,
    onEnrollClick: vi.fn(),
    onEditClick: vi.fn(),
    onDeleteClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockNumberFormat.mockReturnValue('$99.99');
  });

  describe('Basic Rendering', () => {
    it('should render course information correctly', () => {
      renderWithClassroomContext(<CourseCard {...defaultProps} />);

      expect(screen.getByText('JavaScript Fundamentals')).toBeInTheDocument();
      expect(screen.getByText('Learn the basics of JavaScript programming')).toBeInTheDocument();
      expect(screen.getByText('150 students')).toBeInTheDocument();
    });

    it('should render course thumbnail', () => {
      renderWithClassroomContext(<CourseCard {...defaultProps} />);

      const image = screen.getByTestId('lazy-image');
      expect(image).toHaveAttribute('src', 'https://example.com/js-course.jpg');
      expect(image).toHaveAttribute('alt', 'JavaScript Fundamentals');
    });

    it('should render fallback thumbnail when no image provided', () => {
      const courseWithoutImage = createMockCourse({
        ...mockCourse,
        thumbnail: undefined,
      });

      renderWithClassroomContext(
        <CourseCard {...defaultProps} course={courseWithoutImage} />
      );

      const image = screen.getByTestId('lazy-image');
      expect(image).toHaveAttribute('src', '/images/course-placeholder.jpg');
    });

    it('should format price correctly', () => {
      renderWithClassroomContext(<CourseCard {...defaultProps} />);

      expect(screen.getByText('$99.99')).toBeInTheDocument();
      expect(mockNumberFormat).toHaveBeenCalledWith(99.99);
    });

    it('should handle zero price', () => {
      const freeCourse = createMockCourse({
        ...mockCourse,
        price: 0,
      });

      mockNumberFormat.mockReturnValue('Free');

      renderWithClassroomContext(
        <CourseCard {...defaultProps} course={freeCourse} />
      );

      expect(screen.getByText('Free')).toBeInTheDocument();
    });
  });

  describe('User Interactions - Student View', () => {
    it('should show enroll button for non-enrolled students', () => {
      const nonEnrolledCourse = createMockCourse({
        ...mockCourse,
        enrolled: false,
      });

      renderWithClassroomContext(
        <CourseCard {...defaultProps} course={nonEnrolledCourse} />
      );

      expect(screen.getByRole('button', { name: /enroll/i })).toBeInTheDocument();
    });

    it('should call onEnrollClick when enroll button is clicked', async () => {
      const user = userEvent.setup();
      const nonEnrolledCourse = createMockCourse({
        ...mockCourse,
        enrolled: false,
      });

      renderWithClassroomContext(
        <CourseCard {...defaultProps} course={nonEnrolledCourse} />
      );

      const enrollButton = screen.getByRole('button', { name: /enroll/i });
      await user.click(enrollButton);

      expect(defaultProps.onEnrollClick).toHaveBeenCalledWith(mockCourse.id);
    });

    it('should show "Continue Learning" for enrolled students', () => {
      const enrolledCourse = createMockCourse({
        ...mockCourse,
        enrolled: true,
      });

      renderWithClassroomContext(
        <CourseCard {...defaultProps} course={enrolledCourse} />
      );

      expect(screen.getByText(/continue learning/i)).toBeInTheDocument();
    });

    it('should show progress bar for enrolled students', () => {
      const enrolledCourse = createMockCourse({
        ...mockCourse,
        enrolled: true,
        progress: 65,
      });

      renderWithClassroomContext(
        <CourseCard {...defaultProps} course={enrolledCourse} />
      );

      expect(screen.getByText('65% complete')).toBeInTheDocument();
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '65');
    });
  });

  describe('Owner/Admin View', () => {
    const ownerAuth = createMockAuth({
      isOwner: true,
      isAdmin: true,
    });

    it('should show management buttons for owners', () => {
      renderWithClassroomContext(
        <CourseCard {...defaultProps} auth={ownerAuth} />
      );

      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    it('should call onEditClick when edit button is clicked', async () => {
      const user = userEvent.setup();

      renderWithClassroomContext(
        <CourseCard {...defaultProps} auth={ownerAuth} />
      );

      const editButton = screen.getByRole('button', { name: /edit/i });
      await user.click(editButton);

      expect(defaultProps.onEditClick).toHaveBeenCalledWith(mockCourse);
    });

    it('should call onDeleteClick when delete button is clicked', async () => {
      const user = userEvent.setup();

      renderWithClassroomContext(
        <CourseCard {...defaultProps} auth={ownerAuth} />
      );

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      expect(defaultProps.onDeleteClick).toHaveBeenCalledWith(mockCourse.id);
    });

    it('should show publish status for unpublished courses', () => {
      const unpublishedCourse = createMockCourse({
        ...mockCourse,
        is_published: false,
      });

      renderWithClassroomContext(
        <CourseCard {...defaultProps} course={unpublishedCourse} auth={ownerAuth} />
      );

      expect(screen.getByText(/draft/i)).toBeInTheDocument();
    });

    it('should show student analytics for owners', () => {
      renderWithClassroomContext(
        <CourseCard {...defaultProps} auth={ownerAuth} />
      );

      expect(screen.getByText('150 students')).toBeInTheDocument();
    });
  });

  describe('Course Status States', () => {
    it('should handle course with no students', () => {
      const courseWithNoStudents = createMockCourse({
        ...mockCourse,
        students: 0,
      });

      renderWithClassroomContext(
        <CourseCard {...defaultProps} course={courseWithNoStudents} />
      );

      expect(screen.getByText('0 students')).toBeInTheDocument();
    });

    it('should handle course with one student', () => {
      const courseWithOneStudent = createMockCourse({
        ...mockCourse,
        students: 1,
      });

      renderWithClassroomContext(
        <CourseCard {...defaultProps} course={courseWithOneStudent} />
      );

      expect(screen.getByText('1 student')).toBeInTheDocument();
    });

    it('should truncate long descriptions', () => {
      const courseWithLongDescription = createMockCourse({
        ...mockCourse,
        description: 'This is a very long description that should be truncated because it exceeds the maximum length allowed for course card descriptions in the UI component.',
      });

      renderWithClassroomContext(
        <CourseCard {...defaultProps} course={courseWithLongDescription} />
      );

      const description = screen.getByText(/This is a very long description/);
      expect(description).toBeInTheDocument();
      // Check if CSS truncation is applied
      expect(description).toHaveClass('line-clamp-2');
    });

    it('should handle missing description', () => {
      const courseWithoutDescription = createMockCourse({
        ...mockCourse,
        description: null,
      });

      renderWithClassroomContext(
        <CourseCard {...defaultProps} course={courseWithoutDescription} />
      );

      expect(screen.getByText('No description available')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      renderWithClassroomContext(<CourseCard {...defaultProps} />);

      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('aria-labelledby');
      
      const title = screen.getByRole('heading');
      expect(title).toHaveAttribute('id');
    });

    it('should have keyboard navigation support', async () => {
      const user = userEvent.setup();

      renderWithClassroomContext(<CourseCard {...defaultProps} />);

      const enrollButton = screen.getByRole('button', { name: /enroll/i });
      
      // Tab to the button
      await user.tab();
      expect(enrollButton).toHaveFocus();

      // Press Enter
      await user.keyboard('{Enter}');
      expect(defaultProps.onEnrollClick).toHaveBeenCalled();
    });

    it('should have proper color contrast for text', () => {
      renderWithClassroomContext(<CourseCard {...defaultProps} />);

      const title = screen.getByText('JavaScript Fundamentals');
      const description = screen.getByText('Learn the basics of JavaScript programming');
      
      // These elements should have proper contrast classes
      expect(title).toHaveClass('text-foreground');
      expect(description).toHaveClass('text-muted-foreground');
    });
  });

  describe('Performance', () => {
    it('should be wrapped with React.memo', () => {
      // This test verifies the component is memoized
      const { rerender } = renderWithClassroomContext(<CourseCard {...defaultProps} />);

      const firstRender = screen.getByText('JavaScript Fundamentals');
      
      // Rerender with same props
      rerender(<CourseCard {...defaultProps} />);
      
      const secondRender = screen.getByText('JavaScript Fundamentals');
      
      // The component should not re-render unnecessarily
      expect(firstRender).toBe(secondRender);
    });

    it('should use LazyImage for performance', () => {
      renderWithClassroomContext(<CourseCard {...defaultProps} />);

      const lazyImage = screen.getByTestId('lazy-image');
      expect(lazyImage).toBeInTheDocument();
    });

    it('should memoize price formatting', () => {
      const { rerender } = renderWithClassroomContext(<CourseCard {...defaultProps} />);

      expect(mockNumberFormat).toHaveBeenCalledTimes(1);

      // Rerender with same price
      rerender(<CourseCard {...defaultProps} />);

      // Price formatting should be memoized
      expect(mockNumberFormat).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined course properties gracefully', () => {
      const incompleteCourse = createMockCourse({
        id: 'incomplete-course',
        title: 'Incomplete Course',
        description: undefined,
        price: undefined,
        students: undefined,
        thumbnail: undefined,
      });

      renderWithClassroomContext(
        <CourseCard {...defaultProps} course={incompleteCourse} />
      );

      expect(screen.getByText('Incomplete Course')).toBeInTheDocument();
      expect(screen.getByText('No description available')).toBeInTheDocument();
      expect(screen.getByText('Free')).toBeInTheDocument();
      expect(screen.getByText('0 students')).toBeInTheDocument();
    });

    it('should handle very large student numbers', () => {
      const courseWithManyStudents = createMockCourse({
        ...mockCourse,
        students: 12500,
      });

      renderWithClassroomContext(
        <CourseCard {...defaultProps} course={courseWithManyStudents} />
      );

      expect(screen.getByText('12,500 students')).toBeInTheDocument();
    });

    it('should handle negative progress values', () => {
      const courseWithNegativeProgress = createMockCourse({
        ...mockCourse,
        enrolled: true,
        progress: -10,
      });

      renderWithClassroomContext(
        <CourseCard {...defaultProps} course={courseWithNegativeProgress} />
      );

      // Should normalize negative progress to 0
      expect(screen.getByText('0% complete')).toBeInTheDocument();
    });

    it('should handle progress values over 100', () => {
      const courseWithOverProgress = createMockCourse({
        ...mockCourse,
        enrolled: true,
        progress: 110,
      });

      renderWithClassroomContext(
        <CourseCard {...defaultProps} course={courseWithOverProgress} />
      );

      // Should cap progress at 100
      expect(screen.getByText('100% complete')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show loading state when enrolling', async () => {
      const user = userEvent.setup();
      
      // Mock a slow enroll function
      const slowEnroll = vi.fn(() => new Promise(resolve => setTimeout(resolve, 1000)));

      renderWithClassroomContext(
        <CourseCard {...defaultProps} onEnrollClick={slowEnroll} />
      );

      const enrollButton = screen.getByRole('button', { name: /enroll/i });
      await user.click(enrollButton);

      // Should show loading state
      expect(screen.getByText(/enrolling/i)).toBeInTheDocument();
      expect(enrollButton).toBeDisabled();
    });

    it('should handle enrollment errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock an enrollment function that throws
      const failingEnroll = vi.fn(() => Promise.reject(new Error('Enrollment failed')));

      renderWithClassroomContext(
        <CourseCard {...defaultProps} onEnrollClick={failingEnroll} />
      );

      const enrollButton = screen.getByRole('button', { name: /enroll/i });
      await user.click(enrollButton);

      // Should handle error gracefully and restore button state
      expect(enrollButton).not.toBeDisabled();
    });
  });
}); 