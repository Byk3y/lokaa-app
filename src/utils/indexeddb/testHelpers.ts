/**
 * Test Helpers for IndexedDB System
 * 
 * Provides utilities and mocks for testing IndexedDB functionality
 */

import { vi } from 'vitest';
import { CacheEntry, MobileBrowserInfo, BridgeMetrics } from './types';

// Mock IndexedDB Implementation
export class MockIndexedDB {
  private stores = new Map<string, Map<string, any>>();
  private isOpen = false;

  constructor() {
    this.setupMocks();
  }

  private setupMocks() {
    // Create mock stores
    const storeNames = [
      'space_members_cache',
      'user_profiles_cache', 
      'user_conversations_cache',
      'spaces_cache',
      'posts_cache',
      'categories_cache'
    ];

    storeNames.forEach(name => {
      this.stores.set(name, new Map());
    });
  }

  open(name: string, version: number) {
    const request = {
      result: this.createMockDatabase(),
      error: null,
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      onblocked: null
    };

    setTimeout(() => {
      this.isOpen = true;
      if (request.onsuccess) {
        request.onsuccess({ target: request } as any);
      }
    }, 0);

    return request;
  }

  deleteDatabase(name: string) {
    const request = {
      onsuccess: null,
      onerror: null,
      onblocked: null
    };

    setTimeout(() => {
      this.stores.clear();
      this.isOpen = false;
      if (request.onsuccess) {
        request.onsuccess({} as any);
      }
    }, 0);

    return request;
  }

  private createMockDatabase() {
    return {
      objectStoreNames: Array.from(this.stores.keys()),
      transaction: (storeNames: string[], mode: IDBTransactionMode) => {
        return this.createMockTransaction(storeNames, mode);
      },
      close: () => {
        this.isOpen = false;
      },
      createObjectStore: (name: string) => {
        this.stores.set(name, new Map());
        return this.createMockObjectStore(name);
      },
      deleteObjectStore: (name: string) => {
        this.stores.delete(name);
      }
    };
  }

  private createMockTransaction(storeNames: string[], mode: IDBTransactionMode) {
    return {
      objectStore: (name: string) => this.createMockObjectStore(name),
      oncomplete: null,
      onerror: null,
      onabort: null,
      mode
    };
  }

  private createMockObjectStore(name: string) {
    const store = this.stores.get(name) || new Map();
    
    return {
      get: (key: string) => this.createMockRequest(store.get(key)),
      put: (value: any) => {
        store.set(value.key, value);
        return this.createMockRequest(undefined);
      },
      delete: (key: string) => {
        store.delete(key);
        return this.createMockRequest(undefined);
      },
      clear: () => {
        store.clear();
        return this.createMockRequest(undefined);
      },
      createIndex: vi.fn(),
      index: vi.fn(),
      getAll: (query?: any) => this.createMockRequest(Array.from(store.values()))
    };
  }

  private createMockRequest(result: any) {
    const request = {
      result,
      error: null,
      onsuccess: null,
      onerror: null
    };

    setTimeout(() => {
      if (request.onsuccess) {
        request.onsuccess({ target: request } as any);
      }
    }, 0);

    return request;
  }

  // Helper methods for testing
  insertTestData(storeName: string, key: string, data: any) {
    const store = this.stores.get(storeName);
    if (store) {
      store.set(key, data);
    }
  }

  getTestData(storeName: string, key: string) {
    const store = this.stores.get(storeName);
    return store ? store.get(key) : null;
  }

  clearTestData() {
    this.stores.forEach(store => store.clear());
  }
}

// Mock Browser Environment
export class MockBrowserEnvironment {
  private originalNavigator: any;
  private originalPerformance: any;
  private originalWindow: any;

  constructor() {
    this.originalNavigator = global.navigator;
    this.originalPerformance = global.performance;
    this.originalWindow = global.window;
  }

  setupMobileEnvironment(type: 'safari' | 'chrome' | 'desktop' = 'desktop') {
    const environments = {
      safari: {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        platform: 'iPhone'
      },
      chrome: {
        userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36',
        platform: 'Android'
      },
      desktop: {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
        platform: 'MacIntel'
      }
    };

    const env = environments[type];

    global.navigator = {
      userAgent: env.userAgent,
      platform: env.platform
    } as any;

    global.performance = {
      navigation: { type: 0 },
      getEntriesByType: vi.fn(() => [{ type: 'navigate' }])
    } as any;

    global.window = {
      __lastVisibilityChange: null,
      __mobileBackgroundState: null
    } as any;
  }

  simulateBackgroundReturn(secondsAgo: number = 30) {
    if (global.window) {
      (global.window as any).__lastVisibilityChange = Date.now() - (secondsAgo * 1000);
    }
  }

  simulateMobileBlocking() {
    if (global.window) {
      (global.window as any).__mobileBackgroundState = true;
    }
  }

  restore() {
    global.navigator = this.originalNavigator;
    global.performance = this.originalPerformance;
    global.window = this.originalWindow;
  }
}

// Mock Supabase Client
export class MockSupabaseClient {
  private responses = new Map<string, any>();
  private errors = new Map<string, Error>();

  setResponse(key: string, response: any) {
    this.responses.set(key, response);
  }

  setError(key: string, error: Error) {
    this.errors.set(key, error);
  }

  from(table: string) {
    return {
      select: (fields: string) => ({
        eq: (column: string, value: any) => ({
          single: () => this.getMockResponse(`${table}_${column}_${value}`),
          order: () => ({
            range: () => this.getMockResponse(`${table}_list`)
          })
        }),
        order: () => ({
          range: () => this.getMockResponse(`${table}_list`)
        })
      }),
      update: (data: any) => ({
        eq: (column: string, value: any) => ({
          neq: () => this.getMockResponse(`${table}_update`)
        })
      })
    };
  }

  get auth() {
    return {
      getUser: () => this.getMockResponse('auth_user')
    };
  }

  rpc(functionName: string, params: any) {
    return this.getMockResponse(`rpc_${functionName}`);
  }

  private getMockResponse(key: string) {
    if (this.errors.has(key)) {
      return Promise.reject(this.errors.get(key));
    }

    const response = this.responses.get(key) || { data: null, error: null };
    return Promise.resolve(response);
  }

  clearMocks() {
    this.responses.clear();
    this.errors.clear();
  }
}

// Test Data Factory
export class TestDataFactory {
  static createCacheEntry<T>(data: T, ageInMs: number = 0): CacheEntry<T> {
    return {
      data,
      timestamp: Date.now() - ageInMs,
      key: `test_${Date.now()}_${Math.random()}`,
      ttl: 300000, // 5 minutes
      metadata: {
        query: 'test_query',
        params: {},
        spaceId: 'test-space-id'
      }
    };
  }

  static createFreshCacheEntry<T>(data: T): CacheEntry<T> {
    return this.createCacheEntry(data, 1000); // 1 second old
  }

  static createExpiredCacheEntry<T>(data: T): CacheEntry<T> {
    return this.createCacheEntry(data, 3600000); // 1 hour old
  }

  static createMockUser(id: string = 'test-user-id') {
    return {
      id,
      full_name: `Test User ${id.slice(-4)}`,
      profile_url: `https://example.com/avatar_${id}.jpg`,
      email: `user_${id}@example.com`,
      created_at: new Date().toISOString()
    };
  }

  static createMockSpaceMember(userId: string, spaceId: string, role: 'owner' | 'admin' | 'member' = 'member') {
    return {
      id: `member_${userId}_${spaceId}`,
      user_id: userId,
      space_id: spaceId,
      role,
      status: 'active',
      is_online: Math.random() > 0.5,
      last_active_at: new Date(Date.now() - Math.random() * 3600000).toISOString(),
      joined_at: new Date().toISOString()
    };
  }

  static createMockConversation(id: string = 'test-conversation-id') {
    return {
      conversation_id: id,
      user_id: 'user1',
      other_user_id: 'user2',
      other_user_name: 'Test User 2',
      other_user_avatar: 'https://example.com/avatar2.jpg',
      last_message: 'Test message',
      last_message_at: new Date().toISOString(),
      last_message_sender: 'user2',
      unread_count: Math.floor(Math.random() * 5)
    };
  }

  static createMockMetrics(): BridgeMetrics {
    return {
      totalRequests: 100,
      cacheHits: 75,
      cacheMisses: 25,
      mobileBlockingDetected: 5,
      offlineReturns: 3,
      networkFailures: 2
    };
  }
}

// Test Scenario Runner
export class TestScenarioRunner {
  private scenarios: Array<{
    name: string;
    description: string;
    setup: () => Promise<void>;
    execute: () => Promise<any>;
    verify: (result: any) => boolean;
    cleanup: () => Promise<void>;
  }> = [];

  addScenario(scenario: {
    name: string;
    description: string;
    setup: () => Promise<void>;
    execute: () => Promise<any>;
    verify: (result: any) => boolean;
    cleanup: () => Promise<void>;
  }) {
    this.scenarios.push(scenario);
  }

  async runAll() {
    const results = [];

    for (const scenario of this.scenarios) {
      try {
        await scenario.setup();
        const result = await scenario.execute();
        const passed = scenario.verify(result);
        await scenario.cleanup();

        results.push({
          name: scenario.name,
          description: scenario.description,
          passed,
          result
        });
      } catch (error) {
        results.push({
          name: scenario.name,
          description: scenario.description,
          passed: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return results;
  }
}

// Performance Test Utilities
export class PerformanceTestUtils {
  static async measureExecutionTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    return { result, duration };
  }

  static async measureMemoryUsage<T>(fn: () => Promise<T>): Promise<{ result: T; memoryDelta: number }> {
    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
    const result = await fn();
    const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
    const memoryDelta = finalMemory - initialMemory;
    return { result, memoryDelta };
  }

  static createPerformanceBenchmark(name: string, iterations: number = 100) {
    return async (fn: () => Promise<any>) => {
      const times: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const { duration } = await this.measureExecutionTime(fn);
        times.push(duration);
      }

      const average = times.reduce((sum, time) => sum + time, 0) / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);
      const median = times.sort((a, b) => a - b)[Math.floor(times.length / 2)];

      return {
        name,
        iterations,
        average,
        min,
        max,
        median,
        times
      };
    };
  }
}

// Export all test utilities
export const testHelpers = {
  MockIndexedDB,
  MockBrowserEnvironment,
  MockSupabaseClient,
  TestDataFactory,
  TestScenarioRunner,
  PerformanceTestUtils
}; 