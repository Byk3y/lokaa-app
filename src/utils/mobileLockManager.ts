import { log } from '@/utils/logger';
// Mobile Lock Manager
// Prevents simultaneous queries on mobile hard refresh to avoid overwhelming Safari's connection recovery

class MobileLockManager {
  private locks = new Map<string, Promise<any>>();
  
  async executeWithLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // Check if operation is already in progress
    if (this.locks.has(key)) {
      log.debug('Utils', `🔒 [MobileLock] Operation ${key} already in progress, waiting...`);
      try {
        return await this.locks.get(key);
      } catch (error) {
        // If existing operation failed, remove lock and proceed
        this.locks.delete(key);
        throw error;
      }
    }
    
    log.debug('Utils', `🔒 [MobileLock] Starting operation: ${key}`);
    
    // Create and store the promise
    const promise = fn();
    this.locks.set(key, promise);
    
    try {
      const result = await promise;
      log.debug('Utils', `✅ [MobileLock] Completed operation: ${key}`);
      return result;
    } catch (error) {
      log.error('Utils', `❌ [MobileLock] Failed operation: ${key}`, error);
      throw error;
    } finally {
      // Always clean up the lock
      this.locks.delete(key);
    }
  }
  
  clearLocks() {
    log.debug('Utils', '🧹 [MobileLock] Clearing all locks');
    this.locks.clear();
  }
}

export const mobileLockManager = new MobileLockManager();

// Development helpers
if (process.env.NODE_ENV === 'development') {
  (window as any).mobileLockManager = mobileLockManager;
} 