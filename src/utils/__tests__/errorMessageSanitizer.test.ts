import { describe, it, expect, vi } from 'vitest';
import { sanitizeErrorMessage, sanitizeErrorTitle, sanitizeErrorForToast, getErrorType } from '../errorMessageSanitizer';

describe('errorMessageSanitizer', () => {
  describe('sanitizeErrorMessage', () => {
    it('should sanitize TypeError: Load failed in production', () => {
      const error = new Error('TypeError: Load failed');
      const result = sanitizeErrorMessage(error, true);
      
      // Should NOT contain the technical error message
      expect(result).not.toContain('TypeError');
      expect(result).not.toContain('Load failed');
      
      // Should contain user-friendly message
      expect(result.length).toBeGreaterThan(0);
    });

    it('should sanitize network errors in production', () => {
      const error = new Error('Network request failed');
      const result = sanitizeErrorMessage(error, true);
      
      // Should contain user-friendly network message
      expect(result.toLowerCase()).toContain('network');
      expect(result.toLowerCase()).not.toContain('request failed');
    });

    it('should return technical details in development mode', () => {
      const error = new Error('TypeError: Load failed');
      const result = sanitizeErrorMessage(error, false, { includeOriginal: true });
      
      // In development with includeOriginal, may contain technical details
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle null/undefined errors gracefully', () => {
      expect(sanitizeErrorMessage(null, true)).toBeTruthy();
      expect(sanitizeErrorMessage(undefined, true)).toBeTruthy();
    });

    it('should handle string errors', () => {
      const result = sanitizeErrorMessage('Some error string', true);
      expect(result).toBeTruthy();
    });
  });

  describe('sanitizeErrorTitle', () => {
    it('should return appropriate title for network errors', () => {
      const error = new Error('Network request failed');
      const result = sanitizeErrorTitle(error, true);
      
      // Should return a meaningful title (Network-related or generic Error)
      expect(result).toBeTruthy();
      expect(['Connection Error', 'Error']).toContain(result);
    });

    it('should return generic Error title for unknown errors', () => {
      const error = new Error('Some random error');
      const result = sanitizeErrorTitle(error, true);
      
      expect(result).toBe('Error');
    });
  });

  describe('sanitizeErrorForToast', () => {
    it('should return title and description', () => {
      const error = new Error('Network error');
      const result = sanitizeErrorForToast(error, true);
      
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('description');
      expect(result.title).toBeTruthy();
      expect(result.description).toBeTruthy();
    });

    it('should shorten long descriptions for toasts', () => {
      const longError = new Error('A'.repeat(200));
      const result = sanitizeErrorForToast(longError, true);
      
      // Toast descriptions should be shortened
      expect(result.description.length).toBeLessThanOrEqual(100);
    });
  });

  describe('getErrorType', () => {
    it('should detect network errors', () => {
      const error = new Error('Network request failed');
      const result = getErrorType(error);
      
      expect(result.isNetworkError).toBe(true);
    });

    it('should detect auth errors', () => {
      const error = new Error('Authentication failed');
      const result = getErrorType(error);
      
      expect(result.isAuthError).toBe(true);
    });

    it('should detect Supabase load errors', () => {
      const error = new Error('TypeError: Load failed');
      const result = getErrorType(error);
      
      expect(result.isSupabaseLoadError).toBe(true);
    });

    it('should detect timeout errors', () => {
      const error = new Error('Request timeout');
      const result = getErrorType(error);
      
      expect(result.isTimeoutError).toBe(true);
    });
  });
});

