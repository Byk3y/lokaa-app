import { useState, useCallback } from 'react';
import type { PostCardProps } from "@/features/posts/types/postCard";
import { log } from '@/utils/logger';

/**
 * Hook for managing feed modal states
 * Extracted from useFeedLogic to isolate modal logic and prevent unnecessary re-renders
 */
export function useFeedModals() {
  // ============================================================================
  // MODAL STATE MANAGEMENT
  // ============================================================================
  
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedPostForModal, setSelectedPostForModal] = useState<PostCardProps | null>(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isLoadingUrlPost, setIsLoadingUrlPost] = useState(false);
  const [urlPostError, setUrlPostError] = useState<string | null>(null);

  // ============================================================================
  // MODAL HANDLERS (STABLE)
  // ============================================================================
  
  const openCreatePostModal = useCallback(() => {
    log.debug('Hook', '[FeedModals] Opening create post modal');
    setIsCreatePostModalOpen(true);
  }, []);

  const closeCreatePostModal = useCallback(() => {
    log.debug('Hook', '[FeedModals] Closing create post modal');
    setIsCreatePostModalOpen(false);
  }, []);

  const openCategoryModal = useCallback(() => {
    setIsCategoryModalOpen(true);
  }, []);

  const closeCategoryModal = useCallback(() => {
    setIsCategoryModalOpen(false);
  }, []);

  const handleClosePostModal = useCallback(() => {
    log.debug('Hook', '[FeedModals] Closing post modal');
    setIsPostModalOpen(false);
    setSelectedPostForModal(null);
  }, []);

  const setPostModalOpen = useCallback((isOpen: boolean) => {
    setIsPostModalOpen(isOpen);
  }, []);

  const setSelectedPost = useCallback((post: PostCardProps | null) => {
    setSelectedPostForModal(post);
  }, []);

  const setUrlPostLoading = useCallback((loading: boolean) => {
    setIsLoadingUrlPost(loading);
  }, []);

  const setUrlPostErrorState = useCallback((error: string | null) => {
    setUrlPostError(error);
  }, []);

  // ============================================================================
  // MODAL STATES OBJECT
  // ============================================================================
  
  const modalStates = {
    isCreatePostOpen: isCreatePostModalOpen,
    isCategoryOpen: isCategoryModalOpen,
    isPostDetailOpen: isPostModalOpen,
    selectedPostForModal,
    isLoadingUrlPost,
    urlPostError,
  };

  // ============================================================================
  // RETURN INTERFACE
  // ============================================================================
  
  return {
    // Modal states
    modalStates,
    
    // Individual state getters
    isCreatePostModalOpen,
    isCategoryModalOpen,
    selectedPostForModal,
    isPostModalOpen,
    isLoadingUrlPost,
    urlPostError,
    
    // Modal handlers
    openCreatePostModal,
    closeCreatePostModal,
    openCategoryModal,
    closeCategoryModal,
    handleClosePostModal,
    
    // State setters
    setPostModalOpen,
    setSelectedPost,
    setUrlPostLoading,
    setUrlPostErrorState,
  };
}
