import { log } from '@/utils/logger';
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '@supabase/supabase-js';
import { Settings, LogOut, User as UserIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getSupabaseClient } from '@/integrations/supabase/client';
import { safelyNavigateToProfile } from '@/utils/profileRedirect';
import { useOptimizedAuth } from '@/contexts/AuthContext';
import { navigateToProfileWithContext, getCurrentSpaceContext } from '@/utils/spaceContextUtils';
import { migrationAdapter } from '@/utils/indexeddb/migration/MigrationAdapter';
import { getInitials, AvatarUtils } from '@/shared/utils/avatar-utils';

interface CustomMenuItem {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  className?: string;
}

interface ProfileDropdownProps {
  user?: User | null;
  onSignOut?: () => void;
  className?: string;
  variant?: 'default' | 'animation';
  size?: 'sm' | 'md' | 'lg';
  customMenuItems?: CustomMenuItem[];
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ 
  user, 
  onSignOut,
  className = "",
  variant = "default",
  size = "md",
  customMenuItems
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user: currentUser, signOut } = useOptimizedAuth();
  const [profileSlug, setProfileSlug] = useState<string | null>(null);
  
  // Get user's profile URL from database - PROTECTED with IndexedDB bridge
  useEffect(() => {
    async function fetchProfileUrl() {
      if (!currentUser) return;
      
      try {
        // Use Supabase-IndexedDB bridge for mobile browser blocking protection
        const { data, error, fromCache } = await migrationAdapter.getUserProfile(
          currentUser.id, 
          ['profile_url']
        );
          
        if (error) {
          log.error('Component', 'Error fetching profile URL:', error);
          return;
        }
        
        if (data && data.profile_url) {
          setProfileSlug(data.profile_url);
          
          if (fromCache) {
            log.debug('Component', '🔧 [ProfileDropdown] Using cached profile_url data');
          }
        }
      } catch (err) {
        log.error('Component', 'Exception fetching profile URL:', err);
      }
    }
    
    if (currentUser) {
      fetchProfileUrl();
    }
  }, [currentUser]);
  
  // Handle clicks outside the dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [dropdownRef]);

  const handleSignOut = async () => {
    setIsOpen(false);
    if (onSignOut) {
      onSignOut();
    } else {
      await signOut();
      navigate('/login');
    }
  };
  
  const handleProfileClick = () => {
    setIsOpen(false);
    
    if (profileSlug) {
      // Use the new space context utility for clean navigation with Skool-style URLs
      const normalized = profileSlug.replace(/^\/?@/, '').replace(/^\//, '');
      navigateToProfileWithContext(normalized, navigate);
    } else if (currentUser) {
      // Fallback to settings if no profile URL is available
      navigate(`/settings/profile`);
    }
  };

  // Get avatar size based on size prop
  const getAvatarSize = () => {
    switch(size) {
      case 'sm': return 'h-8 w-8';
      case 'lg': return 'h-12 w-12';
      case 'md':
      default: return 'h-10 w-10';
    }
  };

  // Get profile data for display
  const [userName, setUserName] = useState<string | null>(null);
  
  // Fetch user's full name from the public.users table - PROTECTED with IndexedDB bridge
  useEffect(() => {
    async function fetchUserName() {
      if (!currentUser) return;
      
      try {
        // Use Supabase-IndexedDB bridge for mobile browser blocking protection
        const { data, error, fromCache } = await migrationAdapter.getUserProfile(
          currentUser.id, 
          ['full_name']
        );
          
        if (error) {
          log.error('Component', 'Error fetching user name:', error);
          return;
        }
        
        if (data && data.full_name) {
          setUserName(data.full_name);
          
          if (fromCache) {
            log.debug('Component', '🔧 [ProfileDropdown] Using cached full_name data');
          }
        }
      } catch (err) {
        log.error('Component', 'Exception fetching user name:', err);
      }
    }
    
    fetchUserName();
  }, [currentUser]);
  
  // Get email for display
  const email = currentUser?.email || '';
  
  // Get display name from multiple possible sources
  const displayName = userName || 
    user?.user_metadata?.full_name || 
    user?.user_metadata?.name || 
    email.split('@')[0] || 
    'User';
  
  // FIXED: Get avatar URL from multiple sources with proper fallback chain
  const avatarUrl = currentUser?.user_metadata?.avatar_url || 
                    user?.user_metadata?.avatar_url || 
                    '';
  
  if (!currentUser) return null;

  const fallbackBg = AvatarUtils.getEnhancedAvatarColor(currentUser.id);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Profile button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 focus:outline-none ${
          variant === 'animation' ? 'hover:scale-105 transition-transform' : ''
        }`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Avatar className={`${getAvatarSize()} transition border border-[#E1E4E8] cursor-pointer`}>
          <AvatarImage src={avatarUrl} alt={displayName} />
          <AvatarFallback
            style={{ backgroundColor: fallbackBg }}
            className="text-white font-semibold"
          >
            {getInitials(displayName)}
          </AvatarFallback>
        </Avatar>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg py-1 z-10 border border-gray-100">
          {/* User info */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">{displayName}</p>
            <p className="text-xs text-gray-500 truncate">{email}</p>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <button
              onClick={handleProfileClick}
              className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <UserIcon className="mr-2 h-4 w-4" />
              Your Profile
            </button>
            
            <button
              onClick={() => { navigate('/settings'); setIsOpen(false); }}
              className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </button>

            {customMenuItems && customMenuItems.map((item, index) => (
              <button
                key={index}
                onClick={() => { item.onClick(); setIsOpen(false); }}
                className={`flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 ${item.className || ''}`}
              >
                {item.icon && <span className="mr-2 h-4 w-4">{item.icon}</span>}
                {item.label}
              </button>
            ))}

            <button
              onClick={handleSignOut}
              className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileDropdown; 