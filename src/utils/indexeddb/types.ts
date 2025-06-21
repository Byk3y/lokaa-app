/**
 * TypeScript Types for IndexedDB System
 * 
 * Shared interfaces and types across all IndexedDB services
 */

// Core Cache Entry Interface
export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  key: string;
  ttl: number;
  metadata?: {
    query?: string;
    params?: Record<string, any>;
    spaceId?: string;
    userId?: string;
  };
}

// Bridge Metrics Interface
export interface BridgeMetrics {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  mobileBlockingDetected: number;
  offlineReturns: number;
  networkFailures: number;
}

// Supabase Bridge Result Interface
export interface SupabaseBridgeResult<T = any> {
  data: T | null;
  error: Error | null;
  fromCache?: boolean;
  reason?: string;
}

// Cache Configuration Options
export interface CacheOptions {
  ttl?: number;
  forceNetwork?: boolean;
  skipCache?: boolean;
  metadata?: CacheEntry['metadata'];
}

// Mobile Browser Detection
export interface MobileBrowserInfo {
  isMobile: boolean;
  userAgent: string;
  platform: string;
  shouldUseCacheFirst: boolean;
  recentBackgroundReturn: boolean;
  isHardRefresh: boolean;
  mobileBackgroundDetected: boolean;
}

// Service Health Status
export interface ServiceHealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  details: Record<string, any>;
  lastChecked: number;
  errors: string[];
}

// Database Store Configuration
export interface StoreConfig {
  name: string;
  keyPath: string;
  indexes?: {
    name: string;
    keyPath: string | string[];
    options?: IDBIndexParameters;
  }[];
}

// Cache Statistics
export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  averageAge: number;
  oldestEntry: number;
  newestEntry: number;
}

// Error Types for IndexedDB Operations
export type IndexedDBErrorType = 
  | 'CONNECTION_FAILED'
  | 'STORE_NOT_FOUND'
  | 'OPERATION_TIMEOUT'
  | 'QUOTA_EXCEEDED'
  | 'MOBILE_BLOCKING'
  | 'CACHE_CORRUPTION'
  | 'UNKNOWN_ERROR';

export interface IndexedDBError extends Error {
  type: IndexedDBErrorType;
  originalError?: Error;
  context?: Record<string, any>;
}

// Service Interface Pattern
export interface ICacheService<T = any> {
  get(key: string, options?: CacheOptions): Promise<T | null>;
  set(key: string, data: T, options?: CacheOptions): Promise<void>;
  invalidate(key: string): Promise<void>;
  clear(): Promise<void>;
  getStats(): Promise<CacheStats>;
}

// Mobile Browser Service Interface
export interface IMobileBrowserService {
  detectEnvironment(): MobileBrowserInfo;
  shouldUseCacheFirst(): boolean;
  isMobileBrowserBlocking(error: any): boolean;
  setupMobileDetection(): void;
}

// Database Connection Interface
export interface IIndexedDBManager {
  initialize(): Promise<void>;
  getDatabase(): IDBDatabase | null;
  createStore(config: StoreConfig): Promise<void>;
  deleteStore(name: string): Promise<void>;
  checkHealth(): Promise<ServiceHealthStatus>;
  close(): void;
}

// Legacy Bridge Adapter Interface (for backward compatibility)
export interface ILegacyBridgeAdapter {
  getSpaceMembers(spaceId: string, options?: any): Promise<SupabaseBridgeResult>;
  getUserProfile(userId: string, fields?: string[], options?: any): Promise<SupabaseBridgeResult>;
  getUserConversations(userId: string, options?: any): Promise<SupabaseBridgeResult>;
  getCurrentUser(options?: any): Promise<SupabaseBridgeResult>;
  updateGlobalPresence(userId: string, isOnline: boolean, options?: any): Promise<SupabaseBridgeResult>;
  getMetrics(): BridgeMetrics;
  clearCache(): Promise<void>;
}

// Test Utility Types
export interface MockEnvironment {
  userAgent: string;
  platform: string;
  isMobile: boolean;
  blocksRequests: boolean;
}

export interface TestScenario {
  name: string;
  description: string;
  setup: () => Promise<void>;
  execute: () => Promise<any>;
  verify: (result: any) => boolean;
  cleanup: () => Promise<void>;
}

// Database Schema Types
export interface DatabaseSchema {
  version: number;
  stores: StoreConfig[];
  migrations: {
    fromVersion: number;
    toVersion: number;
    migrate: (db: IDBDatabase, transaction: IDBTransaction) => void;
  }[];
}

// Performance Monitoring Types
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  context?: Record<string, any>;
}

export interface PerformanceReport {
  metrics: PerformanceMetric[];
  summary: {
    averageResponseTime: number;
    cacheHitRate: number;
    errorRate: number;
    throughput: number;
  };
  recommendations: string[];
} 