import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Calendar, MessageSquare, MapPin, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { MemberAvatar } from "@/components/ui/OptimizedAvatar";

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
  is_online = false,
  location,
  onClick,
  onChatClick,
  currentUserId,
  userId
}) => {
  const [isStartingChat, setIsStartingChat] = useState(false);

  const handleChatClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsStartingChat(true);
    try {
      await onChatClick?.();
    } finally {
      setIsStartingChat(false);
    }
  };

  // Format joined date
  const formattedJoinDate = joined_at ? format(new Date(joined_at), 'MMM d, yyyy') : 'N/A';

  // Determine if this is the current user viewing themselves
  const isCurrentUser = currentUserId === userId;

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:bg-gray-50 transition-all duration-200 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between h-full">
        {/* Left side - Avatar and main content */}
        <div className="flex items-start space-x-3 flex-1 min-w-0">
          {/* 🚀 NEW: Optimized Avatar with caching and online status */}
          <MemberAvatar
            user={{
              id: userId,
              full_name,
              avatar_url
            }}
            isOnline={is_online}
            onClick={onClick}
          />

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-1">
            <div>
              <h3 className="text-base font-semibold text-gray-900 truncate" title={full_name || 'Unnamed Member'}>
                {full_name || 'Unnamed Member'}
                {isCurrentUser && <span className="ml-2 text-xs text-teal-600 font-medium">(You)</span>}
              </h3>
              {profile_url && (
                <a
                  href={profile_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-teal-600 hover:text-teal-700 inline-flex items-center hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  View Profile →
                </a>
              )}
            </div>

            {/* Bio */}
            {bio && (
              <p className="text-sm text-gray-600 line-clamp-2" title={bio}>
                {bio}
              </p>
            )}

            {/* Member details */}
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <div className="flex items-center">
                <Calendar className="w-3 h-3 mr-1" />
                <span>Joined {formattedJoinDate}</span>
              </div>
              {location && (
                <div className="flex items-center">
                  <MapPin className="w-3 h-3 mr-1" />
                  <span>{location}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex flex-col items-end space-y-2 ml-4">
          {/* Chat button (only show for other users) */}
          {!isCurrentUser && onChatClick && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleChatClick}
              disabled={isStartingChat}
              className="flex items-center space-x-1 text-xs"
            >
              {isStartingChat ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Starting...</span>
                </>
              ) : (
                <>
                  <MessageSquare className="w-3 h-3" />
                  <span>Chat</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemberListItem; 