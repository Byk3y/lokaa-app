import { log } from '@/utils/logger';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useOptimizedAuth } from "@/contexts/AuthContext";
import { useSpace } from "@/contexts/SpaceContext";
import useSpaceSettingsStore from "@/hooks/useSpaceSettingsStore";
import type { CachedPostType } from "@/features/posts/types/cachedPost";
import { getSupabaseClient } from '@/integrations/supabase/client';
import { PostService } from '@/services/PostService';
import type { PostCardProps } from "@/features/posts/types/postCard";
import type {
  FetchedPostType,
  FeedTabProps,
  OwnerDetails,
  EffectivePermissions
} from "@/types/feedTypes";
import {
  updatePinPositions,
  filterPinnedPostsByCategory,
  getCategoryDisplayName,
  getPostsToShow
} from "@/utils/feedUtils";

// Import the new focused hooks
import { useFeedData } from './useFeedData';
import { useFeedPermissions } from './useFeedPermissions';
import { useFeedModals } from './useFeedModals';
import { useFeedRealtime } from './useFeedRealtime';

/**
 * Return interface for the optimized feed logic hook
 * Reduced from 50+ return values to focused, stable values
 */
interface UseFeedLogicOptimizedReturn {
  // Core data
  currentUser: any;
  currentSpaceData: any;
  fetchedPosts: CachedPostType[];
  pinnedPosts: CachedPostType[];
  spaceCategories: any[];

  // Loading states
  authLoading: boolean;
  storeLoadingSpace: boolean;
  postsLoading: boolean;
  categoriesLoading: boolean;
  postsError: string | null;
  categoriesError: any;

  // Permissions
  effectivePermissions: EffectivePermissions;

  // UI State
  selectedTab: string;

  // Modal states
  modalStates: {
    isCreatePostOpen: boolean;
    isCategoryOpen: boolean;
    isPostDetailOpen: boolean;
    selectedPostForModal: PostCardProps | null;
    isLoadingUrlPost: boolean;
    urlPostError: string | null;
  };

  // Real-time state
  realtimeState: {
    newPostIds: string[];
    newPostCount: number;
    isConnected: boolean;
    isLoadingNewPosts: boolean;
    isDismissed: boolean;
    loadError: any;
    retryCount: number;
  };

  // Computed values
  filteredPinnedPosts: CachedPostType[];
  filteredRegularPosts: CachedPostType[];
  postsToShow: CachedPostType[];
  userNameForModal: string;
  userAvatarForModal: string;

  // Pagination
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  isLoadingMore: boolean;

  // Action handlers
  handleTabSelect: (tab: string) => void;
  handlePostCardClick: (post: PostCardProps) => void;
  handlePinToggled: (postId: string, isPinned: boolean, category?: string | null) => void;
  handleLikeToggledInCard: (postId: string, newLikeCount: number) => void;
  handleCommentAddedInModal: (postId: string, newCommentCount: number) => void;
  handlePostUpdated: (updatedPost: PostCardProps) => void;
  handlePostDeleted: (postId: string) => void;
  handlePostCreated: () => void;

  // Modal handlers
  handleClosePostModal: () => void;
  openCreatePostModal: () => void;
  closeCreatePostModal: () => void;
  openCategoryModal: () => void;
  closeCategoryModal: () => void;

  // Real-time handlers
  handleLoadNewPosts: (postIds: string[]) => Promise<void>;
  handleDismissNotification: () => void;
  clearNewPosts: () => void;

  // Utility functions
  mapPostToCardProps: (post: CachedPostType) => PostCardProps;
  refetchPosts: (forceRefresh?: boolean) => Promise<void>;
  loadPage: (page: number) => Promise<void>;
  refreshCategories: () => Promise<void>;

  // Enhanced mobile refresh
  refreshOnTabSwitch: () => Promise<void>;
}

/**
 * Optimized business logic hook for FeedTab
 * Uses focused sub-hooks to reduce complexity and improve performance
 */
export function useFeedLogicOptimized({
  user: userProp,
  isOwner: isOwnerProp,
  isAdmin: isAdminProp,
  postInputRef,
  hasInstantAccess,
  disableVisibilityTracking
}: FeedTabProps): UseFeedLogicOptimizedReturn {

  // ============================================================================
  // SETUP & INITIALIZATION  
  // ============================================================================

  const location = useLocation();
  const navigate = useNavigate();

  // Current user - prioritize prop, fallback to context
  const { user: contextUser, loading: authLoading } = useOptimizedAuth();
  const currentUser = userProp || contextUser;

  const { space: contextSpaceData } = useSpace();
  const { space: storeSpace, loadingSpace: storeLoadingSpace } = useSpaceSettingsStore();
  const { subdomain } = useParams();

  // ============================================================================
  // SPACE DATA RESOLUTION
  // ============================================================================

  // PHASE 1.5 FIX: Enhanced space data selection - only use storeSpace if it has valid name
  const currentSpaceData = useMemo(() => {
    // Use store space ONLY if it matches the current URL subdomain
    if (storeSpace && storeSpace.name && storeSpace.subdomain === subdomain) {
      return storeSpace;
    }

    // Otherwise, prefer context space if it matches the URL subdomain
    if (contextSpaceData && contextSpaceData.name && contextSpaceData.subdomain === subdomain) {
      return contextSpaceData;
    }

    // No matching space data yet → wait (prevents using previous space transiently)
    return null;
  }, [storeSpace, contextSpaceData, subdomain]);

  // ============================================================================
  // FOCUSED HOOKS
  // ============================================================================

  // Get space ID for data fetching
  const spaceId = currentSpaceData?.id;

  // Core data hook
  const {
    fetchedPosts,
    pinnedPosts,
    spaceCategories,
    postsLoading,
    categoriesLoading,
    postsError,
    categoriesError,
    totalCount,
    currentPage,
    totalPages,
    hasNextPage,
    isLoadingMore,
    refetchPosts,
    loadPage,
    refreshCategories,
    handleCachedPostCreated,
    handleCachedPostUpdated,
    handleCachedPostDeleted,
    handleCachedLikeToggled,
    handleCachedCommentAdded,
    handleCachedPinToggled,
    mapCachedPostToCardProps,
    refreshOnTabSwitch: refreshOnTabSwitchInternal,
    stableSpaceId,
  } = useFeedData(spaceId, disableVisibilityTracking);

  // Permissions hook
  const { effectivePermissions } = useFeedPermissions(
    userProp,
    isOwnerProp,
    isAdminProp,
    stableSpaceId
  );

  // Modals hook
  const {
    modalStates,
    openCreatePostModal,
    closeCreatePostModal,
    openCategoryModal,
    closeCategoryModal,
    handleClosePostModal,
    setPostModalOpen,
    setSelectedPost,
  } = useFeedModals();

  // Real-time hook
  const {
    realtimeState,
    handleLoadNewPosts,
    handleDismissNotification,
    clearNewPosts,
  } = useFeedRealtime(
    spaceId,
    currentUser?.id,
    handleCachedPostCreated,
    handleCachedPostUpdated,
    handleCachedPostDeleted
  );

  // ============================================================================
  // UI STATE MANAGEMENT (SIMPLIFIED)
  // ============================================================================

  const [selectedTab, setSelectedTab] = useState("all");

  // ============================================================================
  // OWNER DETAILS & SETUP GUIDE
  // ============================================================================

  const [ownerDetails, setOwnerDetails] = useState<OwnerDetails | null>(null);
  const isAdminOrOwner = effectivePermissions.effectiveIsOwner || effectivePermissions.effectiveIsAdmin;

  // ============================================================================
  // COMPUTED VALUES (OPTIMIZED MEMOIZATION)
  // ============================================================================

  // Split complex computed values into separate useMemo hooks for better performance
  const filteredPinnedPosts = useMemo(() => {
    // Convert CachedPostType to FetchedPostType for compatibility with utility functions
    const convertedPinnedPosts: FetchedPostType[] = pinnedPosts.map(post => ({
      ...post,
      media_urls: post.media_urls?.map((url, index) => ({
        id: `${post.id}-media-${index}`,
        url,
        type: 'file' as const
      })) || null
    }));
    const filtered = filterPinnedPostsByCategory(convertedPinnedPosts, selectedTab);
    // Convert back to CachedPostType for return
    return filtered.map(post => ({
      ...post,
      media_urls: post.media_urls?.map(attachment => attachment.url) || null
    })) as CachedPostType[];
  }, [pinnedPosts, selectedTab]);

  const filteredRegularPosts = useMemo(() => {
    return fetchedPosts.filter(post =>
      selectedTab === "all" ||
      post.category?.id === selectedTab
    );
  }, [fetchedPosts, selectedTab]);

  const postsToShow = useMemo(() => {
    // Convert CachedPostType to FetchedPostType for compatibility with utility functions
    const convertedPinnedPosts: FetchedPostType[] = pinnedPosts.map(post => ({
      ...post,
      media_urls: post.media_urls?.map((url, index) => ({
        id: `${post.id}-media-${index}`,
        url,
        type: 'file' as const
      })) || null
    }));
    const convertedFetchedPosts: FetchedPostType[] = fetchedPosts.map(post => ({
      ...post,
      media_urls: post.media_urls?.map((url, index) => ({
        id: `${post.id}-media-${index}`,
        url,
        type: 'file' as const
      })) || null
    }));
    const result = getPostsToShow(
      convertedPinnedPosts,
      convertedFetchedPosts,
      effectivePermissions.effectiveIsOwner || effectivePermissions.effectiveIsAdmin
    );
    // Convert back to CachedPostType for return
    return result.map(post => ({
      ...post,
      media_urls: post.media_urls?.map(attachment => attachment.url) || null
    })) as CachedPostType[];
  }, [pinnedPosts, fetchedPosts, effectivePermissions]);

  const userNameForModal = useMemo(() =>
    currentUser?.email?.split('@')[0] || "Anonymous User",
    [currentUser?.email]
  );

  const userAvatarForModal = useMemo(() =>
    currentUser?.user_metadata?.avatar_url,
    [currentUser?.user_metadata?.avatar_url]
  );

  // ============================================================================
  // ACTION HANDLERS (STABLE)
  // ============================================================================

  const handleTabSelect = useCallback((tab: string) => {
    setSelectedTab(tab);
  }, []);

  const handlePostCardClick = useCallback((post: PostCardProps) => {
    log.debug('Hook', '[FeedLogicOptimized] Post card clicked:', post.title || post.id);

    // Check if we're in search mode (URL contains /search)
    const isInSearchMode = location.pathname.includes('/search');

    if (isInSearchMode && post.slug) {
      // In search mode, navigate to the actual post URL instead of adding search params
      const currentPath = location.pathname;
      const pathSegments = currentPath.split('/');
      const subdomain = pathSegments[1]; // Extract subdomain from current path

      const postUrl = `/${subdomain}/space/${post.slug}`;
      log.debug('Hook', '[FeedLogicOptimized] In search mode, navigating to post URL:', postUrl);
      navigate(postUrl, { replace: false });
      return;
    }

    // Normal feed mode - open modal and add search params
    setSelectedPost(post);
    setPostModalOpen(true);

    // Update URL using search params to avoid route conflicts
    // This keeps us in the FeedTab while showing the post modal
    if (post.slug) {
      const searchParams = new URLSearchParams(location.search);
      searchParams.set('post', post.slug);
      log.debug('Hook', '[FeedLogicOptimized] Updating URL with post param:', post.slug);
      navigate({ search: searchParams.toString() }, { replace: false });
    }
  }, [navigate, location.search, location.pathname, setSelectedPost, setPostModalOpen]);

  const handleCommentAddedInModal = useCallback((postId: string, newCommentCount: number) => {
    handleCachedCommentAdded(postId, newCommentCount);
  }, [handleCachedCommentAdded]);

  const handleLikeToggledInCard = useCallback((postId: string, newLikeCount: number) => {
    handleCachedLikeToggled(postId, newLikeCount);
    // Update selected post in modal if it's the same post
    if (modalStates.selectedPostForModal?.id === postId) {
      setSelectedPost({ ...modalStates.selectedPostForModal, likes: newLikeCount });
    }
  }, [handleCachedLikeToggled, modalStates.selectedPostForModal, setSelectedPost]);

  const handlePinToggled = useCallback(async (postId: string, isPinned: boolean, category?: string | null) => {
    const currentPinnedCount = pinnedPosts.length;

    if (isPinned && currentPinnedCount >= 4) {
      await refetchPosts(true);
    } else {
      handleCachedPinToggled(postId, isPinned);
    }

    // Update selected post in modal if it's the same post
    if (modalStates.selectedPostForModal?.id === postId) {
      setSelectedPost({ ...modalStates.selectedPostForModal, isPinned, pinCategory: category });
    }
  }, [pinnedPosts.length, refetchPosts, handleCachedPinToggled, modalStates.selectedPostForModal, setSelectedPost]);

  const handlePostUpdated = useCallback((updatedPost: PostCardProps) => {
    handleCachedPostUpdated(updatedPost.id, {
      content: updatedPost.content,
      title: updatedPost.title,
      edited_at: updatedPost.editedAt,
      media_urls: updatedPost.media_urls?.map(media => media.url) || null  // CRITICAL FIX: Include media_urls
    });

    setSelectedPost(updatedPost);
  }, [handleCachedPostUpdated, setSelectedPost]);

  const handlePostDeleted = useCallback((postId: string) => {
    handleCachedPostDeleted(postId);
    setPostModalOpen(false);
    setSelectedPost(null);
  }, [handleCachedPostDeleted, setPostModalOpen, setSelectedPost]);

  const handlePostCreated = useCallback(() => {
    refetchPosts(true);
  }, [refetchPosts]);

  // ============================================================================
  // UTILITY FUNCTIONS (STABLE)
  // ============================================================================

  const mapPostToCardProps = useCallback((post: CachedPostType): PostCardProps => {
    const mapped = mapCachedPostToCardProps(post);
    return {
      ...mapped,
      currentUserId: currentUser?.id,
      isAdmin: effectivePermissions.effectiveIsAdmin,
    };
  }, [mapCachedPostToCardProps, currentUser?.id, effectivePermissions.effectiveIsAdmin]);

  // ============================================================================
  // RETURN INTERFACE
  // ============================================================================

  return {
    // Core data
    currentUser,
    currentSpaceData,
    fetchedPosts,
    pinnedPosts,
    spaceCategories,

    // Loading states
    authLoading,
    storeLoadingSpace,
    postsLoading,
    categoriesLoading,
    postsError,
    categoriesError,

    // Permissions
    effectivePermissions,

    // UI State
    selectedTab,

    // Modal states
    modalStates,

    // Real-time state
    realtimeState,

    // Computed values
    filteredPinnedPosts,
    filteredRegularPosts,
    postsToShow,
    userNameForModal,
    userAvatarForModal,

    // Pagination
    totalCount,
    currentPage,
    totalPages,
    hasNextPage,
    isLoadingMore,

    // Action handlers
    handleTabSelect,
    handlePostCardClick,
    handlePinToggled,
    handleLikeToggledInCard,
    handleCommentAddedInModal,
    handlePostUpdated,
    handlePostDeleted,
    handlePostCreated,

    // Modal handlers
    handleClosePostModal,
    openCreatePostModal,
    closeCreatePostModal,
    openCategoryModal,
    closeCategoryModal,

    // Real-time handlers
    handleLoadNewPosts,
    handleDismissNotification,
    clearNewPosts,

    // Utility functions
    mapPostToCardProps,
    refetchPosts,
    loadPage,
    refreshCategories,

    // Enhanced mobile refresh
    refreshOnTabSwitch: refreshOnTabSwitchInternal,
  };
}
