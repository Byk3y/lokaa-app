import React, { useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowLeft, X } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PollCreatorSection } from '../PollCreatorSection';

// Import extracted components
import { PostFormHeader } from './components/PostFormHeader';
import { PostFormInputs } from './components/PostFormInputs';
import { PostFormToolbar } from './components/PostFormToolbar';
import { AttachmentPreviewGrid } from './components/AttachmentPreviewGrid';
import { ModalCollection } from './components/ModalCollection';

// Import the consolidated hook
import { useCreatePostModal } from './hooks/useCreatePostModal';
import type { CreatePostModalProps } from './types';

/**
 * Mobile CreatePostModal - Skool-style fullscreen experience
 * Optimized for mobile devices with fullscreen layout and mobile-first interactions
 */
export const CreatePostModalMobile: React.FC<CreatePostModalProps> = (props) => {
  const {
    isOpen,
    onClose,
    spaceId,
    currentUserId,
    spaceName,
    userName,
    userAvatarUrl,
    editMode = false
  } = props;

  // All logic consolidated in custom hook
  const modalState = useCreatePostModal(props);

  // Prevent body scroll when modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    if (isOpen) {
      document.body.style.overflow = 'hidden'; // Prevent background scroll on mobile
    } else {
      document.body.style.overflow = originalOverflow;
    }
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Mobile submit button text
  const submitButtonText = modalState.isSubmitting 
    ? (editMode ? "Updating..." : "Posting...") 
    : modalState.uploadingFiles.size > 0
    ? "Uploading..."
    : (editMode ? "Update" : "Post");

  const isSubmitDisabled = !modalState.hasContent() || modalState.isSubmitting || modalState.uploadingFiles.size > 0;

  return (
    <>
      <TooltipProvider>
        <Dialog.Root open={isOpen} onOpenChange={modalState.handleCloseAttempt}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-overlayShow z-40" />
            <Dialog.Content className="fixed inset-0 z-50 bg-white dark:bg-gray-800 dark:text-white data-[state=open]:animate-contentShow flex flex-col">
              
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
            
              {/* Mobile Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <button
                  onClick={modalState.handleCloseAttempt}
                  className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  <ArrowLeft className="h-6 w-6 text-gray-700 dark:text-gray-300" />
                </button>
                
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editMode ? "Edit Post" : "New Post"}
                </h1>
                
                <button
                  onClick={modalState.handleSubmit}
                  disabled={isSubmitDisabled}
                  className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                    isSubmitDisabled
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-teal-600 text-white hover:bg-teal-700'
                  }`}
                >
                  {submitButtonText}
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-4 space-y-6">
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
                </div>
              </div>

              {/* Mobile Bottom Toolbar */}
              <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex-shrink-0">
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