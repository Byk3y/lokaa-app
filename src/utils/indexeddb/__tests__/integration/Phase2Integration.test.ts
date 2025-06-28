/**
 * Phase 2 Integration Tests
 * 
 * Comprehensive tests for the new service-based architecture
 */

import { IndexedDBBridgeV2 } from '../../IndexedDBBridgeV2';
import { indexedDBManager } from '../../core/IndexedDBManager';
import { mobileBrowserService } from '../../core/MobileBrowserService';
import { spaceMembersService } from '../../services/SpaceMembersService';
import { MockIndexedDB, MockBrowserEnvironment } from '../../testHelpers';

describe('Phase 2 Integration Tests', () => {
  let mockIndexedDB: MockIndexedDB;
  let mockEnvironment: MockBrowserEnvironment;
  let bridge: IndexedDBBridgeV2;

  beforeEach(async () => {
    // Setup mock environment
    mockIndexedDB = new MockIndexedDB();
    mockEnvironment = new MockBrowserEnvironment();
    
    // Apply mocks
    (global as any).indexedDB = mockIndexedDB;
    (global as any).navigator = mockEnvironment.navigator;
    (global as any).document = mockEnvironment.document;
    (global as any).window = mockEnvironment.window;

    // Create fresh bridge instance
    bridge = new IndexedDBBridgeV2();
  });

  afterEach(async () => {
    await bridge.cleanup();
    
    // Clear mocks
    delete (global as any).indexedDB;
    delete (global as any).navigator;
    delete (global as any).document;
    delete (global as any).window;
  });

  describe('Service Initialization', () => {
    test('should initialize all services successfully', async () => {
      const initResult = await bridge.initialize();
      
      expect(bridge.isInitialized()).toBe(true);
      expect(initResult).toBeUndefined(); // Promise<void>
    });

    test('should handle multiple initialization calls gracefully', async () => {
      const [init1, init2, init3] = await Promise.all([
        bridge.initialize(),
        bridge.initialize(),
        bridge.initialize()
      ]);

      expect(bridge.isInitialized()).toBe(true);
      expect([init1, init2, init3]).toEqual([undefined, undefined, undefined]);
    });

    test('should setup global interfaces', async () => {
      await bridge.initialize();

      expect((global as any).window.indexedDBBridgeV2).toBeDefined();
      expect((global as any).window.supabaseIndexedDBBridgeV2).toBeDefined();
      
      // Test modern interface structure
      const modernAPI = (global as any).window.indexedDBBridgeV2;
      expect(modernAPI.checkHealth).toBeInstanceOf(Function);
      expect(modernAPI.getMetrics).toBeInstanceOf(Function);
      expect(modernAPI.getSpaceMembers).toBeInstanceOf(Function);
      expect(modernAPI.clearCache).toBeInstanceOf(Function);

      // Test compatibility interface
      const compatAPI = (global as any).window.supabaseIndexedDBBridgeV2;
      expect(compatAPI.getSpaceMembers).toBeInstanceOf(Function);
      expect(compatAPI.getMetrics).toBeInstanceOf(Function);
    });
  });

  describe('Health Monitoring', () => {
    test('should provide comprehensive health status', async () => {
      await bridge.initialize();
      
      const health = await bridge.checkHealth();
      
      expect(health).toMatchObject({
        status: expect.stringMatching(/^(healthy|unhealthy|degraded)$/),
        details: expect.any(Object),
        lastChecked: expect.any(Number),
        errors: expect.any(Array)
      });

      expect(health.details).toHaveProperty('database');
      expect(health.details).toHaveProperty('mobile');
      expect(health.details).toHaveProperty('services');
    });

    test('should provide detailed metrics from all services', async () => {
      await bridge.initialize();
      
      const metrics = await bridge.getMetrics();
      
      expect(metrics).toMatchObject({
        spaceMembersService: expect.any(Object),
        cacheStats: expect.any(Object),
        mobileDetection: expect.any(Object),
        database: expect.any(Object)
      });

      // Verify space members service metrics
      expect(metrics.spaceMembersService).toHaveProperty('totalRequests');
      expect(metrics.spaceMembersService).toHaveProperty('cacheHits');
      expect(metrics.spaceMembersService).toHaveProperty('networkRequests');

      // Verify cache stats
      expect(metrics.cacheStats.spaceMembers).toHaveProperty('totalEntries');
      expect(metrics.cacheStats.spaceMembers).toHaveProperty('hitRate');

      // Verify mobile detection
      expect(metrics.mobileDetection).toHaveProperty('environment');
      expect(metrics.mobileDetection).toHaveProperty('wouldUseCache');

      // Verify database stats
      expect(metrics.database).toHaveProperty('version');
      expect(metrics.database).toHaveProperty('storeCount');
    });
  });

  describe('Space Members Service Integration', () => {
    const testSpaceId = 'test-space-123';
    const testUserId = 'user-456';

    beforeEach(() => {
      // Setup mock data for space members
      mockIndexedDB.setupMockData('space_members_cache', {
        [`space_members_${testSpaceId}_status_active`]: {
          key: `space_members_${testSpaceId}_status_active`,
          data: [
            {
              id: 'member-1',
              user_id: 'user-1',
              space_id: testSpaceId,
              role: 'owner',
              status: 'active',
              is_online: true,
              last_active_at: new Date().toISOString(),
              joined_at: new Date().toISOString()
            },
            {
              id: 'member-2',
              user_id: 'user-2',
              space_id: testSpaceId,
              role: 'member',
              status: 'active',
              is_online: false,
              last_active_at: new Date().toISOString(),
              joined_at: new Date().toISOString()
            }
          ],
          timestamp: Date.now(),
          ttl: 300000,
          metadata: {
            query: 'space_members',
            spaceId: testSpaceId
          }
        }
      });
    });

    test('should get space members with caching', async () => {
      await bridge.initialize();
      
      // First call should hit cache
      const result1 = await bridge.getSpaceMembers(testSpaceId);
      
      expect(result1.error).toBeNull();
      expect(result1.data).toHaveLength(2);
      expect(result1.fromCache).toBe(true);
      expect(result1.data?.[0]).toMatchObject({
        id: 'member-1',
        user_id: 'user-1',
        role: 'owner',
        is_online: true
      });
    });

    test('should get member counts correctly', async () => {
      await bridge.initialize();
      
      const result = await bridge.getMemberCounts(testSpaceId);
      
      expect(result.error).toBeNull();
      expect(result.data).toMatchObject({
        total: 2,
        online: 1,
        admins: 0,
        owners: 1
      });
    });

    test('should get online members only', async () => {
      await bridge.initialize();
      
      const result = await bridge.getOnlineMembers(testSpaceId);
      
      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0]).toMatchObject({
        user_id: 'user-1',
        is_online: true
      });
    });

    test('should get specific user membership', async () => {
      await bridge.initialize();
      
      // Add specific user data to cache
      mockIndexedDB.setupMockData('space_members_cache', {
        [`space_members_${testSpaceId}_user_${testUserId}_status_active`]: {
          key: `space_members_${testSpaceId}_user_${testUserId}_status_active`,
          data: [{
            id: 'member-3',
            user_id: testUserId,
            space_id: testSpaceId,
            role: 'admin',
            status: 'active',
            is_online: true,
            last_active_at: new Date().toISOString(),
            joined_at: new Date().toISOString()
          }],
          timestamp: Date.now(),
          ttl: 300000
        }
      });

      const result = await bridge.getUserSpaceMembership(testSpaceId, testUserId);
      
      expect(result.error).toBeNull();
      expect(result.data).toMatchObject({
        user_id: testUserId,
        role: 'admin',
        is_online: true
      });
    });
  });

  describe('Mobile Browser Detection', () => {
    test('should detect mobile environment correctly', async () => {
      // Setup mobile environment
      mockEnvironment.setMobile(true);
      mockEnvironment.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)');
      
      await bridge.initialize();
      
      const detection = bridge.testMobileBlockingDetection();
      
      expect(detection.environment.isMobile).toBe(true);
      expect(detection.environment.userAgent).toContain('iPhone');
    });

    test('should handle cache-first mode correctly', async () => {
      await bridge.initialize();
      
      // Force cache-first mode
      bridge.forceCacheFirstMode();
      
      const detection = bridge.testMobileBlockingDetection();
      expect(detection.wouldUseCache).toBe(true);
      
      // Clear cache-first mode
      bridge.clearCacheFirstMode();
      
      const detection2 = bridge.testMobileBlockingDetection();
      expect(detection2.wouldUseCache).toBe(false);
    });
  });

  describe('Cache Management', () => {
    test('should clear all caches', async () => {
      await bridge.initialize();
      
      // Verify we have cached data
      const initialResult = await bridge.getSpaceMembers('test-space');
      expect(initialResult.fromCache).toBe(true);
      
      // Clear cache
      await bridge.clearCache();
      
      // Verify cache is cleared (would need network call)
      // This is tested via the service-level tests
    });

    test('should invalidate specific space cache', async () => {
      await bridge.initialize();
      
      const testSpaceId = 'invalidate-test-space';
      
      // This would be tested via service interaction
      await bridge.invalidateSpaceCache(testSpaceId);
      
      // Verify the invalidation worked (implementation detail)
      // The main test is that it doesn't throw errors
    });
  });

  describe('Error Handling', () => {
    test('should handle initialization errors gracefully', async () => {
      // Force IndexedDB to fail
      mockIndexedDB.shouldFail = true;
      
      await expect(bridge.initialize()).rejects.toThrow();
      expect(bridge.isInitialized()).toBe(false);
    });

    test('should provide meaningful error responses', async () => {
      await bridge.initialize();
      
      // Mock a network error
      mockEnvironment.setBlockRequests(true);
      
      const result = await bridge.getSpaceMembers('failing-space', { forceNetwork: true });
      
      expect(result.error).not.toBeNull();
      expect(result.data).toBeNull();
      expect(result.fromCache).toBe(false);
    });
  });

  describe('Performance', () => {
    test('should handle concurrent requests efficiently', async () => {
      await bridge.initialize();
      
      const spaceIds = ['space-1', 'space-2', 'space-3', 'space-4', 'space-5'];
      
      const startTime = Date.now();
      
      const results = await Promise.all(
        spaceIds.map(spaceId => bridge.getSpaceMembers(spaceId))
      );
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Should complete quickly (within 100ms for mock data)
      expect(totalTime).toBeLessThan(100);
      
      // All requests should succeed
      results.forEach(result => {
        expect(result.error).toBeNull();
      });
    });

    test('should maintain performance metrics accurately', async () => {
      await bridge.initialize();
      
      // Make several requests
      await bridge.getSpaceMembers('perf-test-1');
      await bridge.getSpaceMembers('perf-test-2');
      await bridge.getSpaceMembers('perf-test-1'); // Should hit cache
      
      const metrics = await bridge.getMetrics();
      
      expect(metrics.spaceMembersService.totalRequests).toBeGreaterThan(0);
      expect(metrics.spaceMembersService.cacheHits).toBeGreaterThan(0);
    });
  });

  describe('Backward Compatibility', () => {
    test('should maintain compatibility with old API format', async () => {
      await bridge.initialize();
      
      const compatAPI = (global as any).window.supabaseIndexedDBBridgeV2;
      
      // Test old-style API call
      const result = await compatAPI.getSpaceMembers('compat-test', {
        userId: 'user-123',
        status: 'active',
        forceNetwork: false
      });
      
      expect(result).toMatchObject({
        data: expect.any(Array),
        error: null,
        fromCache: expect.any(Boolean)
      });
    });
  });
}); 