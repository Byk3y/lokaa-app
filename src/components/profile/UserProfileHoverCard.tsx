import React from 'react';
import { Link } from 'react-router-dom';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from 'date-fns';
import FollowButton from './FollowButton';
import FollowStats from './FollowStats';
import { getInitial } from '@/shared/utils/avatar-utils';

interface UserProfileHoverCardProps {
  userId: string;
  userName: string;
  userAvatar?: string | null;
  userProfileUrl?: string | null;
  userBio?: string | null;
  userLocation?: string | null;
  userJoinedDate?: string | null;
  userLevel?: number;
  activityScore?: number | null;
  children: React.ReactNode;
}

export default function UserProfileHoverCard({
  userId,
  userName,
  userAvatar,
  userProfileUrl,
  userBio,
  userLocation,
  userJoinedDate,
  userLevel,
  activityScore = 0,
  children
}: UserProfileHoverCardProps) {
  // Calculate level from activity score if not provided directly
  const calculateLevel = (score: number) => Math.floor(score / 100) + 1;
  const displayLevel = userLevel || calculateLevel(activityScore || 0);

  // Format joined date if available
  const joinedText = userJoinedDate 
    ? `Joined ${formatDistanceToNow(new Date(userJoinedDate), { addSuffix: true })}`
    : null;

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div className="inline-block">{children}</div>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 p-0 shadow-lg border border-gray-100">
        <div className="p-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12">
              {userAvatar ? (
                <AvatarImage src={userAvatar} alt={userName} />
              ) : (
                <AvatarFallback className="bg-blue-100 text-blue-600">
                  {getInitial(userName)}
                </AvatarFallback>
              )}
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-semibold text-gray-900">{userName}</h4>
                  {userProfileUrl && (
                    <p className="text-sm text-gray-500">@{userProfileUrl}</p>
                  )}
                </div>
                <div className="bg-blue-50 text-blue-700 rounded-full h-6 w-6 flex items-center justify-center text-xs font-medium">
                  {displayLevel}
                </div>
              </div>
              
              {userBio && (
                <p className="text-sm text-gray-700 mt-2 line-clamp-2">{userBio}</p>
              )}
              
              {userId && (
                <div className="mt-3">
                  <FollowStats userId={userId} size="sm" showLabels={false} showTooltip={false} />
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-3 space-y-1.5">
            {userLocation && (
              <div className="flex items-center text-xs text-gray-500">
                <MapPin className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                <span>{userLocation}</span>
              </div>
            )}
            
            {joinedText && (
              <div className="flex items-center text-xs text-gray-500">
                <Calendar className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                <span>{joinedText}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="border-t border-gray-100 p-3 bg-gray-50 rounded-b-lg flex justify-between items-center">
          <Link 
            to={userProfileUrl ? `/profile/${userProfileUrl}` : '#'} 
            className={!userProfileUrl ? 'pointer-events-none' : ''}
          >
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              View Profile
            </Button>
          </Link>
          
          {userId && <FollowButton userId={userId} size="sm" variant="subtle" />}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
} 