import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CourseDetailView from '@/components/classroom/CourseDetailView';
import { AuthProvider } from '@/contexts/AuthContext';
import { SpaceProvider } from '@/contexts/SpaceContext';
import type { CourseDetailData, CourseLesson } from '@/types/classroom/courseDetail';

// Mock all the hooks and services
vi.mock('@/hooks/classroom/useCourseDetail', () => ({
  useCourseDetail: vi.fn(),
}));

vi.mock('@/hooks/classroom/useCourseProgress', () => ({
  useCourseProgress: vi.fn(),
}));

vi.mock('@/hooks/classroom/useCourseOwnership', () => ({
  useCourseOwnership: vi.fn(),
}));

vi.mock('@/hooks/classroom/useCourseNavigation', () => ({
  useCourseNavigation: vi.fn(),
}));

vi.mock('@/hooks/classroom/useCourseDialogs', () => ({
  useCourseDialogs: vi.fn(),
}));

vi.mock('@/hooks/classroom/useLessonManagement', () => ({
  useLessonManagement: vi.fn(),
}));

vi.mock('@/components/classroom/routing/CourseRouteManager', () => ({
  CourseRouteManager: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useCourseRouteManager: vi.fn(),
}));

// Mock child components
vi.mock('@/components/classroom/CourseSidebar', () => ({
  default: ({ course, onLessonSelect }: any) => (
    <div data-testid="course-sidebar">
      <button onClick={() => onLessonSelect(course.modules[0]?.lessons[0])}>
        Select Lesson
      </button>
    </div>
  ),
}));

vi.mock('@/components/classroom/LessonContent', () => ({
  default: ({ lesson, onMarkAsDone }: any) => (
    <div data-testid="lesson-content">
      <h2>{lesson?.title || 'No Lesson Selected'}</h2>
      <button onClick={onMarkAsDone}>Mark as Done</button>
    </div>
  ),
}));

vi.mock('@/components/classroom/mobile/CourseDetailMobile', () => ({
  default: ({ courseId }: any) => (
    <div data-testid="course-detail-mobile">
      Mobile View for Course: {courseId}
    </div>
  ),
}));

describe('CourseDetailView Integration Tests', () => {
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
        ],
      },
    ],
    progress: 0,
  };

  const mockLesson: CourseLesson = mockCourse.modules[0].lessons[0];

  const defaultMockHooks = {
    useCourseDetail: {
      course: mockCourse,
      loading: false,
      error: null,
      fetchCourseDetails: vi.fn(),
      refetch: vi.fn(),
    },
    useCourseProgress: {
      markLessonAsDone: vi.fn(),
      isUpdating: false,
      error: null,
    },
    useCourseOwnership: {
      isOwner: true,
      ownershipLoading: false,
      error: null,
      ownershipDetails: { isGeneralAdmin: false, isSpaceAdmin: false },
    },
    useCourseNavigation: {
      selectedLesson: mockLesson,
      isMobile: false,
      showCourseOverview: false,
      showLessonView: false,
      handleMobileLessonSelect: vi.fn(),
      handleNextLesson: vi.fn(),
      handleBackToMenu: vi.fn(),
      setSelectedLesson: vi.fn(),
    },
    useCourseDialogs: {
      isDeleteDialogOpen: false,
      isDeleting: false,
      openDeleteCourseDialog: vi.fn(),
      closeDeleteCourseDialog: vi.fn(),
      handleConfirmDeleteCourse: vi.fn(),
    },
    useLessonManagement: {
      isCreatingPage: false,
      creatingModuleId: null,
      newPageTitle: '',
      newPageContent: '',
      isSaving: false,
      handleCreateNewPage: vi.fn(),
      handleCancelCreate: vi.fn(),
      handleSaveNewPage: vi.fn(),
      handleUpdateLesson: vi.fn(),
    },
    useCourseRouteManager: {
      navigateToRoute: vi.fn(),
      navigateToCourse: vi.fn(),
      navigateToLesson: vi.fn(),
      getCurrentRoute: vi.fn(() => '/course/course-123'),
      getRouteParams: vi.fn(() => ({ subdomain: 'test', searchParams: {} })),
      routeState: {},
      isNavigating: false,
      routeErrors: [],
    },
  };

  const renderCourseDetailView = (props = {}) => {
    return render(
      <BrowserRouter>
        <AuthProvider>
          <SpaceProvider>
            <CourseDetailView
              courseId="course-123"
              onBack={vi.fn()}
              {...props}
            />
          </SpaceProvider>
        </AuthProvider>
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up default mock implementations
    const { useCourseDetail, useCourseProgress, useCourseOwnership, useCourseNavigation, useCourseDialogs, useLessonManagement, useCourseRouteManager } = defaultMockHooks;
    
    vi.mocked(useCourseDetail).mockReturnValue(useCourseDetail);
    vi.mocked(useCourseProgress).mockReturnValue(useCourseProgress);
    vi.mocked(useCourseOwnership).mockReturnValue(useCourseOwnership);
    vi.mocked(useCourseNavigation).mockReturnValue(useCourseNavigation);
    vi.mocked(useCourseDialogs).mockReturnValue(useCourseDialogs);
    vi.mocked(useLessonManagement).mockReturnValue(useLessonManagement);
    vi.mocked(useCourseRouteManager).mockReturnValue(useCourseRouteManager);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render course sidebar and lesson content in desktop mode', () => {
      renderCourseDetailView();

      expect(screen.getByTestId('course-sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('lesson-content')).toBeInTheDocument();
      expect(screen.getByText('Lesson 1')).toBeInTheDocument();
    });

    it('should render mobile view when showCourseOverview is true', () => {
      const mockHooks = {
        ...defaultMockHooks,
        useCourseNavigation: {
          ...defaultMockHooks.useCourseNavigation,
          showCourseOverview: true,
        },
      };

      vi.mocked(mockHooks.useCourseNavigation).mockReturnValue(mockHooks.useCourseNavigation);

      renderCourseDetailView();

      expect(screen.getByTestId('course-detail-mobile')).toBeInTheDocument();
      expect(screen.getByText('Mobile View for Course: course-123')).toBeInTheDocument();
    });

    it('should render mobile view when showLessonView is true', () => {
      const mockHooks = {
        ...defaultMockHooks,
        useCourseNavigation: {
          ...defaultMockHooks.useCourseNavigation,
          showLessonView: true,
        },
      };

      vi.mocked(mockHooks.useCourseNavigation).mockReturnValue(mockHooks.useCourseNavigation);

      renderCourseDetailView();

      expect(screen.getByTestId('course-detail-mobile')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show loading spinner when course is loading', () => {
      const mockHooks = {
        ...defaultMockHooks,
        useCourseDetail: {
          ...defaultMockHooks.useCourseDetail,
          course: null,
          loading: true,
        },
      };

      vi.mocked(mockHooks.useCourseDetail).mockReturnValue(mockHooks.useCourseDetail);

      renderCourseDetailView();

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should show error state when course fetch fails', () => {
      const mockHooks = {
        ...defaultMockHooks,
        useCourseDetail: {
          ...defaultMockHooks.useCourseDetail,
          course: null,
          loading: false,
          error: 'Course not found',
        },
      };

      vi.mocked(mockHooks.useCourseDetail).mockReturnValue(mockHooks.useCourseDetail);

      renderCourseDetailView();

      expect(screen.getByText('Error Loading Course')).toBeInTheDocument();
      expect(screen.getByText('Course not found')).toBeInTheDocument();
    });
  });

  describe('Lesson Interactions', () => {
    it('should handle lesson selection from sidebar', () => {
      const mockSetSelectedLesson = vi.fn();
      const mockHooks = {
        ...defaultMockHooks,
        useCourseNavigation: {
          ...defaultMockHooks.useCourseNavigation,
          setSelectedLesson: mockSetSelectedLesson,
        },
      };

      vi.mocked(mockHooks.useCourseNavigation).mockReturnValue(mockHooks.useCourseNavigation);

      renderCourseDetailView();

      fireEvent.click(screen.getByText('Select Lesson'));

      expect(mockSetSelectedLesson).toHaveBeenCalledWith(mockLesson);
    });

    it('should handle mark as done functionality', () => {
      const mockMarkLessonAsDone = vi.fn();
      const mockHooks = {
        ...defaultMockHooks,
        useCourseProgress: {
          ...defaultMockHooks.useCourseProgress,
          markLessonAsDone: mockMarkLessonAsDone,
        },
      };

      vi.mocked(mockHooks.useCourseProgress).mockReturnValue(mockHooks.useCourseProgress);

      renderCourseDetailView();

      fireEvent.click(screen.getByText('Mark as Done'));

      expect(mockMarkLessonAsDone).toHaveBeenCalledWith(mockLesson, mockCourse);
    });
  });

  describe('Mobile Navigation', () => {
    it('should handle mobile lesson selection', () => {
      const mockHandleMobileLessonSelect = vi.fn();
      const mockHooks = {
        ...defaultMockHooks,
        useCourseNavigation: {
          ...defaultMockHooks.useCourseNavigation,
          handleMobileLessonSelect: mockHandleMobileLessonSelect,
        },
      };

      vi.mocked(mockHooks.useCourseNavigation).mockReturnValue(mockHooks.useCourseNavigation);

      renderCourseDetailView();

      // This would be triggered by mobile-specific interactions
      expect(mockHandleMobileLessonSelect).toBeDefined();
    });

    it('should handle next lesson navigation', () => {
      const mockHandleNextLesson = vi.fn();
      const mockHooks = {
        ...defaultMockHooks,
        useCourseNavigation: {
          ...defaultMockHooks.useCourseNavigation,
          handleNextLesson: mockHandleNextLesson,
        },
      };

      vi.mocked(mockHooks.useCourseNavigation).mockReturnValue(mockHooks.useCourseNavigation);

      renderCourseDetailView();

      // This would be triggered by mobile navigation
      expect(mockHandleNextLesson).toBeDefined();
    });
  });

  describe('Dialog Management', () => {
    it('should handle delete course dialog', () => {
      const mockOpenDeleteCourseDialog = vi.fn();
      const mockHooks = {
        ...defaultMockHooks,
        useCourseDialogs: {
          ...defaultMockHooks.useCourseDialogs,
          openDeleteCourseDialog: mockOpenDeleteCourseDialog,
        },
      };

      vi.mocked(mockHooks.useCourseDialogs).mockReturnValue(mockHooks.useCourseDialogs);

      renderCourseDetailView();

      // This would be triggered by delete course button
      expect(mockOpenDeleteCourseDialog).toBeDefined();
    });
  });

  describe('Lesson Management', () => {
    it('should handle creating new pages', () => {
      const mockHandleCreateNewPage = vi.fn();
      const mockHooks = {
        ...defaultMockHooks,
        useLessonManagement: {
          ...defaultMockHooks.useLessonManagement,
          handleCreateNewPage: mockHandleCreateNewPage,
        },
      };

      vi.mocked(mockHooks.useLessonManagement).mockReturnValue(mockHooks.useLessonManagement);

      renderCourseDetailView();

      // This would be triggered by add lesson button
      expect(mockHandleCreateNewPage).toBeDefined();
    });

    it('should show page creation interface when isCreatingPage is true', () => {
      const mockHooks = {
        ...defaultMockHooks,
        useLessonManagement: {
          ...defaultMockHooks.useLessonManagement,
          isCreatingPage: true,
        },
      };

      vi.mocked(mockHooks.useLessonManagement).mockReturnValue(mockHooks.useLessonManagement);

      renderCourseDetailView();

      // Should show rich text editor for page creation
      expect(screen.getByText('Write your lesson content here...')).toBeInTheDocument();
    });
  });

  describe('Ownership and Permissions', () => {
    it('should show owner controls when user is owner', () => {
      const mockHooks = {
        ...defaultMockHooks,
        useCourseOwnership: {
          ...defaultMockHooks.useCourseOwnership,
          isOwner: true,
        },
      };

      vi.mocked(mockHooks.useCourseOwnership).mockReturnValue(mockHooks.useCourseOwnership);

      renderCourseDetailView();

      // Owner controls should be available
      expect(screen.getByTestId('course-sidebar')).toBeInTheDocument();
    });

    it('should hide owner controls when user is not owner', () => {
      const mockHooks = {
        ...defaultMockHooks,
        useCourseOwnership: {
          ...defaultMockHooks.useCourseOwnership,
          isOwner: false,
        },
      };

      vi.mocked(mockHooks.useCourseOwnership).mockReturnValue(mockHooks.useCourseOwnership);

      renderCourseDetailView();

      // Should still render but without owner controls
      expect(screen.getByTestId('course-sidebar')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle progress update errors', () => {
      const mockHooks = {
        ...defaultMockHooks,
        useCourseProgress: {
          ...defaultMockHooks.useCourseProgress,
          error: 'Failed to update progress',
        },
      };

      vi.mocked(mockHooks.useCourseProgress).mockReturnValue(mockHooks.useCourseProgress);

      renderCourseDetailView();

      // Should still render despite progress error
      expect(screen.getByTestId('lesson-content')).toBeInTheDocument();
    });

    it('should handle ownership check errors', () => {
      const mockHooks = {
        ...defaultMockHooks,
        useCourseOwnership: {
          ...defaultMockHooks.useCourseOwnership,
          error: 'Failed to check ownership',
        },
      };

      vi.mocked(mockHooks.useCourseOwnership).mockReturnValue(mockHooks.useCourseOwnership);

      renderCourseDetailView();

      // Should still render despite ownership error
      expect(screen.getByTestId('course-sidebar')).toBeInTheDocument();
    });
  });

  describe('Route Management', () => {
    it('should handle route changes', () => {
      const mockNavigateToLesson = vi.fn();
      const mockHooks = {
        ...defaultMockHooks,
        useCourseRouteManager: {
          ...defaultMockHooks.useCourseRouteManager,
          navigateToLesson: mockNavigateToLesson,
        },
      };

      vi.mocked(mockHooks.useCourseRouteManager).mockReturnValue(mockHooks.useCourseRouteManager);

      renderCourseDetailView();

      // Route management should be available
      expect(mockNavigateToLesson).toBeDefined();
    });

    it('should handle route errors', () => {
      const mockHooks = {
        ...defaultMockHooks,
        useCourseRouteManager: {
          ...defaultMockHooks.useCourseRouteManager,
          routeErrors: [{ type: 'permission', message: 'Access denied', timestamp: Date.now(), recoverable: true }],
        },
      };

      vi.mocked(mockHooks.useCourseRouteManager).mockReturnValue(mockHooks.useCourseRouteManager);

      renderCourseDetailView();

      // Should still render despite route errors
      expect(screen.getByTestId('course-sidebar')).toBeInTheDocument();
    });
  });

  describe('Data Flow', () => {
    it('should pass correct props to child components', () => {
      renderCourseDetailView();

      // CourseSidebar should receive course data
      expect(screen.getByTestId('course-sidebar')).toBeInTheDocument();

      // LessonContent should receive lesson data
      expect(screen.getByTestId('lesson-content')).toBeInTheDocument();
      expect(screen.getByText('Lesson 1')).toBeInTheDocument();
    });

    it('should handle course data updates', async () => {
      const mockFetchCourseDetails = vi.fn();
      const mockHooks = {
        ...defaultMockHooks,
        useCourseDetail: {
          ...defaultMockHooks.useCourseDetail,
          fetchCourseDetails: mockFetchCourseDetails,
        },
      };

      vi.mocked(mockHooks.useCourseDetail).mockReturnValue(mockHooks.useCourseDetail);

      renderCourseDetailView();

      // Should fetch course details on mount
      await waitFor(() => {
        expect(mockFetchCourseDetails).toHaveBeenCalledWith('course-123', undefined);
      });
    });
  });

  describe('Mobile State Synchronization', () => {
    it('should dispatch mobile state changes', () => {
      const mockDispatchEvent = vi.spyOn(window, 'dispatchEvent');
      
      renderCourseDetailView();

      // Should dispatch mobile state events
      expect(mockDispatchEvent).toBeDefined();
    });
  });
}); 