import { log } from '@/utils/logger';
import { create } from 'zustand';
import { shallow } from 'zustand/shallow';
import { useMemo } from 'react';
import { SetupProgressService, SetupProgressData, TaskProgress } from '@/services/setupProgressService';

type TaskType = 'invite' | 'description' | 'cover' | 'post';

interface SetupProgressState {
  // State
  progressBySpace: Record<string, SetupProgressData>;
  loading: Record<string, boolean>;
  error: Record<string, string | null>;
  migrationCompleted: Record<string, boolean>;
  // **CACHE FIX**: Add cache to prevent loading on every refresh
  cacheTimestamps: Record<string, number>;

  // Actions
  loadSetupProgress: (userId: string, spaceId: string) => Promise<void>;
  updateTaskCompletion: (userId: string, spaceId: string, taskType: TaskType, completed: boolean) => Promise<void>;
  dismissSetupGuide: (userId: string, spaceId: string) => Promise<void>;
  migrateFromLocalStorage: (userId: string, spaceId: string) => Promise<void>;
  
  // Getters
  getTaskCompletion: (spaceId: string, taskType: TaskType) => boolean;
  isSetupDismissed: (spaceId: string) => boolean;
  isSetupComplete: (spaceId: string) => boolean;
  getTaskCount: (spaceId: string) => { completed: number; total: number };
  
  // Utilities
  clearError: (spaceId: string) => void;
  reset: () => void;
}

const DEFAULT_PROGRESS: SetupProgressData = {
  tasks: {
    invite: false,
    description: false,
    cover: false,
    post: false
  },
  setupDismissed: false,
  lastUpdated: null
};

export const useSetupProgressStore = create<SetupProgressState>((set, get) => ({
  // Initial state
  progressBySpace: {},
  loading: {},
  error: {},
  migrationCompleted: {},
  cacheTimestamps: {},

  // Load setup progress for a specific space
  loadSetupProgress: async (userId: string, spaceId: string) => {
    const spaceKey = spaceId;
    const { cacheTimestamps, progressBySpace } = get();
    const now = Date.now();
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    
    // **CACHE FIX**: Check if we have recent cached data
    const lastCacheTime = cacheTimestamps[spaceKey];
    const hasRecentCache = lastCacheTime && (now - lastCacheTime) < CACHE_TTL;
    const hasCachedData = progressBySpace[spaceKey];
    
    if (hasRecentCache && hasCachedData) {
      // Use cached data, no loading state needed
      return;
    }
    
    // Set loading state only if no recent cache
    set((state) => ({
      loading: { ...state.loading, [spaceKey]: true },
      error: { ...state.error, [spaceKey]: null }
    }));

    try {
      // First, attempt migration if not already done
      const { migrationCompleted } = get();
      if (!migrationCompleted[spaceKey]) {
        await SetupProgressService.migrateFromLocalStorage(userId, spaceId);
        set((state) => ({
          migrationCompleted: { ...state.migrationCompleted, [spaceKey]: true }
        }));
      }

      // Load current progress from database
      const progress = await SetupProgressService.getSetupProgress(userId, spaceId);
      
      set((state) => ({
        progressBySpace: { ...state.progressBySpace, [spaceKey]: progress },
        loading: { ...state.loading, [spaceKey]: false },
        // **CACHE FIX**: Set cache timestamp
        cacheTimestamps: { ...state.cacheTimestamps, [spaceKey]: now }
      }));
    } catch (error) {
      log.error('Store', '[SetupProgressStore] Error loading setup progress:', error);
      set((state) => ({
        loading: { ...state.loading, [spaceKey]: false },
        error: { ...state.error, [spaceKey]: error instanceof Error ? error.message : 'Unknown error' },
        // Set default progress on error
        progressBySpace: { ...state.progressBySpace, [spaceKey]: DEFAULT_PROGRESS }
      }));
    }
  },

  // Update task completion status
  updateTaskCompletion: async (userId: string, spaceId: string, taskType: TaskType, completed: boolean) => {
    const spaceKey = spaceId;
    
    try {
      // Optimistically update the UI
      set((state) => {
        const currentProgress = state.progressBySpace[spaceKey] || DEFAULT_PROGRESS;
        return {
          progressBySpace: {
            ...state.progressBySpace,
            [spaceKey]: {
              ...currentProgress,
              tasks: {
                ...currentProgress.tasks,
                [taskType]: completed
              },
              lastUpdated: new Date().toISOString()
            }
          }
        };
      });

      // Update in database
      await SetupProgressService.updateTaskCompletion(userId, spaceId, taskType, completed);
      
      // Clear any previous errors
      set((state) => ({
        error: { ...state.error, [spaceKey]: null }
      }));
    } catch (error) {
      log.error('Store', '[SetupProgressStore] Error updating task completion:', error);
      
      // Revert optimistic update on error
      set((state) => {
        const currentProgress = state.progressBySpace[spaceKey] || DEFAULT_PROGRESS;
        return {
          progressBySpace: {
            ...state.progressBySpace,
            [spaceKey]: {
              ...currentProgress,
              tasks: {
                ...currentProgress.tasks,
                [taskType]: !completed // Revert
              }
            }
          },
          error: { ...state.error, [spaceKey]: error instanceof Error ? error.message : 'Unknown error' }
        };
      });
      throw error;
    }
  },

  // Dismiss setup guide
  dismissSetupGuide: async (userId: string, spaceId: string) => {
    const spaceKey = spaceId;
    
    try {
      // Optimistically update
      set((state) => {
        const currentProgress = state.progressBySpace[spaceKey] || DEFAULT_PROGRESS;
        return {
          progressBySpace: {
            ...state.progressBySpace,
            [spaceKey]: {
              ...currentProgress,
              setupDismissed: true,
              lastUpdated: new Date().toISOString()
            }
          }
        };
      });

      // Update in database
      await SetupProgressService.dismissSetupGuide(userId, spaceId);
      
      // Clear any previous errors
      set((state) => ({
        error: { ...state.error, [spaceKey]: null }
      }));
    } catch (error) {
      log.error('Store', 'Error dismissing setup guide:', error);
      
      // Revert optimistic update
      set((state) => {
        const currentProgress = state.progressBySpace[spaceKey] || DEFAULT_PROGRESS;
        return {
          progressBySpace: {
            ...state.progressBySpace,
            [spaceKey]: {
              ...currentProgress,
              setupDismissed: false
            }
          },
          error: { ...state.error, [spaceKey]: error instanceof Error ? error.message : 'Unknown error' }
        };
      });
      throw error;
    }
  },

  // Migrate from localStorage
  migrateFromLocalStorage: async (userId: string, spaceId: string) => {
    const spaceKey = spaceId;
    
    try {
      await SetupProgressService.migrateFromLocalStorage(userId, spaceId);
      set((state) => ({
        migrationCompleted: { ...state.migrationCompleted, [spaceKey]: true }
      }));
      
      // Reload progress after migration
      await get().loadSetupProgress(userId, spaceId);
    } catch (error) {
      log.error('Store', 'Error migrating from localStorage:', error);
      // Don't throw - migration should be non-blocking
      set((state) => ({
        migrationCompleted: { ...state.migrationCompleted, [spaceKey]: true }
      }));
    }
  },

  // Getter: Check if a specific task is completed
  getTaskCompletion: (spaceId: string, taskType: TaskType) => {
    const progress = get().progressBySpace[spaceId];
    return progress?.tasks[taskType] || false;
  },

  // Getter: Check if setup guide is dismissed
  isSetupDismissed: (spaceId: string) => {
    const progress = get().progressBySpace[spaceId];
    return progress?.setupDismissed || false;
  },

  // Getter: Check if all tasks are completed
  isSetupComplete: (spaceId: string) => {
    const progress = get().progressBySpace[spaceId];
    if (!progress) return false;
    
    return Object.values(progress.tasks).every(completed => completed);
  },

  // Getter: Get task completion count
  getTaskCount: (spaceId: string) => {
    const progress = get().progressBySpace[spaceId];
    if (!progress) return { completed: 0, total: 4 };
    
    const completed = Object.values(progress.tasks).filter(Boolean).length;
    return { completed, total: 4 };
  },

  // Clear error for a specific space
  clearError: (spaceId: string) => {
    set((state) => ({
      error: { ...state.error, [spaceId]: null }
    }));
  },

  // Reset entire store (useful for logout)
  reset: () => {
    set({
      progressBySpace: {},
      loading: {},
      error: {},
      migrationCompleted: {},
      cacheTimestamps: {}
    });
  }
}));

// Convenience hooks for common operations
export const useTaskCompletion = (spaceId: string, taskType: TaskType) => {
  return useSetupProgressStore((state) => state.getTaskCompletion(spaceId, taskType));
};

export const useSetupComplete = (spaceId: string) => {
  return useSetupProgressStore((state) => state.isSetupComplete(spaceId));
};

export const useSetupDismissed = (spaceId: string) => {
  return useSetupProgressStore((state) => state.isSetupDismissed(spaceId));
};

export const useTaskCount = (spaceId: string) => {
  return useSetupProgressStore((state) => state.getTaskCount(spaceId));
};

export const useSetupProgress = (spaceId: string) => {
  const progress = useSetupProgressStore((state) => state.progressBySpace[spaceId]);
  const loading = useSetupProgressStore((state) => state.loading[spaceId]);
  const error = useSetupProgressStore((state) => state.error[spaceId]);
  
  return useMemo(() => ({
    progress: progress || DEFAULT_PROGRESS,
    loading: loading || false,
    error: error || null
  }), [progress, loading, error]);
};