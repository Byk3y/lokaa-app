import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { PostCardProps } from '@/features/posts/types/postCard';

export function useModalState() {
  // Modal state
  const [selectedPostForModal, setSelectedPostForModal] = useState<PostCardProps | null>(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  // Handler to open the post detail modal
  const handlePostCardClick = (post: PostCardProps, spaceSubdomain?: string) => {
    // Check if we're on mobile (< 768px)
    const isMobile = window.innerWidth < 768;
    
    // On mobile, navigate to the full page view
    if (isMobile && spaceSubdomain) {
      // Navigate to slug URL
      navigate(`/${spaceSubdomain}/space/${post.slug || post.id}`);
      return;
    }
    
    // On desktop, open the modal
    setSelectedPostForModal(post);
    setIsPostModalOpen(true);
  };

  const handleClosePostModal = () => {
    setIsPostModalOpen(false);
    setSelectedPostForModal(null);
  };

  const openCreatePostModal = () => {
    const searchParams = new URLSearchParams(location.search);
    searchParams.set('action', 'create-post');
    navigate({ search: searchParams.toString() }, { replace: true });
  };

  const closeCreatePostModal = () => {
    const searchParams = new URLSearchParams(location.search);
    searchParams.delete('action');
    navigate({ search: searchParams.toString() }, { replace: true });
  };

  const openCategoryModal = () => {
    setIsCategoryModalOpen(true);
  };

  const closeCategoryModal = () => {
    setIsCategoryModalOpen(false);
  };

  // Handle URL-based modal state
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('action') === 'create-post') {
      setIsCreatePostModalOpen(true);
    } else {
      if (isCreatePostModalOpen && !searchParams.get('action')) {
         setIsCreatePostModalOpen(false);
      }
    }
  }, [location.search, isCreatePostModalOpen]);

  // Cleanup modals on unmount
  const cleanupModals = () => {
    setSelectedPostForModal(null);
    setIsPostModalOpen(false);
    setIsCreatePostModalOpen(false);
    setIsCategoryModalOpen(false);
  };

  return {
    // State
    selectedPostForModal,
    isPostModalOpen,
    isCreatePostModalOpen,
    isCategoryModalOpen,
    
    // Actions
    handlePostCardClick,
    handleClosePostModal,
    openCreatePostModal,
    closeCreatePostModal,
    openCategoryModal,
    closeCategoryModal,
    cleanupModals,
    setSelectedPostForModal,
  };
} 