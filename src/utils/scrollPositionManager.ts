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

/**
 * Global flag to prevent scroll resets when chat navigation is pending
 * This prevents unwanted scroll resets when the user is about to open chat
 */
declare global {
  interface Window {
    __pendingChatNavigation?: boolean;
  }
}

class ScrollPositionManager {
  private isResetting = false;
  private lastResetTime = 0;
  private readonly RESET_COOLDOWN = 1000; // 1 second cooldown between resets

  /**
   * Reset scroll position to top for all scrollable elements
   * EXCLUDES chat containers to prevent unwanted scroll resets
   */
  resetToTop(): void {
    // ✅ CRITICAL FIX: Skip all scroll resets if chat navigation is pending
    if (isChatNavigationPending()) {
      return;
    }

    // ✅ CRITICAL FIX: Completely disable scroll resets when on chat pages
    if (this.isOnChatPage()) {
      return;
    }
    
    // Method 1: Reset body scroll
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }

    // Method 2: Also reset any scrollable containers - EXCLUDE CHAT CONTAINERS
    const scrollableElements = document.querySelectorAll(
      '.overflow-y-auto, .overflow-auto, [data-scrollable="true"]'
    );

    scrollableElements.forEach((element) => {
      if (element instanceof HTMLElement) {
        // ✅ FIX: Use a more robust chat container detection
        if (this.isChatContainer(element)) {
          return; // Skip this element entirely
        }

        element.scrollTop = 0;
        element.scrollLeft = 0;
      }
    });
  }

  /**
   * Reset scroll position with mobile-specific handling
   */
  resetForMobile(options: ScrollPositionOptions = {}): void {
    // On mobile, use a slightly longer delay to ensure viewport is stable
    const mobileDelay = options.delay > 0 ? options.delay : 50;
    
    // Use setTimeout to add delay if needed
    if (mobileDelay > 0) {
      setTimeout(() => {
        this.resetToTop();
      }, mobileDelay);
    } else {
      this.resetToTop();
    }
  }

  /**
   * Reset scroll position for login scenarios
   */
  resetForLogin(options: ScrollPositionOptions = {}): void {
    log.debug('ScrollManager', 'Resetting scroll position for login');
    
    // ✅ FIX: Check if we're in a modal context before resetting
    const isInModalContext = this.isInModalContext();
    
    if (isInModalContext) {
      log.debug('ScrollManager', 'Skipping scroll reset - in modal context');
      return;
    }
    
    // For login, use delay to ensure DOM is ready
    const delay = options.delay || 100;
    
    if (delay > 0) {
      setTimeout(() => {
        this.resetToTop();
      }, delay);
    } else {
      this.resetToTop();
    }
  }

  /**
   * Check if we're currently in a modal or overlay context
   */
  private isInModalContext(): boolean {
    // ✅ FIX: Enhanced modal context detection
    const modalSelectors = [
      '[data-radix-popper-content-wrapper]',
      '.chat-modal',
      '.mobile-chat-input-overlay',
      '[role="dialog"]',
      '.modal',
      '.overlay',
      '[data-chat-container="true"]',
      '.chat-messages-container',
      '.mobile-chat-messages-simplified'
    ];
    
    // Check for modal elements
    const hasModalElement = modalSelectors.some(selector => 
      document.querySelector(selector) !== null
    );
    
    // Check for chat-related URLs
    const isChatUrl = window.location.pathname.includes('/chat') || 
                     window.location.pathname.includes('/app/chat');
    
    // Check for active chat containers
    const hasActiveChat = document.querySelector('[data-chat-container="true"]') !== null;
    
    return hasModalElement || isChatUrl || hasActiveChat;
  }

  /**
   * Check if we're currently on a chat page or about to navigate to chat
   */
  private isOnChatPage(): boolean {
    const isOnChatPage = window.location.pathname.includes('/chat') || 
                        window.location.pathname.includes('/app/chat');
    
    // ✅ CRITICAL: Also check if we're on a space page that might navigate to chat
    const isOnSpacePageThatMightNavigateToChat = window.location.pathname.includes('/space') && 
                                                (window.location.search.includes('chat') || 
                                                 window.location.hash.includes('chat') ||
                                                 window.location.pathname.includes('/members'));
    
    return isOnChatPage || isOnSpacePageThatMightNavigateToChat;
  }

  /**
   * Enhanced chat container detection
   */
  private isChatContainer(element: HTMLElement): boolean {
    // Check if element itself is a chat container
    const isDirectChatContainer = 
      element.classList.contains('chat-messages-container') ||
      element.classList.contains('mobile-chat-messages-simplified') ||
      element.hasAttribute('data-chat-container') ||
      element.dataset.chatContainer === 'true';

    // Check if element is inside a chat container
    const isInsideChatContainer = 
      element.closest('.chat-messages-container') !== null ||
      element.closest('.mobile-chat-messages-simplified') !== null ||
      element.closest('[data-chat-container="true"]') !== null ||
      element.closest('.chat-modal') !== null ||
      element.closest('.mobile-chat-input-overlay') !== null;

    // Check if element is part of chat-related UI
    const isChatUI = 
      element.classList.contains('chat-container') ||
      element.classList.contains('chat-view') ||
      element.classList.contains('chat-messages') ||
      element.classList.contains('chat-input') ||
      element.closest('.chat-container') !== null ||
      element.closest('.chat-view') !== null;

    // ✅ FIX: Check if element CONTAINS chat content (parent containers)
    const containsChatContent = 
      element.querySelector('.chat-messages-container') !== null ||
      element.querySelector('.mobile-chat-messages-simplified') !== null ||
      element.querySelector('[data-chat-container="true"]') !== null ||
      element.querySelector('.chat-modal') !== null ||
      element.querySelector('.mobile-chat-input-overlay') !== null ||
      element.querySelector('.chat-container') !== null ||
      element.querySelector('.chat-view') !== null;

    // ✅ FIX: Check if we're on a chat page/route
    const isOnChatPage = 
      window.location.pathname.includes('/chat') || 
      window.location.pathname.includes('/app/chat');

    // ✅ FIX: Check if element is part of the main app layout that contains chat
    const isMainAppContainer = 
      element.classList.contains('app-container') ||
      element.classList.contains('main-container') ||
      element.classList.contains('layout-container') ||
      element.closest('.app-container') !== null ||
      element.closest('.main-container') !== null ||
      element.closest('.layout-container') !== null;

    return isDirectChatContainer || isInsideChatContainer || isChatUI || containsChatContent || (isOnChatPage && isMainAppContainer);
  }

  /**
   * Reset scroll position for feed navigation
   */
  resetForFeedNavigation(options: ScrollPositionOptions = {}): void {
    log.debug('ScrollManager', 'Resetting scroll position for feed navigation');
    
    // ✅ CRITICAL FIX: Skip if chat navigation is pending
    if (isChatNavigationPending()) {
      console.log('🔍 [ScrollManager] SKIPPING feed navigation scroll reset - chat navigation pending');
      return;
    }
    
    // For feed navigation, use immediate effect
    const delay = options.delay || 0;
    
    if (delay > 0) {
      setTimeout(() => {
        this.resetToTop();
      }, delay);
    } else {
      this.resetToTop();
    }
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
  isScrolledDown(threshold = 100): boolean {
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

/**
 * Set the global pending chat navigation flag
 * Call this when chat navigation is initiated (tab, button, modal, etc.)
 */
export const setPendingChatNavigation = (pending = true): void => {
  if (typeof window !== 'undefined') {
    window.__pendingChatNavigation = pending;
    console.log('🔍 [ScrollManager] Set pending chat navigation:', pending);
  }
};

/**
 * Check if chat navigation is pending
 */
const isChatNavigationPending = (): boolean => {
  return typeof window !== 'undefined' && window.__pendingChatNavigation === true;
};

/**
 * Clear connection cache when needed (e.g., when user logs out)
 */
export const clearConnectionCache = (): void => {
  // This will be called by ConnectionContext when needed
  if (typeof window !== 'undefined' && (window as any).__connectionCache) {
    (window as any).__connectionCache.clear();
    console.log('🔍 [ScrollManager] Connection cache cleared');
  }
};

// Export individual functions for convenience
export const resetScrollToTop = () => 
  scrollPositionManager.resetToTop();

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