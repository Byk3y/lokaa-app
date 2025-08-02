import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useSearchIntegration } from '@/features/search';
import { devLogger } from '@/utils/developmentLogger';

interface SearchContextType {
  // Global search state
  globalSearchQuery: string;
  isSearchActive: boolean;
  
  // Current space search
  currentSpaceId: string | null;
  spaceSearchQuery: string;
  
  // Actions
  setGlobalSearch: (query: string) => void;
  setSpaceSearch: (spaceId: string, query: string) => void;
  clearSearch: () => void;
  
  // Search integration for current space
  searchIntegration: ReturnType<typeof useSearchIntegration> | null;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

interface SearchProviderProps {
  children: React.ReactNode;
}

export function SearchProvider({ children }: SearchProviderProps) {
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [currentSpaceId, setCurrentSpaceId] = useState<string | null>(null);
  const [spaceSearchQuery, setSpaceSearchQuery] = useState('');
  const lastSpaceIdRef = useRef<string | null>(null);
  const lastQueryRef = useRef<string>('');

  // Always call useSearchIntegration to avoid React hooks violation
  // Pass empty string if no spaceId, the hook will handle it gracefully
  const searchIntegration = useSearchIntegration({
    spaceId: currentSpaceId || ''
  });

  const setGlobalSearch = useCallback((query: string) => {
    devLogger.log('SearchContext', 'setGlobalSearch called:', { query, currentSpaceId });
    setGlobalSearchQuery(query);
    // If we're in a space, also set space search
    if (currentSpaceId && searchIntegration) {
      devLogger.log('SearchContext', 'Setting space search query:', query);
      setSpaceSearchQuery(query);
      // Trigger the search integration directly
      searchIntegration.setQuery(query);
    }
  }, [currentSpaceId, searchIntegration]);

  const setSpaceSearch = useCallback((spaceId: string, query: string) => {
    devLogger.log('SearchContext', 'setSpaceSearch called:', { spaceId, query });
    
    // Only update spaceId if it's actually different
    if (spaceId !== lastSpaceIdRef.current) {
      devLogger.log('SearchContext', 'Space ID changed from:', lastSpaceIdRef.current, 'to:', spaceId);
      setCurrentSpaceId(spaceId);
      lastSpaceIdRef.current = spaceId;
    }
    
    // Only update query if it's actually different to prevent unnecessary re-renders
    if (query !== lastQueryRef.current) {
      devLogger.log('SearchContext', 'Query changed from:', lastQueryRef.current, 'to:', query);
      setSpaceSearchQuery(query);
      setGlobalSearchQuery(query);
      lastQueryRef.current = query;
      
      // If we have a query and search integration, trigger it
      if (query.trim() && searchIntegration) {
        devLogger.log('SearchContext', 'Triggering search integration from setSpaceSearch');
        searchIntegration.setQuery(query);
      } else if (!query.trim() && searchIntegration && lastQueryRef.current.trim()) {
        // Only clear if we had a previous query (don't clear on initial load)
        devLogger.log('SearchContext', 'Clearing search from setSpaceSearch');
        searchIntegration.clearResults();
      }
    }
  }, [searchIntegration]);

  // Add debugging for search integration initialization
  useEffect(() => {
    devLogger.log('SearchContext', 'Search integration initialized:', { 
      spaceId: currentSpaceId, 
      hasIntegration: !!searchIntegration,
      integrationMethods: searchIntegration ? Object.keys(searchIntegration) : []
    });
  }, [currentSpaceId, searchIntegration]);

  // REMOVED: The problematic useEffect that was causing circular dependency
  // This useEffect was triggering search integration multiple times and causing state resets

  const clearSearch = useCallback(() => {
    devLogger.log('SearchContext', 'clearSearch called');
    setGlobalSearchQuery('');
    setSpaceSearchQuery('');
    lastQueryRef.current = '';
    if (searchIntegration) {
      searchIntegration.clearResults();
    }
  }, [searchIntegration]);

  const isSearchActive = globalSearchQuery.length > 0 || spaceSearchQuery.length > 0 || searchIntegration?.query.length > 0 || false;

  return (
    <SearchContext.Provider value={{
      globalSearchQuery,
      isSearchActive,
      currentSpaceId,
      spaceSearchQuery,
      setGlobalSearch,
      setSpaceSearch,
      clearSearch,
      searchIntegration: searchIntegration
    }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}