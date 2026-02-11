import React, { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { TooltipProvider } from '@/components/ui/tooltip';
import { X } from 'lucide-react';
import { PollCreatorSection } from '../PollCreatorSection';
import { CategorySelector } from '../CategorySelector';

// Import extracted components
import { PostFormHeader } from './components/PostFormHeader';
import { PostFormInputs } from './components/PostFormInputs';
import { PostFormToolbar } from './components/PostFormToolbar';
import { AttachmentPreviewGrid } from './components/AttachmentPreviewGrid';
import { PostFormActions } from './components/PostFormActions';
import { ModalCollection } from './components/ModalCollection';

// Import hooks
import { useCreatePostModal } from './hooks/useCreatePostModal';
import { useModalPositioning } from '../../hooks/useModalPositioning';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import type { CreatePostModalProps } from './types';

/**
 * CreatePostModal — Unified responsive component.
 * 
 * Mobile: fullscreen overlay with top-bar close/submit buttons.
 * Desktop: centered floating modal with auto-positioning.
 * 
 * All state consolidated in useCreatePostModal hook.
 * All sub-modals consolidated in ModalCollection.
 */
export const CreatePostModal: React.FC<CreatePostModalProps> = (props) => {
  const {
    isOpen,
    onClose,
    spaceName,
    userName,
    userAvatarUrl,
    editMode = false,
  } = props;

  // Detect mobile
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Consolidated state hook
  const modal = useCreatePostModal(props);

  // Positioning (desktop only)
  const { modalPosition } = useModalPositioning({ isOpen, isMobile });

  // Body scroll lock (mobile only)
  useBodyScrollLock(isOpen, isMobile);

  // --- Layout classes ---
  const overlayClass = isMobile
    ? 'fixed inset-0 bg-black/40 z-[9998]'
    : 'fixed inset-0 bg-black/50 data-[state=open]:animate-overlayShow z-[9998]';

  const contentClass = isMobile
    ? 'fixed inset-0 z-[9999] w-screen h-screen bg-white dark:bg-gray-900 flex flex-col data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
    : 'fixed left-1/2 transform -translate-x-1/2 z-[9999] w-full max-w-sm sm:max-w-md md:max-w-2xl rounded-xl bg-white shadow-2xl focus:outline-none dark:bg-gray-800 dark:text-white data-[state=open]:animate-contentExpandFromTop create-post-modal-content flex flex-col';

  const contentStyle = isMobile
    ? { margin: 0, padding: 0, borderRadius: 0, maxWidth: '100vw', maxHeight: '100vh' }
    : { top: `${modalPosition.top}px`, maxHeight: '80vh', transform: 'translateX(-50%)', position: 'fixed' as const };

  return (
    <>
      <TooltipProvider>
        <Dialog.Root open={isOpen} onOpenChange={modal.handleCloseAttempt}>
          <Dialog.Portal>
            <Dialog.Overlay className={overlayClass} />
            <Dialog.Content className={contentClass} style={contentStyle}>

              {/* Hidden File Input */}
              <input
                type="file"
                ref={modal.fileInputRef}
                onChange={modal.handleFileSelected}
                style={{ display: 'none' }}
                multiple
                accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,audio/*"
              />

              <Dialog.Title className="sr-only">
                {editMode ? 'Edit Post' : `Create Post in ${spaceName}`}
              </Dialog.Title>
              <Dialog.Description className="sr-only">
                {editMode ? `Edit your post in ${spaceName}` : `Create a new post in ${spaceName}. Add a title, content, media attachments, and categorize your post.`}
              </Dialog.Description>

              {/* ── MOBILE TOP BAR ── */}
              {isMobile && (
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                  <button onClick={modal.handleCloseAttempt} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label="Close">
                    <X className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                  </button>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    {editMode ? 'Edit Post' : 'Create Post'}
                  </h2>
                  <button
                    onClick={modal.handleSubmit}
                    disabled={!modal.hasContent() || modal.isSubmitting || modal.uploadingFiles.size > 0}
                    className="px-4 py-1.5 text-sm font-semibold rounded-full bg-teal-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-teal-700 transition-colors"
                  >
                    {modal.isSubmitting ? 'Posting...' : editMode ? 'Save' : 'Post'}
                  </button>
                </div>
              )}

              {/* ── SCROLLABLE BODY ── */}
              <div className={isMobile ? 'flex-1 overflow-y-auto px-4 py-4' : 'flex-1 overflow-y-auto px-6 pt-4 pb-2 space-y-4'}>

                {/* Header */}
                <PostFormHeader
                  userName={userName}
                  userAvatarUrl={userAvatarUrl}
                  spaceName={spaceName}
                  editMode={editMode}
                />

                {/* Form Inputs */}
                <PostFormInputs
                  title={modal.title}
                  setTitle={modal.setTitle}
                  content={modal.content}
                  setContent={modal.setContent}
                  contentTextareaRef={modal.contentTextareaRef}
                  showFunPostIdeas={modal.showFunPostIdeas}
                  setShowFunPostIdeas={modal.setShowFunPostIdeas}
                  applyPostTemplate={modal.applyPostTemplate}
                />

                {/* Attachment Preview Grid */}
                <AttachmentPreviewGrid
                  selectedContentGifUrls={modal.selectedContentGifUrls}
                  attachments={modal.attachments}
                  uploadingFiles={modal.uploadingFiles}
                  onRemoveContentGif={modal.handleRemoveContentGif}
                  onRemoveAttachment={modal.handleRemoveAttachment}
                  onVideoPreviewClick={modal.handleVideoPreviewClick}
                  formatFileSize={modal.formatFileSize}
                />

                {/* Poll Creator */}
                {modal.showPollCreator && (
                  <div className="mb-4">
                    <PollCreatorSection
                      pollOptions={modal.pollOptions}
                      onPollOptionChange={modal.handlePollOptionChange}
                      onRemovePollOption={modal.removePollOption}
                      onAddPollOption={modal.addPollOption}
                      onRemovePoll={modal.togglePollCreator}
                    />
                  </div>
                )}
              </div>

              {/* ── PINNED FOOTER — single row: tools left, actions right ── */}
              <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 flex items-center justify-between gap-2">
                {/* Left: Toolbar icons */}
                <PostFormToolbar
                  onAttachFile={modal.triggerFileSelector}
                  onAddLink={modal.handleAddLink}
                  onAddVideo={modal.handleAddVideoLink}
                  onAddGif={modal.openGiphySearchForContent}
                  onTogglePoll={modal.togglePollCreator}
                  onToggleEmoji={modal.toggleEmojiPicker}
                  showPollCreator={modal.showPollCreator}
                  toolbarButtonClass={modal.toolbarButtonClass}
                  activeToolbarButtonClass={modal.activeToolbarButtonClass}
                />

                {/* Right: Category selector (mobile) */}
                {isMobile && (
                  <CategorySelector
                    selectedCategoryId={modal.categoryId}
                    onCategoryChange={modal.setCategoryId}
                    categories={modal.categories || []}
                    loading={modal.categoriesLoading}
                    error={!!modal.categoriesError}
                    toolbarButtonClass={modal.toolbarButtonClass}
                    activeToolbarButtonClass={modal.activeToolbarButtonClass}
                  />
                )}

                {/* Right: Category + Cancel + Post (desktop) */}
                {!isMobile && (
                  <PostFormActions
                    categoryId={modal.categoryId}
                    setCategoryId={modal.setCategoryId}
                    categories={modal.categories || []}
                    categoriesLoading={modal.categoriesLoading}
                    categoriesError={!!modal.categoriesError}
                    toolbarButtonClass={modal.toolbarButtonClass}
                    activeToolbarButtonClass={modal.activeToolbarButtonClass}
                    onCancel={modal.handleCloseAttempt}
                    onSubmit={modal.handleSubmit}
                    isSubmitting={modal.isSubmitting}
                    uploadingFiles={modal.uploadingFiles}
                    hasContent={modal.hasContent()}
                    editMode={editMode}
                  />
                )}
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </TooltipProvider>

      {/* All Sub-Modals */}
      <ModalCollection
        showEmojiPicker={modal.showEmojiPicker}
        emojiPickerRef={modal.emojiPickerRef}
        onEmojiSelect={modal.handleEmojiSelectInternal}
        showGiphySearch={modal.showGiphySearch}
        setShowGiphySearch={modal.setShowGiphySearch}
        giphySearchTerm={modal.giphySearchTerm}
        setGiphySearchTerm={modal.setGiphySearchTerm}
        activeGifCategory={modal.activeGifCategory}
        giphyContainerRef={modal.giphyContainerRef}
        fetchGifsForSearch={modal.fetchGifsForSearch}
        fetchGifsForCategory={modal.fetchGifsForCategory}
        onGifSelected={modal.handleGifSelected}
        isVideoLinkModalOpen={modal.isVideoLinkModalOpen}
        setIsVideoLinkModalOpen={modal.setIsVideoLinkModalOpen}
        onVideoUrlSubmit={modal.handleVideoUrlSubmit}
        isLinkModalOpen={modal.isLinkModalOpen}
        setIsLinkModalOpen={modal.setIsLinkModalOpen}
        onLinkSubmit={modal.handleLinkSubmit}
        isVideoPlayerModalOpen={modal.isVideoPlayerModalOpen}
        setIsVideoPlayerModalOpen={modal.setIsVideoPlayerModalOpen}
        selectedVideo={modal.selectedVideo}
        showCloseConfirmation={modal.showCloseConfirmation}
        setShowCloseConfirmation={modal.setShowCloseConfirmation}
        onConfirmClose={modal.handleActualClose}
        onCancelClose={() => modal.setShowCloseConfirmation(false)}
      />
    </>
  );
};