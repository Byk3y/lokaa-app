import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '@supabase/supabase-js';
import { Settings, LogOut, User as UserIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from '@/integrations/supabase/client';
import { safelyNavigateToProfile } from '@/utils/profileRedirect';

interface ProfileDropdownProps {
  user?: User | null;
  onSignOut?: () => void;
  className?: string;
  variant?: 'default' | 'animation';
  size?: 'sm' | 'md' | 'lg';
}

// A utility to get initials from a name (up to 2 characters)
function getInitials(name: string): string {
  if (!name) return '';
  
  const words = name.trim().split(/\s+/);
  
  if (words.length === 1) {
    return name.substring(0, 2).toUpperCase();
  }
  
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ 
  user, 
  onSignOut,
  className = "",
  variant = "default",
  size = "md"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  
  // Get current user if not provided via props
  const [currentUser, setCurrentUser] = React.useState<User | null>(user || null);
  const [profileSlug, setProfileSlug] = useState<string | null>(null);
  
  // Fetch current user if not provided via props
  React.useEffect(() => {
    if (user !== undefined) {
      setCurrentUser(user);
    } else {
      async function getSession() {
        const { data } = await supabase.auth.getSession();
        setCurrentUser(data.session?.user || null);
      }
      getSession();
    }
  }, [user]);
  
  // Get user's profile URL from database
  React.useEffect(() => {
    async function fetchProfileUrl() {
      if (!currentUser) return;
      
      try {
        const { data, error } = await supabase
          .from('users')
          .select('profile_url')
          .eq('id', currentUser.id)
          .single();
          
        if (error) {
          console.error('Error fetching profile URL:', error);
          return;
        }
        
        if (data && data.profile_url) {
          setProfileSlug(data.profile_url);
        }
      } catch (err) {
        console.error('Exception fetching profile URL:', err);
      }
    }
    
    if (currentUser) {
      fetchProfileUrl();
    }
  }, [currentUser]);
  
  // Handle clicks outside the dropdown
  React.useEffect(() => {
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
      await supabase.auth.signOut();
      navigate('/login');
    }
  };
  
  const handleProfileClick = () => {
    setIsOpen(false);
    if (profileSlug) {
      // Use navigate instead of direct window.location to prevent redirect loops
      navigate(`/@${profileSlug}`);
    } else if (currentUser) {
      // Fallback using user ID if profile URL isn't available
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
  const displayName = currentUser?.user_metadata?.full_name || currentUser?.email || 'User';
  const email = currentUser?.email || '';
  const avatarUrl = currentUser?.user_metadata?.avatar_url || '';
  
  if (!currentUser) return null;

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
        <Avatar className={`${getAvatarSize()} transition border border-gray-200 cursor-pointer`}>
          <AvatarImage src={avatarUrl} alt={displayName} />
          <AvatarFallback className="bg-teal-50 text-teal-900">
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