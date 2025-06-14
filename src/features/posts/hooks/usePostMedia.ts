import { useState, useCallback } from 'react';
import type { VideoDisplay } from '../types/postCard';

interface UsePostMediaReturn {
  isVideoModalOpen: boolean;
  selectedVideo: VideoDisplay;
  handleVideoClick: (
    e: React.MouseEvent<HTMLAnchorElement | HTMLDivElement>,
    url: string,
    videoId?: string | null,
    platform?: string
  ) => void;
  setIsVideoModalOpen: (isOpen: boolean) => void;
}

/**
 * Custom hook to manage post media (videos, images)
 */
export const usePostMedia = (): UsePostMediaReturn => {
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoDisplay>({ url: '' });

  const handleVideoClick = useCallback(
    (
      e: React.MouseEvent<HTMLAnchorElement | HTMLDivElement>,
      url: string,
      videoId?: string | null,
      platform?: string
    ) => {
      e.preventDefault();
      setSelectedVideo({ url, videoId, platform });
      setIsVideoModalOpen(true);
    },
    []
  );

  return {
    isVideoModalOpen,
    selectedVideo,
    handleVideoClick,
    setIsVideoModalOpen,
  };
}; 