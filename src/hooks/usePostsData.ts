import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import type { Attachment } from '@/features/posts/types';
import type { PostCardProps } from '@/features/posts/types/postCard';

// Define types (copied from FeedTab)
interface GoodCategoryType {
  id: string;
  name: string;
  icon?: string | null;
}

interface ErrorCategoryType {
  error: unknown; 
}

export interface FetchedPostType {
  id: string;
  created_at: string | null;
  content: string;
  title: string | null;
  like_count: number | null;
  comment_count: number | null;
  user_id: string;
  space_id: string;
  media_urls?: Attachment[] | null;
  category: GoodCategoryType | null;
  author: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    profile_url: string | null;
    activity_score?: number | null;
  } | null; 
  is_pinned?: boolean;
  pinned_at?: string | null;
  pin_position?: number | null;
  pin_category?: string | null;
  edited_at?: string | null;
  poll_data?: string[] | null;
}

interface UsePostsDataProps {
  spaceId?: string;
  currentUserId?: string;
  isAdmin: boolean;
}

export function usePostsData({ spaceId, currentUserId, isAdmin }: UsePostsDataProps) {
  // Posts state
  const [fetchedPosts, setFetchedPosts] = useState<FetchedPostType[]>([]);
  const [pinnedPosts, setPinnedPosts] = useState<FetchedPostType[]>([]);
  const [postsLoading, setPostsLoading] = useState<boolean>(true);
  const [postsError, setPostsError] = useState<string | null>(null);

  // Fetch posts function (extracted from FeedTab)
  const fetchPosts = async (spaceIdToFetch: string) => {
    if (!spaceIdToFetch) return;
    setPostsLoading(true);
    setPostsError(null);
    try {
      const { data, error: postsFetchError } = await getSupabaseClient()
        .from('posts')
        .select('id, created_at, content, title, like_count, comment_count, user_id, space_id, media_urls, category:space_categories!left (id, name, icon), is_pinned, pinned_at, pin_position, pin_category, edited_at, poll_data')
        .eq('space_id', spaceIdToFetch)
        .order('created_at', { ascending: false });
        
      if (postsFetchError) throw postsFetchError;
      
      // Safely typecast the data to avoid TypeScript errors
      const postsData = data as any[] | null;
      
      if (!postsData || postsData.length === 0) {
        setFetchedPosts([]);
        setPinnedPosts([]);
      } else {
        const userIds = [...new Set(postsData.map(post => post.user_id).filter(id => !!id))];
        const authorsMap: Map<string, FetchedPostType['author']> = new Map();
        if (userIds.length > 0) {
          const { data: authorsData, error: authorsFetchError } = await getSupabaseClient()
            .from('users')
            .select('id, full_name, avatar_url, profile_url, activity_score')
            .in('id', userIds);
          if (authorsFetchError) console.error("Error fetching authors:", authorsFetchError);
          else if (authorsData) {
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
        const combinedPosts = postsData.map(post => {
          let mediaUrlsToSet: Attachment[] | null = null;
          if (Array.isArray(post.media_urls)) {
            const filteredAttachments = post.media_urls.filter(
              (att: unknown): att is Partial<Attachment> & Required<Pick<Attachment, 'id' | 'type' | 'url'>> => {
                if (att && typeof att === 'object' && att !== null && 'id' in att && typeof (att as {id: unknown}).id === 'string' && 'type' in att && ((att as {type: unknown}).type === 'file' || (att as {type: unknown}).type === 'link' || (att as {type: unknown}).type === 'video') && 'url' in att && typeof (att as {url: unknown}).url === 'string') {
                  return true; 
                }
                return false;
              }
            );
            mediaUrlsToSet = filteredAttachments.map((att): Attachment => ({
              id: att.id,
              type: att.type,
              url: att.url,
              name: typeof att.name === 'string' ? att.name : undefined,
              fileType: typeof att.fileType === 'string' ? att.fileType : undefined,
              fileSize: typeof att.fileSize === 'number' ? att.fileSize : undefined,
              videoPlatform: att.videoPlatform === 'youtube' || att.videoPlatform === 'vimeo' || att.videoPlatform === 'other' ? att.videoPlatform as 'youtube' | 'vimeo' | 'other' : undefined,
              isLoading: typeof att.isLoading === 'boolean' ? att.isLoading : undefined,
            }));
          }
          let processedCategory: GoodCategoryType | null = null;
          const rawCategoryFromPost = post.category;
          if (rawCategoryFromPost && typeof rawCategoryFromPost === 'object') {
            const rawCategory = rawCategoryFromPost as GoodCategoryType | ErrorCategoryType; 
            if ('error' in rawCategory && rawCategory.error !== undefined) {
              console.warn(`Error structure received for category on post ID ${post.id}:`, rawCategory);
              processedCategory = null;
            } else if ('id' in rawCategory && 'name' in rawCategory) {
              processedCategory = rawCategory as GoodCategoryType;
            } else {
              processedCategory = null;
            }
          } else {
            processedCategory = null;
          }
          return {
            id: post.id,
            created_at: post.created_at,
            content: post.content,
            title: post.title,
            like_count: post.like_count,
            comment_count: post.comment_count,
            user_id: post.user_id,
            space_id: post.space_id,
            media_urls: mediaUrlsToSet,
            category: processedCategory,
            author: post.user_id ? authorsMap.get(post.user_id) || null : null,
            is_pinned: post.is_pinned || false,
            pinned_at: post.pinned_at,
            pin_position: post.pin_position,
            pin_category: post.pin_category,
            edited_at: post.edited_at,
            poll_data: post.poll_data,
          };
        });
        
        const allPosts = combinedPosts as FetchedPostType[];
        // Separate pinned posts
        const pinnedPostsTemp = allPosts.filter(post => post.is_pinned);
        const unpinnedPosts = allPosts.filter(post => !post.is_pinned);
        
        // Sort pinned posts by pin_position if available
        // First sort by pinned_at (newest first) as fallback
        pinnedPostsTemp.sort((a, b) => {
          // Make sure we have valid date strings before creating Date objects
          if (b.pinned_at && a.pinned_at && typeof b.pinned_at === 'string' && typeof a.pinned_at === 'string') {
            try {
              const dateB = new Date(b.pinned_at);
              const dateA = new Date(a.pinned_at);
              // Ensure both are valid dates before calling getTime()
              if (!isNaN(dateB.getTime()) && !isNaN(dateA.getTime())) {
                return dateB.getTime() - dateA.getTime();
              }
            } catch (e) {
              console.error("Error parsing dates for pinned posts:", e);
            }
          }
          return 0;
        });
        
        // Then sort by pin_position (if available)
        pinnedPostsTemp.sort((a, b) => {
          if (a.pin_position !== null && b.pin_position !== null) {
            return a.pin_position - b.pin_position;
          }
          return 0;
        });
        
        setPinnedPosts(pinnedPostsTemp);
        setFetchedPosts(unpinnedPosts);
      }
    } catch (err: unknown) {
      console.error("Error in fetchPosts process:", err);
      let errorMessage = "Failed to fetch posts";
      if (err instanceof Error) errorMessage = err.message;
      else if (typeof err === 'string') errorMessage = err;
      else if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
          errorMessage = (err as { message: string }).message;
      }
      setPostsError(errorMessage);
      setFetchedPosts([]);
      setPinnedPosts([]);
    } finally {
      setPostsLoading(false);
    }
  };

  // Handler functions (extracted from FeedTab)
  const handlePostCreated = () => {
    if (spaceId) {
      fetchPosts(spaceId);
    }
  };

  const handlePinToggled = async (postId: string, isPinned: boolean, category?: string | null) => {
    // If we're pinning and we already have 4 pinned posts, one will be automatically unpinned by the DB
    const currentPinnedCount = pinnedPosts.length;
    
    if (isPinned) {
      // Find the post in fetchedPosts
      const postToPin = fetchedPosts.find(p => p.id === postId);
      if (postToPin) {
        if (currentPinnedCount >= 4) {
          // We know the DB will auto-unpin the oldest post, so we need to fetch all posts again to stay in sync
          if (spaceId) {
            await fetchPosts(spaceId);
            return; // Exit early as fetchPosts will update both state variables
          }
        } else {
          // Normal case - we're under the limit
          // Add it to pinnedPosts with updated properties
          setPinnedPosts(prev => [
            { ...postToPin, is_pinned: true, pin_category: category || null },
            ...prev
          ]);
          
          // Keep it in fetchedPosts but with updated is_pinned (the UI filter will hide it)
          setFetchedPosts(prevPosts =>
            prevPosts.map(p =>
              p.id === postId ? { ...p, is_pinned: true, pin_category: category || null } : p
            )
          );
        }
      }
    } else {
      // Get the post from pinnedPosts before removing it
      const unpinnedPost = pinnedPosts.find(p => p.id === postId);
      
      // Remove from pinnedPosts
      setPinnedPosts(prev => prev.filter(p => p.id !== postId));
      
      if (unpinnedPost) {
        // Update in fetchedPosts to show in regular list again
        setFetchedPosts(prevPosts => {
          // Check if it's already in fetchedPosts
          const existsInFetched = prevPosts.some(p => p.id === postId);
          
          if (existsInFetched) {
            // Just update it
            return prevPosts.map(p =>
              p.id === postId ? { ...p, is_pinned: false, pin_category: null } : p
            );
          } else {
            // Add it to fetchedPosts with updated properties
            return [...prevPosts, { ...unpinnedPost, is_pinned: false, pin_category: null }];
          }
        });
      }
    }
  };

  const handleCommentAddedInModal = (postId: string, newCommentCount: number) => {
    setFetchedPosts(prevPosts =>
      prevPosts.map(p =>
        p.id === postId ? { ...p, comment_count: newCommentCount } : p
      )
    );
  };

  const handleLikeToggledInCard = (postId: string, newLikeCount: number) => {
    setFetchedPosts(prevPosts =>
      prevPosts.map(p =>
        p.id === postId ? { ...p, like_count: newLikeCount } : p
      )
    );
  };

  const handlePostUpdated = (updatedPost: PostCardProps) => {
    // Update the post in the fetchedPosts array
    setFetchedPosts(prev => 
      prev.map(post => 
        post.id === updatedPost.id 
          ? {
              ...post,
              content: updatedPost.content,
              title: updatedPost.title,
              edited_at: updatedPost.editedAt,
              media_urls: updatedPost.media_urls || post.media_urls  // CRITICAL FIX: Include media_urls
            } 
          : post
      )
    );
    
    // Update the post in the pinnedPosts array if it exists there
    setPinnedPosts(prev => 
      prev.map(post => 
        post.id === updatedPost.id 
          ? {
              ...post,
              content: updatedPost.content,
              title: updatedPost.title,
              edited_at: updatedPost.editedAt,
              media_urls: updatedPost.media_urls || post.media_urls  // CRITICAL FIX: Include media_urls
            } 
          : post
      )
    );
  };

  const handlePostDeleted = (postId: string) => {
    // Remove the post from the fetchedPosts array
    setFetchedPosts(prev => prev.filter(post => post.id !== postId));
    
    // Remove the post from pinnedPosts array if it exists there
    setPinnedPosts(prev => prev.filter(post => post.id !== postId));
    
    // Refresh the posts to update counts and ensure consistency
    if (spaceId) {
      fetchPosts(spaceId);
    }
  };

  // Map FetchedPostType to PostCardProps
  const mapPostToCardProps = (post: FetchedPostType): PostCardProps => {
    return {
      id: post.id,
      spaceId: post.space_id,
      currentUserId: currentUserId,
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
      media_urls: post.media_urls || null,
      isPinned: post.is_pinned || false,
      pinCategory: post.pin_category || null,
      isAdmin: isAdmin,
      poll_data: post.poll_data || null,
    };
  };

  // Auto-fetch when spaceId changes
  useEffect(() => {
    if (spaceId) {
      fetchPosts(spaceId);
    }
  }, [spaceId]);

  // Cleanup on unmount or user sign out
  useEffect(() => {
    if (!currentUserId) {
      // User has signed out, clean up state
      console.log('[usePostsData] User signed out, cleaning up posts state');
      setFetchedPosts([]);
      setPinnedPosts([]);
      setPostsLoading(false);
      setPostsError(null);
    }
  }, [currentUserId]);

  return {
    // State
    fetchedPosts,
    pinnedPosts,
    postsLoading,
    postsError,
    
    // Actions
    fetchPosts,
    handlePostCreated,
    handlePinToggled,
    handleCommentAddedInModal,
    handleLikeToggledInCard,
    handlePostUpdated,
    handlePostDeleted,
    mapPostToCardProps,
  };
} 