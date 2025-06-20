import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns'; // Corrected import for date-fns
import { getInitials } from '@/shared/utils/avatar-utils'; // 🎯 Use unified function

export interface MemberCardProps {
  avatar_url: string | null;
  full_name: string | null;
  bio: string | null;
  joined_at: string;
  onClick?: () => void;
}

const MemberCard: React.FC<MemberCardProps> = ({
  avatar_url,
  full_name,
  bio,
  joined_at,
  onClick,
}) => {
  const formattedJoinDate = joined_at ? format(new Date(joined_at), 'MMM d, yyyy') : 'N/A';

  const cardContent = (
    <>
      <Avatar className="w-20 h-20 mb-3">
        <AvatarImage src={avatar_url || undefined} alt={full_name || 'Member'} />
        <AvatarFallback>{getInitials(full_name)}</AvatarFallback>
      </Avatar>
      <h3 className="text-lg font-semibold text-foreground">{full_name || 'Unnamed Member'}</h3>
      <p className="text-sm text-muted-foreground mt-1 mb-2 truncate w-full px-2" title={bio || ''}>
        {bio || <span className="italic">No bio provided.</span>}
      </p>
      <p className="text-xs text-muted-foreground">Joined: {formattedJoinDate}</p>
    </>
  );

  if (onClick) {
    return (
      <button 
        onClick={onClick}
        className="bg-card border border-border rounded-lg p-4 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-all duration-200 w-full max-w-xs mx-auto cursor-pointer hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        type="button"
        aria-label={`View profile of ${full_name || 'member'}`}
      >
        {cardContent}
      </button>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow duration-200 w-full max-w-xs mx-auto">
      {cardContent}
    </div>
  );
};

export default MemberCard; 