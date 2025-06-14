import { describe, it, expect, vi } from 'vitest';
import { generateSlug, getUniqueSlug } from '../slugUtils';
import { getSupabaseClient } from '@/integrations/supabase/client';

// Mock the Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn()
  }
}));

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
      // Mock the Supabase client to return no data (indicating the slug is unique)
      vi.mocked(getSupabaseClient().from('posts').select().eq().eq().maybeSingle).mockResolvedValue({ data: null, error: null });

      const result = await getUniqueSlug('test-slug', 'space-123');
      expect(result).toBe('test-slug');
    });

    it('should append a number if the slug already exists', async () => {
      // First call returns data (slug exists)
      vi.mocked(getSupabaseClient().from('posts').select().eq().eq().maybeSingle).mockResolvedValueOnce({ data: { id: 'existing-post' }, error: null });
      // Second call returns no data (new slug with -1 is unique)
      vi.mocked(getSupabaseClient().from('posts').select().eq().eq().maybeSingle).mockResolvedValueOnce({ data: null, error: null });

      const result = await getUniqueSlug('test-slug', 'space-123');
      expect(result).toBe('test-slug-1');
    });

    it('should increment the number until a unique slug is found', async () => {
      // Mock the first 3 calls to return data (slugs exist)
      vi.mocked(getSupabaseClient().from('posts').select().eq().eq().maybeSingle)
        .mockResolvedValueOnce({ data: { id: 'post-1' }, error: null })
        .mockResolvedValueOnce({ data: { id: 'post-2' }, error: null })
        .mockResolvedValueOnce({ data: { id: 'post-3' }, error: null })
        // Fourth call returns no data (slug with -3 is unique)
        .mockResolvedValueOnce({ data: null, error: null });

      const result = await getUniqueSlug('duplicate-title', 'space-123');
      expect(result).toBe('duplicate-title-3');
    });

    it('should handle empty input gracefully', async () => {
      const result = await getUniqueSlug('', 'space-123');
      expect(result).toBe('');
    });

    it('should handle database errors by returning the original slug', async () => {
      vi.mocked(getSupabaseClient().from('posts').select().eq().eq().maybeSingle).mockResolvedValue({ 
        data: null, 
        error: new Error('Database error') 
      });

      const result = await getUniqueSlug('error-test', 'space-123');
      expect(result).toBe('error-test');
    });
  });
}); 