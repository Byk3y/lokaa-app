import { useEffect, useCallback, useRef } from 'react';
import { log } from '@/utils/logger';
/**
 * 🔄 Background Sync Hook
 * 
 * Phase 6B: React hook for managing background synchronization
 * with intelligent scheduling and error handling.
 */

import { backgroundSyncManager, SyncConfig } from '@/utils/backgroundSyncManager';

export interface UseBackgroundSyncOptions {
  enabled?: boolean;
  interval?: number;
  maxRetries?: number;
  retryDelay?: number;
  enableLogging?: boolean;
}

export interface UseBackgroundSyncReturn {
  isSyncing: boolean;
  lastSyncTime: number | null;
  errorCount: number;
  nextSyncTime: number | null;
  startSync: () => void;
  stopSync: () => void;
  syncNow: () => Promise<void>;
}

/**
 * 🔄 BACKGROUND SYNC HOOK
 * Manages background synchronization for components
 */
export function useBackgroundSync(
  componentId: string,
  userId: string,
  syncFunction: () => Promise<void>,
  options: UseBackgroundSyncOptions = {}
): UseBackgroundSyncReturn {
  const {
    enabled = true,
    interval = 30000, // 30 seconds
    maxRetries = 3,
    retryDelay = 5000,
    enableLogging = true
  } = options;

  const taskIdRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);

  // Register sync task
  useEffect(() => {
    if (!enabled) return;

    const taskId = backgroundSyncManager.registerSyncTask(
      componentId,
      userId,
      syncFunction,
      interval
    );
    
    taskIdRef.current = taskId;

    if (enableLogging) {
      log.debug('BackgroundSync', `🔄 [useBackgroundSync] Registered sync task: ${taskId}`);
    }

    return () => {
      if (taskIdRef.current) {
        backgroundSyncManager.removeSyncTask(taskIdRef.current);
        taskIdRef.current = null;
      }
    };
  }, [componentId, userId, interval, enabled, enableLogging]);

  // Start sync when enabled
  useEffect(() => {
    if (enabled && taskIdRef.current) {
      backgroundSyncManager.startSyncTask(taskIdRef.current);
    } else if (!enabled && taskIdRef.current) {
      backgroundSyncManager.stopSyncTask(taskIdRef.current);
    }
  }, [enabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (taskIdRef.current) {
        backgroundSyncManager.removeSyncTask(taskIdRef.current);
      }
    };
  }, []);

  // Start sync manually
  const startSync = useCallback(() => {
    if (taskIdRef.current) {
      backgroundSyncManager.startSyncTask(taskIdRef.current);
    }
  }, []);

  // Stop sync manually
  const stopSync = useCallback(() => {
    if (taskIdRef.current) {
      backgroundSyncManager.stopSyncTask(taskIdRef.current);
    }
  }, []);

  // Sync now (manual trigger)
  const syncNow = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      if (enableLogging) {
        log.debug('BackgroundSync', `🔄 [useBackgroundSync] Manual sync triggered: ${componentId}`);
      }
      
      await syncFunction();
      
      if (enableLogging) {
        log.debug('BackgroundSync', `✅ [useBackgroundSync] Manual sync completed: ${componentId}`);
      }
    } catch (error) {
      log.error('BackgroundSync', `🚨 [useBackgroundSync] Manual sync failed: ${componentId}`, error);
      throw error;
    }
  }, [componentId, syncFunction, enableLogging]);

  // Get current sync status
  const getSyncStatus = useCallback(() => {
    if (!taskIdRef.current) {
      return {
        isSyncing: false,
        lastSyncTime: null,
        errorCount: 0,
        nextSyncTime: null
      };
    }

    const status = backgroundSyncManager.getSyncStatus(taskIdRef.current);
    if (!status) {
      return {
        isSyncing: false,
        lastSyncTime: null,
        errorCount: 0,
        nextSyncTime: null
      };
    }

    return {
      isSyncing: status.isRunning,
      lastSyncTime: status.lastSync,
      errorCount: status.errorCount,
      nextSyncTime: status.nextSync
    };
  }, []);

  // Return current status (this would need to be updated with state if you want real-time updates)
  const status = getSyncStatus();

  return {
    isSyncing: status.isSyncing,
    lastSyncTime: status.lastSyncTime,
    errorCount: status.errorCount,
    nextSyncTime: status.nextSyncTime,
    startSync,
    stopSync,
    syncNow
  };
}

/**
 * 🔄 SIMPLE BACKGROUND SYNC HOOK
 * Simplified version for basic use cases
 */
export function useSimpleBackgroundSync(
  componentId: string,
  userId: string,
  syncFunction: () => Promise<void>,
  interval: number = 30000
): {
  isSyncing: boolean;
  lastSyncTime: number | null;
  syncNow: () => Promise<void>;
} {
  const sync = useBackgroundSync(componentId, userId, syncFunction, {
    enabled: true,
    interval,
    enableLogging: false
  });

  return {
    isSyncing: sync.isSyncing,
    lastSyncTime: sync.lastSyncTime,
    syncNow: sync.syncNow
  };
}

export default useBackgroundSync;
