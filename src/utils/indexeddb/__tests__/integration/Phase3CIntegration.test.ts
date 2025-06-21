/**
 * Phase 3C Integration Tests - PresenceService
 * 
 * Tests the integration of PresenceService with IndexedDBBridgeV2
 */

import { indexedDBBridgeV2 } from '../../IndexedDBBridgeV2';

// Mock dependencies
const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  or: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  single: jest.fn(),
  order: jest.fn().mockReturnThis()
};

jest.mock('@/integrations/supabase/client', () => ({
  getSupabaseClient: () => mockSupabaseClient
}));

// Mock IndexedDB (Node.js environment)
const mockIndexedDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn()
};

Object.defineProperty(global, 'indexedDB', {
  value: mockIndexedDB,
  writable: true
});

// Mock mobile browser service
jest.mock('../../core/MobileBrowserService', () => ({
  mobileBrowserService: {
    shouldUseCacheFirst: jest.fn(() => false),
    isMobileBrowserBlocking: jest.fn(() => false),
    setupMobileDetection: jest.fn(),
    getDebugInfo: jest.fn(() => ({ isMobile: false })),
    testMobileBlockingDetection: jest.fn(() => ({ 
      isMobile: false, 
      shouldUseCacheFirst: false 
    })),
    forceCacheFirstMode: jest.fn(),
    clearCacheFirstMode: jest.fn(),
    cleanup: jest.fn()
  }
}));

// Mock IndexedDB Manager
jest.mock('../../core/IndexedDBManager', () => ({
  indexedDBManager: {
    initialize: jest.fn().mockResolvedValue(undefined),
    checkHealth: jest.fn().mockResolvedValue({ 
      status: 'healthy', 
      details: {}, 
      errors: [] 
    }),
    getDatabaseStats: jest.fn().mockResolvedValue({ 
      version: 3, 
      storeCount: 6, 
      stores: [] 
    }),
    close: jest.fn()
  }
}));

describe('Phase 3C Integration - PresenceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful IndexedDB operations
    const mockRequest = {
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      result: {
        version: 3,
        objectStoreNames: { contains: jest.fn(() => true) },
        close: jest.fn()
      }
    };
    
    mockIndexedDB.open.mockReturnValue(mockRequest);
    
    // Simulate successful opening
    setTimeout(() => {
      if (mockRequest.onsuccess) mockRequest.onsuccess();
    }, 0);
  });

  describe('Bridge Initialization with PresenceService', () => {
    it('should initialize bridge with presence service properly', async () => {
      await indexedDBBridgeV2.initialize();
      
      expect(indexedDBBridgeV2.isInitialized()).toBe(true);
    });

    it('should provide presence API methods through bridge', async () => {
      await indexedDBBridgeV2.initialize();
      
      // Check if presence methods are available
      expect(typeof indexedDBBridgeV2.updateGlobalPresence).toBe('function');
      expect(typeof indexedDBBridgeV2.cleanupStalePresence).toBe('function');
    });
  });

  describe('updateGlobalPresence Integration', () => {
    it('should update global presence through bridge', async () => {
      await indexedDBBridgeV2.initialize();
      
      // Mock successful database response
      mockSupabaseClient.update.mockResolvedValueOnce({ 
        data: null, 
        error: null 
      });

      const result = await indexedDBBridgeV2.updateGlobalPresence('user-1', true, {
        spaceId: 'space-1'
      });

      expect(result).toEqual({
        data: null,
        error: null,
        fromCache: false
      });
    });

    it('should handle mobile browser blocking in presence updates', async () => {
      await indexedDBBridgeV2.initialize();
      
      const { mobileBrowserService } = require('../../core/MobileBrowserService');
      mobileBrowserService.shouldUseCacheFirst.mockReturnValueOnce(true);

      const result = await indexedDBBridgeV2.updateGlobalPresence('user-1', true);

      expect(result.fromCache).toBe(true);
      expect(result.reason).toBe('mobile_blocking_skipped');
    });

    it('should handle presence update errors gracefully', async () => {
      await indexedDBBridgeV2.initialize();
      
      const mockError = new Error('Presence update failed');
      mockSupabaseClient.update.mockRejectedValueOnce(mockError);

      const result = await indexedDBBridgeV2.updateGlobalPresence('user-1', true);

      expect(result.error).toBe(mockError);
      expect(result.fromCache).toBe(false);
    });
  });

  describe('cleanupStalePresence Integration', () => {
    it('should cleanup stale presence through bridge', async () => {
      await indexedDBBridgeV2.initialize();
      
      mockSupabaseClient.update.mockResolvedValueOnce({ 
        data: { count: 2 }, 
        error: null 
      });

      const result = await indexedDBBridgeV2.cleanupStalePresence('space-1');

      expect(result).toEqual({
        data: { count: 2 },
        error: null
      });
    });
  });

  describe('Metrics Integration', () => {
    it('should include presence service metrics in bridge metrics', async () => {
      await indexedDBBridgeV2.initialize();
      
      const metrics = await indexedDBBridgeV2.getMetrics();

      expect(metrics).toHaveProperty('presenceService');
      expect(metrics.presenceService).toEqual({
        totalRequests: expect.any(Number),
        successfulUpdates: expect.any(Number),
        failedUpdates: expect.any(Number),
        mobileSkipped: expect.any(Number),
        networkRequests: expect.any(Number),
        errors: expect.any(Number)
      });

      expect(metrics).toHaveProperty('cacheStats.presence');
      expect(metrics.cacheStats.presence).toEqual({
        totalEntries: expect.any(Number),
        totalSize: expect.any(Number),
        hitRate: expect.any(Number),
        missRate: expect.any(Number),
        averageAge: expect.any(Number),
        oldestEntry: expect.any(Number),
        newestEntry: expect.any(Number)
      });
    });
  });

  describe('Cache Management Integration', () => {
    it('should clear presence cache when clearing all caches', async () => {
      await indexedDBBridgeV2.initialize();
      
      // This should not throw any errors
      await indexedDBBridgeV2.clearCache();
    });
  });

  describe('Health Check Integration', () => {
    it('should include presence service in health checks', async () => {
      await indexedDBBridgeV2.initialize();
      
      const health = await indexedDBBridgeV2.checkHealth();

      expect(health.status).toBe('healthy');
      expect(health.details.services).toHaveProperty('presenceService', 'healthy');
    });
  });

  describe('Global Interface Integration', () => {
    it('should expose presence methods in global interface', async () => {
      await indexedDBBridgeV2.initialize();
      
      // Check modern interface
      expect((global as any).window?.indexedDBBridgeV2?.updateGlobalPresence).toBeDefined();
      expect((global as any).window?.indexedDBBridgeV2?.cleanupStalePresence).toBeDefined();
      
      // Check compatibility interface
      expect((global as any).window?.supabaseIndexedDBBridgeV2?.updateGlobalPresence).toBeDefined();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle initialization errors gracefully', async () => {
      const { indexedDBManager } = require('../../core/IndexedDBManager');
      indexedDBManager.initialize.mockRejectedValueOnce(new Error('Init failed'));

      await expect(indexedDBBridgeV2.initialize()).rejects.toThrow('Init failed');
    });

    it('should handle presence service failures without affecting other services', async () => {
      await indexedDBBridgeV2.initialize();
      
      // Even if presence fails, other metrics should still work
      const metrics = await indexedDBBridgeV2.getMetrics();
      
      expect(metrics).toHaveProperty('spaceMembersService');
      expect(metrics).toHaveProperty('userProfileService');
      expect(metrics).toHaveProperty('conversationService');
      expect(metrics).toHaveProperty('presenceService');
    });
  });

  describe('Mobile Browser Integration', () => {
    it('should respect mobile browser settings for presence operations', async () => {
      await indexedDBBridgeV2.initialize();
      
      const { mobileBrowserService } = require('../../core/MobileBrowserService');
      
      // Force cache-first mode
      indexedDBBridgeV2.forceCacheFirstMode();
      mobileBrowserService.shouldUseCacheFirst.mockReturnValueOnce(true);

      const result = await indexedDBBridgeV2.updateGlobalPresence('user-1', true);

      expect(result.fromCache).toBe(true);
      
      // Clear cache-first mode
      indexedDBBridgeV2.clearCacheFirstMode();
    });
  });

  describe('Cleanup Integration', () => {
    it('should cleanup presence service during bridge cleanup', async () => {
      await indexedDBBridgeV2.initialize();
      
      await indexedDBBridgeV2.cleanup();
      
      expect(indexedDBBridgeV2.isInitialized()).toBe(false);
    });
  });
}); 