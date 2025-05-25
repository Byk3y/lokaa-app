import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThumbsUp, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client'; 
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import UserProfileHoverCard from '@/components/profile/UserProfileHoverCard';

export interface CommentAuthor {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  profile_url?: string | null; // Add profile_url for linking to user profiles
  activity_score?: number | null;
}

export interface CommentItemProps {
  id: string;
  content: string;
  created_at: string; // ISO string format
  author: CommentAuthor | null; // Author might be null if user is deleted or data is inconsistent
  post_id?: string; // The post this comment belongs to
  space_id?: string; // The space this comment belongs to
  parent_comment_id?: string | null; // If this is a reply, the ID of the parent comment
  reply_count?: number; // Number of replies
  like_count?: number; // Number of likes
  isLiked?: boolean; // Whether current user has liked this comment
  onReplyAddedToParent?: (parentCommentId: string, newReply: FetchedCommentFromHook) => void; // Callback when reply is added TO THE PARENT LIST in PostDetailModal
  currentUserId?: string | null; // The ID of the currently logged in user
  fetchRepliesHook: (commentId: string) => Promise<FetchedCommentFromHook[]>;
  onSetReplyTarget: (comment: FetchedCommentFromHook) => void; // Added
  onCommentLikeToggled?: (commentId: string, newLikedState: boolean, newLikeCount: number) => void; // Added
  depth?: number; // For indentation of replies
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
  depth = 0
}) => {
  const { user: loggedInUser } = useAuth();
  const userIdForActions = currentUserId || loggedInUser?.id;

  // State variables
  const [optimisticLikeCount, setOptimisticLikeCount] = useState(like_count);
  const [optimisticLiked, setOptimisticLiked] = useState(isLiked);
  const [showReplies, setShowReplies] = useState(false);
  const [loadedReplies, setLoadedReplies] = useState<FetchedCommentFromHook[]>([]);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const [optimisticReplyCount, setOptimisticReplyCount] = useState(reply_count);
  const [isLiking, setIsLiking] = useState(false);

  // Update optimistic counts when props change
  useEffect(() => {
    setOptimisticReplyCount(reply_count);
  }, [reply_count]);

  useEffect(() => {
    setOptimisticLikeCount(like_count);
    setOptimisticLiked(isLiked);
  }, [like_count, isLiked]);

  const getInitials = (name: string | null): string => {
    if (!name) return 'U'; // Unknown
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  const timeAgo = formatDistanceToNow(new Date(created_at), { addSuffix: true });

  // Handle like toggle
  const handleLikeToggle = async () => {
    if (!userIdForActions) {
      toast({ title: "Please log in to like comments", variant: "default" });
      return;
    }

    if (isLiking) return; // Prevent multiple clicks
    setIsLiking(true);

    // Optimistic update
    const newLikedState = !optimisticLiked;
    setOptimisticLiked(newLikedState);
    setOptimisticLikeCount(prev => newLikedState ? prev + 1 : Math.max(0, prev - 1));

    try {
      if (newLikedState) {
        // Add a like
        const { error } = await supabase
          .from('comment_likes')
          .insert({
            comment_id: id,
            user_id: userIdForActions
          });
        
        if (error) {
          // If it's a unique violation, the user already liked this comment
          if (error.code === '23505') {
            // This is fine, just keep the optimistic update
          } else {
            throw error;
          }
        }
      } else {
        // Remove a like
        const { error } = await supabase
          .from('comment_likes')
          .delete()
          .match({ comment_id: id, user_id: userIdForActions });
        
        if (error) {
          throw error;
        }
      }
      // Notify parent
      if (onCommentLikeToggled) {
        onCommentLikeToggled(id, newLikedState, newLikedState ? optimisticLikeCount + 1 : Math.max(0, optimisticLikeCount -1));
      }
    } catch (error: any) {
      // Revert optimistic update on error
      setOptimisticLiked(!newLikedState);
      setOptimisticLikeCount(prev => !newLikedState ? prev + 1 : Math.max(0, prev - 1));
      toast({ 
        title: "Error updating like", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsLiking(false);
    }
  };

  const handleReplyPress = () => {
    // Construct a FetchedCommentFromHook object from the current comment's props
    // This is what setReplyTarget in useComments expects
    const currentCommentData: FetchedCommentFromHook = {
      id,
      content,
      created_at,
      author,
          post_id,
          space_id,
      parent_comment_id,
      reply_count: optimisticReplyCount, // Use optimistic count
      like_count: optimisticLikeCount,   // Use optimistic count
      isLiked: optimisticLiked,
      // replies: loadedReplies, // Not needed for setting target, might be large
    };
    onSetReplyTarget(currentCommentData);
  };

  // Effect to auto-fetch replies if count changes and replies are shown
  useEffect(() => {
    if (showReplies && optimisticReplyCount > loadedReplies.length) {
      // Potentially a new reply was added while this section is open, or initial load failed to get all.
      // Or, optimisticReplyCount increased due to an external event.
      const fetchAndSetReplies = async () => {
        setIsLoadingReplies(true);
        try {
          const fetched = await fetchRepliesHook(id);
          setLoadedReplies(fetched);
        } catch (error) {
          console.error(`Error in CommentItem loading replies for ${id}:`, error);
        } finally {
          setIsLoadingReplies(false);
        }
      };
      fetchAndSetReplies();
    }
  }, [optimisticReplyCount, showReplies, id, fetchRepliesHook, loadedReplies.length]);
  

  // Load replies for this comment using the hook
  const toggleShowReplies = async () => {
    if (!showReplies && loadedReplies.length === 0) { // Only fetch if not shown AND not already loaded
      setIsLoadingReplies(true);
      try {
        const fetched = await fetchRepliesHook(id);
        setLoadedReplies(fetched);
      } catch (error) {
        // Error toast is handled by the hook
        console.error(`Error in CommentItem loading replies for ${id}:`, error);
      } finally {
        setIsLoadingReplies(false);
      }
    }
    setShowReplies(!showReplies); // Toggle visibility regardless of fetch outcome if already loaded
  };

  // Change from off-white to pure white with lighter border and shadow
  const outerDivBaseClass = "bg-white p-3 rounded-lg border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.05)]";

  // Function to create profile link path
  const getProfileLink = (author: CommentAuthor | null) => {
    if (!author) return null;
    if (author.profile_url) return `/profile/${author.profile_url}`;
    return null;
  };

  if (parent_comment_id) {
    // It's a reply
    return (
      // Adjust indentation to match Skool screenshot more precisely
      <div className={`ml-7 border-l border-gray-100 pl-3 mt-1`}>
        <div className={outerDivBaseClass}>
          <div className="flex items-start space-x-3">
            {author ? (
              <UserProfileHoverCard
                userId={author.id}
                userName={author.full_name || 'Anonymous User'}
                userAvatar={author.avatar_url}
                userProfileUrl={author.profile_url || undefined}
                activityScore={author.activity_score}
              >
                <Link to={getProfileLink(author) || '#'} className={!getProfileLink(author) ? 'pointer-events-none' : ''}>
                  <Avatar className="h-8 w-8 flex-shrink-0 hover:ring-2 hover:ring-blue-300 transition-all">
                    {author.avatar_url ? (
                      <AvatarImage src={author.avatar_url} alt={author.full_name || 'User'} />
                    ) : (
                      <AvatarFallback className="text-sm bg-blue-100 text-blue-600">
                        {getInitials(author.full_name || null)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                </Link>
              </UserProfileHoverCard>
            ) : (
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className="text-sm bg-gray-100 text-gray-600">
                  U
                </AvatarFallback>
              </Avatar>
            )}
            <div className="flex-grow">
              <div className="flex items-center space-x-2">
                {author ? (
                  <UserProfileHoverCard
                    userId={author.id}
                    userName={author.full_name || 'Anonymous User'}
                    userAvatar={author.avatar_url}
                    userProfileUrl={author.profile_url || undefined}
                    activityScore={author.activity_score}
                  >
                    <Link 
                      to={getProfileLink(author) || '#'} 
                      className={`text-sm font-semibold text-gray-800 hover:text-blue-600 hover:underline ${!getProfileLink(author) ? 'pointer-events-none' : ''}`}
                    >
                      {author.full_name || 'Anonymous User'}
                    </Link>
                  </UserProfileHoverCard>
                ) : (
                  <span className="text-sm font-semibold text-gray-800">
                    Anonymous User
                  </span>
                )}
                <span className="text-xs text-gray-500">{timeAgo}</span>
              </div>
              <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap break-words">
                {content}
              </p>
              
              {/* Actions: Like and Reply - exactly match Skool button styling */}
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

              {/* Replies Section (View/Hide button) - style to match Skool */}
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

              {/* Loaded Replies (Recursive Call) */}
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
              {showReplies && loadedReplies.length === 0 && !isLoadingReplies && optimisticReplyCount > 0 &&(
                 <div className="mt-2 text-xs text-gray-400">No replies found or failed to load.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  } else {
    // It's a top-level comment
    return (
      <div className="mb-4"> {/* More space between top-level comments */}
        <div className={outerDivBaseClass}>
          {/* Duplicated structure - consider refactoring into a sub-component if this gets too unwieldy */}
          <div className="flex items-start space-x-3">
            {author ? (
              <UserProfileHoverCard
                userId={author.id}
                userName={author.full_name || 'Anonymous User'}
                userAvatar={author.avatar_url}
                userProfileUrl={author.profile_url || undefined}
                activityScore={author.activity_score}
              >
                <Link to={getProfileLink(author) || '#'} className={!getProfileLink(author) ? 'pointer-events-none' : ''}>
                  <Avatar className="h-8 w-8 flex-shrink-0 hover:ring-2 hover:ring-blue-300 transition-all">
                    {author.avatar_url ? (
                      <AvatarImage src={author.avatar_url} alt={author.full_name || 'User'} />
                    ) : (
                      <AvatarFallback className="text-sm bg-blue-100 text-blue-600">
                        {getInitials(author.full_name || null)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                </Link>
              </UserProfileHoverCard>
            ) : (
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className="text-sm bg-gray-100 text-gray-600">
                  U
                </AvatarFallback>
              </Avatar>
            )}
            <div className="flex-grow">
              <div className="flex items-center space-x-2">
                {author ? (
                  <UserProfileHoverCard
                    userId={author.id}
                    userName={author.full_name || 'Anonymous User'}
                    userAvatar={author.avatar_url}
                    userProfileUrl={author.profile_url || undefined}
                    activityScore={author.activity_score}
                  >
                    <Link 
                      to={getProfileLink(author) || '#'} 
                      className={`text-sm font-semibold text-gray-800 hover:text-blue-600 hover:underline ${!getProfileLink(author) ? 'pointer-events-none' : ''}`}
                    >
                      {author.full_name || 'Anonymous User'}
                    </Link>
                  </UserProfileHoverCard>
                ) : (
                  <span className="text-sm font-semibold text-gray-800">
                    Anonymous User
                  </span>
                )}
                <span className="text-xs text-gray-500">{timeAgo}</span>
              </div>
              <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap break-words">
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
                  className="flex items-center mr-5 hover:text-blue-500"
                >
                  Reply
                </button>
                {optimisticReplyCount > 0 && (
                  <button 
                    onClick={toggleShowReplies}
                    className="flex items-center hover:text-blue-500"
                  >
                    {showReplies 
                      ? `Hide replies` 
                      : `${optimisticReplyCount} ${optimisticReplyCount === 1 ? 'Reply' : 'Replies'}`}
                    {isLoadingReplies && " (Loading...)"}
                  </button>
                )}
              </div>

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
              {showReplies && loadedReplies.length === 0 && !isLoadingReplies && optimisticReplyCount > 0 &&(
                 <div className="mt-2 text-xs text-gray-400">No replies found or failed to load.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
};

export default CommentItem; 