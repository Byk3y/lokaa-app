import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { parseProfileUrl } from "@/utils/profileRedirect";

/**
 * This component redirects from subdomain URLs to the appropriate pages
 * - If subdomain starts with @, redirect to the profile route
 * - If user is logged in, redirects to /:subdomain/space/feed for member access
 * - If user is not logged in, redirects to /:subdomain/about for public view
 */
export default function SpaceRedirect() {
  const { subdomain } = useParams<{ subdomain: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectAttempted = useRef(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Prevent infinite redirect loops
    if (redirectAttempted.current) {
      console.log('SpaceRedirect: Redirect already attempted, preventing loop');
      return;
    }
    
    // Skip if auth is still loading
    if (loading) {
      console.log('SpaceRedirect: Auth is still loading, waiting...');
      return;
    }
    
    // Set the flag to true to prevent future redirects
    redirectAttempted.current = true;
    
    if (!subdomain) {
      console.log('SpaceRedirect: No subdomain, redirecting to discover');
      navigate('/discover', { replace: true });
      return;
    }
    
    // Handle profile URLs (starting with @)
    if (subdomain.startsWith('@')) {
      const username = subdomain.substring(1);
      
      // Use React Router navigate instead of window.location to avoid potential loops
      console.log(`SpaceRedirect: Detected profile URL @${username}, redirecting via router`);
      navigate(`/@${username}`, { replace: true });
      return;
    }
    
    // Regular space routing
    try {
      if (user) {
        console.log(`SpaceRedirect: Redirecting to space feed: /${subdomain}/space/feed`);
        navigate(`/${subdomain}/space/feed`, { replace: true });
      } else {
        console.log(`SpaceRedirect: Redirecting to space about: /${subdomain}/about`);
        navigate(`/${subdomain}/about`, { replace: true });
      }
    } catch (err) {
      console.error('SpaceRedirect: Error during navigation:', err);
      setError('Navigation error. Please try refreshing the page.');
    }
  }, [subdomain, user, loading, navigate]);
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <p className="text-red-500 mb-3">{error}</p>
          <button 
            onClick={() => window.location.href = '/discover'} 
            className="px-4 py-2 bg-amber-600 text-white rounded-md"
          >
            Go to Discover
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600 mb-3" />
        <p className="text-gray-600">Redirecting to the correct page...</p>
      </div>
    </div>
  );
} 