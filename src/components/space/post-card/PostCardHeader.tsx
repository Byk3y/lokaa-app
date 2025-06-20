import React from 'react';
import { Tag } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import UserProfileHoverCard from '@/components/profile/UserProfileHoverCard';
import { formatRelativeTime } from "@/utils/formatters";
import { cn } from "@/lib/utils";
import { AvatarUtils } from '@/shared/utils/avatar-utils';
import type { Author, Category } from "@/features/posts/types";

interface PostCardHeaderProps {
  author: Author;
  createdAt: string | Date;
  editedAt?: string | null;
  category?: Category | null;
  isPinned?: boolean;
}

/**
 * Header component for PostCard showing author info, date, and metadata
 */
export const PostCardHeader: React.FC<PostCardHeaderProps> = ({
  author,
  createdAt,
  editedAt,
  category,
  isPinned = false,
}) => {
  // Format date in relative time (e.g., "2 hours ago")
  const formattedDate = formatRelativeTime(typeof createdAt === 'string' ? new Date(createdAt) : createdAt);

  // 🎯 ENHANCED: Use unified avatar resolver for consistent colors and initials
  const avatar = AvatarUtils.resolveAvatar({
    id: author.id,
    full_name: author.name,
    avatar_url: author.avatar
  });

  // Get profile link path if available
  const getProfileLink = () => {
    if (!author || !author.profile_url) return null;
    return `/profile/${author.profile_url}`;
  };

  return (
    <div className="px-3 pt-3 pb-2 sm:px-4 sm:pt-3 sm:pb-2 flex items-start justify-between flex-shrink-0">
      <div className="flex items-center min-w-0">
        <div className="relative mr-2.5 flex-shrink-0">
          {getProfileLink() ? (
            <UserProfileHoverCard 
              userId={author.id} 
              userName={author.name} 
              userAvatar={author.avatar} 
              userProfileUrl={author.profile_url} 
              activityScore={author.activity_score}
            >
              <Link to={getProfileLink() || '#'}>
                <Avatar className="h-9 w-9 rounded-full hover:ring-2 hover:ring-blue-300 transition-all">
                  {avatar.hasImage && (
                    <AvatarImage src={avatar.url!} alt={author.name} />
                  )}
                  <AvatarFallback 
                    className="text-white font-medium text-sm"
                    style={{ backgroundColor: avatar.backgroundColor }}
                  >
                    {avatar.initials}
                  </AvatarFallback>
                </Avatar>
              </Link>
            </UserProfileHoverCard>
          ) : (
            <Avatar className="h-9 w-9 rounded-full">
              {avatar.hasImage && (
                <AvatarImage src={avatar.url!} alt={author.name} />
              )}
              <AvatarFallback 
                className="text-white font-medium text-sm"
                style={{ backgroundColor: avatar.backgroundColor }}
              >
                {avatar.initials}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
        
        <div className="flex flex-col min-w-0">
          <div className="flex items-center">
            {getProfileLink() ? (
              <UserProfileHoverCard 
                userId={author.id} 
                userName={author.name} 
                userAvatar={author.avatar} 
                userProfileUrl={author.profile_url} 
                activityScore={author.activity_score}
              >
                <Link to={getProfileLink() || '#'} className="font-semibold text-gray-800 hover:text-blue-600 hover:underline text-sm truncate">
                  {author.name}
                </Link>
              </UserProfileHoverCard>
            ) : (
              <span className="text-sm font-semibold text-gray-800 truncate">{author.name}</span>
            )}
          </div>
          <div className="flex items-center mt-0 space-x-1.5">
            <span className="text-xs text-gray-500 flex-shrink-0">{formattedDate}</span>
            {editedAt && (
              <>
                <span className="text-xs text-gray-500 mx-0.5">•</span>
                <span className="text-xs text-gray-500 italic flex-shrink-0">Edited</span>
              </>
            )}
            {category && category.name && (
              <>
                <span className="text-xs text-gray-500 mx-0.5">•</span>
                <span className="inline-flex items-center text-xs font-medium px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded truncate">
                  {category.icon && <span className="mr-1 text-xs flex-shrink-0">{category.icon}</span>}
                  <span className="truncate">{category.name}</span>
                </span>
              </>
            )}
          </div>
        </div>
      </div>
      {isPinned && (
        <div className="flex-shrink-0 flex items-center text-xs text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded-md ml-2">
          <Tag size={12} className="mr-1 transform rotate-45" />
          <span>Pinned</span>
        </div>
      )}
    </div>
  );
}; 