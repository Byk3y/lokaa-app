/**
 * Tests for CategoryVerificationCache
 */

import { categoryVerificationCache } from '../categoryVerificationCache';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('CategoryVerificationCache', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    categoryVerificationCache.clearAll();
  });

  describe('shouldVerifyCategories', () => {
    it('should return true for new space', () => {
      const spaceId = 'test-space-1';
      expect(categoryVerificationCache.shouldVerifyCategories(spaceId)).toBe(true);
    });

    it('should return false for recently verified space', () => {
      const spaceId = 'test-space-2';
      
      // Update verification cache
      categoryVerificationCache.updateVerification(spaceId, {
        hasCategories: true,
        hasGeneralDiscussion: true,
        categoriesCount: 3
      });
      
      expect(categoryVerificationCache.shouldVerifyCategories(spaceId)).toBe(false);
    });

    it('should return true for expired cache entry', () => {
      const spaceId = 'test-space-3';
      
      // Manually set expired cache entry
      const expiredEntry = {
        spaceId,
        hasCategories: true,
        hasGeneralDiscussion: true,
        verifiedAt: Date.now() - (25 * 60 * 60 * 1000), // 25 hours ago
        categoriesCount: 2
      };
      
      // Access private cache and set expired entry
      (categoryVerificationCache as any).cache[spaceId] = expiredEntry;
      
      expect(categoryVerificationCache.shouldVerifyCategories(spaceId)).toBe(true);
    });
  });

  describe('hasRecentCategoryData', () => {
    it('should return true for recent category data', () => {
      const spaceId = 'test-space-4';
      const mockCategoriesCache = {
        cache: {
          [spaceId]: {
            categories: [{ name: 'General Discussion', id: '1' }],
            lastFetched: Date.now() - (2 * 60 * 1000) // 2 minutes ago
          }
        }
      };
      
      expect(categoryVerificationCache.hasRecentCategoryData(spaceId, mockCategoriesCache)).toBe(true);
    });

    it('should return false for old category data', () => {
      const spaceId = 'test-space-5';
      const mockCategoriesCache = {
        cache: {
          [spaceId]: {
            categories: [{ name: 'General Discussion', id: '1' }],
            lastFetched: Date.now() - (10 * 60 * 1000) // 10 minutes ago
          }
        }
      };
      
      expect(categoryVerificationCache.hasRecentCategoryData(spaceId, mockCategoriesCache)).toBe(false);
    });

    it('should return false for missing category data', () => {
      const spaceId = 'test-space-6';
      const mockCategoriesCache = {
        cache: {}
      };
      
      expect(categoryVerificationCache.hasRecentCategoryData(spaceId, mockCategoriesCache)).toBe(false);
    });
  });

  describe('updateVerification', () => {
    it('should update verification cache', () => {
      const spaceId = 'test-space-7';
      const verificationData = {
        hasCategories: true,
        hasGeneralDiscussion: true,
        categoriesCount: 5
      };
      
      categoryVerificationCache.updateVerification(spaceId, verificationData);
      
      const status = categoryVerificationCache.getVerificationStatus(spaceId);
      expect(status).toMatchObject({
        spaceId,
        ...verificationData
      });
      expect(status?.verifiedAt).toBeCloseTo(Date.now(), -2); // Within 100ms
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      const spaceId1 = 'test-space-8';
      const spaceId2 = 'test-space-9';
      
      // Add two valid entries
      categoryVerificationCache.updateVerification(spaceId1, {
        hasCategories: true,
        hasGeneralDiscussion: true,
        categoriesCount: 2
      });
      
      categoryVerificationCache.updateVerification(spaceId2, {
        hasCategories: true,
        hasGeneralDiscussion: false,
        categoriesCount: 1
      });
      
      const stats = categoryVerificationCache.getStats();
      expect(stats.totalEntries).toBe(2);
      expect(stats.validEntries).toBe(2);
    });
  });
});

