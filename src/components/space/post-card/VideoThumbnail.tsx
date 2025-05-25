import React from 'react';
import { PlayCircle, Youtube } from 'lucide-react';
import { cn } from '@/lib/utils';
import { extractVideoInfo } from '@/utils/mediaUtils';
import type { Attachment } from '@/features/posts/types';

interface VideoThumbnailProps {
  attachment: Attachment;
  onVideoClick: (
    e: React.MouseEvent<HTMLDivElement>,
    url: string,
    videoId?: string | null,
    platform?: string
  ) => void;
}

/**
 * VideoThumbnail component for displaying video previews in PostCard
 */
export const VideoThumbnail: React.FC<VideoThumbnailProps> = ({
  attachment,
  onVideoClick,
}) => {
  // Extract video information from the attachment
  const videoInfo = attachment.videoId && attachment.thumbnailUrl
    ? {
        videoId: attachment.videoId,
        thumbnailUrl: attachment.thumbnailUrl,
        platform: attachment.videoPlatform || 'other'
      }
    : extractVideoInfo(attachment.url);

  // Handle click on video thumbnail
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    onVideoClick(e, attachment.url, videoInfo.videoId, videoInfo.platform);
  };

  return (
    <div
      onClick={handleClick}
      className="flex-shrink-0 w-20 sm:w-24 h-[50px] sm:h-[54px] rounded-md overflow-hidden border border-gray-200 shadow-sm relative group cursor-pointer bg-gray-200 ml-auto"
    >
      {videoInfo.thumbnailUrl ? (
        <img
          src={videoInfo.thumbnailUrl}
          alt="Video thumbnail"
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        // Static placeholder if no thumbnail URL
        <div className="w-full h-full flex items-center justify-center">
          {videoInfo.platform === 'youtube' ? (
            <Youtube size={24} className="text-gray-700 opacity-60" />
          ) : (
            <PlayCircle size={24} className="text-gray-500 opacity-60" />
          )}
        </div>
      )}

      {/* Overlay based on platform */}
      {videoInfo.platform === 'youtube' ? (
        // YouTube Specific Play Button Overlay
        <div
          className="absolute inset-0 flex items-center justify-center opacity-40 group-hover:opacity-80 transition-opacity"
          aria-label="Play YouTube video"
        >
          <div className="w-[28px] sm:w-[36px] h-[20px] sm:h-[25px]">
            <svg viewBox="0 0 68 48" className="w-full h-full">
              <path
                d="M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,.13,34,0,34,0S12.21,.13,6.9,1.55 C3.97,2.33,2.27,4.81,1.48,7.74C0.06,13.05,0,24,0,24s0.06,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19 C12.21,47.87,34,48,34,48s21.79-0.13,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C67.94,34.95,68,24,68,24S67.94,13.05,66.52,7.74z"
                fill="#FF0000"
              ></path>
              <path d="M 45,24 27,14 27,34" fill="#FFFFFF"></path>
            </svg>
          </div>
        </div>
      ) : (
        // Generic Video Overlay
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center transition-all",
            videoInfo.thumbnailUrl ? "bg-black bg-opacity-20" : "bg-opacity-0",
            "group-hover:bg-opacity-40"
          )}
        >
          {/* Subtle play button (visible if thumbnail exists, fades out on hover) */}
          {videoInfo.thumbnailUrl && (
            <PlayCircle
              size={20}
              className="text-white opacity-70 group-hover:opacity-0 transition-opacity absolute"
            />
          )}
          {/* Larger hover icon (fades in on hover) */}
          <PlayCircle
            size={24}
            className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
          />
        </div>
      )}
    </div>
  );
}; 