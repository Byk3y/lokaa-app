import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TrustTokenService } from '@/services/TrustTokenService';

// Mock sessionStorage
const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage
});

describe('TrustTokenService', () => {
  beforeEach(() => {
    // Clear cache and reset mocks before each test
    TrustTokenService.clearCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clear cache after each test
    TrustTokenService.clearCache();
  });

  describe('validateToken', () => {
    it('returns null for missing subdomain or userId', () => {
      expect(TrustTokenService.validateToken('', 'user123')).toBeNull();
      expect(TrustTokenService.validateToken('subdomain', '')).toBeNull();
      expect(TrustTokenService.validateToken('', '')).toBeNull();
    });

    it('returns null when no token data in sessionStorage', () => {
      mockSessionStorage.getItem.mockReturnValue(null);
      
      const result = TrustTokenService.validateToken('test-space', 'user123');
      
      expect(result).toBeNull();
      expect(mockSessionStorage.getItem).toHaveBeenCalledWith('trust_token_test-space');
    });

    it('returns null for invalid JSON in sessionStorage', () => {
      mockSessionStorage.getItem.mockReturnValue('invalid-json');
      
      const result = TrustTokenService.validateToken('test-space', 'user123');
      
      expect(result).toBeNull();
    });

    it('returns null for token missing required fields', () => {
      const invalidToken = JSON.stringify({
        userId: 'user123',
        // missing subdomain and expiresAt
      });
      mockSessionStorage.getItem.mockReturnValue(invalidToken);
      
      const result = TrustTokenService.validateToken('test-space', 'user123');
      
      expect(result).toBeNull();
    });

    it('returns null for expired token', () => {
      const expiredToken = JSON.stringify({
        userId: 'user123',
        subdomain: 'test-space',
        expiresAt: Date.now() - 1000, // Expired 1 second ago
        access: 'verified',
        timestamp: Date.now(),
        source: 'database-verified',
        signature: 'test-signature'
      });
      mockSessionStorage.getItem.mockReturnValue(expiredToken);
      
      const result = TrustTokenService.validateToken('test-space', 'user123');
      
      expect(result).toBeNull();
    });

    it('returns null for mismatched subdomain', () => {
      const token = JSON.stringify({
        userId: 'user123',
        subdomain: 'different-space',
        expiresAt: Date.now() + 60000,
        access: 'verified',
        timestamp: Date.now(),
        source: 'database-verified',
        signature: 'test-signature'
      });
      mockSessionStorage.getItem.mockReturnValue(token);
      
      const result = TrustTokenService.validateToken('test-space', 'user123');
      
      expect(result).toBeNull();
    });

    it('returns null for mismatched userId', () => {
      const token = JSON.stringify({
        userId: 'different-user',
        subdomain: 'test-space',
        expiresAt: Date.now() + 60000,
        access: 'verified',
        timestamp: Date.now(),
        source: 'database-verified',
        signature: 'test-signature'
      });
      mockSessionStorage.getItem.mockReturnValue(token);
      
      const result = TrustTokenService.validateToken('test-space', 'user123');
      
      expect(result).toBeNull();
    });

    it('returns valid token for correct data', () => {
      const now = Date.now();
      const tokenData = {
        userId: 'user123',
        subdomain: 'test-space',
        expiresAt: now + 60000,
        access: 'verified',
        timestamp: now,
        source: 'database-verified',
        signature: 'test-signature'
      };
      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(tokenData));
      
      const result = TrustTokenService.validateToken('test-space', 'user123');
      
      expect(result).toEqual(tokenData);
    });

    it('uses default values for missing optional fields', () => {
      const now = Date.now();
      const tokenData = {
        userId: 'user123',
        subdomain: 'test-space',
        expiresAt: now + 60000,
        // Missing access, timestamp, source, signature
      };
      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(tokenData));
      
      const result = TrustTokenService.validateToken('test-space', 'user123');
      
      expect(result).toEqual({
        userId: 'user123',
        subdomain: 'test-space',
        expiresAt: now + 60000,
        access: 'verified',
        timestamp: now,
        source: 'database-verified',
        signature: ''
      });
    });

    it('caching prevents redundant validation', () => {
      const now = Date.now();
      const tokenData = {
        userId: 'user123',
        subdomain: 'test-space',
        expiresAt: now + 60000,
        access: 'verified',
        timestamp: now,
        source: 'database-verified',
        signature: 'test-signature'
      };
      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(tokenData));
      
      // First call should hit sessionStorage
      const result1 = TrustTokenService.validateToken('test-space', 'user123');
      expect(mockSessionStorage.getItem).toHaveBeenCalledTimes(1);
      
      // Second call should use cache
      const result2 = TrustTokenService.validateToken('test-space', 'user123');
      expect(mockSessionStorage.getItem).toHaveBeenCalledTimes(1); // No additional call
      
      expect(result1).toEqual(result2);
      expect(result1).toEqual(tokenData);
    });

    it('cache expires after TTL', async () => {
      const now = Date.now();
      const tokenData = {
        userId: 'user123',
        subdomain: 'test-space',
        expiresAt: now + 60000,
        access: 'verified',
        timestamp: now,
        source: 'database-verified',
        signature: 'test-signature'
      };
      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(tokenData));
      
      // First call
      TrustTokenService.validateToken('test-space', 'user123');
      expect(mockSessionStorage.getItem).toHaveBeenCalledTimes(1);
      
      // Mock time passage beyond TTL (30 seconds)
      vi.spyOn(Date, 'now').mockReturnValue(now + 31000);
      
      // Second call should hit sessionStorage again due to expired cache
      TrustTokenService.validateToken('test-space', 'user123');
      expect(mockSessionStorage.getItem).toHaveBeenCalledTimes(2);
      
      vi.restoreAllMocks();
    });

    it('different cache keys for different subdomain/user combinations', () => {
      const tokenData = {
        userId: 'user123',
        subdomain: 'test-space',
        expiresAt: Date.now() + 60000,
        access: 'verified',
        timestamp: Date.now(),
        source: 'database-verified',
        signature: 'test-signature'
      };
      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(tokenData));
      
      // Call with different parameters
      TrustTokenService.validateToken('test-space', 'user123');
      TrustTokenService.validateToken('test-space', 'user456');
      TrustTokenService.validateToken('other-space', 'user123');
      
      // Should have made 3 sessionStorage calls (no cache hits)
      expect(mockSessionStorage.getItem).toHaveBeenCalledTimes(3);
    });
  });

  describe('clearCache', () => {
    it('clears the cache', () => {
      const tokenData = {
        userId: 'user123',
        subdomain: 'test-space',
        expiresAt: Date.now() + 60000,
        access: 'verified'
      };
      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(tokenData));
      
      // Build cache
      TrustTokenService.validateToken('test-space', 'user123');
      expect(mockSessionStorage.getItem).toHaveBeenCalledTimes(1);
      
      // Clear cache
      TrustTokenService.clearCache();
      
      // Next call should hit sessionStorage again
      TrustTokenService.validateToken('test-space', 'user123');
      expect(mockSessionStorage.getItem).toHaveBeenCalledTimes(2);
    });
  });

  describe('getCacheStats', () => {
    it('returns cache statistics', () => {
      expect(TrustTokenService.getCacheStats()).toEqual({
        size: 0,
        keys: []
      });
      
      const tokenData = {
        userId: 'user123',
        subdomain: 'test-space',
        expiresAt: Date.now() + 60000,
        access: 'verified'
      };
      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(tokenData));
      
      // Build cache with multiple entries
      TrustTokenService.validateToken('test-space', 'user123');
      TrustTokenService.validateToken('test-space', 'user456');
      
      const stats = TrustTokenService.getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.keys).toContain('test-space-user123');
      expect(stats.keys).toContain('test-space-user456');
    });
  });
}); 