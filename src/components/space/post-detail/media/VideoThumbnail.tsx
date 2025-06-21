import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { extractVideoInfo } from '@/shared/utils/media-utils';
import type { Attachment } from '@/features/posts/types';

interface VideoThumbnailProps {
  video: Attachment;
  index: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
  onVideoClick: (video: {
    url: string;
    videoId?: string | null;
    platform?: string;
  }) => void;
}

/**
 * Component for displaying a video thumbnail with play button and navigation
 */
export default function VideoThumbnail({
  video,
  index,
  total,
  onPrevious,
  onNext,
  onVideoClick
}: VideoThumbnailProps) {
  // Extract video info from the URL if not already available
  const videoInfo = video.videoId && video.thumbnailUrl
    ? { 
        videoId: video.videoId,
        thumbnailUrl: video.thumbnailUrl, 
        platform: video.videoPlatform || 'other' 
      }
    : extractVideoInfo(video.url);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onVideoClick({
      url: video.url,
      videoId: video.videoId || videoInfo.videoId,
      platform: video.videoPlatform || videoInfo.platform
    });
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden mb-6 w-full max-w-full">
      {/* YouTube-style video container with responsive dimensions - wider like Skool */}
      <div className="relative w-full aspect-video">
        <div className="absolute inset-0">
          {/* Video thumbnail - prioritize attachment's thumbnailUrl if available */}
          <img 
            src={
              video.thumbnailUrl || 
              (video.videoId ? 
                `https://img.youtube.com/vi/${video.videoId}/maxresdefault.jpg` : 
                null) || 
              videoInfo.thumbnailUrl ||
              '/video-placeholder.jpg'
            }
            alt="Video thumbnail" 
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              const videoId = video.videoId || videoInfo.videoId;
              
              // Try hqdefault if maxresdefault fails for YouTube
              if (videoId && target.src.includes('maxresdefault')) {
                target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
              } else if (videoId) {
                // Try mqdefault if hqdefault fails
                target.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
              } else {
                // Fallback to a placeholder
                target.src = '/video-placeholder.jpg';
              }
            }}
          />
          
          {/* Play button overlay - larger for bigger video container */}
          <div 
            className="absolute inset-0 flex items-center justify-center cursor-pointer"
            onClick={handleClick}
          >
            <div className="px-10 py-5 md:px-12 md:py-6 bg-black/75 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-xl hover:bg-black/85 transition-all duration-200">
              <div className="w-0 h-0 border-l-[20px] md:border-l-[24px] border-l-white border-t-[14px] md:border-t-[16px] border-t-transparent border-b-[14px] md:border-b-[16px] border-b-transparent ml-1"></div>
            </div>
          </div>
          
          {/* Duration badge - bottom right */}
          <div className="absolute right-2 bottom-2 px-1 py-0.5 bg-black/80 text-white text-xs font-medium rounded">
            {(video as any).duration || "9:03"}
          </div>

          {/* Navigation controls - when there are multiple videos */}
          {total > 1 && (
            <>
              {/* Previous button */}
              {index > 0 && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={(e) => { e.stopPropagation(); onPrevious(); }}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full h-8 w-8 p-1"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              )}
              
              {/* Next button */}
              {index < total - 1 && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={(e) => { e.stopPropagation(); onNext(); }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full h-8 w-8 p-1"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              )}

              {/* Video count indicator */}
              <div className="absolute left-2 bottom-2 px-1.5 py-0.5 bg-black/70 text-white text-xs font-medium rounded">
                {index + 1} / {total}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 