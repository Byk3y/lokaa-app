import React from 'react';
import { Button } from '@/components/ui/button';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import ChatButton from '@/components/chat/ChatButton';
import ProfileDropdown from '@/components/common/ProfileDropdown';
import { TopNavChatIcon, TopNavBellIcon } from '@/components/ui/nav-icons';

interface HeaderActionsProps {
  variant?: 'default' | 'elevated'; // Different styling variants
  className?: string;
  showLabels?: boolean; // For mobile view
  onMobileMenuClose?: () => void; // For closing mobile menu after action
}

export default function HeaderActions({ 
  variant = 'default', 
  className = '',
  showLabels = false,
  onMobileMenuClose
}: HeaderActionsProps) {
  const { user } = useOptimizedAuth();

  if (!user) return null;

  const handleChatClick = () => {
    if (onMobileMenuClose) {
      onMobileMenuClose();
    }
  };

  if (showLabels) {
    // Mobile layout with labels
    return (
      <div className={`flex flex-col space-y-3 ${className}`}>
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-700 hover:bg-gray-50 px-4 py-3 rounded-xl transition-all duration-200 border border-gray-100 bg-white"
          aria-label="Messages"
          onClick={handleChatClick}
        >
          <TopNavChatIcon className="h-6 w-6 mr-4 text-gray-600" />
          <span className="font-medium">Messages</span>
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-700 hover:bg-gray-50 px-4 py-3 rounded-xl transition-all duration-200 border border-gray-100 bg-white"
          aria-label="Notifications"
        >
          <TopNavBellIcon className="h-6 w-6 mr-4 text-gray-600" />
          <span className="font-medium">Notifications</span>
        </Button>
      </div>
    );
  }

  // Desktop layout - clean simple style matching post cards
  return (
    <div className={`flex items-center space-x-4 ${className}`}>
      {/* Chat Button */}
      <ChatButton 
        variant="icon" 
        className="text-gray-500 p-2"
      />
      
      {/* Bell Icon */}
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10 text-gray-500"
        aria-label="Notifications"
      >
        <TopNavBellIcon className="h-7 w-7" />
      </Button>
      
      {/* Profile Dropdown */}
      <div className="relative">
        <ProfileDropdown user={user} variant="default" size="md" />
      </div>
    </div>
  );
} 