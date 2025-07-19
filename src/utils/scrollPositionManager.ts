import { log } from '@/utils/logger';

/**
 * Scroll Position Manager
 * 
 * Handles scroll position management for mobile devices, especially
 * preventing browser scroll restoration from interfering with app UX.
 */

interface ScrollPositionOptions {
  behavior?: ScrollBehavior;
  delay?: number;
  force?: boolean;
}

class ScrollPositionManager {
  private isResetting = false;
  private lastResetTime = 0;
  private readonly RESET_COOLDOWN = 1000; // 1 second cooldown between resets

  /**
   * Reset scroll position to top of page
   */
  resetToTop(options: ScrollPositionOptions = {}): void {
    const { behavior = 'auto', delay = 0, force = false } = options;
    
    // Prevent rapid successive resets
    const now = Date.now();
    if (!force && this.isResetting && (now - this.lastResetTime) < this.RESET_COOLDOWN) {
      log.debug('ScrollManager', 'Skipping scroll reset - too soon after last reset');
      return;
    }

    this.isResetting = true;
    this.lastResetTime = now;

    const performReset = () => {
      try {
        // Method 1: Scroll to top of document
        window.scrollTo({
          top: 0,
          left: 0,
          behavior
        });

        // Method 2: Also reset any scrollable containers
        const scrollableElements = document.querySelectorAll(
          '.overflow-y-auto, .overflow-auto, [data-scrollable="true"]'
        );

        scrollableElements.forEach((element) => {
          if (element instanceof HTMLElement) {
            element.scrollTop = 0;
            element.scrollLeft = 0;
          }
        });

        log.debug('ScrollManager', 'Scroll position reset to top', {
          behavior,
          scrollableElementsCount: scrollableElements.length
        });
      } catch (error) {
        log.warn('ScrollManager', 'Error resetting scroll position:', error);
      } finally {
        this.isResetting = false;
      }
    };

    if (delay > 0) {
      setTimeout(performReset, delay);
    } else {
      performReset();
    }
  }

  /**
   * Reset scroll position with mobile-specific handling
   */
  resetForMobile(options: ScrollPositionOptions = {}): void {
    const { behavior = 'auto', delay = 0 } = options;
    
    // On mobile, use a slightly longer delay to ensure viewport is stable
    const mobileDelay = delay > 0 ? delay : 50;
    
    this.resetToTop({
      behavior,
      delay: mobileDelay,
      force: true
    });
  }

  /**
   * Reset scroll position for login scenarios
   */
  resetForLogin(options: ScrollPositionOptions = {}): void {
    log.debug('ScrollManager', 'Resetting scroll position for login');
    
    // For login, use smooth behavior and ensure we wait for DOM to be ready
    this.resetToTop({
      behavior: 'smooth',
      delay: 100,
      force: true,
      ...options
    });
  }

  /**
   * Reset scroll position for feed navigation
   */
  resetForFeedNavigation(options: ScrollPositionOptions = {}): void {
    log.debug('ScrollManager', 'Resetting scroll position for feed navigation');
    
    // For feed navigation, use auto behavior for immediate effect
    this.resetToTop({
      behavior: 'auto',
      delay: 0,
      force: true,
      ...options
    });
  }

  /**
   * Prevent browser scroll restoration
   */
  preventScrollRestoration(): void {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
      log.debug('ScrollManager', 'Disabled browser scroll restoration');
    }
  }

  /**
   * Re-enable browser scroll restoration
   */
  enableScrollRestoration(): void {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'auto';
      log.debug('ScrollManager', 'Re-enabled browser scroll restoration');
    }
  }

  /**
   * Get current scroll position
   */
  getCurrentScrollPosition(): { x: number; y: number } {
    return {
      x: window.pageXOffset || document.documentElement.scrollLeft,
      y: window.pageYOffset || document.documentElement.scrollTop
    };
  }

  /**
   * Check if page is scrolled down
   */
  isScrolledDown(threshold: number = 100): boolean {
    const { y } = this.getCurrentScrollPosition();
    return y > threshold;
  }

  /**
   * Debug current scroll state
   */
  debugScrollState(): void {
    const position = this.getCurrentScrollPosition();
    const isScrolled = this.isScrolledDown();
    
    log.debug('ScrollManager', 'Current scroll state:', {
      position,
      isScrolledDown: isScrolled,
      isResetting: this.isResetting,
      timeSinceLastReset: Date.now() - this.lastResetTime
    });
  }
}

// Export singleton instance
export const scrollPositionManager = new ScrollPositionManager();

// Export individual functions for convenience
export const resetScrollToTop = (options?: ScrollPositionOptions) => 
  scrollPositionManager.resetToTop(options);

export const resetScrollForMobile = (options?: ScrollPositionOptions) => 
  scrollPositionManager.resetForMobile(options);

export const resetScrollForLogin = (options?: ScrollPositionOptions) => 
  scrollPositionManager.resetForLogin(options);

export const resetScrollForFeedNavigation = (options?: ScrollPositionOptions) => 
  scrollPositionManager.resetForFeedNavigation(options);

export const preventScrollRestoration = () => 
  scrollPositionManager.preventScrollRestoration();

export const enableScrollRestoration = () => 
  scrollPositionManager.enableScrollRestoration();

export const getCurrentScrollPosition = () => 
  scrollPositionManager.getCurrentScrollPosition();

export const isScrolledDown = (threshold?: number) => 
  scrollPositionManager.isScrolledDown(threshold);

export const debugScrollState = () => 
  scrollPositionManager.debugScrollState(); 