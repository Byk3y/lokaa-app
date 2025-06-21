/**
 * 🚀 INSTANT AVATAR COMPONENT
 * 
 * Specialized avatar component for comment inputs that completely eliminates
 * placeholder flash for the current user's avatar. Zero loading states, 
 * zero transitions - instant display only.
 */

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useAvatar } from '@/shared/utils/avatar-utils';

interface AvatarUser {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

interface InstantAvatarProps {
  user: AvatarUser;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
  'aria-label'?: string;
}

const SIZE_CLASSES = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm', 
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl'
};

/**
 * InstantAvatar - Zero flash, zero loading states
 * Perfect for comment inputs where user avatar should be immediately available
 */
export function InstantAvatar({ 
  user,
  size = 'sm',
  className = '',
  onClick,
  'aria-label': ariaLabel,
}: InstantAvatarProps) {
  // Use unified avatar resolver
  const avatar = useAvatar(user);
  
  const sizeClasses = SIZE_CLASSES[size];
  const accessibleLabel = ariaLabel || `Avatar for ${user.full_name || 'User'}`;

  // Memoize the avatar element to prevent unnecessary re-renders
  const avatarElement = useMemo(() => {
    if (avatar.hasImage && avatar.url) {
      // Show image immediately if available
      return (
        <img
          src={avatar.url}
          alt={accessibleLabel}
          className="w-full h-full object-cover rounded-full"
          loading="eager" // Force immediate loading
          decoding="sync" // Synchronous decoding
        />
      );
    }
    
    // Show initials immediately if no image
    return (
      <div 
        className="w-full h-full rounded-full flex items-center justify-center"
        style={{ backgroundColor: avatar.backgroundColor }}
      >
        <span className="font-semibold text-white select-none">
          {avatar.initials}
        </span>
      </div>
    );
  }, [avatar, accessibleLabel]);

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full overflow-hidden flex-shrink-0',
        sizeClasses,
        onClick && 'cursor-pointer hover:opacity-80 transition-opacity',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : 'img'}
      aria-label={accessibleLabel}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {avatarElement}
      
      {/* Screen reader only description */}
      <span className="sr-only">
        {avatar.hasImage 
          ? `Profile picture of ${user.full_name}`
          : `Initials ${avatar.initials} for ${user.full_name}`
        }
      </span>
    </div>
  );
}

export default InstantAvatar; 