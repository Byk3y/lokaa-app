import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { checkActiveSession } from "@/utils/directAuth";
import { useEffect, useState } from "react";

interface PublicRouteProps {
  component: React.ReactNode;
  redirectTo?: string;
  forcePublic?: boolean;
}

export default function PublicRoute({ component, redirectTo = "/discover", forcePublic = false }: PublicRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [isCheckingActiveSession, setIsCheckingActiveSession] = useState(false);
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [isDirectNavigation, setIsDirectNavigation] = useState(false);

  // Check if this is a direct navigation to the root URL
  useEffect(() => {
    const checkNavigationType = () => {
      // Consider it a direct navigation if we're on the root path and either:
      // 1. There's no referrer (typed URL/bookmark/external link)
      // 2. The referrer is from a different origin
      const isDirect = 
        location.pathname === "/" && 
        (!document.referrer || !document.referrer.includes(window.location.origin));
        
      console.log('PublicRoute: Navigation check:', {
        pathname: location.pathname,
        referrer: document.referrer,
        isDirect
      });
      
      setIsDirectNavigation(isDirect);
    };
    
    checkNavigationType();
  }, [location.pathname]);

  // Extra session check for root path to prevent auto-login bypass
  useEffect(() => {
    async function verifySession() {
      if (location.pathname === "/" && !user) {
        setIsCheckingActiveSession(true);
        try {
          const isActive = await checkActiveSession();
          console.log('PublicRoute: Additional session check result:', isActive);
          setHasActiveSession(isActive);
        } catch (error) {
          console.error('PublicRoute: Error in additional session check:', error);
        } finally {
          setIsCheckingActiveSession(false);
        }
      }
    }
    
    verifySession();
  }, [location.pathname, user]);

  console.log('PublicRoute Debug:', {
    user: user ? `logged in as ${user.email}` : 'not logged in',
    loading,
    redirectTo,
    forcePublic,
    pathname: location.pathname,
    hasActiveSession,
    isCheckingActiveSession,
    isDirectNavigation,
    component: component ? 'provided' : 'missing'
  });

  // Show loading indicator while checking auth status
  if (loading || isCheckingActiveSession) {
    console.log('PublicRoute: Still loading auth state...');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  // If direct navigation to root, show landing page regardless of auth state
  if (isDirectNavigation && location.pathname === "/") {
    console.log('PublicRoute: Direct navigation to root, showing landing page');
    return <>{component}</>;
  }

  // If user is authenticated or we have an active session at the root path, redirect appropriately
  // But only for non-direct navigations or non-root paths
  if ((user || (location.pathname === "/" && hasActiveSession)) && !forcePublic && !isDirectNavigation) {
    console.log('PublicRoute: User is authenticated, redirecting to:', redirectTo);
    // Use replace to prevent flashing of content
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  // If there's an active session but forcePublic is true, don't redirect but warn about it
  if ((user || (location.pathname === "/" && hasActiveSession)) && forcePublic && location.pathname === "/") {
    console.warn('PublicRoute: User is authenticated but showing public content due to forcePublic flag');
  }

  // If user is not authenticated or we're forcing public view, show the public content
  console.log('PublicRoute: Showing public content');
  return <>{component}</>;
} 