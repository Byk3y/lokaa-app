import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { vi, MockedFunction } from 'vitest';
import { User } from '@supabase/supabase-js';

// Mock types
export interface MockCourse {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  price?: number;
  created_by: string;
  space_id: string;
  created_at: string;
  updated_at: string;
  is_published: boolean;
  students?: number;
  modules?: MockModule[];
}

export interface MockModule {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  order_index: number;
  created_at: string;
  lessons?: MockLesson[];
}

export interface MockLesson {
  id: string;
  module_id: string;
  title: string;
  content?: string;
  video_url?: string;
  order_index: number;
  created_at: string;
}

export interface MockSpace {
  id: string;
  name: string;
  owner_id: string;
  subdomain: string;
  created_at: string;
}

export interface MockAuth {
  user: User | null;
  isOwner: boolean;
  isAdmin: boolean;
  hasValidAuth: boolean;
  authLoading: boolean;
}

// Test data factories
export const createMockUser = (overrides?: Partial<User>): User => ({
  id: 'user-123',
  email: 'test@example.com',
  created_at: '2023-01-01T00:00:00Z',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  role: 'authenticated',
  ...overrides,
});

export const createMockSpace = (overrides?: Partial<MockSpace>): MockSpace => ({
  id: 'space-123',
  name: 'Test Space',
  owner_id: 'user-123',
  subdomain: 'test-space',
  created_at: '2023-01-01T00:00:00Z',
  ...overrides,
});

export const createMockCourse = (overrides?: Partial<MockCourse>): MockCourse => ({
  id: 'course-123',
  title: 'Test Course',
  description: 'A test course description',
  thumbnail: 'https://example.com/thumbnail.jpg',
  price: 99.99,
  created_by: 'user-123',
  space_id: 'space-123',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  is_published: true,
  students: 10,
  modules: [],
  ...overrides,
});

export const createMockModule = (overrides?: Partial<MockModule>): MockModule => ({
  id: 'module-123',
  course_id: 'course-123',
  title: 'Test Module',
  description: 'A test module',
  order_index: 1,
  created_at: '2023-01-01T00:00:00Z',
  lessons: [],
  ...overrides,
});

export const createMockLesson = (overrides?: Partial<MockLesson>): MockLesson => ({
  id: 'lesson-123',
  module_id: 'module-123',
  title: 'Test Lesson',
  content: 'Test lesson content',
  video_url: 'https://example.com/video.mp4',
  order_index: 1,
  created_at: '2023-01-01T00:00:00Z',
  ...overrides,
});

export const createMockAuth = (overrides?: Partial<MockAuth>): MockAuth => ({
  user: createMockUser(),
  isOwner: false,
  isAdmin: false,
  hasValidAuth: true,
  authLoading: false,
  ...overrides,
});

// Supabase client mock
export const createMockSupabaseClient = () => {
  const mockClient = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn(),
    },
    storage: {
      from: vi.fn().mockReturnThis(),
      upload: vi.fn(),
      getPublicUrl: vi.fn(),
    },
  };

  // Setup default responses
  mockClient.select.mockResolvedValue({ data: [], error: null });
  mockClient.insert.mockResolvedValue({ data: null, error: null });
  mockClient.update.mockResolvedValue({ data: null, error: null });
  mockClient.delete.mockResolvedValue({ data: null, error: null });
  mockClient.single.mockResolvedValue({ data: null, error: null });

  return mockClient;
};

// Cache mock utilities
export const createMockCache = () => ({
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
  clear: vi.fn(),
  has: vi.fn(),
});

// Toast mock
export const createMockToast = () => ({
  toast: vi.fn(),
});

// Context providers wrapper
export interface ClassroomTestContextProps {
  auth?: MockAuth;
  space?: MockSpace;
  supabaseClient?: any;
  cache?: any;
  toast?: any;
}

export const ClassroomTestProvider = ({ 
  children, 
  auth = createMockAuth(),
  space = createMockSpace(),
  supabaseClient = createMockSupabaseClient(),
  cache = createMockCache(),
  toast = createMockToast(),
}: ClassroomTestContextProps & { children: React.ReactNode }) => {
  // Mock context providers here
  return <div data-testid="classroom-test-provider">{children}</div>;
};

// Custom render function
export const renderWithClassroomContext = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & ClassroomTestContextProps
) => {
  const { auth, space, supabaseClient, cache, toast, ...renderOptions } = options || {};
  
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <ClassroomTestProvider
      auth={auth}
      space={space}
      supabaseClient={supabaseClient}
      cache={cache}
      toast={toast}
    >
      {children}
    </ClassroomTestProvider>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Mock hook generators
export const createMockClassroomAuth = (auth: MockAuth) => ({
  user: auth.user,
  isOwner: auth.isOwner,
  isAdmin: auth.isAdmin,
  hasValidAuth: auth.hasValidAuth,
  authLoading: auth.authLoading,
  effectiveOwnerId: auth.isOwner ? auth.user?.id : null,
});

export const createMockCourseManagement = (courses: MockCourse[] = []) => ({
  courses,
  isLoading: false,
  error: null,
  createCourse: vi.fn().mockResolvedValue({ success: true }),
  updateCourse: vi.fn().mockResolvedValue({ success: true }),
  deleteCourse: vi.fn().mockResolvedValue({ success: true }),
  enrollInCourse: vi.fn().mockResolvedValue({ success: true }),
  unenrollFromCourse: vi.fn().mockResolvedValue({ success: true }),
  getCourseProgress: vi.fn().mockResolvedValue(0),
});

export const createMockClassroomSearch = (courses: MockCourse[] = []) => ({
  searchQuery: '',
  filteredCourses: courses,
  setSearchQuery: vi.fn(),
  clearSearch: vi.fn(),
  searchStats: {
    total: courses.length,
    filtered: courses.length,
  },
});

// Test data sets
export const mockCoursesData: MockCourse[] = [
  createMockCourse({
    id: 'course-1',
    title: 'JavaScript Fundamentals',
    price: 49.99,
    students: 150,
  }),
  createMockCourse({
    id: 'course-2',
    title: 'React Advanced Patterns',
    price: 99.99,
    students: 75,
  }),
  createMockCourse({
    id: 'course-3',
    title: 'Node.js Backend Development',
    price: 79.99,
    students: 120,
  }),
];

export const mockModulesData: MockModule[] = [
  createMockModule({
    id: 'module-1',
    course_id: 'course-1',
    title: 'Introduction to JavaScript',
    order_index: 1,
  }),
  createMockModule({
    id: 'module-2',
    course_id: 'course-1',
    title: 'Variables and Data Types',
    order_index: 2,
  }),
];

export const mockLessonsData: MockLesson[] = [
  createMockLesson({
    id: 'lesson-1',
    module_id: 'module-1',
    title: 'What is JavaScript?',
    order_index: 1,
  }),
  createMockLesson({
    id: 'lesson-2',
    module_id: 'module-1',
    title: 'Setting up Development Environment',
    order_index: 2,
  }),
];

// Performance testing utilities
export const measureRenderTime = async (renderFn: () => void) => {
  const start = performance.now();
  renderFn();
  const end = performance.now();
  return end - start;
};

export const measureMemoryUsage = () => {
  if ('memory' in performance) {
    return (performance as any).memory;
  }
  return null;
};

// Accessibility testing helpers
export const checkAccessibility = async (container: HTMLElement) => {
  const { axe } = await import('@axe-core/react');
  return axe(container);
};

// Export commonly used testing utilities
export * from '@testing-library/react';
export * from '@testing-library/user-event';
export { vi } from 'vitest'; 