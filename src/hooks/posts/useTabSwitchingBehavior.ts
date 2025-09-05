/**
 * 🎯 Tab Switching Behavior - Mobile Refresh & Tab Tracking
 * 
 * Extracted from useOptimizedCachedPosts.ts to handle mobile-specific
 * tab switching behavior with session storage persistence.
 */

import { useRef, useCallback, useEffect } from 'react';
import { devLogger } from '@/utils/developmentLogger';
import type { TabVisibilityState } from './postTypes';

/**
 * Enhanced mobile tab switching behavior hook
 * 
 * @param spaceId - Current space ID
 * @returns Tab switching behavior utilities
 */
export function useTabSwitchingBehavior(spaceId: string | undefined) {
  const tabVisibilityRef = useRef<Map<string, TabVisibilityState>>(new Map());
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Initialize tab visibility from persistent storage
  useEffect(() => {
    if (!spaceId) return;
    
    try {
      const storageKey = `tab_visibility_${spaceId}`;
      const stored = sessionStorage.getItem(storageKey);
      
      if (stored) {
        const parsedState = JSON.parse(stored);
        tabVisibilityRef.current.set(spaceId, {
          lastTabVisit: parsedState.lastTabVisit,
          isFirstVisit: false, // Not first visit if we have stored data
          refreshThreshold: parsedState.refreshThreshold || 60000
        });
        
        devLogger.log('TabSwitch', `Restored tab visibility state for space ${spaceId}`, {
          lastTabVisit: parsedState.lastTabVisit,
          timeSinceLastVisit: Date.now() - parsedState.lastTabVisit
        });
      }
    } catch (error) {
      devLogger.warn('TabSwitch', `Failed to restore tab visibility state for space ${spaceId}`, error);
    }
  }, [spaceId]);
  
  // Track when user visits the feed tab
  const trackTabVisit = useCallback((spaceId: string) => {
    const now = Date.now();
    const currentState = tabVisibilityRef.current.get(spaceId);
    
    const newState = {
      lastTabVisit: now,
      isFirstVisit: !currentState,
      refreshThreshold: 60000 // 60 seconds - refresh if last visit was longer ago
    };
    
    tabVisibilityRef.current.set(spaceId, newState);
    
    // Persist tab visibility state to sessionStorage
    try {
      const storageKey = `tab_visibility_${spaceId}`;
      sessionStorage.setItem(storageKey, JSON.stringify(newState));
    } catch (error) {
      devLogger.warn('TabSwitch', `Failed to persist tab visibility state for space ${spaceId}`, error);
    }
    
    // Show immediate loading feedback for tab switching
    if (currentState) {
      devLogger.log('TabSwitch', `Feed tab visited for space ${spaceId} - showing immediate feedback`, {
        isFirstVisit: !currentState,
        lastVisit: currentState.lastTabVisit,
        timeSinceLastVisit: now - currentState.lastTabVisit
      });
    } else {
      devLogger.log('TabSwitch', `Feed tab visited for space ${spaceId}`, {
        isFirstVisit: !currentState,
        lastVisit: undefined,
        timeSinceLastVisit: 0
      });
    }
  }, []);
  
  // Disable tab switching refresh logic since we now use persistent components
  const shouldRefreshOnTabSwitch = useCallback((spaceId: string): boolean => {
    // With persistent tab content, components don't remount when switching tabs
    // so we don't need to refresh data on tab switches
    devLogger.log('TabSwitch', `Tab switching refresh disabled for persistent components - space ${spaceId}`);
    return false;
  }, []);
  
  return { 
    trackTabVisit, 
    shouldRefreshOnTabSwitch, 
    isMobile 
  };
}
