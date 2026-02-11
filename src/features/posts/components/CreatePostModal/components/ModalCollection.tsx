import React, { Suspense, lazy } from 'react';
// Lazy load heavy content modals for better code splitting
const EmojiPickerModal = lazy(() => import('../../modals/EmojiPickerModal').then(module => ({ default: module.EmojiPickerModal })));
const GiphySearchModal = lazy(() => import('../../modals/GiphySearchModal').then(module => ({ default: module.GiphySearchModal })));
const VideoLinkModal = lazy(() => import('../../modals/VideoLinkModal').then(module => ({ default: module.VideoLinkModal })));
const LinkModal = lazy(() => import('../../modals/LinkModal').then(module => ({ default: module.LinkModal })));
const VideoPlayerModal = lazy(() => import('../../modals/VideoPlayerModal').then(module => ({ default: module.VideoPlayerModal })));
import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle } from 'lucide-react';

interface ModalCollectionProps {
  // Emoji picker
  showEmojiPicker: boolean;
  emojiPickerRef: React.RefObject<HTMLDivElement>;
  onEmojiSelect: (emoji: any) => void;

  // Giphy search
  showGiphySearch: boolean;
  setShowGiphySearch: (show: boolean) => void;
  giphySearchTerm: string;
  setGiphySearchTerm: (term: string) => void;
  activeGifCategory: string;
  giphyContainerRef: React.RefObject<HTMLDivElement>;
  fetchGifsForSearch: (offset: number) => Promise<any>;
  fetchGifsForCategory: (category: string) => Promise<any>;
  onGifSelected: (gifUrl: string) => void;

  // Video link modal
  isVideoLinkModalOpen: boolean;
  setIsVideoLinkModalOpen: (open: boolean) => void;
  onVideoUrlSubmit: (url: string) => void;

  // Link modal
  isLinkModalOpen: boolean;
  setIsLinkModalOpen: (open: boolean) => void;
  onLinkSubmit: (url: string) => void;

  // Video player modal
  isVideoPlayerModalOpen: boolean;
  setIsVideoPlayerModalOpen: (open: boolean) => void;
  selectedVideo: { url: string; videoId?: string | null; platform?: string };

  // Close confirmation modal
  showCloseConfirmation: boolean;
  setShowCloseConfirmation: (show: boolean) => void;
  onConfirmClose: () => void;
  onCancelClose: () => void;
}

/**
 * Collection of all modals used in CreatePostModal
 */
export const ModalCollection: React.FC<ModalCollectionProps> = ({
  // Emoji picker props
  showEmojiPicker,
  emojiPickerRef,
  onEmojiSelect,

  // Giphy search props
  showGiphySearch,
  setShowGiphySearch,
  giphySearchTerm,
  setGiphySearchTerm,
  activeGifCategory,
  giphyContainerRef,
  fetchGifsForSearch,
  fetchGifsForCategory,
  onGifSelected,

  // Video link modal props
  isVideoLinkModalOpen,
  setIsVideoLinkModalOpen,
  onVideoUrlSubmit,

  // Link modal props
  isLinkModalOpen,
  setIsLinkModalOpen,
  onLinkSubmit,

  // Video player modal props
  isVideoPlayerModalOpen,
  setIsVideoPlayerModalOpen,
  selectedVideo,

  // Close confirmation modal props
  showCloseConfirmation,
  setShowCloseConfirmation,
  onConfirmClose,
  onCancelClose
}) => {
  return (
    <>
      {/* Emoji Picker Modal - Lazy loaded */}
      {showEmojiPicker && (
        <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]"><div className="text-white">Loading emoji picker...</div></div>}>
          <EmojiPickerModal
            ref={emojiPickerRef}
            visible={showEmojiPicker}
            onEmojiSelect={onEmojiSelect}
          />
        </Suspense>
      )}

      {/* Giphy Search Modal - Lazy loaded */}
      {showGiphySearch && (
        <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]"><div className="text-white">Loading GIF search...</div></div>}>
          <GiphySearchModal
            ref={giphyContainerRef}
            searchTerm={giphySearchTerm}
            onSearchChange={setGiphySearchTerm}
            fetchGifs={fetchGifsForSearch}
            fetchGifsByCategory={fetchGifsForCategory}
            onGifSelect={onGifSelected}
            visible={showGiphySearch}
            activeCategory={activeGifCategory}
            onClose={() => setShowGiphySearch(false)}
            standalone={false}
          />
        </Suspense>
      )}

      {/* Video Link Modal - Lazy loaded */}
      {isVideoLinkModalOpen && (
        <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]"><div className="text-white">Loading video modal...</div></div>}>
          <VideoLinkModal
            isOpen={isVideoLinkModalOpen}
            onClose={() => setIsVideoLinkModalOpen(false)}
            onSubmit={onVideoUrlSubmit}
          />
        </Suspense>
      )}

      {/* Link Modal - Lazy loaded */}
      {isLinkModalOpen && (
        <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]"><div className="text-white">Loading link modal...</div></div>}>
          <LinkModal
            isOpen={isLinkModalOpen}
            onClose={() => setIsLinkModalOpen(false)}
            onSubmit={onLinkSubmit}
          />
        </Suspense>
      )}

      {/* Video Player Modal - Lazy loaded */}
      {isVideoPlayerModalOpen && (
        <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]"><div className="text-white">Loading video player...</div></div>}>
          <VideoPlayerModal
            isOpen={isVideoPlayerModalOpen}
            onClose={() => setIsVideoPlayerModalOpen(false)}
            videoUrl={selectedVideo.url}
            videoId={selectedVideo.videoId}
            videoPlatform={selectedVideo.platform as 'youtube' | 'vimeo' | 'other' | undefined}
          />
        </Suspense>
      )}

      {/* Close Confirmation Dialog */}
      <Dialog.Root open={showCloseConfirmation} onOpenChange={setShowCloseConfirmation}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-overlayShow z-[10000]" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[10000] w-full max-w-md rounded-xl bg-white p-6 shadow-2xl focus:outline-none dark:bg-gray-800 dark:text-white">
            <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Discard post?
            </Dialog.Title>
            <Dialog.Description className="text-sm text-gray-600 dark:text-gray-300 mb-6">
              You have unsaved changes. Are you sure you want to discard your post?
            </Dialog.Description>

            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onCancelClose}
                className="rounded-md px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-800 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-300 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700 transition-colors"
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={onConfirmClose}
                className="rounded-md px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 transition-colors"
              >
                Discard post
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}; 