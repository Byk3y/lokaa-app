interface VideoInfo {
  videoId: string;
  platform: 'youtube' | 'vimeo' | 'other';
  embedUrl: string;
  thumbnailUrl?: string;
  title?: string;
}

interface CourseLesson {
  id: string;
  title: string;
  content_type: string;
  content_url: string | null;
  content_text: string | null;
  educational_content?: {
    id: string;
    title: string;
    content_type: string;
    text_content: string | null;
    media_url: string | null;
    embed_data: Record<string, unknown>;
  } | null;
}

export class VideoContentExtractor {
  /**
   * Extract video information from a lesson
   */
  static extractVideoInfo(lesson: CourseLesson): VideoInfo | null {
    // Method 1: Check direct video URL fields
    const directVideoUrl = lesson.content_url || lesson.educational_content?.media_url;
    if (directVideoUrl) {
      const videoId = this.getYouTubeVideoId(directVideoUrl);
      if (videoId) {
        return {
          videoId,
          platform: 'youtube',
          embedUrl: `https://www.youtube.com/embed/${videoId}?rel=0&fs=1&cc_load_policy=0&iv_load_policy=3&showinfo=0&controls=1&disablekb=0&playsinline=1&color=white`
        };
      }
    }

    // Method 2: Parse iframe from HTML content (improved regex)
    const htmlContent = lesson.educational_content?.text_content || lesson.content_text || '';
    
    // Look for YouTube embed URLs in iframe src attributes
    const iframeMatch = htmlContent.match(/src=["']([^"']*youtube\.com\/embed\/[^"']*)["']/) ||
                        htmlContent.match(/src=([^\s>]*youtube\.com\/embed\/[^\s>]*)/);
    
    if (iframeMatch && iframeMatch[1]) {
      const videoId = this.getYouTubeVideoId(iframeMatch[1]);
      if (videoId) {
        return {
          videoId,
          platform: 'youtube',
          embedUrl: `https://www.youtube.com/embed/${videoId}?rel=0&fs=1&cc_load_policy=0&iv_load_policy=3&showinfo=0&controls=1&disablekb=0&playsinline=1&color=white`
        };
      }
    }

    // Method 3: Look for YouTube video IDs directly in the content
    const videoIdMatch = htmlContent.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
    if (videoIdMatch && videoIdMatch[1]) {
      return {
        videoId: videoIdMatch[1],
        platform: 'youtube',
        embedUrl: `https://www.youtube.com/embed/${videoIdMatch[1]}?rel=0&fs=1&cc_load_policy=0&iv_load_policy=3&showinfo=0&controls=1&disablekb=0&playsinline=1&color=white`
      };
    }

    return null;
  }

  /**
   * Remove video iframes from HTML content to prevent duplicates
   */
  static cleanHTMLContent(htmlContent: string): string {
    if (!htmlContent) return '';

    // Remove YouTube iframes
    let cleaned = htmlContent.replace(/<iframe[^>]*youtube\.com\/embed\/[^>]*><\/iframe>/gi, '');
    
    // Remove empty paragraphs that might be left behind
    cleaned = cleaned.replace(/<p>\s*<\/p>/gi, '');
    
    // Remove multiple consecutive line breaks
    cleaned = cleaned.replace(/(<br\s*\/?>){3,}/gi, '<br><br>');
    
    // Trim whitespace
    cleaned = cleaned.trim();

    return cleaned;
  }

  /**
   * Extract YouTube video ID from various URL formats
   */
  private static getYouTubeVideoId(url: string): string | null {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  /**
   * Generate embed URL for a video
   */
  static generateEmbedUrl(videoInfo: VideoInfo, origin?: string): string {
    const baseUrl = videoInfo.embedUrl;
    if (origin) {
      const url = new URL(baseUrl);
      url.searchParams.set('origin', origin);
      return url.toString();
    }
    return baseUrl;
  }

  /**
   * Check if lesson has video content
   */
  static hasVideo(lesson: CourseLesson): boolean {
    return this.extractVideoInfo(lesson) !== null;
  }
}

export type { VideoInfo, CourseLesson };