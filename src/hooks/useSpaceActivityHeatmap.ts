import { log } from '@/utils/logger';
import { useState, useEffect, useCallback, useRef } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';

interface DailyActivity {
  date: string;
  count: number;
  intensity: number; // 0-4 intensity levels
}

interface HeatmapWeek {
  days: (DailyActivity | null)[]; // 7 days, null for padding
}

interface ActivityHeatmapData {
  weeks: HeatmapWeek[];
  monthLabels: string[];
  totalActivities: number;
  maxDailyActivity: number;
  loading: boolean;
  error: string | null;
}

interface CachedHeatmapData extends ActivityHeatmapData {
  timestamp: number;
  spaceId: string;
}

// Cache with 10-minute TTL
const CACHE_TTL = 10 * 60 * 1000;
const heatmapCache = new Map<string, CachedHeatmapData>();

export const useSpaceActivityHeatmap = (spaceId: string): ActivityHeatmapData => {
  const [heatmapData, setHeatmapData] = useState<ActivityHeatmapData>({
    weeks: [],
    monthLabels: [],
    totalActivities: 0,
    maxDailyActivity: 0,
    loading: true,
    error: null
  });
  
  const lastFetchRef = useRef<string>('');

  const calculateIntensity = useCallback((count: number, maxCount: number): number => {
    if (count === 0) return 0;
    if (maxCount === 0) return 1;
    
    const percentage = count / maxCount;
    if (percentage <= 0.25) return 1;
    if (percentage <= 0.5) return 2;
    if (percentage <= 0.75) return 3;
    return 4;
  }, []);

  const fetchActivityHeatmap = useCallback(async (force = false) => {
    if (!spaceId) {
      setHeatmapData(prev => ({ ...prev, loading: false }));
      return;
    }

    // Check cache first unless forced refresh
    const cacheKey = spaceId;
    const cached = heatmapCache.get(cacheKey);
    const now = Date.now();
    
    if (!force && cached && cached.spaceId === spaceId && (now - cached.timestamp < CACHE_TTL)) {
      // Return cached data and set loading to false
      const { timestamp, spaceId: cachedSpaceId, ...cachedData } = cached;
      setHeatmapData({ ...cachedData, loading: false });
      lastFetchRef.current = spaceId;
      return;
    }

    // Only show loading if we don't have cached data
    if (!cached || cached.spaceId !== spaceId) {
      setHeatmapData(prev => ({ ...prev, loading: true }));
    }

    try {
      const supabase = getSupabaseClient();
      const endDate = new Date();
      
      // Filter out any test/development data from before app launch
      const appLaunchDate = new Date('2025-02-01T00:00:00Z');
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 365); // Full year from today
      
      // Use the later of: app launch date or 1 year ago
      const effectiveStartDate = startDate > appLaunchDate ? startDate : appLaunchDate;

      // Query posts and comments using effective start date (filters out pre-launch data)
      const [postsResult, commentsResult] = await Promise.all([
        supabase
          .from('posts')
          .select('created_at')
          .eq('space_id', spaceId)
          .gte('created_at', effectiveStartDate.toISOString())
          .lte('created_at', endDate.toISOString()),
        
        supabase
          .from('post_comments')
          .select('created_at')
          .eq('space_id', spaceId)
          .gte('created_at', effectiveStartDate.toISOString())
          .lte('created_at', endDate.toISOString())
      ]);

      if (postsResult.error) {
        log.error('Hook', 'Error fetching posts for heatmap:', postsResult.error);
        setHeatmapData(prev => ({
          ...prev,
          loading: false,
          error: postsResult.error.message
        }));
        return;
      }

      if (commentsResult.error) {
        log.error('Hook', 'Error fetching comments for heatmap:', commentsResult.error);
        setHeatmapData(prev => ({
          ...prev,
          loading: false,
          error: commentsResult.error.message
        }));
        return;
      }

      // Combine all activity
      const allActivity = [
        ...(postsResult.data || []),
        ...(commentsResult.data || [])
      ];

      // Group activities by date
      const dailyActivityMap = new Map<string, number>();
      
      allActivity.forEach(activity => {
        const date = new Date(activity.created_at).toISOString().split('T')[0];
        dailyActivityMap.set(date, (dailyActivityMap.get(date) || 0) + 1);
      });

      // Calculate max activity for intensity scaling
      const maxDailyActivity = Math.max(...Array.from(dailyActivityMap.values()), 1);

      // Generate 52 weeks of data (GitHub-style)
      const weeks: HeatmapWeek[] = [];
      let totalActivities = 0;

      // Start from exactly one year ago (to get 52 weeks ending today)
      const today = new Date();
      const oneYearAgo = new Date(today);
      oneYearAgo.setFullYear(today.getFullYear() - 1);
      oneYearAgo.setDate(today.getDate() + 1); // Start from tomorrow one year ago
      
      // Adjust to start on Sunday for proper weekly grid
      const heatmapStartDate = new Date(oneYearAgo);
      heatmapStartDate.setDate(oneYearAgo.getDate() - oneYearAgo.getDay());

      // Generate 52 weeks of data
      for (let week = 0; week < 52; week++) {
        const weekData: HeatmapWeek = { days: [] };
        
        for (let day = 0; day < 7; day++) {
          const currentDate = new Date(heatmapStartDate);
          currentDate.setDate(heatmapStartDate.getDate() + (week * 7) + day);
          
          const dateStr = currentDate.toISOString().split('T')[0];
          
          // Only count activity if the date is within our database query range
          const isWithinQueryRange = currentDate >= effectiveStartDate && currentDate <= endDate;
          const count = isWithinQueryRange ? (dailyActivityMap.get(dateStr) || 0) : 0;
          const intensity = calculateIntensity(count, maxDailyActivity);
          
          totalActivities += count;
          
          weekData.days.push({
            date: dateStr,
            count,
            intensity
          });
        }
        
        weeks.push(weekData);
      }

      // Generate month labels properly aligned with the 52-week grid
      const monthLabels: string[] = [];
      
      // Calculate exactly which weeks should show month labels (GitHub-style spacing)
      const monthIndicesToShow = [0, 4, 9, 13, 17, 22, 26, 30, 35, 39, 43, 48];
      
      for (let i = 0; i < 12; i++) {
        const weekIndex = monthIndicesToShow[i];
        if (weekIndex < weeks.length && weeks[weekIndex].days[0]) {
          const date = new Date(weeks[weekIndex].days[0].date);
          const monthStr = date.toLocaleDateString('en-US', { month: 'short' });
          monthLabels.push(monthStr);
        }
      }


      const newHeatmapData = {
        weeks,
        monthLabels: monthLabels.slice(0, 12), // Ensure exactly 12 months
        totalActivities,
        maxDailyActivity,
        loading: false,
        error: null
      };

      // Cache the result
      heatmapCache.set(cacheKey, {
        ...newHeatmapData,
        timestamp: now,
        spaceId
      });

      setHeatmapData(newHeatmapData);
      lastFetchRef.current = spaceId;

    } catch (error) {
      log.error('Hook', 'Error in fetchActivityHeatmap:', error);
      setHeatmapData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, [spaceId, calculateIntensity]);

  useEffect(() => {
    // Only fetch if spaceId changed or this is the first render
    if (spaceId && lastFetchRef.current !== spaceId) {
      fetchActivityHeatmap();
    }
  }, [spaceId, fetchActivityHeatmap]);

  return heatmapData;
};