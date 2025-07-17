import DOMPurify from 'dompurify';

/**
 * Configuration for different content types
 */
interface SanitizerConfig {
  ALLOWED_TAGS: string[];
  ALLOWED_ATTR: string[];
  ALLOW_DATA_ATTR: boolean;
  FORCE_BODY: boolean;
  RETURN_DOM: boolean;
  RETURN_DOM_FRAGMENT: boolean;
  SANITIZE_DOM: boolean;
}

/**
 * Predefined configurations for different use cases
 */
const SANITIZER_CONFIGS = {
  // For rich post content with full formatting
  POST_CONTENT: {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'i', 'b', 'span', 'div',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'code', 'pre',
      'a', 'img', 'mention'
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'class', 'id', 'target', 'rel'
    ],
    ALLOW_DATA_ATTR: false,
    FORCE_BODY: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    SANITIZE_DOM: true
  } as SanitizerConfig,

  // For simple text content with basic formatting
  SIMPLE_TEXT: {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'i', 'b', 'span'
    ],
    ALLOWED_ATTR: ['class'],
    ALLOW_DATA_ATTR: false,
    FORCE_BODY: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    SANITIZE_DOM: true
  } as SanitizerConfig,

  // For lesson content (more restrictive)
  LESSON_CONTENT: {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'i', 'b', 'span', 'div',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'code', 'pre'
    ],
    ALLOWED_ATTR: ['class', 'id'],
    ALLOW_DATA_ATTR: false,
    FORCE_BODY: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    SANITIZE_DOM: true
  } as SanitizerConfig,

  // For very restrictive content (no HTML)
  PLAIN_TEXT: {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    ALLOW_DATA_ATTR: false,
    FORCE_BODY: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    SANITIZE_DOM: true
  } as SanitizerConfig
};

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param content - The HTML content to sanitize
 * @param configType - The type of sanitization to apply
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(
  content: string, 
  configType: keyof typeof SANITIZER_CONFIGS = 'POST_CONTENT'
): string {
  if (!content) {
    return '';
  }

  const config = SANITIZER_CONFIGS[configType];
  
  // Sanitize the HTML content
  const sanitized = DOMPurify.sanitize(content, config);
  
  // Additional security: ensure all external links have proper security attributes
  if (configType === 'POST_CONTENT' && sanitized.includes('<a')) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = sanitized;
    
    const links = tempDiv.querySelectorAll('a');
    links.forEach(link => {
      const href = link.getAttribute('href');
      if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      }
    });
    
    return tempDiv.innerHTML;
  }
  
  return sanitized;
}

/**
 * Sanitize content for post display
 * @param content - The post content to sanitize
 * @returns Sanitized HTML string safe for rendering
 */
export function sanitizePostContent(content: string): string {
  return sanitizeHtml(content, 'POST_CONTENT');
}

/**
 * Sanitize content for lesson display
 * @param content - The lesson content to sanitize
 * @returns Sanitized HTML string safe for rendering
 */
export function sanitizeLessonContent(content: string): string {
  return sanitizeHtml(content, 'LESSON_CONTENT');
}

/**
 * Sanitize simple text content
 * @param content - The text content to sanitize
 * @returns Sanitized HTML string safe for rendering
 */
export function sanitizeSimpleText(content: string): string {
  return sanitizeHtml(content, 'SIMPLE_TEXT');
}

/**
 * Strip all HTML tags and return plain text
 * @param content - The HTML content to strip
 * @returns Plain text string
 */
export function stripHtml(content: string): string {
  return sanitizeHtml(content, 'PLAIN_TEXT');
}

/**
 * Check if content contains potentially dangerous HTML
 * @param content - The content to check
 * @returns True if content contains potentially dangerous HTML
 */
export function containsDangerousHtml(content: string): boolean {
  if (!content) return false;
  
  const dangerousPatterns = [
    /<script/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /<form/i,
    /javascript:/i,
    /vbscript:/i,
    /data:text\/html/i,
    /on\w+\s*=/i, // onclick, onload, etc.
  ];
  
  return dangerousPatterns.some(pattern => pattern.test(content));
}