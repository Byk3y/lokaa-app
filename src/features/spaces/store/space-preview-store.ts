/**
 * Space Preview Store
 * 
 * This store manages the state for the space preview modal.
 */

import { create } from 'zustand';

/**
 * State for the space preview
 */
interface SpacePreviewState {
  /** Whether the preview modal is open */
  isOpen: boolean;
  /** ID of the space being previewed */
  spaceId: string | null;
}

/**
 * Actions for the space preview store
 */
interface SpacePreviewActions {
  /** Open the preview modal for a specific space */
  open: (spaceId: string) => void;
  /** Close the preview modal */
  close: () => void;
}

/**
 * Combined store type
 */
export type SpacePreviewStore = SpacePreviewState & SpacePreviewActions;

/**
 * Initial state
 */
const initialState: SpacePreviewState = {
  isOpen: false,
  spaceId: null,
};

/**
 * Store for managing space preview modal state
 */
export const useSpacePreviewStore = create<SpacePreviewStore>((set) => ({
  // Initial state
  ...initialState,
  
  // Actions
  open: (spaceId) => set({ isOpen: true, spaceId }),
  close: () => set({ isOpen: false }),
})); 