/**
 * Utility functions for handling media (videos, images)
 */

/**
 * Extracts video information from a URL
 * @param url The video URL to parse
 * @returns Video platform, ID and thumbnail information
 */
export const extractVideoInfo = (url: string): { 
  platform: 'youtube' | 'vimeo' | 'other'; 
  videoId: string | null; 
  thumbnailUrl: string | null 
} => {
  // YouTube pattern
  const youtubePatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/user\/.+\/|youtube\.com\/user\/.+#w\/w\/|youtube\.com\/shorts\/|youtube\.com\/playlist\?|youtube\.com\/watch\?|youtube\.com\/(?:(?:watch|attribution_link)\?(?:.*?)v(?:i)?=|(?:embed|v|vi|user)\/))([^&#?;\s]+)/,
    /(?:youtube\.com\/shorts\/)([^&#?;\s]+)/
  ];

  // Vimeo pattern
  const vimeoPattern = /(?:vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:$|\/|\?))/;

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

  return {
    platform: 'other',
    videoId: null,
    thumbnailUrl: null
  };
}; 