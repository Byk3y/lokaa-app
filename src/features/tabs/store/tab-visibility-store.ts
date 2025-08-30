import { create } from 'zustand';
import { log } from '@/utils/logger';
import { SpaceTab } from '@/utils/tabUtils';

interface TabVisibilityState {
  // State maps to track tab states per space
  initializedTabs: Map<string, Set<SpaceTab>>;
  cachedTabs: Map<string, Set<SpaceTab>>;
  lastFetchTimes: Map<string, number>;
  
  // Actions
  isTabCached: (tabKey: SpaceTab, spaceId: string) => boolean;
  markTabAsInitialized: (tabKey: SpaceTab, spaceId: string) => void;
  isTabInitialized: (tabKey: SpaceTab, spaceId: string) => boolean;
  clearTabState: (tabKey: SpaceTab, spaceId: string) => void;
  clearAllTabStates: (spaceId: string) => void;
  updateLastFetchTime: (tabKey: SpaceTab, spaceId: string) => void;
  getLastFetchTime: (tabKey: SpaceTab, spaceId: string) => number;
  markTabAsCached: (tabKey: SpaceTab, spaceId: string) => void;
}

const getSpaceKey = (spaceId: string) => spaceId;

export const useTabVisibilityStore = create<TabVisibilityState>()((set, get) => ({
      // Initial state
      initializedTabs: new Map(),
      cachedTabs: new Map(),
      lastFetchTimes: new Map(),
      
      // Actions
      isTabCached: (tabKey: SpaceTab, spaceId: string) => {
        const state = get();
        const spaceKey = getSpaceKey(spaceId);
        const cachedTabs = state.cachedTabs.get(spaceKey);
        return cachedTabs?.has(tabKey) || false;
      },
      
      markTabAsInitialized: (tabKey: SpaceTab, spaceId: string) => {
        set((state) => {
          const spaceKey = getSpaceKey(spaceId);
          const newInitializedTabs = new Map(state.initializedTabs);
          const newCachedTabs = new Map(state.cachedTabs);
          
          // Mark as initialized
          if (!newInitializedTabs.has(spaceKey)) {
            newInitializedTabs.set(spaceKey, new Set());
          }
          newInitializedTabs.get(spaceKey)!.add(tabKey);
          
          // Remove from cached tabs since it's now initialized
          const cachedTabs = newCachedTabs.get(spaceKey);
          if (cachedTabs) {
            cachedTabs.delete(tabKey);
          }
          
          if (process.env.NODE_ENV === 'development') {
            log.debug('TabVisibilityStore', `🔧 Tab ${tabKey} marked as initialized for space ${spaceId}`);
          }
          
          return {
            ...state,
            initializedTabs: newInitializedTabs,
            cachedTabs: newCachedTabs,
          };
        });
      },
      
      isTabInitialized: (tabKey: SpaceTab, spaceId: string) => {
        const state = get();
        const spaceKey = getSpaceKey(spaceId);
        const initializedTabs = state.initializedTabs.get(spaceKey);
        return initializedTabs?.has(tabKey) || false;
      },
      
      clearTabState: (tabKey: SpaceTab, spaceId: string) => {
        set((state) => {
          const spaceKey = getSpaceKey(spaceId);
          const newInitializedTabs = new Map(state.initializedTabs);
          const newCachedTabs = new Map(state.cachedTabs);
          
          // Clear from initialized tabs
          const initializedTabs = newInitializedTabs.get(spaceKey);
          if (initializedTabs) {
            initializedTabs.delete(tabKey);
          }
          
          // Clear from cached tabs
          const cachedTabs = newCachedTabs.get(spaceKey);
          if (cachedTabs) {
            cachedTabs.delete(tabKey);
          }
          
          if (process.env.NODE_ENV === 'development') {
            log.debug('TabVisibilityStore', `🧹 Cleared state for tab ${tabKey} in space ${spaceId}`);
          }
          
          return {
            ...state,
            initializedTabs: newInitializedTabs,
            cachedTabs: newCachedTabs,
          };
        });
      },
      
      clearAllTabStates: (spaceId: string) => {
        set((state) => {
          const spaceKey = getSpaceKey(spaceId);
          const newInitializedTabs = new Map(state.initializedTabs);
          const newCachedTabs = new Map(state.cachedTabs);
          const newLastFetchTimes = new Map(state.lastFetchTimes);
          
          newInitializedTabs.delete(spaceKey);
          newCachedTabs.delete(spaceKey);
          newLastFetchTimes.delete(spaceKey);
          
          if (process.env.NODE_ENV === 'development') {
            log.debug('TabVisibilityStore', `🧹 Cleared all tab states for space ${spaceId}`);
          }
          
          return {
            ...state,
            initializedTabs: newInitializedTabs,
            cachedTabs: newCachedTabs,
            lastFetchTimes: newLastFetchTimes,
          };
        });
      },
      
      updateLastFetchTime: (tabKey: SpaceTab, spaceId: string) => {
        set((state) => {
          const spaceKey = getSpaceKey(spaceId);
          const newLastFetchTimes = new Map(state.lastFetchTimes);
          newLastFetchTimes.set(spaceKey, Date.now());
          
          if (process.env.NODE_ENV === 'development') {
            log.debug('TabVisibilityStore', `🕐 Updated last fetch time for ${tabKey} in space ${spaceId}`);
          }
          
          return {
            ...state,
            lastFetchTimes: newLastFetchTimes,
          };
        });
      },
      
      getLastFetchTime: (tabKey: SpaceTab, spaceId: string) => {
        const state = get();
        const spaceKey = getSpaceKey(spaceId);
        return state.lastFetchTimes.get(spaceKey) || 0;
      },
      
      markTabAsCached: (tabKey: SpaceTab, spaceId: string) => {
        set((state) => {
          const spaceKey = getSpaceKey(spaceId);
          const newCachedTabs = new Map(state.cachedTabs);
          
          if (!newCachedTabs.has(spaceKey)) {
            newCachedTabs.set(spaceKey, new Set());
          }
          newCachedTabs.get(spaceKey)!.add(tabKey);
          
          if (process.env.NODE_ENV === 'development') {
            log.debug('TabVisibilityStore', `🔧 Tab ${tabKey} marked as cached for space ${spaceId}`);
          }
          
          return {
            ...state,
            cachedTabs: newCachedTabs,
          };
        });
      },
    }));

// Setup global event listener for tab cache events (mimicking the useEffect from context)
if (typeof window !== 'undefined') {
  window.addEventListener('tabCacheEvent', (event: CustomEvent) => {
    const { tabKey, spaceId, cached } = event.detail;
    
    if (cached) {
      useTabVisibilityStore.getState().markTabAsCached(tabKey, spaceId);
    }
  });
}

// Convenience hook that matches the original useTabVisibility interface
export function useTabVisibilityHook() {
  const store = useTabVisibilityStore();
  
  return {
    isTabCached: store.isTabCached,
    markTabAsInitialized: store.markTabAsInitialized,
    isTabInitialized: store.isTabInitialized,
    clearTabState: store.clearTabState,
    clearAllTabStates: store.clearAllTabStates,
    updateLastFetchTime: store.updateLastFetchTime,
    getLastFetchTime: store.getLastFetchTime,
  };
}
