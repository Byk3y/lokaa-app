import { useEffect } from 'react';
import { usePostsCache } from './usePostsCache';
import type { CachedPostType } from './usePostsCache';
import type { PostCardProps } from '@/features/posts/types/postCard';
import { devLogger } from '../utils/developmentLogger';

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
    // Helper function to detect media type and file type from URL
    const detectMediaInfo = (url: string): { type: 'file' | 'link' | 'video'; fileType?: string; videoPlatform?: 'youtube' | 'vimeo' | 'other'; videoId?: string | null; thumbnailUrl?: string | null; directUrl?: string } => {
      if (!url || typeof url !== 'string') return { type: 'file' };
      
      const lowercaseUrl = url.toLowerCase();
      
      // Check for video patterns
      if (lowercaseUrl.includes('youtube.com') || lowercaseUrl.includes('youtu.be')) {
        const videoId = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/)?.[1] || null;
        return {
          type: 'video',
          videoPlatform: 'youtube',
          videoId,
          thumbnailUrl: videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null
        };
      }
      
      if (lowercaseUrl.includes('vimeo.com')) {
        const videoId = url.match(/vimeo\.com\/(\d+)/)?.[1] || null;
        return {
          type: 'video',
          videoPlatform: 'vimeo',
          videoId
        };
      }
      
      if (lowercaseUrl.includes('.mp4') || lowercaseUrl.includes('.webm') || lowercaseUrl.includes('.mov') || lowercaseUrl.includes('.avi')) {
        return {
          type: 'video',
          videoPlatform: 'other'
        };
      }
      
      // Check for GIF patterns - including Giphy URLs
      if (lowercaseUrl.includes('.gif')) {
        return { type: 'file', fileType: 'image/gif' };
      }
      if (lowercaseUrl.includes('giphy.com')) {
        // Extract Giphy ID and convert to direct GIF URL
        const giphyId = url.match(/giphy\.com\/gifs\/[^\/]*-([a-zA-Z0-9]+)$/)?.[1];
        if (giphyId) {
          // Convert to direct GIF URL
          const directGifUrl = `https://media.giphy.com/media/${giphyId}/giphy.gif`;
          return { 
            type: 'file', 
            fileType: 'image/gif',
            // Store the direct URL for actual display
            directUrl: directGifUrl
          };
        }
        return { type: 'file', fileType: 'image/gif' };
      }
      if (lowercaseUrl.includes('imgur.com')) {
        return { type: 'file', fileType: 'image/gif' };
      }
      
      // Check for other image patterns - treat as files with image MIME types
      if (lowercaseUrl.includes('.jpg') || lowercaseUrl.includes('.jpeg')) {
        return { type: 'file', fileType: 'image/jpeg' };
      }
      if (lowercaseUrl.includes('.png')) {
        return { type: 'file', fileType: 'image/png' };
      }
      if (lowercaseUrl.includes('.webp')) {
        return { type: 'file', fileType: 'image/webp' };
      }
      if (lowercaseUrl.includes('.svg')) {
        return { type: 'file', fileType: 'image/svg+xml' };
      }
      
      // Default to file
      return { type: 'file' };
    };

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
      media_urls: post.media_urls?.map((mediaItem: any, index) => {
        // Handle different media_urls formats from database
        let url: string;
        let existingType: 'file' | 'link' | 'video' | undefined;
        let existingFileType: string | undefined;
        
        // Use development logger for controlled logging
        devLogger.log('MediaProcessing', `Processing media item ${index} for post "${post.title}"`, mediaItem);
        
        if (typeof mediaItem === 'string') {
          // Legacy format: simple string URL
          url = mediaItem;
        } else if (mediaItem && typeof mediaItem === 'object') {
          // New format: object with url property
          if ((mediaItem as any).url) {
            if (typeof (mediaItem as any).url === 'string') {
              // Direct URL string
              url = (mediaItem as any).url;
            } else if ((mediaItem as any).url.url) {
              // Nested URL (like Giphy objects)
              url = (mediaItem as any).url.url;
            } else {
              devLogger.warn('MediaProcessing', 'Invalid media URL structure', mediaItem);
              return null;
            }
          } else {
            devLogger.warn('MediaProcessing', 'Media item missing URL', mediaItem);
            return null;
          }
          
          // Extract existing type information if available
          existingType = (mediaItem as any).type;
          existingFileType = (mediaItem as any).fileType;
        } else {
          devLogger.warn('MediaProcessing', 'Invalid media item', mediaItem);
          return null;
        }
        
        // Detect media info from URL if not already provided
        const mediaInfo = detectMediaInfo(url);
        
        const result = {
          id: `${post.id}-${index}`, 
          url, 
          type: (existingType || mediaInfo.type) as 'file' | 'link' | 'video',
          ...(existingFileType && { fileType: existingFileType }),
          ...(mediaInfo.fileType && !existingFileType && { fileType: mediaInfo.fileType }),
          ...(mediaInfo.videoPlatform && { videoPlatform: mediaInfo.videoPlatform }),
          ...(mediaInfo.videoId && { videoId: mediaInfo.videoId }),
          ...(mediaInfo.thumbnailUrl && { thumbnailUrl: mediaInfo.thumbnailUrl }),
          ...(mediaInfo.directUrl && { directUrl: mediaInfo.directUrl })
        };
        
        // Log final result using development logger
        devLogger.log('MediaProcessing', 'Final media result', result);
        return result;
      }).filter(Boolean) || null,
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