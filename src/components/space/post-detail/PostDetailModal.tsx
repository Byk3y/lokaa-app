import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CornerDownRight, Edit, MessageCircle, AlertTriangle, Loader2, MoreHorizontal, Pin, Trash2, X } from 'lucide-react';
import { VideoPlayerModal } from '@/components/VideoPlayerModal';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import CommentItem from '@/components/space/comments/CommentItem';
import type { PostCardProps } from '@/features/posts/types/postCard';
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
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';
import {
  PostContent,
  PostActions,
  MediaGallery,
  CommentInput,
} from './';
import { usePostActionsEnhanced } from './hooks/usePostActionsEnhanced';
import { useCommentsEnhanced } from './hooks/useCommentsEnhanced';
import { useHoverPrefetch } from '@/hooks/useHoverPrefetch';
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
  
  // State for video player
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<{url: string; videoId?: string | null; platform?: string}>({url: ''});
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  
  // State for jump button visibility
  const [showJumpButton, setShowJumpButton] = useState(true);
  
  // State for edit mode
  const [isEditMode, setIsEditMode] = useState(false);
  const isUserAuthor = currentUserId === post?.author?.id;
  
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

  const {
    comments,
    commentsLoading,
    newComment,
    setNewComment,
    isCommenting,
    optimisticCommentCount,
    handleCommentSubmit,
    handleReplyAdded,
    fetchReplies,
    replyingToComment,
    setReplyTarget,
    handleCommentLikeToggled
  } = useCommentsEnhanced(post, currentUserId, onCommentAdded);

  // Update browser history when opening a post
  useEffect(() => {
    // URL updates are now handled by the parent component (FeedTab) via React Router
    // This ensures proper synchronization between URL state and modal state
    // No need for manual history.pushState here
  }, [isOpen, post, location.pathname, space?.subdomain, navigate]);

  // Handle scroll to show/hide jump button
  useEffect(() => {
    const scrollContainer = contentRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100; // 100px threshold
      setShowJumpButton(!isNearBottom);
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
      console.error('Error deleting post:', error);
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
      // Simply call onClose - URL navigation is handled by the parent component
      onClose();
    }
  };

  const isAdmin = post?.isAdmin;
  const canDelete = isUserAuthor || isAdmin;

  return (
    <>
      
      {/* Edit Mode - Use CreatePostModal */}
      {isEditMode && (
        <CreatePostModal
          isOpen={isEditMode}
          onClose={handleEditCancel}
          spaceId={post.spaceId}
          currentUserId={currentUserId || ''}
          spaceName={post.spaceId}
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
        {/* Custom Close Button - Positioned outside modal */}
        {isOpen && !isEditMode && (
          <div className="fixed top-4 right-4 z-[60]">
            <Button
              onClick={() => handleDialogClose(false)}
              variant="ghost"
              size="icon"
              className="rounded-full bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white border border-gray-200 h-10 w-10"
            >
              <X className="h-5 w-5 text-gray-600" />
            </Button>
          </div>
        )}
        
        <DialogContent 
          className="max-w-3xl w-[90vw] p-0 max-h-[85vh] flex flex-col"
          hideCloseButton={true}
          aria-describedby="post-content-description"
        >
          <DialogTitle>
            <VisuallyHidden>
              {post.title || `Post by ${post.author?.name || 'Unknown'}`}
            </VisuallyHidden>
          </DialogTitle>
          <DialogDescription id="post-content-description">
            <VisuallyHidden>
              {post.title ? `Post by ${post.author?.name || 'Unknown'}: ${post.content?.substring(0, 100)}${post.content && post.content.length > 100 ? '...' : ''}` : `Post content: ${post.content?.substring(0, 100)}${post.content && post.content.length > 100 ? '...' : ''}`}
            </VisuallyHidden>
          </DialogDescription>

          {/* Scrollable Content Area */}
          <div 
            ref={contentRef}
            className="flex-1 min-h-0 bg-white overflow-y-auto overflow-x-hidden relative"
          >
            {/* Author Header - now inside scrollable area */}
            <div className="flex items-center justify-between px-6 py-1">
              <div className="flex items-center space-x-3">
                <Link 
                  to={`/profile/${post.author.id}`}
                  onMouseEnter={() => prefetchUser(post.author.id, 100)}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={post.author.avatar} alt={post.author.name} />
                    <AvatarFallback>{getInitial(post.author.name)}</AvatarFallback>
                  </Avatar>
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
              <div className="flex items-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full -mr-2">
                      <MoreHorizontal className="h-5 w-5" />
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
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            {/* Post Content (title & text) */}
            <div className="relative px-6">
              <PostContent 
                post={post} 
                postTitleRef={postTitleActualRef} 
              />
            </div>

            {/* Media Gallery (videos, images, files) */}
            <div className="px-6 my-4">
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
                  videoPlatform,
                  videoId,
                  thumbnailUrl,
                  name: `media-${index}`,
                  fileSize: 0
                };
              }).filter(item => item.url);
              
              // Only log in development mode
              if (process.env.NODE_ENV === 'development') {
                console.log('🖼️ [PostDetailModal] Converted media for MediaGallery:', convertedMedia);
              }
              
              return convertedMedia.length > 0 ? (
                <MediaGallery media={convertedMedia} />
              ) : null;
            })()}
            </div>

            {/* Post Actions (like, comment, share) */}
            <div className="border-t border-gray-200">
            <PostActions
              hasLiked={hasLikedPost}
              likeCount={optimisticLikeCount}
              commentCount={optimisticCommentCount}
              isLiking={isLikingInProgress}
              onLikeToggle={handleLikeAction}
              onCommentClick={handleCommentClick}
            />
            </div>

            {/* Floating Jump to latest comment button */}
            {!commentsLoading && optimisticCommentCount > 2 && showJumpButton && (
              <div className="fixed left-1/2 bottom-8 z-20 -translate-x-1/2">
                <Button
                  variant="outline"
                  onClick={() => contentRef.current?.scrollTo({ top: contentRef.current.scrollHeight, behavior: 'smooth' })}
                  className="bg-white text-gray-700 hover:bg-gray-50 shadow-lg border-gray-300 text-sm font-medium py-2 px-4 rounded-full"
                >
                  <CornerDownRight className="h-4 w-4 mr-2 text-gray-500" />
                  <span>Jump to latest comment</span>
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
                <div className="px-6 pt-4 pb-6 border-t border-gray-200">
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
                      onCommentLikeToggled={handleCommentLikeToggled}
                      // New Skool-style props
                      initial_replies={comment.initial_replies}
                      remaining_reply_count={comment.remaining_reply_count}
                      has_more_replies={comment.has_more_replies}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-gray-500">
                  No comments yet. Be the first to contribute!
                </div>
              )}

              {/* Comment Input */}
              <CommentInput
                value={newComment}
                onChange={setNewComment}
                onSubmit={handleCommentSubmit}
                isSubmitting={isCommenting}
                currentUser={loggedInUser}
                replyingTo={replyingToComment}
                onCancelReply={() => setReplyTarget(null)}
              />
            </div>
              </>
            )}
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
      />
    </>
  );
} 