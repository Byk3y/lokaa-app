import React, { useState, useRef, useEffect } from 'react';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  unreadCount: number;
  onMarkAllAsRead: () => void;
  isMarkingAllAsRead: boolean;
  triggerRef?: React.RefObject<HTMLElement>;
}

export default function NotificationSettingsModal({
  isOpen,
  onClose,
  unreadCount,
  onMarkAllAsRead,
  isMarkingAllAsRead,
  triggerRef
}: NotificationSettingsModalProps) {
  const [selectedFilter, setSelectedFilter] = useState('All groups');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleFilterChange = (filter: string) => {
    setSelectedFilter(filter);
    onClose();
    // TODO: Implement filter logic
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        // Also check if click is on the trigger button
        if (triggerRef?.current && triggerRef.current.contains(target)) {
          return; // Let the trigger handle the toggle
        }
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  return (
    <>
      {/* Modal positioned at top-right - Skool style */}
      <div 
        ref={dropdownRef}
        className="notification-settings-modal"
      >
        {/* Mark all as read */}
        {unreadCount > 0 && (
          <button
            onClick={() => {
              onMarkAllAsRead();
              onClose();
            }}
            disabled={isMarkingAllAsRead}
          >
            <span className="text-sm text-gray-900">
              {isMarkingAllAsRead ? 'Marking as read...' : 'Mark all as read'}
            </span>
          </button>
        )}

        {/* All groups - highlighted when selected */}
        <button
          onClick={() => handleFilterChange('All groups')}
          className={selectedFilter === 'All groups' ? 'selected' : ''}
        >
          <span className="text-sm text-gray-900">All groups</span>
        </button>

        {/* Just this group */}
        <button
          onClick={() => handleFilterChange('Just this group')}
          className={selectedFilter === 'Just this group' ? 'selected' : ''}
        >
          <span className="text-sm text-gray-900">Just this group</span>
        </button>
      </div>
    </>
  );
}