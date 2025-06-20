/**
 * Profile Avatar Component
 * 
 * Displays the current user's avatar with a fallback.
 * Uses the profile store for data.
 */

import { Avatar, AvatarImage, AvatarFallback } from "@/shared/components";
import { useProfile } from "../hooks/useProfile";
import { getInitials } from "@/shared/utils/avatar-utils";

interface ProfileAvatarProps {
  /** Size of the avatar in pixels */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Additional CSS classes */
  className?: string;
  /** Override the user ID (defaults to current user) */
  userId?: string;
  /** Whether to show a fallback while loading */
  showLoadingFallback?: boolean;
}

/**
 * Component that displays a user's profile avatar
 */
export function ProfileAvatar({ 
  size = 'md', 
  className = '',
  userId,
  showLoadingFallback = true
}: ProfileAvatarProps) {
  const { profile, isLoading, avatarUrl, fullName, loadProfile } = useProfile();
  
  // Size classes mapping
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };
  
  // Use centralized initials function
  const initials = getInitials(fullName);
  
  // Handle loading state
  if (isLoading && showLoadingFallback) {
    return (
      <Avatar className={`${sizeClasses[size]} ${className}`}>
        <AvatarFallback className="bg-gray-200 text-gray-400">
          ...
        </AvatarFallback>
      </Avatar>
    );
  }
  
  return (
    <Avatar className={`${sizeClasses[size]} ${className}`}>
      {avatarUrl && (
        <AvatarImage 
          src={avatarUrl} 
          alt={fullName || 'User avatar'} 
        />
      )}
      <AvatarFallback className="bg-primary/10 text-primary">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
} 