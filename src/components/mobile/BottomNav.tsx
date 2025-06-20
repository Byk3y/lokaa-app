import { useLocation, useNavigate } from 'react-router-dom';
import { Home, MessageSquare, User, Bell } from 'lucide-react';
import useSpaceSettingsStore, { trackRouteChange } from '@/hooks/useSpaceSettingsStore';
import { useEffect, useRef, useState } from 'react';
import { useConversations } from '@/features/chat';
import { motion, AnimatePresence } from 'framer-motion';
import { useMobileBackgroundDetection } from '@/hooks/useMobileLifecycle';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { extractTabFromPathname } from '@/utils/tabUtils';

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { space } = useSpaceSettingsStore();
  const { unreadCount } = useConversations();
  const previousPathRef = useRef(location.pathname);
  const { returnedFromBackground } = useMobileBackgroundDetection();
  const isMobile = useMediaQuery("(max-width: 640px)");
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  const pathname = location.pathname;
  
  // Mobile keyboard detection
  useEffect(() => {
    if (!isMobile) return;

    const handleResize = () => {
      // On mobile, when keyboard opens, the visual viewport height decreases
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const windowHeight = window.screen.height;
      
      // If viewport height is significantly smaller than screen height, keyboard is likely open
      const keyboardThreshold = windowHeight * 0.75;
      const keyboardIsOpen = viewportHeight < keyboardThreshold;
      
      setIsKeyboardOpen(keyboardIsOpen);
    };

    // Listen to visual viewport changes (better for keyboard detection)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      return () => window.visualViewport?.removeEventListener('resize', handleResize);
    } else {
      // Fallback for older browsers
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [isMobile]);
  
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
  const isInSpace = pathname.includes('/space') && space?.subdomain;
  const currentTab = isInSpace ? extractTabFromPathname(pathname) : null;
  
  const isActive = (path: string) => {
    // Special handling for home button in spaces
    if (path === '/' && isInSpace) {
      // In a space, home button is active when on feed tab
      return currentTab === 'feed' || (!currentTab && pathname.endsWith('/space'));
    }
    
    // Exact match for root, startsWith for others
    if (path === '/') {
        // Handle space-specific home vs generic home
        const spaceHomePath = `/${space?.subdomain}/space`;
        return pathname === '/' || pathname === spaceHomePath;
    }
    return pathname.startsWith(path);
  };
  
  // **SIMPLE FIX**: Use standard navigation with global tab component manager protection
  const handleHomeClick = () => {
    const fromRoute = location.pathname;
    
    // Check if we have an active space
    const hasActiveSpace = space?.subdomain;
    
    if (hasActiveSpace) {
      const targetRoute = `/${space.subdomain}/space`;
      
      console.log('🔄 [BottomNav] Navigating to space feed:', { from: fromRoute, to: targetRoute });
      
      trackRouteChange(fromRoute, targetRoute);
      
      // **SOLUTION**: Use simple React Router navigation
      // Global Tab Component Manager prevents tab component recreation
      navigate(targetRoute);
    } else {
      // Default behavior when no active space
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

  const navItems = [
    { path: '/', label: 'Home', icon: Home, onClick: handleHomeClick },
    { path: '/app/chat', label: 'Chat', icon: MessageSquare, onClick: () => handleNavigation('/app/chat'), unreadCount },
    { path: '/notifications', label: 'Notifications', icon: Bell, onClick: () => handleNavigation('/notifications'), notification: true },
    { path: '/profile', label: 'Profile', icon: User, onClick: () => handleNavigation('/profile'), notification: true },
  ];

  // Hide bottom nav when keyboard is open on mobile
  if (isKeyboardOpen) {
    return null;
  }
  
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
            return (
              <button
                key={item.label}
                className="relative flex-1 h-full min-w-14 min-h-14 flex flex-col items-center justify-center gap-1 transition-colors duration-200"
                onClick={item.onClick}
              >
              {/* Generic notification dot for other items */}
              {item.notification && !item.unreadCount && (
                  <span className="absolute top-3 right-1/2 translate-x-[16px] w-2 h-2 bg-blue-500 rounded-full border-2 border-[#171E2E]"></span>
                )}
              
              <div className="relative">
                <Icon
                  className={`w-[24px] h-[24px] transition-colors ${
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
                      className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[11px] font-semibold rounded-full h-[18px] min-w-[18px] px-1 flex items-center justify-center border-2 border-[#171E2E]"
                    >
                      {item.unreadCount > 99 ? '99+' : item.unreadCount}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <span className={`text-[10px] font-medium transition-colors ${
                active ? 'text-white' : 'text-gray-400'
              }`}>
                {item.label}
              </span>
            </button>
            );
          })}
        </div>
    </div>
  );
}