import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '@supabase/supabase-js';
import { Settings, LogOut, User as UserIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from '@/integrations/supabase/client';
import { safelyNavigateToProfile } from '@/utils/profileRedirect';

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
  size = "md",
  customMenuItems
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
    
    // Store the current space information for profile page to use
    try {
      // Get current space from URL path
      const pathname = window.location.pathname;
      const spaceMatch = pathname.match(/\/([^\/]+)\/space/);
      
      if (spaceMatch && spaceMatch[1]) {
        const currentSpaceSubdomain = spaceMatch[1];
        
        // Try to get space info from local storage first (which would have complete data)
        try {
          const storedSpaces = localStorage.getItem('lastVisitedSpace');
          if (storedSpaces) {
            const parsedSpace = JSON.parse(storedSpaces);
            if (parsedSpace && parsedSpace.subdomain === currentSpaceSubdomain && parsedSpace.id) {
              console.log('Found space info in localStorage with ID:', parsedSpace.id);
              sessionStorage.setItem('navigatedFromSpace', JSON.stringify(parsedSpace));
              
              // After storing, we can proceed with navigation
              if (profileSlug) {
                navigate(`/profile/${profileSlug}`);
              } else if (currentUser) {
                navigate(`/settings/profile`);
              }
              return; // Exit early since we've already handled navigation
            }
          }
        } catch (localStorageError) {
          console.warn('Error checking localStorage for space data:', localStorageError);
        }
        
        // Fallback: Try to get more details from SpaceSwitcher's dropdown
        const spaceElements = document.querySelectorAll('[data-space-subdomain]');
        let currentSpaceDetails = null;
        
        for (const element of spaceElements) {
          const subdomain = element.getAttribute('data-space-subdomain');
          if (subdomain === currentSpaceSubdomain) {
            const spaceId = element.getAttribute('data-space-id');
            const spaceName = element.getAttribute('data-space-name');
            
            // Only include valid data
            if (spaceId && spaceName) {
              currentSpaceDetails = {
                id: spaceId,
                name: spaceName,
                subdomain: currentSpaceSubdomain
              };
              console.log('Found space details from DOM:', currentSpaceDetails);
              break;
            }
          }
        }
        
        // If we have space details with a valid ID, store them
        if (currentSpaceDetails && currentSpaceDetails.id && currentSpaceDetails.id !== 'undefined') {
          console.log('Storing complete space details for profile page:', currentSpaceDetails);
          sessionStorage.setItem('navigatedFromSpace', JSON.stringify(currentSpaceDetails));
        } else {
          // Make a server request to get space details by subdomain
          console.log('Fetching space details from server for subdomain:', currentSpaceSubdomain);
          
          const fetchSpaceDetails = async (subdomain) => {
            try {
              const { data, error } = await supabase
                .from('spaces')
                .select('id, name, subdomain')
                .eq('subdomain', subdomain)
                .single();
                
              if (error) {
                throw error;
              }
              
              if (data) {
                console.log('Successfully fetched space details from server:', data);
                sessionStorage.setItem('navigatedFromSpace', JSON.stringify(data));
              } else {
                console.warn('No space found for subdomain:', subdomain);
                // Store basic info without ID as fallback
                sessionStorage.setItem('navigatedFromSpace', JSON.stringify({
                  subdomain: currentSpaceSubdomain,
                  name: currentSpaceSubdomain.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
                }));
              }
            } catch (fetchError) {
              console.error('Error fetching space details:', fetchError);
              // Store basic info without ID as fallback
              sessionStorage.setItem('navigatedFromSpace', JSON.stringify({
                subdomain: currentSpaceSubdomain,
                name: currentSpaceSubdomain.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
              }));
            }
            
            // Navigate after attempt to get space details
            if (profileSlug) {
              navigate(`/profile/${profileSlug}`);
            } else if (currentUser) {
              navigate(`/settings/profile`);
            }
          };
          
          // Start the fetch but don't wait for it
          fetchSpaceDetails(currentSpaceSubdomain);
          return; // Exit early since we'll navigate after the fetch
        }
      }
    } catch (e) {
      console.error('Error storing space context for profile navigation:', e);
    }
    
    if (profileSlug) {
      // Use navigate instead of direct window.location to prevent redirect loops
      navigate(`/profile/${profileSlug}`);
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
        <Avatar className={`${getAvatarSize()} transition border border-[#E1E4E8] cursor-pointer`}>
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