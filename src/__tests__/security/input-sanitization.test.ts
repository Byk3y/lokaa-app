import { describe, it, expect } from 'vitest';
import { sanitizeInput } from '@/utils/sanitization';

describe('Input Sanitization', () => {
  describe('Text Sanitization', () => {
    it('should sanitize script tags', () => {
      const input = '<script>alert("xss")</script>Hello<script src="evil.js"></script>';
      const sanitized = sanitizeInput(input);
      expect(sanitized).toBe('Hello');
    });

    it('should sanitize onclick attributes', () => {
      const input = '<div onclick="alert(\'xss\')">Click me</div>';
      const sanitized = sanitizeInput(input);
      expect(sanitized).toBe('<div>Click me</div>');
    });

    it('should allow safe HTML tags', () => {
      const input = '<p>Hello</p><b>World</b><i>!</i>';
      const sanitized = sanitizeInput(input);
      expect(sanitized).toBe('<p>Hello</p><b>World</b><i>!</i>');
    });

    it('should handle nested malicious content', () => {
      const input = '<div><script>bad()</script><p onclick="evil()">Hello<script>more()</script></p></div>';
      const sanitized = sanitizeInput(input);
      expect(sanitized).toBe('<div><p>Hello</p></div>');
    });
  });

  describe('HTML Encoding', () => {
    it('should encode special characters', () => {
      const input = '<>&"\'/';
      const sanitized = sanitizeInput(input);
      expect(sanitized).toBe('&lt;&gt;&amp;&quot;&#x27;&#x2F;');
    });

    it('should handle mixed content', () => {
      const input = 'Hello <b>world</b> & "friends"';
      const sanitized = sanitizeInput(input);
      expect(sanitized).toBe('Hello &lt;b&gt;world&lt;&#x2F;b&gt; &amp; &quot;friends&quot;');
    });

    it('should preserve safe characters', () => {
      const input = 'Hello World 123!';
      const sanitized = sanitizeInput(input);
      expect(sanitized).toBe('Hello World 123!');
    });
  });

  describe('URL Sanitization', () => {
    it('should sanitize javascript: URLs', () => {
      const input = 'javascript:alert("xss")';
      const sanitized = sanitizeInput(input);
      expect(sanitized).toBe('about:blank');
    });

    it('should allow safe URLs', () => {
      const input = 'https://example.com/path?query=123';
      const sanitized = sanitizeInput(input);
      expect(sanitized).toBe('https://example.com/path?query=123');
    });

    it('should handle data: URLs', () => {
      const input = 'data:text/html,<script>alert("xss")</script>';
      const sanitized = sanitizeInput(input);
      expect(sanitized).toBe('about:blank');
    });
  });

  describe('Form Input Sanitization', () => {
    it('should sanitize form field names', () => {
      const input = 'user[password]';
      const sanitized = sanitizeInput(input);
      expect(sanitized).toBe('user_password');
    });

    it('should handle SQL injection attempts', () => {
      const input = "' OR '1'='1";
      const sanitized = sanitizeInput(input);
      expect(sanitized).toBe('&#x27; OR &#x27;1&#x27;&#x3D;&#x27;1');
    });

    it('should preserve valid form input', () => {
      const input = 'user123@example.com';
      const sanitized = sanitizeInput(input);
      expect(sanitized).toBe('user123@example.com');
    });
  });
}); 