/**
 * 🚀 Phase 3: Navigation Coordinator
 * 
 * Single source of truth for all navigation decisions.
 * Prevents duplicate route changes and component conflicts.
 */

import { NavigateFunction } from 'react-router-dom';
import { devLogger } from './developmentLogger';

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
    devLogger.startup('Navigation', 'Initialized with navigate function');
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
      devLogger.log('Navigation', 'Blocked auth route loop:', navigationKey, 'from', source);
      return false;
    }
    
    // Check if we recently processed this exact navigation
    const lastNavigation = this.recentNavigations.get(navigationKey);
    if (lastNavigation && (now - lastNavigation) < this.duplicateThreshold) {
      devLogger.log('Navigation', 'Blocked duplicate navigation:', navigationKey, 'from', source);
      return false;
    }
    
    // Check if we're currently navigating
    if (this.state.activeNavigation === to) {
      devLogger.log('Navigation', 'Navigation to', to, 'already in progress, blocking duplicate from', source);
      return false;
    }
    
    // Execute the navigation
    devLogger.log('Navigation', 'Executing navigation:', navigationKey, `(${source})`);
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
          devLogger.log('Navigation', 'Navigation completed:', to);
        }, 100);
        
        return true;
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.error('🚫 [NavigationCoordinator] Navigate function not initialized - falling back to window.location');
        }
        this.state.activeNavigation = null;
        
        // Fallback to window.location for critical navigation
        if (typeof window !== 'undefined') {
          devLogger.log('Navigation', 'Using window.location fallback for:', to);
          window.location.href = to;
          return true;
        }
        
        return false;
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('🚫 [NavigationCoordinator] Navigation error:', error);
      }
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
    devLogger.log('Navigation', 'State cleared');
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
    devLogger.log('Navigation', 'Next navigation will be allowed');
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
    devLogger.log('Navigation', 'Debug State:', {
      activeNavigation: state.activeNavigation,
      lastNavigation: state.lastNavigation,
      pendingCount: state.pendingNavigations.length,
      blockedCount: state.blockedNavigations.length,
      blockedNavigations: state.blockedNavigations.slice(-5) // Show last 5
    });
  };
} 