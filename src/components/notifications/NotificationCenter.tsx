import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useNotificationNavigate } from '@/hooks/useNotificationNavigate';
import useSpaceSettingsStore from '@/hooks/useSpaceSettingsStore';
import { log } from '@/utils/logger';
import NotificationList from './NotificationList';
import type { NotificationWithActor } from '@/types/notification';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  triggerRef?: React.RefObject<HTMLElement>;
}

export default function NotificationCenter({ isOpen, onClose, className = '', triggerRef }: NotificationCenterProps) {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'current_space'>('all');
  const [isMarkingAllAsRead, setIsMarkingAllAsRead] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  
  const { space } = useSpaceSettingsStore();

  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    hasMore,
    loadMore,
    markAsRead,
    markAllAsRead,
    refresh
  } = useNotifications();

  const navigateToNotification = useNotificationNavigate();

  // Mark a single notification as read (NotificationItem hands us one id).
  const handleMarkAsRead = (notificationId: string) => {
    markAsRead([notificationId]);
  };

  // Navigate, then close the dropdown.
  const handleNotificationNavigate = async (notification: NotificationWithActor) => {
    onClose();
    await navigateToNotification(notification);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Check if click is outside the modal dropdown
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        // Also check if click is on the trigger button - if so, don't close
        if (triggerRef?.current && triggerRef.current.contains(target)) {
          return; // Let the trigger handle the toggle
        }
        onClose();
        setIsFilterDropdownOpen(false);
      }
      
      // Handle filter dropdown
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(target)) {
        setIsFilterDropdownOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  // Handle marking all as read
  const handleMarkAllAsRead = async () => {
    try {
      setIsMarkingAllAsRead(true);
      await markAllAsRead();
      log.debug('NotificationCenter', 'Marked all notifications as read');
    } catch (error) {
      log.error('NotificationCenter', 'Error marking all as read:', error);
    } finally {
      setIsMarkingAllAsRead(false);
    }
  };

  // Filter notifications based on space selection
  const filteredNotifications = selectedFilter === 'all' 
    ? notifications 
    : notifications.filter(n => n.space_id === space?.id);

  // Get space filter options
  const filterOptions = [
    { value: 'all', label: 'All spaces' },
    { value: 'current_space', label: 'Just this space' }
  ];

  if (!isOpen) return null;

  return (
    <div className={`absolute right-0 top-full mt-2 z-50 ${className}`}>
      <div 
        ref={dropdownRef}
        className="bg-white rounded-lg shadow-xl border border-gray-200 max-w-[90vw] overflow-hidden flex flex-col notification-modal-container"
        style={{ 
          width: '501px', 
          height: '570px',
          minWidth: '350px',
          overscrollBehavior: 'contain' // Prevent scroll chaining to parent
        }}
        onWheel={(e) => {
          // Always stop wheel events from bubbling out of the modal
          e.stopPropagation();
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50 flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">
            Notifications
          </h3>
          
          <div className="flex items-center space-x-4">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
              >
                {isMarkingAllAsRead ? 'Marking...' : 'Mark all as read'}
              </button>
            )}
            
            <div className="relative" ref={filterDropdownRef}>
              <button
                className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
                onClick={() => {
                  setIsFilterDropdownOpen(!isFilterDropdownOpen);
                  log.debug('NotificationCenter', 'Filter dropdown clicked', { isOpen: !isFilterDropdownOpen });
                }}
              >
                <span>
                  {filterOptions.find(opt => opt.value === selectedFilter)?.label || 'All spaces'}
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${
                  isFilterDropdownOpen ? 'rotate-180' : ''
                }`} />
              </button>
              
              {/* Filter Dropdown */}
              {isFilterDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[140px]">
                  {filterOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSelectedFilter(option.value as 'all' | 'current_space');
                        setIsFilterDropdownOpen(false);
                        log.debug('NotificationCenter', 'Filter changed', { filter: option.value });
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                        selectedFilter === option.value 
                          ? 'text-blue-600 bg-blue-50 font-medium' 
                          : 'text-gray-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <NotificationList
          notifications={filteredNotifications}
          isLoading={isLoading}
          hasMore={hasMore}
          onLoadMore={loadMore}
          onMarkAsRead={handleMarkAsRead}
          onNavigate={handleNotificationNavigate}
          error={error}
        />

        {!isLoading && !error && (
          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 flex-shrink-0">
            <button
              onClick={refresh}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Refresh notifications
            </button>
          </div>
        )}
      </div>
    </div>
  );
}