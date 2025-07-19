import { log } from '@/utils/logger';
import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { clearAllAuthTokens, validateAuthSession } from '@/utils/auth/authTokenUtils';

// 15 minutes in milliseconds
const REFRESH_INTERVAL = 15 * 60 * 1000;

// 5 minutes in milliseconds - check session health more frequently
const HEALTH_CHECK_INTERVAL = 5 * 60 * 1000;

interface UseSecureSessionOptions {
  onSessionExpired?: () => void;
  onRefreshError?: (error: Error) => void;
  onHealthCheckFail?: () => void;
}

interface SessionHealth {
  lastCheck: number;
  lastRefresh: number;
  refreshAttempts: number;
  consecutiveFailures: number;
  lastError?: string;
  // Phase 4: Enhanced session health tracking
  lastValidation: number;
  validationAttempts: number;
}

export function useSecureSession(options: UseSecureSessionOptions = {}) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const refreshTimerRef = useRef<NodeJS.Timeout>();
  const healthCheckTimerRef = useRef<NodeJS.Timeout>();
  const isRefreshingRef = useRef(false);
  const sessionHealthRef = useRef<SessionHealth>({
    lastCheck: Date.now(),
    lastRefresh: Date.now(),
    refreshAttempts: 0,
    consecutiveFailures: 0,
    // Phase 4: Enhanced session health tracking
    lastValidation: Date.now(),
    validationAttempts: 0
  });

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
      if (healthCheckTimerRef.current) {
        clearInterval(healthCheckTimerRef.current);
      }
    };
  }, []);

  // Phase 4: Enhanced signOut with authTokenUtils integration
  const signOut = useCallback(async () => {
    try {
      log.debug('Hook', '🚪 [SecureSession] Enhanced signOut with token cleanup...');
      
      // Phase 4: Clear all auth tokens before signing out
      await clearAllAuthTokens(false);
      
      await getSupabaseClient().auth.signOut();
      queryClient.clear(); // Clear React Query cache
      navigate('/login');
      toast({
        title: 'Session Expired',
        description: 'Please sign in again to continue.',
        variant: 'destructive',
      });
      
      log.debug('Hook', '✅ [SecureSession] Enhanced signOut completed');
    } catch (error) {
      log.error('Hook', '❌ [SecureSession] Error during enhanced signOut:', error);
    }
  }, [navigate, queryClient, toast]);

  const logSecurityEvent = useCallback(async (eventType: string, eventData: any) => {
    try {
      const supabase = getSupabaseClient();
      await supabase.from('analytics_events').insert({
        event_type: `security.${eventType}`,
        event_data: eventData
      });
    } catch (error) {
      log.error('Hook', 'Error logging security event:', error);
    }
  }, []);

  // Phase 4: Enhanced session refresh with better validation
  const refreshSession = useCallback(async () => {
    if (isRefreshingRef.current) return;
    
    try {
      isRefreshingRef.current = true;
      sessionHealthRef.current.refreshAttempts++;
      
      log.debug('Hook', '🔄 [SecureSession] Phase 4: Enhanced session refresh...');
      
      // Phase 4: Use Supabase's built-in refresh instead of custom endpoint
      const { data, error } = await getSupabaseClient().auth.refreshSession();
      
      if (error) {
        if (error.message.includes('refresh_token_not_found') || error.message.includes('Invalid refresh token')) {
          await logSecurityEvent('session_expired', {
            reason: 'invalid_refresh_token',
            attempts: sessionHealthRef.current.refreshAttempts
          });
          await signOut();
          return;
        }
        throw error;
      }

      if (!data.session) {
        throw new Error('Session refresh returned no session');
      }

      // Reset all React Query cache timestamps to trigger refetches
      queryClient.invalidateQueries();

      // Update session health
      sessionHealthRef.current.lastRefresh = Date.now();
      sessionHealthRef.current.refreshAttempts = 0;
      sessionHealthRef.current.consecutiveFailures = 0;

      await logSecurityEvent('session_refresh', {
        success: true,
        timestamp: Date.now()
      });

      log.debug('Hook', '✅ [SecureSession] Session refresh completed successfully');

    } catch (error) {
      log.error('Hook', '❌ [SecureSession] Session refresh error:', error);
      options.onRefreshError?.(error as Error);
      
      await logSecurityEvent('session_refresh_fail', {
        error: (error as Error).message,
        attempts: sessionHealthRef.current.refreshAttempts
      });
      
      if ((error as Error).message.includes('No active session')) {
        await signOut();
      }
    } finally {
      isRefreshingRef.current = false;
    }
  }, [queryClient, signOut, options, logSecurityEvent]);

  // Phase 4: Enhanced session health check with validation
  const checkSessionHealth = useCallback(async () => {
    try {
      log.debug('Hook', '🔍 [SecureSession] Phase 4: Enhanced session health check...');
      
      const now = Date.now();
      sessionHealthRef.current.lastCheck = now;
      sessionHealthRef.current.validationAttempts++;

      // Phase 4: Use enhanced validation from authTokenUtils
      const validationResult = await validateAuthSession();
      
      if (!validationResult.isValid) {
        sessionHealthRef.current.consecutiveFailures++;
        sessionHealthRef.current.lastError = 'Session validation failed';
        
        // Clean up any inconsistent keys found
        if (validationResult.hasInconsistentKeys) {
          log.debug('Hook', '🧹 [SecureSession] Cleaning up inconsistent auth keys...');
          await clearAllAuthTokens(true); // Preserve Supabase keys during health check
        }
        
        await logSecurityEvent('session_health_fail', {
          reason: 'validation_failed',
          consecutive_failures: sessionHealthRef.current.consecutiveFailures,
          has_inconsistent_keys: validationResult.hasInconsistentKeys
        });

        if (sessionHealthRef.current.consecutiveFailures >= 3) {
          options.onHealthCheckFail?.();
          await signOut();
        }
        return false;
      }

      // Check session expiration and refresh if needed
      const { data: currentData } = await getSupabaseClient().auth.getSession();
      if (currentData.session) {
        const expiresAt = currentData.session.expires_at * 1000;
        if (expiresAt - now <= REFRESH_INTERVAL) {
          log.debug('Hook', '🔄 [SecureSession] Session expires soon, refreshing...');
          await refreshSession();
        }
      }

      sessionHealthRef.current.consecutiveFailures = 0;
      sessionHealthRef.current.lastValidation = now;
      
      log.debug('Hook', '✅ [SecureSession] Session health check passed');
      return true;
    } catch (error) {
      sessionHealthRef.current.consecutiveFailures++;
      sessionHealthRef.current.lastError = (error as Error).message;
      
      await logSecurityEvent('session_health_fail', {
        reason: 'check_error',
        error: (error as Error).message,
        consecutive_failures: sessionHealthRef.current.consecutiveFailures
      });

      if (sessionHealthRef.current.consecutiveFailures >= 3) {
        options.onHealthCheckFail?.();
        await signOut();
      }
      return false;
    }
  }, [signOut, refreshSession, logSecurityEvent, options]);

  // Set up automatic refresh interval
  useEffect(() => {
    refreshTimerRef.current = setInterval(refreshSession, REFRESH_INTERVAL);
    healthCheckTimerRef.current = setInterval(checkSessionHealth, HEALTH_CHECK_INTERVAL);
    
    // Initial checks
    refreshSession();
    checkSessionHealth();
    
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
      if (healthCheckTimerRef.current) {
        clearInterval(healthCheckTimerRef.current);
      }
    };
  }, [refreshSession, checkSessionHealth]);

  // Fetch wrapper with CSRF protection
  const fetchWithCsrf = useCallback(async (url: string, options: RequestInit = {}) => {
    if (options.method && options.method !== 'GET') {
      // Get CSRF token from auth/csrf endpoint
      const csrfResponse = await fetch('/api/auth/csrf');
      if (!csrfResponse.ok) {
        await logSecurityEvent('csrf_token_fail', {
          url,
          status: csrfResponse.status,
          error: await csrfResponse.text()
        });
        throw new Error('Failed to get CSRF token');
      }
      const { token } = await csrfResponse.json();

      // Add CSRF token to headers
      options.headers = {
        ...options.headers,
        'X-CSRF-Token': token,
      };
    }

    const response = await fetch(url, {
      ...options,
      credentials: 'include', // Always send cookies
    });

    // Handle 401/440 errors
    if (response.status === 401 || response.status === 440) {
      await logSecurityEvent('auth_error', {
        url,
        status: response.status
      });

      try {
        await refreshSession();
        // Retry the original request
        return fetch(url, {
          ...options,
          credentials: 'include',
        });
      } catch (error) {
        await signOut();
        throw error;
      }
    }

    return response;
  }, [refreshSession, signOut, logSecurityEvent]);

  return {
    refreshSession,
    fetchWithCsrf,
    checkSessionHealth,
    getSessionHealth: () => ({ ...sessionHealthRef.current }),
  };
} 