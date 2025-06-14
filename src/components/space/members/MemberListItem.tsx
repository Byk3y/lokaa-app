import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar, MessageSquare, MapPin } from 'lucide-react';
import { format } from 'date-fns';

export interface MemberListItemProps {
  avatar_url: string | null;
  full_name: string | null;
  profile_url: string | null;
  bio: string | null;
  joined_at: string;
  is_online?: boolean;
  location?: string | null;
  onClick?: () => void;
  onChatClick?: () => void;
  currentUserId?: string;
  userId?: string;
}

const MemberListItem: React.FC<MemberListItemProps> = ({
  avatar_url,
  full_name,
  profile_url,
  bio,
  joined_at,
  is_online,
  location,
  onClick,
  onChatClick,
  currentUserId,
  userId,
}) => {
  const getInitials = (name: string | null): string => {
    if (!name) return '?';
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  const formattedJoinDate = joined_at ? format(new Date(joined_at), 'MMM d, yyyy') : 'N/A';

  const handleChatClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the member card click
    if (onChatClick) {
      onChatClick();
    }
  };

  return (
    <div 
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:bg-gray-50 transition-all duration-200 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        {/* Left side - Avatar and info */}
        <div className="flex items-start space-x-3 flex-1">
          {/* Avatar */}
          <div className="relative">
            <Avatar className="w-10 h-10">
              <AvatarImage src={avatar_url || undefined} alt={full_name || 'Member'} />
              <AvatarFallback className="text-sm font-medium">{getInitials(full_name)}</AvatarFallback>
            </Avatar>
            {/* Badge number - Optional for member ranking/level */}
            {is_online && (
              <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                1
              </div>
            )}
          </div>

          {/* Member info */}
          <div className="flex-1 min-w-0">
            {/* Name and username */}
            <div className="mb-1">
              <h3 className="text-base font-semibold text-gray-900 truncate">
                {full_name || 'Unnamed Member'}
              </h3>
              {profile_url && (
                <p className="text-xs text-gray-500">
                  @{profile_url}
                </p>
              )}
            </div>

            {/* Bio */}
            {bio && (
              <p className="text-gray-700 text-xs mb-2" style={{
                display: '-webkit-box',
                WebkitLineClamp: 1,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}>
                {bio}
              </p>
            )}

            {/* Status and metadata */}
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              {/* Online status */}
              <div className="flex items-center space-x-1">
                <div className={`w-1.5 h-1.5 rounded-full ${is_online ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span>{is_online ? 'Online' : 'Offline'}</span>
              </div>

              {/* Join date */}
              <div className="flex items-center space-x-1">
                <Calendar className="w-2.5 h-2.5" />
                <span>{formattedJoinDate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Chat button */}
        {currentUserId !== userId && (
          <Button 
            variant="outline" 
            size="sm"
            className="ml-2 flex-shrink-0 bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300 text-xs px-2 py-1 h-7"
            onClick={handleChatClick}
          >
            <MessageSquare className="w-3 h-3 mr-1" />
            CHAT
          </Button>
        )}
      </div>
    </div>
  );
};

export default MemberListItem; 