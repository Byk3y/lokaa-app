import React from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CommentItemProps } from '@/features/posts/hooks/usePostComments';
import CommentItem from '@/components/space/comments/CommentItem';

interface CommentsSectionProps {
  showComments: boolean;
  commentsLoading: boolean;
  comments: CommentItemProps[];
  optimisticCommentCount: number;
  onToggleComments: () => void;
  onFetchComments: () => Promise<void>;
}

/**
 * Comments section component for PostCard
 */
export const CommentsSection: React.FC<CommentsSectionProps> = ({
  showComments,
  commentsLoading,
  comments,
  optimisticCommentCount,
  onToggleComments,
  onFetchComments
}) => {
  // Only fetch comments if they're shown and we need to
  React.useEffect(() => {
    if (showComments && comments.length === 0 && !commentsLoading) {
      onFetchComments();
    }
  }, [showComments, comments.length, commentsLoading, onFetchComments]);

  // Don't render anything if there are no comments and we're not showing them
  if (optimisticCommentCount === 0 && !showComments) {
    return null;
  }

  return (
    <div className="mt-1 px-3 pb-2">
      {optimisticCommentCount > 0 && !showComments && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleComments}
          className="text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 py-1 h-7 px-2"
        >
          {optimisticCommentCount === 1
            ? "View 1 comment"
            : `View all ${optimisticCommentCount} comments`}
        </Button>
      )}

      {showComments && (
        <div className="space-y-2 mt-2">
          {/* Toggle to hide comments */}
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-700">
              {optimisticCommentCount === 0
                ? "No comments yet"
                : optimisticCommentCount === 1
                ? "1 Comment"
                : `${optimisticCommentCount} Comments`}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleComments}
              className="text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 py-1 h-7 px-2"
            >
              Hide comments
            </Button>
          </div>

          {/* Loading indicator */}
          {commentsLoading && (
            <div className="flex justify-center py-3">
              <Loader2 size={20} className="animate-spin text-gray-400" />
            </div>
          )}

          {/* Comments list */}
          {!commentsLoading && comments.length > 0 && (
            <div className="space-y-2">
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  {...comment}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!commentsLoading && comments.length === 0 && showComments && (
            <div className="py-2 text-center">
              <p className="text-sm text-gray-500">No comments yet. Be the first to comment!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 