import { log } from '@/utils/logger';
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getSupabaseClient } from "@/integrations/supabase/client";

interface AuthRedirectProps {
  requireAuth?: boolean;
  redirectTo?: string;
}

/**
 * Component that redirects users based on their authentication status
 * - requireAuth=true: Redirects unauthenticated users to login
 * - requireAuth=false: Redirects authenticated users to dashboard
 */
export default function AuthRedirect({ requireAuth = true, redirectTo = "/" }: AuthRedirectProps) {
  const { user, loading } = useOptimizedAuth();
  const location = useLocation();
  const navigate = useNavigate();

  log.debug('Component', 'AuthRedirect Debug:', {
    user: !!user,
    loading,
    requireAuth,
    currentPath: location.pathname
  });

  useEffect(() => {
    const handleAuthRedirect = async () => {
      try {
        // Get the auth code from the URL
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        
        if (!code) {
          log.error('Component', "No code found in URL");
          navigate('/login');
          return;
        }

        // Exchange the code for a session
        const { error } = await getSupabaseClient().auth.exchangeCodeForSession(code);
        
        if (error) {
          log.error('Component', "Error exchanging code for session:", error);
          navigate('/login');
          return;
        }

        log.debug('Component', "Successfully authenticated");
        
        // FIXED: Redirect to /app for smart space detection instead of directly to discover
        log.debug('Component', '🚀 [AuthRedirect] Directing to /app for smart space redirection');
        navigate('/app', { replace: true });
      } catch (err) {
        log.error('Component', "Error in auth redirect:", err);
        navigate('/login');
      }
    };

    handleAuthRedirect();
  }, [navigate]);

  // If we require auth and user is not logged in, redirect to login
  if (requireAuth && !user && !loading) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If we don't require auth and user is logged in
  if (!requireAuth && user) {
    // Redirect to discover page regardless of creator status
    log.debug('Component', 'Redirecting to:', redirectTo);
    return <Navigate to={redirectTo} replace />;
  }

  // In all other cases, render the child routes
  return <Outlet />;
}
