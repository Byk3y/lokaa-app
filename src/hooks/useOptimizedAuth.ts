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

  // Handle scroll position reset on login
  useEffect(() => {
    const currentUserId = user?.id || null;
    const previousUserId = previousUserRef.current;
    const currentSessionId = user?.id ? `${user.id}-${Date.now()}` : null;

    // Check if user just logged in (was null, now has ID) and we haven't reset scroll yet
    // Also check if this is a new session to prevent repeated resets
    if (!previousUserId && currentUserId && !hasResetScrollRef.current && 
        sessionIdRef.current !== currentSessionId) {
      // Only log in development mode to reduce console noise
      if (process.env.NODE_ENV === 'development') {
        log.debug('Auth', 'User logged in, resetting scroll position');
      }
      resetScrollForLogin();
      hasResetScrollRef.current = true;
      sessionIdRef.current = currentSessionId;
    }

    // Update previous user reference
    previousUserRef.current = currentUserId;
  }, [user?.id]);

  return { user, loading };
} 