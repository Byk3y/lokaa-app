import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getSupabaseClient } from '@/integrations/supabase/client';
import { getInitials } from '@/shared/utils/avatar-utils';

interface OnlineMember {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  is_online: boolean;
}

interface OnlineAvatarsProps {
  spaceId: string;
  maxDisplay?: number;
  className?: string;
}

export function OnlineAvatars({ spaceId, maxDisplay = 8, className = '' }: OnlineAvatarsProps) {
  const [onlineMembers, setOnlineMembers] = useState<OnlineMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOnlineMembers = async () => {
    if (!spaceId) return;
    
    try {
      setLoading(true);
      
      // Get online members - try two approaches for compatibility
      let membersData, membersError;
      
      // First try: Use the space_members_view which should have user data
      try {
        const result = await getSupabaseClient()
          .from('space_members_view')
          .select('id, user_id, full_name, avatar_url, is_online')
          .eq('space_id', spaceId)
          .eq('status', 'active')
          .eq('is_online', true)
          .order('last_active_at', { ascending: false })
          .limit(maxDisplay);
          
        membersData = result.data;
        membersError = result.error;
      } catch (viewError) {
        // Fallback: space_members_view not available, try alternative approach
        
        // Fallback: Get basic member data and then fetch user profiles separately
        const memberResult = await getSupabaseClient()
          .from('space_members')
          .select('id, user_id, is_online')
          .eq('space_id', spaceId)
          .eq('status', 'active')
          .eq('is_online', true)
          .order('last_active_at', { ascending: false })
          .limit(maxDisplay);
          
        if (memberResult.error) throw memberResult.error;
        
        if (memberResult.data && memberResult.data.length > 0) {
          // Get user profiles for these members
          const userIds = memberResult.data.map(m => m.user_id);
          const userResult = await getSupabaseClient()
            .from('users')
            .select('id, full_name, avatar_url')
            .in('id', userIds);
            
          if (userResult.error) throw userResult.error;
          
          // Combine the data
          const userMap = (userResult.data || []).reduce((map: any, user: any) => {
            map[user.id] = user;
            return map;
          }, {});
          
          membersData = memberResult.data.map((member: any) => ({
            id: member.id,
            user_id: member.user_id,
            full_name: userMap[member.user_id]?.full_name || null,
            avatar_url: userMap[member.user_id]?.avatar_url || null,
            is_online: member.is_online
          }));

        }
      }
        
      if (membersError) throw membersError;
      
      // Transform the data to match our interface
      const onlineMembersData: OnlineMember[] = (membersData || []).map((member: any) => ({
        id: member.id,
        user_id: member.user_id,
        full_name: member.full_name || null,
        avatar_url: member.avatar_url || null,
        is_online: member.is_online
      }));
      
      setOnlineMembers(onlineMembersData);
    } catch (error) {
      setOnlineMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOnlineMembers();
    
    // Set up real-time subscription for member changes
    const memberChanges = getSupabaseClient()
      .channel(`online_avatars:${spaceId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'space_members',
        filter: `space_id=eq.${spaceId}`
      }, () => {
        // Refetch when any change happens to members
        fetchOnlineMembers();
      })
      .subscribe();
    
    // Refresh periodically to catch presence updates
    const refreshInterval = setInterval(fetchOnlineMembers, 30000);
    
    return () => {
      memberChanges.unsubscribe();
      clearInterval(refreshInterval);
    };
  }, [spaceId, maxDisplay]);

  // Show loading state with placeholder
  if (loading) {
    return (
      <div className={`flex items-center justify-start ${className}`}>
        <div className="flex space-x-1">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="relative">
              <div className="h-7 w-7 bg-gray-200 rounded-full animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Don't show anything if no online members
  if (onlineMembers.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center justify-start ${className}`}>
      <TooltipProvider>
        <div className="flex space-x-1">
          {onlineMembers.slice(0, maxDisplay - 1).map((member, index) => (
            <Tooltip key={member.id}>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Avatar className="h-7 w-7 hover:scale-110 transition-transform cursor-pointer">
                    <AvatarImage 
                      src={member.avatar_url || undefined} 
                      alt={member.full_name || 'Online member'} 
                    />
                    <AvatarFallback className="text-xs bg-gradient-to-br from-blue-100 to-purple-100 text-blue-700">
                      {getInitials(member.full_name || 'Unknown')}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-sm">{member.full_name || 'Online member'}</p>
              </TooltipContent>
            </Tooltip>
          ))}
          
          {/* Show remaining count if there are more online members */}
          {onlineMembers.length > maxDisplay - 1 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Avatar className="h-7 w-7 bg-gray-100 hover:scale-110 transition-transform cursor-pointer">
                    <AvatarFallback className="text-xs bg-gray-100 text-gray-600 font-medium">
                      +{onlineMembers.length - (maxDisplay - 1)}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-sm">{onlineMembers.length - (maxDisplay - 1)} more online</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </TooltipProvider>
    </div>
  );
} 