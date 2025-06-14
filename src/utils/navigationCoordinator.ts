/**
 * 🚀 Phase 3: Navigation Coordinator
 * 
 * Single source of truth for all navigation decisions.
 * Prevents duplicate route changes and component conflicts.
 */

import { NavigateFunction } from 'react-router-dom';

interface NavigationRequest {
  to: string;
  from: string;
  source: string;
  state?: any;
  replace?: boolean;
  timestamp: number;
}

interface NavigationState {
  activeNavigation: string | null;
  lastNavigation: NavigationRequest | null;
  pendingNavigations: NavigationRequest[];
  blockedNavigations: NavigationRequest[];
}

class NavigationCoordinator {
  private static instance: NavigationCoordinator;
  private state: NavigationState;
  private navigate: NavigateFunction | null = null;
  private navigationTimeout: NodeJS.Timeout | null = null;
  private recentNavigations = new Map<string, number>();
  private duplicateThreshold = 1000; // 1 second

  private constructor() {
    this.state = {
      activeNavigation: null,
      lastNavigation: null,
      pendingNavigations: [],
      blockedNavigations: []
    };
    
    if (typeof window !== 'undefined') {
      // Expose for debugging
      (window as any).navigationCoordinator = this;
    }
  }

  static getInstance(): NavigationCoordinator {
    if (!NavigationCoordinator.instance) {
      NavigationCoordinator.instance = new NavigationCoordinator();
    }
    return NavigationCoordinator.instance;
  }

  /**
   * Initialize with React Router's navigate function
   */
  initialize(navigateFunction: NavigateFunction): void {
    this.navigate = navigateFunction;
    console.log('🚀 [NavigationCoordinator] Initialized with navigate function');
  }

  /**
   * Request navigation with duplicate detection and coordination
   */
  requestNavigation(
    to: string,
    from: string,
    source: string,
    options: { state?: any; replace?: boolean } = {}
  ): boolean {
    const now = Date.now();
    const navigationKey = `${from}->${to}`;
    
    // 🔥 [AUTH FIX] Special handling for auth routes to prevent loops
    if (from === '/login' && to === '/' && source.includes('unauth-redirect')) {
      console.log('🚫 [NavigationCoordinator] Blocked auth route loop:', navigationKey, 'from', source);
      return false;
    }
    
    // Check if we recently processed this exact navigation
    const lastNavigation = this.recentNavigations.get(navigationKey);
    if (lastNavigation && (now - lastNavigation) < this.duplicateThreshold) {
      console.log('🚫 [NavigationCoordinator] Blocked duplicate navigation:', navigationKey, 'from', source);
      return false;
    }
    
    // Check if we're currently navigating
    if (this.state.activeNavigation === to) {
      console.log('🚫 [NavigationCoordinator] Navigation to', to, 'already in progress, blocking duplicate from', source);
      return false;
    }
    
    // Execute the navigation
    console.log('🚀 [NavigationCoordinator] Executing navigation:', navigationKey, `(${source})`);
    this.state.activeNavigation = to;
    this.state.lastNavigation = {
      to,
      from,
      source,
      state: options.state,
      replace: options.replace ?? true,
      timestamp: now
    };
    this.recentNavigations.set(navigationKey, now);
    
    try {
      if (this.navigate) {
        this.navigate(to, {
          replace: options.replace ?? true,
          state: options.state
        });
        
        // Clear active navigation after a delay
        setTimeout(() => {
          this.state.activeNavigation = null;
          console.log('✅ [NavigationCoordinator] Navigation completed:', to);
        }, 100);
        
        return true;
      } else {
        console.error('🚫 [NavigationCoordinator] Navigate function not initialized');
        this.state.activeNavigation = null;
        return false;
      }
    } catch (error) {
      console.error('🚫 [NavigationCoordinator] Navigation error:', error);
      this.state.activeNavigation = null;
      return false;
    }
  }

  /**
   * Clear navigation state (useful for testing)
   */
  clearState(): void {
    this.state = {
      activeNavigation: null,
      lastNavigation: null,
      pendingNavigations: [],
      blockedNavigations: []
    };
    this.recentNavigations.clear();
    console.log('🧹 [NavigationCoordinator] State cleared');
  }

  /**
   * Get current navigation state for debugging
   */
  getState(): NavigationState {
    return { ...this.state };
  }

  /**
   * Force allow next navigation (escape hatch)
   */
  forceAllowNext(): void {
    this.state.activeNavigation = null;
    console.log('🔓 [NavigationCoordinator] Next navigation will be allowed');
  }
}

// Export singleton instance
export const navigationCoordinator = NavigationCoordinator.getInstance();

// Convenience hook for React components
/**
 * FIXED: Converted to const export for React Fast Refresh compatibility
 */
export const useNavigationCoordinator = () => {
  return navigationCoordinator;
}

// Debug utilities
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).debugNavigation = () => {
    const state = navigationCoordinator.getState();
    console.log('🔍 [NavigationCoordinator] Debug State:', {
      activeNavigation: state.activeNavigation,
      lastNavigation: state.lastNavigation,
      pendingCount: state.pendingNavigations.length,
      blockedCount: state.blockedNavigations.length,
      blockedNavigations: state.blockedNavigations.slice(-5) // Show last 5
    });
  };
} 