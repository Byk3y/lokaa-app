import React, { useState, useEffect, useRef } from 'react';
import { Paperclip, Link as LinkIcon, Video as VideoIcon, ImageIcon, Gift, Smile, BarChart, FileText, File } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { generateUUID } from '@/utils/uuid';

// Import our components
import { EmojiPickerModal } from './modals/EmojiPickerModal';
import { GiphySearchModal } from './modals/GiphySearchModal';
import { VideoLinkModal } from './modals/VideoLinkModal';
import { LinkModal } from './modals/LinkModal';
import { VideoPlayerModal } from './modals/VideoPlayerModal';
import { AttachmentList } from './attachments/AttachmentList';
import { PostTemplateSelector } from './PostTemplateSelector';
import { PollCreatorSection } from './PollCreatorSection';
import { CategorySelector } from './CategorySelector';

// Import our hooks
import { useAttachments } from '../hooks/useAttachments';
import { useEmojiPicker } from '../hooks/useEmojiPicker';
import { useGiphySearch } from '../hooks/useGiphySearch';
import { usePostSubmission } from '../hooks/usePostSubmission';
import { usePostForm } from '../hooks/usePostForm';
import { useSpaceHasPosts } from '../hooks/useSpaceHasPosts';
import { POST_TEMPLATES } from '../types';

// Import types
import type { PostCardProps } from '@/features/posts/types/postCard';
import type { CreatePostModalProps } from '../types';

// Import test utilities (development only)
import { logImplementationStatus } from '../utils/uploadTestUtils';

/**
 * Main modal component for creating and editing posts
 */
export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  spaceId,
  currentUserId,
  spaceName,
  userName,
  userAvatarUrl,
  onPostCreated,
  editMode = false,
  post,
  onPostUpdated,
}) => {
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  
  const {
    title,
    setTitle,
    content,
    setContent,
    categoryId,
    setCategoryId,
    showFunPostIdeas,
    setShowFunPostIdeas,
    pollOptions,
    showPollCreator,
    handlePollOptionChange,
    addPollOption,
    removePollOption,
    togglePollCreator,
    categories,
    categoriesLoading,
    categoriesError,
    applyPostTemplate,
    validateForm,
    getPreparedPollData,
    getSubmissionCategoryId
  } = usePostForm({
    spaceId,
    editMode,
    post,
    isOpen
  });
  
  const [selectedContentGifUrls, setSelectedContentGifUrls] = useState<string[]>(
    editMode && post?.content_gif_url ? [post.content_gif_url] : []
  );
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
  
  const {
    attachments,
    isVideoLinkModalOpen,
    setIsVideoLinkModalOpen,
    isLinkModalOpen,
    setIsLinkModalOpen,
    fileInputRef,
    isVideoPlayerModalOpen,
    setIsVideoPlayerModalOpen,
    selectedVideo,
    uploadingFiles,
    resetAttachments,
    triggerFileSelector,
    handleFileSelected,
    handleAddVideoLink,
    handleAddLink,
    handleVideoUrlSubmit,
    handleLinkSubmit,
    handleRemoveAttachment,
    handleVideoPreviewClick
  } = useAttachments({
    spaceId,
    userId: currentUserId,
    isOpen,
    editMode,
    initialAttachments: post?.media_urls
  });
  
  const {
    showEmojiPicker,
    emojiPickerRef,
    handleEmojiSelect: handleEmojiSelectInternal,
    toggleEmojiPicker
  } = useEmojiPicker({
    onEmojiSelect: (emoji) => {
      if (contentTextareaRef.current) {
        const textarea = contentTextareaRef.current;
        const cursorPos = textarea.selectionStart;
        const textBefore = content.substring(0, cursorPos);
        const textAfter = content.substring(cursorPos);
        setContent(textBefore + emoji.native + textAfter);
        setTimeout(() => {
          textarea.focus();
          textarea.selectionStart = textarea.selectionEnd = cursorPos + emoji.native.length;
        }, 0);
      }
    }
  });
  
  const {
    showGiphySearch,
    setShowGiphySearch,
    giphySearchTerm,
    setGiphySearchTerm,
    activeGifCategory,
    giphyContainerRef,
    fetchGifsForSearch,
    fetchGifsForCategory,
    handleGifSelected,
    toggleGiphySearch,
    openGiphySearchForContent,
    isContentGif
  } = useGiphySearch({
    onGifSelected: (gifUrl) => {
      const newAttachment = {
        id: generateUUID(),
        type: 'file' as const,
        url: gifUrl,
        name: 'GIF Image',
        fileType: 'image/gif'
      };
      attachments.push(newAttachment);
    },
    onGifSelectedForContent: (gifUrl) => {
      setSelectedContentGifUrls(prevUrls => [...prevUrls, gifUrl]);
    }
  });
  
  const {
    isSubmitting,
    submitError,
    submitPost
  } = usePostSubmission({
    spaceId,
    userId: currentUserId,
    editMode,
    post,
    onPostCreated,
    onPostUpdated,
    openPostModal: (newPost) => {
      if (editMode) return; // Don't open modal for edits
      
      // Use the post data to set up the modal
      if (onPostCreated) {
        // First call the onPostCreated callback to refresh the feed
        onPostCreated();
      }
      
      // Don't auto-open the modal - let URL-based navigation handle it
      // The navigateToPost function in usePostSubmission will handle this
    }
  });
  
  const { isEmptySpace, loading: checkingPosts } = useSpaceHasPosts(spaceId);
  
  useEffect(() => {
    if (!editMode) {
      setShowFunPostIdeas(isEmptySpace && !checkingPosts);
    }
  }, [isEmptySpace, checkingPosts, editMode, setShowFunPostIdeas]);

  // Log implementation status when modal opens (development only)
  useEffect(() => {
    if (isOpen && process.env.NODE_ENV === 'development') {
      logImplementationStatus();
    }
  }, [isOpen]);
  
  // Define updated styles for toolbar icons and buttons
  const toolbarButtonClass = "inline-flex items-center justify-center text-gray-500 hover:text-teal-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-teal-400 dark:hover:bg-gray-800 transition-colors rounded-full p-2.5";
  const activeToolbarButtonClass = "inline-flex items-center justify-center text-teal-600 bg-teal-50 dark:text-teal-400 dark:bg-gray-700 rounded-full p-2.5";
  const submitButtonText = isSubmitting 
    ? (editMode ? "Updating..." : "Posting...") 
    : uploadingFiles.size > 0
    ? "Uploading files..."
    : (editMode ? "Update Post" : "Post");
  
  const handleRemoveContentGif = (indexToRemove: number) => {
    setSelectedContentGifUrls(prevUrls => prevUrls.filter((_, index) => index !== indexToRemove));
  };

  // Check if there's any content to warn about losing
  const hasContent = () => {
    return title.trim() !== '' || 
           content.trim() !== '' || 
           attachments.length > 0 || 
           selectedContentGifUrls.length > 0 ||
           pollOptions.some(option => option.text.trim() !== '');
  };

  // Handle close with confirmation if there's content
  const handleCloseAttempt = () => {
    if (hasContent() && !editMode) {
      setShowCloseConfirmation(true);
    } else {
      handleActualClose();
    }
  };

  // Actually close the modal
  const handleActualClose = () => {
    setShowCloseConfirmation(false);
    onClose();
    resetAttachments();
    setSelectedContentGifUrls([]);
    if (!editMode) {
      setTitle('');
      setContent('');
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    // Prevent submission while files are uploading
    if (uploadingFiles.size > 0) {
      return;
    }
    
    const response = await submitPost({
      title,
      content,
      categoryId: getSubmissionCategoryId(),
      attachments,
      pollData: getPreparedPollData(),
      categories,
      content_gif_url: selectedContentGifUrls.length > 0 ? selectedContentGifUrls[0] : null
    });
    
    if (response.success) {
      onClose();
      resetAttachments();
      setSelectedContentGifUrls([]);
      if (!editMode) {
    setTitle('');
    setContent('');
      }
    }
  };
  
  const handleEmojiPickerWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
  };

  useEffect(() => {
  if (!isOpen) {
        if (!editMode) {
            setTitle('');
            setContent('');
            setCategoryId(null);
        }
        setSelectedContentGifUrls([]);
    } else {
      setSelectedContentGifUrls(editMode && post?.content_gif_url ? [post.content_gif_url] : []);
    }
  }, [isOpen, editMode, setTitle, setContent, setCategoryId, post?.content_gif_url]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    if (isOpen) {
      document.body.style.overflow = 'auto';
    } else {
      document.body.style.overflow = originalOverflow;
    }
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Filter out YouTube videos for dedicated display
  const youtubeVideoAttachments = attachments.filter(
    att => att.type === 'video' && att.videoPlatform === 'youtube' && att.videoId
  );
  const otherAttachments = attachments.filter(
    att => !(att.type === 'video' && att.videoPlatform === 'youtube' && att.videoId)
  );

  // Helper function to format file size
  const formatFileSize = (bytes?: number): string => {
    if (bytes === undefined) return '';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <>
      <TooltipProvider>
      <Dialog.Root open={isOpen} onOpenChange={handleCloseAttempt}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-overlayShow z-40" />
          <Dialog.Content className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-sm sm:max-w-md md:max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white pt-5 px-6 pb-6 shadow-xl focus:outline-none dark:bg-gray-800 dark:text-white data-[state=open]:animate-contentShow overflow-visible">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelected}
                style={{ display: 'none' }}
                multiple
                accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,audio/*"
              />

              <Dialog.Title className="sr-only">
                {editMode ? "Edit Post" : `Create Post in ${spaceName}`}
              </Dialog.Title>
              <Dialog.Description className="sr-only">
                {editMode ? `Edit your post in ${spaceName}` : `Create a new post in ${spaceName}. Add a title, content, media attachments, and categorize your post.`}
              </Dialog.Description>
            
              <div className="space-y-5">
                <div>
              <div className="flex items-center">
                    <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-full bg-gray-200">
                      {userAvatarUrl ? (
                        <img src={userAvatarUrl} alt={userName} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-teal-600 text-white">
                          {userName?.charAt(0).toUpperCase()}
                        </div>
                      )}
                </div>
                    <div className="ml-3">
                      <span className="text-base font-medium text-gray-800 dark:text-white">
                        {userName} <span className="text-gray-600">posting in</span> <span className="font-bold text-teal-600 text-lg">{spaceName.charAt(0).toUpperCase() + spaceName.slice(1)}</span>
                      </span>
              </div>
                  </div>
                </div>
                
                <div>
              <input
                id="post-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                    placeholder="Give your post a title"
                    className="block w-full rounded-md py-2 sm:py-3 px-3 text-base font-semibold font-sans tracking-tight capitalize placeholder-gray-400 focus:outline-none focus:ring-0 border-b-2 border-gray-200 focus:border-teal-500 transition-colors dark:bg-gray-800 dark:text-white dark:border-gray-700 dark:focus:border-teal-400"
              />
            </div>

                <div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                    placeholder="What's on your mind?"
                    rows={4}
                    ref={contentTextareaRef}
                    spellCheck={true}
                    autoCapitalize="sentences"
                    className="block w-full rounded-md py-2 px-3 text-sm sm:text-base font-normal font-sans normal-case leading-relaxed placeholder-gray-400 focus:outline-none focus:ring-0 dark:bg-gray-800 dark:text-white"
                  />

                  <p className="text-xs text-gray-500 mt-2 dark:text-gray-400">
                    Please keep posts respectful and relevant to the space.
                  </p>
                              </div>
                            </div>
                            
                <div className="my-5">
                  <PostTemplateSelector
                    visible={showFunPostIdeas}
                    onClose={() => setShowFunPostIdeas(false)}
                    onTemplateSelect={applyPostTemplate} 
                  />
                            </div>
                
                {/* Unified Attachments Preview Section */}
                {(selectedContentGifUrls.length > 0 || attachments.length > 0) && (
                  <div className="mt-4">
                    <div className="flex space-x-3 overflow-x-auto w-full py-2 scrollbar-none scroll-smooth">
                      {/* 1. Content GIFs (from selectedContentGifUrls) */}
                      {selectedContentGifUrls.map((url, idx) => {
                        // Convert Giphy page URLs to direct media URLs
                        let displayUrl = url;
                        if (url.includes('giphy.com/gifs/')) {
                          const gifId = url.split('-').pop();
                          if (gifId) {
                            displayUrl = `https://media.giphy.com/media/${gifId}/giphy.gif`;
                          }
                        }
                        
                        return (
                          <div key={`content-gif-${idx}`} className="relative w-[210px] min-w-[210px] h-[210px] rounded-lg border bg-white dark:bg-gray-800 shadow-sm group overflow-hidden flex-shrink-0">
                            <img 
                              src={displayUrl} 
                              alt={`Selected GIF ${idx + 1}`}
                              className="w-full h-full object-cover"
                              onError={() => {
                                // Show placeholder if both fail
                                displayUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjEwIiBoZWlnaHQ9IjIxMCIgdmlld0JveD0iMCAwIDIxMCAyMTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMTAiIGhlaWdodD0iMjEwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik05MCA3NUMxMDcuNjczIDc1IDEyMiA4OS4zMjcgMTIyIDEwN0MxMjIgMTI0LjY3MyAxMDcuNjczIDEzOSA5MCAxMzlDNzIuMzI3IDEzOSA1OCAxMjQuNjczIDU4IDEwN0M1OCA4OS4zMjcgNzIuMzI3IDc1IDkwIDc1WiIgZmlsbD0iIzlCOUI5QiIvPgo8cGF0aCBkPSJNODQgOTNIMTAyVjEyMUg4NFY5M1oiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xMzUgNzVIMTUyVjEzOUgxMzVWNzVaIiBmaWxsPSIjOUI5QjlCIi8+PC9zdmc+';
                              }}
                            />
                            <button
                              onClick={() => handleRemoveContentGif(idx)} 
                              className="absolute top-1.5 right-1.5 bg-black bg-opacity-50 text-white rounded-full p-1 hover:bg-opacity-70 transition-opacity z-10"
                              aria-label={`Remove GIF ${idx + 1}`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                          </div>
                        );
                      })}

                      {/* 2. Other Attachments (from useAttachments) */}
                      {attachments.map((att) => (
                        <div key={att.id} className="relative w-[210px] min-w-[210px] h-[210px] rounded-lg border bg-white dark:bg-gray-800 shadow-sm group overflow-hidden flex-shrink-0">
                          {/* Upload Error State */}
                          {att.type === 'file' && !att.url && (
                            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                              <div className="w-12 h-12 text-red-500 mb-2">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                </svg>
                              </div>
                              <p className="text-xs font-medium text-red-600 dark:text-red-400">Upload failed</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{att.name}</p>
                            </div>
                          )}
                          
                          {/* Type: Uploaded Image (including GIFs) */}
                          {att.type === 'file' && att.fileType?.startsWith('image/') && att.url && (
                            <img src={att.url} alt={att.name || 'Image attachment'} className="w-full h-full object-cover" />
                          )}

                          {/* Type: YouTube Video */}
                          {att.type === 'video' && att.videoPlatform === 'youtube' && att.videoId && (
                            <>
                              <img src={`https://img.youtube.com/vi/${att.videoId}/hqdefault.jpg`} alt={att.name || 'YouTube thumbnail'} className="w-full h-full object-cover" />
                              <div 
                                className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors cursor-pointer"
                                onClick={(e: React.MouseEvent<HTMLDivElement>) => handleVideoPreviewClick(e, att)}
                              >
                                <div className="bg-black/70 text-white rounded-full p-3 text-2xl group-hover:scale-110 transition-transform">
                                  <span>▶️</span>
                              </div>
                            </div>
                            </>
                          )}
                          
                          {/* Type: Other Video (Non-YouTube) - Icon based */}
                          {att.type === 'video' && att.videoPlatform !== 'youtube' && (
                            <div className="p-3 flex flex-col items-center justify-center h-full text-center">
                              <VideoIcon className="w-12 h-12 text-blue-500 dark:text-blue-400 mb-2" strokeWidth={1.5}/>
                              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate w-full" title={att.name}>{att.name || 'Video File'}</p>
                              <div 
                                className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/30 transition-colors cursor-pointer"
                                onClick={(e: React.MouseEvent<HTMLDivElement>) => handleVideoPreviewClick(e, att)}
                              >
                                <div className="bg-black/70 text-white rounded-full p-3 text-2xl group-hover:scale-110 transition-transform">
                                  <span>▶️</span>
                          </div>
                        </div>
                  </div>
                )}

                          {/* Type: PDF */}
                          {att.type === 'file' && att.fileType === 'application/pdf' && (
                            <div className="p-3 flex flex-col items-center justify-center h-full text-center">
                              <FileText className="w-12 h-12 text-red-500 dark:text-red-400 mb-2" strokeWidth={1.5}/>
                              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate w-full" title={att.name}>{att.name}</p>
                              <p className="text-xxs text-gray-500 dark:text-gray-400">PDF · {formatFileSize(att.fileSize)}</p>
                                </div>
                              )}

                          {/* Type: Link */}
                          {att.type === 'link' && (
                             <div className="p-3 flex flex-col items-center justify-center h-full text-center">
                              <LinkIcon className="w-12 h-12 text-teal-500 dark:text-teal-400 mb-2" strokeWidth={1.5}/>
                              <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-blue-600 dark:text-blue-400 truncate w-full hover:underline" title={att.url}>{att.name || att.url}</a>
                            </div>
                          )}

                          {/* Type: Generic File (non-image, non-PDF) */}
                          {att.type === 'file' && !att.fileType?.startsWith('image/') && att.fileType !== 'application/pdf' && (
                            <div className="p-3 flex flex-col items-center justify-center h-full text-center">
                              <File className="w-12 h-12 text-gray-500 dark:text-gray-400 mb-2" strokeWidth={1.5}/>
                              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate w-full" title={att.name}>{att.name}</p>
                              <p className="text-xxs text-gray-500 dark:text-gray-400">{(att.fileType?.split('/')[1] || 'File').toUpperCase()} · {formatFileSize(att.fileSize)}</p>
                            </div>
                          )}
                          
                          {/* Universal Remove Button for attachments from useAttachments */}
                          {! (att.type === 'file' && att.fileType?.startsWith('image/')) && /* Show only if not a full-card image preview */
                           !(att.type === 'video' && att.videoPlatform === 'youtube') && /* Or not a YT video with its own overlay */
                            att.type !== 'video' && /* And not other videos which have overlay */
                            <button
                              onClick={() => handleRemoveAttachment(att.id)}
                              className="absolute top-1.5 right-1.5 bg-black bg-opacity-50 text-white rounded-full p-1 hover:bg-opacity-70 transition-opacity z-10"
                              aria-label={`Remove ${att.name || 'attachment'}`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                          }
                           {/* Remove button specifically for full-card image/video previews (where the above doesn't show) */}
                          {( (att.type === 'file' && att.fileType?.startsWith('image/')) || 
                            (att.type === 'video' && att.videoPlatform === 'youtube')) && (
                             <button 
                              onClick={() => handleRemoveAttachment(att.id)} 
                              className="absolute top-1.5 right-1.5 bg-black bg-opacity-50 text-white rounded-full p-1 hover:bg-opacity-70 transition-opacity z-10 opacity-0 group-hover:opacity-100"
                              aria-label={`Remove ${att.name || 'attachment'}`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                          )}
                          </div>
                      ))}
                      
                      {/* Upload Progress Indicators */}
                      {Array.from(uploadingFiles).map((fileId) => (
                        <div key={`uploading-${fileId}`} className="relative w-[210px] min-w-[210px] h-[210px] rounded-lg border bg-gray-50 dark:bg-gray-700 shadow-sm group overflow-hidden flex-shrink-0">
                          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                            <div className="w-12 h-12 text-teal-500 mb-2 animate-spin">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                              </svg>
                            </div>
                            <p className="text-xs font-medium text-teal-600 dark:text-teal-400">Uploading...</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Please wait</p>
                          </div>
                        </div>
                      ))}
                        </div>
                  </div>
                )}

                {showPollCreator && (
                  <div className="mb-5">
                    <PollCreatorSection
                      pollOptions={pollOptions}
                      onPollOptionChange={handlePollOptionChange}
                      onRemovePollOption={removePollOption}
                      onAddPollOption={addPollOption}
                      onRemovePoll={togglePollCreator}
                    />
              </div>
            )}

                <div className="mt-4 flex justify-between items-center dark:border-gray-700">
                  <div className="flex items-center space-x-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className={toolbarButtonClass}
                          onClick={triggerFileSelector}
                        >
                          <Paperclip className="h-5 w-5" strokeWidth={2} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Attach a file</p>
                      </TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className={toolbarButtonClass}
                          onClick={handleAddLink}
                        >
                          <LinkIcon className="h-5 w-5" strokeWidth={2} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Add a link</p>
                      </TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className={toolbarButtonClass}
                          onClick={handleAddVideoLink}
                        >
                          <VideoIcon className="h-5 w-5" strokeWidth={2} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Embed a video</p>
                      </TooltipContent>
                    </Tooltip>
                    
                    <div className="relative">
                      <Tooltip>
                        <TooltipTrigger asChild>
                                                  <button
                          className={toolbarButtonClass}
                          onClick={openGiphySearchForContent}
                        >
                          <span className="font-semibold text-gray-500 text-sm tracking-wider">GIF</span>
                        </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Add GIF as attachment</p>
                        </TooltipContent>
                      </Tooltip>
                      
                      <GiphySearchModal
                        ref={giphyContainerRef} 
                        searchTerm={giphySearchTerm}
                        onSearchChange={setGiphySearchTerm}
                        fetchGifs={fetchGifsForSearch}
                        fetchGifsByCategory={fetchGifsForCategory}
                        onGifSelect={handleGifSelected}
                        visible={showGiphySearch}
                        activeCategory={activeGifCategory}
                        onClose={() => setShowGiphySearch(false)}
                        standalone={false}
                      />
                    </div>

                    <div className="relative">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            className={showPollCreator ? activeToolbarButtonClass : toolbarButtonClass}
                            onClick={togglePollCreator}
                          >
                            <BarChart className="h-5 w-5" strokeWidth={2} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Create a poll</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  
                  <div className="relative">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className={toolbarButtonClass}
                          onClick={toggleEmojiPicker}
                        >
                          <Smile className="h-5 w-5" strokeWidth={2} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Add emoji</p>
                      </TooltipContent>
                    </Tooltip>
                    
                    <EmojiPickerModal 
                      ref={emojiPickerRef}
                      visible={showEmojiPicker}
                      onEmojiSelect={handleEmojiSelectInternal}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <CategorySelector
                    selectedCategoryId={categoryId}
                    onCategoryChange={setCategoryId}
                    categories={categories || []}
                    loading={categoriesLoading}
                    error={!!categoriesError}
                    toolbarButtonClass={toolbarButtonClass}
                    activeToolbarButtonClass={activeToolbarButtonClass}
                  />
                  
                  <div className="ml-auto flex items-center space-x-3">
                    <button
                      type="button" 
                      onClick={handleCloseAttempt} 
                      className="rounded-md px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-800 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-300 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={(!title.trim() && !content.trim()) || isSubmitting || uploadingFiles.size > 0}
                      className={`rounded-md px-4 py-2.5 text-sm font-medium text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 transition-colors ${
                        (!title.trim() && !content.trim()) || isSubmitting || uploadingFiles.size > 0
                        ? 'bg-teal-400 cursor-not-allowed opacity-70' 
                        : 'bg-teal-600 hover:bg-teal-700'
                      }`}
                    >
                      {submitButtonText}
                    </button>
                  </div>
                </div>
              </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <VideoLinkModal 
        isOpen={isVideoLinkModalOpen}
        onClose={() => setIsVideoLinkModalOpen(false)}
        onSubmit={handleVideoUrlSubmit}
      />

      <LinkModal 
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        onSubmit={handleLinkSubmit}
      />
      
      <VideoPlayerModal 
        isOpen={isVideoPlayerModalOpen}
        onClose={() => setIsVideoPlayerModalOpen(false)}
        videoUrl={selectedVideo.url}
        videoId={selectedVideo.videoId}
        videoPlatform={selectedVideo.platform as 'youtube' | 'vimeo' | 'other' | undefined}
      />

      {/* Close Confirmation Dialog */}
      <Dialog.Root open={showCloseConfirmation} onOpenChange={setShowCloseConfirmation}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-overlayShow z-[100]" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[100] w-full max-w-md rounded-xl bg-white p-6 shadow-xl focus:outline-none dark:bg-gray-800 dark:text-white">
            <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Discard post?
            </Dialog.Title>
            <Dialog.Description className="text-sm text-gray-600 dark:text-gray-300 mb-6">
              You have unsaved changes. Are you sure you want to discard your post?
            </Dialog.Description>
            
            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowCloseConfirmation(false)}
                className="rounded-md px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-800 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-300 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700 transition-colors"
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={handleActualClose}
                className="rounded-md px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 transition-colors"
              >
                Discard post
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      </TooltipProvider>
    </>
  );
};