import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { log } from '@/utils/logger';

/**
 * Hook to manage search URL parameters following Skool pattern
 * Handles URL synchronization with search state
 */
export function useSearchUrl() {
  const location = useLocation();
  const navigate = useNavigate();

  /**
   * Get search query from URL parameters
   */
  const getSearchQueryFromUrl = useCallback((): string => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get('q') || '';
  }, [location.search]);

  /**
   * Update URL with search query
   */
  const updateSearchUrl = useCallback((query: string, subdomain?: string) => {
    const currentPath = location.pathname;
    const searchParams = new URLSearchParams(location.search);
    
    if (query.trim()) {
      // Set search query parameter
      searchParams.set('q', query.trim());
      
      // Navigate to search route if not already there
      let targetPath = currentPath;
      if (!currentPath.includes('/search')) {
        // Construct search URL: /:subdomain/space/search
        if (subdomain) {
          targetPath = `/${subdomain}/space/search`;
        } else {
          // Extract subdomain from current path
          const pathParts = currentPath.split('/');
          const currentSubdomain = pathParts[1];
          if (currentSubdomain && !currentSubdomain.includes('space')) {
            targetPath = `/${currentSubdomain}/space/search`;
          } else {
            targetPath = '/search';
          }
        }
      }
      
      const newUrl = `${targetPath}?${searchParams.toString()}`;
      log.debug('Hook', `[useSearchUrl] Updating search URL: ${newUrl}`);
      navigate(newUrl, { replace: true });
    } else {
      // Clear search - remove query parameter and go back to feed
      searchParams.delete('q');
      
      // Navigate back to feed if on search route
      if (currentPath.includes('/search')) {
        const pathParts = currentPath.split('/');
        const subdomain = pathParts[1];
        const newPath = `/${subdomain}/space`;
        const newUrl = searchParams.toString() ? `${newPath}?${searchParams.toString()}` : newPath;
        log.debug('Hook', `[useSearchUrl] Clearing search, navigating to: ${newUrl}`);
        navigate(newUrl, { replace: true });
      }
    }
  }, [location.pathname, location.search, navigate]);

  /**
   * Clear search URL parameters
   */
  const clearSearchUrl = useCallback(() => {
    const searchParams = new URLSearchParams(location.search);
    searchParams.delete('q');
    
    // Navigate back to feed if on search route
    if (location.pathname.includes('/search')) {
      const pathParts = location.pathname.split('/');
      const subdomain = pathParts[1];
      const newPath = `/${subdomain}/space`;
      const newUrl = searchParams.toString() ? `${newPath}?${searchParams.toString()}` : newPath;
      log.debug('Hook', `[useSearchUrl] Clearing search URL: ${newUrl}`);
      navigate(newUrl, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  /**
   * Check if current URL is a search URL
   */
  const isSearchUrl = useCallback((): boolean => {
    return location.pathname.includes('/search') || !!getSearchQueryFromUrl();
  }, [location.pathname, getSearchQueryFromUrl]);

  /**
   * Get the current search state from URL
   */
  const getSearchState = useCallback(() => {
    const query = getSearchQueryFromUrl();
    const isSearch = isSearchUrl();
    
    return {
      query,
      isSearch,
      searchUrl: isSearch ? location.pathname + location.search : null
    };
  }, [getSearchQueryFromUrl, isSearchUrl, location.pathname, location.search]);

  return {
    getSearchQueryFromUrl,
    updateSearchUrl,
    clearSearchUrl,
    isSearchUrl,
    getSearchState
  };
} 