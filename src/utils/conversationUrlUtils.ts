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
 * @param availableConversations List of conversations to search through
 * @returns Full UUID or null if not found
 */
export function findConversationIdFromSlug(
  slug: string, 
  availableConversations: Array<{ conversation_id: string }>
): string | null {
  if (!slug) return null;
  
  // Check cache first
  if (reverseConversationIdCache.has(slug)) {
    return reverseConversationIdCache.get(slug)!;
  }
  
  // Search through available conversations
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
 * Navigate to conversation URL on mobile
 * Uses window.history.pushState to avoid full page reload
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
  
  const url = generateConversationUrl(conversationId);
  if (!url) return false;
  
  try {
    if (replace) {
      window.history.replaceState({}, '', url);
    } else {
      window.history.pushState({}, '', url);
    }
    
    // Dispatch custom event to notify components of URL change
    const event = new CustomEvent('conversationUrlChange', {
      detail: { conversationId, slug: generateConversationSlug(conversationId) }
    });
    window.dispatchEvent(event);
    
    return true;
  } catch (error) {
    console.error('Failed to navigate to conversation:', error);
    return false;
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
  
  try {
    window.history.pushState({}, '', '/app/chat');
    
    // Dispatch custom event
    const event = new CustomEvent('conversationUrlChange', {
      detail: { conversationId: null, slug: null }
    });
    window.dispatchEvent(event);
    
    return true;
  } catch (error) {
    console.error('Failed to navigate to conversation list:', error);
    return false;
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
    console.log('🧪 Testing Conversation URL System');
    console.log('=====================================');
    console.log('Input conversation ID:', conversationId);
    
    const slug = generateConversationSlug(conversationId);
    console.log('Generated slug:', slug);
    
    const url = generateConversationUrl(conversationId);
    console.log('Generated URL:', url);
    
    const mockConversations = [{ conversation_id: conversationId }];
    const foundId = findConversationIdFromSlug(slug, mockConversations);
    console.log('Reverse lookup result:', foundId);
    console.log('Reverse lookup success:', foundId === conversationId);
    
    const cacheStats = getConversationUrlCacheStats();
    console.log('Cache stats:', cacheStats);
  },
  
  /**
   * Show current URL state
   */
  currentState: () => {
    console.log('🌐 Current Conversation URL State');
    console.log('=================================');
    console.log('Is mobile:', detectMobileDevice());
    console.log('Current URL:', window.location.href);
    
    const params = parseConversationUrlParams();
    console.log('Parsed params:', params);
    console.log('Is conversation URL:', isConversationUrl());
    
    const cacheStats = getConversationUrlCacheStats();
    console.log('Cache stats:', cacheStats);
  },
  
  /**
   * Clear all caches
   */
  clearCaches: () => {
    clearConversationUrlCaches();
    console.log('✅ Conversation URL caches cleared');
  }
};

// Make debug utilities available globally in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).conversationUrlDebug = conversationUrlDebug;
} 