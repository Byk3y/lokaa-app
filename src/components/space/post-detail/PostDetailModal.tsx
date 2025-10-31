import { log } from '@/utils/logger';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CornerDownRight, Edit, MessageCircle, AlertTriangle, Loader2, MoreHorizontal, Pin, Trash2, X, ArrowLeft, ChevronDown } from 'lucide-react';
import { VideoPlayerModal } from '@/components/VideoPlayerModal';
import BottomNav from '@/components/mobile/BottomNav';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import CommentItem from '@/components/space/comments/CommentItem';
import type { PostCardProps } from '@/features/posts/types/postCard';
import type { Attachment } from '@/features/posts/types';
import { CreatePostModal } from '@/features/posts';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from '@/hooks/use-toast';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { getPostUrl } from '@/utils/slugUtils';
import useSpaceSettingsStore from '@/hooks/useSpaceSettingsStore';
import { OptimizedAvatar } from '@/components/ui/OptimizedAvatar';
import { Link } from 'react-router-dom';
import {
  PostContent,
  PostActions,
  MediaGallery,
  CommentInput,
} from './';
import { usePostActionsEnhanced } from './hooks/usePostActionsEnhanced';
// 🎭 PHASE 1 OPTIMIZATION: Temporarily disabled to reduce triple hook usage
// import { useCommentsEnhanced } from './hooks/useCommentsEnhanced';
import { useComments } from './hooks/useComments';
import { useHoverPrefetch } from '@/hooks/useHoverPrefetch';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from 'date-fns';
import { getInitial } from '@/shared/utils/avatar-utils';
import { CategoryTag } from '@/components/ui/category-tag';
import { resolveImageUrl } from '@/utils/preloadAssets';
import { toTitleCase } from '@/utils/textFormatting';

interface PostDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: PostCardProps;
  onCommentAdded?: (postId: string, newCommentCount: number) => void;
  onPinToggled?: (postId: string, isPinned: boolean, category?: string | null) => void;
  onPostUpdated?: (updatedPost: PostCardProps) => void;
  onPostDeleted?: (postId: string) => void;
  onLikeToggled?: (postId: string, newLikeCount: number) => void;
}

/**
 * Modal component for displaying post details
 */
export default function PostDetailModal({ 
  isOpen, 
  onClose, 
  post,
  onCommentAdded,
  onPinToggled,
  onPostUpdated,
  onPostDeleted,
  onLikeToggled
}: PostDetailModalProps) {
  // Auth context for current user
  const { user: loggedInUser } = useOptimizedAuth();
  const currentUserId = loggedInUser?.id;
  const navigate = useNavigate();
  const location = useLocation();
  const { space } = useSpaceSettingsStore();
  const isMobile = useMediaQuery("(max-width: 640px)");
  
  // State for video player
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<{url: string; videoId?: string | null; platform?: string}>({url: ''});
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  
  // State for jump button visibility
  const [showJumpButton, setShowJumpButton] = useState(true);
  
  // State for header title transition on mobile
  const [showPostTitle, setShowPostTitle] = useState(false);
  
  // State for edit mode
  const [isEditMode, setIsEditMode] = useState(false);
  const isUserAuthor = currentUserId === post?.author?.id;
  const [spaceIconFailed, setSpaceIconFailed] = useState(false);
  
  // State for delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const contentRef = useRef<HTMLDivElement>(null);
  const postTitleActualRef = useRef<HTMLHeadingElement>(null);
  
  // Hover prefetching for performance
  const { prefetchComments, prefetchUser } = useHoverPrefetch();
  
  // Enhanced hooks with caching
  const {
    hasLikedPost,
    optimisticLikeCount,
    isLikingInProgress,
    handleLikeToggle,
    optimisticPinned,
    isPinning,
    handlePinToggle
  } = usePostActionsEnhanced(post, currentUserId);

  // 🎭 PHASE 1 OPTIMIZATION: Use single comment hook to reduce triple fetching
  const {
    comments,
    commentsLoading,
    newComment,
    setNewComment,
    isCommenting,
    optimisticCommentCount,
    replyingToComment,
    setReplyTarget,
    handleCommentSubmit,
    handleReplyAdded,
    fetchComments,
    fetchReplies,
  } = useComments(post, currentUserId, onCommentAdded);

  // 🎭 PHASE 1 OPTIMIZATION: Pagination temporarily disabled
  const loadMoreComments = async () => { /* TODO: Re-implement in Phase 2 */ };
  const hasMoreComments = false;
  const isLoadingMoreComments = false;

  // Update browser history when opening a post
  useEffect(() => {
    // URL updates are now handled by the parent component (FeedTab) via React Router
    // This ensures proper synchronization between URL state and modal state
    // No need for manual history.pushState here
  }, [isOpen, post, location.pathname, space?.subdomain, navigate]);

  // Handle scroll to show/hide jump button and header title transition
  useEffect(() => {
    const scrollContainer = contentRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100; // 100px threshold
      setShowJumpButton(!isNearBottom);
      
      // Header title transition on mobile - show post title after scrolling 80px
      const shouldShowPostTitle = scrollTop > 80;
      setShowPostTitle(shouldShowPostTitle);
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    // Check initial position
    handleScroll();

    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [isOpen, commentsLoading]); // Re-run when comments load

  // Handle video click to open video modal
  const handleVideoClick = (video: {url: string; videoId?: string | null; platform?: string}) => {
    setSelectedVideo(video);
    setIsVideoModalOpen(true);
  };

  // Handle like action (with optimistic update)
  const handleLikeAction = async () => {
    const newLikeCount = await handleLikeToggle();
    if (onLikeToggled && typeof newLikeCount === 'number') {
      onLikeToggled(post.id, newLikeCount);
    }
  };

  // Handle pin action
  const handlePinAction = async () => {
    // Instead of relying on the return value, pass a callback directly to handlePinToggle
    // that will be called after the pin operation completes
    await handlePinToggle(() => {
      if (onPinToggled) {
        onPinToggled(post.id, !optimisticPinned, post.category?.name || null);
      }
    });
  };

  // Handle edit click
  const handleEditClick = () => {
    setIsEditMode(true);
  };

  // Handle comment click (scroll to comment input)
  const handleCommentClick = () => {
    contentRef.current?.scrollTo({ top: contentRef.current.scrollHeight, behavior: 'smooth' });
  };

  // Handle edit cancel
  const handleEditCancel = () => {
    setIsEditMode(false);
  };

  // Handle edit success
  const handleEditSuccess = (updatedPost: PostCardProps) => {
    setIsEditMode(false);
    if (onPostUpdated) {
      onPostUpdated(updatedPost);
    }
  };

  // Handle delete click
  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  // Handle delete confirmation
  const handleConfirmDelete = async () => {
    if (!post) return;
    
    setIsDeleting(true);
    
    try {
      // Delete the post
      const { error } = await getSupabaseClient()
        .from('posts')
        .delete()
        .eq('id', post.id);
        
      if (error) throw error;
      
      // Close the delete confirmation
      setShowDeleteConfirm(false);
      
      // Call the onPostDeleted callback if provided
      if (onPostDeleted) {
        onPostDeleted(post.id);
      }
      
      // Close the modal
      onClose();
      
      toast({
        title: "Post deleted",
        description: "Your post has been deleted successfully.",
      });
    } catch (error) {
      log.error('Component', 'Error deleting post:', error);
      toast({
        title: "Error",
        description: "Failed to delete post. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle dialog close (avoid page reloads)
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      // 🔧 ENHANCED: Add delay to ensure comment count updates are processed
      // This prevents cache invalidation from happening before database triggers complete
      setTimeout(() => {
        onClose();
      }, 100); // Small delay to allow any pending updates to complete
    }
  };

  const isAdmin = post?.isAdmin;
  const canDelete = isUserAuthor || isAdmin;

  // Always-available actions
  const handleCopyLink = async () => {
    try {
      const url = getPostUrl({ slug: post.slug, id: post.id }, { subdomain: space?.subdomain });
      const full = `${window.location.origin}${url}`;
      await navigator.clipboard.writeText(full);
      toast({ title: 'Link copied', description: 'Post link copied to clipboard.' });
    } catch {
      toast({ title: 'Unable to copy', description: 'Could not copy link.', variant: 'destructive' });
    }
  };

  const handleOpenInNewTab = () => {
    const url = getPostUrl({ slug: post.slug, id: post.id }, { subdomain: space?.subdomain });
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      
      {/* Edit Mode - Use CreatePostModal */}
      {isEditMode && (
        <CreatePostModal
          isOpen={isEditMode}
          onClose={handleEditCancel}
          spaceId={post.spaceId}
          currentUserId={currentUserId || ''}
          spaceName={space?.name || 'Space'}
          userName={post.author?.name || ''}
          userAvatarUrl={loggedInUser?.user_metadata?.avatar_url}
          editMode={true}
          post={post}
          onPostUpdated={handleEditSuccess}
        />
      )}
      
      {/* Delete Confirmation Modal */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              Delete Post
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be undone and all comments will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? "Deleting..." : "Delete Post"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* View Mode - Show Dialog */}
      <Dialog open={isOpen && !isEditMode} onOpenChange={handleDialogClose}>

        
        <DialogContent 
          className={cn(
            /* Mobile: True fullscreen - no centering, no padding, no gaps, no borders */
            "max-w-full rounded-none",
            /* Mobile: Use viewport units and inset-0 for true fullscreen */
            "w-screen h-screen inset-0",
            "translate-x-0 translate-y-0",
            "p-0 m-0 gap-0 border-0",
            /* Override default grid to flex on mobile */
            "flex flex-col",
            /* Desktop: Centered modal with constraints - reset inset on desktop */  
            "md:left-[50%] md:top-[50%] md:right-auto md:bottom-auto md:translate-x-[-50%] md:translate-y-[-50%]",
            "md:max-w-3xl md:w-[90vw] md:h-auto md:max-h-[95vh] md:min-h-[400px] md:rounded-lg",
            "md:border md:gap-4",
            /* Smooth height transitions */
            "transition-all duration-300 ease-in-out",
            /* Custom class for targeting */
            "post-detail-modal-fullscreen"
          )}
          style={{
            /* Force full screen on mobile with inline styles - use inset-0 for all sides */
            ...(isMobile ? {
              left: 0,
              top: 0,
              right: 0,
              bottom: 0,
              transform: 'none',
              width: '100vw',
              height: '100vh',
              maxWidth: '100vw',
              maxHeight: '100vh',
              margin: 0,
              padding: 0,
              gap: 0,
              border: 'none',
            } : {}),
          }}
          hideCloseButton={true}
        >
          {/* Hidden accessibility elements - positioned absolutely to not take layout space */}
          <DialogTitle className="sr-only absolute">
            {post.title || `Post by ${post.author?.name || 'Unknown'}`}
          </DialogTitle>
          <DialogDescription className="sr-only absolute">
            {post.title ? `Post by ${post.author?.name || 'Unknown'}: ${post.content?.substring(0, 100)}${post.content && post.content.length > 100 ? '...' : ''}` : `Post content: ${post.content?.substring(0, 100)}${post.content && post.content.length > 100 ? '...' : ''}`}
          </DialogDescription>

          {/* Content Area - Dynamic height on desktop, scrollable on mobile */}
          <div 
            ref={contentRef}
            className={cn(
              /* Mobile: Full width scrollable container - small padding for readability */
              "flex-1 bg-white overflow-y-auto overflow-x-hidden relative w-full",
              "px-3 pb-32",
              /* Desktop: Natural height expansion with scroll fallback */
              "md:flex-none md:max-h-[calc(95vh-120px)] md:overflow-y-auto md:pb-0 md:px-3",
              /* Apply dynamic height CSS class */
              "post-detail-modal-content"
            )}
          >
            {/* Header Bar - Skool style */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 flex-shrink-0">
              <div className={cn(
                "flex items-center py-2 h-12",
                "px-0 sm:px-3" // Header inherits padding from parent
              )}>
                {/* Back Button */}
                <Button
                  onClick={() => handleDialogClose(false)}
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:bg-gray-100 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 flex-shrink-0"
                >
                  <ArrowLeft className="h-4 w-4 text-gray-700 stroke-[2.5]" />
                </Button>
                
                {/* Space Info / Post Title - takes up remaining space */}
                <div className={cn(
                  "flex items-center space-x-2 flex-1 min-w-0",
                  "mx-2" // Small margin for spacing between icon and text
                )}>
                  {/* Icon stays visible always */}
                  <div className="h-7 w-7 rounded-lg bg-gray-900 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {space?.icon_image && !spaceIconFailed ? (
                      <img 
                        src={resolveImageUrl(space.icon_image)} 
                        alt={`${space?.name || 'Space'} icon`}
                        className="w-full h-full object-cover"
                        onError={() => setSpaceIconFailed(true)}
                      />
                    ) : (
                      <span className="text-white text-xs font-bold">
                        {space?.name ? space.name.charAt(0).toUpperCase() : 'S'}
                      </span>
                    )}
                  </div>
                  
                  {/* Animated text transition - uses all available space */}
                  <div className="relative overflow-hidden flex-1 min-w-0">
                    <span 
                      className={`font-semibold text-gray-900 text-sm transition-transform duration-300 ease-in-out block whitespace-nowrap overflow-hidden ${
                        showPostTitle ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'
                      }`}
                    >
                      {space?.name || 'Space'}
                    </span>
                    <span 
                      className={`font-semibold text-gray-900 text-sm transition-transform duration-300 ease-in-out absolute top-0 left-0 right-0 whitespace-nowrap overflow-hidden ${
                        showPostTitle ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
                      }`}
                    >
                      {toTitleCase(post.title) || post.content?.substring(0, 100) + '...' || 'Post'}
                    </span>
                  </div>
                </div>
                
                {/* Menu Button */}
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
                      <MoreHorizontal className="h-4 w-4 text-gray-700" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {(isAdmin || isUserAuthor) && (
                      <DropdownMenuItem onSelect={handlePinAction}>
                        <Pin className="mr-2 h-4 w-4" />
                        <span>{optimisticPinned ? 'Unpin Post' : 'Pin Post'}</span>
                      </DropdownMenuItem>
                    )}
                    {isUserAuthor && (
                      <DropdownMenuItem onSelect={handleEditClick}>
                        <Edit className="mr-2 h-4 w-4" />
                        <span>Edit Post</span>
                      </DropdownMenuItem>
                    )}
                    {canDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={handleDeleteClick} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Delete Post</span>
                        </DropdownMenuItem>
                      </>
                    )}
                    {/* Always-visible utilities */}
                    {(isAdmin || isUserAuthor) && <DropdownMenuSeparator />}
                    <DropdownMenuItem onSelect={handleCopyLink}>
                      <CornerDownRight className="mr-2 h-4 w-4 rotate-180" />
                      <span>Copy post link</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={handleOpenInNewTab}>
                      <CornerDownRight className="mr-2 h-4 w-4" />
                      <span>Open in new tab</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Post Author Info */}
            <div className="flex items-center space-x-3 py-2">
              <Link 
                to={`/profile/${post.author.id}`}
                onMouseEnter={() => prefetchUser(post.author.id, 100)}
              >
                <OptimizedAvatar
                  user={{
                    id: post.author.id,
                    full_name: post.author.name,
                    avatar_url: post.author.avatar
                  }}
                  size="lg"
                  enableLazyLoading={false}
                  enableCaching={true}
                  placeholderType="initials"
                  loadingTransition="fade"
                  className="h-10 w-10 rounded-full"
                />
              </Link>
              <div>
                <Link 
                  to={`/profile/${post.author.id}`} 
                  className="font-semibold text-gray-900 hover:underline"
                  onMouseEnter={() => prefetchUser(post.author.id, 100)}
                >
                  {post.author.name}
                </Link>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-gray-500">
                    {post.createdAt ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true }) : ''}
                  </span>
                  {post.editedAt && <span className="text-xs text-gray-500">(edited)</span>}
                  {post.category?.name && (
                    <CategoryTag name={post.category.name} variant="compact" />
                  )}
                </div>
              </div>
            </div>
            {/* Post Content (title & text) */}
            <div className="relative">
              <PostContent 
                post={post} 
                postTitleRef={postTitleActualRef} 
              />
            </div>

            {/* Media Gallery (videos, images, files) */}
            <div className="my-3">
            {(() => {
              // Ensure media_urls are in the correct Attachment[] format
              const convertedMedia: Attachment[] = (post.media_urls || []).map((mediaItem: any, index: number) => {
                // Handle different formats
                let url = '';
                let type: 'file' | 'link' | 'video' = 'file';
                let fileType = '';
                let videoPlatform = '';
                let videoId = '';
                let thumbnailUrl = '';
                
                if (typeof mediaItem === 'string') {
                  url = mediaItem;
                } else if (mediaItem && typeof mediaItem === 'object') {
                  url = mediaItem.directUrl || mediaItem.url || ''; // Use directUrl if available (for Giphy)
                  type = mediaItem.type || 'file';
                  fileType = mediaItem.fileType || '';
                  videoPlatform = mediaItem.videoPlatform || '';
                  videoId = mediaItem.videoId || '';
                  thumbnailUrl = mediaItem.thumbnailUrl || '';
                }
                
                return {
                  id: `${post.id}-${index}`,
                  url,
                  type,
                  fileType,
                  videoPlatform: videoPlatform as 'youtube' | 'vimeo' | 'other',
                  videoId,
                  thumbnailUrl,
                  name: `media-${index}`,
                  fileSize: 0
                };
              }).filter(item => item.url);
              
              // Only log in development mode
              if (process.env.NODE_ENV === 'development') {
                log.debug('Component', '🖼️ [PostDetailModal] Converted media for MediaGallery:', convertedMedia);
              }
              
              return convertedMedia.length > 0 ? (
                <MediaGallery 
                  media={convertedMedia}
                  currentVideoIndex={currentVideoIndex}
                  setCurrentVideoIndex={setCurrentVideoIndex}
                  onVideoClick={handleVideoClick}
                />
              ) : null;
            })()}
            </div>

            {/* Post Actions (like, comment) */}
            <PostActions
              hasLiked={hasLikedPost}
              likeCount={optimisticLikeCount}
              commentCount={optimisticCommentCount}
              isLiking={isLikingInProgress}
              onLikeToggle={handleLikeAction}
              onCommentClick={handleCommentClick}
            />

            {/* Floating Jump to latest comment button */}
            {!commentsLoading && optimisticCommentCount > 2 && showJumpButton && (
              <div className="fixed left-1/2 bottom-36 sm:bottom-8 z-30 -translate-x-1/2">
                <Button
                  onClick={() => contentRef.current?.scrollTo({ top: contentRef.current.scrollHeight, behavior: 'smooth' })}
                  className="bg-black text-white hover:bg-gray-800 shadow-lg text-sm font-medium py-2 px-3 rounded-full border-none flex items-center gap-1"
                >
                  <span>Latest comment</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Comments Loading State */}
              {commentsLoading ? (
              <div className="flex items-center justify-center py-8 border-t border-gray-200">
                <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                </div>
            ) : (
              <>
                {/* Comments Section */}
                <div className="pt-3 pb-4 border-t border-gray-200">
                  {comments.length > 0 ? (
                <div className="space-y-5">
                  {comments.map(comment => (
                    <CommentItem 
                      key={comment.id}
                      id={comment.id}
                      content={comment.content}
                      created_at={comment.created_at}
                      author={comment.author}
                      post_id={comment.post_id}
                      space_id={comment.space_id}
                      reply_count={comment.reply_count}
                      like_count={comment.like_count}
                      isLiked={comment.isLiked}
                      currentUserId={currentUserId}
                      onReplyAddedToParent={handleReplyAdded}
                      fetchRepliesHook={fetchReplies}
                      onSetReplyTarget={setReplyTarget}
                      // 🔥 FIX: Pass Skool-style fields for reply display
                      initial_replies={comment.initial_replies}
                      remaining_reply_count={comment.remaining_reply_count}
                      has_more_replies={comment.has_more_replies}
                      onCommentLikeToggled={(commentId, isLiked, likeCount) => {
                          // 🎭 PHASE 1 OPTIMIZATION: Comment like handling temporarily disabled
                          log.debug('Component', 'Comment like toggled:', { commentId, isLiked, likeCount });
                        }}
                    />
                  ))}
                  
                  {/* 🔥 LOAD MORE COMMENTS BUTTON */}
                  {hasMoreComments && (
                    <div className="flex justify-center py-4">
                      <Button
                        variant="outline"
                        onClick={loadMoreComments}
                        disabled={isLoadingMoreComments}
                        className="text-sm text-gray-600 hover:text-gray-800 border-gray-300 hover:border-gray-400"
                      >
                        {isLoadingMoreComments ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Loading more comments...
                          </>
                        ) : (
                          `Load more comments`
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-6 text-center text-gray-500">
                  No comments yet. Be the first to contribute!
                </div>
              )}

              {/* Desktop Comment Input */}
              <div className="hidden sm:block pt-4 border-t border-gray-100">
                <CommentInput
                  value={newComment}
                  onChange={setNewComment}
                  onSubmit={handleCommentSubmit}
                  isSubmitting={isCommenting}
                  currentUser={loggedInUser}
                  replyingTo={replyingToComment}
                  onCancelReply={() => setReplyTarget(null)}
                  showAvatar={true}
                />
              </div>

            </div>
              </>
            )}
            </div>

          {/* Mobile Comment Input - Fixed above bottom nav */}
          <div className={cn(
            "block sm:hidden fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 py-3 z-40",
            "px-3" // Small padding for readability
          )}>
            <CommentInput
              value={newComment}
              onChange={setNewComment}
              onSubmit={handleCommentSubmit}
              isSubmitting={isCommenting}
              currentUser={loggedInUser}
              replyingTo={replyingToComment}
              onCancelReply={() => setReplyTarget(null)}
              showAvatar={false}
            />
          </div>

          {/* Bottom Navigation - Mobile Only (Inside Modal) */}
          <div className="block sm:hidden">
            <BottomNav />
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Player Modal */}
      <VideoPlayerModal 
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        videoUrl={selectedVideo.url}
        videoId={selectedVideo.videoId}
        videoPlatform={selectedVideo.platform as 'youtube' | 'vimeo' | 'other' | undefined}
        title={post.title}
      />
    </>
  );
} 