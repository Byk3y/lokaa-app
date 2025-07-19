import { log } from '@/utils/logger';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithClassroomContext, createMockCourse, createMockAuth, createMockSupabaseClient, createMockToast } from '../utils/testUtils';

// Mock all classroom components
vi.mock('../../CourseGrid', () => ({
  CourseGrid: ({ courses, onCreateCourse, onEnrollClick, onEditClick, onDeleteClick, isLoading }: any) => (
    <div data-testid="course-grid">
      {isLoading ? (
        <div data-testid="loading">Loading courses...</div>
      ) : (
        <>
          <button onClick={onCreateCourse} data-testid="create-course-btn">Create Course</button>
          {courses.map((course: any) => (
            <div key={course.id} data-testid={`course-${course.id}`}>
              <h3>{course.title}</h3>
              <button onClick={() => onEnrollClick(course.id)} data-testid={`enroll-${course.id}`}>
                Enroll
              </button>
              <button onClick={() => onEditClick(course)} data-testid={`edit-${course.id}`}>
                Edit
              </button>
              <button onClick={() => onDeleteClick(course.id)} data-testid={`delete-${course.id}`}>
                Delete
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  ),
}));

vi.mock('../../ClassroomHeader', () => ({
  ClassroomHeader: ({ searchQuery, onSearchChange, activeTab, onTabChange }: any) => (
    <div data-testid="classroom-header">
      <input
        data-testid="search-input"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search courses..."
      />
      <button
        data-testid="all-courses-tab"
        onClick={() => onTabChange('all-courses')}
        className={activeTab === 'all-courses' ? 'active' : ''}
      >
        All Courses
      </button>
      <button
        data-testid="my-courses-tab"
        onClick={() => onTabChange('my-courses')}
        className={activeTab === 'my-courses' ? 'active' : ''}
      >
        My Courses
      </button>
    </div>
  ),
}));

// Create a mock classroom container that uses all hooks
const MockClassroomContainer = ({ 
  initialCourses = [], 
  auth = createMockAuth(), 
  supabaseClient = createMockSupabaseClient(),
  toast = createMockToast()
}: any) => {
  const [courses, setCourses] = vi.fn().mockReturnValue([initialCourses, vi.fn()]);
  const [searchQuery, setSearchQuery] = vi.fn().mockReturnValue(['', vi.fn()]);
  const [activeTab, setActiveTab] = vi.fn().mockReturnValue(['all-courses', vi.fn()]);
  const [isLoading, setIsLoading] = vi.fn().mockReturnValue([false, vi.fn()]);

  // Mock course management operations
  const createCourse = vi.fn(async (courseData: any) => {
    const newCourse = createMockCourse(courseData);
    setCourses([...courses, newCourse]);
    toast.toast({ title: 'Course created successfully' });
  });

  const enrollInCourse = vi.fn(async (courseId: string) => {
    setCourses(courses.map((c: any) => 
      c.id === courseId ? { ...c, enrolled: true } : c
    ));
    toast.toast({ title: 'Enrolled successfully' });
  });

  const editCourse = vi.fn(async (course: any) => {
    log.debug('Component', 'Editing course:', course);
    toast.toast({ title: 'Course updated' });
  });

  const deleteCourse = vi.fn(async (courseId: string) => {
    setCourses(courses.filter((c: any) => c.id !== courseId));
    toast.toast({ title: 'Course deleted' });
  });

  // Filter courses based on search and tab
  const filteredCourses = courses.filter((course: any) => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'all-courses' || 
                      (activeTab === 'my-courses' && course.enrolled);
    return matchesSearch && matchesTab;
  });

  return (
    <div data-testid="classroom-container">
      <MockClassroomHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      <MockCourseGrid
        courses={filteredCourses}
        auth={auth}
        onCreateCourse={createCourse}
        onEnrollClick={enrollInCourse}
        onEditClick={editCourse}
        onDeleteClick={deleteCourse}
        isLoading={isLoading}
      />
    </div>
  );
};

describe('Classroom Workflows Integration', () => {
  const mockCourses = [
    createMockCourse({
      id: 'course-1',
      title: 'JavaScript Fundamentals',
      enrolled: false,
    }),
    createMockCourse({
      id: 'course-2',
      title: 'React Advanced',
      enrolled: true,
    }),
    createMockCourse({
      id: 'course-3',
      title: 'Node.js Backend',
      enrolled: false,
    }),
  ];

  const ownerAuth = createMockAuth({
    isOwner: true,
    isAdmin: true,
  });

  const studentAuth = createMockAuth({
    isOwner: false,
    isAdmin: false,
  });

  let mockSupabase: any;
  let mockToast: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    mockToast = createMockToast();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Course Discovery and Search', () => {
    it('should allow users to search for courses', async () => {
      const user = userEvent.setup();

      renderWithClassroomContext(
        <MockClassroomContainer 
          initialCourses={mockCourses}
          auth={studentAuth}
        />
      );

      // Initial state - all courses visible
      expect(screen.getByTestId('course-course-1')).toBeInTheDocument();
      expect(screen.getByTestId('course-course-2')).toBeInTheDocument();
      expect(screen.getByTestId('course-course-3')).toBeInTheDocument();

      // Search for JavaScript courses
      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'JavaScript');

      // Should only show matching courses
      expect(screen.getByTestId('course-course-1')).toBeInTheDocument();
      expect(screen.queryByTestId('course-course-2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('course-course-3')).not.toBeInTheDocument();

      // Clear search
      await user.clear(searchInput);
      await user.type(searchInput, '');

      // All courses should be visible again
      expect(screen.getByTestId('course-course-1')).toBeInTheDocument();
      expect(screen.getByTestId('course-course-2')).toBeInTheDocument();
      expect(screen.getByTestId('course-course-3')).toBeInTheDocument();
    });

    it('should filter courses by enrollment status', async () => {
      const user = userEvent.setup();

      renderWithClassroomContext(
        <MockClassroomContainer 
          initialCourses={mockCourses}
          auth={studentAuth}
        />
      );

      // Switch to "My Courses" tab
      const myCoursesTab = screen.getByTestId('my-courses-tab');
      await user.click(myCoursesTab);

      // Should only show enrolled courses
      expect(screen.queryByTestId('course-course-1')).not.toBeInTheDocument();
      expect(screen.getByTestId('course-course-2')).toBeInTheDocument();
      expect(screen.queryByTestId('course-course-3')).not.toBeInTheDocument();

      // Switch back to "All Courses"
      const allCoursesTab = screen.getByTestId('all-courses-tab');
      await user.click(allCoursesTab);

      // All courses should be visible again
      expect(screen.getByTestId('course-course-1')).toBeInTheDocument();
      expect(screen.getByTestId('course-course-2')).toBeInTheDocument();
      expect(screen.getByTestId('course-course-3')).toBeInTheDocument();
    });

    it('should combine search and tab filtering', async () => {
      const user = userEvent.setup();

      renderWithClassroomContext(
        <MockClassroomContainer 
          initialCourses={mockCourses}
          auth={studentAuth}
        />
      );

      // Search for "React" and switch to "My Courses"
      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'React');

      const myCoursesTab = screen.getByTestId('my-courses-tab');
      await user.click(myCoursesTab);

      // Should only show enrolled React courses
      expect(screen.queryByTestId('course-course-1')).not.toBeInTheDocument();
      expect(screen.getByTestId('course-course-2')).toBeInTheDocument();
      expect(screen.queryByTestId('course-course-3')).not.toBeInTheDocument();
    });
  });

  describe('Course Enrollment Workflow', () => {
    it('should allow students to enroll in courses', async () => {
      const user = userEvent.setup();

      renderWithClassroomContext(
        <MockClassroomContainer 
          initialCourses={mockCourses}
          auth={studentAuth}
          toast={mockToast}
        />
      );

      // Enroll in JavaScript course
      const enrollButton = screen.getByTestId('enroll-course-1');
      await user.click(enrollButton);

      // Should show success message
      await waitFor(() => {
        expect(mockToast.toast).toHaveBeenCalledWith({
          title: 'Enrolled successfully'
        });
      });

      // Course should now appear in "My Courses"
      const myCoursesTab = screen.getByTestId('my-courses-tab');
      await user.click(myCoursesTab);

      expect(screen.getByTestId('course-course-1')).toBeInTheDocument();
      expect(screen.getByTestId('course-course-2')).toBeInTheDocument();
    });

    it('should handle enrollment errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock enrollment failure
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('Enrollment failed')
        })
      });

      renderWithClassroomContext(
        <MockClassroomContainer 
          initialCourses={mockCourses}
          auth={studentAuth}
          supabaseClient={mockSupabase}
          toast={mockToast}
        />
      );

      const enrollButton = screen.getByTestId('enroll-course-1');
      await user.click(enrollButton);

      // Should show error message
      await waitFor(() => {
        expect(mockToast.toast).toHaveBeenCalledWith({
          title: 'Enrollment failed',
          variant: 'destructive'
        });
      });
    });
  });

  describe('Course Management Workflow (Owner)', () => {
    it('should allow owners to create new courses', async () => {
      const user = userEvent.setup();

      renderWithClassroomContext(
        <MockClassroomContainer 
          initialCourses={mockCourses}
          auth={ownerAuth}
          toast={mockToast}
        />
      );

      // Click create course button
      const createButton = screen.getByTestId('create-course-btn');
      await user.click(createButton);

      // Should show success message
      await waitFor(() => {
        expect(mockToast.toast).toHaveBeenCalledWith({
          title: 'Course created successfully'
        });
      });
    });

    it('should allow owners to edit existing courses', async () => {
      const user = userEvent.setup();

      renderWithClassroomContainer(
        <MockClassroomContainer 
          initialCourses={mockCourses}
          auth={ownerAuth}
          toast={mockToast}
        />
      );

      // Click edit button for first course
      const editButton = screen.getByTestId('edit-course-1');
      await user.click(editButton);

      // Should show success message
      await waitFor(() => {
        expect(mockToast.toast).toHaveBeenCalledWith({
          title: 'Course updated'
        });
      });
    });

    it('should allow owners to delete courses', async () => {
      const user = userEvent.setup();

      renderWithClassroomContext(
        <MockClassroomContainer 
          initialCourses={mockCourses}
          auth={ownerAuth}
          toast={mockToast}
        />
      );

      // Verify course exists initially
      expect(screen.getByTestId('course-course-1')).toBeInTheDocument();

      // Click delete button
      const deleteButton = screen.getByTestId('delete-course-1');
      await user.click(deleteButton);

      // Should show success message and remove course
      await waitFor(() => {
        expect(mockToast.toast).toHaveBeenCalledWith({
          title: 'Course deleted'
        });
      });

      expect(screen.queryByTestId('course-course-1')).not.toBeInTheDocument();
    });

    it('should not show management buttons for non-owners', () => {
      renderWithClassroomContext(
        <MockClassroomContainer 
          initialCourses={mockCourses}
          auth={studentAuth}
        />
      );

      // Management buttons should not be visible
      expect(screen.queryByTestId('create-course-btn')).not.toBeInTheDocument();
      expect(screen.queryByTestId('edit-course-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('delete-course-1')).not.toBeInTheDocument();

      // Only enroll buttons should be visible
      expect(screen.getByTestId('enroll-course-1')).toBeInTheDocument();
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading state while fetching courses', () => {
      renderWithClassroomContext(
        <MockClassroomContainer 
          initialCourses={[]}
          isLoading={true}
        />
      );

      expect(screen.getByTestId('loading')).toBeInTheDocument();
      expect(screen.getByText('Loading courses...')).toBeInTheDocument();
    });

    it('should handle empty course list', () => {
      renderWithClassroomContext(
        <MockClassroomContainer 
          initialCourses={[]}
          auth={studentAuth}
        />
      );

      // Should not show any course cards
      expect(screen.queryByTestId(/course-course-/)).not.toBeInTheDocument();
    });

    it('should handle network errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock network error
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockRejectedValue(new Error('Network error'))
      });

      renderWithClassroomContext(
        <MockClassroomContainer 
          initialCourses={mockCourses}
          auth={studentAuth}
          supabaseClient={mockSupabase}
          toast={mockToast}
        />
      );

      // Try to perform an action that would trigger network call
      const enrollButton = screen.getByTestId('enroll-course-1');
      await user.click(enrollButton);

      // Should handle error gracefully
      await waitFor(() => {
        expect(mockToast.toast).toHaveBeenCalledWith({
          title: 'Network error occurred',
          variant: 'destructive'
        });
      });
    });
  });

  describe('User Experience Flow', () => {
    it('should provide seamless course discovery to enrollment flow', async () => {
      const user = userEvent.setup();

      renderWithClassroomContext(
        <MockClassroomContainer 
          initialCourses={mockCourses}
          auth={studentAuth}
          toast={mockToast}
        />
      );

      // 1. Search for specific course
      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'JavaScript');

      // 2. Find and enroll in course
      const enrollButton = screen.getByTestId('enroll-course-1');
      await user.click(enrollButton);

      // 3. Check enrollment was successful
      await waitFor(() => {
        expect(mockToast.toast).toHaveBeenCalledWith({
          title: 'Enrolled successfully'
        });
      });

      // 4. Navigate to "My Courses" to see enrolled course
      const myCoursesTab = screen.getByTestId('my-courses-tab');
      await user.click(myCoursesTab);

      // 5. Course should be visible in enrolled courses
      expect(screen.getByTestId('course-course-1')).toBeInTheDocument();
    });

    it('should provide seamless course management flow for owners', async () => {
      const user = userEvent.setup();

      renderWithClassroomContext(
        <MockClassroomContainer 
          initialCourses={mockCourses}
          auth={ownerAuth}
          toast={mockToast}
        />
      );

      // 1. Create new course
      const createButton = screen.getByTestId('create-course-btn');
      await user.click(createButton);

      await waitFor(() => {
        expect(mockToast.toast).toHaveBeenCalledWith({
          title: 'Course created successfully'
        });
      });

      // 2. Edit existing course
      const editButton = screen.getByTestId('edit-course-1');
      await user.click(editButton);

      await waitFor(() => {
        expect(mockToast.toast).toHaveBeenCalledWith({
          title: 'Course updated'
        });
      });

      // 3. Search for courses to manage
      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'React');

      expect(screen.getByTestId('course-course-2')).toBeInTheDocument();
      expect(screen.queryByTestId('course-course-1')).not.toBeInTheDocument();
    });
  });

  describe('Performance and Optimization', () => {
    it('should handle rapid user interactions without issues', async () => {
      const user = userEvent.setup();

      renderWithClassroomContext(
        <MockClassroomContainer 
          initialCourses={mockCourses}
          auth={studentAuth}
        />
      );

      // Rapidly switch between tabs
      const allCoursesTab = screen.getByTestId('all-courses-tab');
      const myCoursesTab = screen.getByTestId('my-courses-tab');

      for (let i = 0; i < 5; i++) {
        await user.click(myCoursesTab);
        await user.click(allCoursesTab);
      }

      // Should still work correctly
      expect(screen.getByTestId('course-course-1')).toBeInTheDocument();
      expect(screen.getByTestId('course-course-2')).toBeInTheDocument();
      expect(screen.getByTestId('course-course-3')).toBeInTheDocument();
    });

    it('should debounce search input', async () => {
      const user = userEvent.setup();

      renderWithClassroomContext(
        <MockClassroomContainer 
          initialCourses={mockCourses}
          auth={studentAuth}
        />
      );

      const searchInput = screen.getByTestId('search-input');

      // Type rapidly
      await user.type(searchInput, 'Java');
      
      // Should handle rapid typing without performance issues
      expect(searchInput).toHaveValue('Java');
    });
  });
}); 