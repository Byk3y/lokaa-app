import { useLocation, useNavigate } from 'react-router-dom';
import { Home, MessageSquare, User, Bell } from 'lucide-react';
import useSpaceSettingsStore, { trackRouteChange } from '@/hooks/useSpaceSettingsStore';
import { useEffect, useRef } from 'react';
import { useChat } from '@/features/chat';
import { motion, AnimatePresence } from 'framer-motion';
import { useMobileBackgroundDetection } from '@/hooks/useMobileLifecycle';

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { space } = useSpaceSettingsStore();
  const { getUnreadCount } = useChat();
  const previousPathRef = useRef(location.pathname);
  const { returnedFromBackground } = useMobileBackgroundDetection();

  // Get unread message count
  const unreadCount = getUnreadCount();

  const pathname = location.pathname;
  
  // Track route changes for cache optimization
  useEffect(() => {
    const currentPath = location.pathname;
    const previousPath = previousPathRef.current;
    
    if (currentPath !== previousPath) {
      trackRouteChange(previousPath, currentPath);
      previousPathRef.current = currentPath;
    }
  }, [location.pathname]);
  
  const isActive = (path: string) => {
    // Exact match for root, startsWith for others
    if (path === '/') {
        // Handle space-specific home vs generic home
        const spaceHomePath = `/${space?.subdomain}/space`;
        return pathname === '/' || pathname === spaceHomePath;
    }
    return pathname.startsWith(path);
  };
  
  const handleHomeClick = () => {
    const fromRoute = location.pathname;
    const targetRoute = space?.subdomain ? `/${space.subdomain}/space` : '/';
    
    // Track this navigation explicitly for better cache behavior
    trackRouteChange(fromRoute, targetRoute);
    
    if (space?.subdomain) {
      navigate(`/${space.subdomain}/space`);
    } else {
      navigate('/');
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
  
  return (
    <div className="fixed bottom-0 left-0 right-0 w-full z-50 sm:hidden bg-[#171E2E]/95 backdrop-blur-lg pb-[env(safe-area-inset-bottom)]">
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
              
                <span
                  className={`text-[11px] font-medium transition-colors ${
                    active ? 'text-white' : 'text-gray-400'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
      </div>
    </div>
  );
}