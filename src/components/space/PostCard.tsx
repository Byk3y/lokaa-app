import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import React, { useCallback, useMemo, memo, useState, useEffect } from "react";
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import type { PostCardProps } from "@/features/posts/types";
import {
  usePostComments,
  usePostPin,
} from "@/features/posts/hooks";
import { useCommentAvatars } from "@/hooks/useCommentAvatars";
import { formatDistanceToNow } from "date-fns";
import { OptimizedAvatar } from "@/components/ui/OptimizedAvatar";
import { Badge } from "@/components/ui/badge";
import { extractVideoInfo } from '@/shared/utils/media-utils';
import { CategoryTag } from '@/components/ui/category-tag';
import { usePostDetail } from '@/hooks/usePostDetail';
import { usePostLikes } from "@/features/posts/hooks/usePostLikes";
import { LikeButton, CommentButton } from "@/components/ui/post-icons";
import { devLogger } from '../../utils/developmentLogger';
import { getSimpleCommentInfo } from '@/utils/commentUtils';
import { shouldEnableMobileFeatures } from '@/utils/mobileDetection';

// Optimized media detection helper function
const getFirstMedia = (mediaUrls?: Array<{ url: string; type?: string; fileType?: string; videoPlatform?: string; videoId?: string | null; thumbnailUrl?: string | null; directUrl?: string }> | null): { url: string; type: 'video' | 'gif' | 'image'; thumbnailUrl?: string } | null => {
  if (!mediaUrls || mediaUrls.length === 0) {
    return null;
  }
  
  for (const media of mediaUrls) {
    // Add null/undefined check for media.url
    if (!media || !media.url || typeof media.url !== 'string') {
      continue;
    }
    
    // Check direct type property first (videos have type: "video")
    if (media.type === 'video') {
      // Use provided thumbnail URL if available, otherwise extract from URL
      let thumbnailUrl = media.thumbnailUrl;
      if (!thumbnailUrl) {
        const videoInfo = extractVideoInfo(media.url);
        thumbnailUrl = videoInfo.thumbnailUrl || undefined;
      }
      
      const result = { 
        url: media.url, 
        type: 'video' as const,
        thumbnailUrl
      };
      return result;
    }
    
    // Check for file types
    if (media.type === 'file' && media.fileType) {
      if (media.fileType === 'image/gif') {
        const result = { 
          url: media.directUrl || media.url, // Use directUrl if available (for Giphy)
          type: 'gif' as const 
        };
        return result;
      }
      if (media.fileType.startsWith('image/')) {
        const result = { url: media.url, type: 'image' as const };
        return result;
      }
      if (media.fileType.startsWith('video/')) {
        const result = { url: media.url, type: 'video' as const };
        return result;
      }
    }
    
    // Fallback: check URL patterns - now safe to call toLowerCase()
    const lowercaseUrl = media.url.toLowerCase();
    if (lowercaseUrl.includes('.mp4') || lowercaseUrl.includes('.webm') || lowercaseUrl.includes('.mov')) {
      const result = { url: media.url, type: 'video' as const };
      return result;
    }
    if (lowercaseUrl.includes('.gif')) {
      const result = { url: media.url, type: 'gif' as const };
      return result;
    }
    if (lowercaseUrl.includes('.jpg') || lowercaseUrl.includes('.jpeg') || lowercaseUrl.includes('.png') || lowercaseUrl.includes('.webp')) {
      const result = { url: media.url, type: 'image' as const };
      return result;
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
              console.log('🎬 [PostCardMedia] Video thumbnail failed to load:', displayMedia.thumbnailUrl || displayMedia.url);
              // Fallback to a simple placeholder if thumbnail fails
              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAyIiBoZWlnaHQ9IjEwMiIgdmlld0JveD0iMCAwIDEwMiAxMDIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDIiIGhlaWdodD0iMTAyIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik00MSAzNUw2MSA1MUw0MSA2N1YzNVoiIGZpbGw9IiM2QjdGODAiLz4KPC9zdmc+';
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="px-4 py-2 md:px-5 md:py-3 bg-black/75 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-xl hover:bg-black/85 transition-all duration-200">
              <div className="w-0 h-0 border-l-[10px] md:border-l-[12px] border-l-white border-t-[7px] md:border-t-[8px] border-t-transparent border-b-[7px] md:border-b-[8px] border-b-transparent ml-1"></div>
            </div>
          </div>
        </div>
      ) : displayMedia.type === 'gif' ? (
        <img 
          src={displayMedia.url} 
          alt="GIF"
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAyIiBoZWlnaHQ9IjEwMiIgdmlld0JveD0iMCAwIDEwMiAxMDIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDIiIGhlaWdodD0iMTAyIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik00MSAzNUw2MSA1MUw0MSA2N1YzNVoiIGZpbGw9IiM2QjdGODAiLz4KPC9zdmc+';
          }}
        />
      ) : (
        <img 
          src={displayMedia.url} 
          alt="Image"
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAyIiBoZWlnaHQ9IjEwMiIgdmlld0JveD0iMCAwIDEwMiAxMDIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDIiIGhlaWdodD0iMTAyIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik00MSAzNUw2MSA1MUw0MSA2N1YzNVoiIGZpbGw9IiM2QjdGODAiLz4KPC9zdmc+';
          }}
        />
      )}
    </div>
  );
});

// Recent commenters avatars
const CommentersAvatars = memo(({ commenters }: { commenters: Array<{ avatar?: string; name?: string; id?: string }> }) => {
  const maxShow = 5;
  const displayCommenters = commenters.slice(0, maxShow);
  
  if (displayCommenters.length === 0) return null;
  
  return (
    <div className="flex -space-x-1.5 ml-6">
      {displayCommenters.map((commenter, index) => (
        <OptimizedAvatar 
          key={commenter.id || index} 
          user={{
            id: commenter.id || `commenter-${index}`,
            full_name: commenter.name || 'User',
            avatar_url: commenter.avatar || null
          }}
          size="sm"
          enableLazyLoading={true}
          enableCaching={true}
          placeholderType="initials"
          loadingTransition="fade"
          className="w-8 h-8 border-2 border-white rounded-full ring-1 ring-gray-200"
        />
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
  onCommentAdded, // 🔥 NEW: Add comment callback prop
}: PostCardProps) {
  const { user: loggedInUser } = useOptimizedAuth();
  const userIdForActions = currentUserId || loggedInUser?.id;
  
  // 🚀 REAL-TIME LIKES: Use the enhanced real-time likes hook instead of usePostDetail
  const {
    hasLikedPost,
    optimisticLikeCount,
    isLikingInProgress,
    handleLikeToggle,
    realtimeConnected,
  } = usePostLikes({
    postId: id,
    spaceId,
    userId: userIdForActions,
    initialLikes: likes,
    onLikeToggled: (postId, newLikeCount) => {
      console.log('🔔 [PostCard] Like toggled via real-time:', { postId, newLikeCount });
      if (onLikeToggled) {
        onLikeToggled(postId, newLikeCount);
      }
    },
  });
  
  // 🎭 OPTIMIZED: Use lightweight avatar-only hook for commenter avatars
  const { commenters: recentCommenters } = useCommentAvatars(
    comments > 0 ? id : undefined, // Only fetch if there are comments
    5 // Max 5 commenters
  );

  // Keep optimistic comment count for display
  const optimisticCommentCount = comments;

  // Detect media for display
  const firstMedia = useMemo(() => {
    const result = getFirstMedia(media_urls);
    
    // Only warn if we have URLs that look like media but failed to process
    if (media_urls && media_urls.length > 0 && !result) {
      const hasActualMediaUrls = media_urls.some(media => {
        if (!media?.url || typeof media.url !== 'string') return false;
        const url = media.url.toLowerCase();
        // Check if it looks like media (not documents, text files, etc.)
        return url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || 
               url.includes('.gif') || url.includes('.webp') || url.includes('.mp4') || 
               url.includes('.webm') || url.includes('.mov') || url.includes('youtube') || 
               url.includes('vimeo') || url.includes('giphy') || media.type === 'video' ||
               (media.fileType && (media.fileType.startsWith('image/') || media.fileType.startsWith('video/')));
      });
      
      // Only warn for actual media detection failures, not document files
      if (hasActualMediaUrls) {
        devLogger.warn('MediaDetection', `Media detection failed for post: ${title || id}`, {
          media_urls_count: media_urls.length,
          first_url: media_urls[0]?.url,
          detected_media: result
        });
      }
    }
    
    return result;
  }, [media_urls, id, title]);
  const hasMedia = !!(firstMedia || content_gif_url);

  // 🎭 OPTIMIZED: recentCommenters now comes from useCommentAvatars hook

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
        likes: optimisticLikeCount,
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
  }, [onPostClick, id, spaceId, currentUserId, author, title, content, content_gif_url, createdAt, editedAt, category, optimisticLikeCount, optimisticCommentCount, className, media_urls, isPinned, pinCategory, isAdmin, poll_data, slug, onLikeToggled, onPinToggled]);

  // Handle like click with the real-time system
  const handleLikeClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await handleLikeToggle();
      // The onLikeToggled callback is already handled within usePostLikes hook
    } catch (error) {
      console.error('Error toggling like in PostCard:', error);
    }
  }, [handleLikeToggle]);

  // Get simple comment info based on session-aware time logic
  const commentDisplayInfo = useMemo(() => {
    // You could make spaceActivity dynamic based on space data in the future
    const spaceActivity: 'high' | 'medium' | 'low' = 'medium';
    // 🎭 OPTIMIZED: Comment display info disabled for now since we're using lightweight avatars
    return null; // Will be re-enabled when we consolidate comment hooks
  }, [userIdForActions]);

  // Format timestamp for post creation
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

  // Mobile detection
  const isMobile = shouldEnableMobileFeatures();

  return (
    <div
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
         {/* Show avatar on both mobile and desktop */}
         <OptimizedAvatar
           user={{
             id: author?.id || 'unknown',
             full_name: author?.name || 'Unknown User',
             avatar_url: author?.avatar || null
           }}
           size="lg"
           enableLazyLoading={true}
           enableCaching={true}
           placeholderType="initials"
           loadingTransition="fade"
           className="w-10 h-10"
         />
         
         <div className="flex-1 min-w-0">
           {/* User name on first line */}
           <div className="post-author font-bold text-base truncate">
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
          <h3 className="post-title mb-2 line-clamp-1 text-[17px] md:text-[22px] font-sans font-extrabold tracking-tight capitalize">
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
            isLiked={hasLikedPost}
            count={optimisticLikeCount}
            onClick={handleLikeClick}
            disabled={isLikingInProgress}
          />

          {/* Comment Button with Recent Commenters */}
          <div className="flex items-center">
            <CommentButton count={optimisticCommentCount} />
            {/* Recent Commenters - desktop only using responsive classes */}
            {recentCommenters.length > 0 && (
              <div className="hidden sm:block">
                <CommentersAvatars commenters={recentCommenters} />
              </div>
            )}
          </div>
        </div>

        {/* Last Activity - Shows "New comment" or "Last comment" based on seen status */}
        {commentDisplayInfo && (
          <div className="typography-caption text-blue-600">
            {commentDisplayInfo.displayText} {commentDisplayInfo.timeText}
          </div>
        )}
      </div>
    </div>
  );
});

PostCard.displayName = 'PostCard';

export default PostCard;
