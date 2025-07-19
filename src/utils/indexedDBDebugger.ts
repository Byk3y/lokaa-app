import { log } from '@/utils/logger';
/**
 * IndexedDB Debugger & Cache Reset Utility
 * 
 * Utility to debug IndexedDB issues and force schema upgrades
 */

/**
 * Force delete IndexedDB database to trigger schema recreation
 */
export async function forceResetIndexedDB(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Close any existing connections first
    if (typeof window !== 'undefined') {
      const deleteRequest = indexedDB.deleteDatabase('lokaa-supabase-cache');
      
      deleteRequest.onsuccess = () => {
        log.debug('Utils', '🔄 [IndexedDBDebugger] Database deleted successfully, will recreate on next access');
        resolve();
      };
      
      deleteRequest.onerror = () => {
        log.error('Utils', '❌ [IndexedDBDebugger] Failed to delete database:', deleteRequest.error);
        reject(deleteRequest.error);
      };
      
      deleteRequest.onblocked = () => {
        log.warn('Utils', '⚠️ [IndexedDBDebugger] Database deletion blocked - please close all tabs');
        // Force resolve after timeout
        setTimeout(() => resolve(), 2000);
      };
    }
  });
}

/**
 * Check current IndexedDB database version and stores
 */
export async function checkIndexedDBStatus(): Promise<any> {
  return new Promise((resolve) => {
    const request = indexedDB.open('lokaa-supabase-cache');
    
    request.onsuccess = () => {
      const db = request.result;
      const status = {
        version: db.version,
        stores: Array.from(db.objectStoreNames),
        expectedStores: [
          'space_members_cache',
          'spaces_cache', 
          'posts_cache',
          'categories_cache',
          'user_profiles_cache'
        ]
      };
      
      db.close();
      resolve(status);
    };
    
    request.onerror = () => {
      resolve({ error: 'Failed to open database' });
    };
  });
}

/**
 * Test the IndexedDB bridge after fixes
 */
export async function testIndexedDBBridge(): Promise<any> {
  const status = await checkIndexedDBStatus();
  log.debug('Utils', '📊 [IndexedDBDebugger] Current database status:', status);
  
  // Check if all expected stores exist
  const expectedStores = [
    'space_members_cache',
    'spaces_cache', 
    'posts_cache',
    'categories_cache',
    'user_profiles_cache'
  ];
  
  const missingStores = expectedStores.filter(store => !status.stores?.includes(store));
  
  if (missingStores.length > 0) {
    log.warn('Utils', `⚠️ [IndexedDBDebugger] Missing stores: ${missingStores.join(', ')}`);
    log.debug('Utils', '🔄 [IndexedDBDebugger] Attempting database reset...');
    
    await forceResetIndexedDB();
    
    // Wait a bit for the deletion to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check status again
    const newStatus = await checkIndexedDBStatus();
    log.debug('Utils', '📊 [IndexedDBDebugger] Database status after reset:', newStatus);
    
    return {
      beforeReset: status,
      afterReset: newStatus,
      fixed: newStatus.stores?.length === expectedStores.length
    };
  }
  
  return {
    status: 'healthy',
    allStoresPresent: true,
    version: status.version,
    stores: status.stores
  };
}

// Global interface for debugging
if (typeof window !== 'undefined') {
  (window as any).indexedDBDebugger = {
    checkStatus: checkIndexedDBStatus,
    forceReset: forceResetIndexedDB,
    testBridge: testIndexedDBBridge,
    // Quick fix command
    quickFix: async () => {
      log.debug('Utils', '🔧 [IndexedDBDebugger] Running quick fix...');
      try {
        await forceResetIndexedDB();
        await new Promise(resolve => setTimeout(resolve, 1000));
        const status = await checkIndexedDBStatus();
        log.debug('Utils', '✅ [IndexedDBDebugger] Quick fix completed:', status);
        return status;
      } catch (error) {
        log.warn('Utils', '⚠️ [IndexedDBDebugger] Reset blocked, trying alternative approach...');
        // Alternative: Just check current status and proceed
        const status = await checkIndexedDBStatus();
        if (status.stores?.includes('user_profiles_cache')) {
          log.debug('Utils', '✅ [IndexedDBDebugger] Database already has correct schema');
        } else {
          log.debug('Utils', 'ℹ️ [IndexedDBDebugger] Please close other tabs and refresh to trigger schema upgrade');
        }
        return status;
      }
    },
    // Simple status check without reset
    checkHealth: async () => {
      const status = await checkIndexedDBStatus();
      const isHealthy = status.stores?.length === 5 && status.stores.includes('user_profiles_cache');
      log.debug('Utils', isHealthy ? '✅ Database is healthy' : '⚠️ Database needs schema upgrade');
      return { ...status, healthy: isHealthy };
    }
  };
  
  log.debug('Utils', '🔧 [IndexedDBDebugger] Debug utilities loaded:');
  log.debug('Utils', '  - window.indexedDBDebugger.checkStatus()');
  log.debug('Utils', '  - window.indexedDBDebugger.forceReset()');
  log.debug('Utils', '  - window.indexedDBDebugger.testBridge()');
  log.debug('Utils', '  - window.indexedDBDebugger.quickFix()');
  log.debug('Utils', '  - window.indexedDBDebugger.checkHealth()');
} 