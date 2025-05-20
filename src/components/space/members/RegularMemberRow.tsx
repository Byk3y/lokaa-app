import React from 'react';
import { MemberRole } from "@/contexts/MembershipContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, UserX, Shield, Link as LinkIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext'; // To get current user for action checks

// Matching DisplayMember type from MembersTab.tsx
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

interface RegularMemberRowProps {
  member: DisplayMember;
  currentUserId: string | undefined;
  currentUserRoleInSpace: MemberRole;
  spaceOwnerId: string | undefined;
  onChangeRole: (memberToUpdate: DisplayMember, newRole: MemberRole) => Promise<void>;
  onRemoveMember: (memberToUpdate: DisplayMember) => Promise<void>;
  onLeaveSpace?: () => Promise<void>; // Optional: only if the row can represent the current user leaving
}

const getInitials = (name: string | null) => {
  if (!name) return "?";
  return name.split(' ').map(part => part[0]).join('').toUpperCase().substring(0, 2);
};

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

export const RegularMemberRow: React.FC<RegularMemberRowProps> = ({
  member,
  currentUserId,
  currentUserRoleInSpace,
  spaceOwnerId,
  onChangeRole,
  onRemoveMember,
  onLeaveSpace
}) => {

  const isCurrentUserViewingSelf = member.user_id === currentUserId;
  
  // Determine if actions can be taken by the current user on this member
  const canPromoteToAdmin = currentUserRoleInSpace === 'owner' && member.role === 'member';
  const canRemoveMember = 
    (currentUserRoleInSpace === 'owner' || 
     (currentUserRoleInSpace === 'admin' && member.role === 'member')) && 
    !isCurrentUserViewingSelf && member.user_id !== spaceOwnerId;

  const canLeaveSpace = isCurrentUserViewingSelf && currentUserRoleInSpace !== 'owner' && onLeaveSpace;

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center space-x-3">
          <Avatar className="h-9 w-9 flex-shrink-0">
            <AvatarImage src={member.avatar_url || undefined} alt={member.full_name || 'Member'} />
            <AvatarFallback className="text-xs">{getInitials(member.full_name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="font-medium text-gray-800 text-sm truncate" title={member.full_name || 'Unnamed Member'}>
              {member.full_name || 'Unnamed Member'}
            </div>
            {member.profile_url ? (
              <a 
                href={member.profile_url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-xs text-teal-600 hover:text-teal-700 flex items-center hover:underline truncate"
              >
                <LinkIcon size={12} className="mr-1 flex-shrink-0" />Profile
              </a>
            ) : (
              <span className="text-xs text-gray-400">No profile link</span>
            )}
          </div>
        </div>
      </td>
      <td className="px-3 py-3 whitespace-nowrap text-center text-sm text-gray-600 font-medium">
        {member.activity_score}
      </td>
      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">
        {formatJoinDate(member.joined_at)}
      </td>
      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">
        {formatLastActiveDate(member.last_active_at, member.is_online)}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
        {(canPromoteToAdmin || canRemoveMember || canLeaveSpace) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              {canPromoteToAdmin && (
                <DropdownMenuItem onClick={() => onChangeRole(member, 'admin')}>
                  <Shield className="h-4 w-4 mr-2" /> Make Admin
                </DropdownMenuItem>
              )}
              {canRemoveMember && (
                <>
                  {canPromoteToAdmin && <DropdownMenuSeparator />}
                  <DropdownMenuItem 
                    className="text-red-600 hover:!text-red-700 focus:!bg-red-50 focus:!text-red-700"
                    onClick={() => onRemoveMember(member)}
                  >
                    <UserX className="h-4 w-4 mr-2" /> Remove from Space
                  </DropdownMenuItem>
                </>
              )}
              {canLeaveSpace && (
                <>
                  {(canPromoteToAdmin || canRemoveMember) && <DropdownMenuSeparator />}
                  <DropdownMenuItem 
                    className="text-red-600 hover:!text-red-700 focus:!bg-red-50 focus:!text-red-700"
                    onClick={onLeaveSpace}
                  >
                    <UserX className="h-4 w-4 mr-2" /> Leave Space
                  </DropdownMenuItem>
                </>
              )}
              {!(canPromoteToAdmin || canRemoveMember || canLeaveSpace) && (
                <DropdownMenuItem disabled>No actions available</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </td>
    </tr>
  );
}; 