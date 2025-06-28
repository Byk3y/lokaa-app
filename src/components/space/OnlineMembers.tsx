import React, { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
// Removed usePresence import - using simplified presence system instead
import { useTimezone } from '@/hooks/useTimezone';
import { useSimpleMemberCounts } from '@/hooks/useSimpleMemberCounts';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { SpaceMember } from '@/types/members';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { OnlineIndicator } from '@/components/user/OnlineIndicator';
import { format, formatDistanceToNow } from 'date-fns';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OnlineMembersProps {
  spaceId: string;
  maxDisplay?: number;
  showOfflineMembers?: boolean;
}

type MemberWithPresence = {
  id: string;
  user_id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  role?: string;
  is_online: boolean;
  last_active_at?: string | null;
};

export function OnlineMembers({
  spaceId,
  maxDisplay = 5,
  showOfflineMembers = false
}: OnlineMembersProps) {
  const { user } = useOptimizedAuth();
  const { formatInUserTimezone } = useTimezone();
  const [members, setMembers] = useState<MemberWithPresence[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Use our member counts hook for count information
  const { totalMembers, onlineMembers: onlineMemberCount, loading: countsLoading } = useSimpleMemberCounts(spaceId);
  
  const fetchMembers = async (force = false) => {
    if (!spaceId) return;
    
    try {
      if (force) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      
      // First get space members data
      const { data: membersData, error: membersError } = await getSupabaseClient()
        .from('space_members')
        .select('id, user_id, role, is_online, last_active_at')
        .eq('space_id', spaceId)
        .eq('status', 'active')
        .order('is_online', { ascending: false })
        .order('last_active_at', { ascending: false });
        
      if (membersError) throw membersError;
      
      // Early return if no members
      if (!membersData || membersData.length === 0) {
        setMembers([]);
        setLoading(false);
        setIsRefreshing(false);
        return;
      }
      
      // Get user IDs to fetch profiles
      const userIds = membersData.map(member => member.user_id);
      
      // Get user profiles for the members
      const { data: profilesData, error: profilesError } = await getSupabaseClient()
        .from('users')
        .select('id, full_name, avatar_url')
        .in('id', userIds);
        
      if (profilesError) throw profilesError;
      
      // Create a lookup map for user profiles
      const profilesMap = (profilesData || []).reduce((map, profile) => {
        map[profile.id] = profile;
        return map;
      }, {} as Record<string, any>);
      
      // Combine member data with profile data
      const combinedData: MemberWithPresence[] = membersData.map(member => ({
        id: member.id,
        user_id: member.user_id,
        role: member.role,
        is_online: member.is_online === true, // Force boolean value
        last_active_at: member.last_active_at,
        full_name: profilesMap[member.user_id]?.full_name || null,
        avatar_url: profilesMap[member.user_id]?.avatar_url || null
      }));
      
      setMembers(combinedData);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };
  
  // Update current user's online status
  const updateCurrentUserStatus = async () => {
    if (!spaceId || !user?.id) return;
    
    try {
      // Get the current user's member record
      const { data: memberData, error: memberError } = await getSupabaseClient()
        .from('space_members')
        .select('id')
        .eq('space_id', spaceId)
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (memberError) throw memberError;
      
      if (memberData) {
        // Update the online status
        const { error: updateError } = await getSupabaseClient()
          .from('space_members')
          .update({ 
            is_online: true,
            last_active_at: new Date().toISOString() 
          })
          .eq('id', memberData.id);
          
        if (updateError) throw updateError;
        
        // Refresh the members list
        fetchMembers(true);
      }
    } catch (error) {
      console.error('Error updating current user status:', error);
    }
  };
  
  useEffect(() => {
    fetchMembers();
    
    // Set up real-time subscription for member changes
    const memberChanges = supabase
      .channel(`online_members:${spaceId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'space_members',
        filter: `space_id=eq.${spaceId}`
      }, () => {
        // Refetch when any change happens to members
        fetchMembers(true);
      })
      .subscribe();
    
    // Update current user's status
    updateCurrentUserStatus();
    
    // Set up regular refresh
    const refreshInterval = setInterval(() => {
      fetchMembers(true);
    }, 30000);
    
    return () => {
      memberChanges.unsubscribe();
      clearInterval(refreshInterval);
    };
  }, [spaceId]);
  
  // Handle manual refresh
  const handleRefresh = () => {
    updateCurrentUserStatus();
  };
  
  // Get online members from the list
  const onlineMembersList = members.filter(
    member => member.is_online === true
  ).slice(0, maxDisplay);

  // Get offline members if needed
  const offlineMembersList = showOfflineMembers
    ? members.filter(member => !member.is_online).slice(0, maxDisplay)
    : [];

  if (loading) {
    return (
      <div className="flex items-center space-x-2 animate-pulse">
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        <span className="text-sm text-gray-500">Loading members...</span>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="text-sm text-gray-500">
        No members found in this space.
      </div>
    );
  }
  
  const formatLastActive = (date: string | null) => {
    if (!date) return 'Never active';
    
    try {
      return `Last seen ${formatDistanceToNow(new Date(date), { addSuffix: true })}`;
    } catch (error) {
      return 'Last seen recently';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-700">Member Presence</h3>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 px-2 text-gray-500 hover:text-gray-700"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="sr-only">Refresh</span>
        </Button>
      </div>
      
      {onlineMemberCount > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
            <span className="flex h-2 w-2 rounded-full bg-green-400 mr-2 animate-pulse"></span>
            Online ({onlineMemberCount})
          </h3>
          <div className="space-y-2">
            {onlineMembersList.map(member => (
              <div key={member.id} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.avatar_url || undefined} alt={member.full_name || 'Member'} />
                      <AvatarFallback>
                        {member.full_name?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <OnlineIndicator 
                      isOnline={member.is_online} 
                      size="sm" 
                      className="absolute bottom-0 right-0 ring-1 ring-white" 
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{member.full_name || 'Anonymous'}</p>
                    {member.role === 'admin' && (
                      <Badge variant="outline" className="text-xs px-1 py-0">Admin</Badge>
                    )}
                  </div>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-xs text-green-500 font-medium">Online now</div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Currently active in this space</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            ))}
            
            {onlineMembersList.length === 0 && (
              <div className="text-sm text-gray-500 italic py-2">
                Waiting for members to come online...
              </div>
            )}
          </div>
        </div>
      )}

      {showOfflineMembers && offlineMembersList.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Recently Active ({offlineMembersList.length})
          </h3>
          <div className="space-y-2">
            {offlineMembersList.map(member => (
              <div key={member.id} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.avatar_url || undefined} alt={member.full_name || 'Member'} />
                      <AvatarFallback>
                        {member.full_name?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <OnlineIndicator 
                      isOnline={false} 
                      size="sm" 
                      className="absolute bottom-0 right-0 ring-1 ring-white"
                      pulseAnimation={false}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{member.full_name || 'Anonymous'}</p>
                    {member.role === 'admin' && (
                      <Badge variant="outline" className="text-xs px-1 py-0">Admin</Badge>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {formatLastActive(member.last_active_at)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 