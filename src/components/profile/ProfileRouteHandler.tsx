import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Profile from '@/pages/Profile';
import { shouldAllowProfileRedirect, resetProfileRedirectCounter } from '@/shared/services/debug/profile-redirect';
import LoadingSpinner from '@/components/discover/LoadingSpinner';
import { getSupabaseClient } from '@/integrations/supabase/client';

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
  
  // Enhanced logging for debugging
  console.log('ProfileRouteHandler: Rendering with slug:', slug, 'Path:', location.pathname);
  
  // Reset redirect counter on mount
  useEffect(() => {
    resetProfileRedirectCounter();
    mountedRef.current = true;
    console.log('ProfileRouteHandler: Component mounted');
    
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
    console.log('ProfileRouteHandler: Initializing. Params from react-router:', params, 'Extracted slug:', slug);
  }, [params, slug]);
  
  // Check if slug exists in the database
  useEffect(() => {
    async function validateSlug() {
      if (!slug || isRedirecting || !mountedRef.current) return;
      
      try {
        console.log(`ProfileRouteHandler: Validating slug "${slug}" in database`);
        const { data, error } = await getSupabaseClient()
          .from('users')
          .select('id, profile_url, full_name')
          .eq('profile_url', slug)
          .single();
          
        if (error) {
          console.error(`ProfileRouteHandler: Error validating slug "${slug}":`, error);
        } else if (data) {
          console.log(`ProfileRouteHandler: Valid profile slug "${slug}" found for user:`, data.full_name);
        } else {
          console.error(`ProfileRouteHandler: No profile found for slug "${slug}"`);
        }
      } catch (err) {
        console.error('Error validating slug:', err);
      }
    }
    
    validateSlug();
  }, [slug]);
  
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
      
        console.log(`ProfileRouteHandler: Legacy URL pattern detected. Redirecting from /@${username} to /profile/${username}`);
      
      // Use the redirect protection utility
      if (shouldAllowProfileRedirect(username)) {
        setIsRedirecting(true);
        navigate(`/profile/${username}`, { replace: true });
      } else {
        console.warn(`ProfileRouteHandler: Prevented potential redirect loop to /profile/${username}`);
      }
      return;
    }
    
      console.log('ProfileRouteHandler: Slug determined as:', slug, '- proceeding to render Profile page.');
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