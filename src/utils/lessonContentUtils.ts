import type { CourseLesson } from '@/types/classroom/courseDetail';
import { VideoContentExtractor } from '@/utils/videoContentExtractor';

/**
 * Utility functions for LessonContent component
 * Extracted from LessonContent.tsx for better modularity and reusability
 */

export interface ContentSource {
  content: string;
  isEducationalContent: boolean;
  source: 'educational_content' | 'legacy_content_text' | 'posts_content' | 'no_content';
}

/**
 * Determines the source and content of a lesson from multiple possible fields
 * Handles deduplication of video content to prevent duplicate video displays
 */
export const getContentSource = (lesson: CourseLesson | null): ContentSource => {
  if (!lesson) {
    return {
      content: '',
      isEducationalContent: false,
      source: 'no_content'
    };
  }

  let content = '';
  let isEducationalContent = false;
  let source: ContentSource['source'] = 'no_content';

  // Priority 1: educational_content (new system)
  if (lesson?.educational_content?.text_content) {
    content = lesson.educational_content.text_content;
    isEducationalContent = true;
    source = 'educational_content';
  }
  // Priority 2: legacy content_text field
  else if (lesson?.content_text) {
    content = lesson.content_text;
    isEducationalContent = false;
    source = 'legacy_content_text';
  }
  // Priority 3: posts table content
  else if (lesson?.posts?.content) {
    content = lesson.posts.content;
    isEducationalContent = false;
    source = 'posts_content';
  }

  // ✅ Clean only when a featured video (content_url/media_url) will render separately at the top
  // If video is embedded inline in the HTML (no content_url), preserve placement
  if (content && (lesson?.content_url || lesson?.educational_content?.media_url)) {
    content = VideoContentExtractor.cleanHTMLContent(content);
  }

  return {
    content,
    isEducationalContent,
    source
  };
};

/**
 * Ensures content is properly formatted for TipTap editor
 */
export const ensureValidContent = (content: string): string => {
  if (!content || content.trim() === '') return '';
  
  // If content contains video embeds, ensure it's properly formatted
  if (content.includes('data-youtube-video') || content.includes('iframe') || content.includes('embed')) {
    // Add a non-breaking space after video embeds to ensure TipTap recognizes it as non-empty
    const videoContent = content.trim();
    // If the content ends with video embed, add a paragraph to ensure it's recognized as non-empty
    if (videoContent.includes('</div>') && !videoContent.includes('<p>')) {
      return videoContent + '<p>&nbsp;</p>';
    }
    return videoContent;
  }
  
  // If content is just whitespace or empty tags, return empty
  const stripped = content.replace(/<[^>]*>/g, '').trim();
  if (stripped === '') return '';
  
  // Ensure content has at least one valid HTML element
  if (!content.includes('<')) {
    return `<p>${content}</p>`;
  }
  
  return content;
};

/**
 * Removes duplicate H2 titles for edit mode to prevent redundant titles
 */
export const removeDuplicateH2Titles = (content: string | null, lessonTitle?: string): string => {
  if (!content) return '';
  
  // Remove the hr tag if it exists
  let cleaned = content.replace(/<hr[^>]*>/gi, '');
  
  // Remove H1 tags that contain the exact lesson title (since title is shown separately)
  if (lessonTitle) {
    // Remove H1 tags containing the title
    cleaned = cleaned.replace(new RegExp(`<h1[^>]*>\\s*${lessonTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*</h1>`, 'gi'), '');
    // Remove H2 tags containing the title
    cleaned = cleaned.replace(new RegExp(`<h2[^>]*>\\s*${lessonTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*</h2>`, 'gi'), '');
  }
  
  // Remove any leading whitespace and empty paragraphs
  cleaned = cleaned.replace(/^\s*<p>\s*<\/p>\s*/i, '').trim();
  
  // Ensure we don't return empty content if there was valid content
  if (cleaned === '' && content.trim() !== '') {
    // If we accidentally removed all content, return the original content
    return content.trim();
  }
  
  return cleaned;
};

/**
 * Adds spacing around video elements for better visual presentation
 */
export const addVideoSpacing = (content: string): string => {
  if (!content) return content;
  
  // Add spacing after iframe elements (most common for YouTube embeds)
  let processed = content.replace(
    /(<iframe[^>]*>.*?<\/iframe>)/gi,
    '$1<div style="margin-bottom: 3rem; height: 0;"></div>'
  );
  
  // Add spacing after video elements
  processed = processed.replace(
    /(<video[^>]*>.*?<\/video>)/gi,
    '$1<div style="margin-bottom: 3rem; height: 0;"></div>'
  );
  
  return processed;
};

/**
 * Extracts title from content if not provided
 * Used in inline creation flow
 */
export const extractTitleFromContent = (content: string, providedTitle = ''): string => {
  let finalTitle = providedTitle.trim();
  
  if (!finalTitle && content) {
    // Try to extract title from the first heading in the content (HTML format)
    const headingMatch = content.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/i);
    if (headingMatch) {
      finalTitle = headingMatch[1].replace(/<[^>]*>/g, '').trim();
    } else {
      // Try to extract from the first paragraph
      const paragraphMatch = content.match(/<p[^>]*>(.*?)<\/p>/i);
      if (paragraphMatch) {
        const text = paragraphMatch[1].replace(/<[^>]*>/g, '').trim();
        if (text && text.length <= 100) {
          finalTitle = text;
        } else {
          finalTitle = "Untitled Page";
        }
      } else {
        // Try to extract from plain text (fallback)
        const firstLine = content.split('\\n')[0].trim();
        if (firstLine && firstLine.length > 0 && firstLine.length <= 100) {
          finalTitle = firstLine;
        } else {
          // If no content yet, use a default title
          finalTitle = "Untitled Page";
        }
      }
    }
  }

  return finalTitle || "Untitled Page";
};