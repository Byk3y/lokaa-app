import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Profile from '@/pages/Profile';

/**
 * This component handles the profile route with the slug parameter
 * and includes better debug logging
 */
export default function ProfileRouteHandler() {
  const { slug } = useParams();
  const navigate = useNavigate();
  
  // Enhanced logging for debugging
  console.log('ProfileRouteHandler: Handling profile for slug:', {
    slug,
    type: typeof slug,
    exists: !!slug,
    pathname: window.location.pathname
  });
  
  useEffect(() => {
    if (!slug) {
      console.error('ProfileRouteHandler: No slug parameter found');
      navigate('/discover', { replace: true });
      return;
    }
  }, [slug, navigate]);
  
  // Just render the Profile component directly
  return <Profile />;
} 