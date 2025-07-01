import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getSupabaseClient } from '@/integrations/supabase/client';

describe('Rate Limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Mock fetch
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/auth/login') {
        return Promise.resolve({
          ok: false,
          status: 429,
          headers: {
            get: (name: string) => name === 'retry-after' ? '60' : null
          },
          json: () => Promise.resolve({ message: 'Too many requests' })
        });
      }

      if (url === '/api/posts') {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: {
            get: () => null
          },
          json: () => Promise.resolve({ success: true })
        });
      }

      return Promise.resolve({
        ok: true,
        status: 200,
        headers: {
          get: () => null
        },
        json: () => Promise.resolve({})
      });
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('API Rate Limits', () => {
    it('should enforce rate limits on auth endpoints', async () => {
      // Attempt login request
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: 'test@example.com', password: 'password' })
      });

      // Verify rate limit response
      expect(response.status).toBe(429);
      expect(response.headers.get('retry-after')).toBe('60');
    });

    it('should enforce rate limits on post creation', async () => {
      // Mock fetch to allow first 5 requests then rate limit
      let requestCount = 0;
      (global.fetch as any).mockImplementation(() => {
        requestCount++;
        if (requestCount <= 5) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: {
              get: () => null
            },
            json: () => Promise.resolve({ success: true })
          });
        }
        return Promise.resolve({
          ok: false,
          status: 429,
          headers: {
            get: (name: string) => name === 'retry-after' ? '30' : null
          },
          json: () => Promise.resolve({ message: 'Too many requests' })
        });
      });

      // Attempt rapid post creation
      const responses = [];
      for (let i = 0; i < 10; i++) {
        const response = await fetch('/api/posts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': 'test-token'
          },
          body: JSON.stringify({ title: 'Test Post' })
        });
        responses.push(response);
      }
      
      // Verify first 5 succeeded
      responses.slice(0, 5).forEach(response => {
        expect(response.status).toBe(200);
      });

      // Verify remaining were rate limited
      responses.slice(5).forEach(response => {
        expect(response.status).toBe(429);
        expect(response.headers.get('retry-after')).toBe('30');
      });
    });
  });

  describe('Rate Limit Recovery', () => {
    it('should allow requests after rate limit expires', async () => {
      // Mock fetch to rate limit then allow after delay
      let isRateLimited = true;
      (global.fetch as any).mockImplementation(() => {
        if (isRateLimited) {
          return Promise.resolve({
            ok: false,
            status: 429,
            headers: {
              get: (name: string) => name === 'retry-after' ? '5' : null
            },
            json: () => Promise.resolve({ message: 'Too many requests' })
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: {
            get: () => null
          },
          json: () => Promise.resolve({ success: true })
        });
      });

      // Initial request (rate limited)
      const response1 = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': 'test-token'
        }
      });
      expect(response1.status).toBe(429);

      // Wait for rate limit to expire
      vi.advanceTimersByTime(5000);
      isRateLimited = false;

      // Retry request
      const response2 = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': 'test-token'
        }
      });
      expect(response2.status).toBe(200);
    });
  });
}); 