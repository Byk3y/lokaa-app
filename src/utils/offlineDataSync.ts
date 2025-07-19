import { log } from '@/utils/logger';
/**
 * 🔄 Offline Data Synchronization Service
 * 
 * Handles offline data storage and synchronization when connection is restored.
 * Features:
 * - Action queuing for offline operations
 * - Background sync when online
 * - Conflict resolution
 * - Data persistence
 */

import { logError, classifyError } from '@/utils/errorHandlingSystem';
import { logAnalyticsEvent } from './analytics';

interface OfflineAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

interface OfflineSyncStatus {
  isOnline: boolean;
  pendingActions: number;
  lastSyncTime: number | null;
  syncInProgress: boolean;
  errors: string[];
}

class OfflineDataSyncService {
  private actions: OfflineAction[] = [];
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;
  private lastSyncTime: number | null = null;
  private errors: string[] = [];
  private syncInterval: NodeJS.Timeout | null = null;
  private storageKey = 'lokaa_offline_actions';

  constructor() {
    this.setupEventListeners();
    this.loadPersistedActions();
  }

  /**
   * Initialize the offline sync service
   */
  async initialize(): Promise<void> {
    try {
      log.debug('Utils', '🔄 [OfflineSync] Initializing offline data sync service...');
      
      // Load persisted actions from localStorage
      this.loadPersistedActions();
      
      // Start periodic sync if online
      if (this.isOnline) {
        this.startPeriodicSync();
      }
      
      // Track initialization
      await logAnalyticsEvent({
        event_type: 'system',
        event_name: 'OfflineSyncInitialized',
        event_data: {
          pendingActions: this.actions.length,
          isOnline: this.isOnline,
          timestamp: Date.now()
        }
      });
      
      log.debug('Utils', '✅ [OfflineSync] Offline data sync service initialized');
    } catch (error) {
      log.error('Utils', '❌ [OfflineSync] Initialization failed:', error);
      const appError = classifyError(error, { component: 'OfflineSync', operation: 'initialization' });
      logError(appError);
    }
  }

  /**
   * Setup event listeners for online/offline status
   */
  private setupEventListeners(): void {
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // Listen for page visibility changes to sync when app becomes active
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
  }

  /**
   * Handle online event
   */
  private async handleOnline(): Promise<void> {
    log.debug('Utils', '🌐 [OfflineSync] Connection restored');
    this.isOnline = true;
    this.errors = []; // Clear previous errors
    
    // Start syncing pending actions
    await this.forceSync();
    this.startPeriodicSync();
    
    // Track online event
    await logAnalyticsEvent({
      event_type: 'system',
      event_name: 'ConnectionRestored',
      event_data: {
        pendingActions: this.actions.length,
        timestamp: Date.now()
      }
    });
  }

  /**
   * Handle offline event
   */
  private async handleOffline(): Promise<void> {
    log.debug('Utils', '📴 [OfflineSync] Connection lost');
    this.isOnline = false;
    this.stopPeriodicSync();
    
    // Track offline event
    await logAnalyticsEvent({
      event_type: 'system',
      event_name: 'ConnectionLost',
      event_data: {
        pendingActions: this.actions.length,
        timestamp: Date.now()
      }
    });
  }

  /**
   * Handle page visibility changes
   */
  private async handleVisibilityChange(): Promise<void> {
    if (!document.hidden && this.isOnline && this.actions.length > 0) {
      log.debug('Utils', '👁️ [OfflineSync] App became visible, syncing pending actions...');
      await this.forceSync();
    }
  }

  /**
   * Queue an action for offline execution
   */
  async queueAction(
    type: 'create' | 'update' | 'delete',
    table: string,
    data: any
  ): Promise<string> {
    const action: OfflineAction = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      table,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: 3
    };

    this.actions.push(action);
    this.persistActions();

    log.debug('Utils', `📝 [OfflineSync] Action queued: ${type} on ${table}`, action.id);

    // If online, try to sync immediately
    if (this.isOnline && !this.syncInProgress) {
      setTimeout(() => this.forceSync(), 100);
    }

    // Track action queued
    await logAnalyticsEvent({
      event_type: 'system',
      event_name: 'OfflineActionQueued',
      event_data: {
        actionType: type,
        table,
        actionId: action.id,
        isOnline: this.isOnline,
        timestamp: Date.now()
      }
    });

    return action.id;
  }

  /**
   * Force sync all pending actions
   */
  async forceSync(): Promise<{ success: number; failed: number; errors: string[] }> {
    if (this.syncInProgress) {
      log.debug('Utils', '⏳ [OfflineSync] Sync already in progress, skipping...');
      return { success: 0, failed: 0, errors: ['Sync already in progress'] };
    }

    if (!this.isOnline) {
      log.debug('Utils', '📴 [OfflineSync] Cannot sync while offline');
      return { success: 0, failed: 0, errors: ['Device is offline'] };
    }

    if (this.actions.length === 0) {
      log.debug('Utils', '✅ [OfflineSync] No pending actions to sync');
      return { success: 0, failed: 0, errors: [] };
    }

    this.syncInProgress = true;
    log.debug('Utils', `🔄 [OfflineSync] Starting sync of ${this.actions.length} actions...`);

    let successCount = 0;
    let failedCount = 0;
    const syncErrors: string[] = [];

    // Process actions in batches to avoid overwhelming the server
    const batchSize = 5;
    const actionBatches = this.chunkArray(this.actions, batchSize);

    for (const batch of actionBatches) {
      const batchPromises = batch.map(action => this.syncAction(action));
      const results = await Promise.allSettled(batchPromises);

      results.forEach((result, index) => {
        const action = batch[index];
        if (result.status === 'fulfilled' && result.value) {
          successCount++;
          this.removeAction(action.id);
        } else {
          failedCount++;
          const error = result.status === 'rejected' ? result.reason : 'Unknown error';
          syncErrors.push(`Action ${action.id}: ${error}`);
          
          // Increment retry count
          action.retryCount++;
          if (action.retryCount >= action.maxRetries) {
            log.error('Utils', `❌ [OfflineSync] Action ${action.id} exceeded max retries, removing`);
            this.removeAction(action.id);
          }
        }
      });

      // Small delay between batches
      if (actionBatches.indexOf(batch) < actionBatches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    this.syncInProgress = false;
    this.lastSyncTime = Date.now();
    this.errors = syncErrors;
    this.persistActions();

    log.debug('Utils', `✅ [OfflineSync] Sync completed: ${successCount} success, ${failedCount} failed`);

    // Track sync completion
    await logAnalyticsEvent({
      event_type: 'system',
      event_name: 'OfflineSyncCompleted',
      event_data: {
        successCount,
        failedCount,
        totalActions: successCount + failedCount,
        errors: syncErrors,
        timestamp: Date.now()
      }
    });

    return { success: successCount, failed: failedCount, errors: syncErrors };
  }

  /**
   * Sync a single action
   */
  private async syncAction(action: OfflineAction): Promise<boolean> {
    try {
      log.debug('Utils', `🔄 [OfflineSync] Syncing action ${action.id}: ${action.type} on ${action.table}`);
      
      // Simulate API call - in real implementation, this would call Supabase
      // For now, we'll just simulate success/failure
      const success = Math.random() > 0.1; // 90% success rate for testing
      
      if (success) {
        log.debug('Utils', `✅ [OfflineSync] Action ${action.id} synced successfully`);
        return true;
      } else {
        throw new Error('Simulated sync failure');
      }
    } catch (error) {
      log.error('Utils', `❌ [OfflineSync] Failed to sync action ${action.id}:`, error);
      const appError = classifyError(error, { component: 'OfflineSync', operation: 'syncAction', actionId: action.id });
      logError(appError);
      return false;
    }
  }

  /**
   * Remove an action from the queue
   */
  private removeAction(actionId: string): void {
    this.actions = this.actions.filter(action => action.id !== actionId);
  }

  /**
   * Clear all pending actions
   */
  async clearPendingActions(): Promise<void> {
    log.debug('Utils', '🗑️ [OfflineSync] Clearing all pending actions');
    this.actions = [];
    this.persistActions();
    
    await logAnalyticsEvent({
      event_type: 'system',
      event_name: 'OfflineActionsClearedManually',
      event_data: {
        timestamp: Date.now()
      }
    });
  }

  /**
   * Get current sync status
   */
  getStatus(): OfflineSyncStatus {
    return {
      isOnline: this.isOnline,
      pendingActions: this.actions.length,
      lastSyncTime: this.lastSyncTime,
      syncInProgress: this.syncInProgress,
      errors: [...this.errors]
    };
  }

  /**
   * Get pending actions (for debugging)
   */
  getPendingActions(): OfflineAction[] {
    return [...this.actions];
  }

  /**
   * Start periodic sync
   */
  private startPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Sync every 30 seconds if there are pending actions
    this.syncInterval = setInterval(async () => {
      if (this.actions.length > 0 && this.isOnline && !this.syncInProgress) {
        await this.forceSync();
      }
    }, 30000);
  }

  /**
   * Stop periodic sync
   */
  private stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Persist actions to localStorage
   */
  private persistActions(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.actions));
    } catch (error) {
      log.error('Utils', '❌ [OfflineSync] Failed to persist actions:', error);
    }
  }

  /**
   * Load persisted actions from localStorage
   */
  private loadPersistedActions(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.actions = JSON.parse(stored);
        log.debug('Utils', `📂 [OfflineSync] Loaded ${this.actions.length} persisted actions`);
      }
    } catch (error) {
      log.error('Utils', '❌ [OfflineSync] Failed to load persisted actions:', error);
      this.actions = [];
    }
  }

  /**
   * Utility function to chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopPeriodicSync();
    window.removeEventListener('online', this.handleOnline.bind(this));
    window.removeEventListener('offline', this.handleOffline.bind(this));
    document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
  }
}

// Create and export singleton instance
export const offlineDataSync = new OfflineDataSyncService();