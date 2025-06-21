import React, { useMemo } from 'react';
import VideoThumbnail from './VideoThumbnail';
import AttachmentsList from './AttachmentsList';
import type { Attachment } from '@/features/posts/types';
import { formatFileSize } from '@/shared/utils/file-utils';
import { File, FileText, Link as LinkIcon } from 'lucide-react';
import { getSupabaseClient } from '@/integrations/supabase/client';

// Utility: Convert YouTube URL to embed and thumbnail
function getYouTubeEmbedUrl(url: string): string | null {
  try {
    if (!url) return null;
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
    if (ytMatch && ytMatch[1]) {
      return `https://www.youtube.com/embed/${ytMatch[1]}`;
    }
    // Handle full watch URLs
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('youtube.com')) {
      const v = urlObj.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    return null;
  } catch {
    return null;
  }
}
function getYouTubeThumbnailUrl(url: string): string | null {
  try {
    if (!url) return null;
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
    if (ytMatch && ytMatch[1]) {
      return `https://i.ytimg.com/vi/${ytMatch[1]}/hqdefault.jpg`;
    }
    // Handle full watch URLs
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('youtube.com')) {
      const v = urlObj.searchParams.get('v');
      if (v) return `https://i.ytimg.com/vi/${v}/hqdefault.jpg`;
    }
    return null;
  } catch {
    return null;
  }
}
// Utility: Get public URL for Supabase storage
function getSupabasePublicUrl(path: string | undefined | null): string {
  if (!path) return '/image-placeholder.jpg';
  const { data } = getSupabaseClient().storage.from('post-attachments').getPublicUrl(path);
  return data?.publicUrl || '/image-placeholder.jpg';
}

interface MediaGalleryProps {
  media?: Attachment[] | null;
  currentVideoIndex: number;
  setCurrentVideoIndex: (index: number) => void;
  onVideoClick: (video: {
    url: string;
    videoId?: string | null;
    platform?: string;
  }) => void;
}

/**
 * Gallery component for displaying post media attachments
 * Videos, images, files, links, etc.
 */
export default function MediaGallery({
  media,
  currentVideoIndex,
  setCurrentVideoIndex,
  onVideoClick
}: MediaGalleryProps) {
  // Early return if no media attachments
  if (!media || media.length === 0) return null;

  // Separate different types of attachments
  const videoAttachments = media.filter(att => att.type === 'video');
  const imageAttachments = media.filter(att => 
    att.type === 'file' && att.fileType?.startsWith('image/') && !att.url.includes('.gif')
  );
  const gifAttachments = media.filter(att => 
    att.type === 'file' && (att.fileType === 'image/gif' || att.url.includes('.gif'))
  );
  const documentAttachments = media.filter(att => 
    att.type === 'file' && !att.fileType?.startsWith('image/') && att.fileType !== 'image/gif'
  );
  const linkAttachments = media.filter(att => att.type === 'link');
  
  // Determine if we need to use the grid layout (multiple attachments)
  const hasMultipleAttachments = media.length > 1;

  return (
    <div className="my-4">
      {/* Horizontal scrollable container for videos */}
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {media.map((att, index) => {
          const isVideo = att.type === 'video';
          const isImage = att.type === 'file' && att.fileType?.startsWith('image/');
          const isDocument = att.type === 'file' && !isImage;
          const isLink = att.type === 'link';

          let thumbnailUrl = '/image-placeholder.jpg';
          if (isVideo) {
            thumbnailUrl = getYouTubeThumbnailUrl(att.url) || att.thumbnailUrl || thumbnailUrl;
          } else if (isImage) {
            thumbnailUrl = att.url;
          }

          const renderContent = () => {
            if (isVideo || isImage) {
              return (
                <img 
                  src={thumbnailUrl} 
                  alt={att.name || "Attachment"} 
                  className="w-full h-full object-cover"
                  onError={(e) => { 
                    (e.target as HTMLImageElement).src = '/image-placeholder.jpg'; 
                  }}
                />
              );
            }
            if (isDocument) {
              return (
                <div className="p-3 flex flex-col items-center justify-center h-full text-center bg-gray-50">
                  {att.fileType === 'application/pdf' ? (
                    <FileText className="w-12 h-12 text-red-500" strokeWidth={1.5}/>
                  ) : (
                    <File className="w-12 h-12 text-gray-500" strokeWidth={1.5}/>
                  )}
                </div>
              );
            }
            if (isLink) {
              return (
                <div className="p-3 flex flex-col items-center justify-center h-full text-center bg-gray-50">
                  <LinkIcon className="w-12 h-12 text-teal-500" strokeWidth={1.5}/>
                </div>
              );
            }
            return null;
          };

          const handleClick = () => {
            if (isVideo) {
              onVideoClick({
                url: getYouTubeEmbedUrl(att.url) || att.url,
                videoId: att.url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})|vimeo\.com\/(\d+)/)?.[1],
                platform: att.url.includes('youtube') ? 'youtube' : att.url.includes('vimeo') ? 'vimeo' : 'other',
              });
            } else if (isImage || isDocument || isLink) {
              window.open(att.url, '_blank', 'noopener,noreferrer');
            }
          };

          return (
            <div 
              key={att.id || `media-${index}`} 
              className={`relative rounded-lg border bg-white shadow-sm group overflow-hidden cursor-pointer flex-shrink-0 ${
                isVideo 
                  ? 'w-[369.59px] h-[210px]' // Exact 369.59 x 210 dimensions for videos, no centering
                  : 'w-[180px] h-[180px]' // Square containers for images and other media, slightly larger
              }`}
              onClick={handleClick}
            >
              {renderContent()}
              {/* Video play button overlay */}
              {isVideo && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="px-4 py-2 md:px-6 md:py-3 bg-black/75 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-xl hover:bg-black/85 transition-all duration-200">
                    <div className="w-0 h-0 border-l-[12px] md:border-l-[16px] border-l-white border-t-[8px] md:border-t-[11px] border-t-transparent border-b-[8px] md:border-b-[11px] border-b-transparent ml-1"></div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
} 