import { MoreVertical, ThumbsUp, MessageSquare, Share, ChevronDown, ChevronUp, Link2, FileText, File, Image as ImageIcon, Download, PlayCircle, Tag, Send, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useEffect, useState, useCallback } from "react";
import type { Attachment } from "@/features/posts/components/CreatePostModal";
import { VideoPlayerModal } from "@/components/VideoPlayerModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import CommentItem, { type CommentAuthor, type CommentItemProps as FetchedComment } from './comments/CommentItem';
import { useAuth } from "@/contexts/AuthContext";

// Helper to get a more specific icon based on file type
const getFileIcon = (fileType?: string, attachmentType?: Attachment['type']) => {
  if (attachmentType === 'link') return <Link2 className="h-5 w-5 mr-3 text-blue-500 flex-shrink-0" />;
  if (attachmentType === 'video') return <PlayCircle className="h-5 w-5 mr-3 text-red-500 flex-shrink-0" />;
  
  if (fileType?.startsWith('image/')) return <ImageIcon className="h-5 w-5 mr-3 text-purple-500 flex-shrink-0" />;
  if (fileType === 'application/pdf') return <FileText className="h-5 w-5 mr-3 text-orange-500 flex-shrink-0" />;
  
  // Default file icon
  return <File className="h-5 w-5 mr-3 text-gray-500 flex-shrink-0" />;
};

// Format file size to human-readable format
const formatFileSize = (bytes?: number): string => {
  if (bytes === undefined) return '';
  
  if (bytes < 1024) return `${bytes} B`;
  else if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  else if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  else return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

// Check if URL is an image
const isImageUrl = (url: string, fileType?: string): boolean => {
  if (fileType?.startsWith('image/')) return true;
  
  // Simple URL extension check as fallback
  const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif'];
  return extensions.some(ext => url.toLowerCase().endsWith(ext));
};

// Add the video utility function to extract video information
const extractVideoInfo = (url: string): { platform: 'youtube' | 'vimeo' | 'other'; videoId: string | null; thumbnailUrl: string | null } => {
  // YouTube pattern
  const youtubePatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/user\/.+\/|youtube\.com\/user\/.+#\w\/\w\/|youtube\.com\/shorts\/|youtube\.com\/playlist\?|youtube\.com\/watch\?|youtube\.com\/(?:(?:watch|attribution_link)\?(?:.*?)v(?:i)?=|(?:embed|v|vi|user)\/))([^&#?/\s]+)/,
    /(?:youtube\.com\/shorts\/)([^&#?/\s]+)/
  ];

  // Vimeo pattern
  const vimeoPattern = /(?:vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:$|\/|\?))/;

  // Check for YouTube
  for (const pattern of youtubePatterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      const videoId = match[1];
      return {
        platform: 'youtube',
        videoId,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      };
    }
  }

  // Check for Vimeo
  const vimeoMatch = url.match(vimeoPattern);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      platform: 'vimeo',
      videoId: vimeoMatch[1],
      // Vimeo requires an API call to get the thumbnail, so we'll use a placeholder for now
      thumbnailUrl: null
    };
  }

  // Unknown video format
  return {
    platform: 'other',
    videoId: null,
    thumbnailUrl: null
  };
};

interface PostCardProps {
  id: string;
  spaceId: string;
  currentUserId?: string | null;
  author: {
    id: string;
    name: string;
    avatar?: string | null;
  };
  title?: string | null;
  content: string;
  createdAt: string | Date;
  category?: {
    id: string;
    name: string;
    icon?: string | null;
  } | null;
  likes?: number;
  comments?: number;
  className?: string;
  media_urls?: Attachment[] | null;
}

export default function PostCard({
  id,
  spaceId,
  currentUserId,
  author,
  title,
  content,
  createdAt,
  category,
  likes = 0,
  comments = 0,
  className,
  media_urls,
}: PostCardProps) {
  const { user: loggedInUser } = useAuth();
  // State to track if content is expanded
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Video player modal state
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<{url: string; videoId?: string | null; platform?: string}>({url: ''});
  
  // Like state
  const [hasLikedPost, setHasLikedPost] = useState(false);
  const [optimisticLikeCount, setOptimisticLikeCount] = useState(likes);
  const [isLikingInProgress, setIsLikingInProgress] = useState(false);
  
  // Comment state
  const [newComment, setNewComment] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const [optimisticCommentCount, setOptimisticCommentCount] = useState(comments);
  const [postComments, setPostComments] = useState<FetchedComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [showComments, setShowComments] = useState(false);
  
  // Constants for content truncation
  const MAX_CHARS = 140; 
  const MAX_LINES = 3; 
  const shouldTruncate = content.length > MAX_CHARS;
  
  const displayContent = shouldTruncate && !isExpanded 
    ? content.slice(0, MAX_CHARS) + '...'
    : content;

  // Fetch initial like status
  useEffect(() => {
    if (!currentUserId || !id) return;

    const fetchLikeStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('post_likes')
          .select('id')
          .eq('post_id', id)
          .eq('user_id', currentUserId)
          .maybeSingle();

        if (error) {
          console.warn(`Error fetching like status for post ${id}:`, error.message);
          return;
        }
        setHasLikedPost(!!data);
      } catch (err) {
        console.warn(`Exception fetching like status for post ${id}:`, err);
      }
    };
    fetchLikeStatus();
    if (showComments) fetchComments();
  }, [id, currentUserId, showComments]);

  useEffect(() => {
    console.log(`PostCard for ${author.name}: avatar = ${author.avatar || 'none'}`);
  }, [author]);

  const formattedDate = typeof createdAt === 'string' 
    ? new Date(createdAt).toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : createdAt.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });

  const getInitial = () => {
    if (!author.name) return "U";
    return author.name.charAt(0).toUpperCase();
  };

  const toggleExpansion = () => {
    setIsExpanded(!isExpanded);
  };

  const handleLikeToggle = useCallback(async () => {
    if (!currentUserId || !id || isLikingInProgress) {
      if(!currentUserId) {
        toast({ title: "Please log in to like posts.", variant: "default" });
      }
      return;
    }

    setIsLikingInProgress(true);
    const currentlyLiked = hasLikedPost;

    // Optimistic update
    setHasLikedPost(!currentlyLiked);
    setOptimisticLikeCount(prevCount => currentlyLiked ? prevCount - 1 : prevCount + 1);

    try {
      if (currentlyLiked) {
        // Unlike
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .match({ post_id: id, user_id: currentUserId });

        if (error) throw error;
        // console.log('Post unliked:', id);
      } else {
        // Like
        const { data, error } = await supabase
          .from('post_likes')
          .insert({ post_id: id, user_id: currentUserId })
          .select('id')
          .single();

        if (error) throw error;

        // Log activity in user_activity_log
        await supabase.from('user_activity_log').insert({
          user_id: currentUserId,
          type: 'like',
          ref_id: id, // The post ID
          meta: { post_id: id, space_id: spaceId }
        });
      }
    } catch (error: any) {
      console.error('Error toggling like:', error);
      toast({
        title: "Error",
        description: error.message || "Could not update like status.",
        variant: "destructive",
      });
      // Revert optimistic update on error
      setHasLikedPost(currentlyLiked);
      setOptimisticLikeCount(prevCount => currentlyLiked ? prevCount + 1 : prevCount - 1);
    } finally {
      setIsLikingInProgress(false);
    }
  }, [currentUserId, id, isLikingInProgress, hasLikedPost, spaceId]);

  const fetchComments = useCallback(async () => {
    if (!id) return;
    setCommentsLoading(true);
    try {
      const { data: commentsData, error: commentsError } = await supabase
        .from('post_comments')
        .select(`
          id,
          post_id,
          user_id,
          content,
          created_at,
          parent_comment_id,
          author:users!user_id (id, full_name, avatar_url)
        `)
        .eq('post_id', id)
        .is('parent_comment_id', null) // Fetch only top-level comments initially
        .order('created_at', { ascending: true });

      if (commentsError) {
        throw commentsError;
      }

      if (commentsData) {
        const processedComments = commentsData.map(comment => {
          // Apply intermediate 'unknown' cast as suggested by linter for non-overlapping types
          const authorData = comment.author as unknown as (CommentAuthor | Record<string, unknown> | null);
          let finalAuthor: CommentAuthor | null = null;

          // Robust type guard for authorData
          if (authorData && typeof authorData === 'object' && 'id' in authorData && typeof authorData.id === 'string') {
            // authorData is now known to be an object with an 'id' property that is a string.
            finalAuthor = {
              id: authorData.id, 
              // Perform type checks for full_name and avatar_url as authorData could be Record<string, unknown>
              full_name: (authorData.full_name && typeof authorData.full_name === 'string') ? authorData.full_name : null,
              avatar_url: (authorData.avatar_url && typeof authorData.avatar_url === 'string') ? authorData.avatar_url : null,
            };
          } else {
            finalAuthor = null;
            if (authorData) { 
              console.warn("Supabase join error for comment author, or author data is malformed for comment:", comment.id, "authorData:", authorData);
            }
          }

          return {
            ...comment,
            author: finalAuthor,
            replies_count: 0, 
            initial_replies: [], 
            onReply: () => { console.log('Reply triggered for:', comment.id); }, 
            onEdit: () => { console.log('Edit triggered for:', comment.id); }, 
            onDelete: () => { console.log('Delete triggered for:', comment.id); },
            currentUserId: loggedInUser?.id ?? null, 
            spaceId: spaceId 
          } as FetchedComment; 
        });
        setPostComments(processedComments);
      } else {
        setPostComments([]);
      }
    } catch (error: any) {
      console.error('Error fetching comments:', error);
      toast({
        title: "Error",
        description: error.message || "Could not load comments.",
        variant: "destructive",
      });
    } finally {
      setCommentsLoading(false);
    }
  }, [id, supabase, loggedInUser?.id, spaceId]);

  const handleCommentSubmit = useCallback(async () => {
    if (!currentUserId) {
      toast({ title: "Please log in to comment.", variant: "default" });
      return;
    }
    if (!newComment.trim()) {
      toast({ title: "Comment cannot be empty.", variant: "destructive" });
      return;
    }
    if (isCommenting) return;

    setIsCommenting(true);
    const originalCommentCount = optimisticCommentCount;

    try {
      const { data, error } = await supabase.from('post_comments').insert({
        post_id: id,
        user_id: currentUserId,
        space_id: spaceId,
        content: newComment.trim(),
      }).select('id').single();

      if (error) throw error;

      // Insert into user_activity_log after comment creation
      if (data && data.id) {
        await supabase.from('user_activity_log').insert({
          user_id: currentUserId,
          type: 'comment',
          ref_id: data.id,
          meta: { post_id: id, space_id: spaceId }
        });
      }

      setNewComment("");
      setOptimisticCommentCount(prev => prev + 1);
      toast({ title: "Comment posted!", variant: "default" });
      // TODO: Optionally, trigger a refetch of comments for this post or add to local list
    } catch (error: any) {
      console.error("Error posting comment:", error);
      toast({
        title: "Error",
        description: error.message || "Could not post comment.",
        variant: "destructive",
      });
      setOptimisticCommentCount(originalCommentCount); // Revert optimistic update
    } finally {
      setIsCommenting(false);
    }
  }, [currentUserId, id, spaceId, newComment, isCommenting, optimisticCommentCount]);

  const handleVideoClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    url: string, 
    videoId?: string | null,
    platform?: string
  ) => {
    e.preventDefault();
    setSelectedVideo({url, videoId, platform});
    setIsVideoModalOpen(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "bg-white border border-gray-200 shadow-md hover:shadow-lg transition-shadow rounded-lg mb-6 overflow-hidden",
        className
      )}
    >
      {/* Header row */}
      <div className="px-6 pt-5 pb-4 flex items-center justify-between">
        <div className="flex items-center">
          <Avatar className="h-10 w-10 rounded-full mr-3">
            {author.avatar ? (
              <AvatarImage 
                src={author.avatar} 
                alt={author.name}
              />
            ) : null}
            <AvatarFallback className="bg-gradient-to-br from-teal-500 to-teal-600 text-white font-medium">
              {getInitial()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-800">{author.name}</span>
            <div className="flex items-center mt-0.5">
              <span className="text-xs text-gray-500">{formattedDate}</span>
              {category && category.name && (
                <>
                  <span className="mx-1.5 text-xs text-gray-400">•</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-700">
                    {category.icon ? (
                      <span className="mr-1">{category.icon}</span>
                    ) : (
                      <Tag className="h-3 w-3 mr-1.5 text-sky-600" />
                    )}
                    {category.name}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        
        <button className="p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400">
          <MoreVertical className="h-5 w-5" />
        </button>
      </div>
      
      {/* Content text */}
      <div className="px-6 pb-5">
        {title && (
          <h3 className="text-lg font-semibold text-gray-800 mb-2 break-words">{title}</h3>
        )}
        <div className="flex">
          <div className="flex-grow relative">
            <p 
              className={cn(
                "text-base font-normal text-gray-700 leading-relaxed whitespace-pre-wrap break-words",
                !isExpanded && shouldTruncate && "line-clamp-3"
              )}
            >
              {displayContent}
            </p>
            
            {shouldTruncate && (
              <button 
                onClick={toggleExpansion} 
                className="flex items-center text-teal-600 hover:text-teal-700 text-xs mt-2 font-medium transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-teal-500"
              >
                {isExpanded ? (
                  <>
                    Show less <ChevronUp className="ml-1 h-4 w-4" />
                  </>
                ) : (
                  <>
                    Show more <ChevronDown className="ml-1 h-4 w-4" />
                  </>
                )}
              </button>
            )}
          </div>

          {/* Video thumbnail in content */}
          {media_urls?.some(att => att.type === 'video') && (
            <div className="ml-4 flex-shrink-0 w-[120px]">
              {media_urls
                .filter(att => att.type === 'video')
                .slice(0, 1) 
                .map(att => {
                  const videoInfo = att.videoId && att.thumbnailUrl 
                    ? { videoId: att.videoId, thumbnailUrl: att.thumbnailUrl, platform: att.videoPlatform || 'other' }
                    : extractVideoInfo(att.url);
                  
                  return (
                    <a 
                      key={att.id}
                      href={att.url}
                      onClick={(e) => handleVideoClick(e, att.url, videoInfo.videoId, videoInfo.platform)}
                      className="block rounded-md overflow-hidden border border-gray-200 aspect-video relative group shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="relative h-full bg-gray-100">
                        {videoInfo.thumbnailUrl ? (
                          <img 
                            src={videoInfo.thumbnailUrl} 
                            alt="Video thumbnail" 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                            <PlayCircle className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                        
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-10 group-hover:bg-opacity-20 transition-all">
                          <div className="h-8 w-8 flex items-center justify-center rounded-full bg-black bg-opacity-50 group-hover:bg-opacity-70 group-hover:scale-110 transition-all">
                            <PlayCircle className="h-5 w-5 text-white" />
                          </div>
                        </div>
                      </div>
                    </a>
                  );
                })}
            </div>
          )}
        </div>
        
        {/* Other attachments */}
        {media_urls && media_urls.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            {/* Images */}
            {media_urls.some(att => att.type === 'file' && att.fileType?.startsWith('image/') || isImageUrl(att.url)) && (
              <div className="space-y-3">
                {media_urls
                  .filter(att => att.type === 'file' && (att.fileType?.startsWith('image/') || isImageUrl(att.url)))
                  .map(att => (
                    <div key={att.id} className="rounded-md overflow-hidden border border-gray-200">
                      <a href={att.url} target="_blank" rel="noopener noreferrer" className="block">
                        <img 
                          src={att.url} 
                          alt={att.name || "Attached image"} 
                          className="w-full max-h-96 object-contain bg-gray-50"
                        />
                      </a>
                    </div>
                  ))
                }
              </div>
            )}

            {/* Other files & links (excluding videos already handled by thumbnail preview) */}
            {media_urls.some(att => 
              ((att.type === 'file' && !att.fileType?.startsWith('image/') && !isImageUrl(att.url))) || 
              att.type === 'link'
            ) && (
              <div className="flex flex-wrap gap-3 mt-3">
                {media_urls
                  .filter(att => 
                    ((att.type === 'file' && !att.fileType?.startsWith('image/') && !isImageUrl(att.url))) || 
                    att.type === 'link'
                  )
                  .map(att => (
                    <div 
                      key={att.id} 
                      className="w-full sm:w-auto sm:max-w-xs md:max-w-sm rounded-md bg-slate-50 border border-slate-200 p-3 hover:bg-slate-100 transition-colors flex-grow-0 flex-shrink"
                    >
                      <a 
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center group"
                      >
                        {getFileIcon(att.fileType, att.type)}
                        <div className="flex-grow min-w-0">
                          <span className="font-medium text-sm text-blue-600 group-hover:text-blue-700 transition-colors truncate block" title={att.name || att.url}>{att.name || att.url}</span>
                          {att.type === 'file' && att.fileSize && (
                            <div className="text-xs text-gray-500 mt-0.5">
                              {formatFileSize(att.fileSize)}
                            </div>
                          )}
                        </div>
                        <div className="ml-3 p-1.5 rounded-full bg-slate-200 group-hover:bg-slate-300 transition-colors flex-shrink-0">
                          <Download className="h-4 w-4 text-slate-600 group-hover:text-slate-700" />
                        </div>
                      </a>
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Actions bar */}
      <div className="px-5 py-3 border-t border-gray-200 bg-gray-50/75 flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLikeToggle}
          disabled={isLikingInProgress || !currentUserId}
          className="flex items-center gap-1 text-muted-foreground hover:text-primary"
        >
          <ThumbsUp className={cn("h-4 w-4", hasLikedPost && "fill-primary text-primary")} />
          <span>{optimisticLikeCount > 0 ? optimisticLikeCount : 'Like'}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowComments(prev => !prev)}
          className="flex items-center gap-1 text-muted-foreground hover:text-primary"
          aria-expanded={showComments}
        >
          <MessageSquare className="h-4 w-4" />
          <span>{optimisticCommentCount > 0 ? optimisticCommentCount : 'Comment'}</span>
        </Button>
      </div>

      {/* Comment Display Section */}
      {showComments && (
        <div className="px-5 pt-4 pb-4 border-t border-gray-100">
          {commentsLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Loading comments...</p>
            </div>
          ) : postComments.length > 0 ? (
            <div className="space-y-3">
              {postComments.map(comment => (
                <CommentItem
                  key={comment.id}
                  id={comment.id}
                  content={comment.content}
                  created_at={comment.created_at}
                  author={comment.author}
                  // Note: CommentItemProps from search result only strictly requires id, content, created_at, author.
                  // The other properties in FetchedComment (like onReply, spaceId etc.) are not used by the current CommentItem,
                  // but having them in postComments state is fine for future enhancements.
                />
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-6">No comments yet. Be the first to write one!</p>
          )}
        </div>
      )}

      {/* Comment Input Section (shown if user is logged in, regardless of showComments for immediate input access) */}
      {currentUserId && loggedInUser && (
        <div className="mt-4 pt-4 border-t px-5 pb-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-9 w-9 mt-1">
              {loggedInUser.user_metadata?.avatar_url ? (
                <AvatarImage src={loggedInUser.user_metadata.avatar_url} alt={loggedInUser.email || 'User'} />
              ) : null}
              <AvatarFallback>
                {loggedInUser.email?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-grow">
              <Textarea
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={2}
                className="mb-2 resize-none"
                disabled={isCommenting}
              />
              <div className="flex justify-end">
                <Button 
                  onClick={handleCommentSubmit} 
                  disabled={isCommenting || !newComment.trim()}
                  size="sm"
                >
                  {isCommenting ? (
                    <>
                      <Send className="h-4 w-4 mr-1 animate-pulse" /> Posting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-1" /> Post Comment
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add the VideoPlayerModal */}
      <VideoPlayerModal 
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        videoUrl={selectedVideo.url}
        videoId={selectedVideo.videoId}
        videoPlatform={selectedVideo.platform as 'youtube' | 'vimeo' | 'other' | undefined}
      />
    </motion.div>
  );
} 