import React from 'react';
import { HandThumbUpIcon as HandThumbUpIconOutline, ChatBubbleLeftIcon } from "@heroicons/react/24/outline";
import { HandThumbUpIcon as HandThumbUpIconSolid } from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";

interface PostIconProps {
  className?: string;
  strokeWidth?: number;
}

// Like Icon with both states
interface LikeIconProps extends PostIconProps {
  isLiked: boolean;
}

export const LikeIcon: React.FC<LikeIconProps> = ({ isLiked, className, strokeWidth = 2 }) => {
  return isLiked ? (
    <HandThumbUpIconSolid className={cn("w-5 h-5", className)} />
  ) : (
    <HandThumbUpIconOutline className={cn("w-5 h-5", className)} strokeWidth={strokeWidth} />
  );
};

// Comment Icon
export const CommentIcon: React.FC<PostIconProps> = ({ className, strokeWidth = 2 }) => {
  return <ChatBubbleLeftIcon className={cn("w-5 h-5", className)} strokeWidth={strokeWidth} />;
};

// Like Button Component
interface LikeButtonProps {
  isLiked: boolean;
  count: number;
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  className?: string;
  showCount?: boolean;
}

export const LikeButton: React.FC<LikeButtonProps> = ({ 
  isLiked, 
  count, 
  onClick, 
  disabled = false, 
  className,
  showCount = true 
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center space-x-1.5 transition-colors",
        isLiked ? "text-green-600 font-semibold" : "text-gray-500 hover:text-gray-800",
        className
      )}
    >
      <LikeIcon isLiked={isLiked} />
      {showCount && <span className="post-meta font-semibold">{count}</span>}
    </button>
  );
};

// Comment Button Component
interface CommentButtonProps {
  count: number;
  onClick?: () => void;
  className?: string;
  showCount?: boolean;
}

export const CommentButton: React.FC<CommentButtonProps> = ({ 
  count, 
  onClick, 
  className,
  showCount = true 
}) => {
  const Component = onClick ? 'button' : 'div';
  
  return (
    <Component
      {...(onClick && { onClick })}
      className={cn(
        "flex items-center space-x-1.5 text-gray-500",
        onClick && "hover:text-gray-800 transition-colors",
        className
      )}
    >
      <CommentIcon />
      {showCount && <span className="post-meta font-semibold">{count}</span>}
    </Component>
  );
}; 