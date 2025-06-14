import React, { memo } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useOptimizedAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

function SpaceProtectedRoute() {
  const { user, loading: authLoading } = useOptimizedAuth();
  const location = useLocation();

  // --------------------------------------------------------------------------
  // CRITICAL FIX: The Unambiguous Loading Gate
  // --------------------------------------------------------------------------
  // This is the most important part of the component. It ensures that we do
  // absolutely nothing until the authentication provider has determined if a
  // user is logged in or not. This prevents all race conditions.
  if (authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
            Authenticating...
          </p>
        </div>
      </div>
    );
  }
  
  // --------------------------------------------------------------------------
  // Unauthenticated State
  // --------------------------------------------------------------------------
  // If authentication is finished and there is no user, the user is not
  // logged in. Redirect them to the landing page, preserving the page they
  // intended to visit so we can redirect them back after login.
  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // --------------------------------------------------------------------------
  // Authenticated State
  // --------------------------------------------------------------------------
  // If we reach this point, the user is authenticated. We can now render
  // the actual protected content. The <Outlet> will render the child route
  // (e.g., the specific space page). The complex cache and trust token
  // logic that caused the race condition is now removed.
  return <Outlet />;
}

// Keep the component memoized for performance
const MemoizedSpaceProtectedRoute = memo(SpaceProtectedRoute);
export default MemoizedSpaceProtectedRoute; 