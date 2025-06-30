import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TrustTokenService } from '@/services/TrustTokenService';
import type { Mock } from 'vitest';

// Set up spies
vi.spyOn(global.sessionStorage, 'getItem');
vi.spyOn(global.sessionStorage, 'setItem');

describe('TrustTokenService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe('validateToken', () => {
    it('returns null for missing subdomain or userId', () => {
      expect(TrustTokenService.validateToken('', 'user123')).toBeNull();
      expect(TrustTokenService.validateToken('space123', '')).toBeNull();
    });

    it('returns null for invalid token format', () => {
      vi.mocked(sessionStorage.getItem).mockReturnValue('invalid-token');
      expect(TrustTokenService.validateToken('space123', 'user123')).toBeNull();
      expect(sessionStorage.getItem).toHaveBeenCalledWith('trust_token_space123');
    });

    it('returns null for expired token', () => {
      const expiredToken = {
        subdomain: 'space123',
        userId: 'user123',
        expiresAt: Date.now() - 1000,
      };
      vi.mocked(sessionStorage.getItem).mockReturnValue(JSON.stringify(expiredToken));
      expect(TrustTokenService.validateToken('space123', 'user123')).toBeNull();
      expect(sessionStorage.getItem).toHaveBeenCalledWith('trust_token_space123');
    });

    it('returns null for mismatched subdomain', () => {
      const token = {
        subdomain: 'space123',
        userId: 'user123',
        expiresAt: Date.now() + 1000,
      };
      vi.mocked(sessionStorage.getItem).mockReturnValue(JSON.stringify(token));
      expect(TrustTokenService.validateToken('different-space', 'user123')).toBeNull();
      expect(sessionStorage.getItem).toHaveBeenCalledWith('trust_token_different-space');
    });

    it('returns null for mismatched userId', () => {
      const token = {
        subdomain: 'space123',
        userId: 'user123',
        expiresAt: Date.now() + 1000,
      };
      vi.mocked(sessionStorage.getItem).mockReturnValue(JSON.stringify(token));
      expect(TrustTokenService.validateToken('space123', 'different-user')).toBeNull();
      expect(sessionStorage.getItem).toHaveBeenCalledWith('trust_token_space123');
    });

    it('returns token for valid parameters', () => {
      const token = {
        subdomain: 'space123',
        userId: 'user123',
        expiresAt: Date.now() + 1000,
      };
      vi.mocked(sessionStorage.getItem).mockReturnValue(JSON.stringify(token));
      expect(TrustTokenService.validateToken('space123', 'user123')).toEqual(token);
      expect(sessionStorage.getItem).toHaveBeenCalledWith('trust_token_space123');
    });
  });

  describe('generateToken', () => {
    it('stores token in sessionStorage', () => {
      TrustTokenService.generateToken('space123', 'user123');
      expect(sessionStorage.setItem).toHaveBeenCalled();
      const storedToken = JSON.parse(vi.mocked(sessionStorage.setItem).mock.calls[0][1]);
      expect(storedToken).toEqual(expect.objectContaining({
        subdomain: 'space123',
        userId: 'user123',
      }));
      expect(storedToken.expiresAt).toBeGreaterThan(Date.now());
      expect(vi.mocked(sessionStorage.setItem).mock.calls[0][0]).toBe('trust_token_space123');
    });

    it('returns generated token', () => {
      const token = TrustTokenService.generateToken('space123', 'user123');
      expect(token).toEqual(expect.objectContaining({
        subdomain: 'space123',
        userId: 'user123',
      }));
      expect(token.expiresAt).toBeGreaterThan(Date.now());
    });
  });

  describe('clearToken', () => {
    it('removes token from sessionStorage', () => {
      TrustTokenService.clearToken('space123');
      expect(sessionStorage.removeItem).toHaveBeenCalledWith('trust_token_space123');
    });
  });

  describe('hasValidToken', () => {
    it('returns false for missing token', () => {
      vi.mocked(sessionStorage.getItem).mockReturnValue(null);
      expect(TrustTokenService.hasValidToken('space123', 'user123')).toBe(false);
      expect(sessionStorage.getItem).toHaveBeenCalledWith('trust_token_space123');
    });

    it('returns false for invalid token format', () => {
      vi.mocked(sessionStorage.getItem).mockReturnValue('invalid-token');
      expect(TrustTokenService.hasValidToken('space123', 'user123')).toBe(false);
      expect(sessionStorage.getItem).toHaveBeenCalledWith('trust_token_space123');
    });

    it('returns false for expired token', () => {
      const expiredToken = {
        subdomain: 'space123',
        userId: 'user123',
        expiresAt: Date.now() - 1000,
      };
      vi.mocked(sessionStorage.getItem).mockReturnValue(JSON.stringify(expiredToken));
      expect(TrustTokenService.hasValidToken('space123', 'user123')).toBe(false);
      expect(sessionStorage.getItem).toHaveBeenCalledWith('trust_token_space123');
    });

    it('returns false for mismatched parameters', () => {
      const token = {
        subdomain: 'space123',
        userId: 'user123',
        expiresAt: Date.now() + 1000,
      };
      vi.mocked(sessionStorage.getItem).mockReturnValue(JSON.stringify(token));
      expect(TrustTokenService.hasValidToken('different-space', 'user123')).toBe(false);
      expect(TrustTokenService.hasValidToken('space123', 'different-user')).toBe(false);
      expect(sessionStorage.getItem).toHaveBeenCalledWith('trust_token_different-space');
      expect(sessionStorage.getItem).toHaveBeenCalledWith('trust_token_space123');
    });

    it('returns true for valid token', () => {
      const token = {
        subdomain: 'space123',
        userId: 'user123',
        expiresAt: Date.now() + 1000,
      };
      vi.mocked(sessionStorage.getItem).mockReturnValue(JSON.stringify(token));
      expect(TrustTokenService.hasValidToken('space123', 'user123')).toBe(true);
      expect(sessionStorage.getItem).toHaveBeenCalledWith('trust_token_space123');
    });
  });
}); 