import { log } from '@/utils/logger';
/**
 * Path Restoration Component
 * 
 * Handles automatic restoration to the user's last visited path when they
 * return to the app, especially useful on mobile after backgrounding.
 */

import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOptimizedAuth } from '@/contexts/AuthContext';
import { 
  attemptPathRestoration, 
  markPathRestorationActive, 
  clearPathRestorationActive,
  getLastVisitedPath
} from '@/utils/pathRestoration';

interface PathRestorationProps {
  onRestorationComplete: (restored: boolean) => void;
}

export default function PathRestoration({ onRestorationComplete }: PathRestorationProps) {
  const { user, loading } = useOptimizedAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const restorationAttempted = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only attempt restoration once per session
    if (restorationAttempted.current) {
      return;
    }

    // Don't attempt restoration while auth is still loading
    if (loading) {
      return;
    }

    // Don't attempt restoration if no user
    if (!user) {
      log.debug('Component', '📍 [PathRestoration] No user, skipping restoration');
      onRestorationComplete(false);
      return;
    }

    // Don't attempt restoration on certain paths
    const currentPath = location.pathname;
    if (currentPath !== '/app') {
      log.debug('Component', '📍 [PathRestoration] Not on /app route, skipping restoration');
      onRestorationComplete(false);
      return;
    }

    // Check for explicit redirect intent first (highest priority)
    const explicitRedirect = sessionStorage.getItem('redirect_after_login');
    if (explicitRedirect) {
      log.debug('Component', '📍 [PathRestoration] Explicit redirect present, skipping restoration');
      onRestorationComplete(false);
      return;
    }

    // CRITICAL FIX: Skip path restoration for new OAuth users (no previous path to restore)
    const lastPath = getLastVisitedPath();
    if (!lastPath) {
      log.debug('Component', '📍 [PathRestoration] No previous path found, skipping restoration for new user');
      onRestorationComplete(false);
      return;
    }

    // Mark that we've attempted restoration
    restorationAttempted.current = true;

    // Set a timeout for restoration attempt (2 seconds max - reduced for better UX)
    timeoutRef.current = setTimeout(() => {
      log.debug('Component', '⏱️ [PathRestoration] Restoration timeout, proceeding with default flow');
      clearPathRestorationActive();
      onRestorationComplete(false);
    }, 2000);

    // Attempt path restoration
    const performRestoration = async () => {
      try {
        log.debug('Component', '📍 [PathRestoration] Attempting path restoration for user:', user.id);
        
        // Mark path restoration as active to prevent mobile session manager interference
        markPathRestorationActive();
        
        // CRITICAL FIX: Add timeout to attemptPathRestoration to prevent infinite hanging
        const restorationPromise = attemptPathRestoration(navigate, user.id);
        const timeoutPromise = new Promise<boolean>((_, reject) => 
          setTimeout(() => reject(new Error('Path restoration timeout')), 1500)
        );
        
        const restored = await Promise.race([restorationPromise, timeoutPromise]);
        
        // Clear timeout if restoration completed
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        
        // Clear active flag
        clearPathRestorationActive();
        
        if (restored) {
          log.debug('Component', '✅ [PathRestoration] Path restoration successful');
          onRestorationComplete(true);
        } else {
          log.debug('Component', '📍 [PathRestoration] No path to restore, proceeding with default flow');
          onRestorationComplete(false);
        }
      } catch (error) {
        log.error('Component', '❌ [PathRestoration] Restoration failed:', error);
        
        // Clear timeout on error
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        
        // Clear active flag on error
        clearPathRestorationActive();
        
        // CRITICAL FIX: Always complete restoration on error to prevent infinite loading
        onRestorationComplete(false);
      }
    };

    // Small delay to ensure component is settled
    const delayTimeout = setTimeout(performRestoration, 100);

    return () => {
      clearTimeout(delayTimeout);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [user, loading, navigate, location.pathname, onRestorationComplete]);

  // This component doesn't render anything
  return null;
} 