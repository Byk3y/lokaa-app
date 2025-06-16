import { useState, useEffect, useRef, useCallback } from 'react';
import { globalCache, cacheQueries } from '@/utils/globalCacheCoordinator';
import { devLogger } from '@/utils/developmentLogger';
import { getSupabaseClient } from '@/integrations/supabase/client';
import type { CachedPostType } from '@/hooks/useCachedPosts';
import type { PostCardProps } from '@/features/posts/types/postCard';

interface UseOptimizedCachedPostsReturn {
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

/**
 * Optimized cached posts hook using global cache coordinator
 * Eliminates duplicate queries and provides intelligent caching
 */
export function useOptimizedCachedPosts(spaceId: string | undefined): UseOptimizedCachedPostsReturn {
  const [posts, setPosts] = useState<CachedPostType[]>([]);
  const [pinnedPosts, setPinnedPosts] = useState<CachedPostType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  // Generate unique subscriber ID for this hook instance
  const subscriberId = useRef(`posts-${Math.random().toString(36).substr(2, 9)}`).current;
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (spaceId) {
        globalCache.unsubscribe(`posts:${spaceId}:1:30`, subscriberId);
        globalCache.unsubscribe(`posts:${spaceId}:pinned`, subscriberId);
      }
    };
  }, [spaceId, subscriberId]);

  // Fetch posts using global cache coordinator
  const fetchPosts = useCallback(async (page = 1, forceRefresh = false) => {
    if (!spaceId) {
      setPosts([]);
      setPinnedPosts([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      devLogger.log('CacheDebug', `Fetching posts for space ${spaceId}, page ${page}`, { subscriberId });

      // If force refresh, invalidate cache first
      if (forceRefresh) {
        globalCache.invalidatePattern(`posts:${spaceId}`);
      }

      // Fetch regular posts
      const postsData = await cacheQueries.posts(spaceId, subscriberId, page, 30);
      
      // Fetch pinned posts separately (they don't paginate)
      const pinnedKey = `posts:${spaceId}:pinned`;
      const pinnedData = await globalCache.get(
        pinnedKey,
        async () => {
          const { data, error } = await getSupabaseClient()
            .from('posts')
            .select(`
              id, created_at, content, title, like_count, comment_count, 
              user_id, space_id, media_urls, category_id, is_pinned, 
              pinned_at, pin_position, pin_category, edited_at, poll_data, slug
            `)
            .eq('space_id', spaceId)
            .eq('is_pinned', true)
            .order('pin_position', { ascending: true });
            
          if (error) throw error;
          return data || [];
        },
        subscriberId
      );

      // Process and enrich posts with author and category data
      const enrichedPosts = await enrichPostsWithMetadata(postsData, spaceId, subscriberId);
      const enrichedPinnedPosts = await enrichPostsWithMetadata(pinnedData, spaceId, subscriberId);

      setPosts(enrichedPosts.filter(p => !p.is_pinned));
      setPinnedPosts(enrichedPinnedPosts.filter(p => p.is_pinned));
      setCurrentPage(page);
      setTotalCount(enrichedPosts.length + enrichedPinnedPosts.length); // Simplified for now
      setLoading(false);

      devLogger.log('CacheDebug', `Posts loaded successfully`, { 
        regular: enrichedPosts.length, 
        pinned: enrichedPinnedPosts.length,
        subscriberId 
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch posts';
      setError(errorMessage);
      setLoading(false);
      
      devLogger.warn('CacheDebug', `Posts fetch failed`, { error: errorMessage, subscriberId });
    }
  }, [spaceId, subscriberId]);

  // Auto-fetch posts when spaceId changes - but check cache first to avoid unnecessary loading states
  const hasAutoFetched = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!spaceId) {
      setPosts([]);
      setPinnedPosts([]);
      setLoading(false);
      setError(null);
      return;
    }

    // Check if we have cached data first
    const checkCacheAndFetch = async () => {
      try {
        // Check for cached regular posts
        const regularKey = `posts:${spaceId}:1:30`;
        const pinnedKey = `posts:${spaceId}:pinned`;
        
        const cachedRegular = globalCache.getCachedData<any[]>(regularKey);
        const cachedPinned = globalCache.getCachedData<any[]>(pinnedKey);
        
        // If we have valid cached data, use it immediately to prevent loading flash
        if (cachedRegular && Array.isArray(cachedRegular) && cachedPinned && Array.isArray(cachedPinned)) {
          devLogger.log('CacheDebug', `Using cached posts for space ${spaceId}`, { subscriberId });
          
          // Enrich cached posts with metadata
          const enrichedPosts = await enrichPostsWithMetadata(cachedRegular, spaceId, subscriberId);
          const enrichedPinnedPosts = await enrichPostsWithMetadata(cachedPinned, spaceId, subscriberId);
          
          setPosts(enrichedPosts.filter(p => !p.is_pinned));
          setPinnedPosts(enrichedPinnedPosts.filter(p => p.is_pinned));
          setLoading(false);
          setError(null);
          
          // Still mark as auto-fetched to prevent duplicate fetches
          hasAutoFetched.current.add(spaceId);
          return;
        }
        
        // No valid cache, proceed with normal fetch if not already fetched
        if (!hasAutoFetched.current.has(spaceId)) {
          hasAutoFetched.current.add(spaceId);
          devLogger.log('CacheDebug', `Auto-fetching posts for space ${spaceId} (no cache)`, { subscriberId });
          await fetchPosts(1, false);
        }
      } catch (error) {
        devLogger.warn('CacheDebug', `Cache check failed for space ${spaceId}`, { error, subscriberId });
        // Fallback to normal fetch
        if (!hasAutoFetched.current.has(spaceId)) {
          hasAutoFetched.current.add(spaceId);
          await fetchPosts(1, false);
        }
      }
    };

    checkCacheAndFetch();
  }, [spaceId, fetchPosts, subscriberId]);

  // Refetch function
  const refetch = useCallback(async (forceRefresh = false) => {
    await fetchPosts(currentPage, forceRefresh);
  }, [fetchPosts, currentPage]);

  // Load specific page
  const loadPage = useCallback(async (page: number) => {
    await fetchPosts(page, true);
  }, [fetchPosts]);

  // Action handlers that update local state and invalidate cache
  const handlePostCreated = useCallback((post: CachedPostType) => {
    if (post.is_pinned) {
      setPinnedPosts(prev => [post, ...prev]);
    } else {
      setPosts(prev => [post, ...prev]);
    }
    
    // Invalidate cache to ensure consistency
    if (spaceId) {
      globalCache.invalidatePattern(`posts:${spaceId}`);
    }
    
    devLogger.log('CacheDebug', `Post created`, { postId: post.id, subscriberId });
  }, [spaceId, subscriberId]);

  const handlePostUpdated = useCallback((postId: string, updates: Partial<CachedPostType>) => {
    const updatePostInArray = (posts: CachedPostType[]) => 
      posts.map(post => post.id === postId ? { ...post, ...updates } : post);

    setPosts(updatePostInArray);
    setPinnedPosts(updatePostInArray);
    
    // Invalidate cache to ensure consistency
    if (spaceId) {
      globalCache.invalidatePattern(`posts:${spaceId}`);
    }
    
    devLogger.log('CacheDebug', `Post updated`, { postId, updates, subscriberId });
  }, [spaceId, subscriberId]);

  const handlePostDeleted = useCallback((postId: string) => {
    setPosts(prev => prev.filter(post => post.id !== postId));
    setPinnedPosts(prev => prev.filter(post => post.id !== postId));
    
    // Invalidate cache to ensure consistency
    if (spaceId) {
      globalCache.invalidatePattern(`posts:${spaceId}`);
    }
    
    devLogger.log('CacheDebug', `Post deleted`, { postId, subscriberId });
  }, [spaceId, subscriberId]);

  const handleLikeToggled = useCallback((postId: string, newLikeCount: number) => {
    handlePostUpdated(postId, { like_count: newLikeCount });
  }, [handlePostUpdated]);

  const handleCommentAdded = useCallback((postId: string, newCommentCount: number) => {
    handlePostUpdated(postId, { comment_count: newCommentCount });
  }, [handlePostUpdated]);

  const handlePinToggled = useCallback((postId: string, isPinned: boolean, pinPosition?: number) => {
    const updates: Partial<CachedPostType> = {
      is_pinned: isPinned,
      pin_position: pinPosition || null,
      pinned_at: isPinned ? new Date().toISOString() : null,
    };

    // Move post between arrays
    if (isPinned) {
      const post = posts.find(p => p.id === postId);
      if (post) {
        const updatedPost = { ...post, ...updates };
        setPosts(prev => prev.filter(p => p.id !== postId));
        setPinnedPosts(prev => [...prev, updatedPost].sort((a, b) => (a.pin_position || 0) - (b.pin_position || 0)));
      }
    } else {
      const post = pinnedPosts.find(p => p.id === postId);
      if (post) {
        const updatedPost = { ...post, ...updates };
        setPinnedPosts(prev => prev.filter(p => p.id !== postId));
        setPosts(prev => [updatedPost, ...prev]);
      }
    }
    
    // Invalidate cache to ensure consistency
    if (spaceId) {
      globalCache.invalidatePattern(`posts:${spaceId}`);
    }
    
    devLogger.log('CacheDebug', `Post pin toggled`, { postId, isPinned, subscriberId });
  }, [posts, pinnedPosts, spaceId, subscriberId]);

  // Map post to card props with proper media_urls transformation
  const mapPostToCardProps = useCallback((post: CachedPostType): PostCardProps => {
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
      currentUserId: undefined, // Will be set by component
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
      isAdmin: false, // Will be set by component
      poll_data: post.poll_data,
      slug: post.slug,
    };
  }, []);

  return {
    posts,
    pinnedPosts,
    loading,
    error,
    refetch,
    totalCount,
    currentPage,
    totalPages: Math.ceil(totalCount / 30),
    hasNextPage: currentPage * 30 < totalCount,
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

/**
 * Enrich posts with author and category metadata using global cache
 */
async function enrichPostsWithMetadata(
  posts: any[], 
  spaceId: string, 
  subscriberId: string
): Promise<CachedPostType[]> {
  if (!posts.length) return [];

  // Get unique user IDs and category IDs
  const userIds = Array.from(new Set(posts.map(p => p.user_id).filter(Boolean)));
  const categoryIds = Array.from(new Set(posts.map(p => p.category_id).filter(Boolean)));

  // Fetch authors and categories using global cache
  const [authorsData, categoriesData] = await Promise.all([
    // Fetch authors
    userIds.length > 0 ? globalCache.get(
      `users:${userIds.join(',')}`,
      async () => {
        const { data, error } = await getSupabaseClient()
          .from('users')
          .select('id, full_name, avatar_url, profile_url, activity_score')
          .in('id', userIds);
        if (error) throw error;
        return data || [];
      },
      subscriberId
    ) : [],
    
    // Fetch categories
    categoryIds.length > 0 ? cacheQueries.categories(spaceId, subscriberId) : []
  ]);

  // Create lookup maps
  const authorsMap = new Map<string, any>();
  authorsData.forEach((author: any) => authorsMap.set(author.id, author));
  
  const categoriesMap = new Map<string, any>();
  categoriesData.forEach((cat: any) => categoriesMap.set(cat.id, cat));

  // Enrich posts with metadata
  return posts.map(post => ({
    id: post.id,
    created_at: post.created_at,
    content: post.content,
    title: post.title,
    like_count: post.like_count || 0,
    comment_count: post.comment_count || 0,
    user_id: post.user_id,
    space_id: post.space_id,
    media_urls: post.media_urls,
    category: post.category_id ? categoriesMap.get(post.category_id) || null : null,
    author: authorsMap.get(post.user_id) || null,
    is_pinned: post.is_pinned || false,
    pinned_at: post.pinned_at,
    pin_position: post.pin_position,
    pin_category: post.pin_category,
    edited_at: post.edited_at,
    poll_data: post.poll_data,
    slug: post.slug,
  })) as CachedPostType[];
} 