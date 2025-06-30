import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePostSubmission } from '../usePostSubmission';
import { generateSlug } from '@/utils/slugUtils';
import type { PostCardProps } from '@/features/posts/types/postCard';

// Mock react-router-dom's useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate
}));

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  getSupabaseClient: () => ({
    from: vi.fn(() => ({
      insert: vi.fn(() => Promise.resolve({ data: { id: 'test-id', slug: 'test-slug' }, error: null })),
      update: vi.fn(() => Promise.resolve({ data: { id: 'test-id', slug: 'test-slug' }, error: null })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'test-id', slug: 'test-slug' }, error: null }))
        }))
      }))
    }))
  })
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

  it('navigates to slug URL after creating a post on mobile', async () => {
    // Simulate mobile device
    window.innerWidth = 480;

    const mockProps = {
      spaceId: 'space-123',
      userId: 'user-123',
      onPostCreated: vi.fn(),
      openPostModal: vi.fn()
    };
    
    const { result } = renderHook(() => usePostSubmission(mockProps));
    
    await result.current.submitPost({
      title: 'Test Post',
      content: 'Test content',
      attachments: []
    });
    
    // On mobile, it should navigate to the post URL
    expect(mockNavigate).toHaveBeenCalledWith('/test-space/space/test-post');
    // Modal should not be opened on mobile
    expect(mockProps.openPostModal).not.toHaveBeenCalled();
    // onPostCreated should be called
    expect(mockProps.onPostCreated).toHaveBeenCalled();
  });

  it('pushes slug URL to history without navigation on desktop', async () => {
    // Simulate desktop device
    window.innerWidth = 1024;

    const mockProps = {
      spaceId: 'space-123',
      userId: 'user-123',
      onPostCreated: vi.fn(),
      openPostModal: vi.fn()
    };
    
    const { result } = renderHook(() => usePostSubmission(mockProps));
    
    await result.current.submitPost({
      title: 'Test Post',
      content: 'Test content',
      attachments: []
    });
    
    // On desktop, it should update the URL without navigation
    expect(mockHistoryPushState).toHaveBeenCalled();
    const [state, title, url] = mockHistoryPushState.mock.calls[0];
    expect(url).toBe('/test-space/space/test-post');
    
    // Modal should be opened on desktop
    expect(mockProps.openPostModal).toHaveBeenCalled();
    // onPostCreated should be called
    expect(mockProps.onPostCreated).toHaveBeenCalled();
  });

  it('updates URL when slug changes after editing a post', async () => {
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
    
    await result.current.submitPost({
      title: 'Updated Post',
      content: 'Updated content',
      attachments: []
    });
    
    // URL should be updated since slug changed
    expect(mockHistoryPushState).toHaveBeenCalled();
    const [state, title, url] = mockHistoryPushState.mock.calls[0];
    expect(url).toBe('/test-space/space/updated-post');
    
    // onPostUpdated should be called
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

    const response = await result.current.submitPost(post);

    expect(response.success).toBe(true);
    expect(response.postId).toBe('test-id');
    expect(response.slug).toBe('test-slug');
    expect(mockProps.onPostCreated).toHaveBeenCalled();
  });

  it('should handle submission errors', async () => {
    vi.mocked(getSupabaseClient).mockImplementationOnce(() => ({
      from: vi.fn(() => ({
        insert: vi.fn(() => Promise.resolve({ data: null, error: new Error('Submission failed') })),
        update: vi.fn(() => Promise.resolve({ data: null, error: new Error('Submission failed') })),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: new Error('Submission failed') }))
          }))
        }))
      }))
    }));

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

    const response = await result.current.submitPost(post);

    expect(response.success).toBe(false);
    expect(response.error).toBe('Submission failed');
    expect(mockProps.onPostCreated).not.toHaveBeenCalled();
  });
}); 