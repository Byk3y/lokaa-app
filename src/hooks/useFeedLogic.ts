// HMR TEST COMMENT C: Test completed - Hook HMR optimized
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useOptimizedAuth } from "@/contexts/AuthContext";
import { useSpace } from "@/contexts/SpaceContext";
import useSpaceSettingsStore from "@/hooks/useSpaceSettingsStore";
import { useOptimizedCachedPosts } from "@/hooks/useOptimizedCachedPosts";
import { useOptimizedCachedCategories } from "@/hooks/useOptimizedCachedCategories";
import { useStableSpaceId } from "@/hooks/useStableSpaceId";
import type { CachedPostType } from "@/hooks/useCachedPosts";
import { useRealtimePosts } from "@/hooks/useRealtimePosts";
import { useNewPostsState } from "@/hooks/useNewPostsState";
import { getSupabaseClient } from '@/integrations/supabase/client';
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
// Space state preservation is now handled by individual components

/**
 * Return interface for the feed logic hook
 * Following the established pattern found in other hooks
 */
interface UseFeedLogicReturn {
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
 * Business logic hook for FeedTab
 * Extracts all state management, handlers, and computed values
 */
export function useFeedLogic({ 
  user: userProp, 
  isOwner: isOwnerProp, 
  isAdmin: isAdminProp, 
  postInputRef,
  hasInstantAccess
}: FeedTabProps): UseFeedLogicReturn {
  
  // ============================================================================
  // SETUP & INITIALIZATION  
  // ============================================================================
  
  const location = useLocation();
  const navigate = useNavigate();
  
  // Add ref to track permission changes and prevent excessive logging
  const lastPermissionLog = useRef<string | null>(null);
  
  // Current user - prioritize prop, fallback to context
  const { user: contextUser, loading: authLoading } = useOptimizedAuth();
  const currentUser = userProp || contextUser;
  
  const { spaceData: contextSpaceData } = useSpace();
  
  // ============================================================================
  // SPACE DATA & PERMISSIONS
  // ============================================================================
  
  const { 
    space: storeSpace, 
    permissions: storePermissions, 
    loadingSpace: storeLoadingSpace,
  } = useSpaceSettingsStore();
  
  const { subdomain } = useParams();
  
  // PHASE 1.5 FIX: Enhanced space data selection - only use storeSpace if it has valid name
  const currentSpaceData = useMemo(() => {
    // CRITICAL: Only use storeSpace if it has a valid name field
    if (storeSpace && storeSpace.name) {
      return storeSpace;
    }
    
    // Fall back to context space data
    if (contextSpaceData && contextSpaceData.name) {
      return contextSpaceData;
    }
    
    // If neither has a valid name, return null (will trigger fallback)
    return null;
  }, [storeSpace, contextSpaceData]);
  
  // 🔒 STABLE SPACE ID: Use the new stable space ID hook to prevent flickering during tab switches
  const stableSpaceId = useStableSpaceId({
    contextSpaceData,
    currentSpaceData,
    subdomain,
    authLoading
  });

  // ✅ SESSION-READY GATE: Prevent data fetching until auth is complete and we have a stable space ID
  const readyToFetchSpaceId = authLoading ? undefined : stableSpaceId;
  
  // ENHANCED: Debug logging for space ID resolution
  useEffect(() => {
    console.log(`🔍 [useFeedLogic] Stable space ID status for ${subdomain}:`, {
      stableSpaceId,
      readyToFetchSpaceId,
      contextSpaceData: contextSpaceData ? { id: contextSpaceData.id, subdomain: contextSpaceData.subdomain } : null,
      currentSpaceData: currentSpaceData ? { id: currentSpaceData.id, subdomain: currentSpaceData.subdomain } : null,
      authLoading
    });
  }, [stableSpaceId, subdomain, contextSpaceData, currentSpaceData, authLoading, readyToFetchSpaceId]);
  
  // FIXED: Enhanced permission resolution that prevents circular dependencies and race conditions
  const effectivePermissions: EffectivePermissions = useMemo(() => {
    // Priority-based permission resolution:
    // 1. Use store permissions if fully loaded and available
    // 2. Fall back to props only if store is explicitly null/undefined but props are available
    // 3. Default to false for safety
    
    const isStoreLoaded = storePermissions !== null && storePermissions !== undefined;
    const hasValidProps = (isOwnerProp !== undefined && isOwnerProp !== null) || 
                         (isAdminProp !== undefined && isAdminProp !== null);
    
    // Use store if available, otherwise use props, otherwise default to false
    const resolvedIsOwner = isStoreLoaded 
      ? (storePermissions.isOwner ?? false)
      : hasValidProps 
        ? (isOwnerProp ?? false)
        : false;
        
    const resolvedIsAdmin = isStoreLoaded 
      ? (storePermissions.isAdmin ?? false) 
      : hasValidProps 
        ? (isAdminProp ?? false)
        : false;
    
    const permissions = {
      effectiveIsOwner: resolvedIsOwner,
      effectiveIsAdmin: resolvedIsAdmin,
      canAccessSettings: isStoreLoaded 
        ? (storePermissions.canAccessSettings ?? false)
        : (resolvedIsOwner || resolvedIsAdmin),
    };

    // SECURITY AUDIT: Ensure canAccessSettings is only true for owners or admins
    if (permissions.canAccessSettings && !permissions.effectiveIsOwner && !permissions.effectiveIsAdmin) {
      console.warn("⚠️ SECURITY AUDIT: canAccessSettings granted to regular member", {
        canAccessSettings: permissions.canAccessSettings,
        effectiveIsOwner: permissions.effectiveIsOwner,
        effectiveIsAdmin: permissions.effectiveIsAdmin,
        storePermissions,
        isOwnerProp,
        isAdminProp,
        isStoreLoaded,
        hasValidProps,
        timestamp: new Date().toISOString()
      });
      // SECURITY FIX: Override canAccessSettings if user is not owner or admin
      permissions.canAccessSettings = false;
    }
    
    // Debug logging only when permissions actually change
    const permKey = `${permissions.effectiveIsOwner}-${permissions.effectiveIsAdmin}-${permissions.canAccessSettings}`;
    if (!lastPermissionLog.current || lastPermissionLog.current !== permKey) {
      console.log(`🔧 [EffectivePermissions] Updated for ${stableSpaceId || 'unknown'}:`, {
        effectiveIsOwner: permissions.effectiveIsOwner,
        effectiveIsAdmin: permissions.effectiveIsAdmin,
        canAccessSettings: permissions.canAccessSettings,
        source: isStoreLoaded ? 'store' : hasValidProps ? 'props' : 'default',
        isStoreLoaded,
        hasValidProps
      });
      lastPermissionLog.current = permKey;
    }

    return permissions;
  }, [storePermissions, isOwnerProp, isAdminProp, stableSpaceId]);
  
  // ============================================================================
  // POSTS & CATEGORIES DATA
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
    handlePostCreated: handleCachedPostCreated,
    handlePostUpdated: handleCachedPostUpdated,
    handlePostDeleted: handleCachedPostDeleted,
    handleLikeToggled: handleCachedLikeToggled,
    handleCommentAdded: handleCachedCommentAdded,
    handlePinToggled: handleCachedPinToggled,
    mapPostToCardProps: mapCachedPostToCardProps,
    refreshOnTabSwitch: refreshOnTabSwitchInternal,
  } = useOptimizedCachedPosts(readyToFetchSpaceId);
  
  const { 
    categories: spaceCategories, 
    isLoading: categoriesLoading, 
    error: categoriesError, 
    refreshCategories 
  } = useOptimizedCachedCategories(stableSpaceId);
  
  const pinnedPosts = cachedPinnedPosts;
  
  // ============================================================================
  // UI STATE MANAGEMENT (SIMPLIFIED)
  // ============================================================================
  
  const [selectedTab, setSelectedTab] = useState("all");
  
  // ============================================================================
  // MODAL STATE MANAGEMENT
  // ============================================================================
  
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedPostForModal, setSelectedPostForModal] = useState<PostCardProps | null>(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isLoadingUrlPost, setIsLoadingUrlPost] = useState(false);
  const [urlPostError, setUrlPostError] = useState<string | null>(null);
  
  // ============================================================================
  // REAL-TIME SYSTEM
  // ============================================================================
  
  const {
    newPostIds,
    newPostCount,
    isConnected: isRealtimeConnected,
    clearNewPosts,
  } = useRealtimePosts({
    spaceId: readyToFetchSpaceId || '',
    userId: currentUser?.id || '',
    isEnabled: !!readyToFetchSpaceId && !!currentUser?.id,
  });

  const {
    isLoadingNewPosts,
    isDismissed,
    loadError,
    retryCount,
    handleLoadNewPosts,
    handleDismissNotification,
    updateLastNotificationTime,
  } = useNewPostsState({
    onLoadNewPosts: async (postIds: string[]) => {
      console.log(`🔄 [FeedLogic] Loading new posts: ${postIds.join(', ')}`);
      
      if (!postIds.length || !stableSpaceId) return;
      
      try {
        const supabase = getSupabaseClient();
        // Fetch only the new posts by their IDs from Supabase
        const { data: newPosts, error } = await getSupabaseClient()
          .from('posts')
          .select(`
            id,
            title,
            content,
            created_at,
            updated_at,
            space_id,
            user_id,
            like_count,
            comment_count,
            media_urls,
            is_pinned,
            pin_category,
            pin_position,
            poll_data,
            slug,
            category:space_categories!left (
              id,
              name,
              icon
            )
          `)
          .in('id', postIds)
          .eq('space_id', stableSpaceId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('❌ [FeedLogic] Error fetching new posts:', error);
          throw error;
        }

        if (newPosts && newPosts.length > 0) {
          // Fetch authors for the new posts
          const userIds = Array.from(new Set(newPosts.map((post: any) => post.user_id).filter(id => !!id)));
          const authorsMap = new Map();
          
          if (userIds.length > 0) {
            const supabase = getSupabaseClient();
            const { data: authorsData } = await getSupabaseClient()
              .from('users')
              .select('id, full_name, avatar_url, profile_url, activity_score')
              .in('id', userIds);
              
            if (authorsData) {
              authorsData.forEach(author => {
                if (author && author.id) {
                  authorsMap.set(author.id, {
                    id: author.id,
                    full_name: author.full_name,
                    avatar_url: author.avatar_url,
                    profile_url: author.profile_url,
                    activity_score: author.activity_score,
                  });
                }
              });
            }
          }

          // Transform posts to match CachedPostType and add to cache
          newPosts.forEach((post: any) => {
            const transformedPost = {
              ...post,
              author: authorsMap.get(post.user_id) || null,
            };
            handleCachedPostCreated(transformedPost);
          });
          
          console.log(`✅ [FeedLogic] Successfully loaded ${newPosts.length} new posts`);
          clearNewPosts();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } catch (error) {
        console.error('❌ [FeedLogic] Failed to load new posts:', error);
        throw error;
      }
    },
    maxRetries: 2,
    retryDelay: 3000,
  });

  // ============================================================================
  // OWNER DETAILS & SETUP GUIDE
  // ============================================================================
  
  const [ownerDetails, setOwnerDetails] = useState<OwnerDetails | null>(null);
  const isAdminOrOwner = effectivePermissions.effectiveIsOwner || effectivePermissions.effectiveIsAdmin;

  // ============================================================================
  // COMPUTED VALUES (MEMOIZED)
  // ============================================================================
  
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
  // ACTION HANDLERS
  // ============================================================================
  
  const handleTabSelect = useCallback((tab: string) => {
    setSelectedTab(tab);
  }, []);

  const handlePostCardClick = useCallback((post: PostCardProps) => {
    console.log('[FeedLogic] Post card clicked:', post.title || post.id);
    setSelectedPostForModal(post);
    setIsPostModalOpen(true);
    
    // Update URL using search params to avoid route conflicts
    // This keeps us in the FeedTab while showing the post modal
    if (post.slug) {
      const searchParams = new URLSearchParams(location.search);
      searchParams.set('post', post.slug);
      console.log('[FeedLogic] Updating URL with post param:', post.slug);
      navigate({ search: searchParams.toString() }, { replace: false });
    }
  }, [navigate, location.search]);

  const handleClosePostModal = useCallback(() => {
    console.log('[FeedLogic] Closing post modal');
    setIsPostModalOpen(false);
    setSelectedPostForModal(null);
    
    // Remove post parameter from URL
    const searchParams = new URLSearchParams(location.search);
    searchParams.delete('post');
    console.log('[FeedLogic] Removing post parameter from URL');
    navigate({ search: searchParams.toString() }, { replace: true });
  }, [navigate, location.search]);

  const handleCommentAddedInModal = useCallback((postId: string, newCommentCount: number) => {
    handleCachedCommentAdded(postId, newCommentCount);
  }, [handleCachedCommentAdded]);

  const handleLikeToggledInCard = useCallback((postId: string, newLikeCount: number) => {
    handleCachedLikeToggled(postId, newLikeCount);
    setSelectedPostForModal(prev =>
      prev && prev.id === postId ? { ...prev, likes: newLikeCount } : prev
    );
  }, [handleCachedLikeToggled]);

  const handlePinToggled = useCallback(async (postId: string, isPinned: boolean, category?: string | null) => {
    const currentPinnedCount = pinnedPosts.length;
    
    if (isPinned && currentPinnedCount >= 4) {
      await refetchPosts(true);
    } else {
      handleCachedPinToggled(postId, isPinned);
    }
    
    setSelectedPostForModal(prev =>
      prev && prev.id === postId ? { ...prev, isPinned, pinCategory: category } : prev
    );
  }, [pinnedPosts.length, refetchPosts, handleCachedPinToggled]);

  const handlePostUpdated = useCallback((updatedPost: PostCardProps) => {
    handleCachedPostUpdated(updatedPost.id, {
      content: updatedPost.content,
      title: updatedPost.title,
      edited_at: updatedPost.editedAt
    });
    
    setSelectedPostForModal(updatedPost);
  }, [handleCachedPostUpdated]);

  const handlePostDeleted = useCallback((postId: string) => {
    handleCachedPostDeleted(postId);
    setIsPostModalOpen(false);
    setSelectedPostForModal(null);
  }, [handleCachedPostDeleted]);

  const handlePostCreated = useCallback(() => {
    refetchPosts(true);
  }, [refetchPosts]);

  // ============================================================================
  // MODAL HANDLERS
  // ============================================================================
  
  const openCreatePostModal = useCallback(() => {
    const searchParams = new URLSearchParams(location.search);
    searchParams.set('action', 'create-post');
    navigate({ search: searchParams.toString() }, { replace: true });
  }, [location.search, navigate]);

  const closeCreatePostModal = useCallback(() => {
    const searchParams = new URLSearchParams(location.search);
    searchParams.delete('action');
    navigate({ search: searchParams.toString() }, { replace: true });
  }, [location.search, navigate]);

  const openCategoryModal = useCallback(() => {
    setIsCategoryModalOpen(true);
  }, []);

  const closeCategoryModal = useCallback(() => {
    setIsCategoryModalOpen(false);
  }, []);

  // Handle URL-based modal state
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('action') === 'create-post') {
      setIsCreatePostModalOpen(true);
    } else {
      if (isCreatePostModalOpen && !searchParams.get('action')) {
         setIsCreatePostModalOpen(false);
      }
    }
  }, [location.search, isCreatePostModalOpen]);

  // NEW: URL-based post detection and modal synchronization via search params
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const postSlug = searchParams.get('post');
    
    console.log('[FeedLogic] URL Effect triggered:', {
      pathname: location.pathname,
      searchParams: location.search,
      postSlug,
      modalOpen: isPostModalOpen,
      selectedPost: selectedPostForModal?.slug
    });
    
    if (postSlug && stableSpaceId) {
      // Skip if we already have this post selected or if we're in a loading state
      if (selectedPostForModal?.slug === postSlug || isLoadingUrlPost) {
        console.log('[FeedLogic] Skipping - already selected or loading:', {
          currentSlug: selectedPostForModal?.slug,
          targetSlug: postSlug,
          isLoading: isLoadingUrlPost
        });
        return;
      }
      
      // Fetch post by slug and open modal
      const fetchAndOpenPost = async () => {
        setIsLoadingUrlPost(true);
        setUrlPostError(null);
        
        try {
          console.log('[FeedLogic] Detected post slug in URL:', postSlug, 'fetching post...');
          
          const supabase = getSupabaseClient();
          // Fetch the post by slug
          const { data: postDataRaw, error: postError } = await (supabase as any)
            .from('posts')
            .select(`
              id, created_at, content, title, like_count, comment_count, user_id, space_id, 
              media_urls, category_id, is_pinned, pinned_at, pin_position, pin_category, 
              updated_at, poll_data, slug,
              author:users!posts_user_id_fkey(id, full_name, avatar_url, profile_url, activity_score),
              category:space_categories!posts_category_id_fkey(id, name, icon)
            `)
            .eq('slug', postSlug)
            .eq('space_id', stableSpaceId)
            .single();

          let postData = postDataRaw;

          if (postError) {
            // Try to fetch by ID as fallback for legacy URLs
            const { data: legacyPost, error: legacyError } = await (getSupabaseClient() as any)
              .from('posts')
              .select(`
                id, created_at, content, title, like_count, comment_count, user_id, space_id, 
                media_urls, category_id, is_pinned, pinned_at, pin_position, pin_category, 
                updated_at, poll_data, slug,
                author:users!posts_user_id_fkey(id, full_name, avatar_url, profile_url, activity_score),
                category:space_categories!posts_category_id_fkey(id, name, icon)
              `)
              .eq('id', postSlug)
              .eq('space_id', stableSpaceId)
              .single();

            if (legacyError || !legacyPost) {
              console.error('[FeedLogic] Post not found by slug or ID:', { postError, legacyError });
              setUrlPostError('Post not found');
              return;
            }
            
            // Use legacy post data
            postData = legacyPost;
          }

          if (!postData) {
            setUrlPostError('Post not found');
            return;
          }

          // Transform to PostCardProps format with proper type assertion
          const mappedPost: PostCardProps = {
            id: (postData as any).id,
            spaceId: (postData as any).space_id,
            currentUserId: currentUser?.id,
            author: {
              id: (postData as any).author?.id || '',
              name: (postData as any).author?.full_name || 'Unknown User',
              avatar: (postData as any).author?.avatar_url || null,
              profile_url: (postData as any).author?.profile_url || null,
              activity_score: (postData as any).author?.activity_score || 0,
            },
            title: (postData as any).title,
            content: (postData as any).content,
            createdAt: (postData as any).created_at || new Date().toISOString(),
            editedAt: (postData as any).updated_at,
            category: (postData as any).category ? {
              id: (postData as any).category.id,
              name: (postData as any).category.name,
              icon: (postData as any).category.icon
            } : null,
            likes: (postData as any).like_count || 0,
            comments: (postData as any).comment_count || 0,
            media_urls: (postData as any).media_urls,
            isPinned: (postData as any).is_pinned || false,
            pinCategory: (postData as any).pin_category || null,
            isAdmin: effectivePermissions?.effectiveIsAdmin || effectivePermissions?.effectiveIsOwner || false,
            poll_data: (postData as any).poll_data,
            slug: (postData as any).slug,
          };

          console.log('[FeedLogic] Successfully fetched post, opening modal:', mappedPost.title || mappedPost.id);
          
          // Set modal state
          setSelectedPostForModal(mappedPost);
          setIsPostModalOpen(true);
          
        } catch (error) {
          console.error('[FeedLogic] Error fetching post:', error);
          setUrlPostError('Failed to load post');
        } finally {
          setIsLoadingUrlPost(false);
        }
      };

      fetchAndOpenPost();
    } else if (!postSlug && isPostModalOpen && !isLoadingUrlPost) {
      // Only close modal if we're not currently loading a URL post
      // This prevents the modal from closing during navigation transitions
      console.log('[FeedLogic] No post parameter in URL and modal is open, closing modal');
      setIsPostModalOpen(false);
      setSelectedPostForModal(null);
    }
  }, [location.search, stableSpaceId, isLoadingUrlPost, currentUser?.id]);

  // ============================================================================
  // UTILITY FUNCTIONS
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
  // SIMPLIFIED SPACE STATE - State preservation now handled by existing cache systems
  // ============================================================================
  
  // Note: Space state preservation is now handled by the global cache coordinator
  // and optimized cached posts hook. This simplifies the codebase while maintaining
  // the same user experience.

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
    modalStates: {
      isCreatePostOpen: isCreatePostModalOpen,
      isCategoryOpen: isCategoryModalOpen,
      isPostDetailOpen: isPostModalOpen,
      selectedPostForModal,
      isLoadingUrlPost,
      urlPostError,
    },
    
    // Real-time state
    realtimeState: {
      newPostIds,
      newPostCount,
      isConnected: isRealtimeConnected,
      isLoadingNewPosts,
      isDismissed,
      loadError,
      retryCount,
    },
    
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