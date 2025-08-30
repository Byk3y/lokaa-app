import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, X, ArrowLeft } from 'lucide-react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { Button } from '@/components/ui/button';
import ProfileDropdown from '@/components/common/ProfileDropdown';
import ChatButton from '@/components/chat/ChatButton';
import SettingsSidebar from './SettingsSidebar';
import SettingsTabRouter from './SettingsTabRouter';
import { useSettingsNavigation } from '../../hooks/useSettingsNavigation';
import SpaceSwitcher from '@/components/spaces/SpaceSwitcher';


// Mobile tab configuration - all available tabs
const mobileTabs = [
  { id: "spaces", label: "Spaces" },
  { id: "profile", label: "Profile" },
  { id: "notifications", label: "Notifications" },
  { id: "chat", label: "Chat" },
  { id: "theme", label: "Theme" },
  { id: "account", label: "Account" },
  { id: "payment-methods", label: "Payment Methods" },
  { id: "payment-history", label: "Payment History" },
  { id: "affiliates", label: "Affiliates" },
  { id: "payouts", label: "Payouts" }
];

export default function UserSettingsLayout() {
  const { user } = useOptimizedAuth();
  const navigate = useNavigate();
  const { activeTab, handleTabChange } = useSettingsNavigation();
  
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const profileRef = useRef(null);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !(profileRef.current as HTMLElement).contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Mobile layout for Skool-style settings
  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50 fixed inset-0 z-50 overflow-y-auto">
        {/* Mobile Header - Skool style */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-3">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">
              Settings
            </h1>
            <button 
              onClick={() => navigate(-1)}
              className="p-2 -mr-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          
          {/* Horizontal scrollable tabs - Skool style */}
          <div className="px-4 pb-3">
            <div className="flex space-x-6 overflow-x-auto scrollbar-hide">
              {mobileTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id as any)}
                  className={`flex-shrink-0 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'text-gray-900 border-b-2 border-gray-900 pb-1'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile Content - Full screen */}
        <div className="pb-20">
          <SettingsTabRouter 
            activeTab={activeTab}
            user={user}
          />
        </div>
        
        {/* Space Settings Modal - available from user settings context */}
        <NewSpaceSettingsModal />
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="page-container max-w-[1200px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo/Brand - custom styling for settings with SpaceSwitcher functionality */}
            <div className="flex items-center">
              <div className="flex items-center">
                <h1 className="text-4xl font-bold leading-none text-[#14b8a6] mr-2">Lokaa</h1>
                <SpaceSwitcher
                  currentSpaceSubdomain="_settings_"
                  currentSpaceName="Lokaa"
                  userId={user?.id || ''}
                  hideTriggerLabel={true}
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Clean simple buttons matching main space page */}
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
                <Bell className="h-7 w-7" />
              </Button>
              
              {/* Profile Dropdown */}
              <div className="relative">
                <ProfileDropdown 
                  variant="default" 
                  size="md" 
                  customMenuItems={[
                    {
                      label: "Create a space",
                      onClick: () => navigate('/create-space'),
                      className: "text-gray-500 hover:text-gray-900"
                    },
                    {
                      label: "Discover spaces",
                      onClick: () => navigate('/discover'),
                      className: "text-gray-500 hover:text-gray-900"
                    }
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Page content */}
      <div className="page-container max-w-[1200px] mx-auto px-6 py-8">
        <div className="flex gap-8 items-start">
          {/* Sidebar */}
          <SettingsSidebar 
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
          
          {/* Main content */}
          <div className="flex-1">
            <SettingsTabRouter 
              activeTab={activeTab}
              user={user}
            />
          </div>
        </div>
      </div>
      
      {/* Space Settings Modal - Rendered at app level to avoid duplicates */}
    </div>
  );
} 