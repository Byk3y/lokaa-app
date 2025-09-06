/**
 * Smart Redirect with Path Restoration
 * 
 * This component first attempts path restoration, and if that fails or is not applicable,
 * falls back to the normal QuickSpaceRedirect logic.
 */

import { useState, Suspense } from 'react';
import { useOptimizedAuth } from '@/contexts/AuthContext';
import PathRestoration from './PathRestoration';
import { RouteLoadingFallback } from '@/routes/LazyRoutes';
import * as LazyRoutes from '@/routes/LazyRoutes';

export default function SmartRedirectWithPathRestoration() {
  const { user, loading } = useOptimizedAuth();
  const [restorationComplete, setRestorationComplete] = useState(false);
  const [restorationSuccessful, setRestorationSuccessful] = useState(false);

  const handleRestorationComplete = (restored: boolean) => {
    setRestorationSuccessful(restored);
    setRestorationComplete(true);
  };

  // Show loading while auth is loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" style={{ minHeight: '100vh' }}>
        <div className="flex flex-col items-center">
          <div className="animate-spin h-6 w-6 rounded-full border-t-2 border-b-2 border-teal-500 mb-2"></div>
          <p className="text-gray-500 text-sm">Authenticating...</p>
        </div>
      </div>
    );
  }

  // If no user, redirect to landing (this shouldn't happen due to ProtectedRoute)
  if (!user) {
    return <RouteLoadingFallback />;
  }

  // If restoration is not yet complete, show PathRestoration component
  if (!restorationComplete) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50" style={{ minHeight: '100vh' }}>
          <div className="flex flex-col items-center">
            <div className="animate-spin h-6 w-6 rounded-full border-t-2 border-b-2 border-teal-500 mb-2"></div>
            <p className="text-gray-500 text-sm">Restoring your session...</p>
          </div>
        </div>
        <PathRestoration onRestorationComplete={handleRestorationComplete} />
      </>
    );
  }

  // If restoration was successful, don't render QuickSpaceRedirect
  // (the user has already been navigated to their restored path)
  if (restorationSuccessful) {
    return null; // Don't render anything - user is already on the correct page
  }

  // If restoration failed or was not applicable, use the normal QuickSpaceRedirect
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <LazyRoutes.QuickSpaceRedirect />
    </Suspense>
  );
} 