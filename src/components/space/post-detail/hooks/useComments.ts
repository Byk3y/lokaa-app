import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { PostCardProps } from '@/components/space/PostCard';
import type { CommentAuthor } from '@/components/space/comments/CommentItem';

// Re-use FetchedComment type
export interface FetchedComment {
  id: string;
  content: string;
  created_at: string;
  author: CommentAuthor | null;
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
}

interface CommentDataFromServer {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  post_id: string;
  space_id: string;
  parent_comment_id: string | null;
  author: CommentAuthor | null; // Assuming author is already in the correct FetchedComment structure or can be cast
  // reply_count is NOT here
}

/**
 * Hook to handle post comments (fetching, posting, managing state)
 */
export function useComments(
  post: PostCardProps | null, 
  currentUserId?: string | null,
  onCommentAddedForTopLevel?: (postId: string, newTotalCount: number) => void
) {
  const [comments, setComments] = useState<FetchedComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const [optimisticCommentCount, setOptimisticCommentCount] = useState(post?.comments || 0);
  const [replyingToComment, setReplyingToComment] = useState<FetchedComment | null>(null);

  // Load initial comment data when post changes
  useEffect(() => {
    if (post?.id) {
      fetchComments(post.id);
    }
    setOptimisticCommentCount(post?.comments || 0);
  }, [post?.id, post?.comments]);

  // Fetch comments for the post
  const fetchComments = async (postId: string) => {
    if (!postId) return;
    
    setCommentsLoading(true);
    try {
      const { data, error } = await getSupabaseClient()
        .from('post_comments')
        .select(`
          id, content, created_at, user_id, post_id, space_id, parent_comment_id,
          author:user_id(id, full_name, avatar_url, profile_url, activity_score),
          like_count:comment_likes(count) 
        `)
        .eq('post_id', postId)
        .is('parent_comment_id', null) 
        .order('created_at', { ascending: true }) as { data: (CommentDataFromServer & { like_count: { count: number }[] })[] | null; error: any };
        
      if (error) throw error;
      
      if (data) {
        const commentIds = data.map(comment => comment.id);
        
        // Fetch reply counts
        const { data: replyCountsData, error: replyCountError } = await getSupabaseClient()
          .from('post_comments')
          .select('parent_comment_id')
          .in('parent_comment_id', commentIds);

        if (replyCountError) console.warn("Error fetching reply counts:", replyCountError);

        const replyCountMap = new Map<string, number>();
        replyCountsData?.forEach(item => {
          const parentId = item.parent_comment_id;
          if (parentId) {
            replyCountMap.set(parentId, (replyCountMap.get(parentId) || 0) + 1);
          }
        });

        // Fetch like status for each comment
        let likedCommentIds = new Set<string>();
        if (currentUserId && commentIds.length > 0) {
          const { data: likeStatusData, error: likeStatusError } = await getSupabaseClient()
            .from('comment_likes')
            .select('comment_id')
            .eq('user_id', currentUserId)
            .in('comment_id', commentIds);
          if (likeStatusError) console.warn("Error fetching comment like statuses:", likeStatusError);
          else {
            likeStatusData?.forEach(like => likedCommentIds.add(like.comment_id));
          }
        }

        const commentsWithDetails: FetchedComment[] = data.map(comment => ({
          ...comment,
          author: comment.author as CommentAuthor | null,
          reply_count: replyCountMap.get(comment.id) || 0,
          like_count: comment.like_count?.[0]?.count || 0,
          isLiked: likedCommentIds.has(comment.id),
        }));
        setComments(commentsWithDetails);
      } else {
        setComments([]);
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setCommentsLoading(false);
    }
  };

  // Function to set the target comment for replying
  const setReplyTarget = (comment: FetchedComment | null) => {
    setReplyingToComment(comment);
    if (comment && comment.author) {
      setNewComment(`@${comment.author.full_name || 'User'} `);
      document.getElementById('comment-input')?.focus(); // Focus the main input
    } else {
      setNewComment(''); // Clear input if cancelling reply or target has no author
    }
  };

  // Unified function to handle submitting new comments and replies
  const handleCommentSubmit = async (onCommentPosted?: (isReply: boolean, parentCommentId?: string) => void) => {
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

    setIsCommenting(true);
    
    const parentId = replyingToComment ? replyingToComment.id : null;
    const isReply = !!parentId;

    try {
      const { data: submittedCommentData, error } = await getSupabaseClient().from('post_comments').insert({
        post_id: post.id,
        user_id: currentUserId,
        space_id: post.spaceId,
        content: contentToSubmit,
        parent_comment_id: parentId,
      }).select('id, content, created_at, user_id, post_id, parent_comment_id').single();

      if (error) throw error;

      if (submittedCommentData?.id) {
        await getSupabaseClient().from('user_activity_log').insert({
          user_id: currentUserId,
          type: isReply ? 'reply' : 'comment',
          ref_id: submittedCommentData.id,
          meta: { 
            post_id: post.id, 
            space_id: post.spaceId, 
            ...(parentId && { parent_comment_id: parentId })
          }
        });
      }

      const { data: userData } = await getSupabaseClient()
        .from('users')
        .select('full_name, avatar_url')
        .eq('id', currentUserId)
        .single();

      const newCommentEntry: FetchedComment = {
        id: submittedCommentData.id,
        content: submittedCommentData.content,
        created_at: submittedCommentData.created_at,
        author: {
          id: currentUserId,
          full_name: userData?.full_name || null,
          avatar_url: userData?.avatar_url || null
        },
        post_id: post.id,
        space_id: post.spaceId,
        parent_comment_id: parentId,
        reply_count: 0,
        like_count: 0,
        isLiked: false
      };
      
      if (isReply && parentId) {
        // If it's a reply, we need to update the parent comment's reply_count
        // and potentially add this new reply to a list of loaded replies for that parent.
        // For now, handleReplyAdded updates the count in the main `comments` array.
        handleReplyAdded(parentId, newCommentEntry);
        // The CommentItem itself will be responsible for re-fetching if its reply_count prop changes.
      } else {
        // It's a new top-level comment
        setComments(prevComments => [...prevComments, newCommentEntry]);
        setOptimisticCommentCount(prevCount => prevCount + 1); 
      }
      
      setNewComment("");
      setReplyingToComment(null); // Reset reply target
      
      toast({ title: isReply ? "Reply posted!" : "Comment posted!", variant: "default" });

      if (onCommentPosted) {
        onCommentPosted(isReply, parentId || undefined);
      }
      
      // If it's a new top-level comment, call the specific callback for updating post card count
      if (!isReply && onCommentAddedForTopLevel) {
        onCommentAddedForTopLevel(post.id, optimisticCommentCount); // optimisticCommentCount should be updated before this
      }

    } catch (error: any) {
      console.error(isReply ? "Error posting reply:" : "Error posting comment:", error);
      toast({
        title: "Error",
        description: error.message || (isReply ? "Could not post reply" : "Could not post comment"),
        variant: "destructive",
      });
    } finally {
      setIsCommenting(false);
    }
  };

  // Handle when a reply is added to a comment
  const handleReplyAdded = (commentId: string, newReply: any) => {
    // Increment the optimistic comment count
    setOptimisticCommentCount(prevCount => prevCount + 1);
    
    // Update the reply count for the parent comment
    setComments(prevComments => 
      prevComments.map(comment => 
        comment.id === commentId 
          ? { ...comment, reply_count: (comment.reply_count || 0) + 1 } 
          : comment
      )
    );
  };

  // Fetch replies for a specific comment
  const fetchReplies = async (commentId: string): Promise<FetchedComment[]> => {
    try {
      const { data, error } = await getSupabaseClient()
        .from('post_comments') 
        .select(`
          id, content, created_at, user_id, post_id, space_id, parent_comment_id,
          author:user_id(id, full_name, avatar_url, profile_url, activity_score),
          like_count:comment_likes(count)
        `)
        .eq('parent_comment_id', commentId)
        .order('created_at', { ascending: true }) as { data: (CommentDataFromServer & { like_count: { count: number }[] })[] | null; error: any };
        
      if (error) throw error;

      const replyIds = data ? data.map(reply => reply.id) : [];
      let likedReplyIds = new Set<string>();

      if (currentUserId && replyIds.length > 0) {
        const { data: likeStatusData, error: likeStatusError } = await getSupabaseClient()
          .from('comment_likes')
          .select('comment_id')
          .eq('user_id', currentUserId)
          .in('comment_id', replyIds);
        if (likeStatusError) console.warn("Error fetching reply like statuses:", likeStatusError);
        else {
          likeStatusData?.forEach(like => likedReplyIds.add(like.comment_id));
        }
      }
      
      const fetchedReplies: FetchedComment[] = (data || []).map(reply => ({
        ...reply,
        author: reply.author as CommentAuthor | null,
        reply_count: 0, 
        like_count: reply.like_count?.[0]?.count || 0,
        isLiked: likedReplyIds.has(reply.id),
      }));
      return fetchedReplies;
    } catch (err) {
      console.error('Error fetching replies:', err);
      return [];
    }
  };

  // Function to handle when a comment's like status is toggled
  const handleCommentLikeToggled = (commentId: string, newLikedState: boolean, newLikeCount: number) => {
    const updateCommentRecursive = (list: FetchedComment[]): FetchedComment[] => {
      return list.map(comment => {
        if (comment.id === commentId) {
          return { ...comment, isLiked: newLikedState, like_count: newLikeCount };
        }
        if (comment.replies && comment.replies.length > 0) {
          return { ...comment, replies: updateCommentRecursive(comment.replies) };
        }
        return comment;
      });
    };
    setComments(prevComments => updateCommentRecursive(prevComments));
  };

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
    replyingToComment,
    setReplyTarget,
    handleCommentLikeToggled,
  };
} 