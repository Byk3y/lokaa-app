// Mobile Lock Manager
// Prevents simultaneous queries on mobile hard refresh to avoid overwhelming Safari's connection recovery

class MobileLockManager {
  private locks = new Map<string, Promise<any>>();
  
  async executeWithLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // Check if operation is already in progress
    if (this.locks.has(key)) {
      console.log(`🔒 [MobileLock] Operation ${key} already in progress, waiting...`);
      try {
        return await this.locks.get(key);
      } catch (error) {
        // If existing operation failed, remove lock and proceed
        this.locks.delete(key);
        throw error;
      }
    }
    
    console.log(`🔒 [MobileLock] Starting operation: ${key}`);
    
    // Create and store the promise
    const promise = fn();
    this.locks.set(key, promise);
    
    try {
      const result = await promise;
      console.log(`✅ [MobileLock] Completed operation: ${key}`);
      return result;
    } catch (error) {
      console.error(`❌ [MobileLock] Failed operation: ${key}`, error);
      throw error;
    } finally {
      // Always clean up the lock
      this.locks.delete(key);
    }
  }
  
  clearLocks() {
    console.log('🧹 [MobileLock] Clearing all locks');
    this.locks.clear();
  }
}

export const mobileLockManager = new MobileLockManager();

// Development helpers
if (process.env.NODE_ENV === 'development') {
  (window as any).mobileLockManager = mobileLockManager;
} 