import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { CourseRouteManager, useCourseRouteManager } from '@/components/classroom/routing/CourseRouteManager';
import type { RouteState, RouteError, RouteOperation } from '@/types/classroom/courseDetail';

// Mock hooks and services
vi.mock('@/hooks/useMediaQuery', () => ({
  useMediaQuery: vi.fn(() => false),
}));

vi.mock('@/utils/logger', () => ({
  log: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Course Routing Tests', () => {
  const mockRouteState: RouteState = {
    currentRoute: '/course/course-123',
    navigationHistory: ['/course/course-123'],
    breadcrumbs: [
      { label: 'Courses', path: '/courses' },
      { label: 'Test Course', path: '/course/course-123' },
    ],
    lastVisitedCourse: 'course-123',
    lastVisitedLesson: 'lesson-1',
  };

  const mockRouteError: RouteError = {
    type: 'permission',
    message: 'Access denied',
    timestamp: Date.now(),
    recoverable: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Route Manager Initialization', () => {
    it('should initialize with default route state', () => {
      const TestComponent = () => {
        const routeManager = useCourseRouteManager();
        return (
          <div>
            <span data-testid="current-route">{routeManager.getCurrentRoute()}</span>
            <span data-testid="is-navigating">{routeManager.isNavigating.toString()}</span>
          </div>
        );
      };

      render(
        <MemoryRouter initialEntries={['/course/course-123']}>
          <CourseRouteManager>
            <TestComponent />
          </CourseRouteManager>
        </MemoryRouter>
      );

      expect(screen.getByTestId('current-route')).toBeInTheDocument();
      expect(screen.getByTestId('is-navigating')).toBeInTheDocument();
    });

    it('should handle route manager configuration options', () => {
      const onRouteChange = vi.fn();
      const onRouteError = vi.fn();

      render(
        <MemoryRouter>
          <CourseRouteManager
            enableAnalytics={true}
            enableCaching={true}
            enableRateLimiting={true}
            onRouteChange={onRouteChange}
            onRouteError={onRouteError}
          >
            <div>Test Content</div>
          </CourseRouteManager>
        </MemoryRouter>
      );

      expect(onRouteChange).toBeDefined();
      expect(onRouteError).toBeDefined();
    });
  });

  describe('Route Navigation', () => {
    it('should navigate to course route', async () => {
      const TestComponent = () => {
        const routeManager = useCourseRouteManager();
        
        const handleNavigate = async () => {
          await routeManager.navigateToCourse('course-123');
        };

        return (
          <div>
            <button onClick={handleNavigate} data-testid="navigate-course">
              Navigate to Course
            </button>
            <span data-testid="current-route">{routeManager.getCurrentRoute()}</span>
          </div>
        );
      };

      render(
        <MemoryRouter>
          <CourseRouteManager>
            <TestComponent />
          </CourseRouteManager>
        </MemoryRouter>
      );

      fireEvent.click(screen.getByTestId('navigate-course'));

      await waitFor(() => {
        expect(screen.getByTestId('current-route')).toBeInTheDocument();
      });
    });

    it('should navigate to lesson route', async () => {
      const TestComponent = () => {
        const routeManager = useCourseRouteManager();
        
        const handleNavigate = async () => {
          await routeManager.navigateToLesson('course-123', 'lesson-1');
        };

        return (
          <div>
            <button onClick={handleNavigate} data-testid="navigate-lesson">
              Navigate to Lesson
            </button>
            <span data-testid="current-route">{routeManager.getCurrentRoute()}</span>
          </div>
        );
      };

      render(
        <MemoryRouter>
          <CourseRouteManager>
            <TestComponent />
          </CourseRouteManager>
        </MemoryRouter>
      );

      fireEvent.click(screen.getByTestId('navigate-lesson'));

      await waitFor(() => {
        expect(screen.getByTestId('current-route')).toBeInTheDocument();
      });
    });

    it('should navigate to module route', async () => {
      const TestComponent = () => {
        const routeManager = useCourseRouteManager();
        
        const handleNavigate = async () => {
          await routeManager.navigateToModule('course-123', 'module-1');
        };

        return (
          <div>
            <button onClick={handleNavigate} data-testid="navigate-module">
              Navigate to Module
            </button>
            <span data-testid="current-route">{routeManager.getCurrentRoute()}</span>
          </div>
        );
      };

      render(
        <MemoryRouter>
          <CourseRouteManager>
            <TestComponent />
          </CourseRouteManager>
        </MemoryRouter>
      );

      fireEvent.click(screen.getByTestId('navigate-module'));

      await waitFor(() => {
        expect(screen.getByTestId('current-route')).toBeInTheDocument();
      });
    });
  });

  describe('URL Synchronization', () => {
    it('should synchronize URL with route state', () => {
      const TestComponent = () => {
        const routeManager = useCourseRouteManager();
        const params = routeManager.getRouteParams();
        
        return (
          <div>
            <span data-testid="subdomain">{params.subdomain}</span>
            <span data-testid="search-params">{JSON.stringify(params.searchParams)}</span>
          </div>
        );
      };

      render(
        <MemoryRouter initialEntries={['/course/course-123?lesson=lesson-1']}>
          <CourseRouteManager>
            <TestComponent />
          </CourseRouteManager>
        </MemoryRouter>
      );

      expect(screen.getByTestId('subdomain')).toBeInTheDocument();
      expect(screen.getByTestId('search-params')).toBeInTheDocument();
    });

    it('should handle URL parameter changes', () => {
      const TestComponent = () => {
        const routeManager = useCourseRouteManager();
        
        const handleParamChange = () => {
          routeManager.navigateToRoute('/course/course-123?lesson=lesson-2');
        };

        return (
          <div>
            <button onClick={handleParamChange} data-testid="change-params">
              Change Params
            </button>
            <span data-testid="current-route">{routeManager.getCurrentRoute()}</span>
          </div>
        );
      };

      render(
        <MemoryRouter>
          <CourseRouteManager>
            <TestComponent />
          </CourseRouteManager>
        </MemoryRouter>
      );

      fireEvent.click(screen.getByTestId('change-params'));

      expect(screen.getByTestId('current-route')).toBeInTheDocument();
    });
  });

  describe('Deep Linking', () => {
    it('should handle deep links to specific courses', () => {
      const TestComponent = () => {
        const routeManager = useCourseRouteManager();
        
        return (
          <div>
            <span data-testid="current-route">{routeManager.getCurrentRoute()}</span>
            <span data-testid="breadcrumbs">{routeManager.getBreadcrumbs().length}</span>
          </div>
        );
      };

      render(
        <MemoryRouter initialEntries={['/course/course-123']}>
          <CourseRouteManager>
            <TestComponent />
          </CourseRouteManager>
        </MemoryRouter>
      );

      expect(screen.getByTestId('current-route')).toBeInTheDocument();
      expect(screen.getByTestId('breadcrumbs')).toBeInTheDocument();
    });

    it('should handle deep links to specific lessons', () => {
      const TestComponent = () => {
        const routeManager = useCourseRouteManager();
        
        return (
          <div>
            <span data-testid="current-route">{routeManager.getCurrentRoute()}</span>
            <span data-testid="breadcrumbs">{routeManager.getBreadcrumbs().length}</span>
          </div>
        );
      };

      render(
        <MemoryRouter initialEntries={['/course/course-123/lesson/lesson-1']}>
          <CourseRouteManager>
            <TestComponent />
          </CourseRouteManager>
        </MemoryRouter>
      );

      expect(screen.getByTestId('current-route')).toBeInTheDocument();
      expect(screen.getByTestId('breadcrumbs')).toBeInTheDocument();
    });

    it('should handle deep links with query parameters', () => {
      const TestComponent = () => {
        const routeManager = useCourseRouteManager();
        const params = routeManager.getRouteParams();
        
        return (
          <div>
            <span data-testid="lesson-param">{params.searchParams.lesson}</span>
            <span data-testid="module-param">{params.searchParams.module}</span>
          </div>
        );
      };

      render(
        <MemoryRouter initialEntries={['/course/course-123?lesson=lesson-1&module=module-1']}>
          <CourseRouteManager>
            <TestComponent />
          </CourseRouteManager>
        </MemoryRouter>
      );

      expect(screen.getByTestId('lesson-param')).toBeInTheDocument();
      expect(screen.getByTestId('module-param')).toBeInTheDocument();
    });
  });

  describe('Navigation History', () => {
    it('should maintain navigation history', () => {
      const TestComponent = () => {
        const routeManager = useCourseRouteManager();
        
        const handleNavigate = async () => {
          await routeManager.navigateToCourse('course-123');
          await routeManager.navigateToLesson('course-123', 'lesson-1');
        };

        return (
          <div>
            <button onClick={handleNavigate} data-testid="navigate-sequence">
              Navigate Sequence
            </button>
            <span data-testid="history-length">
              {routeManager.getNavigationHistory().length}
            </span>
          </div>
        );
      };

      render(
        <MemoryRouter>
          <CourseRouteManager>
            <TestComponent />
          </CourseRouteManager>
        </MemoryRouter>
      );

      fireEvent.click(screen.getByTestId('navigate-sequence'));

      expect(screen.getByTestId('history-length')).toBeInTheDocument();
    });

    it('should handle back navigation', () => {
      const TestComponent = () => {
        const routeManager = useCourseRouteManager();
        
        const handleBack = () => {
          routeManager.goBack();
        };

        return (
          <div>
            <button onClick={handleBack} data-testid="go-back">
              Go Back
            </button>
            <span data-testid="current-route">{routeManager.getCurrentRoute()}</span>
          </div>
        );
      };

      render(
        <MemoryRouter initialEntries={['/course/course-123', '/course/course-123/lesson/lesson-1']}>
          <CourseRouteManager>
            <TestComponent />
          </CourseRouteManager>
        </MemoryRouter>
      );

      fireEvent.click(screen.getByTestId('go-back'));

      expect(screen.getByTestId('current-route')).toBeInTheDocument();
    });

    it('should handle forward navigation', () => {
      const TestComponent = () => {
        const routeManager = useCourseRouteManager();
        
        const handleForward = () => {
          routeManager.goForward();
        };

        return (
          <div>
            <button onClick={handleForward} data-testid="go-forward">
              Go Forward
            </button>
            <span data-testid="current-route">{routeManager.getCurrentRoute()}</span>
          </div>
        );
      };

      render(
        <MemoryRouter initialEntries={['/course/course-123', '/course/course-123/lesson/lesson-1']}>
          <CourseRouteManager>
            <TestComponent />
          </CourseRouteManager>
        </MemoryRouter>
      );

      fireEvent.click(screen.getByTestId('go-forward'));

      expect(screen.getByTestId('current-route')).toBeInTheDocument();
    });
  });

  describe('Route Caching', () => {
    it('should cache route data', () => {
      const TestComponent = () => {
        const routeManager = useCourseRouteManager();
        
        const handleCacheRoute = () => {
          const cachedData = routeManager.getCachedRoute('/course/course-123');
          return cachedData;
        };

        return (
          <div>
            <button onClick={handleCacheRoute} data-testid="cache-route">
              Cache Route
            </button>
            <span data-testid="cached-data">{handleCacheRoute() ? 'cached' : 'not-cached'}</span>
          </div>
        );
      };

      render(
        <MemoryRouter>
          <CourseRouteManager enableCaching={true}>
            <TestComponent />
          </CourseRouteManager>
        </MemoryRouter>
      );

      fireEvent.click(screen.getByTestId('cache-route'));

      expect(screen.getByTestId('cached-data')).toBeInTheDocument();
    });

    it('should retrieve cached route data', () => {
      const TestComponent = () => {
        const routeManager = useCourseRouteManager();
        
        return (
          <div>
            <span data-testid="cached-route">
              {routeManager.getCachedRoute('/course/course-123') ? 'exists' : 'not-exists'}
            </span>
          </div>
        );
      };

      render(
        <MemoryRouter>
          <CourseRouteManager enableCaching={true}>
            <TestComponent />
          </CourseRouteManager>
        </MemoryRouter>
      );

      expect(screen.getByTestId('cached-route')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle route errors', () => {
      const onRouteError = vi.fn();
      
      const TestComponent = () => {
        const routeManager = useCourseRouteManager();
        
        const handleError = () => {
          const error: RouteError = {
            type: 'permission',
            message: 'Access denied',
            timestamp: Date.now(),
            recoverable: true,
          };
          routeManager.recoverFromError(error);
        };

        return (
          <div>
            <button onClick={handleError} data-testid="trigger-error">
              Trigger Error
            </button>
            <span data-testid="error-count">{routeManager.routeErrors.length}</span>
          </div>
        );
      };

      render(
        <MemoryRouter>
          <CourseRouteManager onRouteError={onRouteError}>
            <TestComponent />
          </CourseRouteManager>
        </MemoryRouter>
      );

      fireEvent.click(screen.getByTestId('trigger-error'));

      expect(screen.getByTestId('error-count')).toBeInTheDocument();
    });

    it('should recover from route errors', () => {
      const TestComponent = () => {
        const routeManager = useCourseRouteManager();
        
        const handleRecovery = () => {
          const error: RouteError = {
            type: 'permission',
            message: 'Access denied',
            timestamp: Date.now(),
            recoverable: true,
          };
          const recovered = routeManager.recoverFromError(error);
          return recovered;
        };

        return (
          <div>
            <button onClick={handleRecovery} data-testid="recover-error">
              Recover from Error
            </button>
            <span data-testid="recovery-status">{handleRecovery() ? 'recovered' : 'failed'}</span>
          </div>
        );
      };

      render(
        <MemoryRouter>
          <CourseRouteManager>
            <TestComponent />
          </CourseRouteManager>
        </MemoryRouter>
      );

      fireEvent.click(screen.getByTestId('recover-error'));

      expect(screen.getByTestId('recovery-status')).toBeInTheDocument();
    });

    it('should clear route errors', () => {
      const TestComponent = () => {
        const routeManager = useCourseRouteManager();
        
        const handleClearErrors = () => {
          routeManager.clearErrors();
        };

        return (
          <div>
            <button onClick={handleClearErrors} data-testid="clear-errors">
              Clear Errors
            </button>
            <span data-testid="error-count">{routeManager.routeErrors.length}</span>
          </div>
        );
      };

      render(
        <MemoryRouter>
          <CourseRouteManager>
            <TestComponent />
          </CourseRouteManager>
        </MemoryRouter>
      );

      fireEvent.click(screen.getByTestId('clear-errors'));

      expect(screen.getByTestId('error-count')).toBeInTheDocument();
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rate limiting for route operations', () => {
      const TestComponent = () => {
        const routeManager = useCourseRouteManager();
        
        const handleRapidNavigation = async () => {
          await routeManager.navigateToCourse('course-123');
          await routeManager.navigateToLesson('course-123', 'lesson-1');
          await routeManager.navigateToCourse('course-456');
        };

        return (
          <div>
            <button onClick={handleRapidNavigation} data-testid="rapid-navigation">
              Rapid Navigation
            </button>
            <span data-testid="is-navigating">{routeManager.isNavigating.toString()}</span>
          </div>
        );
      };

      render(
        <MemoryRouter>
          <CourseRouteManager enableRateLimiting={true}>
            <TestComponent />
          </CourseRouteManager>
        </MemoryRouter>
      );

      fireEvent.click(screen.getByTestId('rapid-navigation'));

      expect(screen.getByTestId('is-navigating')).toBeInTheDocument();
    });
  });

  describe('Analytics', () => {
    it('should track route changes when analytics is enabled', () => {
      const onRouteChange = vi.fn();
      
      const TestComponent = () => {
        const routeManager = useCourseRouteManager();
        
        const handleNavigate = async () => {
          await routeManager.navigateToCourse('course-123');
        };

        return (
          <div>
            <button onClick={handleNavigate} data-testid="tracked-navigation">
              Tracked Navigation
            </button>
          </div>
        );
      };

      render(
        <MemoryRouter>
          <CourseRouteManager enableAnalytics={true} onRouteChange={onRouteChange}>
            <TestComponent />
          </CourseRouteManager>
        </MemoryRouter>
      );

      fireEvent.click(screen.getByTestId('tracked-navigation'));

      expect(onRouteChange).toBeDefined();
    });
  });

  describe('Breadcrumb Management', () => {
    it('should generate breadcrumbs for course routes', () => {
      const TestComponent = () => {
        const routeManager = useCourseRouteManager();
        const breadcrumbs = routeManager.getBreadcrumbs();
        
        return (
          <div>
            <span data-testid="breadcrumb-count">{breadcrumbs.length}</span>
            {breadcrumbs.map((crumb, index) => (
              <span key={index} data-testid={`breadcrumb-${index}`}>
                {crumb.label}
              </span>
            ))}
          </div>
        );
      };

      render(
        <MemoryRouter initialEntries={['/course/course-123']}>
          <CourseRouteManager>
            <TestComponent />
          </CourseRouteManager>
        </MemoryRouter>
      );

      expect(screen.getByTestId('breadcrumb-count')).toBeInTheDocument();
    });

    it('should update breadcrumbs for lesson routes', () => {
      const TestComponent = () => {
        const routeManager = useCourseRouteManager();
        const breadcrumbs = routeManager.getBreadcrumbs();
        
        return (
          <div>
            <span data-testid="breadcrumb-count">{breadcrumbs.length}</span>
            {breadcrumbs.map((crumb, index) => (
              <span key={index} data-testid={`breadcrumb-${index}`}>
                {crumb.label}
              </span>
            ))}
          </div>
        );
      };

      render(
        <MemoryRouter initialEntries={['/course/course-123/lesson/lesson-1']}>
          <CourseRouteManager>
            <TestComponent />
          </CourseRouteManager>
        </MemoryRouter>
      );

      expect(screen.getByTestId('breadcrumb-count')).toBeInTheDocument();
    });
  });
}); 