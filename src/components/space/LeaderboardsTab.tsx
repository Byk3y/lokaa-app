import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { calculateUserLevelInfo, UserLevelInfo } from '@/utils/levelUtils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Award, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Import actual child components
import PointsLevelsInfo from './leaderboard/PointsLevelsInfo';
import CurrentUserSpaceStandingDisplay from './leaderboard/CurrentUserSpaceStandingDisplay';
import LeaderboardMemberItem from './leaderboard/LeaderboardMemberItem';

// Local type definitions for this component
export interface LeaderboardUserData {
  userId: string;
  fullName: string | null;
  avatarUrl: string | null;
  pointsInSpace: number;
}

export interface RankedLeaderboardUser extends LeaderboardUserData {
  rank: number;
  levelInfo: UserLevelInfo;
}

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
  console.log('[LeaderboardsTab Render] spaceId prop:', spaceId, 'spaceName:', spaceName);

  const { user: currentUser } = useAuth();
  const [leaderboardUsers, setLeaderboardUsers] = useState<RankedLeaderboardUser[]>([]);
  const [currentUserStanding, setCurrentUserStanding] = useState<RankedLeaderboardUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboardData = useCallback(async () => {
    console.log('fetchLeaderboardData called. spaceId:', spaceId);

    if (!spaceId) {
      setIsLoading(false);
      setLeaderboardUsers([]);
      setCurrentUserStanding(null);
      return;
    }
    setIsLoading(true);
    setError(null);

    let rankedUsers: RankedLeaderboardUser[] = [];

    try {
      // Step 1: Fetch top user_ids and points from space_user_points
      const { data: topUserPointsData, error: topUserPointsError } = await supabase
        .from('space_user_points')
        .select('user_id, points') // Only select user_id and points initially
        .eq('space_id', spaceId)
        .order('points', { ascending: false })
        .limit(100);

      if (topUserPointsError) throw topUserPointsError;

      console.log('Top User Points Data from Supabase:', JSON.stringify(topUserPointsData, null, 2));

      if (!topUserPointsData || topUserPointsData.length === 0) {
        setLeaderboardUsers([]);
        // No need to fetch current user standing if leaderboard is empty, unless specifically required
        // For now, let's handle current user standing separately if needed or assume they are not on the board
      } else {
        const userIds = topUserPointsData.map(entry => entry.user_id);

        // Step 2: Fetch user profiles for the collected user_ids
        const { data: profilesData, error: profilesError } = await supabase
          .from('users') // Assuming 'users' is public.users
          .select('id, full_name, avatar_url')
          .in('id', userIds);

        if (profilesError) throw profilesError;

        const profilesMap = new Map(profilesData.map(profile => [profile.id, profile]));

        // Step 3: Combine points data with profile data
        rankedUsers = topUserPointsData.map((entry, index: number) => {
          const profile = profilesMap.get(entry.user_id);
          return {
            userId: entry.user_id,
            fullName: profile ? profile.full_name : 'Unknown User',
            avatarUrl: profile ? profile.avatar_url : null,
            pointsInSpace: entry.points,
            rank: index + 1,
            levelInfo: calculateUserLevelInfo(entry.points),
          };
        });
        setLeaderboardUsers(rankedUsers);
      }

      // Current user standing logic (can remain largely the same, as it fetches points and profile separately)
      if (currentUser) {
        const { data: rawCurrentUserPointData, error: currentUserPointError } = await supabase
          .from('space_user_points')
          .select('points')
          .eq('space_id', spaceId)
          .eq('user_id', currentUser.id)
          .single();

        // Explicitly cast the data part to help TypeScript
        const currentUserPointData = rawCurrentUserPointData as ({ points: number } | null);

        if (currentUserPointError && currentUserPointError.code !== 'PGRST116') {
          throw currentUserPointError;
        }
        
        if (currentUserPointData) {
          let rank = 0;
          const userInTop = rankedUsers.find(u => u.userId === currentUser.id);
          if (userInTop) {
            rank = userInTop.rank;
          } else {
            const { count, error: rankError } = await supabase
              .from('space_user_points')
              .select('*' , { count: 'exact', head: true })
              .eq('space_id', spaceId)
              .gt('points', currentUserPointData.points);
            
            if (rankError) {
              console.error('Error fetching rank for current user:', rankError);
            } else {
              rank = (count || 0) + 1;
            }
          }
          
          // Fetch full user data for current user (name, avatar) as it might not be in topUsersData
          const { data: fullCurrentUserData, error: fullUserError } = await supabase
            .from('users')
            .select('full_name, avatar_url')
            .eq('id', currentUser.id)
            .single();

          if (fullUserError) throw fullUserError;

          setCurrentUserStanding({
            userId: currentUser.id,
            fullName: fullCurrentUserData.full_name,
            avatarUrl: fullCurrentUserData.avatar_url,
            pointsInSpace: currentUserPointData.points,
            rank: rank,
            levelInfo: calculateUserLevelInfo(currentUserPointData.points),
          });
        } else {
           // User might not have any points in this space yet
           const { data: basicCurrentUserData, error: basicUserError } = await supabase
            .from('users')
            .select('full_name, avatar_url')
            .eq('id', currentUser.id)
            .single();
            if(basicUserError) throw basicUserError;

            setCurrentUserStanding({
                userId: currentUser.id,
                fullName: basicCurrentUserData.full_name,
                avatarUrl: basicCurrentUserData.avatar_url,
                pointsInSpace: 0,
                rank: 0, // Indicates no rank / not on leaderboard
                levelInfo: calculateUserLevelInfo(0),
            });
        }
      }
    } catch (err) {
      console.error("Error fetching leaderboard data:", err);
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard.');
    } finally {
      setIsLoading(false);
    }
  }, [spaceId, currentUser]);

  useEffect(() => {
    console.log('[LeaderboardsTab useEffect] Triggered. spaceId:', spaceId);
    if (spaceId) {
      console.log('[LeaderboardsTab useEffect] spaceId is present, calling fetchLeaderboardData.');
      fetchLeaderboardData();
    } else {
      console.log('[LeaderboardsTab useEffect] spaceId is NOT present. Clearing data and loader.');
      setIsLoading(false); 
      setLeaderboardUsers([]);
      setCurrentUserStanding(null);
    }
  }, [spaceId, currentUser, fetchLeaderboardData]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-60"><Loader2 className="h-10 w-10 animate-spin text-primary" /> <p className="ml-3 text-lg text-muted-foreground">Loading Leaderboard...</p></div>;
  }

  if (error) {
    return <div className="text-center p-6 bg-red-50 border border-red-200 rounded-lg shadow-md"><p className="text-xl font-semibold text-red-700">Oops! Something went wrong.</p><p className="text-red-600 mt-2">Error: {error}</p><Button onClick={fetchLeaderboardData} variant="destructive" className="mt-4">Try Again</Button></div>;
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
            <p className="text-center text-muted-foreground py-12">No members on the leaderboard yet. Be the first to earn points!</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LeaderboardsTab; 