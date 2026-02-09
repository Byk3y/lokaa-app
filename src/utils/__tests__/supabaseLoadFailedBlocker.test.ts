/**
 * Unit tests for SupabaseLoadFailedBlocker
 */

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { supabaseLoadFailedBlocker } from '../supabaseLoadFailedBlocker';
import { MOBILE_SAFE_RELOAD_DELAY_MS, MAX_REFRESH_RETRIES } from '@/constants/mobile';

// Mock modules
vi.mock('@/integrations/supabase/client', () => ({
  getSupabaseClient: vi.fn(() => ({
    auth: {
      refreshSession: vi.fn()
    }
  }))
}));

vi.mock('@/services/RealtimeManager', () => ({
  realtimeManager: {
    reconnectAll: vi.fn()
  }
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn()
  }))
}));

describe('SupabaseLoadFailedBlocker', () => {
  let mockRefreshSession: any;
  let mockReconnectAll: any;
  let originalAddEventListener: any;
  let originalDocument: any;
  let visibilityChangeCallback: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock Supabase client
    const { getSupabaseClient } = require('@/integrations/supabase/client');
    mockRefreshSession = vi.fn();
    getSupabaseClient.mockReturnValue({
      auth: {
        refreshSession: mockRefreshSession
      }
    });

    // Mock RealtimeManager
    const { realtimeManager } = require('@/services/RealtimeManager');
    mockReconnectAll = vi.fn();
    realtimeManager.reconnectAll = mockReconnectAll;

    // Mock document and addEventListener
    originalDocument = global.document;
    originalAddEventListener = global.addEventListener;

    global.document = {
      hidden: false,
      addEventListener: vi.fn((event, callback) => {
        if (event === 'visibilitychange') {
          visibilityChangeCallback = callback;
        }
      }),
      removeEventListener: vi.fn()
    } as any;

    global.addEventListener = vi.fn();
    global.window = global.window || {};

    // Reset the blocker instance
    (supabaseLoadFailedBlocker as any).consecutiveFailedRefreshes = 0;
    (supabaseLoadFailedBlocker as any).isRefreshing = false;
    (supabaseLoadFailedBlocker as any).backgroundStartTime = 0;
  });

  afterEach(() => {
    global.document = originalDocument;
    global.addEventListener = originalAddEventListener;
    vi.restoreAllMocks();
  });

  describe('Background Timing', () => {
    it('should track background timing on visibilitychange', () => {
      const mockTime = 1000000;
      vi.spyOn(Date, 'now').mockReturnValue(mockTime);

      // Simulate app going to background
      (global.document as any).hidden = true;
      visibilityChangeCallback();

      expect((supabaseLoadFailedBlocker as any).backgroundStartTime).toBe(mockTime);
    });

    it('should not trigger recovery if backgrounded for less than MOBILE_SAFE_RELOAD_DELAY_MS', async () => {
      const startTime = 1000000;
      const currentTime = startTime + (MOBILE_SAFE_RELOAD_DELAY_MS - 1000); // 1 second less than threshold

      // Set background start time
      (supabaseLoadFailedBlocker as any).backgroundStartTime = startTime;

      vi.spyOn(Date, 'now').mockReturnValue(currentTime);

      // Trigger recovery
      await (supabaseLoadFailedBlocker as any).handleLoadFailed();

      // Should not call refreshSession
      expect(mockRefreshSession).not.toHaveBeenCalled();
      expect(mockReconnectAll).not.toHaveBeenCalled();
    });

    it('should trigger recovery if backgrounded for more than MOBILE_SAFE_RELOAD_DELAY_MS', async () => {
      const startTime = 1000000;
      const currentTime = startTime + MOBILE_SAFE_RELOAD_DELAY_MS + 1000; // 1 second more than threshold

      // Set background start time
      (supabaseLoadFailedBlocker as any).backgroundStartTime = startTime;

      vi.spyOn(Date, 'now').mockReturnValue(currentTime);

      // Mock successful refresh
      mockRefreshSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
        error: null
      });

      // Trigger recovery
      await (supabaseLoadFailedBlocker as any).handleLoadFailed();

      // Should call refreshSession and reconnectAll
      expect(mockRefreshSession).toHaveBeenCalledOnce();
      expect(mockReconnectAll).toHaveBeenCalledOnce();
    });
  });

  describe('Session Refresh', () => {
    beforeEach(() => {
      // Set background time to exceed threshold
      const startTime = 1000000;
      const currentTime = startTime + MOBILE_SAFE_RELOAD_DELAY_MS + 1000;
      (supabaseLoadFailedBlocker as any).backgroundStartTime = startTime;
      vi.spyOn(Date, 'now').mockReturnValue(currentTime);
    });

    it('should reset retry counter on successful refresh', async () => {
      // Set some failed attempts
      (supabaseLoadFailedBlocker as any).consecutiveFailedRefreshes = 2;

      // Mock successful refresh
      mockRefreshSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
        error: null
      });

      await (supabaseLoadFailedBlocker as any).handleLoadFailed();

      expect((supabaseLoadFailedBlocker as any).consecutiveFailedRefreshes).toBe(0);
      expect(mockReconnectAll).toHaveBeenCalledOnce();
    });

    it('should increment retry counter on failed refresh', async () => {
      mockRefreshSession.mockResolvedValue({
        data: null,
        error: new Error('Refresh failed')
      });

      await (supabaseLoadFailedBlocker as any).handleLoadFailed();

      expect((supabaseLoadFailedBlocker as any).consecutiveFailedRefreshes).toBe(1);
      expect(mockReconnectAll).not.toHaveBeenCalled();
    });

    it('should show manual reload toast after max retries', async () => {
      // Set retry count to max - 1
      (supabaseLoadFailedBlocker as any).consecutiveFailedRefreshes = MAX_REFRESH_RETRIES - 1;

      // Mock custom event dispatch
      const mockDispatchEvent = vi.fn();
      global.window.dispatchEvent = mockDispatchEvent;

      mockRefreshSession.mockResolvedValue({
        data: null,
        error: new Error('Refresh failed')
      });

      await (supabaseLoadFailedBlocker as any).handleLoadFailed();

      expect((supabaseLoadFailedBlocker as any).consecutiveFailedRefreshes).toBe(0); // Reset after max retries
      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'supabase-manual-reload-needed',
          detail: expect.objectContaining({
            title: 'Connection Issue',
            description: 'Please refresh the page to restore connection.',
            variant: 'destructive'
          })
        })
      );
    });

    it('should prevent concurrent refresh attempts', async () => {
      // Set isRefreshing to true
      (supabaseLoadFailedBlocker as any).isRefreshing = true;

      await (supabaseLoadFailedBlocker as any).handleLoadFailed();

      // Should not call refreshSession when already refreshing
      expect(mockRefreshSession).not.toHaveBeenCalled();
    });
  });

  describe('Public Methods', () => {
    it('should manually trigger recovery', async () => {
      const startTime = 1000000;
      const currentTime = startTime + MOBILE_SAFE_RELOAD_DELAY_MS + 1000;
      (supabaseLoadFailedBlocker as any).backgroundStartTime = startTime;
      vi.spyOn(Date, 'now').mockReturnValue(currentTime);

      mockRefreshSession.mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
        error: null
      });

      supabaseLoadFailedBlocker.triggerRecovery();

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockRefreshSession).toHaveBeenCalledOnce();
    });

    it('should reset retry counter', () => {
      (supabaseLoadFailedBlocker as any).consecutiveFailedRefreshes = 3;

      supabaseLoadFailedBlocker.resetRetryCounter();

      expect(supabaseLoadFailedBlocker.getRetryCount()).toBe(0);
    });

    it('should return current retry count', () => {
      (supabaseLoadFailedBlocker as any).consecutiveFailedRefreshes = 2;

      expect(supabaseLoadFailedBlocker.getRetryCount()).toBe(2);
    });
  });

  describe('Error Detection', () => {
    it('should detect Supabase load errors', () => {
      const errors = [
        'TypeError: Load failed from supabase',
        { message: 'Load failed supabase-js' },
        'Failed to fetch from supabase.co',
        'NetworkError with supabase'
      ];

      errors.forEach(error => {
        expect(supabaseLoadFailedBlocker.shouldBlockError(error)).toBe(true);
      });
    });

    it('should not detect non-Supabase errors', () => {
      const errors = [
        'Regular fetch error',
        { message: 'Some other error' },
        'Network timeout',
        null,
        undefined
      ];

      errors.forEach(error => {
        expect(supabaseLoadFailedBlocker.shouldBlockError(error)).toBe(false);
      });
    });
  });
}); 