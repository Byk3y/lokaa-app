import React from 'react';
import { ThumbsUp, MessageSquare, Share, Pin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface PostCardActionsProps {
  isAdmin?: boolean;
  hasLikedPost: boolean;
  optimisticLikeCount: number;
  optimisticCommentCount: number;
  showCounts?: boolean;
  optimisticPinned: boolean;
  isPinning: boolean;
  isLikingInProgress: boolean;
  onLikeClick: () => void;
  onCommentClick: (e: React.MouseEvent) => void;
  onShareClick: (e: React.MouseEvent) => void;
  onPinClick: (e: React.MouseEvent) => void;
}

/**
 * Action buttons component for PostCard
 */
export const PostCardActions: React.FC<PostCardActionsProps> = ({
  isAdmin = false,
  hasLikedPost,
  optimisticLikeCount,
  optimisticCommentCount,
  showCounts = true,
  optimisticPinned,
  isPinning,
  isLikingInProgress,
  onLikeClick,
  onCommentClick,
  onShareClick,
  onPinClick,
}) => {
  // Helper to determine if we should show count numbers
  const showNumbers = showCounts && (optimisticLikeCount > 0 || optimisticCommentCount > 0);
  
  return (
    <div className="px-1 py-0.5 flex items-center justify-between border-t border-gray-100 mt-2">
      <div className="flex items-center space-x-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onLikeClick}
          disabled={isLikingInProgress}
          className={cn(
            "flex items-center h-8 sm:h-11 min-h-[44px] px-2 rounded-md text-sm font-medium",
            hasLikedPost
              ? "text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          )}
        >
          <ThumbsUp size={16} className="mr-1.5" />
          {showNumbers && optimisticLikeCount > 0 && (
            <span className="text-xs text-gray-500 font-normal">
              {optimisticLikeCount}
            </span>
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onCommentClick}
          className="flex items-center h-8 sm:h-11 min-h-[44px] px-2 rounded-md text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        >
          <MessageSquare size={16} className="mr-1.5" />
          {showNumbers && optimisticCommentCount > 0 && (
            <span className="text-xs text-gray-500 font-normal">
              {optimisticCommentCount}
            </span>
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onShareClick}
          className="flex items-center h-8 sm:h-11 min-h-[44px] px-2 rounded-md text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        >
          <Share size={16} className="mr-1.5" />
        </Button>
      </div>

      {isAdmin && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onPinClick}
          disabled={isPinning}
          className={cn(
            "flex items-center h-8 sm:h-11 min-h-[44px] px-2 rounded-md text-sm font-medium",
            optimisticPinned
              ? "text-teal-600 bg-teal-50 hover:bg-teal-100 hover:text-teal-700"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          )}
        >
          <Pin size={16} className={cn(optimisticPinned && "transform rotate-45")} />
        </Button>
      )}
    </div>
  );
}; 