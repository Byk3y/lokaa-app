import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFeedLogicOptimized } from '../useFeedLogicOptimized';
import type { FeedTabProps } from '@/types/feedTypes';

const mocks = vi.hoisted(() => ({
  refetchPosts: vi.fn(),
  navigate: vi.fn(),
  handleCachedPostCreated: vi.fn(),
  handleCachedPostUpdated: vi.fn(),
  handleCachedPostDeleted: vi.fn(),
  handleCachedLikeToggled: vi.fn(),
  handleCachedCommentAdded: vi.fn(),
  handleCachedPinToggled: vi.fn(),
  mapCachedPostToCardProps: vi.fn(),
  loadPage: vi.fn(),
  refreshCategories: vi.fn(),
  refreshOnTabSwitch: vi.fn(),
  openCreatePostModal: vi.fn(),
  closeCreatePostModal: vi.fn(),
  openCategoryModal: vi.fn(),
  closeCategoryModal: vi.fn(),
  handleClosePostModal: vi.fn(),
  setPostModalOpen: vi.fn(),
  setSelectedPost: vi.fn(),
  handleLoadNewPosts: vi.fn(),
  handleDismissNotification: vi.fn(),
  clearNewPosts: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useLocation: () => ({ pathname: '/mvp/space', search: '' }),
    useNavigate: () => mocks.navigate,
    useParams: () => ({ subdomain: 'mvp' }),
  };
});

vi.mock('@/contexts/AuthContext', () => ({
  useOptimizedAuth: () => ({
    user: {
      id: 'user-123',
      email: 'ada@example.com',
      user_metadata: { full_name: 'Ada' },
    },
    loading: false,
  }),
}));

vi.mock('@/contexts/SpaceContext', () => ({
  useSpace: () => ({
    space: {
      id: 'space-123',
      name: 'MVP Space',
      subdomain: 'mvp',
    },
  }),
}));

vi.mock('@/hooks/useSpaceSettingsStore', () => ({
  default: () => ({
    space: null,
    loadingSpace: false,
    permissions: null,
  }),
}));

vi.mock('../useFeedData', () => ({
  useFeedData: () => ({
    fetchedPosts: [],
    pinnedPosts: [],
    spaceCategories: [],
    postsLoading: false,
    categoriesLoading: false,
    postsError: null,
    categoriesError: null,
    totalCount: 0,
    currentPage: 1,
    totalPages: 1,
    hasNextPage: false,
    isLoadingMore: false,
    refetchPosts: mocks.refetchPosts,
    loadPage: mocks.loadPage,
    refreshCategories: mocks.refreshCategories,
    handleCachedPostCreated: mocks.handleCachedPostCreated,
    handleCachedPostUpdated: mocks.handleCachedPostUpdated,
    handleCachedPostDeleted: mocks.handleCachedPostDeleted,
    handleCachedLikeToggled: mocks.handleCachedLikeToggled,
    handleCachedCommentAdded: mocks.handleCachedCommentAdded,
    handleCachedPinToggled: mocks.handleCachedPinToggled,
    mapCachedPostToCardProps: mocks.mapCachedPostToCardProps,
    refreshOnTabSwitch: mocks.refreshOnTabSwitch,
    stableSpaceId: 'space-123',
  }),
}));

vi.mock('../useFeedPermissions', () => ({
  useFeedPermissions: () => ({
    effectivePermissions: {
      effectiveIsOwner: false,
      effectiveIsAdmin: false,
      canAccessSettings: false,
    },
  }),
}));

vi.mock('../useFeedModals', () => ({
  useFeedModals: () => ({
    modalStates: {
      isCreatePostOpen: false,
      isCategoryOpen: false,
      isPostDetailOpen: false,
      selectedPostForModal: null,
      isLoadingUrlPost: false,
      urlPostError: null,
    },
    openCreatePostModal: mocks.openCreatePostModal,
    closeCreatePostModal: mocks.closeCreatePostModal,
    openCategoryModal: mocks.openCategoryModal,
    closeCategoryModal: mocks.closeCategoryModal,
    handleClosePostModal: mocks.handleClosePostModal,
    setPostModalOpen: mocks.setPostModalOpen,
    setSelectedPost: mocks.setSelectedPost,
  }),
}));

vi.mock('../useFeedRealtime', () => ({
  useFeedRealtime: () => ({
    realtimeState: {
      newPostIds: [],
      newPostCount: 0,
      isConnected: false,
      isLoadingNewPosts: false,
      isDismissed: false,
      loadError: null,
      retryCount: 0,
    },
    handleLoadNewPosts: mocks.handleLoadNewPosts,
    handleDismissNotification: mocks.handleDismissNotification,
    clearNewPosts: mocks.clearNewPosts,
  }),
}));

const feedProps: FeedTabProps = {
  user: {
    id: 'user-123',
    email: 'ada@example.com',
    user_metadata: { full_name: 'Ada' },
  } as FeedTabProps['user'],
  isOwner: false,
  isAdmin: false,
  hasInstantAccess: true,
};

describe('useFeedLogicOptimized', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('forces a feed refetch after a post is created', () => {
    const { result } = renderHook(() => useFeedLogicOptimized(feedProps));

    act(() => {
      result.current.handlePostCreated();
    });

    expect(mocks.refetchPosts).toHaveBeenCalledTimes(1);
    expect(mocks.refetchPosts).toHaveBeenCalledWith(true);
  });
});
