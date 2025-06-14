import { useEffect } from 'react';
import { useLeaderboardCache } from './useLeaderboardCache';
import type { CachedLeaderboardUser, CachedUserStanding } from './useLeaderboardCache';

// Re-export the types for convenience
export type { CachedLeaderboardUser, CachedUserStanding };

interface UseCachedLeaderboardReturn {
  leaderboardUsers: CachedLeaderboardUser[];
  currentUserStanding: CachedUserStanding | null;
  loading: boolean;
  error: string | null;
  refetch: (forceRefresh?: boolean) => Promise<void>;
  
  // Action handlers
  handleUserPointsUpdated: (userId: string, newPoints: number) => void;
}

export function useCachedLeaderboard(
  spaceId: string | undefined, 
  currentUserId: string | undefined
): UseCachedLeaderboardReturn {
  const {
    fetchLeaderboard,
    getLeaderboardUsers,
    getCurrentUserStanding,
    isLoading,
    getError,
    updateUserPoints,
  } = useLeaderboardCache();

  // Auto-fetch leaderboard when spaceId or currentUserId changes
  useEffect(() => {
    if (spaceId) {
      console.log('🔄 useCachedLeaderboard: Auto-fetching leaderboard for space:', spaceId, 'user:', currentUserId);
      fetchLeaderboard(spaceId, currentUserId);
    }
  }, [spaceId, currentUserId, fetchLeaderboard]);

  // Get current data from cache
  const leaderboardUsers = spaceId ? getLeaderboardUsers(spaceId) : [];
  const currentUserStanding = spaceId ? getCurrentUserStanding(spaceId) : null;
  const loading = spaceId ? isLoading(spaceId) : false;
  const error = spaceId ? getError(spaceId) : null;

  // Refetch function
  const refetch = async (forceRefresh = false) => {
    if (spaceId) {
      console.log('🔄 useCachedLeaderboard: Manual refetch for space:', spaceId, 'forceRefresh:', forceRefresh);
      await fetchLeaderboard(spaceId, currentUserId, forceRefresh);
    }
  };

  // Action handlers
  const handleUserPointsUpdated = (userId: string, newPoints: number) => {
    if (spaceId) {
      console.log('📊 useCachedLeaderboard: Updating user points in cache:', userId, 'new points:', newPoints);
      updateUserPoints(spaceId, userId, newPoints);
    }
  };

  return {
    leaderboardUsers,
    currentUserStanding,
    loading,
    error,
    refetch,
    handleUserPointsUpdated,
  };
} 