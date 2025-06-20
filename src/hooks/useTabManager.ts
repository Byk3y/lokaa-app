import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { type SpaceTab } from "@/utils/tabUtils";
import { TabManagerService, type TabDependencies, type TabCreationResult } from '@/services/TabManagerService';
import { globalTabComponentManager } from "@/utils/globalTabComponentManager";
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useSpacePermissions } from '@/hooks/useSpacePermissions';
import { globalConsoleFlags } from '@/utils/developmentLogger';

// Tab manager result interface
export interface TabManagerResult {
  tabComponents: Partial<Record<SpaceTab, JSX.Element | null>>;
  visitedTabs: Set<SpaceTab>;
  addTab: (tabKey: SpaceTab) => boolean;
  removeTab: (tabKey: SpaceTab) => void;
  clearTabs: () => void;
  hasTab: (tabKey: SpaceTab) => boolean;
  getTabComponent: (tabKey: SpaceTab) => JSX.Element | null;
  refreshTab: (tabKey: SpaceTab) => boolean;
  refreshAllTabs: () => void;
}

// Tab creation stats for debugging
interface TabStats {
  totalCreated: number;
  totalCached: number;
  totalFailed: number;
  creationsByTab: Record<SpaceTab, number>;
}

/**
 * useTabManager - Manages tab component creation and lifecycle
 * 
 * Replaces complex tab management logic from SpaceTabContent.tsx
 * Provides clean interface for tab component management with persistence
 */
export function useTabManager(dependencies: TabDependencies): TabManagerResult {
  const { user, subdomain } = dependencies;
  
  // Core state
  const [visitedTabs, setVisitedTabs] = useState<Set<SpaceTab>>(new Set(['feed'])); // Feed is always mounted
  const tabComponentsRef = useRef<Partial<Record<SpaceTab, JSX.Element | null>>>({});
  const statsRef = useRef<TabStats>({
    totalCreated: 0,
    totalCached: 0,
    totalFailed: 0,
    creationsByTab: {} as Record<SpaceTab, number>
  });

  // Track component creation for debugging
  const updateStats = useCallback((tabKey: SpaceTab, result: TabCreationResult) => {
    const stats = statsRef.current;
    
    if (result.created) {
      stats.totalCreated++;
      stats.creationsByTab[tabKey] = (stats.creationsByTab[tabKey] || 0) + 1;
    } else if (result.cached) {
      stats.totalCached++;
    } else {
      stats.totalFailed++;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`🔧 [useTabManager] Tab ${tabKey} - Created: ${result.created}, Cached: ${result.cached}, Stats:`, stats);
    }
  }, []);

  // Add tab to visited set
  const addTab = useCallback((tabKey: SpaceTab): boolean => {
    // Always allow adding tabs - validation will happen during component creation
    setVisitedTabs(prev => {
      if (prev.has(tabKey)) {
        return prev; // Already added, return same set to prevent unnecessary updates
      }
      return new Set([...prev, tabKey]);
    });
    return true;
  }, []); // No dependencies to keep function stable

  // Remove tab from visited set and clear component
  const removeTab = useCallback((tabKey: SpaceTab) => {
    setVisitedTabs(prev => {
      if (!prev.has(tabKey)) {
        return prev; // Tab not present, return same set to prevent unnecessary updates
      }
      const newSet = new Set(prev);
      newSet.delete(tabKey);
      return newSet;
    });
    
    // Clear from local ref
    delete tabComponentsRef.current[tabKey];
    
    // Clear from global manager if we have user and subdomain
    const currentUser = dependencies.user;
    const currentSubdomain = dependencies.subdomain;
    if (currentUser?.id && currentSubdomain) {
      globalTabComponentManager.clearSpaceComponents(currentSubdomain, currentUser.id);
    }
  }, []); // Removed dependencies - use current values from dependencies object

  // Clear all tabs except feed
  const clearTabs = useCallback(() => {
    setVisitedTabs(new Set(['feed']));
    tabComponentsRef.current = {} as Partial<Record<SpaceTab, JSX.Element | null>>;
    
    const currentUser = dependencies.user;
    const currentSubdomain = dependencies.subdomain;
    if (currentUser?.id && currentSubdomain) {
      globalTabComponentManager.clearSpaceComponents(currentSubdomain, currentUser.id);
    }
  }, []); // Removed dependencies - use current values from dependencies object

  // Check if tab is visited
  const hasTab = useCallback((tabKey: SpaceTab): boolean => {
    return visitedTabs.has(tabKey);
  }, [visitedTabs]);

  // Get tab component (create if needed)
  const getTabComponent = useCallback((tabKey: SpaceTab): JSX.Element | null => {
    // Check if already exists in local ref
    if (tabComponentsRef.current[tabKey]) {
      return tabComponentsRef.current[tabKey];
    }

    // Try to create component
    const result = TabManagerService.createTabComponent(tabKey, dependencies);
    updateStats(tabKey, result);

    if (result.component) {
      // Store in local ref
      tabComponentsRef.current[tabKey] = result.component;
      return result.component;
    }

    return null;
  }, [dependencies, updateStats]);

  // Refresh a specific tab component
  const refreshTab = useCallback((tabKey: SpaceTab): boolean => {
    // Clear from local ref
    delete tabComponentsRef.current[tabKey];
    
    // Clear from global manager
    const currentUser = dependencies.user;
    const currentSubdomain = dependencies.subdomain;
    if (currentUser?.id && currentSubdomain) {
      globalTabComponentManager.clearSpaceComponents(currentSubdomain, currentUser.id);
    }

    // Recreate if still visited
    if (visitedTabs.has(tabKey)) {
      const component = getTabComponent(tabKey);
      return !!component;
    }

    return false;
  }, [visitedTabs, getTabComponent]); // Reduced dependencies

  // Refresh all visited tabs
  const refreshAllTabs = useCallback(() => {
    const tabs = Array.from(visitedTabs);
    tabComponentsRef.current = {} as Partial<Record<SpaceTab, JSX.Element | null>>;
    
    const currentUser = dependencies.user;
    const currentSubdomain = dependencies.subdomain;
    if (currentUser?.id && currentSubdomain) {
      globalTabComponentManager.clearSpaceComponents(currentSubdomain, currentUser.id);
    }

    // Recreate all visited tabs
    tabs.forEach(tabKey => {
      getTabComponent(tabKey);
    });
  }, [visitedTabs, getTabComponent]); // Reduced dependencies

  // Auto-create components for visited tabs
  useEffect(() => {
    const currentUser = dependencies.user;
    const currentSubdomain = dependencies.subdomain;
    
    if (!currentUser?.id || !currentSubdomain) return;

    const debugInfo = {
      visitedTabsCount: visitedTabs.size,
      existingComponentsCount: Object.keys(tabComponentsRef.current).length,
      visitedTabs: Array.from(visitedTabs),
      existingComponents: Object.keys(tabComponentsRef.current),
      needsUpdate: visitedTabs.size > Object.keys(tabComponentsRef.current).length
    };

    if (!globalConsoleFlags?.DISABLE_TAB_DEBUG_LOGS) {
      console.log('🔧 [useTabManager] Tab creation effect:', debugInfo);
    }
    
    visitedTabs.forEach(tabKey => {
      // Skip if component already exists in local ref
      if (tabComponentsRef.current[tabKey]) {
        if (!globalConsoleFlags?.DISABLE_TAB_DEBUG_LOGS) {
          console.log(`🔧 [useTabManager] Skipping ${tabKey} - already exists locally`);
        }
        return;
      }
      
      // Get or create component
      const component = getTabComponent(tabKey);
      if (component) {
        if (!globalConsoleFlags?.DISABLE_TAB_DEBUG_LOGS) {
          console.log(`✅ [useTabManager] Successfully created/retrieved ${tabKey} component`);
        }
      }
    });
    
    if (!globalConsoleFlags?.DISABLE_TAB_DEBUG_LOGS) {
      console.log('🔧 [useTabManager] Tab creation effect completed:', {
        totalComponents: Object.keys(tabComponentsRef.current).length,
        componentKeys: Object.keys(tabComponentsRef.current)
      });
    }
  }, [visitedTabs, dependencies.user?.id, dependencies.subdomain, getTabComponent]); // Use specific dependencies properties

  // Feed tab is always available (initialized in useState above)
  // No need for additional effect since feed is included in initial state

  // Cleanup global components when user navigates away from space
  useEffect(() => {
    const currentUser = dependencies.user;
    const currentSubdomain = dependencies.subdomain;
    
    return () => {
      if (currentUser?.id && currentSubdomain) {
        // Don't clear immediately - let them persist for quick return
        setTimeout(() => {
          // Only clear if user hasn't returned to this space within 30 seconds
          if (window.location.pathname.includes(`/${currentSubdomain}/space`)) {
            return; // User is still in this space, don't clear
          }
          globalTabComponentManager.clearSpaceComponents(currentSubdomain, currentUser.id);
        }, 30000); // 30 second grace period
      }
    };
  }, [dependencies.subdomain, dependencies.user?.id]); // Only depend on the specific values we need

  // Get stable tab components reference
  const tabComponents = tabComponentsRef.current;

  return {
    tabComponents,
    visitedTabs,
    addTab,
    removeTab,
    clearTabs,
    hasTab,
    getTabComponent,
    refreshTab,
    refreshAllTabs,
  };
} 