import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';
import NotificationCenter from './NotificationCenter';
import { shouldEnableMobileFeatures } from '@/utils/mobileDetection';

interface NotificationBadgeProps {
  className?: string;
  variant?: 'desktop' | 'mobile';
  size?: 'sm' | 'md' | 'lg';
  isActive?: boolean;
  hideIcon?: boolean;
}

export default function NotificationBadge({ 
  className = '', 
  variant = 'desktop',
  size = 'md',
  isActive = false,
  hideIcon = false
}: NotificationBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { count, isLoading } = useUnreadNotificationCount();
  const bellButtonRef = React.useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const isMobile = shouldEnableMobileFeatures();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Check mobile detection
    const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
    const isViewportMobile = windowWidth <= 768;
    
    // On mobile, navigate to full-screen notifications page
    if (isMobile || variant === 'mobile' || isViewportMobile) {
      navigate('/notifs');
      return;
    }
    
    // On desktop, show dropdown
    setIsOpen(!isOpen);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  // Size configurations
  const sizeConfig = {
    sm: {
      icon: 'h-4 w-4',
      badge: 'h-4 w-4 text-xs',
      container: 'p-1'
    },
    md: {
      icon: 'h-6 w-6',
      badge: 'h-5 w-5 text-xs',
      container: 'p-2'
    },
    lg: {
      icon: 'h-7 w-7',
      badge: 'h-6 w-6 text-sm',
      container: 'p-2'
    }
  };

  const config = sizeConfig[size];

  // If hideIcon is true, only show the badge
  if (hideIcon) {
    return (
      <div className={`relative ${className}`}>
        {/* Unread Count Badge Only */}
        <AnimatePresence>
          {count > 0 && (
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
              className="bg-red-500 text-white text-[11px] font-semibold rounded-full h-[18px] min-w-[18px] px-1 flex items-center justify-center border-2 border-[#171E2E]"
            >
              {count > 99 ? '99+' : count}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="h-[18px] min-w-[18px] bg-gray-400 rounded-full animate-pulse" />
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell Button */}
      <button
        ref={bellButtonRef}
        onClick={handleClick}
        className={`relative ${config.container} rounded-full transition-colors duration-200 ${
          variant === 'mobile' 
            ? (isActive ? 'bg-white/20' : 'hover:bg-gray-100/10') 
            : (isOpen ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-100 dark:hover:bg-gray-800')
        }`}
        aria-label={`Notifications ${count > 0 ? `(${count} unread)` : ''}`}
      >
        <Bell className={`${config.icon} ${
          variant === 'mobile' 
            ? 'text-gray-400' 
            : 'text-gray-600 dark:text-gray-400'
        }`} />
        
        {/* Unread Count Badge */}
        <AnimatePresence>
          {count > 0 && (
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
              className={`absolute -top-1 -right-1 ${config.badge} bg-red-500 text-white font-semibold rounded-full flex items-center justify-center border-2 ${
                variant === 'mobile' 
                  ? 'border-[#171E2E]' 
                  : 'border-white dark:border-gray-900'
              }`}
              style={{ minWidth: config.badge.includes('h-4') ? '16px' : '20px' }}
            >
              {count > 99 ? '99+' : count}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading indicator */}
        {isLoading && (
          <div className={`absolute -top-1 -right-1 ${config.badge} bg-gray-400 rounded-full animate-pulse`} />
        )}
      </button>

      {/* Notification Center Dropdown - Only show on desktop */}
      {!isMobile && variant !== 'mobile' && (
        <NotificationCenter
          isOpen={isOpen}
          onClose={handleClose}
          className=""
          triggerRef={bellButtonRef}
        />
      )}
    </div>
  );
}