import React, { useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PollCreatorSection } from '../PollCreatorSection';

// Import extracted components
import { PostFormHeader } from './components/PostFormHeader';
import { PostFormInputs } from './components/PostFormInputs';
import { PostFormToolbar } from './components/PostFormToolbar';
import { AttachmentPreviewGrid } from './components/AttachmentPreviewGrid';
import { PostFormActions } from './components/PostFormActions';
import { ModalCollection } from './components/ModalCollection';

// Import the consolidated hook
import { useCreatePostModal } from './hooks/useCreatePostModal';
import type { CreatePostModalProps } from './types';

/**
 * Refactored CreatePostModal - now clean and maintainable!
 * Reduced from 865 lines to ~150 lines using compound component pattern
 */
export const CreatePostModal: React.FC<CreatePostModalProps> = (props) => {
  const {
    isOpen,
    onClose,
    spaceId,
    currentUserId,
    spaceName,
    userName,
    userAvatarUrl,
    editMode = false,
    variant = 'desktop'
  } = props;

  // All logic consolidated in custom hook
  const modalState = useCreatePostModal(props);

  // Prevent body scroll when modal is open
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

  return (
    <>
      <TooltipProvider>
        <Dialog.Root open={isOpen} onOpenChange={modalState.handleCloseAttempt}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-overlayShow z-40" />
            <Dialog.Content className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-sm sm:max-w-md md:max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white pt-5 px-6 pb-6 shadow-xl focus:outline-none dark:bg-gray-800 dark:text-white data-[state=open]:animate-contentShow overflow-visible">
              
              {/* Hidden File Input */}
              <input
                type="file"
                ref={modalState.fileInputRef}
                onChange={modalState.handleFileSelected}
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
                {/* Header Section */}
                <PostFormHeader
                  userName={userName}
                  userAvatarUrl={userAvatarUrl}
                  spaceName={spaceName}
                  editMode={editMode}
                />
                
                {/* Form Inputs */}
                <PostFormInputs
                  title={modalState.title}
                  setTitle={modalState.setTitle}
                  content={modalState.content}
                  setContent={modalState.setContent}
                  contentTextareaRef={modalState.contentTextareaRef}
                  showFunPostIdeas={modalState.showFunPostIdeas}
                  setShowFunPostIdeas={modalState.setShowFunPostIdeas}
                  applyPostTemplate={modalState.applyPostTemplate}
                />

                {/* Attachment Preview Grid */}
                <AttachmentPreviewGrid
                  selectedContentGifUrls={modalState.selectedContentGifUrls}
                  attachments={modalState.attachments}
                  uploadingFiles={modalState.uploadingFiles}
                  onRemoveContentGif={modalState.handleRemoveContentGif}
                  onRemoveAttachment={modalState.handleRemoveAttachment}
                  onVideoPreviewClick={modalState.handleVideoPreviewClick}
                  formatFileSize={modalState.formatFileSize}
                />

                {/* Poll Creator Section */}
                {modalState.showPollCreator && (
                  <div className="mb-5">
                    <PollCreatorSection
                      pollOptions={modalState.pollOptions}
                      onPollOptionChange={modalState.handlePollOptionChange}
                      onRemovePollOption={modalState.removePollOption}
                      onAddPollOption={modalState.addPollOption}
                      onRemovePoll={modalState.togglePollCreator}
                    />
                  </div>
                )}

                {/* Toolbar */}
                <PostFormToolbar
                  onAttachFile={modalState.triggerFileSelector}
                  onAddLink={modalState.handleAddLink}
                  onAddVideo={modalState.handleAddVideoLink}
                  onAddGif={modalState.openGiphySearchForContent}
                  onTogglePoll={modalState.togglePollCreator}
                  onToggleEmoji={modalState.toggleEmojiPicker}
                  showPollCreator={modalState.showPollCreator}
                  toolbarButtonClass={modalState.toolbarButtonClass}
                  activeToolbarButtonClass={modalState.activeToolbarButtonClass}
                />

                {/* Actions */}
                <PostFormActions
                  categoryId={modalState.categoryId}
                  setCategoryId={modalState.setCategoryId}
                  categories={modalState.categories || []}
                  categoriesLoading={modalState.categoriesLoading}
                  categoriesError={!!modalState.categoriesError}
                  toolbarButtonClass={modalState.toolbarButtonClass}
                  activeToolbarButtonClass={modalState.activeToolbarButtonClass}
                  onCancel={modalState.handleCloseAttempt}
                  onSubmit={modalState.handleSubmit}
                  isSubmitting={modalState.isSubmitting}
                  uploadingFiles={modalState.uploadingFiles}
                  hasContent={modalState.hasContent()}
                  editMode={editMode}
                />
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </TooltipProvider>

      {/* All Sub-Modals */}
      <ModalCollection
        // Emoji picker
        showEmojiPicker={modalState.showEmojiPicker}
        emojiPickerRef={modalState.emojiPickerRef}
        onEmojiSelect={modalState.handleEmojiSelectInternal}
        
        // Giphy search
        showGiphySearch={modalState.showGiphySearch}
        setShowGiphySearch={modalState.setShowGiphySearch}
        giphySearchTerm={modalState.giphySearchTerm}
        setGiphySearchTerm={modalState.setGiphySearchTerm}
        activeGifCategory={modalState.activeGifCategory}
        giphyContainerRef={modalState.giphyContainerRef}
        fetchGifsForSearch={modalState.fetchGifsForSearch}
        fetchGifsForCategory={modalState.fetchGifsForCategory}
        onGifSelected={modalState.handleGifSelected}
        
        // Video link modal
        isVideoLinkModalOpen={modalState.isVideoLinkModalOpen}
        setIsVideoLinkModalOpen={modalState.setIsVideoLinkModalOpen}
        onVideoUrlSubmit={modalState.handleVideoUrlSubmit}
        
        // Link modal
        isLinkModalOpen={modalState.isLinkModalOpen}
        setIsLinkModalOpen={modalState.setIsLinkModalOpen}
        onLinkSubmit={modalState.handleLinkSubmit}
        
        // Video player modal
        isVideoPlayerModalOpen={modalState.isVideoPlayerModalOpen}
        setIsVideoPlayerModalOpen={modalState.setIsVideoPlayerModalOpen}
        selectedVideo={modalState.selectedVideo}
        
        // Close confirmation modal
        showCloseConfirmation={modalState.showCloseConfirmation}
        setShowCloseConfirmation={modalState.setShowCloseConfirmation}
        onConfirmClose={modalState.handleActualClose}
        onCancelClose={() => modalState.setShowCloseConfirmation(false)}
      />
    </>
  );
}; 