import { 
  sanitizeHtml, 
  sanitizePostContent, 
  sanitizeLessonContent, 
  sanitizeSimpleText,
  stripHtml,
  containsDangerousHtml
} from '../htmlSanitizer';

// Mock DOMPurify for testing
jest.mock('dompurify', () => ({
  sanitize: jest.fn((content, config) => {
    // Simple mock that removes script tags but keeps basic HTML
    return content
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  })
}));

describe('htmlSanitizer', () => {
  describe('sanitizePostContent', () => {
    it('should remove script tags', () => {
      const maliciousContent = '<p>Hello</p><script>alert("xss")</script>';
      const result = sanitizePostContent(maliciousContent);
      expect(result).toBe('<p>Hello</p>');
    });

    it('should preserve safe HTML', () => {
      const safeContent = '<p>Hello <strong>world</strong></p>';
      const result = sanitizePostContent(safeContent);
      expect(result).toBe('<p>Hello <strong>world</strong></p>');
    });

    it('should handle empty content', () => {
      const result = sanitizePostContent('');
      expect(result).toBe('');
    });
  });

  describe('sanitizeLessonContent', () => {
    it('should sanitize lesson content', () => {
      const content = '<h1>Lesson Title</h1><p>Content</p>';
      const result = sanitizeLessonContent(content);
      expect(result).toBe('<h1>Lesson Title</h1><p>Content</p>');
    });
  });

  describe('sanitizeSimpleText', () => {
    it('should only allow basic text formatting', () => {
      const content = '<p>Hello <strong>world</strong></p>';
      const result = sanitizeSimpleText(content);
      expect(result).toBe('<p>Hello <strong>world</strong></p>');
    });
  });

  describe('stripHtml', () => {
    it('should remove all HTML tags', () => {
      const content = '<p>Hello <strong>world</strong></p>';
      const result = stripHtml(content);
      expect(result).toBe('Hello world');
    });
  });

  describe('containsDangerousHtml', () => {
    it('should detect script tags', () => {
      const content = '<p>Hello</p><script>alert("xss")</script>';
      expect(containsDangerousHtml(content)).toBe(true);
    });

    it('should detect onclick handlers', () => {
      const content = '<p onclick="alert(1)">Click me</p>';
      expect(containsDangerousHtml(content)).toBe(true);
    });

    it('should detect javascript: URLs', () => {
      const content = '<a href="javascript:alert(1)">Link</a>';
      expect(containsDangerousHtml(content)).toBe(true);
    });

    it('should return false for safe content', () => {
      const content = '<p>Hello <strong>world</strong></p>';
      expect(containsDangerousHtml(content)).toBe(false);
    });

    it('should handle empty content', () => {
      expect(containsDangerousHtml('')).toBe(false);
    });
  });
});