import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface AuthRedirectProps {
  children?: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

/**
 * Component that redirects users based on their authentication status
 * - requireAuth=true: Redirects unauthenticated users to login
 * - requireAuth=false: Redirects authenticated users to dashboard
 */
const AuthRedirect = ({ 
  children, 
  requireAuth = false, 
  redirectTo 
}: AuthRedirectProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-lokaa-600" />
      </div>
    );
  }

  // If auth is required and user isn't logged in, redirect to login
  if (requireAuth && !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If page is for non-authenticated users only and user is logged in
  if (!requireAuth && user && redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  // Otherwise, render the children or outlet
  return children ? <>{children}</> : <Outlet />;
};

export default AuthRedirect;
