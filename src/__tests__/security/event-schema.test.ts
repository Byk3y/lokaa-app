import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getSupabaseClient } from '@/integrations/supabase/client';

// Using global Supabase mock from vitest setup

describe('Security Event Schema', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Event Validation', () => {
    it('should validate security event schema on CSRF failure', async () => {
      // Mock event insertion
      const mockEventInsert = vi.fn().mockImplementation((event) => {
        // Validate event schema
        expect(event).toEqual(
          expect.objectContaining({
            event_type: 'security.csrf_fail',
            event_data: expect.objectContaining({
              token: expect.any(String),
              reason: expect.any(String),
              timestamp: expect.any(Number)
            })
          })
        );
        return Promise.resolve({ data: null, error: null });
      });

      const mockClient = {
        from: vi.fn().mockReturnValue({
          insert: mockEventInsert
        })
      };

      vi.mocked(getSupabaseClient).mockReturnValue(mockClient);

      // Log CSRF failure event
      const event = {
        event_type: 'security.csrf_fail',
        event_data: {
          token: 'test-token',
          reason: 'token_reuse',
          timestamp: Date.now()
        }
      };

      const response = await fetch('/api/security/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });

      expect(response.status).toBe(200);
      expect(mockEventInsert).toHaveBeenCalled();
    });

    it('should validate security event schema on token reuse', async () => {
      // Get CSRF token
      const tokenResponse = await fetch('/api/auth/csrf');
      expect(tokenResponse.status).toBe(200);
      const { token } = await tokenResponse.json();

      // Mock event insertion
      const mockEventInsert = vi.fn();
      vi.mocked(getSupabaseClient).mockReturnValue({
        from: vi.fn().mockReturnValue({
          insert: mockEventInsert
        })
      });

      // Attempt token reuse
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': token
        },
        body: JSON.stringify({ title: 'Test Post' })
      });

      expect(response.status).toBe(403);

      // Verify event schema
      expect(mockEventInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'security.token_reuse',
          event_data: expect.objectContaining({
            token: expect.any(String),
            timestamp: expect.any(Number)
          })
        })
      );
    });

    it('should validate security event schema on session expiry', async () => {
      // Mock event insertion
      const mockEventInsert = vi.fn().mockImplementation((event) => {
        // Validate event schema
        expect(event).toEqual(
          expect.objectContaining({
            event_type: 'security.session_expired',
            event_data: expect.objectContaining({
              session_id: expect.any(String),
              user_id: expect.any(String),
              timestamp: expect.any(Number)
            })
          })
        );
        return Promise.resolve({ data: null, error: null });
      });

      const mockClient = {
        from: vi.fn().mockReturnValue({
          insert: mockEventInsert
        })
      };

      vi.mocked(getSupabaseClient).mockReturnValue(mockClient);

      // Advance time to trigger session expiry
      vi.advanceTimersByTime(11000);

      // Log session expiry event
      const event = {
        event_type: 'security.session_expired',
        event_data: {
          session_id: 'test-session',
          user_id: 'test-user',
          timestamp: Date.now()
        }
      };

      const response = await fetch('/api/security/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });

      expect(response.status).toBe(200);
      expect(mockEventInsert).toHaveBeenCalled();
    });
  });
}); 