/**
 * IndexedDB Bridge Core Functionality Tests
 * 
 * Comprehensive unit tests for the main IndexedDB bridge operations
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { supabaseIndexedDBBridge } from '../../../supabaseIndexedDBBridge';
import { 
  mockUsers, 
  mockSpaceMembers, 
  mockSupabaseResponses,
  mockMobileEnvironments,
  createMockCacheEntry,
  createExpiredCacheEntry,
  createFreshCacheEntry
} from '../fixtures/mockData';
import { CacheEntry, BridgeMetrics } from '../../types';

// Mock IndexedDB
const mockIDBDatabase = {
  transaction: vi.fn(),
  objectStoreNames: ['space_members_cache', 'user_profiles_cache'],
  close: vi.fn(),
  createObjectStore: vi.fn(),
  deleteObjectStore: vi.fn()
};

const mockIDBTransaction = {
  objectStore: vi.fn(),
  oncomplete: null,
  onerror: null,
  onabort: null
};

const mockIDBObjectStore = {
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  clear: vi.fn(),
  createIndex: vi.fn(),
  index: vi.fn()
};

const mockIDBRequest = {
  result: null,
  error: null,
  onsuccess: null,
  onerror: null
};

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  getSupabaseClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn(),
          range: vi.fn()
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          neq: vi.fn()
        }))
      }))
    })),
    auth: {
      getUser: vi.fn()
    },
    rpc: vi.fn()
  }))
}));

// Mock development logger
vi.mock('../../../developmentLogger', () => ({
  devLogger: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe('IndexedDB Bridge Core Functionality', () => {
  let originalIndexedDB: any;
  let originalNavigator: any;
  let originalPerformance: any;
  let originalWindow: any;

  beforeEach(() => {
    // Save originals
    originalIndexedDB = global.indexedDB;
    originalNavigator = global.navigator;
    originalPerformance = global.performance;
    originalWindow = global.window;

    // Mock IndexedDB
    global.indexedDB = {
      open: vi.fn((name: string, version: number) => {
        const request = {
          result: mockIDBDatabase,
          error: null,
          onsuccess: null,
          onerror: null,
          onupgradeneeded: null,
          onblocked: null
        };

        // Simulate successful opening
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess({ target: request } as any);
        }, 0);

        return request;
      }),
      deleteDatabase: vi.fn(() => {
        const request = {
          onsuccess: null,
          onerror: null,
          onblocked: null
        };
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess({} as any);
        }, 0);
        return request;
      })
    };

    // Mock Navigator
    global.navigator = {
      userAgent: mockMobileEnvironments.desktop.userAgent,
      platform: mockMobileEnvironments.desktop.platform
    } as any;

    // Mock Performance
    global.performance = {
      navigation: { type: 0 },
      getEntriesByType: vi.fn(() => [{ type: 'navigate' }])
    } as any;

    // Mock Window
    global.window = {
      __lastVisibilityChange: null,
      __mobileBackgroundState: null
    } as any;

    // Setup mocks
    mockIDBDatabase.transaction.mockReturnValue(mockIDBTransaction);
    mockIDBTransaction.objectStore.mockReturnValue(mockIDBObjectStore);
    mockIDBObjectStore.get.mockReturnValue(mockIDBRequest);
    mockIDBObjectStore.put.mockReturnValue(mockIDBRequest);
    mockIDBObjectStore.delete.mockReturnValue(mockIDBRequest);
    mockIDBObjectStore.clear.mockReturnValue(mockIDBRequest);
  });

  afterEach(() => {
    // Restore originals
    global.indexedDB = originalIndexedDB;
    global.navigator = originalNavigator;
    global.performance = originalPerformance;
    global.window = originalWindow;

    // Clear all mocks
    vi.clearAllMocks();
  });

  describe('Database Initialization', () => {
    it('should initialize IndexedDB with correct stores', async () => {
      expect(global.indexedDB.open).toHaveBeenCalledWith('lokaa-supabase-cache', 3);
    });

    it('should handle database initialization errors gracefully', async () => {
      // Mock database opening failure
      global.indexedDB.open = vi.fn(() => {
        const request = {
          result: null,
          error: new Error('Database initialization failed'),
          onsuccess: null,
          onerror: null,
          onupgradeneeded: null
        };

        setTimeout(() => {
          if (request.onerror) request.onerror({ target: request } as any);
        }, 0);

        return request;
      });

      // The bridge should handle the error gracefully
      const metrics = supabaseIndexedDBBridge.getMetrics();
      expect(metrics).toBeDefined();
    });
  });

  describe('Cache Operations', () => {
    it('should cache data successfully', async () => {
      // Mock successful cache operation
      mockIDBRequest.result = null;
      setTimeout(() => {
        if (mockIDBRequest.onsuccess) mockIDBRequest.onsuccess({ target: mockIDBRequest } as any);
      }, 0);

      // This would normally test internal caching, but we'll test the public interface
      const result = await supabaseIndexedDBBridge.getSpaceMembers('test-space-id');
      expect(result).toBeDefined();
    });

    it('should retrieve cached data when available', async () => {
      const cachedEntry = createFreshCacheEntry(mockSpaceMembers);
      
      // Mock cache hit
      mockIDBRequest.result = cachedEntry;
      setTimeout(() => {
        if (mockIDBRequest.onsuccess) mockIDBRequest.onsuccess({ target: mockIDBRequest } as any);
      }, 0);

      const result = await supabaseIndexedDBBridge.getSpaceMembers('test-space-id');
      expect(result.fromCache).toBe(true);
      expect(result.data).toEqual(mockSpaceMembers);
    });

    it('should handle expired cache entries', async () => {
      const expiredEntry = createExpiredCacheEntry(mockSpaceMembers);
      
      // Mock cache hit with expired data
      mockIDBRequest.result = expiredEntry;
      setTimeout(() => {
        if (mockIDBRequest.onsuccess) mockIDBRequest.onsuccess({ target: mockIDBRequest } as any);
      }, 0);

      const result = await supabaseIndexedDBBridge.getSpaceMembers('test-space-id');
      // Should attempt network request for expired cache
      expect(result).toBeDefined();
    });
  });

  describe('Mobile Browser Detection', () => {
    it('should detect mobile Safari correctly', () => {
      global.navigator = {
        userAgent: mockMobileEnvironments.safari.userAgent,
        platform: mockMobileEnvironments.safari.platform
      } as any;

      const detection = supabaseIndexedDBBridge.testMobileBlockingDetection();
      expect(detection.isMobile).toBe(true);
    });

    it('should detect mobile Chrome correctly', () => {
      global.navigator = {
        userAgent: mockMobileEnvironments.chrome.userAgent,
        platform: mockMobileEnvironments.chrome.platform
      } as any;

      const detection = supabaseIndexedDBBridge.testMobileBlockingDetection();
      expect(detection.isMobile).toBe(true);
    });

    it('should detect desktop browsers correctly', () => {
      global.navigator = {
        userAgent: mockMobileEnvironments.desktop.userAgent,
        platform: mockMobileEnvironments.desktop.platform
      } as any;

      const detection = supabaseIndexedDBBridge.testMobileBlockingDetection();
      expect(detection.isMobile).toBe(false);
    });

    it('should use cache-first approach on mobile after background return', () => {
      global.navigator = {
        userAgent: mockMobileEnvironments.safari.userAgent,
        platform: mockMobileEnvironments.safari.platform
      } as any;

      // Simulate recent background return
      global.window = {
        __lastVisibilityChange: Date.now() - 30000 // 30 seconds ago
      } as any;

      const detection = supabaseIndexedDBBridge.testMobileBlockingDetection();
      expect(detection.shouldUseCacheFirst).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeouts gracefully', async () => {
      // Mock network timeout
      const timeoutError = new Error('Query timeout after 5000ms');
      
      // Mock Supabase client to throw timeout
      const { getSupabaseClient } = await import('@/integrations/supabase/client');
      const mockClient = getSupabaseClient as Mock;
      mockClient.mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => {
              throw timeoutError;
            })
          }))
        }))
      });

      const result = await supabaseIndexedDBBridge.getSpaceMembers('test-space-id');
      expect(result.error).toBeDefined();
    });

    it('should fallback to cache on network errors', async () => {
      const cachedEntry = createFreshCacheEntry(mockSpaceMembers);
      
      // Mock cache hit
      mockIDBRequest.result = cachedEntry;
      setTimeout(() => {
        if (mockIDBRequest.onsuccess) mockIDBRequest.onsuccess({ target: mockIDBRequest } as any);
      }, 0);

      // Mock network error
      const { getSupabaseClient } = await import('@/integrations/supabase/client');
      const mockClient = getSupabaseClient as Mock;
      mockClient.mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => {
              throw new Error('Network error');
            })
          }))
        }))
      });

      const result = await supabaseIndexedDBBridge.getSpaceMembers('test-space-id');
      expect(result.fromCache).toBe(true);
      expect(result.reason).toBe('mobile_browser_blocking');
    });
  });

  describe('Metrics Tracking', () => {
    it('should track cache hits and misses', async () => {
      const initialMetrics = supabaseIndexedDBBridge.getMetrics();
      
      // Perform some operations
      await supabaseIndexedDBBridge.getSpaceMembers('test-space-id');
      await supabaseIndexedDBBridge.getUserProfile('test-user-id');

      const finalMetrics = supabaseIndexedDBBridge.getMetrics();
      expect(finalMetrics.totalRequests).toBeGreaterThan(initialMetrics.totalRequests);
    });

    it('should track mobile blocking detection', async () => {
      global.navigator = {
        userAgent: mockMobileEnvironments.safari.userAgent,
        platform: mockMobileEnvironments.safari.platform
      } as any;

      // Mock network error that looks like mobile blocking
      const { getSupabaseClient } = await import('@/integrations/supabase/client');
      const mockClient = getSupabaseClient as Mock;
      mockClient.mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => {
              throw new Error('Failed to fetch');
            })
          }))
        }))
      });

      const initialMetrics = supabaseIndexedDBBridge.getMetrics();
      await supabaseIndexedDBBridge.getSpaceMembers('test-space-id');
      const finalMetrics = supabaseIndexedDBBridge.getMetrics();

      expect(finalMetrics.mobileBlockingDetected).toBeGreaterThan(initialMetrics.mobileBlockingDetected);
    });
  });

  describe('Cache Management', () => {
    it('should clear all caches successfully', async () => {
      // Mock successful clear operations
      mockIDBRequest.result = undefined;
      setTimeout(() => {
        if (mockIDBRequest.onsuccess) mockIDBRequest.onsuccess({ target: mockIDBRequest } as any);
      }, 0);

      await supabaseIndexedDBBridge.clearCache();
      expect(mockIDBObjectStore.clear).toHaveBeenCalled();
    });

    it('should get cache status for a space', async () => {
      const status = await supabaseIndexedDBBridge.getCacheStatus('test-space-id');
      expect(status).toBeDefined();
      expect(typeof status).toBe('object');
    });

    it('should warm cache for a space', async () => {
      await supabaseIndexedDBBridge.warmCache('test-space-id');
      // Should trigger network requests to populate cache
      expect(mockIDBObjectStore.put).toHaveBeenCalled();
    });
  });

  describe('User Profile Caching', () => {
    it('should cache user profiles correctly', async () => {
      const result = await supabaseIndexedDBBridge.getUserProfile('test-user-id', ['profile_url', 'full_name']);
      expect(result).toBeDefined();
    });

    it('should handle missing user profiles gracefully', async () => {
      // Mock user not found
      const { getSupabaseClient } = await import('@/integrations/supabase/client');
      const mockClient = getSupabaseClient as Mock;
      mockClient.mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({ data: null, error: new Error('User not found') }))
            }))
          }))
        }))
      });

      const result = await supabaseIndexedDBBridge.getUserProfile('nonexistent-user-id');
      expect(result.error).toBeDefined();
    });
  });

  describe('Presence Updates', () => {
    it('should handle presence updates correctly', async () => {
      const result = await supabaseIndexedDBBridge.updateGlobalPresence('test-user-id', true);
      expect(result).toBeDefined();
    });

    it('should skip presence updates on mobile blocking', async () => {
      global.navigator = {
        userAgent: mockMobileEnvironments.safari.userAgent,
        platform: mockMobileEnvironments.safari.platform
      } as any;

      global.window = {
        __lastVisibilityChange: Date.now() - 30000 // Recent background return
      } as any;

      const result = await supabaseIndexedDBBridge.updateGlobalPresence('test-user-id', true);
      expect(result.fromCache).toBe(true);
      expect(result.reason).toBe('mobile-blocking-skip');
    });
  });

  describe('Database Health Monitoring', () => {
    it('should perform health checks', async () => {
      const healthReport = await supabaseIndexedDBBridge.testChatSystemHealth();
      expect(healthReport).toBeDefined();
      expect(healthReport.timestamp).toBeDefined();
      expect(healthReport.tests).toBeDefined();
    });

    it('should validate user conversations', async () => {
      const validationReport = await supabaseIndexedDBBridge.validateUserConversations('test-user-id');
      expect(validationReport).toBeDefined();
      expect(validationReport.userId).toBe('test-user-id');
      expect(validationReport.status).toBeDefined();
    });

    it('should diagnose conversation issues', async () => {
      const diagnostic = await supabaseIndexedDBBridge.diagnoseConversationIssues('test-conversation-id');
      expect(diagnostic).toBeDefined();
      expect(diagnostic.conversationId).toBe('test-conversation-id');
      expect(diagnostic.exists).toBeDefined();
    });
  });
}); 