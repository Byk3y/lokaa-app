import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { CACHE_KEYS, QUERY_OPTIONS } from '@/utils/cacheKeys';
import { optimisticUpdates, cacheInvalidation, cacheDebug } from '@/utils/cacheUtils';

// Types
interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  post_id: string;
  space_id: string;
  parent_comment_id: string | null;
  like_count: number;
  reply_count: number;
  author: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    profile_url?: string | null;
    activity_score?: number | null;
  };
  isLiked?: boolean;
  // New fields for Skool-style reply handling
  initial_replies?: Comment[];
  remaining_reply_count?: number;
  has_more_replies?: boolean;
}

interface CommentAddParams {
  postId: string;
  content: string;
  userId: string;
  spaceId: string;
  parentId?: string;
}

interface CommentLikeParams {
  commentId: string;
  userId: string;
  currentlyLiked: boolean;
  currentLikeCount: number;
}

/**
 * Enhanced Comments Hook with TanStack Query
 * Provides optimized caching, pagination, and optimistic updates
 */
export function useCommentsCache(postId: string, currentUserId?: string) {
  const queryClient = useQueryClient();

  // Comments query with infinite scroll support
  const {
    data: commentsData,
    isLoading: commentsLoading,
    isError: commentsError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchComments,
  } = useInfiniteQuery({
    queryKey: CACHE_KEYS.comments.byPost(postId),
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      cacheDebug.logCacheAccess(CACHE_KEYS.comments.byPost(postId).join('/'), false);
      
      const limit = 20;
      const offset = pageParam * limit;
      
      const { data, error } = await getSupabaseClient()
        .from('post_comments')
        .select(`
          id, content, created_at, user_id, post_id, space_id, parent_comment_id,
          author:user_id(id, full_name, avatar_url, profile_url, activity_score),
          like_count:comment_likes(count) 
        `)
        .eq('post_id', postId)
        .is('parent_comment_id', null) 
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1);
        
      if (error) throw error;

      // Process comments with proper structure and reply counts
      let commentsWithDetails = [];
      if (data && data.length > 0) {
        const commentIds = data.map(comment => comment.id);
        
        // Fetch total reply counts for each comment
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

        // Fetch initial replies for each comment (first 2-3 replies per comment)
        const INITIAL_REPLIES_LIMIT = 3;
        const initialRepliesMap = new Map<string, any[]>();
        
        if (commentIds.length > 0) {
          // Fetch the first few replies for each comment
          const { data: initialRepliesData, error: repliesError } = await getSupabaseClient()
            .from('post_comments')
            .select(`
              id, content, created_at, user_id, post_id, space_id, parent_comment_id,
              author:user_id(id, full_name, avatar_url, profile_url, activity_score),
              like_count:comment_likes(count)
            `)
            .in('parent_comment_id', commentIds)
            .order('created_at', { ascending: true });

          if (repliesError) {
            console.warn("Error fetching initial replies:", repliesError);
          } else if (initialRepliesData) {
            // Group replies by parent comment and limit to first N per comment
            const groupedReplies = new Map<string, any[]>();
            initialRepliesData.forEach(reply => {
              const parentId = reply.parent_comment_id;
              if (parentId) {
                if (!groupedReplies.has(parentId)) {
                  groupedReplies.set(parentId, []);
                }
                const currentReplies = groupedReplies.get(parentId)!;
                if (currentReplies.length < INITIAL_REPLIES_LIMIT) {
                  currentReplies.push(reply);
                }
              }
            });
            
            // Store in our map
            groupedReplies.forEach((replies, parentId) => {
              initialRepliesMap.set(parentId, replies);
            });
          }
        }

        // Get user like status for comments and their initial replies
        let likedCommentIds = new Set<string>();
        if (currentUserId) {
          // Get all comment IDs (parent comments + their initial replies)
          const allCommentIds = [...commentIds];
          initialRepliesMap.forEach(replies => {
            replies.forEach(reply => allCommentIds.push(reply.id));
          });

          const { data: likeStatusData, error: likeStatusError } = await getSupabaseClient()
            .from('comment_likes')
            .select('comment_id')
            .eq('user_id', currentUserId)
            .in('comment_id', allCommentIds);
          if (likeStatusError) console.warn("Error fetching comment like statuses:", likeStatusError);
          else {
            likeStatusData?.forEach(like => likedCommentIds.add(like.comment_id));
          }
        }

        commentsWithDetails = data.map(comment => {
          const totalReplyCount = replyCountMap.get(comment.id) || 0;
          const initialReplies = initialRepliesMap.get(comment.id) || [];
          
          // Process initial replies with like status
          const processedInitialReplies = initialReplies.map(reply => ({
            ...reply,
            author: reply.author as any,
            reply_count: 0, // Replies don't have sub-replies in this structure
            like_count: reply.like_count?.[0]?.count || 0,
            isLiked: likedCommentIds.has(reply.id),
          }));

          return {
            ...comment,
            author: comment.author as any,
            reply_count: totalReplyCount,
            like_count: comment.like_count?.[0]?.count || 0,
            isLiked: likedCommentIds.has(comment.id),
            // New Skool-style fields
            initial_replies: processedInitialReplies,
            remaining_reply_count: Math.max(0, totalReplyCount - processedInitialReplies.length),
            has_more_replies: totalReplyCount > processedInitialReplies.length,
          };
        });
      }

      cacheDebug.logCacheAccess(CACHE_KEYS.comments.byPost(postId).join('/'), true, commentsWithDetails);
      
      return {
        comments: commentsWithDetails,
        nextCursor: data && data.length === limit ? pageParam + 1 : undefined,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    ...QUERY_OPTIONS.standard,
    enabled: !!postId,
  });

  // Flatten comments from all pages
  const comments = useMemo(() => {
    if (!commentsData?.pages) return [];
    return commentsData.pages.flatMap((page: any) => page.comments);
  }, [commentsData]);

  // Add comment mutation with optimistic updates
  const addCommentMutation = useMutation({
    mutationFn: async ({ postId, content, userId, spaceId, parentId }: CommentAddParams) => {
      const { data, error } = await getSupabaseClient()
        .from('post_comments')
        .insert({
          post_id: postId,
          content,
          user_id: userId,
          space_id: spaceId,
          parent_comment_id: parentId,
        })
        .select(`
          id, content, created_at, user_id, post_id, space_id, parent_comment_id,
          author:user_id(id, full_name, avatar_url, profile_url, activity_score)
        `)
        .single();
        
      if (error) throw error;
      return { 
        ...data, 
        isLiked: false,
        like_count: 0,
        reply_count: 0
      };
    },
    onMutate: async ({ postId, content, userId, spaceId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: CACHE_KEYS.comments.byPost(postId) });

      // Get current comments count
      const cachedData = queryClient.getQueryData(CACHE_KEYS.comments.byPost(postId)) as any;
      const currentCommentCount = cachedData?.pages 
        ? cachedData.pages.reduce((total: number, page: any) => total + (page.comments?.length || 0), 0)
        : 0;

      // Create optimistic comment
      const optimisticComment: Comment = {
        id: `temp-${Date.now()}`,
        content,
        created_at: new Date().toISOString(),
        user_id: userId,
        post_id: postId,
        space_id: spaceId,
        parent_comment_id: null,
        like_count: 0,
        reply_count: 0,
        author: {
          id: userId,
          full_name: 'You', // Will be updated when real data arrives
          avatar_url: null,
        },
        isLiked: false,
      };

      // Add optimistic comment to cache
      const rollback = optimisticUpdates.addComment(queryClient, postId, optimisticComment);

      // Update comment count optimistically
      const commentCountRollback = optimisticUpdates.updateCommentCount(
        queryClient,
        postId,
        currentCommentCount + 1
      );

      return { rollback, commentCountRollback };
    },
    onError: (error, variables, context) => {
      // Rollback optimistic updates
      if (context?.rollback) context.rollback();
      if (context?.commentCountRollback) context.commentCountRollback();
      console.error('Add comment failed:', error);
    },
    onSuccess: async (newComment, { postId, spaceId }) => {
      // Invalidate related queries to sync with server
      await cacheInvalidation.invalidateCommentAdd(queryClient, postId, spaceId);
    },
  });

  // Comment like mutation with optimistic updates
  const likeCommentMutation = useMutation({
    mutationFn: async ({ commentId, userId, currentlyLiked }: CommentLikeParams) => {
      if (currentlyLiked) {
        // Unlike
        const { error } = await getSupabaseClient()
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', userId);
        if (error) throw error;
        return false;
      } else {
        // Like
        const { error } = await getSupabaseClient()
          .from('comment_likes')
          .insert({ comment_id: commentId, user_id: userId });
        if (error) throw error;
        return true;
      }
    },
    onMutate: async ({ commentId, userId, currentlyLiked, currentLikeCount }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: CACHE_KEYS.comments.byPost(postId) });

      // Optimistically update comment like status and count (handle both top-level comments and nested replies)
      queryClient.setQueryData(CACHE_KEYS.comments.byPost(postId), (oldData: any) => {
        if (!oldData?.pages) return oldData;
        
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            comments: page.comments.map((comment: Comment) => {
              // Check if this is the comment being liked/unliked
              if (comment.id === commentId) {
                return {
                  ...comment,
                  isLiked: !currentlyLiked,
                  like_count: currentlyLiked 
                    ? Math.max(0, currentLikeCount - 1)
                    : currentLikeCount + 1,
                };
              }
              
              // Check if the commentId is in the initial_replies
              if (comment.initial_replies && comment.initial_replies.length > 0) {
                const updatedInitialReplies = comment.initial_replies.map(reply => {
                  if (reply.id === commentId) {
                    return {
                      ...reply,
                      isLiked: !currentlyLiked,
                      like_count: currentlyLiked 
                        ? Math.max(0, currentLikeCount - 1)
                        : currentLikeCount + 1,
                    };
                  }
                  return reply;
                });
                
                // Only update if we found a matching reply
                if (updatedInitialReplies.some(reply => reply.id === commentId)) {
                  return {
                    ...comment,
                    initial_replies: updatedInitialReplies,
                  };
                }
              }
              
              return comment;
            }),
          })),
        };
      });

      // Return rollback function
      return () => {
        queryClient.setQueryData(CACHE_KEYS.comments.byPost(postId), (oldData: any) => {
          if (!oldData?.pages) return oldData;
          
          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              comments: page.comments.map((comment: Comment) => {
                // Check if this is the comment being rolled back
                if (comment.id === commentId) {
                  return {
                    ...comment,
                    isLiked: currentlyLiked,
                    like_count: currentLikeCount,
                  };
                }
                
                // Check if the commentId is in the initial_replies
                if (comment.initial_replies && comment.initial_replies.length > 0) {
                  const updatedInitialReplies = comment.initial_replies.map(reply => {
                    if (reply.id === commentId) {
                      return {
                        ...reply,
                        isLiked: currentlyLiked,
                        like_count: currentLikeCount,
                      };
                    }
                    return reply;
                  });
                  
                  // Only update if we found a matching reply
                  if (updatedInitialReplies.some(reply => reply.id === commentId)) {
                    return {
                      ...comment,
                      initial_replies: updatedInitialReplies,
                    };
                  }
                }
                
                return comment;
              }),
            })),
          };
        });
      };
    },
    onError: (error, variables, rollback) => {
      // Rollback optimistic update
      if (rollback) rollback();
      console.error('Comment like toggle failed:', error);
    },
    onSuccess: async () => {
      // Refresh comments to sync with server
      await refetchComments();
    },
  });

  // Actions
  const addComment = useCallback(async (content: string, spaceId: string, parentId?: string) => {
    if (!currentUserId || !postId) return null;

    const result = await addCommentMutation.mutateAsync({
      postId,
      content,
      userId: currentUserId,
      spaceId,
      parentId,
    });

    return result;
  }, [currentUserId, postId, addCommentMutation]);

  const toggleCommentLike = useCallback(async (commentId: string) => {
    if (!currentUserId) return;

    // Find comment in both top-level comments and nested replies
    let targetComment: Comment | undefined;
    
    // First check top-level comments
    targetComment = comments.find(c => c.id === commentId);
    
    // If not found, check in initial_replies of all comments
    if (!targetComment) {
      for (const comment of comments) {
        if (comment.initial_replies && comment.initial_replies.length > 0) {
          targetComment = comment.initial_replies.find(reply => reply.id === commentId);
          if (targetComment) break;
        }
      }
    }
    
    if (!targetComment) {
      console.warn(`Comment with id ${commentId} not found in cache`);
      return;
    }

    await likeCommentMutation.mutateAsync({
      commentId,
      userId: currentUserId,
      currentlyLiked: targetComment.isLiked || false,
      currentLikeCount: targetComment.like_count,
    });
  }, [currentUserId, comments, likeCommentMutation]);

  // Get comment count (with optimistic updates)
  const optimisticCommentCount = useMemo(() => {
    if (addCommentMutation.isPending) {
      return comments.length + 1;
    }
    return comments.length;
  }, [comments.length, addCommentMutation.isPending]);

  return {
    // Data
    comments,
    commentCount: optimisticCommentCount,
    
    // Loading states
    commentsLoading,
    isCommenting: addCommentMutation.isPending,
    isLoadingMore: isFetchingNextPage,
    
    // Error states
    commentsError,
    commentError: addCommentMutation.error,
    
    // Pagination
    hasNextPage,
    fetchNextPage,
    
    // Actions
    addComment,
    toggleCommentLike,
    refetchComments,
    
    // Utilities
    invalidateComments: () => cacheInvalidation.invalidateCommentAdd(queryClient, postId, comments[0]?.space_id || ''),
  };
}

/**
 * Hook for replies to a specific comment
 */
export function useCommentReplies(commentId: string, currentUserId?: string) {
  const queryClient = useQueryClient();

  const {
    data: replies = [],
    isLoading: repliesLoading,
    refetch: refetchReplies,
  } = useQuery({
    queryKey: CACHE_KEYS.comments.replies(commentId),
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from('post_comments')
        .select(`
          id, content, created_at, user_id, post_id, space_id, parent_comment_id,
          author:user_id(id, full_name, avatar_url, profile_url, activity_score),
          like_count:comment_likes(count)
        `)
        .eq('parent_comment_id', commentId)
        .order('created_at', { ascending: true });
        
              if (error) throw error;
      
      // Process replies data similar to main comments
      const repliesWithDetails = (data || []).map(reply => ({
        ...reply,
        author: reply.author as any,
        reply_count: 0, // Replies don't have sub-replies in this structure
        like_count: reply.like_count?.[0]?.count || 0,
        isLiked: false, // TODO: Add like status if needed
      }));
      
      return repliesWithDetails;
    },
    ...QUERY_OPTIONS.standard,
    enabled: !!commentId,
  });

  return {
    replies,
    repliesLoading,
    refetchReplies,
  };
} 