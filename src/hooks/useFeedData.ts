import { useMemo } from 'react';
import { useOptimizedCachedPosts } from "@/hooks/useOptimizedCachedPosts";
import { useOptimizedCachedCategories } from "@/hooks/useOptimizedCachedCategories";
import { useStableSpaceId } from "@/hooks/useStableSpaceId";
import { useSpace } from "@/contexts/SpaceContext";
import useSpaceSettingsStore from "@/hooks/useSpaceSettingsStore";
import { useParams } from "react-router-dom";
import type { CachedPostType } from "@/features/posts/types/cachedPost";

/**
 * Hook for managing core feed data (posts, categories, loading states)
 * Extracted from useFeedLogic to reduce complexity and improve performance
 */
export function useFeedData(
  spaceId: string | undefined,
  disableVisibilityTracking?: boolean
) {
  const { subdomain } = useParams();
  const { space: contextSpaceData } = useSpace();
  const { space: storeSpace } = useSpaceSettingsStore();

  // 🔒 STABLE SPACE ID: Use the new stable space ID hook to prevent flickering
  const stableSpaceId = useStableSpaceId({
    contextSpaceData,
    currentSpaceData: storeSpace,
    subdomain,
    authLoading: false // We'll handle auth loading in the main hook
  });

  // ✅ SESSION-READY GATE: Prevent data fetching until we have a stable space ID
  const readyToFetchSpaceId = spaceId || stableSpaceId;

  // ============================================================================
  // POSTS DATA
  // ============================================================================
  
  const {
    posts: fetchedPosts,
    pinnedPosts: cachedPinnedPosts,
    loading: postsLoading,
    error: postsError,
    refetch: refetchPosts,
    totalCount,
    currentPage,
    totalPages,
    hasNextPage,
    loadPage,
    isLoadingMore,
    handlePostCreated: handleCachedPostCreated,
    handlePostUpdated: handleCachedPostUpdated,
    handlePostDeleted: handleCachedPostDeleted,
    handleLikeToggled: handleCachedLikeToggled,
    handleCommentAdded: handleCachedCommentAdded,
    handlePinToggled: handleCachedPinToggled,
    mapPostToCardProps: mapCachedPostToCardProps,
    refreshOnTabSwitch: refreshOnTabSwitchInternal,
  } = useOptimizedCachedPosts(readyToFetchSpaceId, { disableVisibilityTracking });

  // ============================================================================
  // CATEGORIES DATA
  // ============================================================================
  
  const { 
    categories: spaceCategories, 
    isLoading: categoriesLoading, 
    error: categoriesError, 
    refreshCategories 
  } = useOptimizedCachedCategories(stableSpaceId);

  // ============================================================================
  // COMPUTED VALUES (MEMOIZED)
  // ============================================================================
  
  const pinnedPosts = useMemo(() => cachedPinnedPosts, [cachedPinnedPosts]);

  // ============================================================================
  // RETURN INTERFACE
  // ============================================================================
  
  return {
    // Core data
    fetchedPosts,
    pinnedPosts,
    spaceCategories,
    
    // Loading states
    postsLoading,
    categoriesLoading,
    postsError,
    categoriesError,
    
    // Pagination
    totalCount,
    currentPage,
    totalPages,
    hasNextPage,
    isLoadingMore,
    
    // Action handlers
    refetchPosts,
    loadPage,
    refreshCategories,
    
    // Post handlers
    handleCachedPostCreated,
    handleCachedPostUpdated,
    handleCachedPostDeleted,
    handleCachedLikeToggled,
    handleCachedCommentAdded,
    handleCachedPinToggled,
    mapCachedPostToCardProps,
    refreshOnTabSwitch: refreshOnTabSwitchInternal,
    
    // Space data
    stableSpaceId,
    readyToFetchSpaceId,
  };
}
