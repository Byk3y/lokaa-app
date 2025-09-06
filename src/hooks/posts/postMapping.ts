/**
 * 🎯 Post Mapping - Media Processing & Type Transformation
 * 
 * Extracted from useOptimizedCachedPosts.ts to handle post-to-card mapping
 * with comprehensive media type detection and URL processing.
 */

import type { CachedPostType } from '@/features/posts/types/cachedPost';
import type { PostCardProps } from '@/features/posts/types/postCard';
import { devLogger } from '@/utils/developmentLogger';

/**
 * Helper function to detect media type and file type from URL
 * 
 * @param url - Media URL to analyze
 * @returns Object with detected media information
 */
function detectMediaInfo(url: string): {
  type: 'file' | 'link' | 'video';
  fileType?: string;
  videoPlatform?: string;
  videoId?: string;
  thumbnailUrl?: string;
  directUrl?: string;
} {
  if (!url) return { type: 'file' };

  // Video platform detection
  const videoPatterns = [
    { platform: 'youtube', pattern: /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/, idGroup: 1 },
    { platform: 'vimeo', pattern: /vimeo\.com\/(?:.*#|.*\/videos\/)?(\d+)/, idGroup: 1 },
    { platform: 'tiktok', pattern: /tiktok\.com\/@[\w.-]+\/video\/(\d+)/, idGroup: 1 },
    { platform: 'instagram', pattern: /instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)/, idGroup: 1 },
    { platform: 'twitter', pattern: /twitter\.com\/\w+\/status\/(\d+)/, idGroup: 1 },
    { platform: 'twitch', pattern: /twitch\.tv\/videos\/(\d+)/, idGroup: 1 }
  ];

  for (const { platform, pattern, idGroup } of videoPatterns) {
    const match = url.match(pattern);
    if (match) {
      return {
        type: 'video',
        videoPlatform: platform,
        videoId: match[idGroup],
        thumbnailUrl: generateThumbnailUrl(platform, match[idGroup]),
        directUrl: url
      };
    }
  }

  // File type detection
  const fileExtension = url.split('.').pop()?.toLowerCase();
  if (fileExtension) {
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
    const videoTypes = ['mp4', 'webm', 'ogg', 'avi', 'mov', 'wmv', 'flv', 'mkv'];
    const audioTypes = ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'];
    const documentTypes = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'];
    const archiveTypes = ['zip', 'rar', '7z', 'tar', 'gz'];

    if (imageTypes.includes(fileExtension)) {
      return { type: 'file', fileType: 'image' };
    } else if (videoTypes.includes(fileExtension)) {
      return { type: 'video', fileType: 'video' };
    } else if (audioTypes.includes(fileExtension)) {
      return { type: 'file', fileType: 'audio' };
    } else if (documentTypes.includes(fileExtension)) {
      return { type: 'file', fileType: 'document' };
    } else if (archiveTypes.includes(fileExtension)) {
      return { type: 'file', fileType: 'archive' };
    }
  }

  // Link detection
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return { type: 'link' };
  }

  // Default to file
  return { type: 'file' };
}

/**
 * Generate thumbnail URL for video platforms
 * 
 * @param platform - Video platform name
 * @param videoId - Video identifier
 * @returns Thumbnail URL or undefined
 */
function generateThumbnailUrl(platform: string, videoId: string): string | undefined {
  switch (platform) {
    case 'youtube':
      return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    case 'vimeo':
      return `https://vumbnail.com/${videoId}.jpg`;
    case 'tiktok':
      return `https://p16-sign.tiktokcdn-us.com/obj/tos-useast5-p-0068-tx/placeholder_thumbnail.jpg`;
    default:
      return undefined;
  }
}

/**
 * Map CachedPostType to PostCardProps with comprehensive media processing
 * 
 * @param post - Cached post data
 * @returns PostCardProps - Mapped post card properties
 */
export function mapPostToCardProps(post: CachedPostType): PostCardProps {
  return {
    id: post.id,
    spaceId: post.space_id,
    currentUserId: undefined, // Will be set by component
    author: {
      id: post.author?.id || '',
      name: post.author?.full_name || 'Unknown User',
      avatar: post.author?.avatar_url || null,
      profile_url: post.author?.profile_url || null,
      activity_score: post.author?.activity_score || 0,
    },
    title: post.title,
    content: post.content,
    createdAt: post.created_at || new Date().toISOString(),
    editedAt: post.edited_at,
    category: post.category ? {
      id: post.category.id,
      name: post.category.name,
      icon: post.category.icon || null,
    } : null,
    likes: post.like_count || 0,
    comments: post.comment_count || 0,
    media_urls: post.media_urls?.map((mediaItem: any, index) => {
      // Handle different media_urls formats from database
      let url: string;
      let existingType: string | undefined;
      let existingFileType: string | undefined;

      if (typeof mediaItem === 'string') {
        // Simple string URL
        url = mediaItem;
      } else if (mediaItem && typeof mediaItem === 'object') {
        // Object with URL and optional metadata
        url = mediaItem.url || mediaItem.src || mediaItem;
        existingType = mediaItem.type;
        existingFileType = mediaItem.fileType;
      } else {
        // Fallback
        url = String(mediaItem);
      }

      if (!url || url === 'null' || url === 'undefined') {
        devLogger.log('MediaProcessing', 'Skipping invalid media URL', { mediaItem, index });
        return null;
      }

      // Log the processing
      devLogger.log('MediaProcessing', 'Processing media item', {
        original: mediaItem,
        url,
        existingType,
        existingFileType,
        index
      });

      const mediaInfo = detectMediaInfo(url);
      
      const result = {
        id: `${post.id}-${index}`, 
        url, 
        type: (existingType || mediaInfo.type) as 'file' | 'link' | 'video',
        ...(existingFileType && { fileType: existingFileType }),
        ...(mediaInfo.fileType && !existingFileType && { fileType: mediaInfo.fileType }),
        ...(mediaInfo.videoPlatform && { videoPlatform: mediaInfo.videoPlatform }),
        ...(mediaInfo.videoId && { videoId: mediaInfo.videoId }),
        ...(mediaInfo.thumbnailUrl && { thumbnailUrl: mediaInfo.thumbnailUrl }),
        ...(mediaInfo.directUrl && { directUrl: mediaInfo.directUrl })
      };
      
      // Log final result using development logger
      devLogger.log('MediaProcessing', 'Final media result', result);
      return result;
    }).filter((item): item is NonNullable<typeof item> => item !== null) || null,
    isPinned: post.is_pinned || false,
    pinCategory: post.pin_category,
    isAdmin: false, // Will be set by component
    poll_data: post.poll_data,
    slug: post.slug,
  };
}
