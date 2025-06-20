import React from 'react';
import { MemberRole } from "@/contexts/MembershipContext"; // Assuming MemberRole is 'owner' | 'admin' | 'member'
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Crown, Shield, MoreHorizontal, UserX, Link as LinkIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth'; // To get current user for action checks
import { OptimizedAvatar } from "@/components/ui/OptimizedAvatar"; // 🚀 NEW: Optimized avatar with caching
import { getInitials } from '@/shared/utils/avatar-utils'; // 🎯 Use unified function

// Re-define DisplayMember here or import if it's moved to a shared types file
// For now, defining it to match MembersTab.tsx for clarity
type DisplayMember = {
  id: string;
  user_id: string;
  space_id: string;
  role: MemberRole;
  joined_at: string;
  status: string;
  is_online?: boolean;
  last_active_at: string | null;
  full_name: string | null;
  avatar_url: string | null;
  profile_url: string | null;
  activity_score: number;
};

interface AdminOwnerMemberCardProps {
  member: DisplayMember;
  currentUserId: string | undefined;
  currentUserRoleInSpace: MemberRole;
  spaceOwnerId: string | undefined;
  onChangeRole: (memberToUpdate: DisplayMember, newRole: MemberRole) => Promise<void>;
  onRemoveMember: (memberToUpdate: DisplayMember) => Promise<void>;
  onClick?: (member: DisplayMember) => void;
}

const formatJoinDate = (dateString: string | null) => {
  if (!dateString) return "Unknown";
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch (err) {
    return "Unknown";
  }
};

const formatLastActiveDate = (dateString: string | null, isOnline?: boolean) => {
  if (isOnline) return <span className="text-green-600 font-medium">Online</span>;
  if (!dateString) return <span className="text-gray-500">Never</span>;
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch (err) {
    return <span className="text-gray-500">Unknown</span>;
  }
};

const getRoleBadgeLocal = (role: MemberRole) => {
    switch (role) {
      case 'owner':
        return (
          <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 font-medium">
            <Crown className="h-3.5 w-3.5 mr-1.5" />
            Owner
          </Badge>
        );
      case 'admin':
        return (
          <Badge variant="outline" className="bg-teal-100 text-teal-700 border-teal-200 font-medium">
            <Shield className="h-3.5 w-3.5 mr-1.5" />
            Admin
          </Badge>
        );
      default: // Should not happen for this card, but good to have a fallback
        return (
          <Badge variant="secondary">
            {role.charAt(0).toUpperCase() + role.slice(1)}
          </Badge>
        );
    }
};

export const AdminOwnerMemberCard: React.FC<AdminOwnerMemberCardProps> = ({
  member,
  currentUserId,
  currentUserRoleInSpace,
  spaceOwnerId,
  onChangeRole,
  onRemoveMember,
  onClick,
}) => {

  const isCurrentUserViewingSelf = member.user_id === currentUserId;
  const canTakeAction = (currentUserRoleInSpace === 'owner' || currentUserRoleInSpace === 'admin') && !isCurrentUserViewingSelf && member.role !== 'owner';
  const canDemoteAdmin = currentUserRoleInSpace === 'owner' && member.role === 'admin';
  const canPromoteToAdmin = currentUserRoleInSpace === 'owner' && member.role === 'member'; // Though this card is for admin/owner

  const cardContent = (
    <>
      <div>
        <div className="flex items-start space-x-3 mb-3">
          <OptimizedAvatar
            user={{
              id: member.user_id,
              full_name: member.full_name,
              avatar_url: member.avatar_url
            }}
            size="lg"
            enableCaching={true}
          />
          <div className="flex-grow min-w-0">
            <h3 className="font-semibold text-gray-800 truncate" title={member.full_name || 'Unnamed Member'}>
              {member.full_name || 'Unnamed Member'}
            </h3>
            {member.profile_url ? (
              <a 
                href={member.profile_url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-xs text-teal-600 hover:text-teal-700 flex items-center hover:underline truncate"
                onClick={(e) => e.stopPropagation()} // Prevent triggering card click
              >
                <LinkIcon size={12} className="mr-1 flex-shrink-0" />
                View Profile
              </a>
            ) : (
              <span className="text-xs text-gray-400">No profile link</span>
            )}
          </div>
        </div>
        <div className="mb-3">{getRoleBadgeLocal(member.role)}</div>
        <div className="space-y-1 text-xs text-gray-500">
          <p>Joined: {formatJoinDate(member.joined_at)}</p>
          <p>Last Active: {formatLastActiveDate(member.last_active_at, member.is_online)}</p>
        </div>
      </div>

      {canTakeAction && (
        <div className="mt-3 self-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0"
                onClick={(e) => e.stopPropagation()} // Prevent triggering card click
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              {currentUserRoleInSpace === 'owner' && member.role === 'admin' && (
                <DropdownMenuItem onClick={() => onChangeRole(member, 'member')}>
                  Make Member (Demote)
                </DropdownMenuItem>
              )}
              {/* This case might not be common for this specific card if it only shows owners/admins
              {currentUserRoleInSpace === 'owner' && member.role === 'member' && (
                <DropdownMenuItem onClick={() => onChangeRole(member, 'admin')}>
                  Make Admin
                </DropdownMenuItem>
              )}
              */} 
              {(currentUserRoleInSpace === 'owner' || (currentUserRoleInSpace === 'admin' && member.role !== 'owner')) && 
                 member.user_id !== spaceOwnerId && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-red-600 hover:!text-red-700 focus:!bg-red-50 focus:!text-red-700"
                    onClick={() => onRemoveMember(member)}
                  >
                    <UserX className="h-4 w-4 mr-2" /> Remove from Space
                  </DropdownMenuItem>
                </>
              )}
              {/* Add more specific actions here if needed */}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        onClick={() => onClick(member)}
        className="bg-white p-4 rounded-lg shadow border border-gray-200 flex flex-col justify-between h-full w-full text-left hover:shadow-md hover:bg-gray-50 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        type="button"
        aria-label={`View profile of ${member.full_name || 'member'}`}
      >
        {cardContent}
      </button>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow border border-gray-200 flex flex-col justify-between h-full">
      {cardContent}
    </div>
  );
}; 