import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { securityEvents } from './setup';

describe('Refresh Token Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Grace Period Handling', () => {
    it('should allow refresh token reuse within 10s grace period', async () => {
      // Get CSRF token
      const tokenResponse = await fetch('/api/auth/csrf');
      expect(tokenResponse.status).toBe(200);
      const { token } = await tokenResponse.json();

      // First refresh attempt
      const response1 = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': token
        }
      });

      expect(response1.status).toBe(200);

      // Wait 5 seconds (within grace period)
      vi.advanceTimersByTime(5000);

      // Second refresh attempt with same token
      const response2 = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': token
        }
      });

      expect(response2.status).toBe(200);

      // Verify event was logged
      const events = securityEvents.get('security.token_reuse') || [];
      expect(events.length).toBe(1);
      expect(events[0]).toEqual({
        event_type: 'security.token_reuse',
        event_data: {
          token_id: token,
          previous_use: expect.any(String),
          timestamp: expect.any(Number)
        }
      });
    });

    it('should reject refresh token reuse after grace period', async () => {
      // Get CSRF token
      const tokenResponse = await fetch('/api/auth/csrf');
      expect(tokenResponse.status).toBe(200);
      const { token } = await tokenResponse.json();

      // First refresh attempt
      const response1 = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': token
        }
      });

      expect(response1.status).toBe(200);

      // Wait 15 seconds (outside grace period)
      vi.advanceTimersByTime(15000);

      // Second refresh attempt with same token
      const response2 = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': token
        }
      });

      expect(response2.status).toBe(440);
      expect(response2.headers.get('x-refresh-token-reuse')).toBe('true');

      // Verify event was logged
      const events = securityEvents.get('security.token_reuse') || [];
      expect(events.length).toBe(1);
      expect(events[0]).toEqual({
        event_type: 'security.token_reuse',
        event_data: {
          token_id: token,
          previous_use: expect.any(String),
          timestamp: expect.any(Number)
        }
      });
    });
  });
}); 