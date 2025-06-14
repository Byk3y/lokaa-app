import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Trophy } from 'lucide-react';
import { RankedLeaderboardUser } from '../LeaderboardsTab'; // Assuming types are exported from parent
import { getInitials, LEVEL_THRESHOLDS } from '@/utils/levelUtils';

interface CurrentUserSpaceStandingDisplayProps {
    user: RankedLeaderboardUser | null;
    spaceName: string;
}

const CurrentUserSpaceStandingDisplay: React.FC<CurrentUserSpaceStandingDisplayProps> = ({ user, spaceName }) => {
    if (!user) return null;
    
    // CRITICAL FIX: Add null safety checks for points data
    const safePointsInSpace = user.pointsInSpace ?? 0;
    const safePointsNeededForNextLevel = user.levelInfo?.pointsNeededForNextLevel ?? 0;
    const safeProgressPercentage = user.levelInfo?.progressPercentage ?? 0;
    const safeLevelName = user.levelInfo?.name ?? 'Unknown Level';
    const safeIsMaxLevel = user.levelInfo?.isMaxLevel ?? false;
    
    return (
        <Card className="mb-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30 shadow-lg">
            <CardHeader>
                <div className="flex items-center">
                    <Trophy className="h-6 w-6 mr-3 text-primary" />
                    <CardTitle className="text-xl text-foreground">Your Standing in {spaceName}</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                <Avatar className="w-16 h-16 sm:w-20 sm:h-20 border-2 border-primary shadow-md">
                    <AvatarImage src={user.avatarUrl || undefined} alt={user.fullName || 'User'} />
                    <AvatarFallback className="text-xl sm:text-2xl bg-muted">{getInitials(user.fullName)}</AvatarFallback>
                </Avatar>
                <div className="flex-grow text-center sm:text-left">
                    <p className="text-2xl font-bold text-foreground">Rank #{user.rank}</p>
                    <p className="text-lg font-semibold text-primary">{safeLevelName}</p>
                    <p className="text-sm text-muted-foreground">{safePointsInSpace.toLocaleString()} Points</p>
                    {!safeIsMaxLevel && (
                        <div className="mt-2">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                <span>Progress to {LEVEL_THRESHOLDS.find(l => l.level === (user.levelInfo?.level ?? 0) + 1)?.name || 'Next Level'}</span>
                                <span>{safePointsNeededForNextLevel.toLocaleString()} pts to go</span>
                            </div>
                            <Progress value={safeProgressPercentage} className="h-2 bg-primary/20 [&>*]:bg-primary" />
                        </div>
                    )}
                     {safeIsMaxLevel && (
                        <p className="text-xs text-green-500 mt-2 font-medium">Congratulations! You've reached the highest level!</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default CurrentUserSpaceStandingDisplay; 