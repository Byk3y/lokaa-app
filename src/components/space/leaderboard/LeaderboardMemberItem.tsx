import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RankedLeaderboardUser } from '../LeaderboardsTab'; // Assuming types are exported from parent
import { getInitials } from '@/utils/levelUtils';
import { Medal, Award, Trophy } from 'lucide-react'; // Import icons

interface LeaderboardMemberItemProps {
    user: RankedLeaderboardUser;
    isCurrentUser: boolean;
}

const LeaderboardMemberItem: React.FC<LeaderboardMemberItemProps> = ({ user, isCurrentUser }) => {
    const rank = user.rank;
    let rankIcon = null;
    let rankCellStyle = '';
    const rowStyle = isCurrentUser ? 'bg-primary/10 border-l-4 border-primary shadow-md' : 'hover:bg-muted/50';
    let avatarBorderStyle = isCurrentUser ? 'border-primary/60' : 'border-transparent';
    
    // CRITICAL FIX: Add null safety check for points data
    const safePointsInSpace = user.pointsInSpace ?? 0;
    const safeLevelName = user.levelInfo?.name ?? 'Unknown Level';
    
    if (!isCurrentUser) { // Apply podium styles only if not the current user, or current user highlight will take over
        if (rank === 1) {
            rankIcon = <Trophy className="h-5 w-5 text-yellow-500" />;
            rankCellStyle = 'text-yellow-500 font-bold';
            // rowStyle = 'bg-yellow-500/5'; // Subtle background for rank 1
            avatarBorderStyle = 'border-yellow-500/50';
        } else if (rank === 2) {
            rankIcon = <Award className="h-5 w-5 text-gray-400" />;
            rankCellStyle = 'text-gray-400 font-semibold';
            // rowStyle = 'bg-gray-400/5'; // Subtle background for rank 2
            avatarBorderStyle = 'border-gray-400/50';
        } else if (rank === 3) {
            rankIcon = <Medal className="h-5 w-5 text-orange-400" />;
            rankCellStyle = 'text-orange-400 font-semibold';
            // rowStyle = 'bg-orange-400/5'; // Subtle background for rank 3
            avatarBorderStyle = 'border-orange-400/50';
        }
    }
    
    // If it is the current user, override podium styles for consistent "You" highlighting
    if (isCurrentUser) {
        rankCellStyle = 'text-primary font-bold'; // Ensure rank text is primary for current user
        // rowStyle is already set for current user
        // avatarBorderStyle is already set for current user
        if (rank === 1) rankIcon = <Trophy className="h-5 w-5 text-primary" />;
        else if (rank === 2) rankIcon = <Award className="h-5 w-5 text-primary" />;
        else if (rank === 3) rankIcon = <Medal className="h-5 w-5 text-primary" />;

    }

    return (
        <TableRow className={`transition-all duration-150 ease-in-out ${rowStyle}`}>
            <TableCell 
                className={`font-medium text-center w-20 py-4 pl-4 pr-2 ${rankCellStyle}`}
            >
                <div className="flex items-center justify-center gap-2">
                    {rankIcon}
                    <span>{rank}</span>
                </div>
            </TableCell>
            <TableCell className="py-3">
                <div className="flex items-center gap-3">
                    <Avatar className={`h-10 w-10 border-2 transition-colors ${avatarBorderStyle}`}>
                        <AvatarImage src={user.avatarUrl || undefined} alt={user.fullName || 'User'} />
                        <AvatarFallback 
                            className={`${isCurrentUser ? 'bg-primary/20 text-primary font-semibold' : rank === 1 ? 'bg-yellow-500/10 text-yellow-600' : rank === 2 ? 'bg-gray-400/10 text-gray-500' : rank === 3 ? 'bg-orange-400/10 text-orange-500' : 'bg-muted'}`}
                        >
                            {getInitials(user.fullName)}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <p className={`font-semibold ${isCurrentUser ? 'text-primary' : rank <=3 ? rankCellStyle :'text-foreground'}`}>
                            {user.fullName || 'Anonymous User'} 
                            {isCurrentUser && <span className='ml-1.5 text-xs font-normal bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full align-middle'>You</span>}
                        </p>
                        <p className={`text-xs ${isCurrentUser ? 'text-primary/90' : rank <=3 ? 'opacity-80':'text-muted-foreground'}`}>{safeLevelName}</p>
                    </div>
                </div>
            </TableCell>
            <TableCell className={`text-right font-bold text-lg py-4 pr-6 ${isCurrentUser ? 'text-primary' : rankCellStyle ? rankCellStyle : 'text-foreground'}`}>
                {safePointsInSpace.toLocaleString()}
                <span className="text-xs font-normal ml-1 opacity-70">pts</span>
            </TableCell>
        </TableRow>
    );
};

export default LeaderboardMemberItem; 