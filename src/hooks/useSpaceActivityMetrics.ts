import { useState, useEffect, useCallback, useRef } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';

interface ActivityDataPoint {
  date: string;
  activeMembers: number;
}

interface ActivityMetrics {
  data: ActivityDataPoint[];
  totalActive: number;
  activityPercentage: number;
  loading: boolean;
  error: string | null;
}

interface CachedActivityMetrics extends ActivityMetrics {
  timestamp: number;
  spaceId: string;
  days: number;
}

// Cache with 5-minute TTL
const CACHE_TTL = 5 * 60 * 1000;
const activityMetricsCache = new Map<string, CachedActivityMetrics>();

export const useSpaceActivityMetrics = (spaceId: string, days: number = 30): ActivityMetrics => {
  const [activityData, setActivityData] = useState<ActivityMetrics>({
    data: [],
    totalActive: 0,
    activityPercentage: 0,
    loading: true,
    error: null
  });
  
  const lastFetchRef = useRef<string>('');

  const fetchActivityMetrics = useCallback(async (force = false) => {
    if (!spaceId) {
      setActivityData(prev => ({ ...prev, loading: false }));
      return;
    }

    // Check cache first unless forced refresh
    const cacheKey = `${spaceId}-${days}`;
    const cached = activityMetricsCache.get(cacheKey);
    const now = Date.now();
    
    if (!force && cached && cached.spaceId === spaceId && cached.days === days && (now - cached.timestamp < CACHE_TTL)) {
      // Return cached data and set loading to false
      const { timestamp, spaceId: cachedSpaceId, days: cachedDays, ...cachedData } = cached;
      setActivityData({ ...cachedData, loading: false });
      lastFetchRef.current = cacheKey;
      return;
    }

    // Only show loading if we don't have cached data for this combination
    if (!cached || cached.spaceId !== spaceId || cached.days !== days) {
      setActivityData(prev => ({ ...prev, loading: true }));
    }

    try {
      const supabase = getSupabaseClient();
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);

      // Get total member count
      const { data: totalMembersData, error: membersError } = await supabase
        .from('space_members')
        .select('user_id')
        .eq('space_id', spaceId)
        .eq('status', 'active');

      if (membersError) {
        console.error('Error fetching total members:', membersError);
        setActivityData(prev => ({
          ...prev,
          loading: false,
          error: membersError.message
        }));
        return;
      }

      const totalMembers = totalMembersData?.length || 0;

      // Get activity data (posts and comments) for the period
      const [postsResult, commentsResult] = await Promise.all([
        supabase
          .from('posts')
          .select('user_id, created_at')
          .eq('space_id', spaceId)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),
        
        supabase
          .from('post_comments')
          .select('user_id, created_at')
          .eq('space_id', spaceId)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
      ]);

      if (postsResult.error) {
        console.error('Error fetching posts data:', postsResult.error);
        setActivityData(prev => ({
          ...prev,
          loading: false,
          error: postsResult.error.message
        }));
        return;
      }

      if (commentsResult.error) {
        console.error('Error fetching comments data:', commentsResult.error);
        setActivityData(prev => ({
          ...prev,
          loading: false,
          error: commentsResult.error.message
        }));
        return;
      }

      // Combine all activity data
      const allActivity = [
        ...(postsResult.data || []),
        ...(commentsResult.data || [])
      ];

      // Generate daily activity metrics
      const dailyData: ActivityDataPoint[] = [];
      const uniqueActiveUsers = new Set<string>();

      for (let i = 0; i < days; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        const nextDate = new Date(currentDate);
        nextDate.setDate(currentDate.getDate() + 1);

        // Find users who were active on this day
        const activeUsersThisDay = new Set<string>();
        
        allActivity.forEach(activity => {
          const activityDate = new Date(activity.created_at);
          if (activityDate >= currentDate && activityDate < nextDate) {
            activeUsersThisDay.add(activity.user_id);
            uniqueActiveUsers.add(activity.user_id);
          }
        });

        dailyData.push({
          date: currentDate.toISOString().split('T')[0],
          activeMembers: activeUsersThisDay.size
        });
      }

      const totalActiveMembers = uniqueActiveUsers.size;
      const activityPercentage = totalMembers > 0 ? Math.round((totalActiveMembers / totalMembers) * 100) : 0;

      const newActivityData = {
        data: dailyData,
        totalActive: totalActiveMembers,
        activityPercentage,
        loading: false,
        error: null
      };

      // Cache the result
      activityMetricsCache.set(cacheKey, {
        ...newActivityData,
        timestamp: now,
        spaceId,
        days
      });

      setActivityData(newActivityData);
      lastFetchRef.current = cacheKey;

    } catch (error) {
      console.error('Error in fetchActivityMetrics:', error);
      setActivityData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, [spaceId, days]);

  useEffect(() => {
    // Only fetch if spaceId or days changed or this is the first render
    const currentKey = `${spaceId}-${days}`;
    if (spaceId && lastFetchRef.current !== currentKey) {
      fetchActivityMetrics();
    }
  }, [spaceId, days, fetchActivityMetrics]);

  return activityData;
};