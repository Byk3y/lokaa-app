import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  videoId?: string | null;
  videoPlatform?: 'youtube' | 'vimeo' | 'other';
}

/**
 * Modal for displaying video content
 */
export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  isOpen,
  onClose,
  videoUrl,
  videoId,
  videoPlatform = 'other',
}) => {
  if (!isOpen) return null;

  // Create appropriate video embed based on platform
  const renderVideoEmbed = () => {
    if (!videoUrl) return null;

    if (videoPlatform === 'youtube' && videoId) {
      return (
        <iframe
          width="100%"
          height="100%"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      );
    } else if (videoPlatform === 'vimeo' && videoId) {
      return (
        <iframe
          width="100%"
          height="100%"
          src={`https://player.vimeo.com/video/${videoId}?autoplay=1`}
          title="Vimeo video player"
          frameBorder="0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        ></iframe>
      );
    } else {
      // Direct video URL or unsupported platform
      return (
        <video
          controls
          autoPlay
          className="w-full h-full"
          src={videoUrl}
        >
          Your browser does not support the video tag.
        </video>
      );
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/80 data-[state=open]:animate-overlayShow z-[10000]" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[10000] w-[90vw] max-w-3xl h-[70vh] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-black shadow-lg data-[state=open]:animate-contentShow focus:outline-none"
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
          <div className="w-full h-full flex items-center justify-center">
            {renderVideoEmbed()}
          </div>

          <Dialog.Close asChild>
            <button
              className="absolute right-4 top-4 inline-flex h-8 w-8 appearance-none items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 focus:outline-none"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}; 