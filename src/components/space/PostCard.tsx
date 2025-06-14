import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import React, { useCallback, useMemo, memo, useState } from "react";
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import type { PostCardProps } from "@/features/posts/types";
import {
  usePostComments,
  usePostPin,
} from "@/features/posts/hooks";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { extractVideoInfo } from '@/shared/utils/media-utils';
import { CategoryTag } from '@/components/ui/category-tag';
import { usePostDetail } from '@/hooks/usePostDetail';
import { LikeButton, CommentButton } from "@/components/ui/post-icons";

// Optimized media detection helper function
const getFirstMedia = (mediaUrls?: Array<{ url: string; type?: string; fileType?: string }> | null): { url: string; type: 'video' | 'gif' | 'image'; thumbnailUrl?: string } | null => {
  if (!mediaUrls || mediaUrls.length === 0) return null;
  
  for (const media of mediaUrls) {
    // Add null/undefined check for media.url
    if (!media || !media.url || typeof media.url !== 'string') {
      continue;
    }
    
    // Check direct type property first (videos have type: "video")
    if (media.type === 'video') {
      // Extract video info to get thumbnail
      const videoInfo = extractVideoInfo(media.url);
      return { 
        url: media.url, 
        type: 'video',
        thumbnailUrl: videoInfo.thumbnailUrl || undefined
      };
    }
    
    // Check for file types
    if (media.type === 'file' && media.fileType) {
      if (media.fileType === 'image/gif') {
        return { url: media.url, type: 'gif' };
      }
      if (media.fileType.startsWith('image/')) {
        return { url: media.url, type: 'image' };
      }
      if (media.fileType.startsWith('video/')) {
        return { url: media.url, type: 'video' };
      }
    }
    
    // Fallback: check URL patterns - now safe to call toLowerCase()
    const lowercaseUrl = media.url.toLowerCase();
    if (lowercaseUrl.includes('.mp4') || lowercaseUrl.includes('.webm') || lowercaseUrl.includes('.mov')) {
      return { url: media.url, type: 'video' };
    }
    if (lowercaseUrl.includes('.gif')) {
      return { url: media.url, type: 'gif' };
    }
    if (lowercaseUrl.includes('.jpg') || lowercaseUrl.includes('.jpeg') || lowercaseUrl.includes('.png') || lowercaseUrl.includes('.webp')) {
      return { url: media.url, type: 'image' };
    }
  }
  
  return null; // Don't assume if we can't determine the type
};

// Media box component (responsive size)
const PostCardMedia = memo(({ media, contentGifUrl, onClick }: { 
  media: { url: string; type: 'video' | 'gif' | 'image'; thumbnailUrl?: string } | null;
  contentGifUrl?: string;
  onClick: () => void;
}) => {
  // Priority: content_gif_url > detected media
  const displayMedia = contentGifUrl 
    ? { url: contentGifUrl, type: 'gif' as const }
    : media;
    
  if (!displayMedia) {
    return null;
  }

  return (
    <div 
      className="absolute top-1/2 right-4 transform -translate-y-1/2 w-[64px] h-[64px] md:w-[102px] md:h-[102px] rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 cursor-pointer"
      onClick={onClick}
    >
      {displayMedia.type === 'video' ? (
        <div className="relative w-full h-full">
          <img 
            src={displayMedia.thumbnailUrl || displayMedia.url} 
            alt="Video thumbnail"
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              // Fallback to a simple placeholder if thumbnail fails
              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAyIiBoZWlnaHQ9IjEwMiIgdmlld0JveD0iMCAwIDEwMiAxMDIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDIiIGhlaWdodD0iMTAyIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik00MSAzNUw2MSA1MUw0MSA2N1YzNVoiIGZpbGw9IiM2QjdGODAiLz4KPC9zdmc+';
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
              <div className="w-0 h-0 border-l-[8px] border-l-gray-800 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent ml-1"></div>
            </div>
          </div>
        </div>
      ) : (
        <img 
          src={displayMedia.url} 
          alt={displayMedia.type === 'gif' ? 'GIF' : 'Image'}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            // For Giphy URLs, try converting to direct media URL - with stronger type checking
            if (displayMedia?.url && typeof displayMedia.url === 'string' && displayMedia.url.includes('giphy.com/gifs/')) {
              const gifId = displayMedia.url.split('-').pop();
              if (gifId) {
                const directUrl = `https://media.giphy.com/media/${gifId}/giphy.gif`;
                target.src = directUrl;
                return;
              }
            }
            // Fallback to placeholder
            target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAyIiBoZWlnaHQ9IjEwMiIgdmlld0JveD0iMCAwIDEwMiAxMDIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDIiIGhlaWdodD0iMTAyIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik01MSAzNkM0Ni4wMjk0IDM2IDQyIDQwLjAyOTQgNDIgNDVWNjFDNDIgNjUuOTcwNiA0Ni4wMjk0IDcwIDUxIDcwQzU1Ljk3MDYgNzAgNjAgNjUuOTcwNiA2MCA2MVY0NUM2MCA0MC4wMjk0IDU1Ljk3MDYgMzYgNTEgMzZaIiBmaWxsPSIjOUI5QjlCIi8+CjxwYXRoIGQ9Ik00Ny41IDQ3SDU0LjVWNTlINDcuNVY0N1oiIGZpbGw9IndoaXRlIi8+PC9zdmc+';
          }}
        />
      )}
    </div>
  );
});

// Recent commenters avatars
const CommentersAvatars = memo(({ commenters }: { commenters: Array<{ avatar?: string; name?: string }> }) => {
  const maxShow = 3;
  const displayCommenters = commenters.slice(0, maxShow);
  
  if (displayCommenters.length === 0) return null;
  
  return (
    <div className="flex -space-x-1">
      {displayCommenters.map((commenter, index) => (
        <Avatar key={index} className="w-6 h-6 border-2 border-white">
          <AvatarImage src={commenter.avatar} />
          <AvatarFallback className="text-xs bg-gray-200">
            {commenter.name?.[0]?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
      ))}
    </div>
  );
});

// Main PostCard component with fixed dimensions
const PostCard = memo(function PostCard({
  id,
  spaceId,
  currentUserId,
  author,
  title,
  content,
  content_gif_url,
  createdAt,
  editedAt,
  category,
  likes = 0,
  comments = 0,
  className,
  media_urls,
  isPinned = false,
  pinCategory = null,
  isAdmin = false,
  poll_data,
  slug,
  onPostClick,
  onLikeToggled,
  onPinToggled,
}: PostCardProps) {
  const { user: loggedInUser } = useOptimizedAuth();
  const userIdForActions = currentUserId || loggedInUser?.id;
  
  // Use the same enhanced hook as PostDetailModal for consistency
  const { 
    hasLiked,
    likeCount,
    isLiking,
    toggleLike,
  } = usePostDetail(id, userIdForActions, {
    id,
    spaceId,
    currentUserId: userIdForActions,
    author,
    title,
    content,
    content_gif_url,
    createdAt,
    editedAt,
    category,
    likes,
    comments,
    className,
    media_urls,
    isPinned,
    pinCategory,
    isAdmin,
    poll_data,
    slug,
  });
  
  const {
    comments: postComments,
    optimisticCommentCount,
  } = usePostComments({
    postId: id,
    spaceId,
    userId: userIdForActions,
    initialComments: comments,
  });

  // Detect media for display
  const firstMedia = useMemo(() => {
    return getFirstMedia(media_urls);
  }, [media_urls]);
  const hasMedia = !!(firstMedia || content_gif_url);

  // Handle card click
  const handleCardClick = useCallback(() => {
    if (onPostClick) {
      onPostClick({
        id,
        spaceId,
        currentUserId,
        author,
        title,
        content,
        content_gif_url,
        createdAt,
        editedAt,
        category,
        likes: likeCount,
        comments: optimisticCommentCount,
        className,
        media_urls,
        isPinned,
        pinCategory,
        isAdmin,
        poll_data,
        slug,
        onPostClick,
        onLikeToggled,
        onPinToggled,
      });
    }
  }, [onPostClick, id, spaceId, currentUserId, author, title, content, content_gif_url, createdAt, editedAt, category, likeCount, optimisticCommentCount, className, media_urls, isPinned, pinCategory, isAdmin, poll_data, slug, onLikeToggled, onPinToggled]);

  // Handle like click with the unified system
  const handleLikeClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await toggleLike();
      // Notify parent of the like count change if callback provided
      if (onLikeToggled) {
        // Use the optimistic count from the cache
        const newCount = hasLiked ? likeCount - 1 : likeCount + 1;
        onLikeToggled(id, newCount);
      }
    } catch (error) {
      console.error('Error toggling like in PostCard:', error);
    }
  }, [toggleLike, onLikeToggled, id, hasLiked, likeCount]);

  // Format timestamp
  const timeAgo = useMemo(() => {
    try {
      return formatDistanceToNow(new Date(createdAt), { addSuffix: true })
        .replace('about ', '')
        .replace(' ago', '')
        .replace('less than a minute', 'now');
    } catch {
      return 'Unknown';
    }
  }, [createdAt]);

  // Mock recent commenters (you'll need to get this from your comments data)
  const recentCommenters = useMemo(() => {
    // This would come from your actual comments data
    return [];
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        // Fixed height for mobile and desktop
        "relative bg-white border rounded-none sm:rounded-lg cursor-pointer transition-all duration-200",
        // Responsive shadow: strong on mobile, lighter on desktop
        "shadow-lg md:shadow-sm drop-shadow-[0_4px_16px_rgba(0,0,0,0.10)] md:drop-shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-xl md:hover:shadow-md hover:drop-shadow-[0_8px_24px_rgba(0,0,0,0.13)] md:hover:drop-shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:-translate-y-0.5",
        "w-full h-[240px] md:w-[768px] md:h-[220px] flex-shrink-0 flex-grow-0",
        "p-4 flex flex-col justify-between",
        isPinned 
          ? "border-2 border-teal-400" 
          : "border border-gray-200",
        className
      )}
      onClick={handleCardClick}
    >
      {/* Header Section */}
             <div className="flex items-center space-x-3 mb-3">
         <Avatar className="w-10 h-10">
           <AvatarImage src={author?.avatar} />
           <AvatarFallback className="bg-gray-200">
             {author?.name?.[0]?.toUpperCase() || 'U'}
           </AvatarFallback>
         </Avatar>
         
         <div className="flex-1 min-w-0">
           {/* User name on first line */}
           <div className="post-author truncate">
             {author?.name || 'Unknown User'}
           </div>
           {/* Time and category on second line */}
           <div className="flex items-center gap-2 mt-0.5">
             <span className="post-time">{timeAgo}</span>
             {category && (
               <CategoryTag name={category.name} variant="compact" />
             )}
           </div>
        </div>
      </div>

      {/* Content Section */}
      <div className={cn(
        "flex-1 flex flex-col justify-start min-h-0 mb-4",
        hasMedia ? "pr-[78px] md:pr-[118px]" : "pr-0"
      )}>
        {title && (
          <h3 className="post-title mb-2 line-clamp-1 text-lg md:text-2xl font-sans font-extrabold tracking-tight capitalize">
            {title}
          </h3>
        )}
        {content && (
          <p className="post-content line-clamp-3 md:line-clamp-2 text-[1.05rem] md:text-base">
            {content}
          </p>
        )}
      </div>

      {/* Media Box (102×102px, positioned absolutely) */}
      <PostCardMedia 
        media={firstMedia}
        contentGifUrl={content_gif_url}
        onClick={handleCardClick}
      />

      {/* Footer Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          {/* Like Button */}
          <LikeButton
            isLiked={hasLiked}
            count={likeCount}
            onClick={handleLikeClick}
            disabled={isLiking}
          />

          {/* Comment Button */}
          <CommentButton count={optimisticCommentCount} />

          {/* Recent Commenters */}
          {recentCommenters.length > 0 && (
            <CommentersAvatars commenters={recentCommenters} />
          )}
        </div>

        {/* Last Activity */}
        {optimisticCommentCount > 0 && (
          <div className="typography-caption text-blue-600">
            New comment {timeAgo}
          </div>
        )}
      </div>
    </motion.div>
  );
});

PostCard.displayName = 'PostCard';

export default PostCard;
