/**
 * useSpaces Hook
 * 
 * This hook provides access to spaces data and operations.
 * It will be fully implemented during the state management migration.
 */

import { useEffect } from 'react';
import { useSpaceStore } from '../store/spaces-store';
import type { Space } from '../types';

interface UseSpacesReturn {
  // State
  spaces: Space[];
  currentSpace: Space | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchSpaces: () => Promise<void>;
  setCurrentSpace: (spaceId: string | null) => void;
}

/**
 * FIXED: Converted to const export for React Fast Refresh compatibility
 */
export const useSpaces = (): UseSpacesReturn => {
  // Select state and actions from the store
  const spaces = useSpaceStore(state => state.spaces);
  const currentSpace = useSpaceStore(state => state.currentSpace);
  const isLoading = useSpaceStore(state => state.isLoading);
  const error = useSpaceStore(state => state.error);
  const fetchSpaces = useSpaceStore(state => state.fetchSpaces);
  const setCurrentSpace = useSpaceStore(state => state.setCurrentSpace);
  
  // Fetch spaces on mount (can be disabled or made conditional)
  useEffect(() => {
    fetchSpaces();
    // This effect should only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  return {
    // State
    spaces,
    currentSpace,
    isLoading,
    error,
    
    // Actions
    fetchSpaces,
    setCurrentSpace,
  };
} 