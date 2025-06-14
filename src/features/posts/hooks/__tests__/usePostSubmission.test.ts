import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react-hooks';
import { usePostSubmission } from '../usePostSubmission';
import { generateSlug } from '@/utils/slugUtils';
import type { PostCardProps } from '@/features/posts/types/postCard';

// Mock react-router-dom's useNavigate
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate
}));

// Mock the Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: {
              id: 'mock-post-id',
              title: 'Test Post',
              content: 'Test content',
              created_at: '2023-01-01T00:00:00.000Z',
              slug: 'test-post',
              author: {
                id: 'user-123',
                full_name: 'Test User',
                avatar_url: null,
                profile_url: null
              },
              space: {
                id: 'space-123',
                subdomain: 'test-space'
              }
            },
            error: null
          }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({
              data: {
                id: 'mock-post-id',
                title: 'Updated Post',
                content: 'Updated content',
                edited_at: '2023-01-02T00:00:00.000Z',
                slug: 'updated-post'
              },
              error: null
            }))
          }))
        }))
      }))
    })
  }
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
const mockNavigate = vi.fn();
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
}); 