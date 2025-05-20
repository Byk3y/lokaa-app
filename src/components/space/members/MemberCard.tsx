import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns'; // Corrected import for date-fns

export interface MemberCardProps {
  avatar_url: string | null;
  full_name: string | null;
  bio: string | null;
  joined_at: string;
}

const MemberCard: React.FC<MemberCardProps> = ({
  avatar_url,
  full_name,
  bio,
  joined_at,
}) => {
  const getInitials = (name: string | null): string => {
    if (!name) return '?';
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  const formattedJoinDate = joined_at ? format(new Date(joined_at), 'MMM d, yyyy') : 'N/A';

  return (
    <div className="bg-card border border-border rounded-lg p-4 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow duration-200 w-full max-w-xs mx-auto">
      <Avatar className="w-20 h-20 mb-3">
        <AvatarImage src={avatar_url || undefined} alt={full_name || 'Member'} />
        <AvatarFallback>{getInitials(full_name)}</AvatarFallback>
      </Avatar>
      <h3 className="text-lg font-semibold text-foreground">{full_name || 'Unnamed Member'}</h3>
      <p className="text-sm text-muted-foreground mt-1 mb-2 truncate w-full px-2" title={bio || ''}>
        {bio || <span className="italic">No bio provided.</span>}
      </p>
      <p className="text-xs text-muted-foreground">Joined: {formattedJoinDate}</p>
    </div>
  );
};

export default MemberCard; 