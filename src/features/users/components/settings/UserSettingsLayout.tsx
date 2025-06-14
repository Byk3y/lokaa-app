import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { Button } from '@/components/ui/button';
import ProfileDropdown from '@/components/common/ProfileDropdown';
import ChatButton from '@/components/chat/ChatButton';
import SettingsSidebar from './SettingsSidebar';
import SettingsTabRouter from './SettingsTabRouter';
import { useSettingsNavigation } from '../../hooks/useSettingsNavigation';

export default function UserSettingsLayout() {
  const { user, signOut } = useOptimizedAuth();
  const navigate = useNavigate();
  const { activeTab, handleTabChange } = useSettingsNavigation();
  
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileRef = useRef(null);

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="page-container max-w-[1200px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo/Brand */}
            <Link to="/" className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Lokaa</h1>
            </Link>
            
            <div className="flex items-center space-x-4">
              {/* Modern Icon Buttons with elevated design */}
              <div className="flex items-center space-x-3">
                {/* Chat Button */}
                <div className="relative">
                  <ChatButton 
                    variant="icon" 
                    className="h-10 w-10 bg-white/80 backdrop-blur-sm hover:bg-white border border-gray-200/70 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl hover:scale-105 [&_svg]:w-5 [&_svg]:h-5 [&_button]:h-10 [&_button]:w-10 [&_button]:rounded-xl [&_button]:shadow-lg [&_button]:border-gray-200/70"
                  />
                </div>
                
                {/* Bell Icon */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="relative h-10 w-10 p-0 bg-white/80 backdrop-blur-sm hover:bg-white border border-gray-200/70 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl hover:scale-105"
                >
                  <Bell size={20} className="text-gray-700 hover:text-gray-900 transition-colors duration-200" />
                </Button>
              </div>
              
              {/* Profile Icon with Dropdown */}
              <div className="relative ml-3" ref={profileRef}>
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
    </div>
  );
} 