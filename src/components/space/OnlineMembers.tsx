import { log } from '@/utils/logger';
import React, { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/integrations/supabase/client';
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
import { useSimpleSpacePresence } from '@/hooks/useSimpleSpacePresence';
import { OptimizedAvatar } from '@/components/ui/OptimizedAvatar';

interface OnlineMembersProps {
  spaceId: string;
  maxDisplay?: number;
  showOfflineMembers?: boolean;
}

interface MemberWithPresence extends SpaceMember {
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

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
  
  // Use the new simple presence system
  const { onlineUsers, loading: presenceLoading } = useSimpleSpacePresence(spaceId);
  
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
        .select('id, user_id, role, last_active_at, space_id, joined_at, status, full_name, username, avatar_url, bio, location')
        .eq('space_id', spaceId)
        .eq('status', 'active')
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
      
      // Combine member data with profiles and online status
      const combinedMembers = membersData.map(member => {
        const profile = profilesData?.find(p => p.id === member.user_id);
        const isOnline = onlineUsers.includes(member.user_id);
        
        return {
          ...member,
          is_online: isOnline,
          profile: profile ? {
            full_name: profile.full_name,
            avatar_url: profile.avatar_url
          } : undefined
        } as MemberWithPresence;
      });
      
      // Sort by online status first, then last active
      const sortedMembers = combinedMembers.sort((a, b) => {
        if (a.is_online && !b.is_online) return -1;
        if (!a.is_online && b.is_online) return 1;
        return new Date(b.last_active_at || 0).getTime() - new Date(a.last_active_at || 0).getTime();
      });
      
      setMembers(sortedMembers);
      
    } catch (error) {
      log.error('Component', 'Error fetching members:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };
  
  // Fetch members initially and when online users change
  useEffect(() => {
    fetchMembers();
  }, [spaceId, onlineUsers]);
  
  if (loading || presenceLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }
  
  const displayMembers = showOfflineMembers 
    ? members 
    : members.filter(m => m.is_online).slice(0, maxDisplay);
  
  if (displayMembers.length === 0) {
    return (
      <div className="text-sm text-gray-500 text-center p-4">
        No members {showOfflineMembers ? '' : 'online'} at the moment
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      {displayMembers.map((member) => (
        <div key={member.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50">
          <div className="relative">
            <OptimizedAvatar
              user={{
                id: member.user_id,
                full_name: member.profile?.full_name || member.full_name,
                avatar_url: member.profile?.avatar_url || member.avatar_url
              }}
              size="md"
              showOnlineStatus={false}
            />
            {member.is_online && (
              <OnlineIndicator 
                isOnline={true}
                size="sm"
                className="absolute bottom-0 right-0"
              />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center">
              <p className="text-sm font-medium text-gray-900 truncate">
                {member.profile?.full_name || member.full_name || 'Unknown User'}
              </p>
              {member.role === 'admin' && (
                <Badge variant="outline" className="ml-2 text-xs">Admin</Badge>
              )}
            </div>
            
            <p className="text-xs text-gray-500">
              {member.is_online ? (
                'Online now'
              ) : member.last_active_at ? (
                `Last seen ${formatDistanceToNow(new Date(member.last_active_at), { addSuffix: true })}`
              ) : (
                'Never active'
              )}
            </p>
          </div>
        </div>
      ))}
      
      {isRefreshing ? (
        <div className="flex justify-center py-2">
          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-gray-500 hover:text-gray-700"
          onClick={() => fetchMembers(true)}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      )}
    </div>
  );
} 