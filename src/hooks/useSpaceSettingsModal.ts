import { create } from 'zustand';

interface SpaceSettingsModalStore {
  isOpen: boolean;
  spaceId: string | null;
  subdomain: string | null;
  open: (spaceId: string, subdomain: string) => void;
  close: () => void;
}

const useSpaceSettingsModal = create<SpaceSettingsModalStore>((set) => ({
  isOpen: false,
  spaceId: null,
  subdomain: null,
  open: (spaceId: string, subdomain: string) => set({ isOpen: true, spaceId, subdomain }),
  close: () => set({ isOpen: false }),
}));

export default useSpaceSettingsModal; 