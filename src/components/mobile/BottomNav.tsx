import { log } from '@/utils/logger';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, MessageSquare, User, Bell } from 'lucide-react';
import NotificationBadge from '@/components/notifications/NotificationBadge';
import useSpaceSettingsStore, { trackRouteChange } from '@/hooks/useSpaceSettingsStore';
import { useEffect, useRef, useState, useMemo } from 'react';
import { useConversations } from '@/features/chat';
import { motion, AnimatePresence } from 'framer-motion';
import { useMobileBackgroundDetection } from '@/hooks/useMobileLifecycle';
import { shouldEnableMobileFeatures } from '@/utils/mobileDetection';
import { extractTabFromPathname } from '@/utils/tabUtils';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { migrationAdapter } from '@/utils/indexeddb/migration/MigrationAdapter';
import { navigateToProfileWithContext } from '@/utils/spaceContextUtils';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';
import { setPendingChatNavigation } from '@/utils/scrollPositionManager';
// ✅ FIXED: Removed PersistentTabManager - using standard React Router navigation

// Simple notification count badge component to avoid positioning issues
function NotificationCountBadge() {
  const { count } = useUnreadNotificationCount();

  if (count <= 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ 
          type: 'spring', 
          stiffness: 500, 
          damping: 30,
          duration: 0.2 
        }}
        className="absolute -top-2 -right-2 bg-red-500 text-white text-[11px] font-semibold rounded-full h-[18px] min-w-[18px] px-1 flex items-center justify-center border-2 border-[#171E2E]"
      >
        {count > 99 ? '99+' : count}
      </motion.div>
    </AnimatePresence>
  );
}

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { space } = useSpaceSettingsStore();
  const { user } = useOptimizedAuth();
  const { unreadCount } = useConversations();
  const previousPathRef = useRef(location.pathname);
  const { returnedFromBackground } = useMobileBackgroundDetection();
  
  // ✅ STABLE: Use stable mobile detection to prevent hook order issues
  const isMobile = shouldEnableMobileFeatures();
  
  // ✅ CONSISTENT: Always declare all hooks in the same order
  const [userProfileUrl, setUserProfileUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const pathname = location.pathname;
  
  // Fetch user's profile URL when component mounts
  useEffect(() => {
    const fetchUserProfileUrl = async () => {
      if (!user?.id) return;
      
      try {
        setIsLoading(true);
        const { data, error } = await migrationAdapter.getUserProfile(user.id, ['profile_url']);
        
        if (error) {
          log.error('Component', 'Error fetching user profile URL:', error);
          return;
        }
        
        if (data && data.profile_url) {
          setUserProfileUrl(data.profile_url);
        }
      } catch (error) {
        log.error('Component', 'Error fetching user profile URL:', error instanceof Error ? error : new Error(String(error)));
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfileUrl();
  }, [user?.id]);

  // Track route changes for cache optimization
  useEffect(() => {
    const currentPath = location.pathname;
    const previousPath = previousPathRef.current;
    
    if (currentPath !== previousPath) {
      trackRouteChange(previousPath, currentPath);
      previousPathRef.current = currentPath;
    }
  }, [location.pathname]);
  
  // **ENHANCED**: Detect if we're currently in a space
  const isInSpace = useMemo(() => pathname.includes('/space') && space?.subdomain, [pathname, space?.subdomain]);
  const currentTab = useMemo(() => isInSpace ? extractTabFromPathname(pathname) : null, [isInSpace, pathname]);
  
  const isActive = useMemo(() => (path: string) => {
    // Home button: active when in spaces or at root
    if (path === '/') {
      if (isInSpace) {
        return currentTab === 'feed' || (!currentTab && pathname.endsWith('/space'));
      }
      return pathname === '/' || (space?.subdomain && pathname === `/${space.subdomain}/space`);
    }
    
    // Chat button: active when on chat page
    if (path === '/app/chat') {
      return pathname === '/app/chat';
    }
    
    // Notifications button: active when on notifications page
    if (path === '/notifs') {
      return pathname === '/notifs' || pathname === '/app/notifications';
    }
    
    // Profile button: active when on user's own profile page (with or without space context) OR settings/profile
    if (path === '/profile') {
      // Check if on user's own profile page (ignoring query parameters for space context)
      if (userProfileUrl && pathname === `/profile/${userProfileUrl}`) {
        return true;
      }
      // Also check for settings profile page or any other profile page
      return pathname === '/settings/profile' || pathname.startsWith('/profile/');
    }
    
    // Other pages: use startsWith for flexibility
    return pathname.startsWith(path);
  }, [isInSpace, currentTab, pathname, space?.subdomain, userProfileUrl]);
  
  const handleHomeClick = () => {
    const fromRoute = location.pathname;
    
    // 🚨 FIX: Wait for space data to be available before navigating
    // This prevents navigation to '/' which causes page refresh and redirects
    const hasActiveSpace = space?.subdomain;
    
    if (hasActiveSpace) {
      const targetRoute = `/${space.subdomain}/space`;
      
      log.debug('Component', '🔄 [BottomNav] Navigating to space feed:', { from: fromRoute, to: targetRoute });
      
      trackRouteChange(fromRoute, targetRoute);
      
      // 🚀 REVOLUTIONARY FIX: Use persistent tab manager for space navigation
      // This prevents component unmounting when navigating from chat to space
      if (fromRoute === '/app/chat') {
        console.log('🔧 [BottomNav] Using standard React Router navigation for chat->space navigation');
        
        // Use standard React Router navigation to space feed
        navigate(`/${space.subdomain}/space`, {
          state: { preserveSpace: true, activeTab: 'feed' }
        });
      } else {
        // For other routes, use standard React Router navigation
        navigate(targetRoute);
      }
    } else {
      // 🚨 FIX: Don't navigate to '/' if space is loading - this causes page refresh!
      // Instead, try to get space from localStorage or wait
      try {
        const lastActiveSpace = localStorage.getItem('lastActiveSpace');
        if (lastActiveSpace) {
          const spaceData = JSON.parse(lastActiveSpace);
          if (spaceData?.subdomain) {
            const targetRoute = `/${spaceData.subdomain}/space`;
            log.debug('Component', '🔄 [BottomNav] Using cached space for navigation:', { from: fromRoute, to: targetRoute });
            trackRouteChange(fromRoute, targetRoute);
            navigate(targetRoute);
            return;
          }
        }
      } catch (e) {
        log.warn('Component', 'Failed to parse cached space data:', e);
      }
      
      // Only fall back to '/' if we truly have no space information
      log.warn('Component', '🚨 [BottomNav] No space data available - this might cause page refresh');
      const targetRoute = '/';
      trackRouteChange(fromRoute, targetRoute);
      navigate(targetRoute);
    }
  };

  const handleNavigation = (route: string) => {
    const fromRoute = location.pathname;
    trackRouteChange(fromRoute, route);
    navigate(route);
  };

  // Navigate to chat page (now wrapped in UnifiedAppLayout to prevent unmounting)
  const handleChatClick = () => {
    const fromRoute = location.pathname;
    log.debug('Component', '🔄 [BottomNav] Navigating to chat page from:', fromRoute);
    
    // ✅ CRITICAL FIX: Set pending chat navigation to prevent scroll resets
    setPendingChatNavigation(true);
    console.log('🔍 [BottomNav] Set pending chat navigation - chat tab clicked');
    
    trackRouteChange(fromRoute, '/app/chat');
    navigate('/app/chat');
  };

  // Navigate to user's public profile with space context
  const handleProfileClick = () => {
    const fromRoute = location.pathname;
    
    if (userProfileUrl) {
      // Use navigateToProfileWithContext to automatically detect current space and add ?space= query parameter
      log.debug('Component', '🔄 [BottomNav] Navigating to user profile with space context:', { from: fromRoute, profileUrl: userProfileUrl });
      trackRouteChange(fromRoute, `/profile/${userProfileUrl}`);
      navigateToProfileWithContext(userProfileUrl, navigate);
    } else {
      // Fallback to settings if user doesn't have a profile URL yet
      log.debug('Component', '🔄 [BottomNav] No profile URL found, falling back to settings');
      const fallbackRoute = '/settings/profile';
      trackRouteChange(fromRoute, fallbackRoute);
      navigate(fallbackRoute);
    }
  };

  const navItems = useMemo(() => [
    { path: '/', label: 'Home', icon: Home, onClick: handleHomeClick },
    { path: '/app/chat', label: 'Chat', icon: MessageSquare, onClick: handleChatClick, unreadCount },
    { path: '/notifs', label: 'Notifications', icon: Bell, notification: true, isNotificationBadge: true },
    { path: '/profile', label: 'Profile', icon: User, onClick: handleProfileClick, notification: true },
  ], [handleHomeClick, handleChatClick, handleProfileClick, unreadCount]);

  // ✅ SKOOL-STYLE: Keep bottom nav always visible - no hiding when keyboard opens
  // Input will overlay on top of nav instead of nav disappearing
  
  return (
    <div 
      className="fixed bottom-0 left-0 right-0 w-full z-50 sm:hidden bg-[#171E2E]/95 backdrop-blur-lg pb-[env(safe-area-inset-bottom)]"
      style={{
        // Use the actual screen height instead of viewport height to prevent movement
        position: 'fixed',
        bottom: 0,
      }}
    >
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            
            // Special handling for notification badge to match other nav items
            if (item.isNotificationBadge) {
              return (
                <button
                  key={item.label}
                  className="relative flex-1 h-full min-w-14 min-h-14 flex items-center justify-center transition-colors duration-200"
                  onClick={() => handleNavigation('/notifs')}
                >
                  <div className="relative">
                    <Bell
                      className={`w-[26px] h-[26px] transition-colors ${
                        active ? 'text-white' : 'text-gray-400'
                      }`}
                    />
                    {/* Simple notification count badge - no extra wrapper component */}
                    <NotificationCountBadge />
                  </div>
                </button>
              );
            }
            
            return (
              <button
                key={item.label}
                className="relative flex-1 h-full min-w-14 min-h-14 flex items-center justify-center transition-colors duration-200"
                onClick={item.onClick}
              >
              {/* Generic notification dot for other items (except notification badge) */}
              {item.notification && !item.unreadCount && !item.isNotificationBadge && (
                  <span className="absolute top-4 right-1/2 translate-x-[12px] w-2 h-2 bg-blue-500 rounded-full border-2 border-[#171E2E]"></span>
                )}
              
              <div className="relative">
                <Icon
                  className={`w-[26px] h-[26px] transition-colors ${
                    active ? 'text-white' : 'text-gray-400'
                  }`}
                />
                {/* Chat unread count badge */}
                <AnimatePresence>
                  {item.label === 'Chat' && item.unreadCount && item.unreadCount > 0 && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0, y: 5 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30, duration: 0.2 }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white text-[11px] font-semibold rounded-full h-[18px] min-w-[18px] px-1 flex items-center justify-center border-2 border-[#171E2E]"
                    >
                      {item.unreadCount > 99 ? '99+' : item.unreadCount}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </button>
            );
          })}
        </div>
    </div>
  );
}