import { create } from 'zustand';
import { devLogger } from '@/utils/developmentLogger';

interface SearchState {
  // Global search state
  globalSearchQuery: string;
  currentSpaceId: string | null;
  spaceSearchQuery: string;
  
  // Computed getters
  isSearchActive: boolean;
  
  // Actions
  setGlobalSearch: (query: string) => void;
  setSpaceSearch: (spaceId: string, query: string) => void;
  clearSearch: () => void;
  updateSpaceId: (spaceId: string | null) => void;
  
  // Internal state tracking
  lastSpaceId: string | null;
  lastQuery: string;
}

export const useSearchStore = create<SearchState>()((set, get) => ({
      // Initial state
      globalSearchQuery: '',
      currentSpaceId: null,
      spaceSearchQuery: '',
      isSearchActive: false,
      lastSpaceId: null,
      lastQuery: '',
      
      // Actions
      setGlobalSearch: (query: string) => {
        const state = get();
        devLogger.log('SearchStore', 'setGlobalSearch called:', { query, currentSpaceId: state.currentSpaceId });
        
        set((state) => {
          const trimmedQuery = query.trim();
          const newState = {
            ...state,
            globalSearchQuery: query,
            spaceSearchQuery: state.currentSpaceId ? query : state.spaceSearchQuery,
            lastQuery: query,
            isSearchActive: trimmedQuery.length > 0,
          };
          return newState;
        });
      },
      
      setSpaceSearch: (spaceId: string, query: string) => {
        devLogger.log('SearchStore', 'setSpaceSearch called:', { spaceId, query });
        
        set((state) => {
          const spaceIdChanged = spaceId !== state.lastSpaceId;
          const queryChanged = query !== state.lastQuery;
          
          if (spaceIdChanged) {
            devLogger.log('SearchStore', 'Space ID changed from:', state.lastSpaceId, 'to:', spaceId);
          }
          
          if (queryChanged) {
            devLogger.log('SearchStore', 'Query changed from:', state.lastQuery, 'to:', query);
          }
          
          return {
            ...state,
            currentSpaceId: spaceId,
            globalSearchQuery: query,
            spaceSearchQuery: query,
            lastSpaceId: spaceId,
            lastQuery: query,
            isSearchActive: query.trim().length > 0,
          };
        });
      },
      
      clearSearch: () => {
        devLogger.log('SearchStore', 'clearSearch called');
        set({
          globalSearchQuery: '',
          spaceSearchQuery: '',
          lastQuery: '',
          isSearchActive: false,
        });
      },
      
      updateSpaceId: (spaceId: string | null) => {
        set((state) => ({
          ...state,
          currentSpaceId: spaceId,
          lastSpaceId: spaceId,
        }));
      },
    }));

// Convenience hook that matches the original useSearch interface
export function useSearchHook() {
  const store = useSearchStore();
  
  return {
    globalSearchQuery: store.globalSearchQuery,
    isSearchActive: store.isSearchActive,
    currentSpaceId: store.currentSpaceId,
    spaceSearchQuery: store.spaceSearchQuery,
    setGlobalSearch: store.setGlobalSearch,
    setSpaceSearch: store.setSpaceSearch,
    updateSpaceId: store.updateSpaceId,
    clearSearch: store.clearSearch,
    // Note: searchIntegration will need to be handled separately in components
    // that need it, as Zustand stores should not directly use hooks
    searchIntegration: null,
  };
}
