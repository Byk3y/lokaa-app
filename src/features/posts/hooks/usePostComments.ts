import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useRealtimeComments } from '@/hooks/useRealtimeComments';
import type { FetchedComment, CommentAuthor } from '../types/postCard';

// Extended type to include the callbacks that CommentItem expects
export interface CommentItemProps extends FetchedComment {
  currentUserId: string | null | undefined;
  onReplyAddedToParent: (commentId: string, newReply: CommentItemProps) => void;
  fetchRepliesHook: (commentId: string) => Promise<CommentItemProps[]>;
  onSetReplyTarget: (comment: CommentItemProps) => void;
  onCommentLikeToggled?: (commentId: string, isLiked: boolean, likeCount: number) => void;
}

interface UsePostCommentsProps {
  postId: string;
  spaceId: string;
  userId?: string | null;
  initialComments?: number;
  onCommentAdded?: (postId: string, newCommentCount: number) => void;
}

interface UsePostCommentsReturn {
  comments: CommentItemProps[];
  commentsLoading: boolean;
  newComment: string;
  setNewComment: (value: string) => void;
  isCommenting: boolean;
  optimisticCommentCount: number;
  showComments: boolean;
  setShowComments: (show: boolean) => void;
  replyingToComment: CommentItemProps | null;
  handleCommentSubmit: () => Promise<void>;
  handleReplyAdded: (commentId: string, newReply: CommentItemProps) => void;
  fetchReplies: (commentId: string) => Promise<CommentItemProps[]>;
  setReplyTarget: (comment: CommentItemProps | null) => void;
  handleCommentLikeToggled: (commentId: string, isLiked: boolean, likeCount: number) => void;
  fetchComments: () => Promise<void>;
  realtimeConnected: boolean;
}

/**
 * Custom hook to manage post comments
 * 🔔 NOW WITH REAL-TIME SUPPORT!
 */
export const usePostComments = ({
  postId,
  spaceId,
  userId,
  initialComments = 0,
  onCommentAdded,
}: UsePostCommentsProps): UsePostCommentsReturn => {
  const [newComment, setNewComment] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const [optimisticCommentCount, setOptimisticCommentCount] = useState(initialComments);
  const [comments, setComments] = useState<CommentItemProps[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [replyingToComment, setReplyingToComment] = useState<CommentItemProps | null>(null);

  // 🔔 REAL-TIME COMMENT SUBSCRIPTION
  const { isConnected: realtimeConnected } = useRealtimeComments({
    postId: postId || '',
    spaceId: spaceId,
    userId: userId,
    isEnabled: !!postId,
    onNewComment: (newCommentData) => {
      console.log('🔔 [usePostComments] Real-time comment received, refreshing comments...');
      // 🔧 STABILIZED: Add delay to prevent overwriting optimistic updates
      setTimeout(() => {
        if (postId && showComments) {
          fetchComments();
        }
      }, 1000); // 1-second delay to allow optimistic updates to settle
      // Update comment count optimistically
      setOptimisticCommentCount(prev => prev + 1);
    },
    onCommentUpdate: (commentId) => {
      console.log('🔔 [usePostComments] Comment updated, refreshing comments...', commentId);
      // 🔧 STABILIZED: Add delay for update propagation
      setTimeout(() => {
        if (postId && showComments) {
          fetchComments();
        }
      }, 500); // 500ms delay for updates
    }
  });

  // Keep optimistic comment count in sync with initialComments prop
  useEffect(() => {
    setOptimisticCommentCount(initialComments);
  }, [initialComments]);

  // Fetch comments when requested
  const fetchComments = useCallback(async () => {
    if (!postId) return;
    console.log('🔔 [usePostComments] Fetching comments for post:', postId);
    setCommentsLoading(true);
    try {
      // First, fetch top-level comments
      const { data: commentsData, error: commentsError } = await getSupabaseClient()
        .from('post_comments')
        .select(`
          id,
          post_id,
          user_id,
          content,
          created_at,
          parent_comment_id
        `)
        .eq('post_id', postId)
        .is('parent_comment_id', null) // Fetch only top-level comments
        .order('created_at', { ascending: true });

      if (commentsError) {
        throw commentsError;
      }

      if (commentsData) {
        console.log(`🔔 [usePostComments] Fetched ${commentsData.length} comments for post ${postId}`);
        
        // Get the counts of replies for each comment
        const commentIds = commentsData.map(comment => comment.id);
        
        // Get reply counts using a more compatible approach
        const { data: replyCountsData, error: replyCountError } = await getSupabaseClient()
          .from('post_comments')
          .select('parent_comment_id')
          .in('parent_comment_id', commentIds);
        
        if (replyCountError) console.warn("Error fetching reply counts:", replyCountError);
        
        // Count replies for each parent comment manually
        const replyCountMap = new Map();
        replyCountsData?.forEach(item => {
          const parentId = item.parent_comment_id;
          replyCountMap.set(parentId, (replyCountMap.get(parentId) || 0) + 1);
        });

        // Fetch authors separately
        const userIds = [...new Set(commentsData.map(comment => comment.user_id).filter(Boolean))];
        const authorsMap = new Map();
        
        if (userIds.length > 0) {
          const { data: authorsData, error: authorsError } = await getSupabaseClient()
            .from('users')
            .select('id, full_name, avatar_url')
            .in('id', userIds);
          
          if (authorsError) {
            console.warn("Error fetching authors:", authorsError);
          } else if (authorsData) {
            authorsData.forEach(author => {
              authorsMap.set(author.id, {
                id: author.id,
                full_name: author.full_name,
                avatar_url: author.avatar_url,
              });
            });
          }
        }

        const processedComments = commentsData.map(comment => {
          const author = authorsMap.get(comment.user_id) || null;

          return {
            id: comment.id,
            content: comment.content,
            created_at: comment.created_at,
            author: author,
            post_id: postId,
            space_id: spaceId,
            parent_comment_id: null,
            reply_count: replyCountMap.get(comment.id) || 0,
            currentUserId: userId,
            onReplyAddedToParent: () => {}, // Will be overridden later
            fetchRepliesHook: () => Promise.resolve([]),
            onSetReplyTarget: () => {},
            like_count: 0,
            isLiked: false,
          } as CommentItemProps;
        });

        // Now add the callbacks
        const commentsWithCallbacks = processedComments.map(comment => ({
          ...comment,
          onReplyAddedToParent: handleReplyAdded,
          fetchRepliesHook: fetchReplies,
          onSetReplyTarget: setReplyTarget,
        }));

        setComments(commentsWithCallbacks);
        
        // Update the total comment count including replies
        const totalComments = processedComments.length + 
          processedComments.reduce((total, comment) => total + (comment.reply_count || 0), 0);
        setOptimisticCommentCount(totalComments);
        
        console.log(`🔔 [usePostComments] Comments state updated with ${commentsWithCallbacks.length} comments`);
      } else {
        setComments([]);
        console.log('🔔 [usePostComments] No comments found, clearing state');
      }
    } catch (error: any) {
      console.error('🔔 [usePostComments] Error fetching comments:', error);
      toast({
        title: "Error",
        description: error.message || "Could not load comments.",
        variant: "destructive",
      });
    } finally {
      setCommentsLoading(false);
    }
  }, [postId, spaceId, userId]);

  // Function to fetch replies for a comment
  const fetchReplies = useCallback(async (commentId: string): Promise<CommentItemProps[]> => {
    try {
      const { data, error } = await getSupabaseClient()
        .from('post_comments')
        .select(`
          id, content, created_at, user_id, post_id, space_id, parent_comment_id
        `)
        .eq('parent_comment_id', commentId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) return [];

      // Fetch authors separately
      const userIds = [...new Set(data.map(reply => reply.user_id).filter(Boolean))];
      const authorsMap = new Map();
      
      if (userIds.length > 0) {
        const { data: authorsData, error: authorsError } = await getSupabaseClient()
          .from('users')
          .select('id, full_name, avatar_url')
          .in('id', userIds);
        
        if (authorsError) {
          console.warn("Error fetching reply authors:", authorsError);
        } else if (authorsData) {
          authorsData.forEach(author => {
            authorsMap.set(author.id, {
              id: author.id,
              full_name: author.full_name,
              avatar_url: author.avatar_url,
            });
          });
        }
      }

      return data.map(reply => {
        const author = authorsMap.get(reply.user_id) || null;

        return {
          ...reply,
          author: author,
          reply_count: 0,
          like_count: 0,
          isLiked: false,
          currentUserId: userId,
          onReplyAddedToParent: handleReplyAdded,
          fetchRepliesHook: async () => [], // For nested replies, keep as stub for now
          onSetReplyTarget: setReplyTarget, // Use the same function for consistency
        };
      });
    } catch (error: any) {
      console.error('Error fetching replies:', error);
      return [];
    }
  }, [userId]);

  // Function to handle setting reply target
  const setReplyTarget = useCallback((comment: CommentItemProps | null) => {
    setReplyingToComment(comment);
    // Focus the comment input and add @mention
    if (comment?.author?.full_name) {
      setNewComment(`@${comment.author.full_name} `);
    }
  }, []);

  // Handle when a reply is added to a comment
  const handleReplyAdded = useCallback((commentId: string, newReply: CommentItemProps) => {
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
  }, []);

  // Submit a new comment
  const handleCommentSubmit = useCallback(async () => {
    if (!userId) {
      toast({ title: "Please log in to comment.", variant: "default" });
      return;
    }
    if (!newComment.trim()) {
      toast({ title: "Comment cannot be empty.", variant: "destructive" });
      return;
    }
    if (isCommenting) return;

    console.log('🔔 [usePostComments] Submitting comment:', {
      postId: postId,
      content: newComment.trim().substring(0, 50) + '...',
      parentId: replyingToComment?.id
    });

    setIsCommenting(true);
    const originalCommentCount = optimisticCommentCount;
    const parentId = replyingToComment ? replyingToComment.id : null;
    const isReply = !!parentId;

    try {
      const { data, error } = await getSupabaseClient().from('post_comments').insert({
        post_id: postId,
        user_id: userId,
        space_id: spaceId,
        content: newComment.trim(),
        parent_comment_id: parentId,
      }).select('id').single();

      if (error) throw error;

      console.log('🔔 [usePostComments] Comment submitted successfully:', data.id);

      // Insert into user_activity_log after comment creation
      if (data && data.id) {
        await getSupabaseClient().from('user_activity_log').insert({
          user_id: userId,
          type: isReply ? 'reply' : 'comment',
          ref_id: data.id,
          meta: { 
            post_id: postId, 
            space_id: spaceId,
            ...(parentId && { parent_comment_id: parentId })
          }
        });
      }

      // Notify parent component if callback provided - CRITICAL: Call BEFORE refresh
      if (onCommentAdded) {
        console.log('🔔 [usePostComments] Notifying parent of comment addition:', {
          postId,
          newCount: optimisticCommentCount + 1
        });
        onCommentAdded(postId, optimisticCommentCount + 1);
      }
      
      setNewComment("");
      setReplyingToComment(null); // Clear reply target
      setOptimisticCommentCount(prev => prev + 1);
      
      // Refresh comments to show the new comment/reply
      if (showComments) {
        console.log('🔔 [usePostComments] Refreshing comments after successful submission');
        fetchComments();
      }
      
      toast({ 
        title: isReply ? "Reply posted!" : "Comment posted!", 
        variant: "default" 
      });

      console.log('🔔 [usePostComments] Comment submission completed successfully');
      
    } catch (error: any) {
      console.error('🔔 [usePostComments] Error submitting comment:', error);
      // Reset optimistic count on error
      setOptimisticCommentCount(originalCommentCount);
      toast({
        title: "Error",
        description: error.message || "Could not post comment.",
        variant: "destructive",
      });
    } finally {
      setIsCommenting(false);
    }
  }, [userId, newComment, isCommenting, postId, spaceId, replyingToComment, optimisticCommentCount, showComments, fetchComments, onCommentAdded]);

  // Function to handle when a comment's like status is toggled
  const handleCommentLikeToggled = useCallback((commentId: string, isLiked: boolean, likeCount: number) => {
    setComments(prevComments => 
      prevComments.map(comment => 
        comment.id === commentId 
          ? { ...comment, isLiked, like_count: likeCount } 
          : comment
      )
    );
  }, []);

  return {
    newComment,
    setNewComment,
    isCommenting,
    optimisticCommentCount,
    comments,
    commentsLoading,
    showComments,
    setShowComments,
    replyingToComment,
    setReplyTarget,
    handleCommentSubmit,
    handleReplyAdded,
    fetchComments,
    fetchReplies,
    handleCommentLikeToggled,
    // 🔔 Real-time status
    realtimeConnected,
  };
}; 