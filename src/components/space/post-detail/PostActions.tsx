import React from 'react';
import { ThumbsUp, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PostActionsProps {
  hasLiked: boolean;
  likeCount: number;
  commentCount: number;
  isLiking?: boolean;
  onLikeToggle: () => void;
  onCommentClick: () => void;
}

/**
 * Component displaying post action buttons (like, comment, share)
 */
export default function PostActions({ 
  hasLiked, 
  likeCount, 
  commentCount, 
  isLiking = false,
  onLikeToggle,
  onCommentClick
}: PostActionsProps) {
  return (
    <div className="flex items-center px-3 py-2 border-t border-gray-200">
      <div className="flex items-center space-x-1">
        <Button 
          variant="ghost"
          onClick={onLikeToggle}
          disabled={isLiking}
          className={cn(
            "flex items-center space-x-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            hasLiked ? "text-blue-600 bg-blue-50 hover:bg-blue-100" : "text-gray-600 hover:bg-gray-100",
            isLiking && "opacity-60 cursor-not-allowed"
          )}
        >
          <ThumbsUp size={18} className={hasLiked ? "fill-current" : ""} />
          <span>{hasLiked ? 'Liked' : 'Like'}</span>
          {likeCount > 0 && <span className="ml-1 text-gray-500">{likeCount}</span>}
        </Button>
        
        <Button 
          variant="ghost"
          className="flex items-center space-x-1.5 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          onClick={onCommentClick}
        >
          <MessageSquare size={18} />
          <span>Comment</span>
          {commentCount > 0 && <span className="ml-1 text-gray-500">{commentCount}</span>}
        </Button>
      </div>
    </div>
  );
} 