import React from 'react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Award, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCachedLeaderboard, type CachedLeaderboardUser, type CachedUserStanding } from '@/hooks/useCachedLeaderboard';

// Import actual child components
import PointsLevelsInfo from './leaderboard/PointsLevelsInfo';
import CurrentUserSpaceStandingDisplay from './leaderboard/CurrentUserSpaceStandingDisplay';
import LeaderboardMemberItem from './leaderboard/LeaderboardMemberItem';

// Use cached types from the hook
export type LeaderboardUserData = CachedLeaderboardUser;
export type RankedLeaderboardUser = CachedLeaderboardUser;

interface LeaderboardsTabProps {
  spaceId: string;
  spaceName: string;
}

// Helper function to convert string to title case
const toTitleCase = (str: string | null | undefined): string => {
  if (!str) return '';
  return str.toLowerCase().split(' ').map(word => {
    return (word.charAt(0).toUpperCase() + word.slice(1));
  }).join(' ');
};

const LeaderboardsTab: React.FC<LeaderboardsTabProps> = ({ spaceId, spaceName }) => {
  const { user: currentUser } = useOptimizedAuth();
  
  // Use cached leaderboard data instead of local state
  const {
    leaderboardUsers,
    currentUserStanding,
    loading: isLoading,
    error,
    refetch,
  } = useCachedLeaderboard(spaceId, currentUser?.id);

  // The fetchLeaderboardData and useEffect logic is now handled by useCachedLeaderboard hook

  if (isLoading) {
    return <div className="flex items-center justify-center h-60"><Loader2 className="h-10 w-10 animate-spin text-primary" /> <p className="ml-3 text-lg text-muted-foreground">Loading Leaderboard...</p></div>;
  }

  if (error) {
    return <div className="text-center p-6 bg-red-50 border border-red-200 rounded-lg shadow-md"><p className="text-xl font-semibold text-red-700">Oops! Something went wrong.</p><p className="text-red-600 mt-2">Error: {error}</p><Button onClick={() => refetch(true)} variant="destructive" className="mt-4">Try Again</Button></div>;
  }

  const capitalizedSpaceName = toTitleCase(spaceName);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Leaderboard: {capitalizedSpaceName}</h1>
        <p className="text-muted-foreground">See who's leading the charge in this community!</p>
      </div>

      <PointsLevelsInfo />

      {currentUser && currentUserStanding && (
        <CurrentUserSpaceStandingDisplay user={currentUserStanding} spaceName={capitalizedSpaceName} />
      )}

      <Card className="shadow-md">
        <CardHeader>
          <div className="flex items-center">
              <Award className="h-5 w-5 mr-2 text-amber-500" />
              <CardTitle>Top Members</CardTitle>
          </div>
          <CardDescription>Ranking based on total points earned in this space.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {leaderboardUsers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center w-16 pl-6">Rank</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead className="text-right pr-6">Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboardUsers.map(user => (
                  <LeaderboardMemberItem 
                    key={user.userId} 
                    user={user} 
                    isCurrentUser={currentUser?.id === user.userId} 
                  />
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <h3 className="font-medium text-yellow-800">Leaderboard Temporarily Unavailable</h3>
                </div>
                <p className="text-sm text-yellow-700">
                  We're still recovering from the recent service disruption. Leaderboard data will be restored soon.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LeaderboardsTab; 