import React, { Suspense, lazy } from 'react';
import PostDetailModal from "@/components/space/post-detail/PostDetailModal";
import type { PostCardProps } from "@/features/posts/types/postCard";

// Lazy load heavy modal components
const CreatePostModal = lazy(() => import("@/features/posts/components/CreatePostModal").then(module => ({ default: module.CreatePostModal })));
const CreateCategoryModal = lazy(() => import("@/components/space/CreateCategoryModal"));

interface ModalStates {
  isCreatePostOpen: boolean;
  isCategoryOpen: boolean;
  isPostDetailOpen: boolean;
  selectedPostForModal: PostCardProps | null;
  isLoadingUrlPost: boolean;
  urlPostError: string | null;
}

interface FeedModalsProps {
  modalStates: ModalStates;
  currentSpaceData: any;
  currentUser: any;
  
  // Modal handlers
  handleClosePostModal: () => void;
  closeCreatePostModal: () => void;
  closeCategoryModal: () => void;
  
  // Post handlers
  handlePostCreated: () => void;
  handleCommentAddedInModal: (postId: string, newCommentCount: number) => void;
  handlePinToggled: (postId: string, isPinned: boolean, category?: string | null) => void;
  handlePostUpdated: (updatedPost: PostCardProps) => void;
  handlePostDeleted: (postId: string) => void;
  handleLikeToggledInCard: (postId: string, newLikeCount: number) => void;
  
  // Category handlers
  refreshCategories: () => void;
}

const ModalLoadingFallback: React.FC = () => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="text-white">Loading...</div>
  </div>
);

export const FeedModals: React.FC<FeedModalsProps> = ({
  modalStates,
  currentSpaceData,
  currentUser,
  handleClosePostModal,
  closeCreatePostModal,
  closeCategoryModal,
  handlePostCreated,
  handleCommentAddedInModal,
  handlePinToggled,
  handlePostUpdated,
  handlePostDeleted,
  handleLikeToggledInCard,
  refreshCategories,
}) => {
  return (
    <>
      {/* URL Post Loading Overlay */}
      {modalStates.isLoadingUrlPost && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-4">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-lg font-medium">Loading post...</span>
          </div>
        </div>
      )}

      {/* URL Post Error Display */}
      {modalStates.urlPostError && !modalStates.isLoadingUrlPost && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-semibold text-red-600 mb-2">Post Not Found</h3>
            <p className="text-gray-600 mb-4">{modalStates.urlPostError}</p>
            <div className="flex space-x-3">
              <button 
                onClick={() => window.location.href = `/${currentSpaceData?.subdomain || window.location.pathname.split('/')[1]}/space`}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
              >
                Return to Feed
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Post Modal */}
      {modalStates.isCreatePostOpen && currentSpaceData && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <CreatePostModal
            isOpen={modalStates.isCreatePostOpen}
            onClose={closeCreatePostModal}
            spaceId={currentSpaceData.id}
            currentUserId={currentUser?.id || ''} 
            onPostCreated={handlePostCreated}
            spaceName={currentSpaceData.name || 'Current Space'}
            userName={currentUser?.user_metadata?.full_name || currentUser?.user_metadata?.name || currentUser?.email || 'User'}
            userAvatarUrl={currentUser?.user_metadata?.avatar_url}
          />
        </Suspense>
      )}
      
      {/* Create Category Modal */}
      {currentSpaceData && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <CreateCategoryModal
            isOpen={modalStates.isCategoryOpen}
            onClose={closeCategoryModal}
            spaceId={currentSpaceData.id}
            userId={currentUser?.id}
            onCategoryCreated={() => {
              closeCategoryModal();
              refreshCategories();
            }}
          />
        </Suspense>
      )}
      
      {/* Post Detail Modal */}
      {modalStates.isPostDetailOpen && modalStates.selectedPostForModal && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <PostDetailModal
            isOpen={modalStates.isPostDetailOpen}
            onClose={handleClosePostModal}
            post={modalStates.selectedPostForModal}
            onCommentAdded={handleCommentAddedInModal}
            onPinToggled={handlePinToggled}
            onPostUpdated={handlePostUpdated}
            onPostDeleted={handlePostDeleted}
            onLikeToggled={handleLikeToggledInCard}
          />
        </Suspense>
      )}
    </>
  );
};

export default FeedModals;
