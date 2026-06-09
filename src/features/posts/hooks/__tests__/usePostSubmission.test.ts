import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { usePostSubmission } from '../usePostSubmission';
import { generateSlug } from '@/utils/slugUtils';
import type { PostCardProps } from '@/features/posts/types/postCard';
import { getSupabaseClient } from '@/integrations/supabase/client';

type QueryResult = {
  data: Record<string, unknown> | null;
  error: Error | null;
};

type QueryBuilder = {
  insert: () => QueryBuilder;
  update: () => QueryBuilder;
  select: () => QueryBuilder;
  eq: () => QueryBuilder;
  single: () => Promise<QueryResult>;
};

// Mock react-router-dom's useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate
}));

const createSupabaseMock = (overrides?: {
  postError?: Error;
  postData?: Record<string, unknown>;
}) => {
  const postData = {
    id: 'test-id',
    title: 'Test Post',
    content: 'Test content',
    slug: 'test-slug',
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides?.postData,
  };

  const createBuilder = (table: string) => {
    const builder: QueryBuilder = {
      insert: vi.fn(() => builder),
      update: vi.fn(() => builder),
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      single: vi.fn(() => {
        if (table === 'posts') {
          return Promise.resolve({
            data: overrides?.postError ? null : postData,
            error: overrides?.postError ?? null,
          });
        }

        if (table === 'users') {
          return Promise.resolve({
            data: {
              id: 'user-123',
              full_name: 'Test User',
              avatar_url: null,
              profile_url: 'test-user',
              activity_score: 0,
            },
            error: null,
          });
        }

        if (table === 'spaces') {
          return Promise.resolve({
            data: { id: 'space-123', subdomain: 'test-space' },
            error: null,
          });
        }

        return Promise.resolve({ data: null, error: null });
      }),
    };

    return builder;
  };

  return {
    from: vi.fn((table: string) => createBuilder(table)),
    rpc: vi.fn(() => Promise.resolve({ data: 'test-slug', error: null })),
  };
};

vi.mock('@/integrations/supabase/client', () => ({
  getSupabaseClient: vi.fn(),
}));

// Mock useSpaceSettingsStore
vi.mock('@/hooks/useSpaceSettingsStore', () => ({
  default: () => ({
    space: { 
      id: 'space-123', 
      subdomain: 'test-space' 
    }
  })
}));

// Setup mocks
const mockHistoryPushState = vi.fn();

describe('usePostSubmission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSupabaseClient).mockReturnValue(
      createSupabaseMock() as unknown as ReturnType<typeof getSupabaseClient>
    );
    // Mock window.history.pushState
    window.history.pushState = mockHistoryPushState;
    // Mock window.innerWidth to test mobile vs desktop behavior
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024 // Default to desktop width
    });
  });

  it('generates a slug from title when creating a post', async () => {
    const title = 'Make it happen';
    const slug = generateSlug(title);
    
    expect(slug).toBe('make-it-happen');
  });

  it('creates a post on mobile without direct navigation', async () => {
    // Simulate mobile device
    window.innerWidth = 480;

    const mockProps = {
      spaceId: 'space-123',
      userId: 'user-123',
      onPostCreated: vi.fn(),
      openPostModal: vi.fn()
    };
    
    const { result } = renderHook(() => usePostSubmission(mockProps));
    
    let response: Awaited<ReturnType<typeof result.current.submitPost>>;
    await act(async () => {
      response = await result.current.submitPost({
        title: 'Test Post',
        content: 'Test content',
        attachments: []
      });
    });
    
    expect(response!.success).toBe(true);
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockProps.openPostModal).not.toHaveBeenCalled();
    expect(mockProps.onPostCreated).toHaveBeenCalled();
  });

  it('creates a post on desktop without direct history mutation', async () => {
    // Simulate desktop device
    window.innerWidth = 1024;

    const mockProps = {
      spaceId: 'space-123',
      userId: 'user-123',
      onPostCreated: vi.fn(),
      openPostModal: vi.fn()
    };
    
    const { result } = renderHook(() => usePostSubmission(mockProps));
    
    let response: Awaited<ReturnType<typeof result.current.submitPost>>;
    await act(async () => {
      response = await result.current.submitPost({
        title: 'Test Post',
        content: 'Test content',
        attachments: []
      });
    });
    
    expect(response!.success).toBe(true);
    expect(mockHistoryPushState).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockProps.openPostModal).not.toHaveBeenCalled();
    expect(mockProps.onPostCreated).toHaveBeenCalled();
  });

  it('updates a post without direct history mutation', async () => {
    // Simulate desktop device
    window.innerWidth = 1024;

    const mockPost: PostCardProps = {
      id: 'mock-post-id',
      spaceId: 'space-123',
      title: 'Original Title',
      content: 'Original content',
      slug: 'original-title',
      author: {
        id: 'user-123',
        name: 'Test User',
        avatar: null
      },
      createdAt: '2023-01-01T00:00:00.000Z'
    };
    
    const mockProps = {
      spaceId: 'space-123',
      userId: 'user-123',
      editMode: true,
      post: mockPost,
      onPostUpdated: vi.fn()
    };
    
    const { result } = renderHook(() => usePostSubmission(mockProps));
    
    let response: Awaited<ReturnType<typeof result.current.submitPost>>;
    await act(async () => {
      response = await result.current.submitPost({
        title: 'Updated Post',
        content: 'Updated content',
        attachments: []
      });
    });
    
    expect(response!.success).toBe(true);
    expect(mockHistoryPushState).not.toHaveBeenCalled();
    expect(mockProps.onPostUpdated).toHaveBeenCalled();
  });

  it('should handle post submission correctly', async () => {
    const mockProps = {
      spaceId: 'test-space',
      userId: 'test-user',
      onPostCreated: vi.fn(),
    };

    const { result } = renderHook(() => usePostSubmission(mockProps));

    const post = {
      title: 'Test Post',
      content: 'Test content',
      attachments: [],
    };

    let response: Awaited<ReturnType<typeof result.current.submitPost>>;
    await act(async () => {
      response = await result.current.submitPost(post);
    });

    expect(response!.success).toBe(true);
    expect(response!.postId).toBe('test-id');
    expect(response!.slug).toBe('test-slug');
    expect(mockProps.onPostCreated).toHaveBeenCalled();
  });

  it('should handle submission errors', async () => {
    vi.mocked(getSupabaseClient).mockReturnValue(
      createSupabaseMock({ postError: new Error('Submission failed') }) as unknown as ReturnType<typeof getSupabaseClient>
    );

    const mockProps = {
      spaceId: 'test-space',
      userId: 'test-user',
      onPostCreated: vi.fn(),
    };

    const { result } = renderHook(() => usePostSubmission(mockProps));

    const post = {
      title: 'Test Post',
      content: 'Test content',
      attachments: [],
    };

    let response: Awaited<ReturnType<typeof result.current.submitPost>>;
    await act(async () => {
      response = await result.current.submitPost(post);
    });

    expect(response!.success).toBe(false);
    expect(response!.error).toBe('Submission failed');
    expect(mockProps.onPostCreated).not.toHaveBeenCalled();
  });
});
