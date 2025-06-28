import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useRealtimeCommentsOptimized } from '@/hooks/useRealtimeCommentsOptimized';
import type { FetchedComment, CommentAuthor } from '../types/postCard';

// Note: Global type declaration for navigationAwareRealtimeService is in useComments.ts
/*
declare global {
  interface Window {
    navigationAwareRealtimeService?: {
      getStats(): {
        totalSubscriptions: number;
        protectedSubscriptions: number;
        navigationState: {
          lastNavigationTime: number;
          previousRoute: string;
          currentRoute: string;
        };
      };
    };
  }
}
*/

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
  fetchComments: (forceRefresh?: boolean, isForAvatars?: boolean) => Promise<void>;
  realtimeConnected: boolean;
}

/**
 * Custom hook to manage post comments
 * 🔔 NOW WITH REAL-TIME SUPPORT AND NAVIGATION-AWARE CACHING!
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

  // 🔔 OPTIMIZED: Real-time comment subscription using NavigationAwareRealtimeService
  const { isConnected: realtimeConnected } = useRealtimeCommentsOptimized({
    postId: postId || '',
    spaceId: spaceId,
    userId: userId,
    isEnabled: !!postId,
    onNewComment: (newCommentData) => {
      console.log('🔔 [usePostComments] Real-time comment received, refreshing comments...');
      
      // 🔥 FIX: Update comment count FIRST, then fetch after delay
      setOptimisticCommentCount(prev => {
        const newCount = prev + 1;
        console.log('🔔 [usePostComments] Updated optimistic count from real-time:', newCount);
        return newCount;
      });
      
      // 🔧 STABILIZED: Add delay to prevent overwriting optimistic updates
      setTimeout(() => {
        // 🔥 FIX: Always fetch comments for real-time updates, not just when showComments is true
        // This ensures PostCard avatars are updated when new comments arrive
        if (postId) {
          console.log('🔔 [usePostComments] Fetching comments due to real-time update');
          fetchComments();
        }
      }, 1500); // Increased delay to 1.5 seconds to allow optimistic updates to settle
    },
    onCommentUpdate: (commentId) => {
      console.log('🔔 [usePostComments] Comment updated, refreshing comments...', commentId);
      // 🔧 STABILIZED: Add delay for update propagation
      setTimeout(() => {
        // 🔥 FIX: Always fetch comments for updates, not just when showComments is true
        if (postId) {
          console.log('🔔 [usePostComments] Fetching comments due to comment update');
          fetchComments();
        }
      }, 500); // 500ms delay for updates
    }
  });

  // Keep optimistic comment count in sync with initialComments prop
  // 🔥 FIX: Only update if initialComments is higher to prevent resetting optimistic counts
  useEffect(() => {
    setOptimisticCommentCount(prevCount => {
      // Only update if initialComments is higher or if prevCount is 0 (initial load)
      const shouldUpdate = initialComments > prevCount || prevCount === 0;
      if (shouldUpdate) {
        console.log(`🔔 [usePostComments] Syncing optimistic count: ${prevCount} → ${initialComments}`);
        return initialComments;
      }
      console.log(`🔔 [usePostComments] Preserving optimistic count: ${prevCount} (initialComments: ${initialComments})`);
      return prevCount;
    });
  }, [initialComments]);

  // 🚀 NAVIGATION-AWARE: Check if we should skip fetching due to recent navigation
  const shouldSkipFetch = useCallback((isForAvatars: boolean = false) => {
    // 🔥 FIX: Don't skip fetches when they're specifically for avatar display
    if (isForAvatars) {
      return false;
    }
    
    // Check if NavigationAwareRealtimeService exists and if we're in a recent navigation
    if (typeof window !== 'undefined' && window.navigationAwareRealtimeService) {
      const stats = window.navigationAwareRealtimeService.getStats();
      const timeSinceNavigation = Date.now() - stats.navigationState.lastNavigationTime;
      const isRecentNavigation = timeSinceNavigation < 3000; // 3 seconds
      
      // EXPANDED PROTECTION: Cover 3 navigation scenarios
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
      
      // EXPANDED TIMING for initial space loads
      const extendedRecentNavigation = isChatSpaceNavigation ? 
        timeSinceNavigation < 3000 : // 3s for chat-space
        timeSinceNavigation < 10000; // 10s for initial loads and space switching
      
      const shouldSkip = extendedRecentNavigation && (isChatSpaceNavigation || isInitialSpaceLoad || isSpaceSwitching);
      
      if (shouldSkip) {
        const reason = isChatSpaceNavigation ? 'Chat⟷Space navigation' : 
                      isInitialSpaceLoad ? 'initial space load' : 
                      isSpaceSwitching ? 'space switching' : 'recent navigation';
        console.log(`🛡️ [usePostComments] Skipping fetch for post ${postId} - ${reason} detected`);
        return true;
      }
    }
    return false;
  }, [postId]);

  // 🚀 NAVIGATION-AWARE: Fetch comments with navigation awareness
  const fetchComments = useCallback(async (forceRefresh: boolean = false, isForAvatars: boolean = false) => {
    if (!postId) return;
    
    // Skip fetch if we're in a recent navigation scenario (unless forced or for avatars)
    if (!forceRefresh && shouldSkipFetch(isForAvatars)) {
      console.log(`🛡️ [usePostComments] Skipped fetch for post ${postId} due to navigation`);
      return;
    }
    
    console.log(`🔔 [usePostComments] Fetching comments for post: ${postId}`);
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
        
        // 🔥 FIX: Update the total comment count including replies, but preserve optimistic count if higher
        const fetchedTotalComments = processedComments.length + 
          processedComments.reduce((total, comment) => total + (comment.reply_count || 0), 0);
        
        setOptimisticCommentCount(prevCount => {
          // Preserve higher optimistic count to prevent "0 flash" during real-time updates
          const finalCount = Math.max(prevCount, fetchedTotalComments);
          console.log(`🔔 [usePostComments] Comment count update: fetched=${fetchedTotalComments}, optimistic=${prevCount}, final=${finalCount}`);
          return finalCount;
        });
        
        console.log(`🔔 [usePostComments] Comments state updated with ${commentsWithCallbacks.length} comments`);
      } else {
        setComments([]);
        console.log(`🔔 [usePostComments] No comments found, clearing state`);
      }
    } catch (error: any) {
      console.error(`🔔 [usePostComments] Error fetching comments:`, error);
      toast({
        title: "Error",
        description: error.message || "Could not load comments.",
        variant: "destructive",
      });
    } finally {
      setCommentsLoading(false);
    }
  }, [postId, spaceId, userId, shouldSkipFetch]);

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