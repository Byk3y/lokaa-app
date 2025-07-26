import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Paperclip, Link as LinkIcon, Video as VideoIcon, ImageIcon, Gift, Smile, BarChart, FileText, File } from 'lucide-react';
import { formatAsTitle } from '@/utils/textUtils';
import * as Dialog from '@radix-ui/react-dialog';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { generateUUID } from '@/utils/uuid';
import { toTitleCase } from '@/utils/textFormatting';

// Import mobile detection utility
import { shouldEnableMobileFeatures } from '@/utils/mobileDetection';

// Import our components
import { EmojiPickerModal } from './modals/EmojiPickerModal';
import { GiphySearchModal } from './modals/GiphySearchModal';
import { VideoLinkModal } from './modals/VideoLinkModal';
import { LinkModal } from './modals/LinkModal';
import { VideoPlayerModal } from './modals/VideoPlayerModal';
import { PostTemplateSelector } from './PostTemplateSelector';
import { PollCreatorSection } from './PollCreatorSection';
import { CategorySelector } from './CategorySelector';
import { UploadProgressIndicator } from './CreatePostModal/components/UploadProgressIndicator';

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

// Import test utilities (development only) - REMOVED: logImplementationStatus not used

// Import file utils for formatFileSize
import { formatFileSize } from '../utils/fileUtils';

/**
 * 🎉 ENHANCED CreatePostModal - Mobile Fullscreen + Desktop Modal
 * 
 * Key improvements:
 * - Mobile detection for fullscreen Skool-style experience
 * - Desktop modal with existing functionality
 * - Unified codebase for both platforms
 * - Fixed ref forwarding issues
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
  const [modalPosition, setModalPosition] = useState({ top: 0 });
  
  // 📱 MOBILE DETECTION
  const isMobile = shouldEnableMobileFeatures();
  
  // Calculate modal position based on composer element
  useEffect(() => {
    if (isOpen && !isMobile) {
      const composerElement = document.querySelector('[data-composer="true"]');
      if (composerElement) {
        const rect = composerElement.getBoundingClientRect();
        setModalPosition({ top: rect.bottom + window.scrollY + 8 }); // 8px gap
      }
    }
  }, [isOpen, isMobile]);
  
  // 🧹 CONSOLIDATED: All form logic in one hook
  const {
    title, setTitle, content, setContent, categoryId, setCategoryId,
    showFunPostIdeas, setShowFunPostIdeas, pollOptions, showPollCreator,
    handlePollOptionChange, addPollOption, removePollOption, togglePollCreator,
    categories, categoriesLoading, categoriesError, applyPostTemplate,
    validateForm, getPreparedPollData, getSubmissionCategoryId
  } = usePostForm({ spaceId, editMode, post, isOpen });
  
  const [selectedContentGifUrls, setSelectedContentGifUrls] = useState<string[]>(
    editMode && post?.content_gif_url ? [post.content_gif_url] : []
  );
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
  
  // 🎯 SIMPLIFIED: Attachments with streamlined initial state
  const initialAttachments = useMemo(() => {
    if (!editMode || !post?.media_urls || !Array.isArray(post.media_urls)) return [];
    return post.media_urls.map((media: any, index: number) => ({
      id: media.id || `media-${index}`,
      type: media.type || 'file',
      url: media.url || '',
      name: media.name || media.fileName || `Attachment ${index + 1}`,
      fileType: media.fileType || media.mimeType || 'application/octet-stream',
      fileSize: media.fileSize || media.size,
      storagePath: media.storagePath,
      videoPlatform: media.videoPlatform,
      videoId: media.videoId,
      thumbnailUrl: media.thumbnailUrl
    }));
  }, [editMode, post?.media_urls]);

  // 🚀 STREAMLINED: Attachment management
  const {
    attachments, isVideoLinkModalOpen, setIsVideoLinkModalOpen,
    isLinkModalOpen, setIsLinkModalOpen, fileInputRef,
    isVideoPlayerModalOpen, setIsVideoPlayerModalOpen, selectedVideo,
    uploadingFiles, resetAttachments, triggerFileSelector, handleFileSelected,
    handleAddVideoLink, handleAddLink, handleVideoUrlSubmit, handleLinkSubmit,
    handleRemoveAttachment, handleVideoPreviewClick
  } = useAttachments({ spaceId, userId: currentUserId, isOpen, editMode, initialAttachments });
  
  // 🎭 CLEAN: Emoji picker
  const { showEmojiPicker, emojiPickerRef, handleEmojiSelect, toggleEmojiPicker } = useEmojiPicker({
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
  
  // 🎬 ORGANIZED: Giphy search
  const {
    showGiphySearch, setShowGiphySearch, giphySearchTerm, setGiphySearchTerm,
    activeGifCategory, giphyContainerRef, fetchGifsForSearch, fetchGifsForCategory,
    handleGifSelected, toggleGiphySearch, openGiphySearchForContent
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
  
  // ⚡ OPTIMIZED: Post submission
  const { isSubmitting, submitError, submitPost } = usePostSubmission({
    spaceId, userId: currentUserId, editMode, post, onPostCreated, onPostUpdated,
    openPostModal: (newPost) => {
      if (editMode) return;
      if (onPostCreated) onPostCreated();
    }
  });
  
  // 🏠 SMART: Empty space detection
  const { isEmptySpace, loading: checkingPosts } = useSpaceHasPosts(spaceId);
  
  useEffect(() => {
    if (!editMode) {
      setShowFunPostIdeas(isEmptySpace && !checkingPosts);
    }
  }, [isEmptySpace, checkingPosts, editMode, setShowFunPostIdeas]);

  // 🎨 STYLES: Consistent button styling
  const toolbarButtonClass = "inline-flex items-center justify-center text-gray-500 hover:text-teal-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-teal-400 dark:hover:bg-gray-800 transition-colors rounded-full p-2.5";
  const activeToolbarButtonClass = "inline-flex items-center justify-center text-teal-600 bg-teal-50 dark:text-teal-400 dark:bg-gray-700 rounded-full p-2.5";
  
  // 📝 DYNAMIC: Submit button text
  const submitButtonText = isSubmitting 
    ? (editMode ? "Updating..." : "Posting...") 
    : uploadingFiles.size > 0 ? "Uploading files..." : (editMode ? "Update Post" : "Post");
  
  // 🗑️ HELPER: Remove content GIF
  const handleRemoveContentGif = (indexToRemove: number) => {
    setSelectedContentGifUrls(prevUrls => prevUrls.filter((_, index) => index !== indexToRemove));
  };

  // 🚪 SMART: Close handling with content check
  const hasContent = () => {
    return title.trim() !== '' || content.trim() !== '' || attachments.length > 0 || 
           selectedContentGifUrls.length > 0 || pollOptions.some(option => option.text.trim() !== '');
  };

  const handleCloseAttempt = () => {
    if (hasContent() && !editMode) {
      setShowCloseConfirmation(true);
    } else {
      handleActualClose();
    }
  };

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

  // 🚀 STREAMLINED: Submit logic
  const handleSubmit = async () => {
    if (!validateForm() || uploadingFiles.size > 0) return;
    
    let finalContent = content;
    
    if (editMode && post?.content) {
      const gifTagRegex = /<img\s+[^>]*src="[^"]*\.gif[^"]*"[^>]*>/gi;
      finalContent = content.replace(gifTagRegex, '').trim();
    }
    
    if (selectedContentGifUrls.length > 0) {
      const gifHtmlTags = selectedContentGifUrls.map(gifUrl => 
        `<img src="${gifUrl}" alt="GIF" width="210" height="210" />`
      ).join('\n');
      
      finalContent = finalContent.trim() ? `${finalContent}\n\n${gifHtmlTags}` : gifHtmlTags;
    }
    
    const response = await submitPost({
      title, content: finalContent, categoryId: getSubmissionCategoryId(),
      attachments, pollData: getPreparedPollData(), categories, content_gif_url: null
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
  
  // 📱 MOBILE BODY SCROLL MANAGEMENT: Enhanced for fullscreen
  useEffect(() => {
    if (isOpen) {
      if (isMobile) {
        // Mobile: Prevent all background scrolling for fullscreen experience
        const originalOverflow = document.body.style.overflow;
        const originalPosition = document.body.style.position;
        const originalTop = document.body.style.top;
        const originalWidth = document.body.style.width;
        const originalHeight = document.body.style.height;
        
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.top = '0';
        document.body.style.left = '0';
        document.body.style.width = '100%';
        document.body.style.height = '100%';
        document.documentElement.style.overflow = 'hidden';
        
        return () => {
          document.body.style.overflow = originalOverflow;
          document.body.style.position = originalPosition;
          document.body.style.top = originalTop;
          document.body.style.width = originalWidth;
          document.body.style.height = originalHeight;
          document.documentElement.style.overflow = '';
        };
      } else {
        // Desktop: Allow auto overflow
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'auto';
        return () => { document.body.style.overflow = originalOverflow; };
      }
    }
  }, [isOpen, isMobile]);

  // Auto-growing textarea for mobile
  useEffect(() => {
    if (isMobile && contentTextareaRef.current) {
      const textarea = contentTextareaRef.current;
      
      // Calculate max height (35% of viewport height)
      const maxHeight = Math.floor(window.innerHeight * 0.35);
      
      // Reset height to auto to get accurate scrollHeight
      textarea.style.height = 'auto';
      
      // Set height to scrollHeight but not exceeding maxHeight
      const newHeight = Math.min(textarea.scrollHeight, maxHeight);
      textarea.style.height = `${newHeight}px`;
      
      // Ensure overflow is handled properly
      if (textarea.scrollHeight > maxHeight) {
        textarea.style.overflowY = 'auto';
      } else {
        textarea.style.overflowY = 'hidden';
      }
    }
  }, [content, isMobile]);

  return (
    <>
      {/* Hidden File Input */}
      <input type="file" ref={fileInputRef} onChange={handleFileSelected} style={{ display: 'none' }} multiple accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,audio/*" />
      
      <TooltipProvider>
        <Dialog.Root open={isOpen} onOpenChange={handleCloseAttempt}>
          <Dialog.Portal>
            {/* Conditional overlay: No overlay for mobile fullscreen */}
            {!isMobile && <Dialog.Overlay className="fixed inset-0 bg-black/20 z-40" />}
            
            {/* UNIFIED DIALOG CONTENT - Mobile Fullscreen vs Desktop Modal */}
            {isMobile ? (
              /* MOBILE FULLSCREEN - Skool Style */
              <Dialog.Content 
                className="fixed inset-0 z-[9999] w-screen h-screen bg-white dark:bg-gray-900 flex flex-col data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
                style={{
                  margin: 0,
                  padding: 0,
                  border: 'none',
                  borderRadius: 0,
                  maxWidth: '100vw',
                  maxHeight: '100vh',
                  touchAction: 'manipulation'
                }}
              >
                <Dialog.Title className="sr-only">
                  {editMode ? "Edit Post" : `Create Post in ${spaceName}`}
                </Dialog.Title>
                <Dialog.Description className="sr-only">
                  {editMode ? `Edit your post in ${spaceName}` : `Create a new post in ${spaceName}. Add a title, content, media attachments, and categorize your post.`}
                </Dialog.Description>

                {/* Mobile Header - Exact Skool Style */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0 min-h-[60px] sticky top-0 z-10">
                  <button
                    onClick={handleCloseAttempt}
                    className="p-2 -ml-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-full transition-colors active:bg-gray-100 dark:active:bg-gray-700 relative z-20 focus:outline-none"
                    aria-label="Close"
                    style={{ touchAction: 'manipulation' }}
                  >
                    <svg className="h-6 w-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  
                  <h1 className="text-base font-semibold text-gray-900 dark:text-white">
                    {editMode ? "Edit Post" : "New Post"}
                  </h1>
                  
                  <button
                    onClick={handleSubmit}
                    disabled={(!title.trim() && !content.trim()) || isSubmitting || uploadingFiles.size > 0}
                    className={`px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 relative z-20 ${
                      (!title.trim() && !content.trim()) || isSubmitting || uploadingFiles.size > 0
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                      : 'bg-teal-600 text-white hover:bg-teal-700 active:bg-teal-800'
                    }`}
                    style={{ touchAction: 'manipulation' }}
                  >
                    {submitButtonText.toUpperCase()}
                  </button>
                </div>

                {/* Mobile Content */}
                <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900">
                  <div className="px-4 py-4 min-h-full">
                    {/* User Header */}
                    <div className="flex items-center mb-6">
                      <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-gray-200">
                        {userAvatarUrl ? (
                          <img src={userAvatarUrl} alt={userName} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gray-600 text-white text-sm font-medium">
                            {userName?.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="ml-3 min-w-0 flex-1">
                        <div className="text-base font-medium text-gray-900 dark:text-white">
                          {toTitleCase(userName || '')} <span className="text-gray-500 dark:text-gray-400 font-normal">posting in</span> <span className="font-semibold text-teal-600">{spaceName}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Form Inputs */}
                    <div className="space-y-6">
                      <div>
                        <input
                          id="post-title"
                          value={title}
                          onChange={(e) => setTitle(formatAsTitle(e.target.value))}
                          placeholder="Title"
                          className="block w-full text-xl font-bold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 bg-transparent border-none focus:outline-none focus:ring-0 p-0 mb-2"
                          style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
                        />
                      </div>

                      <div>
                        <textarea
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          placeholder="Write something..."
                          rows={8}
                          ref={contentTextareaRef}
                          spellCheck={true}
                          autoCapitalize="sentences"
                          className="block w-full text-base text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 bg-transparent border-none focus:outline-none focus:ring-0 p-0 resize-none leading-relaxed"
                          style={{ minHeight: 'auto', maxHeight: '35vh', overflowY: 'auto' }}
                        />
                      </div>
                    </div>

                    {/* Mobile Attachments Display */}
                    {(attachments.length > 0 || selectedContentGifUrls.length > 0) && (
                      <div className="mt-4">
                        {/* Content GIFs */}
                        {selectedContentGifUrls.length > 0 && (
                          <div className="mb-3">
                            <div className="flex gap-2 overflow-x-auto pb-2">
                              {selectedContentGifUrls.map((url, idx) => {
                                let displayUrl = url;
                                if (url.includes('giphy.com/gifs/')) {
                                  const gifId = url.split('-').pop();
                                  if (gifId) {
                                    displayUrl = `https://media.giphy.com/media/${gifId}/giphy.gif`;
                                  }
                                }
                                
                                return (
                                  <div key={`content-gif-${idx}`} className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-50 border border-gray-200">
                                    <img 
                                      src={displayUrl} 
                                      alt={`GIF ${idx + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                    <button
                                      onClick={() => handleRemoveContentGif(idx)} 
                                      className="absolute top-1 right-1 bg-black bg-opacity-70 text-white rounded-full p-1 hover:bg-opacity-90 transition-opacity"
                                      aria-label={`Remove GIF ${idx + 1}`}
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        
                        {/* File Attachments - Grid Layout */}
                        {attachments.length > 0 && (
                          <div className="mb-3">
                            <div className="grid grid-cols-4 gap-3">
                              {attachments.map((attachment) => (
                                <div key={attachment.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-50 border border-gray-200">
                                  {/* Image attachments */}
                                  {attachment.type === 'file' && attachment.fileType?.startsWith('image/') && attachment.url ? (
                                    <>
                                      <img 
                                        src={attachment.url} 
                                        alt={attachment.name || 'Image'}
                                        className="w-full h-full object-cover"
                                      />
                                      <button
                                        onClick={() => handleRemoveAttachment(attachment.id)} 
                                        className="absolute top-2 right-2 bg-black bg-opacity-70 text-white rounded-full p-1 hover:bg-opacity-90 transition-opacity"
                                        aria-label={`Remove ${attachment.name}`}
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                      </button>
                                    </>
                                  ) : attachment.type === 'video' ? (
                                    /* Video attachments */
                                    <>
                                      <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                          <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
                                        </svg>
                                      </div>
                                      <button
                                        onClick={() => handleRemoveAttachment(attachment.id)} 
                                        className="absolute top-2 right-2 bg-black bg-opacity-70 text-white rounded-full p-1 hover:bg-opacity-90 transition-opacity"
                                        aria-label={`Remove ${attachment.name}`}
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                      </button>
                                    </>
                                  ) : (
                                    /* File attachments */
                                    <>
                                      <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center p-2">
                                        <File className="w-6 h-6 text-gray-500 mb-1" />
                                        <span className="text-xs text-gray-600 text-center truncate w-full">{attachment.name?.split('.').pop()?.toUpperCase() || 'FILE'}</span>
                                      </div>
                                      <button
                                        onClick={() => handleRemoveAttachment(attachment.id)} 
                                        className="absolute top-2 right-2 bg-black bg-opacity-70 text-white rounded-full p-1 hover:bg-opacity-90 transition-opacity"
                                        aria-label={`Remove ${attachment.name}`}
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                      </button>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Upload Progress Indicators */}
                        {uploadingFiles.size > 0 && (
                          <div className="mb-3">
                            <div className="flex gap-2 overflow-x-auto pb-2">
                              {Array.from(uploadingFiles.entries()).map(([fileId, progress]) => (
                                <div key={`mobile-uploading-${fileId}`} className="flex-shrink-0 w-20 h-20 bg-gray-50 border border-gray-200 rounded-lg flex flex-col justify-center items-center p-2">
                                  <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
                                    <div
                                      className="bg-teal-500 h-1.5 rounded-full transition-all duration-300 ease-in-out"
                                      style={{ width: `${progress}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-xs text-gray-500">{progress}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Mobile Toolbar */}
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-start space-x-4">
                        <button
                          onClick={triggerFileSelector}
                          className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                          aria-label="Attach file"
                        >
                          <Paperclip className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        </button>
                        
                        <button
                          onClick={togglePollCreator}
                          className={`p-2 rounded-lg transition-colors ${
                            showPollCreator 
                              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                              : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                          }`}
                          aria-label="Create poll"
                        >
                          <BarChart className="h-5 w-5" />
                        </button>
                        
                        <button
                          onClick={openGiphySearchForContent}
                          className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                          aria-label="Add GIF"
                        >
                          <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">GIF</span>
                        </button>
                        
                        <CategorySelector 
                          selectedCategoryId={categoryId} 
                          onCategoryChange={setCategoryId} 
                          categories={categories || []} 
                          loading={categoriesLoading} 
                          error={!!categoriesError} 
                          toolbarButtonClass="flex items-center px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors" 
                          activeToolbarButtonClass="flex items-center px-3 py-2 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg" 
                        />
                      </div>
                    </div>

                    {/* Poll Creator */}
                    {showPollCreator && (
                      <div className="mt-6">
                        <PollCreatorSection pollOptions={pollOptions} onPollOptionChange={handlePollOptionChange} onRemovePollOption={removePollOption} onAddPollOption={addPollOption} onRemovePoll={togglePollCreator} />
                      </div>
                    )}

                    {/* Template Selector */}
                    {showFunPostIdeas && (
                      <div className="mt-6">
                        <PostTemplateSelector visible={showFunPostIdeas} onClose={() => setShowFunPostIdeas(false)} onTemplateSelect={applyPostTemplate} />
                      </div>
                    )}
                  </div>
                </div>
              </Dialog.Content>
            ) : (
              /* DESKTOP MODAL */
              <Dialog.Content 
                className="fixed left-1/2 transform -translate-x-1/2 z-50 w-full max-w-sm sm:max-w-md md:max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white pt-3 md:pt-4 px-6 pb-6 shadow-xl focus:outline-none dark:bg-gray-800 dark:text-white data-[state=open]:animate-contentExpandFromTop"
                style={{
                  top: `${modalPosition.top}px`
                }}
              >
                <Dialog.Title className="sr-only">{editMode ? "Edit Post" : `Create Post in ${spaceName}`}</Dialog.Title>
                <Dialog.Description className="sr-only">{editMode ? `Edit your post in ${spaceName}` : `Create a new post in ${spaceName}. Add a title, content, media attachments, and categorize your post.`}</Dialog.Description>
              
                <div className="space-y-5">
                  {/* User Header */}
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
                        {toTitleCase(userName || '')} <span className="text-gray-600">{editMode ? 'editing post in' : 'posting in'}</span> <span className="font-bold text-teal-600 text-lg">{spaceName.charAt(0).toUpperCase() + spaceName.slice(1)}</span>
                      </span>
                    </div>
                  </div>
                  
                  {/* Form Inputs */}
                  <div>
                    <input id="post-title" value={title} onChange={(e) => setTitle(formatAsTitle(e.target.value))} placeholder="Give your post a title" className="block w-full rounded-md py-2 sm:py-3 px-3 text-base font-semibold font-sans tracking-tight capitalize placeholder-gray-400 focus:outline-none focus:ring-0 border-b-2 border-gray-200 focus:border-teal-500 transition-colors dark:bg-gray-800 dark:text-white dark:border-gray-700 dark:focus:border-teal-400" />
                  </div>

                  <div>
                    <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="What's on your mind?" rows={4} ref={contentTextareaRef} spellCheck={true} autoCapitalize="sentences" className="block w-full rounded-md py-2 px-3 text-sm sm:text-base font-normal font-sans normal-case leading-relaxed placeholder-gray-400 focus:outline-none focus:ring-0 dark:bg-gray-800 dark:text-white" />
                    <p className="text-xs text-gray-500 mt-2 dark:text-gray-400">Please keep posts respectful and relevant to the space.</p>
                  </div>
                  
                  {/* Desktop Attachments Display */}
                  {(attachments.length > 0 || selectedContentGifUrls.length > 0) && (
                    <div>
                      {/* Content GIFs */}
                      {selectedContentGifUrls.length > 0 && (
                        <div className="mb-3">
                          <div className="grid grid-cols-3 gap-3">
                            {selectedContentGifUrls.map((url, idx) => {
                              let displayUrl = url;
                              if (url.includes('giphy.com/gifs/')) {
                                const gifId = url.split('-').pop();
                                if (gifId) {
                                  displayUrl = `https://media.giphy.com/media/${gifId}/giphy.gif`;
                                }
                              }
                              
                              return (
                                <div key={`content-gif-${idx}`} className="relative rounded-lg overflow-hidden bg-gray-50 aspect-square">
                                  <img 
                                    src={displayUrl} 
                                    alt={`GIF ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                  <button
                                    onClick={() => handleRemoveContentGif(idx)} 
                                    className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-1 hover:bg-opacity-70 transition-opacity"
                                    aria-label={`Remove GIF ${idx + 1}`}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* File Attachments - Grid Layout */}
                      {attachments.length > 0 && (
                        <div className="mb-3">
                          <div className="grid grid-cols-4 gap-3">
                            {attachments.map((attachment) => (
                              <div key={attachment.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-50 border border-gray-200">
                                {/* Image attachments */}
                                {attachment.type === 'file' && attachment.fileType?.startsWith('image/') && attachment.url ? (
                                  <>
                                    <img 
                                      src={attachment.url} 
                                      alt={attachment.name || 'Image'}
                                      className="w-full h-full object-cover"
                                    />
                                    <button
                                      onClick={() => handleRemoveAttachment(attachment.id)} 
                                      className="absolute top-2 right-2 bg-black bg-opacity-70 text-white rounded-full p-1 hover:bg-opacity-90 transition-opacity"
                                      aria-label={`Remove ${attachment.name}`}
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                    </button>
                                  </>
                                ) : attachment.type === 'video' ? (
                                  /* Video attachments */
                                  <>
                                    <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
                                      </svg>
                                    </div>
                                    <button
                                      onClick={() => handleRemoveAttachment(attachment.id)} 
                                      className="absolute top-2 right-2 bg-black bg-opacity-70 text-white rounded-full p-1 hover:bg-opacity-90 transition-opacity"
                                      aria-label={`Remove ${attachment.name}`}
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                    </button>
                                  </>
                                ) : (
                                  /* File attachments */
                                  <>
                                    <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center p-2">
                                      <File className="w-6 h-6 text-gray-500 mb-1" />
                                      <span className="text-xs text-gray-600 text-center truncate w-full">{attachment.name?.split('.').pop()?.toUpperCase() || 'FILE'}</span>
                                    </div>
                                    <button
                                      onClick={() => handleRemoveAttachment(attachment.id)} 
                                      className="absolute top-2 right-2 bg-black bg-opacity-70 text-white rounded-full p-1 hover:bg-opacity-90 transition-opacity"
                                      aria-label={`Remove ${attachment.name}`}
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                    </button>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Upload Progress Indicators */}
                      {uploadingFiles.size > 0 && (
                        <div className="mt-3">
                          <div className="grid grid-cols-3 gap-3">
                            {Array.from(uploadingFiles.entries()).map(([fileId, progress]) => (
                              <div key={`desktop-uploading-${fileId}`} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 flex flex-col justify-center items-center aspect-square">
                                <p className="text-xs font-medium text-teal-600 dark:text-teal-400 text-center mb-2">Uploading...</p>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                                  <div
                                    className="bg-teal-500 h-2 rounded-full transition-all duration-300 ease-in-out"
                                    style={{ width: `${progress}%` }}
                                  ></div>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{progress}%</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Template Selector */}
                  {showFunPostIdeas && (
                    <div className="my-5">
                      <PostTemplateSelector visible={showFunPostIdeas} onClose={() => setShowFunPostIdeas(false)} onTemplateSelect={applyPostTemplate} />
                    </div>
                  )}

                  {/* Poll Creator */}
                  {showPollCreator && (
                    <div className="mb-5">
                      <PollCreatorSection pollOptions={pollOptions} onPollOptionChange={handlePollOptionChange} onRemovePollOption={removePollOption} onAddPollOption={addPollOption} onRemovePoll={togglePollCreator} />
                    </div>
                  )}

                  {/* Toolbar & Actions */}
                  <div className="mt-4 flex justify-between items-center dark:border-gray-700">
                    <div className="flex items-center space-x-2">
                      <Tooltip><TooltipTrigger asChild><button className={toolbarButtonClass} onClick={triggerFileSelector}><Paperclip className="h-5 w-5" strokeWidth={2} /></button></TooltipTrigger><TooltipContent><p>Attach a file</p></TooltipContent></Tooltip>
                      <Tooltip><TooltipTrigger asChild><button className={toolbarButtonClass} onClick={handleAddLink}><LinkIcon className="h-5 w-5" strokeWidth={2} /></button></TooltipTrigger><TooltipContent><p>Add a link</p></TooltipContent></Tooltip>
                      <Tooltip><TooltipTrigger asChild><button className={toolbarButtonClass} onClick={handleAddVideoLink}><VideoIcon className="h-5 w-5" strokeWidth={2} /></button></TooltipTrigger><TooltipContent><p>Embed a video</p></TooltipContent></Tooltip>
                      <Tooltip><TooltipTrigger asChild><button className={toolbarButtonClass} onClick={openGiphySearchForContent}><span className="font-semibold text-gray-500 text-sm tracking-wider">GIF</span></button></TooltipTrigger><TooltipContent><p>Add GIF</p></TooltipContent></Tooltip>
                      <Tooltip><TooltipTrigger asChild><button className={showPollCreator ? activeToolbarButtonClass : toolbarButtonClass} onClick={togglePollCreator}><BarChart className="h-5 w-5" strokeWidth={2} /></button></TooltipTrigger><TooltipContent><p>Create a poll</p></TooltipContent></Tooltip>
                      <Tooltip><TooltipTrigger asChild><button className={toolbarButtonClass} onClick={toggleEmojiPicker}><Smile className="h-5 w-5" strokeWidth={2} /></button></TooltipTrigger><TooltipContent><p>Add emoji</p></TooltipContent></Tooltip>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <CategorySelector selectedCategoryId={categoryId} onCategoryChange={setCategoryId} categories={categories || []} loading={categoriesLoading} error={!!categoriesError} toolbarButtonClass={toolbarButtonClass} activeToolbarButtonClass={activeToolbarButtonClass} />
                      <button type="button" onClick={handleCloseAttempt} className="rounded-md px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-800 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-300 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700 transition-colors">Cancel</button>
                      <button onClick={handleSubmit} disabled={(!title.trim() && !content.trim()) || isSubmitting || uploadingFiles.size > 0} className={`rounded-md px-4 py-2.5 text-sm font-medium text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 transition-colors ${(!title.trim() && !content.trim()) || isSubmitting || uploadingFiles.size > 0 ? 'bg-teal-400 cursor-not-allowed opacity-70' : 'bg-teal-600 hover:bg-teal-700'}`}>{submitButtonText}</button>
                    </div>
                  </div>

                  {/* Desktop Modals */}
                  <GiphySearchModal ref={giphyContainerRef} searchTerm={giphySearchTerm} onSearchChange={setGiphySearchTerm} fetchGifs={fetchGifsForSearch} fetchGifsByCategory={fetchGifsForCategory} onGifSelect={handleGifSelected} visible={showGiphySearch} activeCategory={activeGifCategory} onClose={() => setShowGiphySearch(false)} standalone={false} />
                  <EmojiPickerModal ref={emojiPickerRef} visible={showEmojiPicker} onEmojiSelect={handleEmojiSelect} />
                </div>
              </Dialog.Content>
            )}
          </Dialog.Portal>
        </Dialog.Root>
      </TooltipProvider>

      {/* Sub-modals */}
      <VideoLinkModal isOpen={isVideoLinkModalOpen} onClose={() => setIsVideoLinkModalOpen(false)} onSubmit={handleVideoUrlSubmit} />
      <LinkModal isOpen={isLinkModalOpen} onClose={() => setIsLinkModalOpen(false)} onSubmit={handleLinkSubmit} />
      <VideoPlayerModal isOpen={isVideoPlayerModalOpen} onClose={() => setIsVideoPlayerModalOpen(false)} videoUrl={selectedVideo.url} videoId={selectedVideo.videoId} videoPlatform={selectedVideo.platform as 'youtube' | 'vimeo' | 'other' | undefined} />

      {/* Close Confirmation */}
      <Dialog.Root open={showCloseConfirmation} onOpenChange={setShowCloseConfirmation}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-overlayShow z-[10000]" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[10001] w-full max-w-md rounded-xl bg-white p-6 shadow-xl focus:outline-none dark:bg-gray-800 dark:text-white">
            <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Discard post?</Dialog.Title>
            <Dialog.Description className="text-sm text-gray-600 dark:text-gray-300 mb-6">You have unsaved changes. Are you sure you want to discard your post?</Dialog.Description>
            <div className="flex items-center justify-end space-x-3">
              <button type="button" onClick={() => setShowCloseConfirmation(false)} className="rounded-md px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-800 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-300 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700 transition-colors">Keep editing</button>
              <button type="button" onClick={handleActualClose} className="rounded-md px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 transition-colors">Discard post</button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
};