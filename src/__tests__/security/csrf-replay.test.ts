import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getSupabaseClient } from '@/integrations/supabase/client';

// Using global Supabase mock from vitest setup

describe('CSRF Token Replay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('One-Time Token Usage', () => {
    it('should reject CSRF token replay within 15 minutes', async () => {
      // Get initial CSRF token
      const tokenResponse = await fetch('/api/auth/csrf');
      const { token } = await tokenResponse.json();

      // First use should succeed
      const firstResponse = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': token
        },
        body: JSON.stringify({ title: 'Test Post' })
      });
      expect(firstResponse.status).toBe(200);

      // Second use (replay) should fail
      const replayResponse = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': token
        },
        body: JSON.stringify({ title: 'Replay Attack' })
      });
      expect(replayResponse.status).toBe(403);
      expect(await replayResponse.json()).toEqual({
        message: 'Invalid CSRF token'
      });
    });

    it('should reject CSRF token after expiry (15 minutes)', async () => {
      // Get initial CSRF token
      const tokenResponse = await fetch('/api/auth/csrf');
      const { token } = await tokenResponse.json();

      // Advance time by 16 minutes
      vi.advanceTimersByTime(16 * 60 * 1000);

      // Use after expiry should fail
      const expiredResponse = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': token
        },
        body: JSON.stringify({ title: 'Expired Token' })
      });
      expect(expiredResponse.status).toBe(403);
      expect(await expiredResponse.json()).toEqual({
        message: 'Invalid CSRF token'
      });
    });
  });
}); 