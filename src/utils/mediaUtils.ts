import type { Attachment } from "@/features/posts/types";

/**
 * Icon type definition for file icons
 */
export type FileIconType = {
  name: string;
  className: string;
};

/**
 * Helper to get a more specific icon based on file type
 * Returns icon name and className to be used with Lucide icons
 */
export const getFileIcon = (fileType?: string, attachmentType?: Attachment['type']): FileIconType => {
  if (attachmentType === 'link') {
    return { name: 'Link2', className: "mr-2 text-blue-500 flex-shrink-0" };
  }
  if (attachmentType === 'video') {
    return { name: 'PlayCircle', className: "mr-2 text-red-500 flex-shrink-0" };
  }
  
  if (fileType?.startsWith('image/')) {
    return { name: 'Image', className: "mr-2 text-purple-500 flex-shrink-0" };
  }
  if (fileType === 'application/pdf') {
    return { name: 'FileText', className: "mr-2 text-orange-500 flex-shrink-0" };
  }
  
  // Default file icon
  return { name: 'File', className: "mr-2 text-gray-500 flex-shrink-0" };
};

/**
 * Format file size to human-readable format
 */
export const formatFileSize = (bytes?: number): string => {
  if (bytes === undefined) return '';
  
  if (bytes < 1024) return `${bytes} B`;
  else if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  else if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  else return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

/**
 * Check if URL is an image
 */
export const isImageUrl = (url: string, fileType?: string): boolean => {
  if (fileType?.startsWith('image/')) return true;
  
  // Simple URL extension check as fallback
  const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif'];
  return extensions.some(ext => url.toLowerCase().endsWith(ext));
};

/**
 * Extract video information from a URL
 */
export const extractVideoInfo = (url: string): { 
  platform: 'youtube' | 'vimeo' | 'other'; 
  videoId: string | null; 
  thumbnailUrl: string | null 
} => {
  // YouTube pattern
  const youtubePatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/user\/.+\/|youtube\.com\/user\/.+#\w\/\w\/|youtube\.com\/shorts\/|youtube\.com\/playlist\?|youtube\.com\/watch\?|youtube\.com\/(?:(?:watch|attribution_link)\?(?:.*?)v(?:i)?=|(?:embed|v|vi|user)\/))([^&#?/\s]+)/,
    /(?:youtube\.com\/shorts\/)([^&#?/\s]+)/
  ];

  // Vimeo pattern
  const vimeoPattern = /(?:vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:$|\/|\?))/;

  // Check for YouTube
  for (const pattern of youtubePatterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      const videoId = match[1];
      return {
        platform: 'youtube',
        videoId,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      };
    }
  }

  // Check for Vimeo
  const vimeoMatch = url.match(vimeoPattern);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      platform: 'vimeo',
      videoId: vimeoMatch[1],
      // Vimeo requires an API call to get the thumbnail, so we'll use a placeholder for now
      thumbnailUrl: null
    };
  }

  // Unknown video format
  return {
    platform: 'other',
    videoId: null,
    thumbnailUrl: null
  };
};

/**
 * Extract the first GIF and the rest of the content
 */
export const extractFirstGifAndRest = (
  rawContent: string
): { restOfContent: string; firstGifUrl: string | null } => {
  if (!rawContent) return { restOfContent: '', firstGifUrl: null };

  const gifTagRegex = /<img\s+src="(?<url>https:\/\/.*?\.gif(?:[?#].*?)?)"[^>]*>/i;
  let firstGifUrl: string | null = null;
  let restOfContent = rawContent;

  const firstGifMatch = rawContent.match(gifTagRegex);
  if (firstGifMatch && firstGifMatch.groups?.url) {
    firstGifUrl = firstGifMatch.groups.url;
    // Remove only the first occurrence of the matched GIF tag
    restOfContent = rawContent.replace(firstGifMatch[0], '').trim();
  }
  return { restOfContent, firstGifUrl };
}; 