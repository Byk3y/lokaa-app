import { log } from '@/utils/logger';
import { useMemo, useCallback, useState, useEffect } from 'react';
import { useCommentsCache } from '@/hooks/useCommentsCache';
import { toast } from '@/hooks/use-toast';
import { getSupabaseClient } from '@/integrations/supabase/client';
import type { PostCardProps } from '@/features/posts/types/postCard';

// Re-export the types from the original file
export interface FetchedComment {
  id: string;
  content: string;
  created_at: string;
  author: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    profile_url?: string | null;
    activity_score?: number | null;
  } | null;
  post_id?: string;
  space_id?: string;
  parent_comment_id?: string | null;
  parentAuthorName?: string | null;
  replies?: FetchedComment[];
  reply_count?: number;
  like_count?: number;
  isLiked?: boolean;
  onReplyAdded?: (commentId: string, newReply: any) => void;
  currentUserId?: string | null;
  // New Skool-style fields
  initial_replies?: FetchedComment[];
  remaining_reply_count?: number;
  has_more_replies?: boolean;
}

/**
 * Enhanced Comments Hook with TanStack Query Caching and Pagination Support
 * Maintains the same interface as the original useComments but with performance benefits
 */
export function useCommentsEnhanced(
  post: PostCardProps | null, 
  currentUserId?: string | null,
  onCommentAddedForTopLevel?: (postId: string, newTotalCount: number) => void
) {
  // Use our enhanced caching hook
  const {
    comments: cachedComments,
    commentCount,
    commentsLoading,
    isCommenting,
    addComment,
    toggleCommentLike,
    refetchComments,
    // 🔥 EXPOSE PAGINATION FUNCTIONALITY
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCommentsCache(post?.id || '', currentUserId || undefined);

  // State for comment input and reply management
  const [newComment, setNewComment] = useState("");
  const [replyingToComment, setReplyingToComment] = useState<FetchedComment | null>(null);

  // Transform cached comments to match the original FetchedComment interface
  const comments = useMemo(() => {
    return cachedComments.map(comment => {
      // Transform initial replies to FetchedComment format
      const transformedInitialReplies = comment.initial_replies?.map(reply => ({
        id: reply.id,
        content: reply.content,
        created_at: reply.created_at,
        author: reply.author,
        post_id: reply.post_id,
        space_id: reply.space_id,
        parent_comment_id: reply.parent_comment_id,
        parentAuthorName: comment.author?.full_name || null,
        replies: [],
        reply_count: 0, // Replies don't have sub-replies
        like_count: reply.like_count,
        isLiked: reply.isLiked,
        currentUserId,
      } satisfies FetchedComment)) || [];

      return {
        id: comment.id,
        content: comment.content,
        created_at: comment.created_at,
        author: comment.author,
        post_id: comment.post_id,
        space_id: comment.space_id,
        parent_comment_id: comment.parent_comment_id,
        parentAuthorName: null,
        replies: [], // Keep empty for backward compatibility
        reply_count: comment.reply_count,
        like_count: comment.like_count,
        isLiked: comment.isLiked,
        currentUserId,
        // New Skool-style fields
        initial_replies: transformedInitialReplies,
        remaining_reply_count: comment.remaining_reply_count,
        has_more_replies: comment.has_more_replies,
      } satisfies FetchedComment;
    });
  }, [cachedComments, currentUserId]);

  // Get optimistic comment count
  const optimisticCommentCount = commentCount;

  // Function to set the target comment for replying
  const setReplyTarget = useCallback((comment: FetchedComment | null) => {
    setReplyingToComment(comment);
    if (comment && comment.author) {
      setNewComment(`@${comment.author.full_name || 'User'} `);
      document.getElementById('comment-input')?.focus();
    } else {
      setNewComment('');
    }
  }, []);

  // Handle comment submission
  const handleCommentSubmit = useCallback(async (onCommentPosted?: (isReply: boolean, parentCommentId?: string) => void) => {
    if (!currentUserId || !post?.id || !post.spaceId) {
      toast({ title: "Please log in to comment or reply", variant: "default" });
      return;
    }
    
    const contentToSubmit = newComment.trim();
    if (!contentToSubmit) {
      toast({ title: "Comment cannot be empty", variant: "destructive" });
      return;
    }
    
    if (isCommenting) return;

    try {
      const parentId = replyingToComment ? replyingToComment.id : undefined;
      const isReply = !!parentId;

      const newCommentData = await addComment(contentToSubmit, post.spaceId, parentId);
      
      if (newCommentData) {
        // Clear the input
        setNewComment("");
        setReplyingToComment(null);
        
        // Notify parent component
        if (onCommentAddedForTopLevel && !isReply) {
          onCommentAddedForTopLevel(post.id, commentCount + 1);
        }
        
        // Call the provided callback
        if (onCommentPosted) {
          onCommentPosted(isReply, parentId);
        }
        
        toast({
          title: "Success",
          description: isReply ? "Reply posted!" : "Comment posted!",
          variant: "default",
        });
      }
    } catch (error: any) {
      log.error('Component', 'Error submitting comment:', error);
      toast({
        title: "Error",
        description: error.message || "Could not post comment",
        variant: "destructive",
      });
    }
  }, [currentUserId, post?.id, post?.spaceId, newComment, isCommenting, replyingToComment, addComment, commentCount, onCommentAddedForTopLevel]);

  // Handle reply addition 
  const handleReplyAdded = useCallback((commentId: string, newReply: any) => {
    // Refetch comments to get the updated reply count and sync with cache
    refetchComments();
  }, [refetchComments]);

  // Fetch additional replies (excluding already shown initial replies)
  const fetchAdditionalReplies = useCallback(async (commentId: string, excludeIds: string[] = []): Promise<FetchedComment[]> => {
    try {
      let query = supabase
        .from('post_comments') 
        .select(`
          id, content, created_at, user_id, post_id, space_id, parent_comment_id,
          author:user_id(id, full_name, avatar_url, profile_url, activity_score),
          like_count:comment_likes(count)
        `)
        .eq('parent_comment_id', commentId)
        .order('created_at', { ascending: true });

      // Exclude already shown initial replies
      if (excludeIds.length > 0) {
        query = query.not('id', 'in', `(${excludeIds.join(',')})`);
      }
        
      const { data, error } = await query;
      if (error) throw error;

      const replyIds = data ? data.map(reply => reply.id) : [];
      let likedReplyIds = new Set<string>();

      if (currentUserId && replyIds.length > 0) {
        const { data: likeStatusData, error: likeStatusError } = await getSupabaseClient()
          .from('comment_likes')
          .select('comment_id')
          .eq('user_id', currentUserId)
          .in('comment_id', replyIds);
        if (likeStatusError) log.warn('Component', "Error fetching reply like statuses:", likeStatusError);
        else {
          likeStatusData?.forEach(like => likedReplyIds.add(like.comment_id));
        }
      }
      
      const fetchedReplies: FetchedComment[] = (data || []).map(reply => ({
        ...reply,
        author: reply.author as any,
        reply_count: 0, 
        like_count: reply.like_count?.[0]?.count || 0,
        isLiked: likedReplyIds.has(reply.id),
        currentUserId,
      }));
      
      return fetchedReplies;
    } catch (err) {
      log.error('Component', 'Error fetching additional replies:', err);
      return [];
    }
  }, [currentUserId]);

  // Legacy function for backward compatibility
  const fetchReplies = useCallback(async (commentId: string): Promise<FetchedComment[]> => {
    return fetchAdditionalReplies(commentId, []);
  }, [fetchAdditionalReplies]);

  // Handle comment like toggle
  const handleCommentLikeToggled = useCallback(async (commentId: string, newLikedState: boolean, newLikeCount: number) => {
    if (!currentUserId) return;

    try {
      // Use the cached like toggle function instead of direct database calls
      await toggleCommentLike(commentId);
    } catch (error) {
      log.error('Component', 'Error toggling comment like:', error);
      throw error; // Re-throw so CommentItem can handle the error and revert optimistic updates
    }
  }, [currentUserId, toggleCommentLike]);

  // 🔥 NEW: Load more comments function
  const loadMoreComments = useCallback(async () => {
    if (hasNextPage && !isFetchingNextPage) {
      log.debug('Component', '🔔 [useCommentsEnhanced] Loading more comments...');
      await fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Return enhanced interface with pagination support
  return {
    comments,
    commentsLoading,
    newComment,
    setNewComment,
    isCommenting,
    optimisticCommentCount,
    handleCommentSubmit,
    handleReplyAdded,
    fetchReplies,
    fetchAdditionalReplies,
    replyingToComment,
    setReplyTarget,
    handleCommentLikeToggled,
    // 🔥 NEW: Pagination controls
    loadMoreComments,
    hasMoreComments: hasNextPage,
    isLoadingMoreComments: isFetchingNextPage,
  };
} 