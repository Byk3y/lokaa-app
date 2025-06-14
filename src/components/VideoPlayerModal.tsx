import * as Dialog from '@radix-ui/react-dialog';
import { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  videoId?: string | null;
  videoPlatform?: 'youtube' | 'vimeo' | 'other';
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

// Utility function to get embed URL based on platform
const getEmbedUrl = (url: string, videoId: string | null | undefined, platform?: string): string => {
  if (platform === 'youtube' && videoId) {
    return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  }
  
  if (platform === 'vimeo' && videoId) {
    return `https://player.vimeo.com/video/${videoId}?autoplay=1`;
  }
  
  // For unsupported or unknown video platforms, return the original URL
  return url;
};

export const VideoPlayerModal = ({ 
  isOpen, 
  onClose, 
  videoUrl, 
  videoId, 
  videoPlatform, 
  onNext,
  onPrevious,
  hasNext,
  hasPrevious
}: VideoPlayerModalProps) => {
  const embedUrl = getEmbedUrl(videoUrl, videoId, videoPlatform);
  
  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 data-[state=open]:animate-overlayShow z-[60]" />
        <Dialog.Content 
          className="fixed left-1/2 top-1/2 w-[90vw] max-w-6xl h-[90vh] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-black shadow-lg data-[state=open]:animate-contentShow focus:outline-none z-[60] flex items-center justify-center"
          aria-describedby="video-player-description"
        >
          <Dialog.Title>
            <VisuallyHidden>
              Video Player - {videoPlatform === 'youtube' ? 'YouTube' : videoPlatform === 'vimeo' ? 'Vimeo' : 'Video'} Content
            </VisuallyHidden>
          </Dialog.Title>
          <Dialog.Description id="video-player-description">
            <VisuallyHidden>
              Playing {videoPlatform === 'youtube' ? 'YouTube' : videoPlatform === 'vimeo' ? 'Vimeo' : ''} video in full screen modal. Use Escape key or close button to exit.
            </VisuallyHidden>
          </Dialog.Description>
          <div className="relative w-full h-full flex items-center justify-center">
            {hasPrevious && onPrevious && (
              <button 
                onClick={onPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors"
                aria-label="Previous video"
              >
                <ChevronLeft size={28} />
              </button>
            )}

            <div className="w-full h-full rounded-lg overflow-hidden flex items-center justify-center">
              <iframe 
                src={embedUrl} 
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
                title="Video player"
                key={embedUrl}
              />
            </div>
            
            {hasNext && onNext && (
              <button 
                onClick={onNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors"
                aria-label="Next video"
              >
                <ChevronRight size={28} />
              </button>
            )}

            <Dialog.Close asChild>
              <button
                className="absolute top-3 right-3 z-10 inline-flex h-8 w-8 appearance-none items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors focus:outline-none"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default VideoPlayerModal; 