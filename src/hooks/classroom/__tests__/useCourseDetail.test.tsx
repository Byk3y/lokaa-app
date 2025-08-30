
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor, act } from '../../../__tests__/test-utils';
import { useCourseDetail } from '../useCourseDetail';
import { useCourseCaching } from '../useCourseCaching';
import React from 'react';
import type { CourseDetailData } from '@/types/classroom/courseDetail';

// Mock sub-hooks and dependencies
vi.mock('../useCourseCaching');
vi.mock('@/utils/logger', () => ({
  log: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const mockCourseCache = {
  getCachedCourse: vi.fn(),
  setCachedCourse: vi.fn(),
  invalidateCourseCache: vi.fn(),
  updateCachedCourseProgress: vi.fn(),
};

// Mock data
const mockCourse: CourseDetailData = {
  id: 'course-1',
  title: 'Test Course',
  description: 'A test course.',
  creator_id: 'user-1',
  is_published: true,
  slug: 'test-course',
  space_id: 'space-1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  modules: [
    {
      id: 'module-1',
      title: 'Module 1',
      description: 'First module',
      module_order: 1,
      course_id: 'course-1',
      space_id: 'space-1',
      lessons: [
        {
          id: 'lesson-1',
          title: 'Lesson 1',
          content_type: 'text',
          content_text: 'Hello world',
          lesson_order: 1,
          module_id: 'module-1',
          is_published: true,
          completed: false,
          content_id: 'content-1',
        },
      ],
    },
  ],
  progress: 0,
};

// Test Component to use the hook
const TestComponent = ({ courseId }: { courseId: string }) => {
  const hookResult = useCourseDetail();

  return (
    <div>
      <div data-testid="course-title">{hookResult.course?.title}</div>
      <div data-testid="loading">{hookResult.loading.toString()}</div>
      <div data-testid="error">{hookResult.error}</div>
      <button onClick={() => hookResult.fetchCourseDetails(courseId)}>Fetch</button>
      <button onClick={() => hookResult.refetch()}>Refetch</button>
      <button onClick={() => hookResult.applyOptimisticUpdate('lesson-1', { title: 'Updated Optimistically' })}>
        Optimistic Update
      </button>
      <button onClick={() => hookResult.clearOptimisticUpdate('lesson-1')}>
        Clear Optimistic Update
      </button>
    </div>
  );
};

describe('useCourseDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useCourseCaching as any).mockReturnValue(mockCourseCache);
  });

  it('should fetch course details and display them', async () => {
    const { getByText, getByTestId } = render(<TestComponent courseId="course-1" />);

    await act(async () => {
      getByText('Fetch').click();
    });

    await waitFor(() => {
      expect(getByTestId('course-title').textContent).toBe('Test Course');
    });
  });

  it('should use cached course data if available', async () => {
    mockCourseCache.getCachedCourse.mockReturnValue(mockCourse);
    const { getByTestId } = render(<TestComponent courseId="course-1" />);

    await act(async () => {
        getByTestId('course-title');
    });

    expect(mockCourseCache.getCachedCourse).toHaveBeenCalledWith('course-1');
  });

  it('should apply and clear optimistic updates', async () => {
    let hookResult: any;
    const OptimisticTest = () => {
      hookResult = useCourseDetail();
      return (
        <div>
          <div data-testid="lesson-title">{hookResult.course?.modules[0].lessons[0].title}</div>
          <button onClick={() => hookResult.applyOptimisticUpdate('lesson-1', { title: 'Updated Optimistically' })}>
            Update
          </button>
          <button onClick={() => hookResult.clearOptimisticUpdate('lesson-1')}>Clear</button>
        </div>
      );
    };

    const { getByText, getByTestId } = render(<OptimisticTest />);

    act(() => {
      hookResult.fetchCourseDetails('course-1');
    });

    await waitFor(() => {
      expect(getByTestId('lesson-title').textContent).toBe('Lesson 1');
    });

    act(() => {
      getByText('Update').click();
    });

    await waitFor(() => {
      expect(getByTestId('lesson-title').textContent).toBe('Updated Optimistically');
    });

    act(() => {
      getByText('Clear').click();
    });

    await waitFor(() => {
      expect(getByTestId('lesson-title').textContent).toBe('Lesson 1');
    });
  });

  it('should clear optimistic updates on refetch', async () => {
    let hookResult: any;
    const RefetchTest = () => {
      hookResult = useCourseDetail();
      React.useEffect(() => {
        hookResult.fetchCourseDetails('course-1');
      }, []);
      return (
        <div>
          <div data-testid="lesson-title">{hookResult.course?.modules[0].lessons[0].title}</div>
          <button onClick={() => hookResult.applyOptimisticUpdate('lesson-1', { title: 'Updated Title' })}>
            Optimistic Update
          </button>
          <button onClick={() => hookResult.refetch()}>Refetch</button>
        </div>
      );
    };

    const { getByText, getByTestId } = render(<RefetchTest />);

    await waitFor(() => {
      expect(getByTestId('lesson-title').textContent).toBe('Lesson 1');
    });

    act(() => {
      getByText('Optimistic Update').click();
    });

    await waitFor(() => {
      expect(getByTestId('lesson-title').textContent).toBe('Updated Title');
    });

    act(() => {
      getByText('Refetch').click();
    });

    await waitFor(() => {
      expect(getByTestId('lesson-title').textContent).toBe('Lesson 1');
    });
  });
});
