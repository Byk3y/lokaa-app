import { log } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { formatCompactNumber } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FollowStatsProps {
  userId: string;
  showTooltip?: boolean;
  showLabels?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  onStatsLoaded?: (stats: { followers: number; following: number }) => void;
}

export default function FollowStats({
  userId,
  showTooltip = true,
  showLabels = true,
  className = '',
  size = 'md',
  onStatsLoaded
}: FollowStatsProps) {
  const [followStats, setFollowStats] = useState<{ followers: number; following: number } | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (userId) {
      fetchFollowStats();
    }
  }, [userId]);
  
  const fetchFollowStats = async () => {
    if (!userId) return;
    
    try {
      // Get followers count
      const { count: followersCount, error: followersError } = await getSupabaseClient()
        .from('user_follows')
        .select('id', { count: 'exact', head: true })
        .eq('following_id', userId);
        
      if (followersError) throw followersError;
      
      // Get following count
      const { count: followingCount, error: followingError } = await getSupabaseClient()
        .from('user_follows')
        .select('id', { count: 'exact', head: true })
        .eq('follower_id', userId);
        
      if (followingError) throw followingError;
      
      const stats = {
        followers: followersCount || 0,
        following: followingCount || 0
      };
      
      setFollowStats(stats);
      if (onStatsLoaded) onStatsLoaded(stats);
    } catch (error) {
      log.error('Component', 'Error fetching follow stats:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Adjust styling based on size prop
  const textSize = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }[size];
  
  const iconSize = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  }[size];
  
  if (loading) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-16" />
      </div>
    );
  }
  
  if (!followStats) return null;
  
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5">
              <span className={`font-semibold ${textSize}`}>
                {formatCompactNumber(followStats.followers)}
              </span>
              {showLabels && (
                <span className={`text-gray-600 ${textSize}`}>
                  {followStats.followers === 1 ? 'follower' : 'followers'}
                </span>
              )}
            </div>
          </TooltipTrigger>
          {showTooltip && (
            <TooltipContent>
              <p>{followStats.followers} followers</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5">
              <span className={`font-semibold ${textSize}`}>
                {formatCompactNumber(followStats.following)}
              </span>
              {showLabels && (
                <span className={`text-gray-600 ${textSize}`}>following</span>
              )}
            </div>
          </TooltipTrigger>
          {showTooltip && (
            <TooltipContent>
              <p>Following {followStats.following} users</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    </div>
  );
} 