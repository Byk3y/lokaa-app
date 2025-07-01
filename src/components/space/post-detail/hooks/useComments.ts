import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useRealtimeCommentsOptimized } from '@/hooks/useRealtimeCommentsOptimized';
import type { PostCardProps } from '@/features/posts/types/postCard';
import type { CommentAuthor } from '@/components/space/comments/CommentItem';

// Note: Global type declaration for navigationAwareRealtimeService is in usePostComments.ts

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

type CommentDataFromServer = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  post_id: string;
  space_id: string;
  parent_comment_id: string | null;
  author: CommentAuthor | null;
};

/**
 * Hook to handle post comments (fetching, posting, managing state)
 * 🔔 NOW WITH REAL-TIME SUPPORT AND NAVIGATION-AWARE CACHING!
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

  // 🔔 OPTIMIZED: Real-time comment subscription using NavigationAwareRealtimeService
  const { isConnected: realtimeConnected } = useRealtimeCommentsOptimized({
    postId: post?.id || '',
    spaceId: post?.spaceId,
    userId: currentUserId,
    isEnabled: !!post?.id,
    onNewComment: (newCommentData) => {
      console.log('🔔 [useComments] Real-time comment received, refreshing comments...');
      // 🔧 STABILIZED: Add delay to prevent overwriting optimistic updates
      setTimeout(() => {
        if (post?.id) {
          fetchComments(post.id, true, true); // Force refresh for real-time updates (modal context)
        }
      }, 1000); // 1-second delay to allow optimistic updates to settle
    },
    onCommentUpdate: (commentId) => {
      console.log('🔔 [useComments] Comment updated, refreshing comments...', commentId);
      // 🔧 STABILIZED: Add delay for update propagation
      setTimeout(() => {
        if (post?.id) {
          fetchComments(post.id, true, true); // Force refresh for updates (modal context)
        }
      }, 500); // 500ms delay for updates
    }
  });

  // 🚀 NAVIGATION-AWARE: Check if we should skip fetching due to recent navigation
  const shouldSkipFetch = useCallback((isModalContext: boolean = false) => {
    // 🎭 PHASE 1 FIX: Never skip fetch for PostDetailModal context
    if (isModalContext) {
      console.log(`🎭 [useComments] Modal context detected - allowing fetch for post ${post?.id}`);
      return false;
    }
    
    if (typeof window !== 'undefined' && window.navigationAwareRealtimeService) {
      const stats = window.navigationAwareRealtimeService.getStats();
      const timeSinceNavigation = Date.now() - stats.navigationState.lastNavigationTime;
      const isRecentNavigation = timeSinceNavigation < 3000; // 3 seconds
      
      // EXPANDED PROTECTION: Cover more navigation scenarios
      const previousRoute = stats.navigationState.previousRoute;
      const currentRoute = stats.navigationState.currentRoute;
      
      // 1. Chat⟷Space navigation (original protection)
      const isChatSpaceNavigation = (
        (previousRoute.includes('/app/chat') && currentRoute.includes('/space')) ||
        (previousRoute.includes('/space') && currentRoute.includes('/app/chat'))
      );
      
      // 2. INITIAL SPACE LOAD PROTECTION (NEW) - Login flow navigation
      const isInitialSpaceLoad = (
        currentRoute.includes('/space') && (
          previousRoute.includes('/login') ||
          previousRoute.includes('/app') ||
          previousRoute === '/' ||
          previousRoute.includes('/auth') ||
          previousRoute === '' ||
          timeSinceNavigation < 10000 // EXPANDED: 10s window for initial space loads (was 5s)
        )
      );
      
      // 3. Space switching protection (NEW)
      const isSpaceSwitching = (
        previousRoute.includes('/space') && currentRoute.includes('/space') && 
        previousRoute !== currentRoute
      );
      
      // 🎭 PHASE 1 FIX: Don't skip for same-route navigation (modal opening)
      const isSameRouteNavigation = (previousRoute === currentRoute);
      
      // EXPANDED TIMING for initial space loads
      const extendedRecentNavigation = isChatSpaceNavigation ? 
        timeSinceNavigation < 3000 : // 3s for chat-space
        timeSinceNavigation < 10000; // 10s for initial loads and space switching
      
      const shouldSkip = extendedRecentNavigation && (isChatSpaceNavigation || isInitialSpaceLoad || isSpaceSwitching) && !isSameRouteNavigation;
      
      // ENHANCED DEBUGGING
      console.log(`🔍 [useComments] shouldSkipFetch analysis for post ${post?.id}:`, {
        timeSinceNavigation: `${timeSinceNavigation}ms`,
        navigation: `${previousRoute} → ${currentRoute}`,
        conditions: {
          isRecentNavigation,
          extendedRecentNavigation,
          isChatSpaceNavigation,
          isInitialSpaceLoad,
          isSpaceSwitching,
          isSameRouteNavigation
        },
        result: shouldSkip ? 'SKIP FETCH' : 'ALLOW FETCH'
      });
      
      if (shouldSkip) {
        const reason = isChatSpaceNavigation ? 'Chat⟷Space navigation' : 
                      isInitialSpaceLoad ? 'initial space load' : 
                      isSpaceSwitching ? 'space switching' : 'recent navigation';
        console.log(`🛡️ [useComments] Skipping fetch for post ${post?.id} - ${reason} detected (${previousRoute} → ${currentRoute}, ${timeSinceNavigation}ms ago)`);
        return true;
      }
    }
    return false;
  }, [post?.id]);

  // 🚀 NAVIGATION-AWARE: Load initial comment data when post changes
  useEffect(() => {
    if (post?.id) {
      // 🎭 PHASE 1 FIX: Always fetch for modal context (PostDetailModal)
      const isModalContext = true; // This hook is used in PostDetailModal
      if (!shouldSkipFetch(isModalContext)) {
        console.log('🔔 [useComments] Loading comments for post:', post.id);
        fetchComments(post.id, false, true); // Initial fetch with modal context
      } else {
        console.log(`🛡️ [useComments] Skipped initial fetch for post ${post.id} due to navigation`);
      }
    }
    setOptimisticCommentCount(post?.comments || 0);
  }, [post?.id, post?.comments, shouldSkipFetch]);

  // 🚀 NAVIGATION-AWARE: Fetch comments for the post
  const fetchComments = async (postId: string, forceRefresh: boolean = false, isModalContext: boolean = true) => {
    if (!postId) return;
    
    // Skip fetch if we're in a recent navigation scenario (unless forced or modal context)
    if (!forceRefresh && shouldSkipFetch(isModalContext)) {
      console.log(`🛡️ [useComments] Skipped fetch for post ${postId} due to navigation`);
      return;
    }
    
    console.log('🔔 [useComments] Fetching comments for post:', postId);
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
        console.log(`🔔 [useComments] Fetched ${data.length} comments for post ${postId}`);
        
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
        console.log(`🔔 [useComments] Comments state updated with ${commentsWithDetails.length} comments`);
      } else {
        setComments([]);
        console.log('🔔 [useComments] No comments found, clearing state');
      }
    } catch (err) {
      console.error('🔔 [useComments] Error fetching comments:', err);
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

    console.log('🔔 [useComments] Submitting comment:', {
      postId: post.id,
      content: contentToSubmit.substring(0, 50) + '...',
      parentId: replyingToComment?.id
    });

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

      console.log('🔔 [useComments] Comment submitted successfully:', submittedCommentData.id);

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
        // It's a new top-level comment - add optimistically and real-time will confirm
        setComments(prevComments => [...prevComments, newCommentEntry]);
        setOptimisticCommentCount(prevCount => prevCount + 1); 
        console.log('🔔 [useComments] Added optimistic comment, real-time will sync');
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

      console.log('🔔 [useComments] Comment submission completed successfully');

    } catch (error: any) {
      console.error('🔔 [useComments] Error submitting comment:', error);
      toast({
        title: "Error",
        description: error.message || "Could not post comment",
        variant: "destructive",
      });
    } finally {
      setIsCommenting(false);
    }
  };

  // Handle when a reply is added to a parent comment
  const handleReplyAdded = (commentId: string, newReply: any) => {
    // Update the parent comment's reply count
    setComments(prevComments => 
      prevComments.map(comment => 
        comment.id === commentId 
          ? { ...comment, reply_count: (comment.reply_count || 0) + 1 }
          : comment
      )
    );
    setOptimisticCommentCount(prevCount => prevCount + 1);
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

  return {
    comments,
    commentsLoading,
    newComment,
    setNewComment,
    isCommenting,
    optimisticCommentCount,
    replyingToComment,
    setReplyTarget,
    handleCommentSubmit,
    handleReplyAdded,
    fetchComments,
    fetchReplies,
    // 🔔 Real-time status
    realtimeConnected,
  };
} 