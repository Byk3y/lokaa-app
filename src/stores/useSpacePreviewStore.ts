import { create } from 'zustand';

interface SpacePreviewStore {
  isOpen: boolean;
  spaceId: string | null;
  open: (spaceId: string) => void;
  close: () => void;
}

export const useSpacePreviewStore = create<SpacePreviewStore>((set) => ({
  isOpen: false,
  spaceId: null,
  open: (spaceId) => set({ isOpen: true, spaceId }),
  close: () => set({ isOpen: false })
})); 