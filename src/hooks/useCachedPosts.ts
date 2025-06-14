import { useEffect } from 'react';
import { usePostsCache } from './usePostsCache';
import type { CachedPostType } from './usePostsCache';
import type { PostCardProps } from '@/features/posts/types/postCard';

// Re-export the type for convenience
export type { CachedPostType };

interface UseCachedPostsReturn {
  posts: CachedPostType[];
  pinnedPosts: CachedPostType[];
  loading: boolean;
  error: string | null;
  refetch: (forceRefresh?: boolean) => Promise<void>;
  
  // Pagination
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  loadPage: (page: number) => Promise<void>;
  
  // Action handlers
  handlePostCreated: (post: CachedPostType) => void;
  handlePostUpdated: (postId: string, updates: Partial<CachedPostType>) => void;
  handlePostDeleted: (postId: string) => void;
  handleLikeToggled: (postId: string, newLikeCount: number) => void;
  handleCommentAdded: (postId: string, newCommentCount: number) => void;
  handlePinToggled: (postId: string, isPinned: boolean, pinPosition?: number) => void;
  
  // Utility functions
  mapPostToCardProps: (post: CachedPostType) => PostCardProps;
}

export function useCachedPosts(spaceId: string | undefined): UseCachedPostsReturn {
  const {
    fetchPosts,
    getPosts,
    getPinnedPosts,
    isLoading,
    getError,
    addPost,
    updatePost,
    deletePost,
    updateLikeCount,
    updateCommentCount,
    togglePin,
    getTotalCount,
    getCurrentPage,
    getTotalPages,
    getHasNextPage,
  } = usePostsCache();

  // Auto-fetch posts when spaceId changes
  useEffect(() => {
    if (spaceId) {
      console.log('🔄 useCachedPosts: Auto-fetching posts for space:', spaceId);
      fetchPosts(spaceId);
    }
  }, [spaceId]);

  // Get current data from cache
  const posts = spaceId ? getPosts(spaceId) : [];
  const pinnedPosts = spaceId ? getPinnedPosts(spaceId) : [];
  const loading = spaceId ? isLoading(spaceId) : false;
  const error = spaceId ? getError(spaceId) : null;

  // Refetch function
  const refetch = async (forceRefresh = false) => {
    if (spaceId) {
      console.log('🔄 useCachedPosts: Manual refetch for space:', spaceId, 'forceRefresh:', forceRefresh);
      await fetchPosts(spaceId, forceRefresh);
    }
  };

  // Load specific page
  const loadPage = async (page: number) => {
    if (spaceId) {
      console.log('📄 useCachedPosts: Loading page', page, 'for space:', spaceId);
      await fetchPosts(spaceId, true, page);
    }
  };

  // Action handlers
  const handlePostCreated = (post: CachedPostType) => {
    if (spaceId) {
      console.log('➕ useCachedPosts: Adding new post to cache:', post.id);
      addPost(spaceId, post);
    }
  };

  const handlePostUpdated = (postId: string, updates: Partial<CachedPostType>) => {
    if (spaceId) {
      console.log('✏️ useCachedPosts: Updating post in cache:', postId, updates);
      updatePost(spaceId, postId, updates);
    }
  };

  const handlePostDeleted = (postId: string) => {
    if (spaceId) {
      console.log('🗑️ useCachedPosts: Deleting post from cache:', postId);
      deletePost(spaceId, postId);
    }
  };

  const handleLikeToggled = (postId: string, newLikeCount: number) => {
    if (spaceId) {
      console.log('❤️ useCachedPosts: Updating like count for post:', postId, 'new count:', newLikeCount);
      updateLikeCount(spaceId, postId, newLikeCount);
    }
  };

  const handleCommentAdded = (postId: string, newCommentCount: number) => {
    if (spaceId) {
      console.log('💬 useCachedPosts: Updating comment count for post:', postId, 'new count:', newCommentCount);
      updateCommentCount(spaceId, postId, newCommentCount);
    }
  };

  const handlePinToggled = (postId: string, isPinned: boolean, pinPosition?: number) => {
    if (spaceId) {
      console.log('📌 useCachedPosts: Toggling pin for post:', postId, 'isPinned:', isPinned, 'position:', pinPosition);
      togglePin(spaceId, postId, isPinned, pinPosition);
    }
  };

  // Map CachedPostType to PostCardProps
  const mapPostToCardProps = (post: CachedPostType): PostCardProps => {
    return {
      id: post.id,
      spaceId: post.space_id,
      currentUserId: undefined, // Will be set by the component
      author: {
        id: post.author?.id || '',
        name: post.author?.full_name || 'Unknown User',
        avatar: post.author?.avatar_url || null,
        profile_url: post.author?.profile_url || null,
        activity_score: post.author?.activity_score || 0,
      },
      title: post.title,
      content: post.content,
      createdAt: post.created_at || new Date().toISOString(),
      editedAt: post.edited_at,
      category: post.category ? {
        id: post.category.id,
        name: post.category.name,
        icon: post.category.icon || null,
      } : null,
      likes: post.like_count || 0,
      comments: post.comment_count || 0,
      media_urls: post.media_urls?.filter(url => url && typeof url === 'string').map((url, index) => ({ 
        id: `${post.id}-${index}`, 
        url, 
        type: 'image' as const 
      })) || null,
      isPinned: post.is_pinned || false,
      pinCategory: post.pin_category,
      isAdmin: false, // Will be set by the component
      poll_data: post.poll_data,
      slug: post.slug,
    };
  };

  return {
    posts,
    pinnedPosts,
    loading,
    error,
    refetch,
    totalCount: spaceId ? getTotalCount(spaceId) : 0,
    currentPage: spaceId ? getCurrentPage(spaceId) : 1,
    totalPages: spaceId ? getTotalPages(spaceId) : 1,
    hasNextPage: spaceId ? getHasNextPage(spaceId) : false,
    loadPage,
    handlePostCreated,
    handlePostUpdated,
    handlePostDeleted,
    handleLikeToggled,
    handleCommentAdded,
    handlePinToggled,
    mapPostToCardProps,
  };
} 