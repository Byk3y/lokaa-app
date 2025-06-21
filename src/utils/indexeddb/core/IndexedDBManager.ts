/**
 * IndexedDB Database Manager
 * 
 * Core service responsible for all IndexedDB database operations
 * Replaces the database management portion of the monolithic bridge
 */

import { IIndexedDBManager, StoreConfig, ServiceHealthStatus } from '../types';

// Database Configuration
const DB_NAME = 'lokaa-supabase-cache';
const DB_VERSION = 3;

export const STORE_CONFIGS: StoreConfig[] = [
  {
    name: 'space_members_cache',
    keyPath: 'key',
    indexes: [
      { name: 'timestamp', keyPath: 'timestamp' },
      { name: 'spaceId', keyPath: 'metadata.spaceId' }
    ]
  },
  {
    name: 'user_profiles_cache',
    keyPath: 'key',
    indexes: [
      { name: 'timestamp', keyPath: 'timestamp' },
      { name: 'userId', keyPath: 'metadata.userId' }
    ]
  },
  {
    name: 'user_conversations_cache',
    keyPath: 'key',
    indexes: [
      { name: 'timestamp', keyPath: 'timestamp' },
      { name: 'userId', keyPath: 'metadata.userId' }
    ]
  },
  {
    name: 'spaces_cache',
    keyPath: 'key',
    indexes: [
      { name: 'timestamp', keyPath: 'timestamp' },
      { name: 'spaceId', keyPath: 'metadata.spaceId' }
    ]
  },
  {
    name: 'posts_cache',
    keyPath: 'key',
    indexes: [
      { name: 'timestamp', keyPath: 'timestamp' },
      { name: 'spaceId', keyPath: 'metadata.spaceId' }
    ]
  },
  {
    name: 'categories_cache',
    keyPath: 'key',
    indexes: [
      { name: 'timestamp', keyPath: 'timestamp' },
      { name: 'spaceId', keyPath: 'metadata.spaceId' }
    ]
  }
];

/**
 * IndexedDB Manager Service
 * 
 * Handles all database connection, store creation, and health management
 */
export class IndexedDBManager implements IIndexedDBManager {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private isInitialized = false;

  constructor() {
    // Initialize database on construction
    this.initialize();
  }

  /**
   * Initialize the IndexedDB database
   */
  async initialize(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      // Check if IndexedDB is available
      if (typeof indexedDB === 'undefined') {
        console.warn('[IndexedDBManager] IndexedDB not available - using fallback mode');
        resolve();
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[IndexedDBManager] Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        console.log('[IndexedDBManager] Database initialized successfully');
        
        // Setup error handlers
        this.db.onerror = (event) => {
          console.error('[IndexedDBManager] Database error:', event);
        };

        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        console.log('[IndexedDBManager] Upgrading database schema...');
        
        // Create/update object stores
        for (const storeConfig of STORE_CONFIGS) {
          this.createOrUpdateStore(db, storeConfig);
        }
        
        console.log('[IndexedDBManager] Database schema upgrade completed');
      };

      request.onblocked = () => {
        console.warn('[IndexedDBManager] Database upgrade blocked - please close other tabs');
      };
    });

    return this.initPromise;
  }

  /**
   * Get the database instance
   */
  getDatabase(): IDBDatabase | null {
    return this.db;
  }

  /**
   * Create or update a store during schema upgrades
   */
  async createStore(config: StoreConfig): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // This can only be called during version change
    throw new Error('createStore can only be called during database upgrade');
  }

  /**
   * Delete a store (for future migrations)
   */
  async deleteStore(name: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // This can only be called during version change
    throw new Error('deleteStore can only be called during database upgrade');
  }

  /**
   * Create or update store during upgrade
   */
  private createOrUpdateStore(db: IDBDatabase, config: StoreConfig): void {
    let store: IDBObjectStore;

    // Check if store exists
    if (db.objectStoreNames.contains(config.name)) {
      // Store exists, might need index updates
      console.log(`[IndexedDBManager] Store '${config.name}' already exists`);
      return; // For now, don't modify existing stores
    } else {
      // Create new store
      store = db.createObjectStore(config.name, { keyPath: config.keyPath });
      console.log(`[IndexedDBManager] Created store: ${config.name}`);
    }

    // Create indexes
    if (config.indexes) {
      for (const indexConfig of config.indexes) {
        if (!store.indexNames.contains(indexConfig.name)) {
          store.createIndex(
            indexConfig.name,
            indexConfig.keyPath,
            indexConfig.options || {}
          );
          console.log(`[IndexedDBManager] Created index: ${indexConfig.name} on ${config.name}`);
        }
      }
    }
  }

  /**
   * Check database health
   */
  async checkHealth(): Promise<ServiceHealthStatus> {
    const errors: string[] = [];
    let details: Record<string, any> = {};

    try {
      // Check if database is available
      if (typeof indexedDB === 'undefined') {
        errors.push('IndexedDB not available in this environment');
        return {
          status: 'unhealthy',
          details: { indexedDBAvailable: false },
          lastChecked: Date.now(),
          errors
        };
      }

      // Check if database is initialized
      if (!this.isInitialized || !this.db) {
        errors.push('Database not initialized');
        details.initialized = false;
      } else {
        details.initialized = true;
        details.version = this.db.version;
        details.storeCount = this.db.objectStoreNames.length;
        details.expectedStores = STORE_CONFIGS.length;
        
        // Check if all expected stores exist
        const missingStores = STORE_CONFIGS
          .map(config => config.name)
          .filter(storeName => !this.db!.objectStoreNames.contains(storeName));
        
        if (missingStores.length > 0) {
          errors.push(`Missing stores: ${missingStores.join(', ')}`);
          details.missingStores = missingStores;
        } else {
          details.allStoresPresent = true;
        }
      }

      // Determine overall status
      let status: 'healthy' | 'unhealthy' | 'degraded';
      if (errors.length === 0) {
        status = 'healthy';
      } else if (this.db && errors.length <= 2) {
        status = 'degraded';
      } else {
        status = 'unhealthy';
      }

      return {
        status,
        details,
        lastChecked: Date.now(),
        errors
      };

    } catch (error) {
      errors.push(`Health check failed: ${error instanceof Error ? error.message : String(error)}`);
      
      return {
        status: 'unhealthy',
        details: { healthCheckError: true },
        lastChecked: Date.now(),
        errors
      };
    }
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
      console.log('[IndexedDBManager] Database connection closed');
    }
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<{
    version: number;
    storeCount: number;
    stores: string[];
    estimatedSize?: number;
  }> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const stats = {
      version: this.db.version,
      storeCount: this.db.objectStoreNames.length,
      stores: Array.from(this.db.objectStoreNames)
    };

    // Try to get storage estimate if available
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          ...stats,
          estimatedSize: estimate.usage || 0
        };
      } catch (error) {
        console.warn('[IndexedDBManager] Could not get storage estimate:', error);
      }
    }

    return stats;
  }

  /**
   * Force database refresh (for emergency situations)
   */
  async forceRefresh(): Promise<void> {
    console.warn('[IndexedDBManager] Forcing database refresh...');
    
    // Close current connection
    this.close();
    
    // Clear initialization promise
    this.initPromise = null;
    
    // Reinitialize
    await this.initialize();
    
    console.log('[IndexedDBManager] Database refresh completed');
  }
}

// Export singleton instance
export const indexedDBManager = new IndexedDBManager(); 