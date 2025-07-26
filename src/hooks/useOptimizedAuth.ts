/**
 * @deprecated This hook has been moved to AuthContext.
 * All components should import useOptimizedAuth directly from '@/contexts/AuthContext'.
 * 
 * This temporary compatibility layer prevents breaking existing imports.
 * Please migrate your imports when possible.
 */

import { useEffect, useRef } from 'react';
import { useOptimizedAuth as useAuthFromContext } from '@/contexts/AuthContext';
import { log } from '@/utils/logger';
import { resetScrollForLogin } from '@/utils/scrollPositionManager';

export function useOptimizedAuth() {
  const { user, loading } = useAuthFromContext();
  const previousUserRef = useRef<string | null>(null);
  const hasResetScrollRef = useRef<boolean>(false);
  const sessionIdRef = useRef<string | null>(null);
  const lastScrollResetRef = useRef<number>(0);
  const SCROLL_RESET_COOLDOWN = 2000; // 2 seconds cooldown

  // Handle scroll position reset on login - only for actual page navigation
  useEffect(() => {
    const currentUserId = user?.id || null;
    const previousUserId = previousUserRef.current;
    const currentSessionId = user?.id ? `${user.id}-${Date.now()}` : null;

    // Check if user just logged in (was null, now has ID) and we haven't reset scroll yet
    // Also check if this is a new session to prevent repeated resets
    // ✅ CRITICAL FIX: Only reset scroll on actual page navigation, not modal opening
    if (!previousUserId && currentUserId && !hasResetScrollRef.current && 
        sessionIdRef.current !== currentSessionId) {
      
      // ✅ CRITICAL FIX: More aggressive modal/chat context detection
      const isInModal = window.location.pathname.includes('/chat') || 
                       window.location.pathname.includes('/app/chat') ||
                       document.querySelector('[data-radix-popper-content-wrapper]') ||
                       document.querySelector('.chat-modal') ||
                       document.querySelector('.mobile-chat-input-overlay') ||
                       document.querySelector('[data-chat-container="true"]') ||
                       document.querySelector('.chat-messages-container') ||
                       document.querySelector('.mobile-chat-messages-simplified') ||
                       document.querySelector('.chat-container') ||
                       document.querySelector('.chat-view');
      
      // ✅ CRITICAL FIX: Check for any chat-related DOM elements
      const hasChatElements = document.querySelectorAll('.chat-messages-container, .mobile-chat-messages-simplified, [data-chat-container="true"], .chat-container, .chat-view, .chat-modal').length > 0;
      
      // ✅ CRITICAL FIX: Check if we're about to navigate to chat (prevent scroll reset)
      const isAboutToNavigateToChat = window.location.pathname.includes('/space') && 
                                    (window.location.search.includes('chat') || 
                                     window.location.hash.includes('chat'));
      
      // ✅ CRITICAL FIX: Check if we're on a space page that might open chat modal
      const isOnSpacePageThatMightOpenChat = window.location.pathname.includes('/space') && 
                                            (window.location.pathname.includes('/members') || 
                                             window.location.pathname.includes('/nocode-architects/space'));
      
      // ✅ CRITICAL FIX: Add cooldown to prevent multiple rapid scroll resets
      const now = Date.now();
      const timeSinceLastReset = now - lastScrollResetRef.current;
      
      if (timeSinceLastReset < SCROLL_RESET_COOLDOWN) {
        if (process.env.NODE_ENV === 'development') {
          log.debug('Auth', 'Skipping scroll reset - cooldown active:', timeSinceLastReset + 'ms');
        }
        return;
      }
      
      // ✅ CRITICAL FIX: Skip scroll reset if in any chat-related context
      if (isInModal || hasChatElements || isAboutToNavigateToChat || isOnSpacePageThatMightOpenChat) {
        if (process.env.NODE_ENV === 'development') {
          log.debug('Auth', 'Skipping scroll reset - chat context detected or about to navigate to chat');
        }
        return;
      }
      
      // Only log in development mode to reduce console noise
      if (process.env.NODE_ENV === 'development') {
        log.debug('Auth', 'User logged in, resetting scroll position');
      }
      resetScrollForLogin();
      hasResetScrollRef.current = true;
      sessionIdRef.current = currentSessionId;
      lastScrollResetRef.current = now;
    }

    // Update previous user reference
    previousUserRef.current = currentUserId;
  }, [user?.id]);

  return { user, loading };
} 