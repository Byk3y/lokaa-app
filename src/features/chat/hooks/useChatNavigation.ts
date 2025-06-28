/**
 * useChatNavigation Hook - Mobile URL navigation management
 */

import { useCallback, useEffect } from 'react';
import { useNavigationStore } from '../store/navigationStore';
import { useConversationStore } from '../store/conversationStore';
import { shouldEnableMobileFeatures } from '@/utils/mobileDetection';

export function useChatNavigation() {
  // Store selectors
  const {
    currentSlug,
    previousSlug,
    navigationHistory,
    isMobileDevice,
    urlParsingEnabled,
    navigateToConversationBySlug,
    navigateToConversationById,
    parseUrlParameters,
    generateSlugForConversation,
    findConversationFromSlug,
    addToHistory,
    goBack,
    clearHistory,
    setMobileDevice,
    toggleUrlParsing,
    setCurrentSlug,
    reset
  } = useNavigationStore();

  const {
    getConversationById,
    setActiveConversationId
  } = useConversationStore();

  // UNIFIED: Use the centralized mobile detection
  const isMobileDetected = shouldEnableMobileFeatures();

  // Update mobile device status using unified detection
  useEffect(() => {
    // Only update if the detection result has changed to prevent rapid state changes
    if (isMobileDetected !== isMobileDevice) {
      setMobileDevice(isMobileDetected);
      console.log(`📱 [useChatNavigation] Updated mobile status: ${isMobileDetected}`);
    }
  }, [isMobileDetected, isMobileDevice, setMobileDevice]);

  // Parse URL on mount and when URL changes
  useEffect(() => {
    if (isMobileDevice && urlParsingEnabled) {
      const { conversationId, slug } = parseUrlParameters();
      
      if (conversationId || slug) {
        console.log('[useChatNavigation] URL parsed on mount:', { conversationId, slug });
        
        if (conversationId) {
          setActiveConversationId(conversationId);
        } else if (slug) {
          const resolvedId = findConversationFromSlug(slug);
          if (resolvedId) {
            setActiveConversationId(resolvedId);
          }
        }
      }
    }
  }, [isMobileDevice, urlParsingEnabled]); // Only run on initial mount and device/parsing changes

  /**
   * Navigate to conversation with URL update (mobile only)
   */
  const navigateToConversation = useCallback((conversationId: string) => {
    // ✅ NAVIGATION STATE GUARD: Check if already at this conversation
    const currentParams = parseUrlParameters();
    if (currentParams.conversationId === conversationId) {
      console.log('[useChatNavigation] Already at target conversation, skipping navigation:', conversationId);
      return;
    }

    if (isMobileDevice && urlParsingEnabled) {
      console.log('[useChatNavigation] Navigating to conversation with URL:', conversationId);
      navigateToConversationById(conversationId);
    } else {
      console.log('[useChatNavigation] Direct navigation (desktop/disabled):', conversationId);
      setActiveConversationId(conversationId);
    }
  }, [isMobileDevice, urlParsingEnabled, navigateToConversationById, setActiveConversationId, parseUrlParameters]);

  /**
   * Navigate to conversation list (mobile only)
   */
  const navigateToConversationList = useCallback(() => {
    if (isMobileDevice && urlParsingEnabled) {
      console.log('[useChatNavigation] Navigating to conversation list with URL');
      // This would be implemented in the NavigationStore
      setCurrentSlug(null);
      setActiveConversationId(null);
      
      // Update browser URL
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('ch');
        window.history.pushState({}, '', url.toString());
      }
      
      return true;
    } else {
      console.log('[useChatNavigation] Direct navigation to list (desktop/disabled)');
      setActiveConversationId(null);
      return false;
    }
  }, [isMobileDevice, urlParsingEnabled, setCurrentSlug, setActiveConversationId]);

  /**
   * Generate shareable URL for conversation
   */
  const generateConversationUrl = useCallback((conversationId: string): string | null => {
    if (!isMobileDevice || !urlParsingEnabled) return null;
    
    try {
      const slug = generateSlugForConversation(conversationId);
      const url = new URL(window.location.href);
      url.searchParams.set('ch', slug);
      return url.toString();
    } catch (error) {
      console.error('[useChatNavigation] Failed to generate URL:', error);
      return null;
    }
  }, [isMobileDevice, urlParsingEnabled, generateSlugForConversation]);

  /**
   * Parse conversation from current URL
   */
  const parseCurrentUrl = useCallback(() => {
    return parseUrlParameters();
  }, [parseUrlParameters]);

  /**
   * Check if conversation exists in navigation history
   */
  const isConversationInHistory = useCallback((conversationId: string): boolean => {
    const slug = generateSlugForConversation(conversationId);
    return navigationHistory.includes(slug);
  }, [navigationHistory, generateSlugForConversation]);

  /**
   * Get conversation from slug
   */
  const getConversationFromSlug = useCallback((slug: string) => {
    const conversationId = findConversationFromSlug(slug);
    return conversationId ? getConversationById(conversationId) : null;
  }, [findConversationFromSlug, getConversationById]);

  /**
   * Handle browser back/forward navigation
   */
  const handlePopStateNavigation = useCallback(() => {
    if (!isMobileDevice || !urlParsingEnabled) return;
    
    const { conversationId, slug } = parseUrlParameters();
    
    if (conversationId) {
      setActiveConversationId(conversationId);
    } else if (slug) {
      const resolvedId = findConversationFromSlug(slug);
      if (resolvedId) {
        setActiveConversationId(resolvedId);
      }
    } else {
      setActiveConversationId(null);
    }
  }, [isMobileDevice, urlParsingEnabled, parseUrlParameters, findConversationFromSlug, setActiveConversationId]);

  /**
   * Setup browser navigation listeners
   */
  useEffect(() => {
    if (!isMobileDevice || !urlParsingEnabled) return;

    window.addEventListener('popstate', handlePopStateNavigation);
    
    return () => {
      window.removeEventListener('popstate', handlePopStateNavigation);
    };
  }, [isMobileDevice, urlParsingEnabled, handlePopStateNavigation]);

  /**
   * Navigation state info
   */
  const navigationState = {
    currentSlug,
    previousSlug,
    historyLength: navigationHistory.length,
    canGoBack: navigationHistory.length > 1,
    isMobileDevice,
    urlParsingEnabled,
    isNavigationActive: isMobileDevice && urlParsingEnabled
  };

  return {
    // State
    navigationState,
    currentSlug,
    navigationHistory,
    
    // Device info
    isMobileDevice,
    urlParsingEnabled,
    isNavigationActive: isMobileDevice && urlParsingEnabled,
    
    // Core navigation
    navigateToConversation,
    navigateToConversationList,
    goBack,
    
    // URL operations
    generateConversationUrl,
    parseCurrentUrl,
    parseUrlParameters,
    
    // Slug operations
    generateSlugForConversation,
    findConversationFromSlug,
    getConversationFromSlug,
    
    // History management
    addToHistory,
    clearHistory,
    isConversationInHistory,
    
    // Configuration
    toggleUrlParsing,
    setMobileDevice,
    
    // Browser navigation
    handlePopStateNavigation,
    
    // Utilities
    setCurrentSlug,
    reset
  };
}

export type UseChatNavigationReturn = ReturnType<typeof useChatNavigation>; 