import { VideoInfo } from '../types/postTypes';

/**
 * Extracts video information from a URL, including platform, video ID, and thumbnail URL.
 * 
 * @param url The video URL to extract information from
 * @returns Object containing platform, videoId, and thumbnailUrl
 */
export function extractVideoInfo(url: string): VideoInfo {
  // Default empty result
  const result: VideoInfo = {
    platform: 'other',
    videoId: null,
    thumbnailUrl: null
  };
  
  if (!url) return result;
  
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    
    // YouTube detection
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      result.platform = 'youtube';
      
      // Extract video ID from various YouTube URL formats
      if (hostname.includes('youtube.com')) {
        // Standard watch URL: https://www.youtube.com/watch?v=VIDEO_ID
        const params = new URLSearchParams(urlObj.search);
        const videoId = params.get('v');
        if (videoId) {
          result.videoId = videoId;
          result.thumbnailUrl = `https://img.youtube.com/vi/${videoId}/0.jpg`;
        }
      } else if (hostname.includes('youtu.be')) {
        // Short URL: https://youtu.be/VIDEO_ID
        const pathParts = urlObj.pathname.split('/');
        if (pathParts.length > 1) {
          const videoId = pathParts[1];
          result.videoId = videoId;
          result.thumbnailUrl = `https://img.youtube.com/vi/${videoId}/0.jpg`;
        }
      }
    }
    // Vimeo detection
    else if (hostname.includes('vimeo.com')) {
      result.platform = 'vimeo';
      
      // Extract video ID from Vimeo URL: https://vimeo.com/VIDEO_ID
      const pathParts = urlObj.pathname.split('/');
      if (pathParts.length > 1) {
        const videoId = pathParts[1];
        result.videoId = videoId;
        // Note: Vimeo doesn't have a direct thumbnail URL format like YouTube
        // Typically you'd need to use their API to get the thumbnail
        // For now, we'll return null for the thumbnail URL
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error parsing video URL:', error);
    return result;
  }
}

/**
 * Validates if a URL is properly formatted
 * 
 * @param url The URL to validate
 * @returns Boolean indicating if the URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Ensures a URL has a protocol prefix (http:// or https://)
 * 
 * @param url The URL to normalize
 * @returns Normalized URL with protocol
 */
export function normalizeUrl(url: string): string {
  if (!url) return '';
  
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  
  return url;
} 