import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import BottomNav from '@/components/mobile/BottomNav';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { isMobile } from '@/utils/mobileDetection';

/**
 * Persistent Application Shell
 * 
 * This component stays mounted across ALL major routes (/app/chat, /:subdomain/space, /app/notifications)
 * preventing any remounting and maintaining application state.
 * 
 * Key Benefits:
 * - Eliminates Chat→Space remounting issues
 * - Maintains space context across navigation
 * - Provides consistent bottom navigation
 * - Skool-style route persistence
 */
export const PersistentAppShell: React.FC = () => {
  const location = useLocation();
  const { user } = useOptimizedAuth();
  const isOnMobile = isMobile();

  // Track route changes for debugging
  useEffect(() => {
    console.log('🔄 [PersistentAppShell] Route changed to:', location.pathname);
  }, [location.pathname]);

  // Determine current route type for potential optimizations
  const routeType = React.useMemo(() => {
    if (location.pathname.startsWith('/app/chat')) return 'chat';
    if (location.pathname.startsWith('/app/notifications')) return 'notifications';
    if (location.pathname.match(/^\/[^\/]+\/space/)) return 'space';
    return 'other';
  }, [location.pathname]);

  return (
    <div className="persistent-app-shell min-h-screen bg-gray-50">
      {/* Main content area - this is where routes render */}
      <div className="persistent-content">
        <Outlet />
      </div>

      {/* Bottom navigation - always present on mobile */}
      {isOnMobile && (
        <div className="persistent-bottom-nav">
          <BottomNav />
        </div>
      )}

      {/* Route-specific optimizations could go here */}
      {routeType === 'space' && (
        <div className="space-optimizations">
          {/* Space-specific persistent elements */}
        </div>
      )}
    </div>
  );
};

export default PersistentAppShell; 