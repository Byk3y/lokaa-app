import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Profile from '@/pages/Profile';

/**
 * This component handles the profile route with the slug parameter
 * and includes better debug logging
 */
export default function ProfileRouteHandler() {
  const params = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const slug = params.slug;
  
  // Enhanced logging for debugging
  console.log('ProfileRouteHandler: Initializing. Params from react-router:', JSON.stringify(params), 'Extracted slug:', slug);
  
  useEffect(() => {
    if (!slug) {
      console.error('ProfileRouteHandler: Slug is undefined or empty. Params were:', JSON.stringify(params), '. Navigating to /discover.');
      navigate('/discover', { replace: true });
      return;
    }
    console.log('ProfileRouteHandler: Slug determined as:', slug, '- proceeding to render Profile page.');
  }, [slug, navigate, params]);
  
  if (!slug) {
    // This check prevents rendering Profile if slug is not available (e.g., during redirect by useEffect)
    return null;
  }
  
  // Profile component likely uses useParams() itself or gets slug via context/store
  return <Profile />;
} 