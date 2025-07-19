import { log } from '@/utils/logger';
import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import SpaceRedirect from '@/pages/SpaceRedirect';

export default function SubdomainRouteHandler() {
  const { subdomain } = useParams<{ subdomain: string }>();

  if (subdomain && subdomain.startsWith('@')) {
    const actualSlug = subdomain.substring(1);
    // If the subdomain starts with '@', it's a profile path.
    // Navigate to the canonical profile URL. This ensures that the correct route
    // in App.tsx handles it, and ProfileRouteHandler gets its slug via useParams.
    log.debug('App', `SubdomainRouteHandler: Detected profile-like subdomain "${subdomain}". Navigating to /profile/${actualSlug} (diagnostic path)`);
    return <Navigate to={`/profile/${actualSlug}`} replace />;
  }

  // If it's a regular subdomain, render SpaceRedirect
  return <SpaceRedirect />;
} 