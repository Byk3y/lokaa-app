import * as Dialog from '@radix-ui/react-dialog';
import { useState } from 'react';
import { X } from 'lucide-react';

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  videoId?: string | null;
  videoPlatform?: 'youtube' | 'vimeo' | 'other';
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

export const VideoPlayerModal = ({ isOpen, onClose, videoUrl, videoId, videoPlatform }: VideoPlayerModalProps) => {
  const embedUrl = getEmbedUrl(videoUrl, videoId, videoPlatform);
  
  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 data-[state=open]:animate-overlayShow" />
        <Dialog.Content className="fixed left-1/2 top-[55%] w-[90vw] max-w-4xl h-[85vh] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-black shadow-lg data-[state=open]:animate-contentShow focus:outline-none">
          <Dialog.Title className="sr-only">Video Player</Dialog.Title>
          <Dialog.Description className="sr-only">
            Video player displaying the selected video. Use controls to play, pause, adjust volume, and enter fullscreen.
          </Dialog.Description>
          <div className="relative w-full h-full rounded-lg overflow-hidden flex items-center justify-center">
            <iframe 
              src={embedUrl} 
              className="w-full h-full pt-2" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen
              title="Video player"
            />
            
            <Dialog.Close asChild>
              <button
                className="absolute top-3 right-3 inline-flex h-8 w-8 appearance-none items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors focus:outline-none"
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