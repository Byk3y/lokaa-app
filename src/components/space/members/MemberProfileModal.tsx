import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MemberRole } from "@/contexts/MembershipContext";
import { navigateToProfileWithContext } from '@/utils/spaceContextUtils';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Crown, Shield, MoreHorizontal, UserX, ExternalLink, LogOut } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import FollowButton from '@/components/profile/FollowButton';

// Re-use the DisplayMember type from MembersTab
export type DisplayMember = {
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
  bio?: string | null;
  activity_score: number;
};

interface MemberProfileModalProps {
  member: DisplayMember | null;
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string | undefined;
  currentUserRoleInSpace: MemberRole;
  spaceOwnerId: string | undefined;
  onChangeRole: (memberToUpdate: DisplayMember, newRole: MemberRole) => Promise<void>;
  onRemoveMember: (memberToUpdate: DisplayMember) => Promise<void>;
  onLeaveSpace?: () => Promise<void>;
}

const getInitials = (name: string | null) => {
  if (!name) return "?";
  return name.split(' ').map(part => part[0]).join('').toUpperCase().substring(0, 2);
};

const formatJoinDate = (dateString: string | null) => {
  if (!dateString) return "Unknown";
  try {
    return format(new Date(dateString), 'MMMM d, yyyy');
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

const getRoleBadge = (role: MemberRole) => {
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
    default:
      return (
        <Badge variant="secondary">
          Member
        </Badge>
      );
  }
};

export const MemberProfileModal: React.FC<MemberProfileModalProps> = ({
  member,
  isOpen,
  onClose,
  currentUserId,
  currentUserRoleInSpace,
  spaceOwnerId,
  onChangeRole,
  onRemoveMember,
  onLeaveSpace,
}) => {
  const navigate = useNavigate();

  if (!member) return null;

  const isCurrentUserViewingSelf = member.user_id === currentUserId;
  const canTakeAction = (currentUserRoleInSpace === 'owner' || currentUserRoleInSpace === 'admin') && 
                       !isCurrentUserViewingSelf && 
                       member.role !== 'owner';
  const canDemoteAdmin = currentUserRoleInSpace === 'owner' && member.role === 'admin';
  const canPromoteToAdmin = currentUserRoleInSpace === 'owner' && member.role === 'member';
  const canDemoteToMember = currentUserRoleInSpace === 'owner' && member.role === 'admin';

  const handleViewProfile = () => {
    if (member.profile_url) {
      // Use the new space context utility for clean navigation with Skool-style URLs
      navigateToProfileWithContext(member.profile_url, navigate);
      onClose();
    }
  };

  const handleLeaveSpace = async () => {
    if (onLeaveSpace) {
      await onLeaveSpace();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md"
        onOpenAutoFocus={(e) => {
          // Prevent auto focus conflicts
          e.preventDefault();
        }}
        onCloseAutoFocus={(e) => {
          // Prevent auto focus issues when closing
          e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Member Profile</DialogTitle>
          <DialogDescription className="sr-only">
            View profile information for {member?.full_name || 'this member'} including their role, activity, and available actions.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Profile Header */}
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={member.avatar_url || undefined} alt={member.full_name || 'Member'} />
              <AvatarFallback className="text-lg">{getInitials(member.full_name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-foreground truncate">
                {member.full_name || 'Unnamed Member'}
              </h3>
              <div className="mt-1">
                {getRoleBadge(member.role)}
              </div>
            </div>
          </div>

          {/* Bio */}
          {member.bio && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground">Bio</h4>
              <p className="text-sm text-muted-foreground">{member.bio}</p>
            </div>
          )}

          {/* Member Details */}
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Joined:</span>
              <span className="text-foreground">{formatJoinDate(member.joined_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Active:</span>
              <span>{formatLastActiveDate(member.last_active_at, member.is_online)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Activity Score:</span>
              <span className="text-foreground">{member.activity_score || 0}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            {/* Main Action Buttons - Available to all users */}
            <div className="flex gap-2">
              {/* Profile Button */}
              {member.profile_url && (
                <Button 
                  onClick={handleViewProfile}
                  variant="outline"
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Profile
                </Button>
              )}
              
              {/* Follow Button - Only for non-self, using the existing FollowButton component */}
              {!isCurrentUserViewingSelf && (
                <div className="flex-1">
                  <FollowButton 
                    userId={member.user_id}
                    variant="outline"
                    className="w-full"
                    size="md"
                  />
                </div>
              )}
            </div>

            {/* Self Actions */}
            {isCurrentUserViewingSelf && currentUserRoleInSpace !== 'owner' && onLeaveSpace && (
              <Button 
                onClick={handleLeaveSpace}
                variant="outline"
                className="w-full text-red-600 border-red-200 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Leave Space
              </Button>
            )}

            {/* Admin Actions */}
            {canTakeAction && (
              <div className="flex justify-center pt-2 border-t">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
                      <MoreHorizontal className="h-4 w-4 mr-2" />
                      Admin Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center">
                    <DropdownMenuLabel>Manage Member</DropdownMenuLabel>
                    
                    {/* Role Change Actions */}
                    {canPromoteToAdmin && (
                      <DropdownMenuItem onClick={() => onChangeRole(member, 'admin')}>
                        <Shield className="h-4 w-4 mr-2" />
                        Promote to Admin
                      </DropdownMenuItem>
                    )}
                    
                    {canDemoteToMember && (
                      <DropdownMenuItem onClick={() => onChangeRole(member, 'member')}>
                        Demote to Member
                      </DropdownMenuItem>
                    )}

                    {/* Remove Member */}
                    {member.user_id !== spaceOwnerId && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-red-600 hover:!text-red-700 focus:!bg-red-50 focus:!text-red-700"
                          onClick={() => onRemoveMember(member)}
                        >
                          <UserX className="h-4 w-4 mr-2" />
                          Remove from Space
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 