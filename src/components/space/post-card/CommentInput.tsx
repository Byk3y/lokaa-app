import React from 'react';
import { Loader2, Send } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { CommentItemProps } from '@/features/posts/hooks/usePostComments';

interface CommentInputProps {
  showComments: boolean;
  currentUserId?: string | null;
  userAvatarUrl?: string | null;
  userName?: string;
  newComment: string;
  setNewComment: (value: string) => void;
  isCommenting: boolean;
  replyingToComment: CommentItemProps | null;
  onCommentSubmit: () => Promise<void>;
  onCancelReply?: () => void;
}

/**
 * Comment input component for PostCard
 */
export const CommentInput: React.FC<CommentInputProps> = ({
  showComments,
  currentUserId,
  userAvatarUrl,
  userName = 'User',
  newComment,
  setNewComment,
  isCommenting,
  replyingToComment,
  onCommentSubmit,
  onCancelReply
}) => {
  // Don't render if comments aren't visible or user isn't logged in
  if (!showComments || !currentUserId) {
    return null;
  }

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewComment(e.target.value);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      onCommentSubmit();
    }
  };

  // Handle pressing Enter to submit
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && newComment.trim()) {
      e.preventDefault();
      onCommentSubmit();
    }
  };
  
  // Get initial for avatar fallback
  const getInitial = () => {
    if (!userName) return 'U';
    return userName.charAt(0).toUpperCase();
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex items-center space-x-2">
      <Avatar className="h-8 w-8 rounded-full">
        {userAvatarUrl ? <AvatarImage src={userAvatarUrl} /> : null}
        <AvatarFallback className="bg-gray-200 text-gray-600 font-medium text-sm">
          {getInitial()}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 relative">
        {replyingToComment && (
          <div className="absolute -top-5 left-0 right-0 text-xs text-gray-500 flex justify-between">
            <span>
              Replying to{' '}
              <span className="font-medium">
                {replyingToComment.author?.full_name || 'User'}
              </span>
            </span>
            {onCancelReply && (
              <button
                type="button"
                onClick={onCancelReply}
                className="text-xs hover:underline text-gray-500"
              >
                Cancel
              </button>
            )}
          </div>
        )}
        
        <input
          type="text"
          value={newComment}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={replyingToComment ? "Write a reply..." : "Write a comment..."}
          className={cn(
            "block w-full border border-gray-300 rounded-full py-1.5 px-3 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400",
            isCommenting && "bg-gray-50"
          )}
          disabled={isCommenting}
        />
      </div>
      
      <button
        type="submit"
        disabled={!newComment.trim() || isCommenting}
        className={cn(
          "flex-shrink-0 rounded-full p-1.5",
          newComment.trim() && !isCommenting
            ? "text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            : "text-gray-400 cursor-not-allowed"
        )}
      >
        {isCommenting ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Send size={18} />
        )}
      </button>
    </form>
  );
}; 