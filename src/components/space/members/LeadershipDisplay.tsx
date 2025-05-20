import React, { useState } from 'react';
import { DisplayMember } from '@/components/space/MembersTab'; 
import { MemberRole } from '@/types/members';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// import { getInitials } from '@/lib/utils'; // Assuming you have a utility for initials

// Simple getInitials function
const getInitials = (name: string | null | undefined): string => {
  if (!name) return 'U';
  const names = name.split(' ');
  const initials = names.map(n => n[0]).join('');
  return initials.length > 2 ? initials.substring(0, 2) : initials.toUpperCase() || 'U';
};

interface LeadershipDisplayProps {
  owner?: DisplayMember;
  admins: DisplayMember[];
  currentUserId?: string;
  currentUserRoleInSpace: MemberRole;
  spaceOwnerId?: string;
  onChangeRole: (member: DisplayMember, newRole: MemberRole) => void;
  onRemoveMember: (member: DisplayMember) => void;
}

// const pentagonClipPath = "polygon(50% 0%, 100% 40%, 90% 100%, 10% 100%, 0% 40%)"; // Replaced by SVG clip path
const ownerShapeStyle = {
  // clipPath: pentagonClipPath, // Old sharp-edged CSS clip-path
  clipPath: 'url(#roundedBlobClipPath)', // Updated ID for clarity
  width: '180px',
  height: '170px',
  backgroundColor: 'hsl(var(--muted))', 
  overflow: 'hidden', 
};

const AdminOwnerCard: React.FC<{
  member: DisplayMember; 
  currentUserId?: string;
  currentUserRoleInSpace: MemberRole;
  spaceOwnerId?: string;
  onChangeRole: (member: DisplayMember, newRole: MemberRole) => void;
  onRemoveMember: (member: DisplayMember) => void;
}> = ({ member, currentUserId, currentUserRoleInSpace, spaceOwnerId, onChangeRole, onRemoveMember }) => {
  const canPerformActions = currentUserRoleInSpace === 'owner' || (currentUserRoleInSpace === 'admin' && member.role !== 'owner');
  const isSelf = member.user_id === currentUserId;
  const isOwner = member.user_id === spaceOwnerId; // Determine if this card is for the owner

  return (
    <div className={`
      flex flex-col items-center p-6 bg-card rounded-xl shadow-lg w-full max-w-[280px] 
      border ${isOwner ? 'border-primary/60' : 'border-border/50'} 
      space-y-3 transition-all duration-200 ease-in-out hover:shadow-xl hover:scale-[1.03]
    `}>
      <Avatar className="w-24 h-24 mb-2 ring-1 ring-border ring-offset-2 ring-offset-background">
        <AvatarImage src={member.avatar_url || undefined} alt={member.full_name || 'User'} />
        <AvatarFallback className="text-3xl">{getInitials(member.full_name || 'U')}</AvatarFallback>
      </Avatar>
      
      <div className="text-center">
        <h4 className="font-semibold text-xl text-foreground truncate w-full">{member.full_name || 'N/A'}</h4>
        <p className="text-sm text-muted-foreground capitalize">{member.role}</p>
      </div>
      
      {canPerformActions && member.user_id !== spaceOwnerId && !isSelf && (
        <div className="pt-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {member.role === 'admin' && currentUserRoleInSpace === 'owner' && (
                <DropdownMenuItem onClick={() => onChangeRole(member, 'member')}>
                  Demote to Member
                </DropdownMenuItem>
              )}
              {/* Promotion to admin for 'member' role might be handled elsewhere or if logic allows here */}
              {/* {(member.role === 'member' && (currentUserRoleInSpace === 'owner' || currentUserRoleInSpace === 'admin')) && (
                 <DropdownMenuItem onClick={() => onChangeRole(member, 'admin')}>
                  Promote to Admin
                </DropdownMenuItem>
              )} */} 
              {(currentUserRoleInSpace === 'owner') && member.role === 'admin' && <DropdownMenuSeparator />}
              {currentUserRoleInSpace === 'owner' && member.role === 'admin' && (
                <DropdownMenuItem onClick={() => onRemoveMember(member)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                  Remove Admin
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      {isSelf && <p className="text-xs text-muted-foreground">(This is you)</p>}
      {/* If no actions and not self, ensure card maintains some height or add a placeholder for alignment */}
      {!(canPerformActions && member.user_id !== spaceOwnerId && !isSelf) && !isSelf && <div className="h-[36px]"></div>} 
    </div>
  );
};

export const LeadershipDisplay: React.FC<LeadershipDisplayProps> = ({
  owner,
  admins,
  currentUserId,
  currentUserRoleInSpace,
  spaceOwnerId,
  onChangeRole,
  onRemoveMember,
}) => {
  const allLeaders = owner ? [owner, ...admins] : admins;

  if (allLeaders.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      {/* Optional: A title for the leadership section if desired, e.g., "Team Leaders" */}
      {/* <h3 className="text-xl font-medium mb-6 text-center">Key Members</h3> */}
      <div className="flex flex-wrap justify-center gap-6 md:gap-8">
        {allLeaders.map(leader => (
          <AdminOwnerCard 
            key={leader.id} 
            member={leader}
            currentUserId={currentUserId}
            currentUserRoleInSpace={currentUserRoleInSpace}
            spaceOwnerId={spaceOwnerId}
            onChangeRole={onChangeRole}
            onRemoveMember={onRemoveMember}
          />
        ))}
      </div>
    </div>
  );
}; 