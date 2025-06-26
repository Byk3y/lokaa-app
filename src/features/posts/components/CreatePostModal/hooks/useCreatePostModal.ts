import { useState, useEffect, useRef, useMemo } from 'react';
import { useAttachments } from '../../../hooks/useAttachments';
import { useEmojiPicker } from '../../../hooks/useEmojiPicker';
import { useGiphySearch } from '../../../hooks/useGiphySearch';
import { usePostSubmission } from '../../../hooks/usePostSubmission';
import { usePostForm } from '../../../hooks/usePostForm';
import { useSpaceHasPosts } from '../../../hooks/useSpaceHasPosts';
import { generateUUID } from '@/utils/uuid';
import type { CreatePostModalProps } from '../types';

/**
 * Consolidated hook for CreatePostModal state and logic
 * Extracts all the complex state management from the component
 */
export function useCreatePostModal({
  isOpen,
  onClose,
  spaceId,
  currentUserId,
  spaceName,
  onPostCreated,
  editMode = false,
  post,
  onPostUpdated,
}: CreatePostModalProps) {
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Form state management
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
  
  // Content GIF state
  const [selectedContentGifUrls, setSelectedContentGifUrls] = useState<string[]>(
    editMode && post?.content_gif_url ? [post.content_gif_url] : []
  );
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
  
  // Transform post media_urls into proper Attachment format for edit mode
  const initialAttachments = useMemo(() => {
    if (!editMode || !post?.media_urls || !Array.isArray(post.media_urls)) {
      return [];
    }
    
    return post.media_urls.map((media: any, index: number) => ({
      id: media.id || `media-${index}`,
      type: media.type || 'file',
      url: media.url || '',
      name: media.name || media.fileName || `Attachment ${index + 1}`,
      fileType: media.fileType || media.mimeType || (media.url?.includes('.jpg') || media.url?.includes('.jpeg') ? 'image/jpeg' : 
                media.url?.includes('.png') ? 'image/png' : 
                media.url?.includes('.gif') ? 'image/gif' : 
                media.url?.includes('.pdf') ? 'application/pdf' : 'application/octet-stream'),
      fileSize: media.fileSize || media.size,
      storagePath: media.storagePath,
      videoPlatform: media.videoPlatform,
      videoId: media.videoId,
      thumbnailUrl: media.thumbnailUrl
    }));
  }, [editMode, post?.media_urls]);

  // Attachments management
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
    initialAttachments
  });
  
  // Emoji picker management
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
  
  // Giphy search management
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
  
  // Post submission management
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
      if (editMode) return;
      if (onPostCreated) {
        onPostCreated();
      }
    }
  });
  
  // Space posts check
  const { isEmptySpace, loading: checkingPosts } = useSpaceHasPosts(spaceId);
  
  // Helper functions
  const handleRemoveContentGif = (indexToRemove: number) => {
    setSelectedContentGifUrls(prevUrls => prevUrls.filter((_, index) => index !== indexToRemove));
  };

  const hasContent = () => {
    return title.trim() !== '' || 
           content.trim() !== '' || 
           attachments.length > 0 || 
           selectedContentGifUrls.length > 0 ||
           pollOptions.some(option => option.text.trim() !== '');
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

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    if (uploadingFiles.size > 0) {
      return;
    }
    
    // Process content GIFs and embed them in content
    let finalContent = content;
    
    // If editing, remove existing GIF HTML from content
    if (editMode && post?.content) {
      const gifTagRegex = /<img\s+[^>]*src="[^"]*\.gif[^"]*"[^>]*>/gi;
      finalContent = content.replace(gifTagRegex, '').trim();
    }
    
    // Add selected content GIFs as HTML at the end of content
    if (selectedContentGifUrls.length > 0) {
      const gifHtmlTags = selectedContentGifUrls.map(gifUrl => {
        return `<img src="${gifUrl}" alt="GIF" width="210" height="210" />`;
      }).join('\n');
      
      if (finalContent.trim()) {
        finalContent = `${finalContent}\n\n${gifHtmlTags}`;
      } else {
        finalContent = gifHtmlTags;
      }
    }
    
    const response = await submitPost({
      title,
      content: finalContent,
      categoryId: getSubmissionCategoryId(),
      attachments,
      pollData: getPreparedPollData(),
      categories,
      content_gif_url: null
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

  // Initialize GIFs for edit mode
  useEffect(() => {
    if (!isOpen) {
      if (!editMode) {
        setTitle('');
        setContent('');
        setCategoryId(null);
      }
      setSelectedContentGifUrls([]);
    } else {
      if (editMode && post) {
        const gifUrls: string[] = [];
        
        // Check for content_gif_url (direct GIF field) - legacy support
        if (post.content_gif_url) {
          gifUrls.push(post.content_gif_url);
        }
        
        // Extract GIFs from HTML content field
        if (post.content) {
          const gifTagRegex = /<img\s+[^>]*src="([^"]*\.gif[^"]*)"[^>]*>/gi;
          let match;
          while ((match = gifTagRegex.exec(post.content)) !== null) {
            const gifUrl = match[1];
            if (gifUrl && !gifUrls.includes(gifUrl)) {
              gifUrls.push(gifUrl);
            }
          }
        }
        
        // Check for GIFs in media_urls attachments
        if (post.media_urls && Array.isArray(post.media_urls)) {
          const gifAttachments = post.media_urls.filter((media: any) => {
            return media?.type === 'file' && 
                   (media?.fileType === 'image/gif' || 
                    (typeof media?.url === 'string' && media.url.toLowerCase().includes('.gif')) ||
                    (typeof media?.url === 'string' && media.url.includes('giphy.com')));
          });
          
          gifAttachments.forEach((gif: any) => {
            if (gif.url && !gifUrls.includes(gif.url)) {
              const gifUrl = gif.directUrl || gif.url;
              gifUrls.push(gifUrl);
            }
          });
        }
        
        setSelectedContentGifUrls(gifUrls);
      } else {
        setSelectedContentGifUrls([]);
      }
    }
  }, [isOpen, editMode, setTitle, setContent, setCategoryId, post?.content_gif_url, post?.media_urls, post?.content]);

  // Show fun post ideas for empty spaces
  useEffect(() => {
    if (!editMode) {
      setShowFunPostIdeas(isEmptySpace && !checkingPosts);
    }
  }, [isEmptySpace, checkingPosts, editMode, setShowFunPostIdeas]);

  // Helper function to format file size
  const formatFileSize = (bytes?: number): string => {
    if (bytes === undefined) return '';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Style classes
  const toolbarButtonClass = "inline-flex items-center justify-center text-gray-500 hover:text-teal-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-teal-400 dark:hover:bg-gray-800 transition-colors rounded-full p-2.5";
  const activeToolbarButtonClass = "inline-flex items-center justify-center text-teal-600 bg-teal-50 dark:text-teal-400 dark:bg-gray-700 rounded-full p-2.5";

  return {
    // Form state
    title,
    setTitle,
    content,
    setContent,
    contentTextareaRef,
    categoryId,
    setCategoryId,
    showFunPostIdeas,
    setShowFunPostIdeas,
    applyPostTemplate,
    
    // Poll state
    pollOptions,
    showPollCreator,
    handlePollOptionChange,
    addPollOption,
    removePollOption,
    togglePollCreator,
    
    // Categories
    categories,
    categoriesLoading,
    categoriesError,
    
    // Content GIFs
    selectedContentGifUrls,
    handleRemoveContentGif,
    
    // Attachments
    attachments,
    uploadingFiles,
    fileInputRef,
    triggerFileSelector,
    handleFileSelected,
    handleRemoveAttachment,
    resetAttachments,
    
    // Modals
    isVideoLinkModalOpen,
    setIsVideoLinkModalOpen,
    isLinkModalOpen,
    setIsLinkModalOpen,
    isVideoPlayerModalOpen,
    setIsVideoPlayerModalOpen,
    selectedVideo,
    showCloseConfirmation,
    setShowCloseConfirmation,
    
    // Video/Link handlers
    handleAddVideoLink,
    handleAddLink,
    handleVideoUrlSubmit,
    handleLinkSubmit,
    handleVideoPreviewClick,
    
    // Emoji picker
    showEmojiPicker,
    emojiPickerRef,
    handleEmojiSelectInternal,
    toggleEmojiPicker,
    
    // Giphy search
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
    
    // Submission
    isSubmitting,
    submitError,
    
    // Handlers
    handleCloseAttempt,
    handleActualClose,
    handleSubmit,
    hasContent,
    formatFileSize,
    
    // Styles
    toolbarButtonClass,
    activeToolbarButtonClass,
  };
} 