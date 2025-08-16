import type { CourseLesson } from '@/types/classroom/courseDetail';

interface VideoInfo {
  videoId: string;
  platform: 'youtube' | 'vimeo' | 'other';
  embedUrl: string;
  thumbnailUrl?: string;
  title?: string;
}

export class VideoContentExtractor {
  /**
   * Extract video information from a lesson
   * ✅ FIXED: Prioritize content_url to prevent duplicate video rendering
   */
  static extractVideoInfo(lesson: CourseLesson): VideoInfo | null {
    console.log('🎥 [VideoExtractor] Analyzing lesson for video content:', {
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      contentUrl: lesson.content_url,
      hasEducationalContent: !!lesson.educational_content,
      educationalContentMediaUrl: lesson.educational_content?.media_url,
      contentText: lesson.content_text?.substring(0, 200) + '...',
      educationalContentText: lesson.educational_content?.text_content?.substring(0, 200) + '...'
    });
    
    // ✅ PRIORITY 1: Single source of truth - course_lessons.content_url
    if (lesson.content_url) {
      const videoId = this.getYouTubeVideoId(lesson.content_url);
      if (videoId) {
        console.log('🎥 [VideoExtractor] Using content_url video:', lesson.content_url);
        return {
          videoId,
          platform: 'youtube',
          embedUrl: `https://www.youtube.com/embed/${videoId}?rel=0&fs=1&cc_load_policy=0&iv_load_policy=3&showinfo=0&controls=1&disablekb=0&playsinline=1&color=white`
        };
      }
    }

    // ✅ PRIORITY 2: Fallback to educational_content.media_url (legacy support)
    if (lesson.educational_content?.media_url) {
      const videoId = this.getYouTubeVideoId(lesson.educational_content.media_url);
      if (videoId) {
        console.log('🎥 [VideoExtractor] Using educational_content.media_url video:', lesson.educational_content.media_url);
        return {
          videoId,
          platform: 'youtube',
          embedUrl: `https://www.youtube.com/embed/${videoId}?rel=0&fs=1&cc_load_policy=0&iv_load_policy=3&showinfo=0&controls=1&disablekb=0&playsinline=1&color=white`
        };
      }
    }

    // ✅ PRIORITY 3: Only check HTML content if NO content_url exists (prevents duplicates)
    // This ensures that if content_url exists, we don't also render embedded videos from HTML
    if (!lesson.content_url && !lesson.educational_content?.media_url) {
      const htmlContent = lesson.content_text || lesson.educational_content?.text_content || '';
      if (htmlContent) {
        // Look for YouTube iframe embeds
        const iframeMatch = htmlContent.match(/src=["']([^"']*youtube\.com\/embed\/[^"']*)["']/);
        if (iframeMatch && iframeMatch[1]) {
          const videoId = this.getYouTubeVideoId(iframeMatch[1]);
          if (videoId) {
            console.log('🎥 [VideoExtractor] Found YouTube video in HTML content (no content_url):', iframeMatch[1]);
            return {
              videoId,
              platform: 'youtube',
              embedUrl: `https://www.youtube.com/embed/${videoId}?rel=0&fs=1&cc_load_policy=0&iv_load_policy=3&showinfo=0&controls=1&disablekb=0&playsinline=1&color=white`
            };
          }
        }
        
        // Look for TipTap YouTube extension data attributes
        const tiptapMatch = htmlContent.match(/data-youtube-video="([^"]+)"/);
        if (tiptapMatch && tiptapMatch[1]) {
          const videoId = this.getYouTubeVideoId(tiptapMatch[1]);
          if (videoId) {
            console.log('🎥 [VideoExtractor] Found TipTap YouTube video in HTML content (no content_url):', tiptapMatch[1]);
            return {
              videoId,
              platform: 'youtube',
              embedUrl: `https://www.youtube.com/embed/${videoId}?rel=0&fs=1&cc_load_policy=0&iv_load_policy=3&showinfo=0&controls=1&disablekb=0&playsinline=1&color=white`
            };
          }
        }
      }
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

    // Remove TipTap YouTube wrapper blocks to prevent leftover aspect-ratio padding
    cleaned = cleaned.replace(/<div[^>]*data-youtube-video[^>]*>[\s\S]*?<\/div>/gi, '');

    // Remove empty paragraphs that might be left behind (including &nbsp; and <br>)
    cleaned = cleaned.replace(/<p>(?:&nbsp;|\s|<br\s*\/?\s*>)*<\/p>/gi, '');

    // Remove multiple consecutive line breaks
    cleaned = cleaned.replace(/(<br\s*\/?>(?:\s|&nbsp;)*){3,}/gi, '<br><br>');

    // Trim whitespace
    cleaned = cleaned.trim();

    return cleaned;
  }

  /**
   * Extract YouTube video ID from various URL formats
   */
  private static getYouTubeVideoId(url: string): string | null {
    console.log('🎥 [VideoExtractor] getYouTubeVideoId called with URL:', url);
    
    // Handle direct embed URLs with parameters
    const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
    if (embedMatch) {
      console.log('🎥 [VideoExtractor] Found embed match:', embedMatch[1]);
      return embedMatch[1];
    }
    
    // Handle watch URLs
    const watchMatch = url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/);
    if (watchMatch) {
      console.log('🎥 [VideoExtractor] Found watch match:', watchMatch[1]);
      return watchMatch[1];
    }
    
    // Handle youtu.be URLs
    const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
    if (shortMatch) {
      console.log('🎥 [VideoExtractor] Found short match:', shortMatch[1]);
      return shortMatch[1];
    }
    
    console.log('🎥 [VideoExtractor] No video ID found in URL:', url);
    return null;
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
    const videoInfo = this.extractVideoInfo(lesson);
    console.log('🎥 [VideoExtractor] hasVideo check:', {
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      contentUrl: lesson.content_url,
      hasVideo: videoInfo !== null,
      videoInfo
    });
    return videoInfo !== null;
  }
}

export type { VideoInfo };