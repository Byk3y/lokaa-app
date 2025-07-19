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
  const { user, loading, error } = useAuthFromContext();
  const previousUserRef = useRef<string | null>(null);

  // Handle scroll position reset on login
  useEffect(() => {
    const currentUserId = user?.id || null;
    const previousUserId = previousUserRef.current;

    // Check if user just logged in (was null, now has ID)
    if (!previousUserId && currentUserId) {
      log.debug('Auth', 'User logged in, resetting scroll position');
      resetScrollForLogin();
    }

    // Update previous user reference
    previousUserRef.current = currentUserId;
  }, [user?.id]);

  return { user, loading, error };
} 