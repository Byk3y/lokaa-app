import { TrustToken } from "@/utils/simpleFastPath";

interface TrustTokenCache {
  result: TrustToken | null;
  timestamp: number;
}

/**
 * TrustTokenService - Centralized trust token validation with caching
 * 
 * Extracted from SpaceTabContent.tsx to provide a clean, testable service
 * for trust token validation with 30-second cache optimization.
 */
export class TrustTokenService {
  private static cache = new Map<string, TrustTokenCache>();
  private static readonly CACHE_TTL = 30000; // 30 seconds

  /**
   * Validates a trust token for a given subdomain and user ID
   * Uses aggressive caching to prevent redundant validation calls
   */
  static validateToken(subdomain: string, userId: string): TrustToken | null {
    if (!subdomain || !userId) return null;

    const cacheKey = `${subdomain}-${userId}`;
    const cached = this.cache.get(cacheKey);
    
    // Check cache first
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.result;
    }
    
    // Validate from sessionStorage
    const result = this.validateFromStorage(subdomain, userId);
    this.cache.set(cacheKey, { result, timestamp: Date.now() });
    return result;
  }

  /**
   * Validates trust token from sessionStorage
   * Extracted from original SpaceTabContent.tsx validation logic
   */
  private static validateFromStorage(subdomain: string, userId: string): TrustToken | null {
    try {
      // Quick sessionStorage check for trust token (using the correct storage key)
      const trustTokenData = sessionStorage.getItem(`trust_token_${subdomain}`);
      if (!trustTokenData) {
        return null;
      }
      
      const parsed = JSON.parse(trustTokenData);
      
      // Validate the trust token structure and expiration
      if (!parsed.userId || !parsed.subdomain || !parsed.expiresAt) {
        return null;
      }
      
      // Check if token is valid and for the correct user/subdomain
      const isValid = parsed.expiresAt > Date.now() && 
                      parsed.subdomain === subdomain && 
                      parsed.userId === userId;
      
      const token: TrustToken | null = isValid ? {
        userId: parsed.userId,
        subdomain: parsed.subdomain,
        access: parsed.access || 'verified',
        timestamp: parsed.timestamp || Date.now(),
        source: parsed.source || 'database-verified',
        signature: parsed.signature || '',
        expiresAt: parsed.expiresAt
      } : null;
      
      return token;
    } catch (e) {
      return null;
    }
  }

  /**
   * Generates a new trust token for a user and subdomain
   */
  static generateToken(subdomain: string, userId: string): TrustToken {
    const now = Date.now();
    const token: TrustToken = {
      userId,
      subdomain,
      access: 'verified',
      timestamp: now,
      source: 'database-verified',
      signature: btoa(`${userId}-${subdomain}-${now}`),
      expiresAt: now + (24 * 60 * 60 * 1000) // 24 hour expiry
    };

    sessionStorage.setItem(`trust_token_${subdomain}`, JSON.stringify(token));
    return token;
  }

  /**
   * Clears a trust token from storage
   */
  static clearToken(subdomain?: string): void {
    if (subdomain) {
      sessionStorage.removeItem(`trust_token_${subdomain}`);
    } else {
      // Clear all trust tokens if no subdomain specified
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('trust_token_')) {
          sessionStorage.removeItem(key);
        }
      });
    }
  }

  /**
   * Checks if a valid trust token exists for a user and subdomain
   */
  static hasValidToken(subdomain: string, userId: string): boolean {
    return this.validateToken(subdomain, userId) !== null;
  }

  /**
   * Clears the token cache (useful for testing and logout scenarios)
   */
  static clearCache(): void {
    this.cache.clear();
  }

  /**
   * Gets cache statistics (useful for monitoring and debugging)
   */
  static getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
} 