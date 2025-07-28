/**
 * Persistent Tab Manager - URL-Independent Tab State Management
 * 
 * This service maintains tab state completely independently from React Router,
 * preventing any component remounting or re-rendering when switching tabs.
 * 
 * Key Features:
 * - URL updates without triggering React Router navigation
 * - Event-based tab switching that bypasses React Router
 * - Persistent component mounting with visibility control
 * - State preservation across all navigation patterns
 */

import { log } from '@/utils/logger';

export type PersistentTab = 'feed' | 'classroom' | 'calendar' | 'members' | 'leaderboard' | 'about';

interface TabState {
  currentTab: PersistentTab;
  subdomain: string;
  previousTab?: PersistentTab;
}

interface TabChangeEvent {
  tab: PersistentTab;
  subdomain: string;
  source: 'navigation' | 'url' | 'user';
}

class PersistentTabManager {
  private state: TabState = {
    currentTab: 'feed',
    subdomain: '',
  };
  
  private listeners: Set<(event: TabChangeEvent) => void> = new Set();
  private initialized = false;

  /**
   * Initialize the tab manager with current URL state
   */
  initialize(subdomain: string, initialTab: PersistentTab = 'feed') {
    // Always allow re-initialization if subdomain changes
    if (this.initialized && this.state.subdomain === subdomain) {
      // If already initialized with same subdomain, just sync with current URL
      this.syncWithURL(window.location.pathname);
      return;
    }
    
    this.state = {
      currentTab: initialTab,
      subdomain,
    };
    
    this.initialized = true;
    log.debug('Component', '🚀 [PersistentTabManager] Initialized', this.state);
  }

  /**
   * Get current tab state
   */
  getCurrentTab(): PersistentTab {
    return this.state.currentTab;
  }

  /**
   * Get current subdomain
   */
  getSubdomain(): string {
    return this.state.subdomain;
  }

  /**
   * Switch to a new tab WITHOUT using React Router
   */
  switchTab(tab: PersistentTab, source: 'navigation' | 'url' | 'user' = 'user') {
    if (tab === this.state.currentTab) return;

    const previousTab = this.state.currentTab;
    
    // Update internal state
    this.state = {
      ...this.state,
      currentTab: tab,
      previousTab,
    };

    // Update URL without triggering React Router navigation
    this.updateURL(tab);

    // Notify all listeners
    const event: TabChangeEvent = {
      tab,
      subdomain: this.state.subdomain,
      source,
    };

    this.listeners.forEach(listener => listener(event));
    
    log.debug('Component', '🔄 [PersistentTabManager] Tab switched', {
      from: previousTab,
      to: tab,
      source,
    });
  }

  /**
   * Update URL without causing React Router navigation
   */
  private updateURL(tab: PersistentTab) {
    const newURL = tab === 'feed' 
      ? `/${this.state.subdomain}/space`
      : `/${this.state.subdomain}/space/${tab}`;
    
    // Use history.replaceState to update URL without triggering navigation
    if (window.location.pathname !== newURL) {
      window.history.replaceState(null, '', newURL);
    }
  }

  /**
   * Subscribe to tab change events
   */
  subscribe(listener: (event: TabChangeEvent) => void) {
    this.listeners.add(listener);
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Extract tab from pathname
   */
  private extractTabFromPath(pathname: string): PersistentTab | null {
    // Check if we're on a course detail route first (actual route pattern)
    const isCourseDetailRoute = pathname.match(/^\/[^\/]+\/space\/classroom\/[^\/]+$/);
    if (isCourseDetailRoute) {
      return 'classroom'; // Course detail routes should keep classroom tab active
    }
    
    const match = pathname.match(/^\/[^\/]+\/space(?:\/([^\/]+))?/);
    if (!match) return null;
    
    const tabSegment = match[1];
    if (!tabSegment) return 'feed';
    
    const validTabs: PersistentTab[] = ['feed', 'classroom', 'calendar', 'members', 'leaderboard', 'about'];
    return validTabs.includes(tabSegment as PersistentTab) ? tabSegment as PersistentTab : 'feed';
  }

  /**
   * Extract subdomain from pathname
   */
  private extractSubdomainFromPath(pathname: string): string | null {
    const match = pathname.match(/^\/([^\/]+)\/space/);
    return match ? match[1] : null;
  }

  /**
   * Sync with URL changes (for browser back/forward)
   */
  syncWithURL(pathname: string) {
    // ✅ FIX: Use window.location.pathname directly to avoid stale pathname data
    const currentPathname = window.location.pathname;
    const tab = this.extractTabFromPath(currentPathname);
    const subdomain = this.extractSubdomainFromPath(currentPathname);
    
    if (subdomain && subdomain !== this.state.subdomain) {
      this.state.subdomain = subdomain;
    }
    
    if (tab && tab !== this.state.currentTab) {
      // Update internal state without triggering URL update
      const previousTab = this.state.currentTab;
      this.state = {
        ...this.state,
        currentTab: tab,
        previousTab,
      };
      
      // Notify listeners without updating URL
      const event: TabChangeEvent = {
        tab,
        subdomain: this.state.subdomain,
        source: 'url',
      };
      
      this.listeners.forEach(listener => listener(event));
      
      log.debug('Component', '🔄 [PersistentTabManager] Tab synced from URL', {
        from: previousTab,
        to: tab,
        pathname: currentPathname
      });
    }
  }

  /**
   * Reset manager state
   */
  reset() {
    this.state = {
      currentTab: 'feed',
      subdomain: '',
    };
    this.listeners.clear();
    this.initialized = false;
  }

  /**
   * Check if a tab is currently active
   */
  isTabActive(tab: PersistentTab): boolean {
    return this.state.currentTab === tab;
  }
}

// Export singleton instance
export const persistentTabManager = new PersistentTabManager();

export default persistentTabManager;