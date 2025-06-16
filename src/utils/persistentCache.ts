interface CacheEntry<T = any> {
  id: string;
  data: T;
  timestamp: number;
  version: string;
  accessCount: number;
  lastAccessTime: number;
  size: number;
  tags: string[];
  expiresAt?: number;
}

interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  missCount: number;
  hitCount: number;
  lastCleanup: number;
}

/**
 * Advanced IndexedDB-based persistent cache with LRU eviction and compression
 */
class PersistentCache {
  private dbName = 'lokaa-persistent-cache';
  private version = 1;
  private db: IDBDatabase | null = null;
  private stats: CacheStats = {
    totalEntries: 0,
    totalSize: 0,
    hitRate: 0,
    missCount: 0,
    hitCount: 0,
    lastCleanup: Date.now()
  };
  
  // Cache configuration
  private readonly DEFAULT_TTL = 3600000; // 1 hour
  private readonly MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly MAX_ENTRIES = 1000;
  private readonly CLEANUP_INTERVAL = 300000; // 5 minutes
  private readonly COMPRESSION_THRESHOLD = 1024; // 1KB
  
  private cleanupTimer: NodeJS.Timeout | null = null;
  private initPromise: Promise<void> | null = null;
  
  /**
   * Initialize the database and start background tasks
   */
  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => {
        console.error('[PersistentCache] Failed to open database:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        console.log('[PersistentCache] Database initialized successfully');
        
        // Start background cleanup
        this.startBackgroundCleanup();
        
        // Load initial stats
        this.updateStats();
        
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { keyPath: 'id' });
          
          // Create indexes for efficient querying
          cacheStore.createIndex('timestamp', 'timestamp');
          cacheStore.createIndex('lastAccessTime', 'lastAccessTime');
          cacheStore.createIndex('expiresAt', 'expiresAt');
          cacheStore.createIndex('tags', 'tags', { multiEntry: true });
          cacheStore.createIndex('size', 'size');
        }
        
        if (!db.objectStoreNames.contains('stats')) {
          db.createObjectStore('stats', { keyPath: 'id' });
        }
        
        console.log('[PersistentCache] Database schema created');
      };
    });
    
    return this.initPromise;
  }
  
  /**
   * Set data in cache with optional compression
   */
  async set<T>(
    key: string, 
    data: T, 
    options: {
      ttl?: number;
      tags?: string[];
      compress?: boolean;
    } = {}
  ): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');
    
    const { ttl = this.DEFAULT_TTL, tags = [], compress = true } = options;
    
    // Serialize and optionally compress data
    let serializedData: string;
    let actualSize: number;
    
    try {
      serializedData = JSON.stringify(data);
      actualSize = new Blob([serializedData]).size;
      
      // Compress if data is large and compression is enabled
      if (compress && actualSize > this.COMPRESSION_THRESHOLD) {
        try {
          // Simple compression using gzip if available
          if ('CompressionStream' in window) {
            const compressionStream = new CompressionStream('gzip');
            const writer = compressionStream.writable.getWriter();
            const reader = compressionStream.readable.getReader();
            
            writer.write(new TextEncoder().encode(serializedData));
            writer.close();
            
            const chunks: Uint8Array[] = [];
            let done = false;
            
            while (!done) {
              const { value, done: readerDone } = await reader.read();
              done = readerDone;
              if (value) chunks.push(value);
            }
            
            const compressed = new Uint8Array(
              chunks.reduce((acc, chunk) => acc + chunk.length, 0)
            );
            let offset = 0;
            for (const chunk of chunks) {
              compressed.set(chunk, offset);
              offset += chunk.length;
            }
            
            serializedData = `__COMPRESSED__${btoa(String.fromCharCode(...compressed))}`;
            actualSize = compressed.length;
          }
        } catch (compressionError) {
          console.warn('[PersistentCache] Compression failed, storing uncompressed:', compressionError);
        }
      }
    } catch (serializationError) {
      console.error('[PersistentCache] Serialization failed:', serializationError);
      throw new Error(`Failed to serialize data for key: ${key}`);
    }
    
    const entry: CacheEntry<string> = {
      id: key,
      data: serializedData,
      timestamp: Date.now(),
      version: this.version.toString(),
      accessCount: 0,
      lastAccessTime: Date.now(),
      size: actualSize,
      tags: tags,
      expiresAt: ttl > 0 ? Date.now() + ttl : undefined
    };
    
    // Check if we need to make space
    await this.ensureSpace(actualSize);
    
    // Store the entry
    const transaction = this.db.transaction(['cache'], 'readwrite');
    const store = transaction.objectStore('cache');
    
    try {
      await new Promise<void>((resolve, reject) => {
        const request = store.put(entry);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      console.log(`[PersistentCache] Stored ${key} (${(actualSize / 1024).toFixed(2)}KB)`);
      this.updateStats();
    } catch (error) {
      console.error(`[PersistentCache] Failed to store ${key}:`, error);
      throw error;
    }
  }
  
  /**
   * Get data from cache with decompression
   */
  async get<T>(key: string): Promise<T | null> {
    await this.init();
    if (!this.db) return null;
    
    const transaction = this.db.transaction(['cache'], 'readonly');
    const store = transaction.objectStore('cache');
    
    try {
      const entry = await new Promise<CacheEntry<string> | undefined>((resolve, reject) => {
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      if (!entry) {
        this.stats.missCount++;
        return null;
      }
      
      // Check if expired
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        this.stats.missCount++;
        // Remove expired entry
        this.delete(key);
        return null;
      }
      
      // Update access stats
      await this.updateAccessStats(key, entry);
      this.stats.hitCount++;
      
      // Deserialize and decompress data
      let deserializedData: T;
      
      try {
        let dataToDeserialize = entry.data;
        
        // Check if data is compressed
        if (dataToDeserialize.startsWith('__COMPRESSED__')) {
          try {
            const compressedData = dataToDeserialize.substring('__COMPRESSED__'.length);
            const compressed = new Uint8Array(
              atob(compressedData).split('').map(char => char.charCodeAt(0))
            );
            
            if ('DecompressionStream' in window) {
              const decompressionStream = new DecompressionStream('gzip');
              const writer = decompressionStream.writable.getWriter();
              const reader = decompressionStream.readable.getReader();
              
              writer.write(compressed);
              writer.close();
              
              const chunks: Uint8Array[] = [];
              let done = false;
              
              while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                if (value) chunks.push(value);
              }
              
              const decompressed = new Uint8Array(
                chunks.reduce((acc, chunk) => acc + chunk.length, 0)
              );
              let offset = 0;
              for (const chunk of chunks) {
                decompressed.set(chunk, offset);
                offset += chunk.length;
              }
              
              dataToDeserialize = new TextDecoder().decode(decompressed);
            }
          } catch (decompressionError) {
            console.warn('[PersistentCache] Decompression failed:', decompressionError);
            return null;
          }
        }
        
        deserializedData = JSON.parse(dataToDeserialize);
        
        console.log(`[PersistentCache] Retrieved ${key} (hit)`);
        return deserializedData;
      } catch (deserializationError) {
        console.error('[PersistentCache] Deserialization failed:', deserializationError);
        this.stats.missCount++;
        return null;
      }
    } catch (error) {
      console.error(`[PersistentCache] Failed to retrieve ${key}:`, error);
      this.stats.missCount++;
      return null;
    }
  }
  
  /**
   * Delete entry from cache
   */
  async delete(key: string): Promise<void> {
    await this.init();
    if (!this.db) return;
    
    const transaction = this.db.transaction(['cache'], 'readwrite');
    const store = transaction.objectStore('cache');
    
    try {
      await new Promise<void>((resolve, reject) => {
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      console.log(`[PersistentCache] Deleted ${key}`);
      this.updateStats();
    } catch (error) {
      console.error(`[PersistentCache] Failed to delete ${key}:`, error);
    }
  }
  
  /**
   * Clear all cache entries or entries with specific tags
   */
  async clear(tags?: string[]): Promise<void> {
    await this.init();
    if (!this.db) return;
    
    const transaction = this.db.transaction(['cache'], 'readwrite');
    const store = transaction.objectStore('cache');
    
    try {
      if (!tags || tags.length === 0) {
        // Clear all
        await new Promise<void>((resolve, reject) => {
          const request = store.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
        console.log('[PersistentCache] Cleared all entries');
      } else {
        // Clear entries with specific tags
        for (const tag of tags) {
          const index = store.index('tags');
          const request = index.openCursor(IDBKeyRange.only(tag));
          
          await new Promise<void>((resolve, reject) => {
            request.onsuccess = (event) => {
              const cursor = (event.target as IDBRequest).result;
              if (cursor) {
                cursor.delete();
                cursor.continue();
              } else {
                resolve();
              }
            };
            request.onerror = () => reject(request.error);
          });
        }
        console.log(`[PersistentCache] Cleared entries with tags: ${tags.join(', ')}`);
      }
      
      this.updateStats();
    } catch (error) {
      console.error('[PersistentCache] Failed to clear cache:', error);
    }
  }
  
  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hitCount + this.stats.missCount;
    this.stats.hitRate = totalRequests > 0 ? this.stats.hitCount / totalRequests : 0;
    
    return { ...this.stats };
  }
  
  /**
   * Ensure there's enough space for new entry
   */
  private async ensureSpace(requiredSize: number): Promise<void> {
    if (!this.db) return;
    
    const currentStats = await this.calculateCurrentSize();
    
    // Check if we need to free up space
    if (
      currentStats.totalSize + requiredSize > this.MAX_CACHE_SIZE ||
      currentStats.totalEntries >= this.MAX_ENTRIES
    ) {
      console.log('[PersistentCache] Cache full, performing LRU eviction...');
      await this.evictLRU(requiredSize);
    }
  }
  
  /**
   * Evict least recently used entries
   */
  private async evictLRU(requiredSize: number): Promise<void> {
    if (!this.db) return;
    
    const transaction = this.db.transaction(['cache'], 'readwrite');
    const store = transaction.objectStore('cache');
    const index = store.index('lastAccessTime');
    
    let freedSize = 0;
    let evictedCount = 0;
    
    const request = index.openCursor();
    
    await new Promise<void>((resolve, reject) => {
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        
        if (cursor && (freedSize < requiredSize || evictedCount < 10)) {
          const entry: CacheEntry = cursor.value;
          freedSize += entry.size;
          evictedCount++;
          
          cursor.delete();
          console.log(`[PersistentCache] Evicted ${entry.id} (${(entry.size / 1024).toFixed(2)}KB)`);
          
          cursor.continue();
        } else {
          console.log(`[PersistentCache] Evicted ${evictedCount} entries, freed ${(freedSize / 1024).toFixed(2)}KB`);
          resolve();
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }
  
  /**
   * Update access statistics for an entry
   */
  private async updateAccessStats(key: string, entry: CacheEntry): Promise<void> {
    if (!this.db) return;
    
    const updatedEntry: CacheEntry = {
      ...entry,
      accessCount: entry.accessCount + 1,
      lastAccessTime: Date.now()
    };
    
    const transaction = this.db.transaction(['cache'], 'readwrite');
    const store = transaction.objectStore('cache');
    
    try {
      await new Promise<void>((resolve, reject) => {
        const request = store.put(updatedEntry);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error(`[PersistentCache] Failed to update access stats for ${key}:`, error);
    }
  }
  
  /**
   * Calculate current cache size and entry count
   */
  private async calculateCurrentSize(): Promise<{ totalSize: number; totalEntries: number }> {
    if (!this.db) return { totalSize: 0, totalEntries: 0 };
    
    const transaction = this.db.transaction(['cache'], 'readonly');
    const store = transaction.objectStore('cache');
    
    return new Promise((resolve, reject) => {
      let totalSize = 0;
      let totalEntries = 0;
      
      const request = store.openCursor();
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        
        if (cursor) {
          const entry: CacheEntry = cursor.value;
          totalSize += entry.size;
          totalEntries++;
          cursor.continue();
        } else {
          resolve({ totalSize, totalEntries });
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }
  
  /**
   * Update cache statistics
   */
  private async updateStats(): Promise<void> {
    const { totalSize, totalEntries } = await this.calculateCurrentSize();
    
    this.stats.totalSize = totalSize;
    this.stats.totalEntries = totalEntries;
    
    // Persist stats to database
    if (this.db) {
      const transaction = this.db.transaction(['stats'], 'readwrite');
      const store = transaction.objectStore('stats');
      
      try {
        await new Promise<void>((resolve, reject) => {
          const request = store.put({ id: 'main', ...this.stats });
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      } catch (error) {
        console.error('[PersistentCache] Failed to update stats:', error);
      }
    }
  }
  
  /**
   * Start background cleanup tasks
   */
  private startBackgroundCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.cleanupTimer = setInterval(async () => {
      console.log('[PersistentCache] Running background cleanup...');
      
      try {
        await this.cleanupExpired();
        await this.updateStats();
        
        const stats = this.getStats();
        console.log(`[PersistentCache] Cleanup complete - ${stats.totalEntries} entries, ${(stats.totalSize / 1024 / 1024).toFixed(2)}MB`);
      } catch (error) {
        console.error('[PersistentCache] Background cleanup failed:', error);
      }
    }, this.CLEANUP_INTERVAL);
  }
  
  /**
   * Remove expired entries
   */
  private async cleanupExpired(): Promise<void> {
    if (!this.db) return;
    
    const transaction = this.db.transaction(['cache'], 'readwrite');
    const store = transaction.objectStore('cache');
    const index = store.index('expiresAt');
    
    const now = Date.now();
    let expiredCount = 0;
    
    const request = index.openCursor(IDBKeyRange.upperBound(now));
    
    await new Promise<void>((resolve, reject) => {
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        
        if (cursor) {
          const entry: CacheEntry = cursor.value;
          if (entry.expiresAt && entry.expiresAt <= now) {
            cursor.delete();
            expiredCount++;
          }
          cursor.continue();
        } else {
          if (expiredCount > 0) {
            console.log(`[PersistentCache] Removed ${expiredCount} expired entries`);
          }
          resolve();
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }
  
  /**
   * Cleanup when cache is no longer needed
   */
  cleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    
    console.log('[PersistentCache] Cleanup complete');
  }
}

// Global cache instance
export const persistentCache = new PersistentCache();

// Pre-configured cache instances for different data types
export const cacheInstances = {
  spaces: {
    async set(key: string, data: any, ttl = 300000) { // 5 minutes
      return persistentCache.set(`space:${key}`, data, { ttl, tags: ['spaces'] });
    },
    async get<T>(key: string): Promise<T | null> {
      return persistentCache.get(`space:${key}`);
    },
    async clear() {
      return persistentCache.clear(['spaces']);
    }
  },
  
  users: {
    async set(key: string, data: any, ttl = 180000) { // 3 minutes
      return persistentCache.set(`user:${key}`, data, { ttl, tags: ['users'] });
    },
    async get<T>(key: string): Promise<T | null> {
      return persistentCache.get(`user:${key}`);
    },
    async clear() {
      return persistentCache.clear(['users']);
    }
  },
  
  posts: {
    async set(key: string, data: any, ttl = 120000) { // 2 minutes
      return persistentCache.set(`post:${key}`, data, { ttl, tags: ['posts'] });
    },
    async get<T>(key: string): Promise<T | null> {
      return persistentCache.get(`post:${key}`);
    },
    async clear() {
      return persistentCache.clear(['posts']);
    }
  }
};

// Initialize cache on module load
if (typeof window !== 'undefined') {
  persistentCache.init().catch(error => {
    console.error('[PersistentCache] Initialization failed:', error);
  });
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    persistentCache.cleanup();
  });
  
  // Expose to window for debugging
  if (process.env.NODE_ENV === 'development') {
    (window as any).persistentCache = persistentCache;
    (window as any).cacheInstances = cacheInstances;
    // Cache debugging tools available (logging moved to development logger)
  }
} 