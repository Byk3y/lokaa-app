import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

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
    consecutiveFailures: 0
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

  const signOut = useCallback(async () => {
    try {
      await getSupabaseClient().auth.signOut();
      queryClient.clear(); // Clear React Query cache
      navigate('/login');
      toast({
        title: 'Session Expired',
        description: 'Please sign in again to continue.',
        variant: 'destructive',
      });
    } catch (error) {
      console.error('Error signing out:', error);
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
      console.error('Error logging security event:', error);
    }
  }, []);

  const checkSessionHealth = useCallback(async () => {
    try {
      const { data: currentData } = await getSupabaseClient().auth.getSession();
      const now = Date.now();
      
      sessionHealthRef.current.lastCheck = now;

      if (!currentData.session) {
        sessionHealthRef.current.consecutiveFailures++;
        sessionHealthRef.current.lastError = 'No active session';
        
        await logSecurityEvent('session_health_fail', {
          reason: 'no_session',
          consecutive_failures: sessionHealthRef.current.consecutiveFailures
        });

        if (sessionHealthRef.current.consecutiveFailures >= 3) {
          options.onHealthCheckFail?.();
          await signOut();
        }
        return false;
      }

      // Check if session expires within 15 minutes
      const expiresAt = currentData.session.expires_at * 1000;
      if (expiresAt - now <= REFRESH_INTERVAL) {
        await refreshSession();
      }

      sessionHealthRef.current.consecutiveFailures = 0;
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

  const refreshSession = useCallback(async () => {
    if (isRefreshingRef.current) return;
    
    try {
      isRefreshingRef.current = true;
      sessionHealthRef.current.refreshAttempts++;
      
      // Get current session first to check if refresh needed
      const { data: currentData } = await getSupabaseClient().auth.getSession();
      if (!currentData.session) {
        throw new Error('No active session');
      }

      // Check if session expires within 15 minutes
      const expiresAt = currentData.session.expires_at * 1000;
      const now = Date.now();
      if (expiresAt - now > REFRESH_INTERVAL) {
        return; // No refresh needed yet
      }

      // Call auth/refresh Edge Function with CSRF token
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // CSRF token will be added by fetchWithCsrf
        },
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 440) {
          await logSecurityEvent('session_expired', {
            reason: 'refresh_440',
            attempts: sessionHealthRef.current.refreshAttempts
          });
          await signOut();
          return;
        }
        throw new Error(`Session refresh failed: ${response.statusText}`);
      }

      // Update Supabase session with new tokens
      const { session } = await response.json();
      await getSupabaseClient().auth.setSession(session);

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

    } catch (error) {
      console.error('Session refresh error:', error);
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