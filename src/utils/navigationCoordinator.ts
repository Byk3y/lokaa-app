import { log } from '@/utils/logger';
/**
 * 🚀 Phase 3: Navigation Coordinator
 * 
 * Single source of truth for all navigation decisions.
 * Prevents duplicate route changes and component conflicts.
 * 
 * Phase 3.1: Enhanced with URL pattern validation and normalization
 * for the new URL structure optimization.
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
    
    // Phase 3.1: Normalize URLs for consistent comparison
    const normalizedTo = this.normalizeUrl(to);
    const normalizedFrom = this.normalizeUrl(from);
    const navigationKey = `${normalizedFrom}->${normalizedTo}`;
    
    // Phase 3.1: Validate URL patterns
    if (!this.validateUrlPattern(normalizedTo)) {
      devLogger.log('Navigation', 'Invalid URL pattern:', normalizedTo, 'from', source);
      return false;
    }
    
    // 🔥 [AUTH FIX] Special handling for auth routes to prevent loops
    if (normalizedFrom === '/login' && normalizedTo === '/' && source.includes('unauth-redirect')) {
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
    if (this.state.activeNavigation === normalizedTo) {
      devLogger.log('Navigation', 'Navigation to', normalizedTo, 'already in progress, blocking duplicate from', source);
      return false;
    }
    
    // Execute the navigation
    devLogger.log('Navigation', 'Executing navigation:', navigationKey, `(${source})`);
    this.state.activeNavigation = normalizedTo;
    this.state.lastNavigation = {
      to: normalizedTo,
      from: normalizedFrom,
      source,
      state: options.state,
      replace: options.replace ?? true,
      timestamp: now
    };
    this.recentNavigations.set(navigationKey, now);
    
    try {
      if (this.navigate) {
        this.navigate(normalizedTo, {
          replace: options.replace ?? true,
          state: options.state
        });
        
        // Clear active navigation after a delay
        setTimeout(() => {
          this.state.activeNavigation = null;
          devLogger.log('Navigation', 'Navigation completed:', normalizedTo);
        }, 100);
        
        return true;
      } else {
        if (process.env.NODE_ENV === 'development') {
          log.error('Utils', '🚫 [NavigationCoordinator] Navigate function not initialized - falling back to window.location');
        }
        this.state.activeNavigation = null;
        
        // Fallback to window.location for critical navigation
        if (typeof window !== 'undefined') {
          devLogger.log('Navigation', 'Using window.location fallback for:', normalizedTo);
          window.location.href = normalizedTo;
          return true;
        }
        
        return false;
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        log.error('Utils', '🚫 [NavigationCoordinator] Navigation error:', error);
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

  /**
   * Phase 3.1: Normalize URL for consistent comparison
   */
  private normalizeUrl(url: string): string {
    if (!url) return '/';
    
    // Remove trailing slashes and normalize
    let normalized = url.replace(/\/+$/, '') || '/';
    
    // Ensure leading slash
    if (!normalized.startsWith('/')) {
      normalized = '/' + normalized;
    }
    
    return normalized;
  }

  /**
   * Phase 3.1: Validate URL pattern for new structure
   */
  private validateUrlPattern(url: string): boolean {
    if (!url || url === '/') return true;
    
    // Remove leading slash for pattern matching
    const path = url.startsWith('/') ? url.slice(1) : url;
    const segments = path.split('/').filter(Boolean);
    
    // Valid patterns:
    // - /:subdomain (space root)
    // - /:subdomain/:tab (space sections)
    // - /:subdomain/posts/:slug (posts)
    // - /:subdomain/courses/:slug (courses)
    // - /:subdomain/courses/:course-slug/lessons/:lesson-slug (lessons)
    // - /@:username (profiles)
    // - /discover, /login, /register, etc. (app routes)
    
    if (segments.length === 0) return true; // Root path
    
    // App routes (no subdomain)
    const appRoutes = ['discover', 'login', 'register', 'settings', 'profile'];
    if (appRoutes.includes(segments[0])) return true;
    
    // Profile routes
    if (segments[0].startsWith('@')) return true;
    
    // Space routes
    if (segments.length >= 1) {
      const subdomain = segments[0];
      
      // Basic subdomain validation (alphanumeric and hyphens)
      if (!/^[a-zA-Z0-9-]+$/.test(subdomain)) return false;
      
      // Space root
      if (segments.length === 1) return true;
      
      // Space sections
      const validSections = ['about', 'members', 'classroom', 'calendar', 'leaderboard'];
      if (segments.length === 2 && validSections.includes(segments[1])) return true;
      
      // Posts
      if (segments[1] === 'posts' && segments.length === 3) return true;
      
      // Courses
      if (segments[1] === 'courses' && segments.length >= 3) {
        // Course detail or lesson detail
        return true;
      }
    }
    
    return false;
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