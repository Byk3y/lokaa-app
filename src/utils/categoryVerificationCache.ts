/**
 * Category Verification Cache
 * 
 * Provides persistent caching for space category verification status
 * to prevent unnecessary database queries on every space load.
 */

interface VerificationCacheEntry {
  spaceId: string;
  hasCategories: boolean;
  hasGeneralDiscussion: boolean;
  verifiedAt: number;
  categoriesCount: number;
}

interface VerificationCache {
  [spaceId: string]: VerificationCacheEntry;
}

const VERIFICATION_CACHE_KEY = 'space_category_verification';
const VERIFICATION_TTL = 24 * 60 * 60 * 1000; // 24 hours
const SHORT_TTL = 5 * 60 * 1000; // 5 minutes for recent data

class CategoryVerificationCache {
  private cache: VerificationCache = {};
  private initialized = false;

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Load verification cache from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(VERIFICATION_CACHE_KEY);
      if (stored) {
        this.cache = JSON.parse(stored);
        this.cleanExpiredEntries();
      }
      this.initialized = true;
    } catch (error) {
      console.warn('[CategoryVerificationCache] Failed to load from storage:', error);
      this.cache = {};
      this.initialized = true;
    }
  }

  /**
   * Save verification cache to localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(VERIFICATION_CACHE_KEY, JSON.stringify(this.cache));
    } catch (error) {
      console.warn('[CategoryVerificationCache] Failed to save to storage:', error);
    }
  }

  /**
   * Clean expired entries from cache
   */
  private cleanExpiredEntries(): void {
    const now = Date.now();
    Object.keys(this.cache).forEach(spaceId => {
      if (now - this.cache[spaceId].verifiedAt > VERIFICATION_TTL) {
        delete this.cache[spaceId];
      }
    });
  }

  /**
   * Check if space needs category verification
   */
  shouldVerifyCategories(spaceId: string): boolean {
    if (!this.initialized) {
      return true; // Default to verify if not initialized
    }

    const cached = this.cache[spaceId];
    if (!cached) {
      return true; // No cache entry, need to verify
    }

    // Check if cache is still valid
    const now = Date.now();
    if (now - cached.verifiedAt > VERIFICATION_TTL) {
      delete this.cache[spaceId];
      this.saveToStorage();
      return true; // Cache expired, need to verify
    }

    // If we have recent verification and categories exist, skip verification
    if (cached.hasCategories && (now - cached.verifiedAt) < SHORT_TTL) {
      return false; // Recent verification with categories, skip
    }

    return true; // Default to verify
  }

  /**
   * Update verification cache for a space
   */
  updateVerification(spaceId: string, data: {
    hasCategories: boolean;
    hasGeneralDiscussion: boolean;
    categoriesCount: number;
  }): void {
    this.cache[spaceId] = {
      spaceId,
      ...data,
      verifiedAt: Date.now()
    };
    this.saveToStorage();
  }

  /**
   * Get verification status for a space
   */
  getVerificationStatus(spaceId: string): VerificationCacheEntry | null {
    if (!this.initialized) return null;
    
    const cached = this.cache[spaceId];
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.verifiedAt > VERIFICATION_TTL) {
      delete this.cache[spaceId];
      this.saveToStorage();
      return null;
    }

    return cached;
  }

  /**
   * Check if space has recent category data (from existing cache)
   */
  hasRecentCategoryData(spaceId: string, categoriesCache: any): boolean {
    if (!categoriesCache || !categoriesCache.cache) return false;
    
    const spaceCache = categoriesCache.cache[spaceId];
    if (!spaceCache) return false;

    const now = Date.now();
    return spaceCache.categories?.length > 0 && 
           spaceCache.lastFetched && 
           (now - spaceCache.lastFetched) < SHORT_TTL;
  }

  /**
   * Clear verification cache for a space
   */
  clearSpaceVerification(spaceId: string): void {
    delete this.cache[spaceId];
    this.saveToStorage();
  }

  /**
   * Clear all verification cache
   */
  clearAll(): void {
    this.cache = {};
    this.saveToStorage();
  }

  /**
   * Get cache statistics
   */
  getStats(): { totalEntries: number; validEntries: number } {
    const now = Date.now();
    const validEntries = Object.values(this.cache).filter(
      entry => now - entry.verifiedAt <= VERIFICATION_TTL
    ).length;

    return {
      totalEntries: Object.keys(this.cache).length,
      validEntries
    };
  }
}

// Export singleton instance
export const categoryVerificationCache = new CategoryVerificationCache();

// Export types for use in other modules
export type { VerificationCacheEntry };

// Expose for debugging in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).categoryVerificationCache = categoryVerificationCache;
}
