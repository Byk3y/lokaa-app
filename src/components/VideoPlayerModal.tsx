import * as Dialog from '@radix-ui/react-dialog';
import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { shouldEnableMobileFeatures } from '@/utils/mobileDetection';

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
  title?: string;
}



// Utility function to get embed URL based on platform
const getEmbedUrl = (url: string, videoId: string | null | undefined, platform?: string): string => {
  if (platform === 'youtube' && videoId) {
    // For mobile, use different parameters to match Skool's native YouTube experience
    const isMobile = shouldEnableMobileFeatures();
    if (isMobile) {
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0&modestbranding=0&showinfo=1`;
    }
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
  hasPrevious,
  title
}: VideoPlayerModalProps) => {
  const [isMobile, setIsMobile] = useState(false);
  const embedUrl = getEmbedUrl(videoUrl, videoId, videoPlatform);
  
  useEffect(() => {
    setIsMobile(shouldEnableMobileFeatures());
  }, []);
  
  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/80 data-[state=open]:animate-overlayShow z-[60]" />
        <Dialog.Content 
          onPointerDownOutside={(e) => e.preventDefault()}
          className={`
            fixed focus:outline-none z-[60] flex flex-col bg-black shadow-lg
            ${isMobile
              ? 'left-0 right-0 top-1/2 -translate-y-1/2 w-full' // Edge-to-edge on mobile
              : 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-2xl rounded-lg' // Modal on desktop
            }
          `}
          aria-describedby="video-player-description"
        >
          <VisuallyHidden>
            <Dialog.Title>Video Player: {title}</Dialog.Title>
            <Dialog.Description id="video-player-description">
              Playing video: {title}. Use Escape key or close button to exit.
            </Dialog.Description>
          </VisuallyHidden>

          {/* Custom Header */}
          <div className="flex items-center justify-between p-3 flex-shrink-0 border-b border-gray-800">
            <h2 className="text-white text-base font-semibold truncate pr-4">
              {title}
            </h2>
            <Dialog.Close asChild>
              <button
                className="flex-shrink-0 z-20 inline-flex appearance-none items-center justify-center text-gray-400 hover:text-white transition-colors focus:outline-none h-8 w-8 rounded-full hover:bg-gray-800"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>
          
          {/* Video Player Container */}
          <div className="w-full aspect-video bg-black relative">
            {/* Navigation buttons */}
            {!isMobile && hasPrevious && onPrevious && (
              <button 
                onClick={onPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors"
                aria-label="Previous video"
              >
                <ChevronLeft size={28} />
              </button>
            )}
            
            <iframe 
              src={embedUrl} 
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" 
              allowFullScreen
              title="Video player"
              key={embedUrl}
            />

            {!isMobile && hasNext && onNext && (
              <button 
                onClick={onNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors"
                aria-label="Next video"
              >
                <ChevronRight size={28} />
              </button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default VideoPlayerModal; 