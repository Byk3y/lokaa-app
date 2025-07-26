/**
 * usePersistentTabs Hook
 * 
 * Provides tab state management that completely bypasses React Router
 * for tab switching, preventing any component remounting or re-rendering.
 */

import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { persistentTabManager, type PersistentTab } from '@/services/PersistentTabManager';
import { log } from '@/utils/logger';

interface UsePersistentTabsReturn {
  currentTab: PersistentTab;
  switchTab: (tab: PersistentTab) => void;
  isTabActive: (tab: PersistentTab) => boolean;
  subdomain: string;
}

export function usePersistentTabs(subdomain?: string): UsePersistentTabsReturn {
  const location = useLocation();
  const [currentTab, setCurrentTab] = useState<PersistentTab>(
    () => persistentTabManager.getCurrentTab()
  );

  // Initialize tab manager on first render
  useEffect(() => {
    if (subdomain) {
      // Extract initial tab from URL
      const urlTab = extractTabFromLocation(location.pathname);
      persistentTabManager.initialize(subdomain, urlTab);
      setCurrentTab(persistentTabManager.getCurrentTab());
    }
  }, [subdomain, location.pathname]);

  // Subscribe to tab change events
  useEffect(() => {
    const unsubscribe = persistentTabManager.subscribe((event) => {
      setCurrentTab(event.tab);
      log.debug('Component', '🔄 [usePersistentTabs] Tab changed', event);
    });

    return unsubscribe;
  }, []);

  // Sync with URL changes (for browser back/forward)
  useEffect(() => {
    persistentTabManager.syncWithURL(location.pathname);
  }, [location.pathname]);

  const switchTab = useCallback((tab: PersistentTab) => {
    persistentTabManager.switchTab(tab, 'user');
  }, []);

  const isTabActive = useCallback((tab: PersistentTab) => {
    return persistentTabManager.isTabActive(tab);
  }, []);

  return {
    currentTab,
    switchTab,
    isTabActive,
    subdomain: persistentTabManager.getSubdomain(),
  };
}

/**
 * Helper function to extract tab from location pathname
 */
function extractTabFromLocation(pathname: string): PersistentTab {
  const match = pathname.match(/^\/[^\/]+\/space(?:\/([^\/]+))?/);
  if (!match) return 'feed';
  
  const tabSegment = match[1];
  if (!tabSegment) return 'feed';
  
  const validTabs: PersistentTab[] = ['feed', 'classroom', 'calendar', 'members', 'leaderboard', 'about'];
  return validTabs.includes(tabSegment as PersistentTab) ? tabSegment as PersistentTab : 'feed';
}

export default usePersistentTabs;