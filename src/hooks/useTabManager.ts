import { log } from '@/utils/logger';
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

// Singleton pattern to prevent multiple useTabManager instances for same space
const activeTabManagerInstances = new Map<string, boolean>();

/**
 * useTabManager - Manages tab component creation and lifecycle
 * 
 * Replaces complex tab management logic from SpaceTabContent.tsx
 * Provides clean interface for tab component management with persistence
 */
export function useTabManager(dependencies: TabDependencies): TabManagerResult {
  // 🚀 FIXED: Extract and stabilize individual dependency properties to prevent tab recreation
  const userId = dependencies.user?.id;
  const subdomain = dependencies.subdomain;
  const hasInstantAccess = dependencies.hasInstantAccess;
  const postInputRef = dependencies.postInputRef;
  
  // Memoize permissions to prevent recreation when object reference changes
  const permissions = useMemo(() => ({
    isOwner: dependencies.permissions.isOwner,
    isAdmin: dependencies.permissions.isAdmin,
  }), [dependencies.permissions.isOwner, dependencies.permissions.isAdmin]);
  
  // Memoize space data to prevent recreation when object reference changes
  const spaceData = useMemo(() => dependencies.spaceData, [
    dependencies.spaceData?.id,
    dependencies.spaceData?.name,
    dependencies.spaceData?.subdomain,
  ]);
  
  // Create stable dependencies object
  const stableDependencies = useMemo(() => ({
    user: dependencies.user,
    permissions,
    spaceData,
    subdomain,
    hasInstantAccess,
    postInputRef,
  }), [dependencies.user, permissions, spaceData, subdomain, hasInstantAccess, postInputRef]);
  
  // Core state
  const [visitedTabs, setVisitedTabs] = useState<Set<SpaceTab>>(new Set()); // Start empty, add tabs as they're visited
  const [tabComponents, setTabComponents] = useState<Partial<Record<SpaceTab, JSX.Element | null>>>({});
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
      log.debug('Hook', `🔧 [useTabManager] Tab ${tabKey} - Created: ${result.created}, Cached: ${result.cached}, Stats:`, stats);
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
    
    // Clear from local ref and state
    delete tabComponentsRef.current[tabKey];
    setTabComponents(prev => {
      const newState = {...prev};
      delete newState[tabKey];
      return newState;
    });
    
    // Clear from global manager if we have user and subdomain
    if (userId && subdomain) {
      globalTabComponentManager.clearSpaceComponents(subdomain, userId);
    }
  }, [userId, subdomain]);

  // Clear all tabs
  const clearTabs = useCallback(() => {
    setVisitedTabs(new Set());
    tabComponentsRef.current = {} as Partial<Record<SpaceTab, JSX.Element | null>>;
    setTabComponents({});
    
    if (userId && subdomain) {
      globalTabComponentManager.clearSpaceComponents(subdomain, userId);
    }
  }, [userId, subdomain]);

  // Check if tab is visited
  const hasTab = useCallback((tabKey: SpaceTab): boolean => {
    return visitedTabs.has(tabKey);
  }, [visitedTabs]);

  // Helper function to update both ref and state
  const updateTabComponent = useCallback((tabKey: SpaceTab, component: JSX.Element | null) => {
    tabComponentsRef.current[tabKey] = component;
    setTabComponents(prev => ({
      ...prev,
      [tabKey]: component
    }));
    
    if (process.env.NODE_ENV === 'development') {
      log.debug('Hook', `🔧 [useTabManager] Updated tab component state for ${tabKey}`);
    }
  }, []);

  // 🚀 FIXED: Get tab component with global cache check first
  const getTabComponent = useCallback((tabKey: SpaceTab): JSX.Element | null => {
    // Check if already exists in local ref
    if (tabComponentsRef.current[tabKey]) {
      if (process.env.NODE_ENV === 'development') {
        log.debug('Hook', `🔧 [useTabManager] Using LOCAL ref for ${tabKey}`);
      }
      return tabComponentsRef.current[tabKey];
    }

    // CRITICAL FIX: Check global cache BEFORE creating new component
    if (userId && subdomain) {
      const cachedComponent = globalTabComponentManager.getTabComponent(subdomain, tabKey, userId);
      if (cachedComponent) {
        if (process.env.NODE_ENV === 'development') {
          log.debug('Hook', `🔧 [useTabManager] Using GLOBAL cache for ${tabKey}`);
        }
        // Store in local ref and update state for rendering
        updateTabComponent(tabKey, cachedComponent);
        // Update stats to reflect cache hit
        updateStats(tabKey, { component: cachedComponent, cached: true, created: false });
        
        // Emit cache event for TabVisibilityContext
        if (spaceData?.id) {
          window.dispatchEvent(new CustomEvent('tabCacheEvent', {
            detail: { tabKey, spaceId: spaceData.id, cached: true }
          }));
        }
        
        return cachedComponent;
      }
    }

    // Only create new component if not found in local ref OR global cache
    if (process.env.NODE_ENV === 'development') {
      log.debug('Hook', `🔧 [useTabManager] Creating NEW component for ${tabKey} (not in cache)`);
    }
    const result = TabManagerService.createTabComponent(tabKey, stableDependencies);
    updateStats(tabKey, result);

    if (result.component) {
      // Store in local ref and update state for rendering
      updateTabComponent(tabKey, result.component);
      return result.component;
    }

    return null;
  }, [stableDependencies, updateStats, userId, subdomain, updateTabComponent]); // Add userId and subdomain for cache checks

  // Refresh a specific tab component
  const refreshTab = useCallback((tabKey: SpaceTab): boolean => {
    // Clear from local ref and state
    delete tabComponentsRef.current[tabKey];
    setTabComponents(prev => {
      const newState = {...prev};
      delete newState[tabKey];
      return newState;
    });
    
    // Clear from global manager
    if (userId && subdomain) {
      globalTabComponentManager.clearSpaceComponents(subdomain, userId);
    }

    // Recreate if still visited
    if (visitedTabs.has(tabKey)) {
      const component = getTabComponent(tabKey);
      return !!component;
    }

    return false;
  }, [visitedTabs, getTabComponent, userId, subdomain]);

  // Refresh all visited tabs
  const refreshAllTabs = useCallback(() => {
    const tabs = Array.from(visitedTabs);
    tabComponentsRef.current = {} as Partial<Record<SpaceTab, JSX.Element | null>>;
    setTabComponents({});
    
    if (userId && subdomain) {
      globalTabComponentManager.clearSpaceComponents(subdomain, userId);
    }

    // Recreate all visited tabs
    tabs.forEach(tabKey => {
      getTabComponent(tabKey);
    });
  }, [visitedTabs, getTabComponent, userId, subdomain]);

  // 🚀 FIXED: Auto-create components for visited tabs with stable dependencies
  useEffect(() => {
    if (!userId || !subdomain) return;

    // 🔧 HOOK DEDUPLICATION: Prevent multiple tab managers for same space
    const managerKey = `tabManager_${subdomain}_${userId}`;
    const currentlyActive = activeTabManagerInstances.get(managerKey);
    
    if (currentlyActive && visitedTabs.size === 0) {
      if (!globalConsoleFlags?.QUIET_MODE) {
        log.debug('Hook', `🔧 [useTabManager] Instance already active for ${subdomain}, skipping tab creation`);
      }
      return;
    }
    
    // Mark this tab manager instance as active
    activeTabManagerInstances.set(managerKey, true);

    const debugInfo = {
      visitedTabsCount: visitedTabs.size,
      existingComponentsCount: Object.keys(tabComponentsRef.current).length,
      visitedTabs: Array.from(visitedTabs),
      existingComponents: Object.keys(tabComponentsRef.current),
      needsUpdate: visitedTabs.size > Object.keys(tabComponentsRef.current).length
    };

    if (!globalConsoleFlags?.QUIET_MODE) {
      log.debug('Hook', '🔧 [useTabManager] Tab creation effect:', debugInfo);
    }
    
    visitedTabs.forEach(tabKey => {
      // Skip if component already exists in local ref
      if (tabComponentsRef.current[tabKey]) {
        if (!globalConsoleFlags?.QUIET_MODE) {
          log.debug('Hook', `🔧 [useTabManager] Skipping ${tabKey} - already exists locally`);
        }
        return;
      }
      
      // Get or create component
      const component = getTabComponent(tabKey);
      if (component) {
        if (!globalConsoleFlags?.QUIET_MODE) {
          log.debug('Hook', `✅ [useTabManager] Successfully created/retrieved ${tabKey} component`);
        }
      }
    });
    
    if (!globalConsoleFlags?.QUIET_MODE) {
      log.debug('Hook', '🔧 [useTabManager] Tab creation effect completed:', {
        totalComponents: Object.keys(tabComponentsRef.current).length,
        componentKeys: Object.keys(tabComponentsRef.current)
      });
    }
  }, [visitedTabs, userId, subdomain, getTabComponent]); // 🚀 FIXED: Use individual stable properties

  // Feed tab is always available (initialized in useState above)
  // No need for additional effect since feed is included in initial state

  // Cleanup global components when user navigates away from space
  useEffect(() => {
    return () => {
      if (userId && subdomain) {
        // Clean up tab manager instance tracking
        const managerKey = `tabManager_${subdomain}_${userId}`;
        activeTabManagerInstances.delete(managerKey);
        
        // Don't clear immediately - let them persist for quick return
        setTimeout(() => {
          // Only clear if user hasn't returned to this space within 30 seconds
          if (window.location.pathname.includes(`/${subdomain}/space`)) {
            return; // User is still in this space, don't clear
          }
          globalTabComponentManager.clearSpaceComponents(subdomain, userId);
        }, 30000); // 30 second grace period
      }
    };
  }, [subdomain, userId]); // 🚀 FIXED: Use individual stable properties


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