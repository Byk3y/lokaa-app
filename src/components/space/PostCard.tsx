import { MoreVertical, Share, Download, File, FileText, ImageIcon, Link2, PlayCircle } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import React, { useCallback, useMemo, memo } from "react";
import { VideoPlayerModal } from "@/components/VideoPlayerModal";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { Attachment, PostCardProps } from "@/features/posts/types";
import {
  usePostLikes,
  usePostComments,
  usePostPin,
  usePostMedia
} from "@/features/posts/hooks";
import {
  PostCardHeader,
  PostCardContent,
  VideoThumbnail,
  PostCardActions,
  CommentsSection,
  CommentInput
} from "./post-card";
import { formatFileSize } from "@/utils/mediaUtils";
import { Button } from "@/components/ui/button";

// Helper component for file icons - memoized for performance
const FileIcon = memo(({ fileType, attachmentType }: { fileType?: string, attachmentType?: Attachment['type'] }) => {
  const iconMap = {
    link: <Link2 size={16} className="mr-2 text-blue-500 flex-shrink-0" />,
    video: <PlayCircle size={16} className="mr-2 text-red-500 flex-shrink-0" />,
    image: <ImageIcon size={16} className="mr-2 text-purple-500 flex-shrink-0" />,
    pdf: <FileText size={16} className="mr-2 text-orange-500 flex-shrink-0" />,
    default: <File size={16} className="mr-2 text-gray-500 flex-shrink-0" />
  };
  
  if (attachmentType === 'link') return iconMap.link;
  if (attachmentType === 'video') return iconMap.video;
  if (fileType?.startsWith('image/')) return iconMap.image;
  if (fileType === 'application/pdf') return iconMap.pdf;
  
  return iconMap.default;
});

// Memoized option component for poll data
const PollOption = memo(({ text, count, percent }: { text: string, count: number, percent: number }) => (
  <div className="flex flex-col">
    <div className="flex justify-between text-sm">
      <span>{text}</span>
      <span className="text-gray-500">{count} votes</span>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
      <div
        className="bg-teal-600 h-2.5 rounded-full"
        style={{ width: `${percent}%` }}
      ></div>
    </div>
  </div>
));

// Memoized component for image attachment
const ImageAttachment = memo(({ attachment }: { attachment: Attachment }) => (
  <div 
    key={attachment.id} 
    className="relative w-full max-w-[240px] rounded-md overflow-hidden border border-gray-200 shadow-sm"
  >
    <img 
      src={attachment.url} 
      alt={attachment.name || 'Image attachment'} 
      className="w-full h-auto max-h-[220px] object-cover"
    />
  </div>
));

// Memoized component for file attachment
const FileAttachment = memo(({ attachment }: { attachment: Attachment }) => (
  <a 
    href={attachment.url}
    target="_blank"
    rel="noopener noreferrer"
    onClick={(e) => e.stopPropagation()}
    className="flex items-center justify-between w-full px-3 py-2 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
  >
    <div className="flex items-center">
      <FileIcon fileType={attachment.fileType} attachmentType={attachment.type} />
      <div className="truncate">
        <div className="text-sm font-medium text-gray-700 truncate">{attachment.name}</div>
        <div className="text-xs text-gray-500">
          {attachment.fileType?.split('/')[1]?.toUpperCase() || 'File'} • {formatFileSize(attachment.fileSize)}
        </div>
      </div>
    </div>
    <Download size={16} className="text-gray-500" />
  </a>
));

// Memoized component for link attachment
const LinkAttachment = memo(({ attachment }: { attachment: Attachment }) => (
  <a 
    href={attachment.url}
    target="_blank"
    rel="noopener noreferrer"
    onClick={(e) => e.stopPropagation()}
    className="flex items-center justify-between w-full px-3 py-2 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
  >
    <div className="flex items-center">
      <FileIcon attachmentType="link" />
      <div className="truncate">
        <div className="text-sm font-medium text-blue-600 truncate">
          {attachment.name || attachment.url}
        </div>
        <div className="text-xs text-gray-500 truncate">{attachment.url}</div>
      </div>
    </div>
    <MoreVertical size={16} className="text-gray-500" />
  </a>
));

// Main PostCard component - memoized for performance
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
  onPostClick,
  onLikeToggled,
  onPinToggled,
}: PostCardProps) {
  const { user: loggedInUser } = useAuth();
  const userIdForActions = currentUserId || loggedInUser?.id;
  
  // Use custom hooks
  const { 
    hasLikedPost, 
    optimisticLikeCount, 
    isLikingInProgress, 
    handleLikeToggle 
  } = usePostLikes({
    postId: id,
    spaceId,
    userId: userIdForActions,
    initialLikes: likes,
    onLikeToggled
  });
  
  const {
    optimisticPinned,
    isPinning,
    handlePinToggle
  } = usePostPin({
    postId: id,
    initialPinned: isPinned,
    isAdmin,
    userId: userIdForActions,
    categoryName: category?.name || pinCategory,
    onPinToggled
  });
  
  const {
    isVideoModalOpen,
    selectedVideo,
    handleVideoClick,
    setIsVideoModalOpen
  } = usePostMedia();
  
  const {
    comments: postComments,
    commentsLoading,
    newComment,
    setNewComment,
    isCommenting,
    optimisticCommentCount,
    showComments,
    setShowComments,
    replyingToComment,
    handleCommentSubmit,
    handleReplyAdded,
    fetchReplies,
    setReplyTarget,
    handleCommentLikeToggled,
    fetchComments
  } = usePostComments({
    postId: id,
    spaceId,
    userId: userIdForActions,
    initialComments: comments
  });
  
  // Handle card click to open post details modal
  const handleCardClick = useCallback(() => {
    if (onPostClick) {
      onPostClick({
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
        likes: optimisticLikeCount,
        comments: optimisticCommentCount,
        className,
        media_urls,
        isPinned: optimisticPinned,
        pinCategory,
        isAdmin,
        poll_data,
        onPostClick,
        onLikeToggled,
        onPinToggled,
      });
    }
  }, [
    id, spaceId, userIdForActions, author, title, content, content_gif_url,
    createdAt, editedAt, category, optimisticLikeCount, optimisticCommentCount,
    className, media_urls, optimisticPinned, pinCategory, isAdmin, poll_data,
    onPostClick, onLikeToggled, onPinToggled
  ]);
  
  // Handle toggling comments visibility
  const handleToggleComments = useCallback(() => {
    setShowComments(!showComments);
  }, [showComments, setShowComments]);
  
  // Handle comment click
  const handleCommentClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the PostDetailsModal
    handleToggleComments();
  }, [handleToggleComments]);
  
  // Handle share click
  const handleShareClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the PostDetailsModal
    
    // Copy the post URL to clipboard
    const baseUrl = window.location.origin;
    const postUrl = `${baseUrl}/spaces/${spaceId}/posts/${id}`;
    
    navigator.clipboard.writeText(postUrl)
      .then(() => {
        toast({ title: "Link copied to clipboard!", variant: "default" });
      })
      .catch(err => {
        console.error('Could not copy URL: ', err);
        toast({ 
          title: "Could not copy link", 
          description: "Please try again or copy the URL manually.", 
          variant: "destructive" 
        });
      });
  }, [id, spaceId]);
  
  // Handle cancel reply
  const handleCancelReply = useCallback(() => {
    setReplyTarget(null);
    setNewComment("");
  }, [setReplyTarget, setNewComment]);
  
  // Extract primary video attachment if it exists
  const primaryVideoAttachment = useMemo(() => {
    if (!media_urls || media_urls.length === 0) return null;
    return media_urls.find(att => att.type === 'video' || (att.type === 'link' && att.url.includes('youtube.com')));
  }, [media_urls]);

  // Extract first image attachment if it exists and there's no video
  const firstImageAttachment = useMemo(() => {
    if (!media_urls || media_urls.length === 0 || primaryVideoAttachment) return null;
    return media_urls.find(att => 
      (att.type === 'file' && att.fileType?.startsWith('image/'))
    );
  }, [media_urls, primaryVideoAttachment]);

  // Handle view all comments click - directs to post details modal instead of expanding
  const handleViewAllCommentsClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Stop event bubbling
    // Instead of toggling comments, open the details modal
    handleCardClick();
  }, [handleCardClick]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        ease: [0.25, 0.1, 0.25, 1.0],
      }}
      className={cn(
        "relative flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow w-full max-w-full overflow-hidden",
        optimisticPinned ? "ring-1 ring-teal-200" : "",
        className
      )}
      onClick={handleCardClick}
    >
      {/* Header Section */}
      <PostCardHeader
        author={author}
        createdAt={createdAt}
        editedAt={editedAt}
        category={category}
        isPinned={optimisticPinned}
      />
      
      {/* Content Section with Image Preview */}
      <div className="px-2 sm:px-4 flex-grow flex items-start overflow-hidden">
        <div className={cn("flex-grow flex flex-col overflow-hidden", firstImageAttachment ? "mr-2 sm:mr-4" : "")}>
          <PostCardContent
            title={title}
            content={content}
            shouldTruncate={true}
            onReadMoreClick={handleCardClick}
          />
        </div>
        
        {/* Video Thumbnail - Only show this attachment type */}
        {primaryVideoAttachment && (
          <VideoThumbnail
            attachment={primaryVideoAttachment}
            onVideoClick={handleVideoClick}
          />
        )}
        
        {/* Image Preview - Only show if no video and an image exists */}
        {!primaryVideoAttachment && firstImageAttachment && (
          <div 
            className="ml-auto flex-shrink-0 w-[90px] sm:w-[102px] h-[90px] sm:h-[102px] rounded-md overflow-hidden border border-gray-200"
          >
            <img 
              src={firstImageAttachment.url} 
              alt={firstImageAttachment.name || 'Image attachment'} 
              className="w-full h-full object-cover max-w-full rounded-md"
            />
          </div>
        )}
      </div>
      
      {/* Action Bar */}
      <PostCardActions
        isAdmin={isAdmin}
        hasLikedPost={hasLikedPost}
        optimisticLikeCount={optimisticLikeCount}
        optimisticCommentCount={optimisticCommentCount}
        optimisticPinned={optimisticPinned}
        isPinning={isPinning}
        isLikingInProgress={isLikingInProgress}
        onLikeClick={handleLikeToggle}
        onCommentClick={handleCommentClick}
        onShareClick={handleShareClick}
        onPinClick={handlePinToggle}
      />
      
      {/* Comments Section - use handleViewAllCommentsClick instead of onToggleComments */}
      {optimisticCommentCount > 0 && (
        <div className="mt-1 px-3 pb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleViewAllCommentsClick}
            className="text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 py-1 h-7 px-2"
          >
            {optimisticCommentCount === 1
              ? "View 1 comment"
              : `View all ${optimisticCommentCount} comments`}
          </Button>
        </div>
      )}
      
      {/* Video Player Modal */}
      <VideoPlayerModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        videoUrl={selectedVideo.url}
        videoId={selectedVideo.videoId}
        videoPlatform={selectedVideo.platform as 'youtube' | 'vimeo' | 'other' | undefined}
      />
    </motion.div>
  );
});

export default PostCard; 