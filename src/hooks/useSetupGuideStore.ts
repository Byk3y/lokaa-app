import { create } from 'zustand';

interface SetupGuideState {
  // Map of spaceId -> collapsed state
  collapsedStates: Map<string, boolean>;
  
  // Actions
  setCollapsed: (spaceId: string, collapsed: boolean) => void;
  isCollapsed: (spaceId: string) => boolean;
}

const useSetupGuideStore = create<SetupGuideState>((set, get) => ({
  collapsedStates: new Map(),
  
  setCollapsed: (spaceId, collapsed) => {
    const { collapsedStates } = get();
    const newMap = new Map(collapsedStates);
    newMap.set(spaceId, collapsed);
    
    set({ collapsedStates: newMap });
    
    console.log(`🔧 Setup guide ${collapsed ? 'collapsed' : 'expanded'} for space ${spaceId}`);
  },
  
  isCollapsed: (spaceId) => {
    const { collapsedStates } = get();
    // Default to false (expanded) if not set
    return collapsedStates.get(spaceId) ?? false;
  },
}));

export default useSetupGuideStore; 