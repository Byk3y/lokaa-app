/**
 * Spaces Store
 * 
 * This file defines the Zustand store for managing spaces state.
 * It will be implemented during the state management migration.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type Space, type SpaceState } from '../types';

/**
 * Define the spaces store actions
 */
interface SpaceActions {
  // Fetch spaces
  fetchSpaces: () => Promise<void>;
  
  // Set current space
  setCurrentSpace: (spaceId: string | null) => void;
  
  // Reset state
  reset: () => void;
}

/**
 * Combined store type
 */
export type SpaceStore = SpaceState & SpaceActions;

/**
 * Initial state
 */
const initialState: SpaceState = {
  spaces: [],
  currentSpace: null,
  isLoading: false,
  error: null,
};

/**
 * Create the spaces store
 * This is a template that will be fully implemented during migration
 */
export const useSpaceStore = create<SpaceStore>()(
  persist(
    (set, get) => ({
      // Initial state
      ...initialState,

      // Actions
      fetchSpaces: async () => {
        set({ isLoading: true, error: null });
        
        try {
          // This will be implemented during migration
          // const spaces = await spacesApi.getSpaces();
          const spaces: Space[] = []; // Placeholder
          
          set({ spaces, isLoading: false });
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Failed to fetch spaces' 
          });
        }
      },

      setCurrentSpace: (spaceId) => {
        if (!spaceId) {
          set({ currentSpace: null });
          return;
        }
        
        const { spaces } = get();
        const space = spaces.find(s => s.id === spaceId);
        
        if (space) {
          set({ currentSpace: space });
        }
      },

      reset: () => {
        set(initialState);
      }
    }),
    {
      name: 'spaces-storage',
      partialize: (state) => ({ 
        currentSpace: state.currentSpace,
        // Don't persist everything, just what's needed across sessions
      }),
    }
  )
); 