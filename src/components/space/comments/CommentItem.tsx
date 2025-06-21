import React, { useState, useEffect, memo, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from '@/hooks/use-toast';

import UserProfileHoverCard from '@/components/profile/UserProfileHoverCard';
import { Link } from 'react-router-dom';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { Heart, MoreHorizontal, MessageCircle, Flag, Edit2, Trash2, Pencil, X, Check } from 'lucide-react';
import { OptimizedAvatar } from '@/components/ui/OptimizedAvatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getInitials } from '@/shared/utils/avatar-utils';
import { Textarea } from '@/components/ui/textarea';

// Types
export interface CommentAuthor {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  profile_url?: string | null;
  activity_score?: number | null;
}

export interface CommentItemProps {
  id: string;
  content: string;
  created_at: string;
  author: CommentAuthor | null;
  post_id?: string;
  space_id?: string;
  parent_comment_id?: string | null;
  reply_count?: number;
  like_count?: number;
  isLiked?: boolean;
  onReplyAddedToParent?: (parentCommentId: string, newReply: FetchedCommentFromHook) => void;
  currentUserId?: string | null;
  fetchRepliesHook: (commentId: string) => Promise<FetchedCommentFromHook[]>;
  onSetReplyTarget: (comment: FetchedCommentFromHook) => void;
  onCommentLikeToggled?: (commentId: string, newLikedState: boolean, newLikeCount: number) => void;
  depth?: number;
  // New Skool-style fields
  initial_replies?: FetchedCommentFromHook[];
  remaining_reply_count?: number;
  has_more_replies?: boolean;
}

interface FetchedCommentFromHook {
  id: string;
  content: string;
  created_at: string;
  author: CommentAuthor | null;
  post_id?: string;
  space_id?: string;
  parent_comment_id?: string | null;
  parentAuthorName?: string | null;
  replies?: FetchedCommentFromHook[];
  reply_count?: number;
  like_count?: number;
  isLiked?: boolean;
  // New Skool-style fields
  initial_replies?: FetchedCommentFromHook[];
  remaining_reply_count?: number;
  has_more_replies?: boolean;
}

const CommentItem: React.FC<CommentItemProps> = ({ 
  id, 
  content, 
  created_at, 
  author, 
  post_id,
  space_id,
  parent_comment_id,
  reply_count = 0,
  like_count = 0,
  isLiked = false,
  onReplyAddedToParent,
  currentUserId,
  fetchRepliesHook,
  onSetReplyTarget,
  onCommentLikeToggled,
  depth = 0,
  // New Skool-style props
  initial_replies = [],
  remaining_reply_count = 0,
  has_more_replies = false
}) => {
  const { user: loggedInUser } = useOptimizedAuth();
  const userIdForActions = currentUserId || loggedInUser?.id;

  // State variables
  const [optimisticLikeCount, setOptimisticLikeCount] = useState(like_count);
  const [optimisticLiked, setOptimisticLiked] = useState(isLiked);
  const [showMoreReplies, setShowMoreReplies] = useState(false);
  const [additionalReplies, setAdditionalReplies] = useState<FetchedCommentFromHook[]>([]);
  const [isLoadingMoreReplies, setIsLoadingMoreReplies] = useState(false);
  const [optimisticReplyCount, setOptimisticReplyCount] = useState(reply_count);
  const [isLiking, setIsLiking] = useState(false);

  // For reply comments: use the old system (loadedReplies)
  const [loadedReplies, setLoadedReplies] = useState<FetchedCommentFromHook[]>([]);
  const [showReplies, setShowReplies] = useState(false);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);

  // Update optimistic counts when props change
  useEffect(() => {
    setOptimisticReplyCount(reply_count);
  }, [reply_count]);

  useEffect(() => {
    setOptimisticLikeCount(like_count);
    setOptimisticLiked(isLiked);
  }, [like_count, isLiked]);

  const timeAgo = formatDistanceToNow(new Date(created_at), { addSuffix: true });

  const handleLikeToggle = async () => {
    if (!userIdForActions || isLiking) return;

    const newLikedState = !optimisticLiked;
    const newLikeCount = newLikedState ? optimisticLikeCount + 1 : optimisticLikeCount - 1;

    // Only do optimistic updates and delegate the actual database call to the parent
    setOptimisticLiked(newLikedState);
    setOptimisticLikeCount(newLikeCount);
    setIsLiking(true);

    try {
      // Use the callback from parent instead of making direct database calls
      if (onCommentLikeToggled) {
        await onCommentLikeToggled(id, newLikedState, newLikeCount);
      } else {
        // Fallback to direct database call only if no callback is provided
        if (newLikedState) {
          const { error } = await getSupabaseClient()
            .from('comment_likes')
            .insert({ comment_id: id, user_id: userIdForActions });
          if (error) throw error;
        } else {
          const { error } = await getSupabaseClient()
            .from('comment_likes')
            .delete()
            .eq('comment_id', id)
            .eq('user_id', userIdForActions);
          if (error) throw error;
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      setOptimisticLiked(!newLikedState);
      setOptimisticLikeCount(newLikedState ? optimisticLikeCount - 1 : optimisticLikeCount + 1);
      toast({
        title: "Error",
        description: "Could not update like status",
        variant: "destructive",
      });
    } finally {
      setIsLiking(false);
    }
  };

  const handleReplyPress = () => {
    const currentCommentData: FetchedCommentFromHook = {
      id,
      content,
      created_at,
      author,
      post_id,
      space_id,
      parent_comment_id,
      reply_count: optimisticReplyCount,
      like_count: optimisticLikeCount,
      isLiked: optimisticLiked,
    };
    onSetReplyTarget(currentCommentData);
  };

  // Load additional replies for top-level comments (Skool-style)
  const loadMoreReplies = async () => {
    if (isLoadingMoreReplies) return;
    
    setIsLoadingMoreReplies(true);
    try {
      const excludeIds = initial_replies.map(reply => reply.id);
      const fetched = await fetchRepliesHook(id);
      
      const additionalFetched = fetched.filter(reply => !excludeIds.includes(reply.id));
      setAdditionalReplies(additionalFetched);
      setShowMoreReplies(true);
    } catch (error) {
      console.error(`Error loading additional replies for ${id}:`, error);
    } finally {
      setIsLoadingMoreReplies(false);
    }
  };

  // Load replies for reply comments (legacy system)
  const toggleShowReplies = async () => {
    if (!showReplies && loadedReplies.length === 0) {
      setIsLoadingReplies(true);
      try {
        const fetched = await fetchRepliesHook(id);
        setLoadedReplies(fetched);
      } catch (error) {
        console.error(`Error in CommentItem loading replies for ${id}:`, error);
      } finally {
        setIsLoadingReplies(false);
      }
    }
    setShowReplies(!showReplies);
  };

  const getProfileLink = (author: CommentAuthor | null) => {
    if (!author) return null;
    if (author.profile_url) return `/profile/${author.profile_url}`;
    return null;
  };

  if (parent_comment_id) {
    // It's a reply - Skool-style clean indentation
    return (
      <div className="ml-11 pl-3 border-l border-gray-200">
        <div className="py-3">
          <div className="flex items-start space-x-3">
            {author ? (
              <UserProfileHoverCard
                userId={author.id}
                userName={author.full_name || author.id.split('-')[0] || 'User'}
                userAvatar={author.avatar_url}
                userProfileUrl={author.profile_url || undefined}
                activityScore={author.activity_score}
              >
                <Link to={getProfileLink(author) || '#'} className={!getProfileLink(author) ? 'pointer-events-none' : ''}>
                  <OptimizedAvatar
                    user={{
                      id: author.id,
                      full_name: author.full_name,
                      avatar_url: author.avatar_url
                    }}
                    size="lg"
                    enableLazyLoading={false}
                    enableCaching={true}
                    placeholderType="initials"
                    loadingTransition="fade"
                    className="h-9 w-9 flex-shrink-0 hover:ring-2 hover:ring-blue-300 transition-all"
                  />
                </Link>
              </UserProfileHoverCard>
            ) : (
              <OptimizedAvatar
                user={{
                  id: 'unknown',
                  full_name: 'User',
                  avatar_url: null
                }}
                size="lg"
                enableLazyLoading={false}
                enableCaching={true}
                placeholderType="initials"
                loadingTransition="fade"
                className="h-9 w-9 flex-shrink-0"
              />
            )}
            <div className="flex-grow">
              <div className="flex items-center space-x-2">
                {author ? (
                  <UserProfileHoverCard
                    userId={author.id}
                    userName={author.full_name || author.id.split('-')[0] || 'User'}
                    userAvatar={author.avatar_url}
                    userProfileUrl={author.profile_url || undefined}
                    activityScore={author.activity_score}
                  >
                    <Link 
                      to={getProfileLink(author) || '#'} 
                      className={`font-semibold text-gray-900 hover:text-blue-600 hover:underline ${!getProfileLink(author) ? 'pointer-events-none' : ''}`}
                    >
                      {author.full_name || author.id.split('-')[0] || 'User'}
                    </Link>
                  </UserProfileHoverCard>
                ) : (
                  <span className="font-semibold text-gray-900">
                    User
                  </span>
                )}
                <span className="text-sm text-gray-500">{timeAgo}</span>
              </div>
              <p className="text-gray-800 mt-1 whitespace-pre-wrap break-words leading-relaxed">
                {content}
              </p>
              
              <div className="mt-2 flex items-center text-xs text-gray-500"> 
                <button 
                  onClick={handleLikeToggle}
                  className={`flex items-center mr-5 hover:text-blue-500 ${optimisticLiked ? 'text-blue-500' : ''}`}
                  disabled={!userIdForActions || isLiking}
                >
                  {optimisticLikeCount > 0 ? (
                    <>
                      <span>{optimisticLikeCount}</span>
                      <span className="ml-1">{optimisticLikeCount === 1 ? 'Like' : 'Likes'}</span>
                    </>
                  ) : (
                    <span>Like</span>
                  )}
                </button>
                <button 
                  onClick={handleReplyPress}
                  className="flex items-center hover:text-blue-500"
                >
                  Reply
                </button>
              </div>

              {/* Replies Section for nested replies (legacy system) */}
              {optimisticReplyCount > 0 && (
                <div className="mt-2 mb-1">
                  <button 
                    onClick={toggleShowReplies} 
                    className="text-xs text-blue-600 hover:underline font-medium"
                  >
                    {showReplies 
                      ? `Hide replies` 
                      : `${optimisticReplyCount} ${optimisticReplyCount === 1 ? 'Reply' : 'Replies'}`}
                    {isLoadingReplies && " (Loading...)"}
                  </button>
                </div>
              )}

              {showReplies && loadedReplies.length > 0 && (
                <div className="mt-2 space-y-1">
                  {loadedReplies.map(reply => (
                    <CommentItem 
                      key={reply.id} 
                      {...reply} 
                      currentUserId={userIdForActions}
                      onReplyAddedToParent={onReplyAddedToParent}
                      fetchRepliesHook={fetchRepliesHook}
                      onSetReplyTarget={onSetReplyTarget}
                      depth={(depth || 0) + 1} 
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  } else {
    // It's a top-level comment - Skool-style clean flat design
    return (
      <div className="py-4 border-b border-gray-100 last:border-b-0">
        <div className="flex items-start space-x-4">
          {author ? (
            <UserProfileHoverCard
              userId={author.id}
              userName={author.full_name || author.id.split('-')[0] || 'User'}
              userAvatar={author.avatar_url}
              userProfileUrl={author.profile_url || undefined}
              activityScore={author.activity_score}
            >
              <Link to={getProfileLink(author) || '#'} className={!getProfileLink(author) ? 'pointer-events-none' : ''}>
                <OptimizedAvatar
                  user={{
                    id: author.id,
                    full_name: author.full_name,
                    avatar_url: author.avatar_url
                  }}
                  size="xl"
                  enableLazyLoading={false}
                  enableCaching={true}
                  placeholderType="initials"
                  loadingTransition="fade"
                  className="h-11 w-11 flex-shrink-0 hover:ring-2 hover:ring-blue-300 transition-all"
                />
              </Link>
            </UserProfileHoverCard>
          ) : (
            <OptimizedAvatar
              user={{
                id: 'unknown',
                full_name: 'User',
                avatar_url: null
              }}
              size="xl"
              enableLazyLoading={false}
              enableCaching={true}
              placeholderType="initials"
              loadingTransition="fade"
              className="h-11 w-11 flex-shrink-0"
            />
          )}
          <div className="flex-grow">
            <div className="flex items-center space-x-2">
              {author ? (
                <UserProfileHoverCard
                  userId={author.id}
                  userName={author.full_name || author.id.split('-')[0] || 'User'}
                  userAvatar={author.avatar_url}
                  userProfileUrl={author.profile_url || undefined}
                  activityScore={author.activity_score}
                >
                  <Link 
                    to={getProfileLink(author) || '#'} 
                    className={`font-semibold text-gray-900 hover:text-blue-600 hover:underline ${!getProfileLink(author) ? 'pointer-events-none' : ''}`}
                  >
                    {author.full_name || author.id.split('-')[0] || 'User'}
                  </Link>
                </UserProfileHoverCard>
              ) : (
                <span className="font-semibold text-gray-900">
                  User
                </span>
              )}
              <span className="text-sm text-gray-500">{timeAgo}</span>
            </div>
            <p className="text-gray-800 mt-2 whitespace-pre-wrap break-words leading-relaxed">
              {content}
            </p>
            
            <div className="mt-3 flex items-center text-xs text-gray-500">
              <button 
                onClick={handleLikeToggle}
                className={`flex items-center mr-5 hover:text-blue-500 ${optimisticLiked ? 'text-blue-500' : ''}`}
                disabled={!userIdForActions || isLiking}
              >
                {optimisticLikeCount > 0 ? (
                  <>
                    <span>{optimisticLikeCount}</span>
                    <span className="ml-1">{optimisticLikeCount === 1 ? 'Like' : 'Likes'}</span>
                  </>
                ) : (
                  <span>Like</span>
                )}
              </button>
              <button 
                onClick={handleReplyPress}
                className="flex items-center hover:text-blue-500"
              >
                Reply
              </button>
            </div>

            {/* Display Initial Replies (Skool-style - always shown) */}
            {initial_replies && initial_replies.length > 0 && (
              <div className="mt-4 space-y-1">
                {initial_replies.map(reply => (
                  <CommentItem 
                    key={reply.id} 
                    {...reply} 
                    currentUserId={userIdForActions}
                    onReplyAddedToParent={onReplyAddedToParent}
                    fetchRepliesHook={fetchRepliesHook}
                    onSetReplyTarget={onSetReplyTarget}
                    depth={(depth || 0) + 1}
                  />
                ))}
              </div>
            )}

            {/* Display Additional Replies (when "View more replies" is clicked) */}
            {showMoreReplies && additionalReplies.length > 0 && (
              <div className="mt-2 space-y-1">
                {additionalReplies.map(reply => (
                  <CommentItem 
                    key={reply.id} 
                    {...reply} 
                    currentUserId={userIdForActions}
                    onReplyAddedToParent={onReplyAddedToParent}
                    fetchRepliesHook={fetchRepliesHook}
                    onSetReplyTarget={onSetReplyTarget}
                    depth={(depth || 0) + 1}
                  />
                ))}
              </div>
            )}

            {/* View More Replies Button (Skool-style) */}
            {has_more_replies && !showMoreReplies && (
              <div className="mt-3">
                <button 
                  onClick={loadMoreReplies}
                  className="text-xs text-blue-600 hover:underline font-medium"
                  disabled={isLoadingMoreReplies}
                >
                  {isLoadingMoreReplies 
                    ? "Loading..." 
                    : `View ${remaining_reply_count} more ${remaining_reply_count === 1 ? 'reply' : 'replies'}`}
                </button>
              </div>
            )}

            {/* Hide More Replies Button */}
            {showMoreReplies && additionalReplies.length > 0 && (
              <div className="mt-2">
                <button 
                  onClick={() => setShowMoreReplies(false)}
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  Hide additional replies
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
};

export default CommentItem;