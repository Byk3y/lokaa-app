import { useState, useEffect, useRef } from 'react';

/**
 * Hook for managing PostDetailModal state
 * Extracted from PostDetailModal for better separation of concerns
 */
export function usePostDetailModalState(isOpen: boolean, commentsLoading: boolean) {
  // Video player state
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<{url: string; videoId?: string | null; platform?: string}>({url: ''});
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  
  // UI state
  const [showJumpButton, setShowJumpButton] = useState(true);
  const [showPostTitle, setShowPostTitle] = useState(false);
  
  // Edit/Delete state
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Refs
  const contentRef = useRef<HTMLDivElement>(null);
  const postTitleActualRef = useRef<HTMLHeadingElement>(null);

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

  // Video handlers
  const handleVideoClick = (video: {url: string; videoId?: string | null; platform?: string}) => {
    setSelectedVideo(video);
    setIsVideoModalOpen(true);
  };

  const closeVideoModal = () => {
    setIsVideoModalOpen(false);
  };

  // Edit handlers
  const handleEditClick = () => {
    setIsEditMode(true);
  };

  const handleEditCancel = () => {
    setIsEditMode(false);
  };

  // Delete handlers
  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  // Comment navigation
  const handleCommentClick = () => {
    contentRef.current?.scrollTo({ top: contentRef.current.scrollHeight, behavior: 'smooth' });
  };

  return {
    // Video state
    isVideoModalOpen,
    selectedVideo,
    currentVideoIndex,
    setCurrentVideoIndex,
    
    // UI state
    showJumpButton,
    showPostTitle,
    
    // Edit/Delete state
    isEditMode,
    showDeleteConfirm,
    setShowDeleteConfirm,
    isDeleting,
    setIsDeleting,
    
    // Refs
    contentRef,
    postTitleActualRef,
    
    // Handlers
    handleVideoClick,
    closeVideoModal,
    handleEditClick,
    handleEditCancel,
    handleDeleteClick,
    handleCommentClick
  };
} 