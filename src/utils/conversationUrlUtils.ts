import { log } from '@/utils/logger';
/**
 * Conversation URL Utilities - Mobile-Only
 * 
 * Implements Skool-style conversation URLs with shortened UUIDs for mobile devices only.
 * Pattern: /chat?ch=<shortened_id>
 * 
 * Benefits:
 * - Shareable conversation links
 * - Browser back/forward navigation
 * - Page refresh maintains conversation state
 * - Deep linking support
 */

/**
 * Direct mobile detection to avoid import issues
 */
function detectMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  
  const userAgent = navigator.userAgent.toLowerCase();
  const mobilePatterns = [
    /android.*mobile/,
    /iphone/,
    /ipod/,
    /blackberry/,
    /windows phone/,
    /mobile/
  ];
  
  const isMobileUA = mobilePatterns.some(pattern => pattern.test(userAgent));
  const isSmallScreen = window.innerWidth <= 768;
  const touchCapable = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  return isMobileUA || (isSmallScreen && touchCapable);
}

/**
 * Cache for conversation ID mappings to avoid repeated database calls
 */
const conversationIdCache = new Map<string, string>();
const reverseConversationIdCache = new Map<string, string>();

/**
 * Generate a shortened URL slug from a full UUID
 * Takes first 32 characters of UUID (removing hyphens) for Skool-style URLs
 * 
 * @param fullUuid The full conversation UUID from database
 * @returns Shortened slug for URL (e.g., "b9980e238562493c90c33e60002ae164")
 */
export function generateConversationSlug(fullUuid: string): string {
  if (!fullUuid) return '';
  
  // Remove hyphens and take first 32 characters (matches Skool pattern)
  const cleaned = fullUuid.replace(/-/g, '');
  return cleaned.substring(0, 32);
}

/**
 * Reverse lookup: find full UUID from shortened slug
 * First checks cache, then searches through available conversations
 * 
 * @param slug The shortened slug from URL
 * @param availableConversations Optional list of conversations to search through
 * @returns Full UUID or null if not found
 */
export function findConversationIdFromSlug(
  slug: string, 
  availableConversations?: Array<{ conversation_id: string }>
): string | null {
  if (!slug) return null;
  
  // Check cache first (primary lookup method)
  if (reverseConversationIdCache.has(slug)) {
    return reverseConversationIdCache.get(slug)!;
  }
  
  // If no conversations provided, only use cache
  if (!availableConversations || availableConversations.length === 0) {
    log.debug('Utils', '[ConversationUrlUtils] Cache miss for slug, no conversations to search:', slug);
    return null;
  }
  
  // Search through available conversations as fallback
  for (const conversation of availableConversations) {
    const conversationSlug = generateConversationSlug(conversation.conversation_id);
    if (conversationSlug === slug) {
      // Cache the mapping for future use
      conversationIdCache.set(conversation.conversation_id, slug);
      reverseConversationIdCache.set(slug, conversation.conversation_id);
      return conversation.conversation_id;
    }
  }
  
  return null;
}

/**
 * Generate conversation URL for mobile navigation
 * Only works on mobile devices - returns null for desktop
 * 
 * @param conversationId Full UUID of the conversation
 * @returns URL string or null if not mobile
 */
export function generateConversationUrl(conversationId: string): string | null {
  if (!detectMobileDevice()) {
    return null; // Desktop uses direct state management
  }
  
  if (!conversationId) return null;
  
  const slug = generateConversationSlug(conversationId);
  conversationIdCache.set(conversationId, slug);
  reverseConversationIdCache.set(slug, conversationId);
  
  return `/app/chat?ch=${slug}`;
}

/**
 * Parse conversation slug from current URL
 * Returns null if not on mobile or no slug found
 * 
 * @returns Object with slug and full conversation ID (if found in cache)
 */
export function parseConversationUrlParams(): {
  slug: string | null;
  conversationId: string | null;
} {
  if (!detectMobileDevice()) {
    return { slug: null, conversationId: null };
  }
  
  if (typeof window === 'undefined') {
    return { slug: null, conversationId: null };
  }
  
  const urlParams = new URLSearchParams(window.location.search);
  const slug = urlParams.get('ch'); // 'ch' parameter like Skool
  
  if (!slug) {
    return { slug: null, conversationId: null };
  }
  
  // Try to find full conversation ID from cache
  const conversationId = reverseConversationIdCache.get(slug) || null;
  
  return { slug, conversationId };
}

/**
 * Navigation Rate Limiter to prevent SecurityError
 */
class NavigationRateLimiter {
  private navigationCalls: number[] = [];
  private readonly maxCalls = 80; // Stay well below browser limit of 100
  private readonly timeWindow = 10000; // 10 seconds

  canNavigate(): boolean {
    const now = Date.now();
    
    // Remove old calls outside the time window
    this.navigationCalls = this.navigationCalls.filter(
      timestamp => now - timestamp < this.timeWindow
    );
    
    // Check if we're within the limit
    if (this.navigationCalls.length >= this.maxCalls) {
      log.warn('Utils', '[NavigationRateLimiter] Rate limit exceeded, blocking navigation');
      return false;
    }
    
    // Record this navigation call
    this.navigationCalls.push(now);
    return true;
  }

  reset(): void {
    this.navigationCalls = [];
  }

  getStatus(): { callsInWindow: number; maxCalls: number; canNavigate: boolean } {
    return {
      callsInWindow: this.navigationCalls.length,
      maxCalls: this.maxCalls,
      canNavigate: this.canNavigate()
    };
  }
}

const navigationRateLimiter = new NavigationRateLimiter();

/**
 * Navigation Debouncer to prevent rapid consecutive calls
 */
class NavigationDebouncer {
  private debounceTimeout: NodeJS.Timeout | null = null;
  private readonly debounceDelay = 100; // 100ms

  debounce<T extends any[]>(fn: (...args: T) => void, ...args: T): void {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
    
    this.debounceTimeout = setTimeout(() => {
      fn(...args);
      this.debounceTimeout = null;
    }, this.debounceDelay);
  }

  cancel(): void {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }
  }
}

const navigationDebouncer = new NavigationDebouncer();

/**
 * Navigate to conversation URL on mobile
 * Uses window.history.pushState to avoid full page reload
 * Now includes rate limiting and debouncing
 * 
 * @param conversationId Full UUID of the conversation
 * @param replace Whether to replace current history entry
 */
export function navigateToConversation(
  conversationId: string, 
  replace: boolean = false
): boolean {
  if (!detectMobileDevice()) {
    return false; // Desktop should use direct state management
  }
  
  // Check rate limiting
  if (!navigationRateLimiter.canNavigate()) {
    log.error('Utils', '[NavigationUtils] Navigation rate limited - too many calls');
    return false;
  }

  const url = generateConversationUrl(conversationId);
  if (!url) return false;
  
  // Debounce the actual navigation
  navigationDebouncer.debounce(performNavigation, conversationId, url, replace);
  return true;
}

/**
 * Internal function to perform the actual navigation
 * This is debounced to prevent rapid consecutive calls
 */
function performNavigation(conversationId: string, url: string, replace: boolean): void {
  try {
    // Check if URL is already current (prevent unnecessary navigation)
    if (typeof window !== 'undefined' && window.location.pathname + window.location.search === url) {
      log.debug('Utils', '[NavigationUtils] Already at target URL, skipping navigation');
      return;
    }

    if (replace) {
      window.history.replaceState({ conversationId }, '', url);
    } else {
      window.history.pushState({ conversationId }, '', url);
    }
    
    // Dispatch custom event to notify components of URL change
    const event = new CustomEvent('conversationUrlChange', {
      detail: { conversationId, slug: generateConversationSlug(conversationId) }
    });
    window.dispatchEvent(event);
    
    log.debug('Utils', '[NavigationUtils] Navigation completed:', { conversationId, url });
  } catch (error) {
    log.error('Utils', '[NavigationUtils] Navigation failed:', error);
  }
}

/**
 * Navigate back to conversation list on mobile
 * Removes conversation parameter from URL
 */
export function navigateToConversationList(): boolean {
  if (!detectMobileDevice()) {
    return false;
  }
  
  // Check rate limiting
  if (!navigationRateLimiter.canNavigate()) {
    log.error('Utils', '[NavigationUtils] Navigation rate limited - too many calls');
    return false;
  }
  
  // Debounce the navigation
  navigationDebouncer.debounce(performListNavigation);
  return true;
}

/**
 * Internal function to perform conversation list navigation
 */
function performListNavigation(): void {
  try {
    // Check if already at list URL
    if (typeof window !== 'undefined' && 
        window.location.pathname === '/app/chat' && 
        !window.location.search.includes('ch=')) {
      log.debug('Utils', '[NavigationUtils] Already at conversation list, skipping navigation');
      return;
    }

    window.history.pushState({}, '', '/app/chat');
    
    // Dispatch custom event
    const event = new CustomEvent('conversationUrlChange', {
      detail: { conversationId: null, slug: null }
    });
    window.dispatchEvent(event);
    
    log.debug('Utils', '[NavigationUtils] Navigated to conversation list');
  } catch (error) {
    log.error('Utils', '[NavigationUtils] Failed to navigate to conversation list:', error);
  }
}

/**
 * Check if current URL represents a specific conversation
 * Mobile-only function
 */
export function isConversationUrl(): boolean {
  if (!detectMobileDevice()) return false;
  
  const { slug } = parseConversationUrlParams();
  return slug !== null;
}

/**
 * Clear conversation URL caches
 * Useful for testing or when conversation data changes significantly
 */
export function clearConversationUrlCaches(): void {
  conversationIdCache.clear();
  reverseConversationIdCache.clear();
}

/**
 * Get cache statistics for debugging
 */
export function getConversationUrlCacheStats(): {
  forwardCacheSize: number;
  reverseCacheSize: number;
  sampleMappings: Array<{ fullId: string; slug: string }>;
} {
  const sampleMappings: Array<{ fullId: string; slug: string }> = [];
  let count = 0;
  
  for (const [fullId, slug] of conversationIdCache.entries()) {
    if (count < 3) { // Show first 3 mappings for debugging
      sampleMappings.push({ fullId, slug });
      count++;
    }
  }
  
  return {
    forwardCacheSize: conversationIdCache.size,
    reverseCacheSize: reverseConversationIdCache.size,
    sampleMappings
  };
}

/**
 * Debug utilities for conversation URL system
 * Available in development only
 */
export const conversationUrlDebug = {
  /**
   * Test URL generation and parsing
   */
  test: (conversationId: string = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890') => {
    log.debug('Utils', '🧪 Testing Conversation URL System');
    log.debug('Utils', '=====================================');
    log.debug('Utils', 'Input conversation ID:', conversationId);
    
    const slug = generateConversationSlug(conversationId);
    log.debug('Utils', 'Generated slug:', slug);
    
    const url = generateConversationUrl(conversationId);
    log.debug('Utils', 'Generated URL:', url);
    
    const mockConversations = [{ conversation_id: conversationId }];
    const foundId = findConversationIdFromSlug(slug, mockConversations);
    log.debug('Utils', 'Reverse lookup result:', foundId);
    log.debug('Utils', 'Reverse lookup success:', foundId === conversationId);
    
    const cacheStats = getConversationUrlCacheStats();
    log.debug('Utils', 'Cache stats:', cacheStats);
  },
  
  /**
   * Show current URL state
   */
  currentState: () => {
    log.debug('Utils', '🌐 Current Conversation URL State');
    log.debug('Utils', '=================================');
    log.debug('Utils', 'Is mobile:', detectMobileDevice());
    log.debug('Utils', 'Current URL:', window.location.href);
    
    const params = parseConversationUrlParams();
    log.debug('Utils', 'Parsed params:', params);
    log.debug('Utils', 'Is conversation URL:', isConversationUrl());
    
    const cacheStats = getConversationUrlCacheStats();
    log.debug('Utils', 'Cache stats:', cacheStats);
    
    // Return state object for testing
    return {
      isMobile: detectMobileDevice(),
      currentUrl: window.location.href,
      conversationId: params.conversationId,
      slug: params.slug,
      isConversationUrl: isConversationUrl(),
      urlParsingEnabled: detectMobileDevice(),
      cacheStats
    };
  },
  
  /**
   * Clear all caches
   */
  clearCaches: () => {
    clearConversationUrlCaches();
    log.debug('Utils', '✅ Conversation URL caches cleared');
  },
  
  /**
   * Test URL generation (for rate limiter testing)
   */
  testUrlGeneration: (conversationId = 'test-' + Date.now()) => {
    log.debug('Utils', '🧪 Testing URL generation for rate limiter...');
    const url = generateConversationUrl(conversationId);
    log.debug('Utils', 'Generated URL:', url);
    return url;
  }
};

// Make debug utilities available globally in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).conversationUrlDebug = conversationUrlDebug;
  (window as any).getNavigationRateLimiterStatus = getNavigationRateLimiterStatus;
  (window as any).resetNavigationRateLimiter = resetNavigationRateLimiter;
} 

/**
 * Get navigation rate limiter status (for debugging)
 */
export function getNavigationRateLimiterStatus() {
  return navigationRateLimiter.getStatus();
}

/**
 * Reset navigation rate limiter (for testing)
 */
export function resetNavigationRateLimiter() {
  navigationRateLimiter.reset();
  navigationDebouncer.cancel();
  log.debug('Utils', '[NavigationUtils] Rate limiter and debouncer reset');
} 