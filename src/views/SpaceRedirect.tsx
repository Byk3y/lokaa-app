import { log } from '@/utils/logger';
import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
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
  const { user, loading } = useOptimizedAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectAttempted = useRef(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Prevent infinite redirect loops
    if (redirectAttempted.current) {
      log.debug('Page', 'SpaceRedirect: Redirect already attempted, preventing loop');
      return;
    }
    
    // Skip if auth is still loading
    if (loading) {
      return;
    }
    
    // Check for malformed URLs that could cause routing issues
    const currentPath = location.pathname;
    if (currentPath.includes('/space/space')) {
      log.warn('Page', 'SpaceRedirect: Detected malformed URL with /space/space duplication:', currentPath);
      const correctedPath = currentPath.replace(/\/space\/space/g, '/space');
      navigate(correctedPath, { replace: true });
      return;
    }
    
    // If subdomain is not yet resolved or is the placeholder, wait for a re-render.
    // If auth has loaded and subdomain is still undefined/null (not the placeholder), redirect to discover.
    if (!subdomain || subdomain === ":subdomain") {
      log.debug('Page', `SpaceRedirect: Subdomain ('${subdomain}') not yet resolved or is placeholder, waiting or redirecting...`);
      if (subdomain === ":subdomain") {
        return; // Wait for router to provide the actual subdomain
      }
      // If !subdomain (i.e., null/undefined) and auth has loaded, then it's an invalid path.
      navigate('/discover', { replace: true });
      return;
    }

    // Validate subdomain format to prevent problematic routing
    if (subdomain && (subdomain === 'space' || subdomain.includes('/') || subdomain.length < 1)) {
      log.warn('Page', 'SpaceRedirect: Invalid subdomain format detected:', subdomain);
      setError('Invalid URL format');
      return;
    }

    // Set the flag to true to prevent future redirects ONLY if we have a valid subdomain
    redirectAttempted.current = true;
    
    if (!subdomain) {
      log.debug('Page', 'SpaceRedirect: No subdomain, redirecting to discover');
      navigate('/discover', { replace: true });
      return;
    }
    
    // Handle profile URLs (starting with @)
    if (subdomain.startsWith('@')) {
      const profileUrl = subdomain.substring(1);
      log.debug('Page', 'SpaceRedirect Profile Check: current location.pathname:', JSON.stringify(location.pathname));
      log.debug('Page', 'SpaceRedirect Profile Check: constructed path:', JSON.stringify(`/profile/${profileUrl}`));
      log.debug('Page', 'SpaceRedirect Profile Check: subdomain:', JSON.stringify(subdomain));

      if (location.pathname === `/profile/${profileUrl}`) {
        log.debug('Page', 'SpaceRedirect: Already on profile route, effect is returning (no navigation).');
        return;
      }

      log.debug('Page', `SpaceRedirect: Detected profile URL @${profileUrl}, redirecting to /profile/${profileUrl} via router`);
      navigate(`/profile/${profileUrl}`, { replace: true });
      return;
    }
    
    // Regular space routing
    try {
      if (user) {
        log.debug('Page', `SpaceRedirect: Redirecting to space root: /${subdomain}/space`);
        navigate(`/${subdomain}/space`, { replace: true });
      } else {
        log.debug('Page', `SpaceRedirect: Redirecting to space about: /${subdomain}/about`);
        navigate(`/${subdomain}/about`, { replace: true });
      }
    } catch (err) {
      log.error('Page', 'SpaceRedirect: Error during navigation:', err);
      setError('Navigation error. Please try refreshing the page.');
    }
  }, [subdomain, user, loading, navigate, location.pathname]);
  
  if (subdomain && subdomain.startsWith('@') && location.pathname === `/profile/${subdomain.substring(1)}`) {
    log.debug('Page', 'SpaceRedirect: Render check - on correct profile page, rendering null.');
    return null;
  }

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

/**
 * Wrapper component that validates subdomain before proceeding with SpaceRedirect
 * This prevents the /:subdomain route from matching empty paths like "/"
 */
export function SpaceRedirectWithValidation() {
  const { subdomain } = useParams<{ subdomain: string }>();
  const navigate = useNavigate();
  
  // If subdomain is empty, undefined, or just whitespace, redirect to root
  if (!subdomain || subdomain.trim() === '') {
    log.debug('Page', 'SpaceRedirectWithValidation: Empty subdomain detected, redirecting to /');
    navigate('/', { replace: true });
    return null;
  }
  
  // If subdomain is valid, proceed with normal SpaceRedirect
  return <SpaceRedirect />;
}
