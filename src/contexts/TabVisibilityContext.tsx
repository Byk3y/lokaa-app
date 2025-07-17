/**
 * 🚀 TAB VISIBILITY CONTEXT
 * 
 * Provides tab visibility state to hooks to prevent unnecessary re-initialization
 * when switching between cached tabs.
 * 
 * This context helps hooks distinguish between:
 * - True component mounting (first time creation)
 * - Tab visibility changes (cached component becoming active)
 */

import React, { createContext, useContext, useRef, useState, useCallback } from 'react';
import { SpaceTab } from '@/utils/tabUtils';

interface TabVisibilityState {
  isTabCached: (tabKey: SpaceTab, spaceId: string) => boolean;
  markTabAsInitialized: (tabKey: SpaceTab, spaceId: string) => void;
  isTabInitialized: (tabKey: SpaceTab, spaceId: string) => boolean;
  clearTabState: (tabKey: SpaceTab, spaceId: string) => void;
  clearAllTabStates: (spaceId: string) => void;
  updateLastFetchTime: (tabKey: SpaceTab, spaceId: string) => void;
  getLastFetchTime: (tabKey: SpaceTab, spaceId: string) => number;
}

const TabVisibilityContext = createContext<TabVisibilityState | null>(null);

export const useTabVisibility = () => {
  const context = useContext(TabVisibilityContext);
  if (!context) {
    throw new Error('useTabVisibility must be used within a TabVisibilityProvider');
  }
  return context;
};

interface TabVisibilityProviderProps {
  children: React.ReactNode;
}

export const TabVisibilityProvider: React.FC<TabVisibilityProviderProps> = ({ children }) => {
  // Track which tabs have been fully initialized per space
  const initializedTabsRef = useRef<Map<string, Set<SpaceTab>>>(new Map());
  
  // Track which tabs are currently cached (retrieved from global cache)
  const cachedTabsRef = useRef<Map<string, Set<SpaceTab>>>(new Map());
  
  // Track last fetch times for tabs to prevent "cache too old" issues
  const lastFetchTimesRef = useRef<Map<string, number>>(new Map());
  
  const getSpaceKey = (spaceId: string) => spaceId;
  
  const isTabCached = useCallback((tabKey: SpaceTab, spaceId: string) => {
    const spaceKey = getSpaceKey(spaceId);
    const cachedTabs = cachedTabsRef.current.get(spaceKey);
    return cachedTabs?.has(tabKey) || false;
  }, []);
  
  const markTabAsInitialized = useCallback((tabKey: SpaceTab, spaceId: string) => {
    const spaceKey = getSpaceKey(spaceId);
    
    // Mark as initialized
    if (!initializedTabsRef.current.has(spaceKey)) {
      initializedTabsRef.current.set(spaceKey, new Set());
    }
    initializedTabsRef.current.get(spaceKey)!.add(tabKey);
    
    // Remove from cached tabs since it's now initialized
    const cachedTabs = cachedTabsRef.current.get(spaceKey);
    if (cachedTabs) {
      cachedTabs.delete(tabKey);
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔧 [TabVisibility] Tab ${tabKey} marked as initialized for space ${spaceId}`);
    }
  }, []);
  
  const isTabInitialized = useCallback((tabKey: SpaceTab, spaceId: string) => {
    const spaceKey = getSpaceKey(spaceId);
    const initializedTabs = initializedTabsRef.current.get(spaceKey);
    return initializedTabs?.has(tabKey) || false;
  }, []);
  
  const clearTabState = useCallback((tabKey: SpaceTab, spaceId: string) => {
    const spaceKey = getSpaceKey(spaceId);
    
    // Clear from initialized tabs
    const initializedTabs = initializedTabsRef.current.get(spaceKey);
    if (initializedTabs) {
      initializedTabs.delete(tabKey);
    }
    
    // Clear from cached tabs
    const cachedTabs = cachedTabsRef.current.get(spaceKey);
    if (cachedTabs) {
      cachedTabs.delete(tabKey);
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🧹 [TabVisibility] Cleared state for tab ${tabKey} in space ${spaceId}`);
    }
  }, []);
  
  const clearAllTabStates = useCallback((spaceId: string) => {
    const spaceKey = getSpaceKey(spaceId);
    initializedTabsRef.current.delete(spaceKey);
    cachedTabsRef.current.delete(spaceKey);
    lastFetchTimesRef.current.delete(spaceKey);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🧹 [TabVisibility] Cleared all tab states for space ${spaceId}`);
    }
  }, []);
  
  const updateLastFetchTime = useCallback((tabKey: SpaceTab, spaceId: string) => {
    const spaceKey = getSpaceKey(spaceId);
    lastFetchTimesRef.current.set(spaceKey, Date.now());
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🕐 [TabVisibility] Updated last fetch time for ${tabKey} in space ${spaceId}`);
    }
  }, []);
  
  const getLastFetchTime = useCallback((tabKey: SpaceTab, spaceId: string) => {
    const spaceKey = getSpaceKey(spaceId);
    return lastFetchTimesRef.current.get(spaceKey) || 0;
  }, []);
  
  // Listen for tab cache events from useTabManager
  React.useEffect(() => {
    const handleTabCacheEvent = (event: CustomEvent) => {
      const { tabKey, spaceId, cached } = event.detail;
      
      if (cached) {
        const spaceKey = getSpaceKey(spaceId);
        if (!cachedTabsRef.current.has(spaceKey)) {
          cachedTabsRef.current.set(spaceKey, new Set());
        }
        cachedTabsRef.current.get(spaceKey)!.add(tabKey);
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔧 [TabVisibility] Tab ${tabKey} marked as cached for space ${spaceId}`);
        }
      }
    };
    
    window.addEventListener('tabCacheEvent', handleTabCacheEvent as EventListener);
    return () => {
      window.removeEventListener('tabCacheEvent', handleTabCacheEvent as EventListener);
    };
  }, []);
  
  const value: TabVisibilityState = {
    isTabCached,
    markTabAsInitialized,
    isTabInitialized,
    clearTabState,
    clearAllTabStates,
    updateLastFetchTime,
    getLastFetchTime,
  };
  
  return (
    <TabVisibilityContext.Provider value={value}>
      {children}
    </TabVisibilityContext.Provider>
  );
};