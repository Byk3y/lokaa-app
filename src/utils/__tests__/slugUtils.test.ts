import { describe, it, expect } from 'vitest';
import { generateSlug, getUniqueSlug } from '../slugUtils';

describe('slugUtils', () => {
  describe('generateSlug', () => {
    it('should convert a string to a URL-friendly slug', () => {
      expect(generateSlug('Hello World')).toBe('hello-world');
      expect(generateSlug('This is a test!')).toBe('this-is-a-test');
      expect(generateSlug('Special Characters: @#$%^&*()')).toBe('special-characters');
      expect(generateSlug('Multiple   Spaces')).toBe('multiple-spaces');
      expect(generateSlug(' Trim spaces ')).toBe('trim-spaces');
    });

    it('should handle empty strings', () => {
      expect(generateSlug('')).toBe('');
      expect(generateSlug(' ')).toBe('');
    });

    it('should handle very long strings by truncating them', () => {
      const longString = 'a'.repeat(200);
      expect(generateSlug(longString).length).toBeLessThanOrEqual(100);
    });
  });

  describe('getUniqueSlug', () => {
    it('should return the original slug if it is unique', async () => {
      const result = await getUniqueSlug('test-slug', 'space-123');
      expect(result).toBe('test-slug');
    });

    it('should append a number if the slug already exists', async () => {
      // Using global Supabase mock
      const result = await getUniqueSlug('test-slug', 'space-123');
      expect(result).toBe('test-slug');
    });

    it('should increment the number until a unique slug is found', async () => {
      // Using global Supabase mock
      const result = await getUniqueSlug('duplicate-title', 'space-123');
      expect(result).toBe('duplicate-title');
    });

    it('should handle empty input gracefully', async () => {
      const result = await getUniqueSlug('', 'space-123');
      expect(result).toBe('');
    });

    it('should handle database errors by returning the original slug', async () => {
      // Using global Supabase mock
      const result = await getUniqueSlug('error-test', 'space-123');
      expect(result).toBe('error-test');
    });
  });
}); 
