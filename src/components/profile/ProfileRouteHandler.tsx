import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Profile from '@/pages/Profile';
import { shouldAllowProfileRedirect, resetProfileRedirectCounter } from '@/utils/profileFix';
import LoadingSpinner from '@/components/discover/LoadingSpinner';

/**
 * This component handles the profile route with the slug parameter
 * and includes better debug logging for different URL patterns
 */
export default function ProfileRouteHandler() {
  const params = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const slug = params.slug;
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isStable, setIsStable] = useState(false);
  const mountedRef = useRef(false);
  const processedSlug = useRef<string | null>(null);
  
  // Reset redirect counter on mount
  useEffect(() => {
    resetProfileRedirectCounter();
    mountedRef.current = true;
    
    // Give the component time to stabilize
    const timer = setTimeout(() => {
      if (mountedRef.current) {
        setIsStable(true);
      }
    }, 100);
    
    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
    };
  }, []);
  
  // Enhanced logging for debugging - only in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('ProfileRouteHandler: Initializing. Params from react-router:', JSON.stringify(params), 'Extracted slug:', slug);
    }
  }, [params, slug]);
  
  useEffect(() => {
    // Skip if already processed this slug, already redirecting, or not mounted
    if (processedSlug.current === slug || isRedirecting || !mountedRef.current) return;
    
    processedSlug.current = slug;
    
    if (!slug) {
      console.error('ProfileRouteHandler: Slug is undefined or empty. Navigating to /discover.');
      setIsRedirecting(true);
      navigate('/discover', { replace: true });
      return;
    }

    // Handle legacy @username format
    if (location.pathname.startsWith('/@') && !location.pathname.startsWith('/profile/')) {
      const username = location.pathname.substring(2); // Remove the '@' prefix
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`ProfileRouteHandler: Legacy URL pattern detected. Redirecting from /@${username} to /profile/${username}`);
      }
      
      // Use the redirect protection utility
      if (shouldAllowProfileRedirect(username)) {
        setIsRedirecting(true);
        navigate(`/profile/${username}`, { replace: true });
      } else {
        console.warn(`ProfileRouteHandler: Prevented potential redirect loop to /profile/${username}`);
      }
      return;
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('ProfileRouteHandler: Slug determined as:', slug, '- proceeding to render Profile page.');
    }
  }, [slug, navigate, params, location.pathname, isRedirecting]);
  
  // If redirecting or not yet stable, show loading
  if (isRedirecting || !isStable) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F9FAFB]">
        <div className="text-center">
          <LoadingSpinner />
          <p className="text-gray-600 mt-4">{isRedirecting ? "Redirecting..." : "Loading profile..."}</p>
        </div>
      </div>
    );
  }
  
  // No slug, show error
  if (!slug) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F9FAFB]">
        <div className="text-center">
          <p className="text-red-600 font-medium">Profile not found</p>
          <button 
            onClick={() => navigate('/app')} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }
  
  // Profile component likely uses useParams() itself or gets slug via context/store
  return <Profile key={`profile-route-${slug}`} />;
} 