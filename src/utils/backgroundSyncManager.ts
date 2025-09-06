import { log } from '@/utils/logger';
/**
 * 🔄 Background Sync Manager
 * 
 * Phase 6B: Manages background synchronization for hydrated components
 * with intelligent scheduling and error handling.
 */

export interface SyncTask {
  id: string;
  componentId: string;
  userId: string;
  syncFunction: () => Promise<void>;
  interval: number;
  lastSync: number | null;
  isRunning: boolean;
  errorCount: number;
  maxRetries: number;
}

export interface SyncConfig {
  defaultInterval: number;
  maxConcurrentSyncs: number;
  retryDelay: number;
  maxRetries: number;
  enableLogging: boolean;
}

class BackgroundSyncManager {
  private static instance: BackgroundSyncManager;
  private syncTasks: Map<string, SyncTask> = new Map();
  private syncIntervals: Map<string, NodeJS.Timeout> = new Map();
  private config: SyncConfig = {
    defaultInterval: 30000, // 30 seconds
    maxConcurrentSyncs: 3,
    retryDelay: 5000, // 5 seconds
    maxRetries: 3,
    enableLogging: true
  };

  private constructor() {
    this.initializeSyncManager();
  }

  static getInstance(): BackgroundSyncManager {
    if (!BackgroundSyncManager.instance) {
      BackgroundSyncManager.instance = new BackgroundSyncManager();
    }
    return BackgroundSyncManager.instance;
  }

  /**
   * 🔄 REGISTER SYNC TASK
   */
  registerSyncTask(
    componentId: string,
    userId: string,
    syncFunction: () => Promise<void>,
    interval?: number
  ): string {
    const taskId = `${componentId}-${userId}`;
    
    const task: SyncTask = {
      id: taskId,
      componentId,
      userId,
      syncFunction,
      interval: interval || this.config.defaultInterval,
      lastSync: null,
      isRunning: false,
      errorCount: 0,
      maxRetries: this.config.maxRetries
    };

    this.syncTasks.set(taskId, task);
    
    if (this.config.enableLogging) {
      log.debug('BackgroundSync', `🔄 [BackgroundSyncManager] Registered sync task: ${taskId}`);
    }

    return taskId;
  }

  /**
   * ▶️ START SYNC TASK
   */
  startSyncTask(taskId: string): void {
    const task = this.syncTasks.get(taskId);
    if (!task) {
      log.warn('BackgroundSync', `⚠️ [BackgroundSyncManager] Task not found: ${taskId}`);
      return;
    }

    if (task.isRunning) {
      if (this.config.enableLogging) {
        log.debug('BackgroundSync', `🔄 [BackgroundSyncManager] Task already running: ${taskId}`);
      }
      return;
    }

    task.isRunning = true;
    
    const executeSync = async () => {
      try {
        if (this.config.enableLogging) {
          log.debug('BackgroundSync', `🔄 [BackgroundSyncManager] Executing sync: ${taskId}`);
        }

        await task.syncFunction();
        task.lastSync = Date.now();
        task.errorCount = 0;

        if (this.config.enableLogging) {
          log.debug('BackgroundSync', `✅ [BackgroundSyncManager] Sync completed: ${taskId}`);
        }
      } catch (error) {
        task.errorCount++;
        
        log.error('BackgroundSync', `🚨 [BackgroundSyncManager] Sync failed: ${taskId}`, error);
        
        if (task.errorCount >= task.maxRetries) {
          log.error('BackgroundSync', `🚨 [BackgroundSyncManager] Max retries reached for: ${taskId}`);
          this.stopSyncTask(taskId);
          return;
        }

        // Retry with exponential backoff
        const retryDelay = this.config.retryDelay * Math.pow(2, task.errorCount - 1);
        setTimeout(() => {
          if (task.isRunning) {
            executeSync();
          }
        }, retryDelay);
      }
    };

    // Execute initial sync
    executeSync();

    // Set up interval
    const interval = setInterval(executeSync, task.interval);
    this.syncIntervals.set(taskId, interval);

    if (this.config.enableLogging) {
      log.debug('BackgroundSync', `▶️ [BackgroundSyncManager] Started sync task: ${taskId}`);
    }
  }

  /**
   * ⏹️ STOP SYNC TASK
   */
  stopSyncTask(taskId: string): void {
    const task = this.syncTasks.get(taskId);
    if (!task) {
      return;
    }

    task.isRunning = false;
    
    const interval = this.syncIntervals.get(taskId);
    if (interval) {
      clearInterval(interval);
      this.syncIntervals.delete(taskId);
    }

    if (this.config.enableLogging) {
      log.debug('BackgroundSync', `⏹️ [BackgroundSyncManager] Stopped sync task: ${taskId}`);
    }
  }

  /**
   * 🗑️ REMOVE SYNC TASK
   */
  removeSyncTask(taskId: string): void {
    this.stopSyncTask(taskId);
    this.syncTasks.delete(taskId);
    
    if (this.config.enableLogging) {
      log.debug('BackgroundSync', `🗑️ [BackgroundSyncManager] Removed sync task: ${taskId}`);
    }
  }

  /**
   * 📊 GET SYNC STATUS
   */
  getSyncStatus(taskId: string): {
    isRunning: boolean;
    lastSync: number | null;
    errorCount: number;
    nextSync: number | null;
  } | null {
    const task = this.syncTasks.get(taskId);
    if (!task) {
      return null;
    }

    const nextSync = task.lastSync ? task.lastSync + task.interval : null;

    return {
      isRunning: task.isRunning,
      lastSync: task.lastSync,
      errorCount: task.errorCount,
      nextSync
    };
  }

  /**
   * 📈 GET ALL SYNC STATUS
   */
  getAllSyncStatus(): Array<{
    taskId: string;
    componentId: string;
    userId: string;
    isRunning: boolean;
    lastSync: number | null;
    errorCount: number;
    nextSync: number | null;
  }> {
    return Array.from(this.syncTasks.values()).map(task => ({
      taskId: task.id,
      componentId: task.componentId,
      userId: task.userId,
      isRunning: task.isRunning,
      lastSync: task.lastSync,
      errorCount: task.errorCount,
      nextSync: task.lastSync ? task.lastSync + task.interval : null
    }));
  }

  /**
   * 🔧 UPDATE CONFIG
   */
  updateConfig(newConfig: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.config.enableLogging) {
      log.debug('BackgroundSync', '🔧 [BackgroundSyncManager] Updated config:', newConfig);
    }
  }

  /**
   * 🧹 CLEANUP
   */
  cleanup(): void {
    // Stop all sync tasks
    for (const taskId of this.syncTasks.keys()) {
      this.stopSyncTask(taskId);
    }
    
    // Clear all tasks
    this.syncTasks.clear();
    
    if (this.config.enableLogging) {
      log.debug('BackgroundSync', '🧹 [BackgroundSyncManager] Cleaned up all sync tasks');
    }
  }

  /**
   * 🚀 INITIALIZE SYNC MANAGER
   */
  private initializeSyncManager(): void {
    // Cleanup on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.cleanup();
      });
    }

    if (this.config.enableLogging) {
      log.debug('BackgroundSync', '🚀 [BackgroundSyncManager] Initialized');
    }
  }
}

// Export singleton instance
export const backgroundSyncManager = BackgroundSyncManager.getInstance();

// Export types
export type { SyncTask, SyncConfig };
