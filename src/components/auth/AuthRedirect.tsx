import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCreatorStatus } from "../../hooks/useCreatorStatus";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

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
  const { user, loading } = useAuth();
  const location = useLocation();
  const { data: creatorCommunity, isLoading: isLoadingCreator } = useCreatorStatus();
  const navigate = useNavigate();

  console.log('AuthRedirect Debug:', {
    user: !!user,
    loading,
    requireAuth,
    creatorCommunity,
    isLoadingCreator,
    currentPath: location.pathname
  });

  useEffect(() => {
    const handleAuthRedirect = async () => {
      try {
        // Get the auth code from the URL
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        
        if (!code) {
          console.error("No code found in URL");
          navigate('/login');
          return;
        }

        // Exchange the code for a session
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        
        if (error) {
          console.error("Error exchanging code for session:", error);
          navigate('/login');
          return;
        }

        console.log("Successfully authenticated");
        
        // Redirect to the discover page
        navigate('/discover', { replace: true });
      } catch (err) {
        console.error("Error in auth redirect:", err);
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
    console.log('Redirecting to:', redirectTo);
    return <Navigate to={redirectTo} replace />;
  }

  // In all other cases, render the child routes
  return <Outlet />;
}
