import { log } from '@/utils/logger';
import React, { useEffect, useState, Suspense } from 'react';
import { useLocation, useParams, Outlet, Navigate } from 'react-router-dom';
import BottomNav from '@/components/mobile/BottomNav';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { isMobile } from '@/utils/mobileDetection';
import SpaceShellLayout from './SpaceShellLayout';
import { Loader2 } from 'lucide-react';

// Import components directly to avoid lazy loading issues
import * as LazyRoutes from '@/routes/LazyRoutes';

/**
 * Truly Persistent Application Shell
 * 
 * This component renders ALL major route components simultaneously and controls
 * their visibility manually, completely bypassing React Router's unmounting behavior.
 * 
 * Key Innovation:
 * - All components (Chat, Space, Notifications) stay mounted
 * - Visibility controlled via CSS display property
 * - No component lifecycle interruption
 * - Fixes the feed tab re-rendering issue once and for all
 */
export const TrulyPersistentAppShell: React.FC = () => {
  const location = useLocation();
  const { user, loading: authLoading } = useOptimizedAuth();
  const { subdomain } = useParams<{ subdomain: string }>();
  const isOnMobile = isMobile();

  // Handle authentication for space routes
  const isSpaceRoute = location.pathname.match(/^\/[^\/]+\/space/);
  
  if (isSpaceRoute) {
    // If authentication is still loading, show loading screen
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
    
    // If not authenticated, redirect to landing page
    if (!user) {
      return <Navigate to="/" state={{ from: location }} replace />;
    }
  }


  // Track which components should be visible
  const [currentRoute, setCurrentRoute] = useState<'chat' | 'notifications' | 'space' | 'discover' | 'other'>('other');
  const [showTabs, setShowTabs] = useState(true); // Control tab visibility for mobile course views

  // Debug logging to track persistent shell lifecycle (only in development)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔥 [TrulyPersistentAppShell] Component mounted/remounted');
      return () => {
        console.log('❌ [TrulyPersistentAppShell] Component unmounted - THIS SHOULD NEVER HAPPEN!');
      };
    }
  }, []);

  // Listen for mobile course view state changes
  useEffect(() => {
    const handleMobileStateChange = (event: CustomEvent) => {
      const { showTabs: shouldShowTabs } = event.detail;
      setShowTabs(shouldShowTabs);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('📱 [TrulyPersistentAppShell] Mobile state changed:', { showTabs: shouldShowTabs });
      }
    };

    window.addEventListener('courseDetailMobileState', handleMobileStateChange as EventListener);
    
    return () => {
      window.removeEventListener('courseDetailMobileState', handleMobileStateChange as EventListener);
    };
  }, []);

  // Determine current route type and update state
  useEffect(() => {
    let routeType: 'chat' | 'notifications' | 'space' | 'discover' | 'other' = 'other';
    
    if (location.pathname.startsWith('/app/chat')) {
      routeType = 'chat';
    } else if (location.pathname.startsWith('/app/notifications') || location.pathname.startsWith('/notifs')) {
      routeType = 'notifications';
    } else if (location.pathname === '/discover') {
      routeType = 'discover';
    } else if (location.pathname.startsWith('/profile/')) {
      routeType = 'other'; // Profile routes use React Router
    } else if (location.pathname.match(/^\/[^\/]+\/space/) || location.pathname.match(/^\/[^\/]+\/course/)) {
      // ALL space routes AND course detail routes should be handled by the persistent shell
      // Only post detail pages need special handling
      const isPostDetail = location.pathname.match(/^\/[^\/]+\/space\/[^\/]+$/) && 
                          !location.pathname.endsWith('/classroom') &&
                          !location.pathname.endsWith('/calendar') &&
                          !location.pathname.endsWith('/members') &&
                          !location.pathname.endsWith('/leaderboard') &&
                          !location.pathname.endsWith('/about') &&
                          !location.pathname.endsWith('/search');
      
      const isDebugPage = location.pathname.includes('/debug');
      
      if (isPostDetail || isDebugPage) {
        routeType = 'other'; // Let React Router handle these normally
      } else {
        routeType = 'space'; // All standard space tabs AND course detail pages
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 [TrulyPersistentAppShell] Route change detected:', {
        pathname: location.pathname,
        oldRoute: currentRoute,
        newRoute: routeType,
        spaceVisible: routeType === 'space',
        discoverVisible: routeType === 'discover'
      });
    }
    
    setCurrentRoute(routeType);
  }, [location.pathname, currentRoute]);

  // Helper function to determine visibility
  const isRouteVisible = (routeType: string) => currentRoute === routeType;

  return (
    <div className="truly-persistent-app-shell min-h-screen bg-gray-50">
      {/* Chat Component - Always mounted, visibility controlled */}
      <div 
        style={{ display: isRouteVisible('chat') ? 'block' : 'none' }}
        className="route-container"
      >
        <Suspense fallback={<div>Loading chat...</div>}>
          <LazyRoutes.ChatPage />
        </Suspense>
      </div>

      {/* Notifications Component - Always mounted, visibility controlled */}
      <div 
        style={{ display: isRouteVisible('notifications') ? 'block' : 'none' }}
        className="route-container"
      >
        <Suspense fallback={<div>Loading notifications...</div>}>
          <LazyRoutes.NotificationsPage />
        </Suspense>
      </div>

      {/* Space Component - Always mounted for ALL space routes */}
      <div 
        style={{ display: isRouteVisible('space') ? 'block' : 'none' }}
        className="route-container"
      >
        <SpaceShellLayout showTabs={showTabs} />
      </div>

      {/* Discover Component - Always mounted, visibility controlled */}
      <div 
        style={{ display: isRouteVisible('discover') ? 'block' : 'none' }}
        className="route-container"
      >
        <Suspense fallback={<div>Loading discover...</div>}>
          <LazyRoutes.Discover />
        </Suspense>
      </div>

      {/* Other routes - React Router handles these normally */}
      <div 
        style={{ display: isRouteVisible('other') ? 'block' : 'none' }}
        className="route-container"
      >
        {/* This is where special routes like profile, etc. render */}
        <Outlet />
      </div>

      {/* Bottom navigation - always present on mobile */}
      {isOnMobile && (
        <div className="persistent-bottom-nav">
          <BottomNav />
        </div>
      )}

    </div>
  );
};

export default TrulyPersistentAppShell;