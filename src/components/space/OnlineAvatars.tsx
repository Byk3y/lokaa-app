import { log } from '@/utils/logger';
import React, { useEffect, useState, useRef } from 'react';
import { OptimizedAvatar } from '@/components/ui/OptimizedAvatar';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { useSimpleSpacePresence } from '@/hooks/useSimpleSpacePresence';
import { cn } from '@/lib/utils';

interface OnlineUser {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface OnlineAvatarsProps {
  spaceId: string;
  maxDisplay?: number;
  className?: string;
}

export function OnlineAvatars({ spaceId, maxDisplay = 8, className = '' }: OnlineAvatarsProps) {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const { onlineUsers: presenceUsers, loading } = useSimpleSpacePresence(spaceId);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!spaceId || !presenceUsers || loading) {
      return;
    }

    const fetchUserProfiles = async () => {
      try {
        const userIds = presenceUsers;
        
        if (userIds.length === 0) {
          if (mountedRef.current) {
            setOnlineUsers([]);
          }
          return;
        }

        const { data: profiles, error } = await getSupabaseClient()
          .from('users')
          .select('id, full_name, avatar_url')
          .in('id', userIds)
          .limit(maxDisplay);

        if (error) throw error;

        if (profiles && mountedRef.current) {
          // Map presence data to user profiles
          const onlineUserProfiles = profiles.map(profile => ({
            id: profile.id,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url
          }));
          setOnlineUsers(onlineUserProfiles);
        } else if (mountedRef.current) {
          setOnlineUsers([]);
        }
      } catch (error) {
        log.error('Component', 'Error fetching user profiles:', error);
        if (mountedRef.current) {
          setOnlineUsers([]);
        }
      }
    };

    fetchUserProfiles();
  }, [spaceId, presenceUsers, maxDisplay, loading]);

  if (loading || onlineUsers.length === 0) {
    return null;
  }

  // Only show up to maxDisplay avatars
  const displayUsers = onlineUsers.slice(0, maxDisplay);
  const remainingCount = onlineUsers.length - maxDisplay;

  return (
    <div className={cn('flex items-center', className)}>
      {displayUsers.map((user) => (
        <div key={user.id} className="flex-shrink-0">
          <OptimizedAvatar
            user={{
              id: user.id,
              full_name: user.full_name || '',
              avatar_url: user.avatar_url
            }}
            size="xs"
            className="inline-block ring-1 ring-white dark:ring-gray-800"
            showOnlineStatus={false}
          />
        </div>
      ))}
      {remainingCount > 0 && (
        <div className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 ring-1 ring-white dark:ring-gray-800">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            +{remainingCount}
          </span>
        </div>
      )}
    </div>
  );
}

export default OnlineAvatars; 