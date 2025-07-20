import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface UseSearchURLSyncReturn {
  query: string;
  setQuery: (query: string) => void;
  syncToURL: (query: string) => void;
}

export function useSearchURLSync(
  spaceId: string | null,
  enabled: boolean = true
): UseSearchURLSyncReturn {
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQueryState] = useState('');

  // Extract search query from URL
  const getSearchQueryFromURL = useCallback(() => {
    if (!enabled) return '';
    
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get('q') || '';
  }, [location.search, enabled]);

  // Update URL with search query
  const updateURL = useCallback((searchQuery: string) => {
    if (!enabled) return;
    
    const searchParams = new URLSearchParams(location.search);
    
    if (searchQuery.trim()) {
      searchParams.set('q', searchQuery.trim());
    } else {
      searchParams.delete('q');
    }
    
    const newSearch = searchParams.toString();
    const newURL = `${location.pathname}${newSearch ? `?${newSearch}` : ''}`;
    
    if (newURL !== location.pathname + location.search) {
      navigate(newURL, { replace: true });
    }
  }, [location.pathname, location.search, navigate, enabled]);

  // Sync URL query to local state when URL changes
  useEffect(() => {
    const urlQuery = getSearchQueryFromURL();
    if (urlQuery !== query) {
      setQueryState(urlQuery);
    }
  }, [getSearchQueryFromURL, query]);

  // Set query and sync to URL
  const setQuery = useCallback((newQuery: string) => {
    setQueryState(newQuery);
    updateURL(newQuery);
  }, [updateURL]);

  // Sync query to URL without changing local state
  const syncToURL = useCallback((searchQuery: string) => {
    updateURL(searchQuery);
  }, [updateURL]);

  return {
    query,
    setQuery,
    syncToURL
  };
} 